'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { MemberWithVotes } from '@/types/database';

interface TrustVoteButtonProps {
    partyId: string;
    memberId: string;
    memberName: string;
    currentUserId: string | null;
    hasVoted: boolean;
    votedFor: string | null;
    onVoteChange: () => void;
}

export function TrustVoteButton({
    partyId,
    memberId,
    memberName,
    currentUserId,
    hasVoted,
    votedFor,
    onVoteChange
}: TrustVoteButtonProps) {
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const isVotedForThis = votedFor === memberId;
    const canVote = currentUserId && currentUserId !== memberId;

    const handleVote = async () => {
        if (!currentUserId || loading) return;
        setLoading(true);

        try {
            if (isVotedForThis) {
                // Withdraw vote
                await supabase
                    .from('trust_votes')
                    .delete()
                    .eq('party_id', partyId)
                    .eq('from_user_id', currentUserId);
            } else {
                // If already voted for someone else, first remove that vote
                if (hasVoted) {
                    await supabase
                        .from('trust_votes')
                        .delete()
                        .eq('party_id', partyId)
                        .eq('from_user_id', currentUserId);
                }

                // Give new vote
                await supabase
                    .from('trust_votes')
                    .insert({
                        party_id: partyId,
                        from_user_id: currentUserId,
                        to_user_id: memberId
                    });
            }

            onVoteChange();
        } catch (err) {
            console.error('Vote error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!canVote) return null;

    return (
        <button
            onClick={handleVote}
            disabled={loading}
            className={`btn btn-sm ${isVotedForThis ? 'btn-danger' : 'btn-success'} min-w-[100px]`}
            title={isVotedForThis ? 'Withdraw trust vote' : `Give trust vote to ${memberName}`}
        >
            {loading ? '...' : isVotedForThis ? '✋ Withdraw' : '🗳️ Trust'}
        </button>
    );
}

// Member list component
interface MemberListProps {
    members: MemberWithVotes[];
    partyId: string;
    currentUserId: string | null;
    votedFor: string | null;
    onVoteChange: () => void;
}

export function MemberList({
    members,
    partyId,
    currentUserId,
    votedFor,
    onVoteChange
}: MemberListProps) {
    const sortedMembers = [...members].sort((a, b) => b.trust_votes - a.trust_votes);

    return (
        <div className="flex flex-col gap-3">
            {sortedMembers.map((member, index) => (
                <div
                    key={member.user_id}
                    className={`card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 ${member.is_leader ? 'border-primary bg-primary/10' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`avatar avatar-sm ${member.is_leader ? 'leader-badge' : ''}`}>
                            {(member.display_name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                            <div className="font-medium text-sm">
                                {member.display_name || 'Anonymous'}
                                {member.is_leader && (
                                    <span className="ml-2 text-xs text-secondary">
                                        Leader
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-text-muted">
                                {member.trust_votes} trust vote{member.trust_votes !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>

                    <TrustVoteButton
                        partyId={partyId}
                        memberId={member.user_id}
                        memberName={member.display_name || 'member'}
                        currentUserId={currentUserId}
                        hasVoted={!!votedFor}
                        votedFor={votedFor}
                        onVoteChange={onVoteChange}
                    />
                </div>
            ))}

            {members.length === 0 && (
                <div className="empty-state">
                    <p>No members yet. Be the first to join!</p>
                </div>
            )}
        </div>
    );
}
