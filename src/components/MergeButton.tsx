'use client';

import { useState } from 'react';
import { useAuth } from './AuthContext';
import type { Party, PartyMergeWithParent, MemberBreakdown } from '@/types/database';

type MergeButtonProps = {
    party: Party;
    currentMerge: PartyMergeWithParent | null;
    isLeader: boolean;
    availableParties: Party[];
    onMergeChange: () => void;
};

export function MergeButton({
    party,
    currentMerge,
    isLeader,
    availableParties,
    onMergeChange
}: MergeButtonProps) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedParentId, setSelectedParentId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    if (!user) return null;

    const handleMerge = async () => {
        if (!selectedParentId) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/parties/${party.id}/merge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parent_party_id: selectedParentId })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to merge');
            }

            setShowModal(false);
            onMergeChange();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to merge');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDemerge = async () => {
        if (!confirm('Are you sure you want to demerge from the parent party?')) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/parties/${party.id}/merge`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to demerge');
            }

            onMergeChange();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to demerge');
        } finally {
            setIsLoading(false);
        }
    };

    // If party is already merged, show demerge button
    if (currentMerge) {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-text-secondary bg-bg-tertiary rounded-lg px-3 py-2">
                    <span>🔗</span>
                    <span>Merged into: <strong className="text-text-primary">{currentMerge.parent_party.issue_text.slice(0, 50)}...</strong></span>
                </div>
                {isLeader && (
                    <button
                        onClick={handleDemerge}
                        disabled={isLoading}
                        className="btn btn-secondary btn-sm w-full"
                    >
                        {isLoading ? 'Processing...' : '🔓 Demerge from Parent'}
                    </button>
                )}
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
        );
    }

    // Show merge button for leaders
    if (!isLeader) return null;

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="btn btn-secondary btn-sm"
            >
                🔗 Merge into Party
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-bg-card rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Merge into Parent Party</h3>

                        <p className="text-sm text-text-secondary mb-4">
                            Select a party to merge into. Your party&apos;s members will contribute to the parent&apos;s total count.
                        </p>

                        {availableParties.length === 0 ? (
                            <p className="text-sm text-text-muted">No available parties to merge into.</p>
                        ) : (
                            <div className="space-y-2 mb-4">
                                {availableParties.map(p => (
                                    <label
                                        key={p.id}
                                        className={`block p-3 rounded-lg border cursor-pointer transition-colors ${selectedParentId === p.id
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border-primary hover:border-border-hover'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="parentParty"
                                            value={p.id}
                                            checked={selectedParentId === p.id}
                                            onChange={() => setSelectedParentId(p.id)}
                                            className="hidden"
                                        />
                                        <p className="text-sm text-text-primary line-clamp-2">{p.issue_text}</p>
                                    </label>
                                ))}
                            </div>
                        )}

                        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="btn btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMerge}
                                disabled={isLoading || !selectedParentId}
                                className="btn btn-primary flex-1"
                            >
                                {isLoading ? 'Merging...' : 'Merge'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Component to show member breakdown for parties with merged children
type MemberBreakdownProps = {
    partyId: string;
    totalMembers: number;
};

export function MemberBreakdownDisplay({ partyId, totalMembers }: MemberBreakdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [breakdown, setBreakdown] = useState<MemberBreakdown[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const loadBreakdown = async () => {
        if (breakdown) {
            setIsOpen(!isOpen);
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/parties/${partyId}/merge`);
            if (res.ok) {
                const data = await res.json();
                setBreakdown(data.breakdown || []);
                setIsOpen(true);
            }
        } catch {
            // Ignore errors
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <button
                onClick={loadBreakdown}
                className="text-sm text-primary hover:underline flex items-center gap-1"
            >
                <span className="font-semibold">{totalMembers}</span>
                <span className="text-text-secondary">members</span>
                <span className="text-xs">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && breakdown && breakdown.length > 1 && (
                <div className="mt-2 p-3 bg-bg-tertiary rounded-lg text-sm space-y-1">
                    {breakdown.map(item => (
                        <div key={item.party_id} className="flex justify-between">
                            <span className={item.is_self ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                                {item.is_self ? 'This party' : item.issue_text.slice(0, 30) + '...'}
                            </span>
                            <span className="text-text-muted">{item.member_count}</span>
                        </div>
                    ))}
                </div>
            )}

            {isLoading && (
                <div className="mt-2 text-sm text-text-muted">Loading...</div>
            )}
        </div>
    );
}
