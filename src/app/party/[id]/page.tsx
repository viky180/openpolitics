import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PartyDetailClient } from './PartyDetailClient';
import { calculatePartyLevel } from '@/types/database';
import type { MemberWithVotes, QuestionWithAnswers, QAMetrics, SupportWithParty, EscalationWithParties, Party, PartyMergeWithParent, MemberBreakdown } from '@/types/database';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function PartyPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch party
    const { data: party, error } = await supabase
        .from('parties')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !party) {
        notFound();
    }

    // Fetch member count
    const { count: memberCount } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', id)
        .is('left_at', null);

    // Fetch members with trust votes
    const { data: memberships } = await supabase
        .from('memberships')
        .select(`
      user_id,
      joined_at,
      profiles:user_id (display_name)
    `)
        .eq('party_id', id)
        .is('left_at', null);

    // Get trust votes for all members
    const { data: trustVotes } = await supabase
        .from('trust_votes')
        .select('to_user_id')
        .eq('party_id', id)
        .gt('expires_at', new Date().toISOString());

    // Calculate vote counts per member
    const voteCounts: Record<string, number> = {};
    trustVotes?.forEach(vote => {
        voteCounts[vote.to_user_id] = (voteCounts[vote.to_user_id] || 0) + 1;
    });

    // Find leader (most votes)
    let leaderId: string | null = null;
    let maxVotes = 0;
    Object.entries(voteCounts).forEach(([userId, count]) => {
        if (count > maxVotes) {
            maxVotes = count;
            leaderId = userId;
        }
    });

    const members: MemberWithVotes[] = (memberships || []).map(m => ({
        user_id: m.user_id as string,
        display_name: ((m.profiles as unknown) as { display_name: string | null } | null)?.display_name || null,
        joined_at: m.joined_at as string,
        trust_votes: voteCounts[m.user_id as string] || 0,
        is_leader: m.user_id === leaderId
    }));

    // Fetch questions with answers
    const { data: questions } = await supabase
        .from('questions')
        .select(`
      *,
      profiles:asked_by (display_name),
      answers (
        *,
        profiles:answered_by (display_name)
      )
    `)
        .eq('party_id', id)
        .order('created_at', { ascending: false });

    const questionsWithAnswers: QuestionWithAnswers[] = (questions || []).map(q => {
        const answers = (q.answers || []).map((a: { id: string; question_id: string; answered_by: string | null; answer_text: string; created_at: string; profiles: { display_name: string | null } | null }) => ({
            ...a,
            answerer_name: a.profiles?.display_name || null
        }));

        // Calculate response time
        let responseTimeHours: number | null = null;
        if (answers.length > 0) {
            const firstAnswer = answers.sort((a: { created_at: string }, b: { created_at: string }) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )[0];
            const questionTime = new Date(q.created_at).getTime();
            const answerTime = new Date(firstAnswer.created_at).getTime();
            responseTimeHours = (answerTime - questionTime) / (1000 * 60 * 60);
        }

        return {
            ...q,
            asker_name: (q.profiles as { display_name: string | null })?.display_name || null,
            answers,
            response_time_hours: responseTimeHours
        };
    });

    // Calculate Q&A metrics
    const qaMetrics: QAMetrics = {
        total_questions: questionsWithAnswers.length,
        unanswered_questions: questionsWithAnswers.filter(q => q.answers.length === 0).length,
        avg_response_time_hours: (() => {
            const answered = questionsWithAnswers.filter(q => q.response_time_hours !== null);
            if (answered.length === 0) return null;
            const total = answered.reduce((sum, q) => sum + (q.response_time_hours || 0), 0);
            return total / answered.length;
        })()
    };

    // Fetch supports (parties supporting this one)
    const { data: supports } = await supabase
        .from('party_supports')
        .select(`
      *,
      from_party:from_party_id (*)
    `)
        .eq('to_party_id', id);

    // Check for revocations
    const { data: revocations } = await supabase
        .from('revocations')
        .select('revoking_party_id, target_id')
        .eq('target_id', id);

    const revokedPartyIds = new Set(revocations?.map(r => r.revoking_party_id) || []);

    const supportsWithParty: SupportWithParty[] = (supports || []).map(s => ({
        ...s,
        from_party: s.from_party,
        is_revoked: revokedPartyIds.has(s.from_party_id)
    }));

    // Fetch escalations
    const { data: escalations } = await supabase
        .from('escalations')
        .select(`
      *,
      target_party:target_party_id (*)
    `)
        .eq('source_party_id', id);

    const escalationsWithParties: EscalationWithParties[] = (escalations || []).map(e => ({
        ...e,
        source_party: party,
        target_party: e.target_party
    }));

    // Fetch alliances (this party's alliance)
    const { data: allianceMembers } = await supabase
        .from('alliance_members')
        .select(`
            *,
            alliance:alliance_id (
                *,
                members:alliance_members (
                    *,
                    party:party_id (*)
                )
            )
        `)
        .eq('party_id', id)
        .is('left_at', null)
        .maybeSingle();

    // Get the alliance with all its members (if party is in one)
    const alliance = allianceMembers?.alliance;
    const alliances = alliance ? [{
        ...alliance,
        members: (alliance.members || []).filter((m: { left_at: string | null }) => m.left_at === null)
    }] : [];

    // Fetch parties already in alliances (to exclude from dropdown)
    const { data: partiesInAlliances } = await supabase
        .from('alliance_members')
        .select('party_id')
        .is('left_at', null);

    const partyIdsInAlliances = new Set(partiesInAlliances?.map(m => m.party_id) || []);

    const { data: allParties } = await supabase
        .from('parties')
        .select('*')
        .neq('id', id)
        .order('created_at', { ascending: false });

    // Filter out parties that are already in an alliance
    const otherParties = (allParties || []).filter(p => !partyIdsInAlliances.has(p.id));

    // Fetch merge data
    const { data: currentMergeData } = await supabase
        .from('party_merges')
        .select('*, parent_party:parent_party_id(*)')
        .eq('child_party_id', id)
        .is('demerged_at', null)
        .maybeSingle();

    const currentMerge: PartyMergeWithParent | null = currentMergeData ? {
        ...currentMergeData,
        parent_party: currentMergeData.parent_party as Party
    } : null;

    // Get member breakdown (for displaying total members including merged children)
    const { data: memberBreakdown } = await supabase.rpc('get_party_member_breakdown', {
        p_party_id: id
    });

    // Get total members including merged children
    const { data: totalMembersWithMerged } = await supabase.rpc('get_party_total_members', {
        p_party_id: id
    });

    // Get parties that this party could merge into (exclude self, already merged parties)
    const { data: mergedPartyIds } = await supabase
        .from('party_merges')
        .select('child_party_id')
        .is('demerged_at', null);

    const alreadyMergedIds = new Set(mergedPartyIds?.map(m => m.child_party_id) || []);
    const availableForMerge = (allParties || []).filter(p => !alreadyMergedIds.has(p.id));

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Check if user is a member
    const { data: userMembership } = user ? await supabase
        .from('memberships')
        .select('id')
        .eq('party_id', id)
        .eq('user_id', user.id)
        .is('left_at', null)
        .maybeSingle() : { data: null };

    // Check user's current vote
    const { data: userVote } = user ? await supabase
        .from('trust_votes')
        .select('to_user_id')
        .eq('party_id', id)
        .eq('from_user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle() : { data: null };

    // Likes data
    const { count: likeCount } = await supabase
        .from('party_likes')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', id);

    const { data: userLike } = user ? await supabase
        .from('party_likes')
        .select('id')
        .eq('party_id', id)
        .eq('user_id', user.id)
        .maybeSingle() : { data: null };

    return (
        <PartyDetailClient
            party={party}
            memberCount={memberCount || 0}
            totalMembersWithMerged={totalMembersWithMerged || memberCount || 0}
            memberBreakdown={(memberBreakdown || []) as MemberBreakdown[]}
            level={calculatePartyLevel(totalMembersWithMerged || memberCount || 0)}
            members={members}
            questions={questionsWithAnswers}
            qaMetrics={qaMetrics}
            supports={supportsWithParty}
            escalations={escalationsWithParties}
            alliances={alliances || []}
            otherParties={(otherParties || []) as Party[]}
            currentUserId={user?.id || null}
            isMember={!!userMembership}
            votedFor={userVote?.to_user_id || null}
            likedByMe={!!userLike}
            likeCount={likeCount || 0}
            isLeader={user?.id === leaderId}
            currentMerge={currentMerge}
            availableForMerge={availableForMerge as Party[]}
        />
    );
}

