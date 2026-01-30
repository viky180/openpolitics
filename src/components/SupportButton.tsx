'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupportWithParty, Party } from '@/types/database';
import Link from 'next/link';

interface SupportButtonProps {
    fromPartyId: string;
    toPartyId: string;
    toPartyName: string;
    isLeader: boolean;
    existingSupport: SupportWithParty | null;
    onSupportChange: () => void;
}

export function SupportButton({
    fromPartyId,
    toPartyId,
    toPartyName,
    isLeader,
    existingSupport,
    onSupportChange
}: SupportButtonProps) {
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    if (!isLeader) return null;

    const isSupporting = existingSupport && !existingSupport.is_revoked;

    const handleSupport = async () => {
        setLoading(true);

        try {
            if (isSupporting) {
                // Revoke support
                await supabase
                    .from('revocations')
                    .insert({
                        party_id: toPartyId,
                        revoking_party_id: fromPartyId,
                        target_type: 'issue',
                        target_id: toPartyId,
                        reason: null
                    });
            } else {
                // Add support
                await supabase
                    .from('party_supports')
                    .insert({
                        from_party_id: fromPartyId,
                        to_party_id: toPartyId,
                        support_type: 'explicit',
                        target_type: 'issue',
                        target_id: toPartyId
                    });
            }

            onSupportChange();
        } catch (err) {
            console.error('Support error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleSupport}
            disabled={loading}
            className={`btn ${isSupporting ? 'btn-danger' : 'btn-success'}`}
        >
            {loading
                ? '...'
                : isSupporting
                    ? '✋ Revoke Support'
                    : `🤝 Support "${toPartyName.slice(0, 30)}..."`
            }
        </button>
    );
}

// Support list display
interface SupportListProps {
    supports: SupportWithParty[];
    title: string;
    emptyMessage: string;
}

export function SupportList({ supports, title, emptyMessage }: SupportListProps) {
    const activeSupports = supports.filter(s => !s.is_revoked);
    const revokedSupports = supports.filter(s => s.is_revoked);

    return (
        <div>
            <h3 className="text-base font-semibold mb-3 text-text-secondary">
                {title} ({activeSupports.length})
            </h3>

            <div className="flex flex-col gap-2">
                {activeSupports.map((support) => (
                    <Link
                        key={support.id}
                        href={`/party/${support.from_party.id}`}
                        className="card flex items-center justify-between gap-3 no-underline"
                    >
                        <div>
                            <span className="text-sm">
                                {support.from_party.issue_text.slice(0, 50)}...
                            </span>
                            <div className="text-xs text-text-muted mt-1">
                                📍 {support.from_party.pincodes.slice(0, 2).join(', ')}
                            </div>
                        </div>
                        <span className={`badge ${support.support_type === 'explicit' ? 'badge-support' : 'badge-implicit'}`}>
                            {support.support_type === 'explicit' ? '✓ Explicit' : '⟡ Implicit'}
                        </span>
                    </Link>
                ))}

                {activeSupports.length === 0 && (
                    <div className="empty-state">
                        <p className="text-sm">{emptyMessage}</p>
                    </div>
                )}

                {revokedSupports.length > 0 && (
                    <div className="mt-4">
                        <div className="text-xs text-text-muted mb-2">
                            Revoked ({revokedSupports.length})
                        </div>
                        {revokedSupports.map((support) => (
                            <div
                                key={support.id}
                                className="card opacity-60 mb-1 px-3 py-2"
                            >
                                <span className="text-xs line-through">
                                    {support.from_party.issue_text.slice(0, 40)}...
                                </span>
                                <span className="badge badge-revoked ml-2">
                                    Revoked
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Support chain visualization
interface SupportChainProps {
    chain: Party[];
}

export function SupportChain({ chain }: SupportChainProps) {
    if (chain.length === 0) return null;

    return (
        <div className="support-chain">
            {chain.map((party, idx) => (
                <div key={party.id} className="support-chain-item">
                    {idx > 0 && <span className="support-chain-arrow">→</span>}
                    <Link
                        href={`/party/${party.id}`}
                        className="text-xs text-text-primary no-underline"
                    >
                        {party.issue_text.slice(0, 25)}...
                    </Link>
                </div>
            ))}
        </div>
    );
}
