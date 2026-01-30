'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function CreatePartyPage() {
    const [issueText, setIssueText] = useState('');
    const [pincodes, setPincodes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/auth');
                return;
            }

            // Parse pincodes (comma or space separated)
            const pincodeArray = pincodes
                .split(/[,\s]+/)
                .map(p => p.trim())
                .filter(p => p.length === 6 && /^\d+$/.test(p));

            if (pincodeArray.length === 0) {
                throw new Error('Please enter at least one valid 6-digit pincode');
            }

            if (issueText.length > 280) {
                throw new Error('Issue text must be 280 characters or less');
            }

            const { data: activeMembership } = await supabase
                .from('memberships')
                .select('id')
                .eq('user_id', user.id)
                .is('left_at', null)
                .maybeSingle();

            if (activeMembership) {
                throw new Error('You can only join one party at a time. Leave your current party first.');
            }

            // Create party
            const { data: party, error: partyError } = await supabase
                .from('parties')
                .insert({
                    issue_text: issueText,
                    pincodes: pincodeArray,
                    created_by: user.id
                })
                .select()
                .single();

            if (partyError) throw partyError;

            // Auto-join the party as creator
            const { error: memberError } = await supabase
                .from('memberships')
                .insert({
                    party_id: party.id,
                    user_id: user.id
                });

            if (memberError) {
                const message = memberError.message.includes('idx_memberships_user_active')
                    ? 'You can only join one party at a time. Leave your current party first.'
                    : memberError.message;
                throw new Error(message);
            }

            router.push(`/party/${party.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create party');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 sm:py-12 max-w-2xl">
            <div className="card animate-fade-in">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold mb-2">Create Issue-Party</h1>
                    <p className="text-sm text-text-secondary">
                        One issue. Local focus. No ideology.
                    </p>
                </div>

                {/* Rules */}
                <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 mb-6">
                    <p className="text-sm text-text-secondary leading-relaxed">
                        <strong className="text-primary-light">Remember:</strong><br />
                        • Each party = ONE issue only<br />
                        • Tie your issue to specific pincodes<br />
                        • No logos, symbols, or manifestos<br />
                        • You can only join one party at a time (likes are unlimited)
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="label flex items-center justify-between">
                            Issue Statement
                            <span className={`text-xs ${issueText.length > 280 ? 'text-danger' : 'text-text-muted'}`}>
                                {issueText.length}/280
                            </span>
                        </label>
                        <textarea
                            className="input textarea"
                            placeholder="Describe your single political issue clearly. Be specific about what you want to achieve."
                            value={issueText}
                            onChange={(e) => setIssueText(e.target.value)}
                            maxLength={300}
                            required
                        />
                        <span className="form-hint">
                            Example: "Demand clean drinking water supply for Jaipur 302001. Current water quality is unsafe for consumption."
                        </span>
                    </div>

                    <div className="form-group">
                        <label className="label">Pincodes</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="302001, 302002, 302003"
                            value={pincodes}
                            onChange={(e) => setPincodes(e.target.value)}
                            required
                        />
                        <span className="form-hint">
                            Enter 6-digit pincodes separated by commas. Your issue will be visible to people in these areas.
                        </span>
                    </div>

                    {error && (
                        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger text-sm mb-4">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="btn btn-secondary sm:flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary sm:flex-[2]"
                            disabled={loading || issueText.length === 0}
                        >
                            {loading ? 'Creating...' : 'Create Party'}
                        </button>
                    </div>
                </form>

                {/* Philosophy Note */}
                <div className="mt-6 rounded-xl bg-bg-tertiary px-4 py-3 text-center">
                    <p className="text-text-muted text-xs">
                        🔓 You'll automatically join as the first member.
                        Leadership is earned through trust, not declared.
                    </p>
                </div>
            </div>
        </div>
    );
}
