import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type Party = {
    id: string;
    issue_text: string;
    pincodes: string[];
} | null;

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/auth');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();

    const { data: activeMembership } = await supabase
        .from('memberships')
        .select('joined_at, party:parties(id, issue_text, pincodes)')
        .eq('user_id', user.id)
        .is('left_at', null)
        .maybeSingle() as { data: { joined_at: string; party: Party } | null };

    const { data: likedParties } = await supabase
        .from('party_likes')
        .select('party:parties(id, issue_text, pincodes), created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) as unknown as { data: { party: Party; created_at: string }[] | null };

    const { data: membershipHistory } = await supabase
        .from('memberships')
        .select('joined_at, left_at, party:parties(id, issue_text, pincodes)')
        .eq('user_id', user.id)
        .not('left_at', 'is', null)
        .order('left_at', { ascending: false }) as unknown as { data: { joined_at: string; left_at: string; party: Party }[] | null };

    const displayName = profile?.display_name || user.user_metadata?.full_name || user.email;

    return (
        <div className="container mx-auto px-4 py-8 sm:py-10 max-w-4xl">
            <div className="card-glass animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Profile</p>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary">
                            {displayName}
                        </h1>
                        <p className="text-sm text-text-muted">{user.email}</p>
                    </div>
                    <Link href="/" className="btn btn-secondary btn-sm">
                        Browse Parties
                    </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="card">
                        <h2 className="text-sm font-semibold text-text-secondary mb-3">Active Membership</h2>
                        {activeMembership?.party ? (
                            <div className="flex flex-col gap-2">
                                <Link href={`/party/${activeMembership.party.id}`} className="text-base font-semibold text-primary-light">
                                    {activeMembership.party.issue_text}
                                </Link>
                                <p className="text-xs text-text-muted">
                                    Joined {new Date(activeMembership.joined_at).toLocaleDateString()}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {activeMembership.party.pincodes.map((pincode: string) => (
                                        <span key={pincode} className="pincode-tag">
                                            📍 {pincode}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-text-muted">
                                You have not joined a party yet.
                            </p>
                        )}
                    </div>

                    <div className="card">
                        <h2 className="text-sm font-semibold text-text-secondary mb-3">Membership History</h2>
                        {membershipHistory && membershipHistory.length > 0 ? (
                            <div className="space-y-3">
                                {membershipHistory.map((entry) => (
                                    entry.party ? (
                                        <div key={`${entry.party.id}-${entry.left_at}`} className="rounded-xl border border-border-primary bg-bg-secondary p-3">
                                            <Link href={`/party/${entry.party.id}`} className="text-base font-semibold text-primary-light">
                                                {entry.party.issue_text}
                                            </Link>
                                            <p className="text-xs text-text-muted mt-1">
                                                Joined {entry.joined_at ? new Date(entry.joined_at).toLocaleDateString() : 'N/A'} · Left {entry.left_at ? new Date(entry.left_at).toLocaleDateString() : 'N/A'}
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {entry.party.pincodes.map((pincode: string) => (
                                                    <span key={pincode} className="pincode-tag">
                                                        📍 {pincode}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-text-muted">No past memberships yet.</p>
                        )}
                    </div>
                </div>

                <div className="card mt-4">
                    <h2 className="text-sm font-semibold text-text-secondary mb-4">Liked Parties</h2>
                    {likedParties && likedParties.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {likedParties.map((like) => (
                                like.party ? (
                                    <div key={`${like.party.id}-${like.created_at}`} className="rounded-xl border border-border-primary bg-bg-secondary p-3">
                                        <Link href={`/party/${like.party.id}`} className="font-semibold text-primary-light">
                                            {like.party.issue_text}
                                        </Link>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {like.party.pincodes.map((pincode: string) => (
                                                <span key={pincode} className="pincode-tag">
                                                    📍 {pincode}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : null
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-text-muted">You haven't liked any parties yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}