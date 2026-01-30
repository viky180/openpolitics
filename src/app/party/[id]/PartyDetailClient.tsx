'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { MemberList } from '@/components/TrustVoteButton';
import { QuestionForm, QuestionList, QAMetricsDisplay } from '@/components/QuestionList';
import { SupportList } from '@/components/SupportButton';
import { PartyLikeButton } from '@/components/PartyLikeButton';
import { MergeButton, MemberBreakdownDisplay } from '@/components/MergeButton';
import type {
    Party,
    MemberWithVotes,
    QuestionWithAnswers,
    QAMetrics,
    SupportWithParty,
    EscalationWithParties,
    AllianceWithMembers,
    PartyMergeWithParent,
    MemberBreakdown
} from '@/types/database';

interface PartyDetailClientProps {
    party: Party;
    memberCount: number;
    totalMembersWithMerged: number;
    memberBreakdown: MemberBreakdown[];
    level: 1 | 2 | 3 | 4;
    members: MemberWithVotes[];
    questions: QuestionWithAnswers[];
    qaMetrics: QAMetrics;
    supports: SupportWithParty[];
    escalations: EscalationWithParties[];
    alliances: AllianceWithMembers[];
    otherParties: Party[];
    currentUserId: string | null;
    isMember: boolean;
    votedFor: string | null;
    likedByMe: boolean;
    likeCount: number;
    isLeader: boolean;
    currentMerge: PartyMergeWithParent | null;
    availableForMerge: Party[];
}

export function PartyDetailClient({
    party,
    memberCount,
    totalMembersWithMerged,
    memberBreakdown,
    level,
    members,
    questions,
    qaMetrics,
    supports,
    escalations,
    alliances,
    otherParties,
    currentUserId,
    isMember,
    votedFor,
    likedByMe,
    likeCount,
    isLeader,
    currentMerge,
    availableForMerge
}: PartyDetailClientProps) {
    const [activeTab, setActiveTab] = useState<'members' | 'qa' | 'support'>('members');
    const [joinLoading, setJoinLoading] = useState(false);
    const [alliancePartyId, setAlliancePartyId] = useState('');
    const [allianceLoading, setAllianceLoading] = useState(false);
    const [allianceError, setAllianceError] = useState('');
    const [revokeLoadingId, setRevokeLoadingId] = useState<string | null>(null);
    const [revokeError, setRevokeError] = useState('');
    const [leaveFeedback, setLeaveFeedback] = useState('');
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const levelLabels: Record<number, string> = {
        1: 'Level 1 (Local)',
        2: 'Level 2 (District)',
        3: 'Level 3 (Regional)',
        4: 'Level 4 (State+)',
    };

    const handleJoin = async () => {
        if (!currentUserId) {
            router.push('/auth');
            return;
        }

        setJoinLoading(true);
        try {
            const response = await fetch(`/api/parties/${party.id}/join`, { method: 'POST' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData?.error || 'Unable to join party');
            }
            router.refresh();
        } catch (err) {
            console.error('Join error:', err);
            alert(err instanceof Error ? err.message : 'Unable to join party');
        } finally {
            setJoinLoading(false);
        }
    };

    const handleLeave = async () => {
        if (!currentUserId) return;

        setJoinLoading(true);
        try {
            await supabase
                .from('memberships')
                .update({
                    left_at: new Date().toISOString(),
                    leave_feedback: leaveFeedback || null
                })
                .eq('party_id', party.id)
                .eq('user_id', currentUserId)
                .is('left_at', null);

            // Also remove any trust votes given by this user
            await supabase
                .from('trust_votes')
                .delete()
                .eq('party_id', party.id)
                .eq('from_user_id', currentUserId);

            setShowLeaveModal(false);
            router.refresh();
        } catch (err) {
            console.error('Leave error:', err);
        } finally {
            setJoinLoading(false);
        }
    };

    const handleRefresh = () => {
        router.refresh();
    };

    const handleCreateAlliance = async () => {
        if (!currentUserId) {
            router.push('/auth');
            return;
        }

        if (!alliancePartyId) {
            setAllianceError('Select a party to ally with.');
            return;
        }

        setAllianceLoading(true);
        setAllianceError('');

        try {
            const response = await fetch('/api/alliances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    party_ids: [party.id, alliancePartyId]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData?.error || 'Failed to create alliance');
            }

            setAlliancePartyId('');
            router.refresh();
        } catch (err) {
            console.error('Alliance creation error:', err);
            setAllianceError(err instanceof Error ? err.message : 'Failed to create alliance');
        } finally {
            setAllianceLoading(false);
        }
    };

    const handleLeaveAlliance = async (allianceId: string) => {
        if (!currentUserId) {
            router.push('/auth');
            return;
        }

        setRevokeLoadingId(allianceId);
        setRevokeError('');

        try {
            const response = await fetch('/api/alliances', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alliance_id: allianceId,
                    party_id: party.id
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData?.error || 'Failed to leave alliance');
            }

            router.refresh();
        } catch (err) {
            console.error('Alliance leave error:', err);
            setRevokeError(err instanceof Error ? err.message : 'Failed to leave alliance');
        } finally {
            setRevokeLoadingId(null);
        }
    };

    const leader = members.find(m => m.is_leader);

    return (
        <div className="container mx-auto px-4 py-6 sm:py-8">
            {/* Back link */}
            <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-secondary mb-4"
            >
                ← All Parties
            </Link>

            {/* Merged Status Banner */}
            {currentMerge && (
                <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🔗</span>
                            <div>
                                <p className="text-sm font-medium text-text-primary">
                                    This party is merged into:
                                </p>
                                <Link
                                    href={`/party/${currentMerge.parent_party.id}`}
                                    className="text-primary hover:underline text-sm"
                                >
                                    {currentMerge.parent_party.issue_text.slice(0, 60)}...
                                </Link>
                            </div>
                        </div>
                        {isLeader && (
                            <MergeButton
                                party={party}
                                currentMerge={currentMerge}
                                isLeader={isLeader}
                                availableParties={availableForMerge}
                                onMergeChange={handleRefresh}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Party Header */}
            <div className="card-glass animate-fade-in mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <span className={`badge badge-level-${level}`}>
                        {levelLabels[level]}
                    </span>

                    <div className="flex flex-wrap gap-2 items-start">
                        {/* Non-exclusive Like */}
                        <PartyLikeButton
                            partyId={party.id}
                            currentUserId={currentUserId}
                            initialLiked={likedByMe}
                            initialLikeCount={likeCount}
                        />

                        {/* Merge Button (only if not already merged) */}
                        {!currentMerge && isLeader && (
                            <MergeButton
                                party={party}
                                currentMerge={null}
                                isLeader={isLeader}
                                availableParties={availableForMerge}
                                onMergeChange={handleRefresh}
                            />
                        )}

                        {isMember ? (
                            <button
                                onClick={() => setShowLeaveModal(true)}
                                className="btn btn-danger btn-sm"
                                disabled={joinLoading}
                            >
                                Leave Party
                            </button>
                        ) : (
                            <button
                                onClick={handleJoin}
                                className="btn btn-primary btn-sm"
                                disabled={joinLoading}
                            >
                                {joinLoading ? 'Joining...' : 'Join Party'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Issue Text */}
                <h1 className="text-xl sm:text-2xl font-semibold leading-snug mb-4">
                    {party.issue_text}
                </h1>

                {/* Pincodes */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {party.pincodes.map((pincode, idx) => (
                        <span key={idx} className="pincode-tag">
                            📍 {pincode}
                        </span>
                    ))}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-border-primary bg-bg-tertiary p-4">
                    <div className="text-center">
                        {/* Member count with breakdown */}
                        {memberBreakdown.length > 1 ? (
                            <MemberBreakdownDisplay
                                partyId={party.id}
                                totalMembers={totalMembersWithMerged}
                            />
                        ) : (
                            <div className="text-2xl font-bold">{memberCount}</div>
                        )}
                        <div className="text-xs text-text-muted uppercase tracking-wide">
                            {memberBreakdown.length > 1 ? 'Total (incl. merged)' : 'Members'}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold">
                            {leader?.display_name?.split(' ')[0] || 'None'}
                        </div>
                        <div className="text-xs text-text-muted uppercase tracking-wide">Leader</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold">{qaMetrics.unanswered_questions}</div>
                        <div className="text-xs text-text-muted uppercase tracking-wide">Unanswered</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold">
                            {supports.filter(s => !s.is_revoked).length}
                        </div>
                        <div className="text-xs text-text-muted uppercase tracking-wide">Supporters</div>
                    </div>
                </div>

                <div className="mt-3 text-xs text-text-muted">
                    Membership is limited to one party at a time. Likes are non-exclusive.
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-border-primary pb-2">
                {(['members', 'qa', 'support'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        {tab === 'members' && `👥 Members (${memberCount})`}
                        {tab === 'qa' && `❓ Q&A (${qaMetrics.unanswered_questions} pending)`}
                        {tab === 'support' && `🤝 Support (${supports.filter(s => !s.is_revoked).length})`}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in">
                {activeTab === 'members' && (
                    <div>
                        <h2 className="text-base font-semibold mb-3 text-text-secondary">
                            Members & Trust Votes
                        </h2>
                        <p className="text-sm text-text-muted mb-4">
                            Give your trust vote to one member. Votes expire in 90 days.
                            The member with the most votes becomes the leader.
                        </p>
                        <MemberList
                            members={members}
                            partyId={party.id}
                            currentUserId={currentUserId}
                            votedFor={votedFor}
                            onVoteChange={handleRefresh}
                        />
                    </div>
                )}

                {activeTab === 'qa' && (
                    <div>
                        <h2 className="text-base font-semibold mb-2 text-text-secondary">
                            Public Q&A Board
                        </h2>
                        <p className="text-sm text-text-muted mb-4">
                            Ask questions publicly. Questions can never be deleted.
                            Accountability through transparency.
                        </p>

                        <QAMetricsDisplay metrics={qaMetrics} />

                        <div className="mt-6">
                            <QuestionForm partyId={party.id} onQuestionAdded={handleRefresh} />
                            <QuestionList
                                questions={questions}
                                partyId={party.id}
                                isMember={isMember}
                                onAnswerAdded={handleRefresh}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'support' && (
                    <div>
                        <h2 className="text-base font-semibold mb-2 text-text-secondary">
                            Support & Alliances
                        </h2>
                        <p className="text-sm text-text-muted mb-6">
                            Other parties supporting this issue. Explicit = direct support.
                            Implicit = through alliance chain.
                        </p>

                        <SupportList
                            supports={supports}
                            title="Supporting Parties"
                            emptyMessage="No parties supporting this issue yet. Share it with larger parties!"
                        />

                        <div className="mt-6 card">
                            <h3 className="text-base font-semibold mb-2 text-text-secondary">
                                Create an Alliance
                            </h3>
                            <p className="text-sm text-text-muted mb-4">
                                Leaders can form a non-binding alliance with another party.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <select
                                    className="input flex-1"
                                    value={alliancePartyId}
                                    onChange={(event) => setAlliancePartyId(event.target.value)}
                                    disabled={!isLeader || allianceLoading}
                                >
                                    <option value="">Select a party</option>
                                    {otherParties.map(otherParty => (
                                        <option key={otherParty.id} value={otherParty.id}>
                                            {otherParty.issue_text.slice(0, 80)}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleCreateAlliance}
                                    disabled={!isLeader || allianceLoading}
                                >
                                    {allianceLoading ? 'Creating...' : 'Create Alliance'}
                                </button>
                            </div>
                            {!isLeader && (
                                <p className="text-xs text-text-muted mt-2">
                                    Only the current party leader can create an alliance.
                                </p>
                            )}
                            {allianceError && (
                                <p className="text-xs text-warning mt-2">{allianceError}</p>
                            )}
                        </div>

                        {/* Alliances */}
                        {alliances.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-base font-semibold mb-3 text-text-secondary">
                                    Your Alliance
                                </h3>
                                {alliances.map(alliance => {
                                    // Get other parties in the alliance (excluding current party)
                                    const otherMembers = alliance.members.filter(
                                        m => m.party_id !== party.id
                                    );

                                    return (
                                        <div key={alliance.id} className="card">
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <span className="font-medium">
                                                        {alliance.name || 'Unnamed Alliance'}
                                                    </span>
                                                    <span className="text-xs text-text-muted ml-2">
                                                        {alliance.members.length} parties
                                                    </span>
                                                </div>
                                                {isLeader && (
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleLeaveAlliance(alliance.id)}
                                                        disabled={revokeLoadingId === alliance.id}
                                                    >
                                                        {revokeLoadingId === alliance.id ? 'Leaving...' : 'Leave Alliance'}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {otherMembers.map(member => {
                                                    const memberParty = member.party as Party;
                                                    return (
                                                        <Link
                                                            key={member.id}
                                                            href={`/party/${memberParty.id}`}
                                                            className="card px-3 py-3 no-underline hover:bg-bg-hover"
                                                        >
                                                            <span className="text-sm">
                                                                {memberParty.issue_text.slice(0, 60)}...
                                                            </span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                                {revokeError && (
                                    <p className="text-xs text-warning mt-2">{revokeError}</p>
                                )}
                            </div>
                        )}

                        {/* Escalations */}
                        {escalations.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-base font-semibold mb-3 text-text-secondary">
                                    Escalated To
                                </h3>
                                <Link
                                    href={`/escalation/${party.id}`}
                                    className="btn btn-secondary"
                                >
                                    View Escalation Trail →
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Leave Modal */}
            {showLeaveModal && (
                <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
                    <div className="card max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-3">Leave Party?</h3>
                        <p className="text-sm text-text-secondary mb-4">
                            Your trust vote will be removed. You can rejoin anytime.
                        </p>
                        <div className="form-group">
                            <label className="label">Feedback (optional)</label>
                            <textarea
                                className="input min-h-[80px]"
                                placeholder="Why are you leaving? Help the party improve..."
                                value={leaveFeedback}
                                onChange={(e) => setLeaveFeedback(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={() => setShowLeaveModal(false)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLeave}
                                className="btn btn-danger"
                                disabled={joinLoading}
                            >
                                {joinLoading ? 'Leaving...' : 'Leave Party'}
                            </button>
                        </div>
                        <p className="text-xs text-text-muted mt-4 text-center">
                            🔓 Exit must always be easier than control
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
