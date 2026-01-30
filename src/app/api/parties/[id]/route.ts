import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface Props {
    params: Promise<{ id: string }>;
}

// GET /api/parties/[id] - Get party details
export async function GET(request: NextRequest, { params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: party, error } = await supabase
        .from('parties')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    }

    // Get member count
    const { count: memberCount } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', id)
        .is('left_at', null);

    // Calculate level
    const count = memberCount || 0;
    let level: 1 | 2 | 3 | 4;
    if (count <= 10) level = 1;
    else if (count <= 100) level = 2;
    else if (count <= 1000) level = 3;
    else level = 4;

    // Get leader
    const { data: votes } = await supabase
        .from('trust_votes')
        .select('to_user_id')
        .eq('party_id', id)
        .gt('expires_at', new Date().toISOString());

    const voteCounts: Record<string, number> = {};
    votes?.forEach(v => {
        voteCounts[v.to_user_id] = (voteCounts[v.to_user_id] || 0) + 1;
    });

    let leaderId: string | null = null;
    let maxVotes = 0;
    Object.entries(voteCounts).forEach(([userId, cnt]) => {
        if (cnt > maxVotes) {
            maxVotes = cnt;
            leaderId = userId;
        }
    });

    // Get Q&A metrics
    const { count: totalQuestions } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', id);

    const { data: answeredQuestions } = await supabase
        .from('questions')
        .select('id, answers(id)')
        .eq('party_id', id);

    const unansweredCount = (answeredQuestions || []).filter(
        q => !q.answers || q.answers.length === 0
    ).length;

    return NextResponse.json({
        ...party,
        member_count: count,
        level,
        leader_id: leaderId,
        qa_metrics: {
            total_questions: totalQuestions || 0,
            unanswered_questions: unansweredCount
        }
    });
}
