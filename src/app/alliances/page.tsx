import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { calculatePartyLevel } from '@/types/database';
import type { Party, AllianceWithMembers } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AlliancesPage() {
    const supabase = await createClient();

    // Fetch all active alliances
    const { data: allianceRows } = await supabase
        .from('alliances')
        .select('*')
        .is('disbanded_at', null)
        .order('created_at', { ascending: false });

    const allianceIds = (allianceRows || []).map(alliance => alliance.id);
    const { data: memberRows } = allianceIds.length > 0
        ? await supabase
            .from('alliance_members')
            .select('*')
            .in('alliance_id', allianceIds)
            .is('left_at', null)
        : { data: [] };

    const memberPartyIds = Array.from(new Set((memberRows || []).map(member => member.party_id)));
    const { data: partyRows } = memberPartyIds.length > 0
        ? await supabase
            .from('parties')
            .select('*')
            .in('id', memberPartyIds)
        : { data: [] };

    const partyMap = new Map((partyRows || []).map(party => [party.id, party]));
    const membersByAlliance = new Map<string, Array<Record<string, unknown>>>();
    (memberRows || []).forEach(member => {
        const enrichedMember = {
            ...member,
            party: partyMap.get(member.party_id) || null
        };
        const existing = membersByAlliance.get(member.alliance_id) || [];
        existing.push(enrichedMember);
        membersByAlliance.set(member.alliance_id, existing);
    });

    // Filter to only include active members (left_at IS NULL)
    const alliances = (allianceRows || []).map(alliance => ({
        ...alliance,
        members: membersByAlliance.get(alliance.id) || []
    })).filter(alliance => alliance.members.length > 0) as AllianceWithMembers[];

    // Get member counts for parties
    const alliancePartyIds = new Set<string>();
    alliances.forEach(a => {
        a.members.forEach(m => alliancePartyIds.add(m.party_id));
    });

    const memberCounts: Record<string, number> = {};
    for (const partyId of alliancePartyIds) {
        const { count } = await supabase
            .from('memberships')
            .select('*', { count: 'exact', head: true })
            .eq('party_id', partyId)
            .is('left_at', null);
        memberCounts[partyId] = count || 0;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                    🤝 Party Alliances
                </h1>
                <p className="text-text-secondary text-sm">
                    Non-binding alliances between multiple parties. Alliances enable support propagation.
                </p>
            </div>

            {/* Explanation */}
            <div className="card mb-8">
                <h3 className="text-base font-semibold mb-3 text-text-primary">
                    How Alliances Work
                </h3>
                <ul className="text-sm text-text-secondary pl-5 leading-relaxed list-disc space-y-2">
                    <li>Alliances can have <strong>multiple parties</strong> (2 or more)</li>
                    <li>Each party can only be in <strong>one alliance</strong> at a time</li>
                    <li>Any party can leave at any time</li>
                    <li>When a larger party supports an issue, allied smaller parties get <strong>implicit support</strong></li>
                    <li>Smaller parties can revoke implicit support for specific issues without leaving the alliance</li>
                </ul>
            </div>

            {/* Alliance Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="stat-card">
                    <div className="stat-value">{alliances.length}</div>
                    <div className="stat-label">Active Alliances</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{alliancePartyIds.size}</div>
                    <div className="stat-label">Parties Involved</div>
                </div>
            </div>

            {/* Alliance List */}
            <h2 className="text-lg font-semibold mb-4 text-text-secondary">
                All Active Alliances
            </h2>

            {alliances.length > 0 ? (
                <div className="flex flex-col gap-6">
                    {alliances.map(alliance => (
                        <div key={alliance.id} className="card animate-fade-in">
                            {/* Alliance Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-base font-semibold text-text-primary">
                                        {alliance.name || 'Unnamed Alliance'}
                                    </h3>
                                    <span className="text-xs text-text-muted">
                                        {alliance.members.length} parties • Formed {new Date(alliance.created_at).toLocaleDateString('en-IN', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </div>
                                <span className="badge badge-secondary">
                                    🤝 {alliance.members.length} parties
                                </span>
                            </div>

                            {/* Member Parties */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {alliance.members.map(member => {
                                    const party = member.party as Party;
                                    const level = calculatePartyLevel(memberCounts[party.id] || 0);

                                    return (
                                        <Link
                                            key={member.id}
                                            href={`/party/${party.id}`}
                                            className="block no-underline"
                                        >
                                            <div className="rounded-xl bg-bg-tertiary p-3 transition-colors hover:bg-bg-hover">
                                                <span className={`badge badge-level-${level} mb-2 inline-block`}>
                                                    L{level} • {memberCounts[party.id] || 0}
                                                </span>
                                                <p className="text-sm text-text-primary line-clamp-2">
                                                    {party.issue_text}
                                                </p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-state-icon">🤝</div>
                    <p>No alliances yet. Parties can form alliances from their party pages.</p>
                </div>
            )}

            {/* Support Propagation Explanation */}
            <div className="mt-10 rounded-2xl border border-border-primary bg-gradient-to-br from-primary/10 to-accent/10 px-6 py-6">
                <h3 className="text-base font-semibold mb-4 text-text-primary">
                    📊 Support Propagation Logic
                </h3>
                <div className="text-sm text-text-secondary leading-relaxed space-y-3">
                    <p>
                        <strong className="text-accent">Explicit Support:</strong>
                        {' '}When a party directly supports another party&apos;s issue or question.
                    </p>
                    <p>
                        <strong className="text-primary-light">Implicit Support:</strong>
                        {' '}When a larger/higher-level party in an alliance supports an issue,
                        all allied smaller parties are assumed to support it by default.
                    </p>
                    <p>
                        <strong className="text-warning">Revocation:</strong>
                        {' '}Any party can revoke implicit support for a specific issue or question
                        without leaving the alliance. Revocation is public and timestamped.
                    </p>
                    <p>
                        <strong className="text-text-muted">Expiry:</strong>
                        {' '}Implicit support auto-expires in 30 days unless renewed.
                    </p>
                </div>
            </div>
        </div>
    );
}
