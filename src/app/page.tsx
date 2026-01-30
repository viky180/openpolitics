import { createClient } from '@/lib/supabase/server';
import { PartyCard } from '@/components/PartyCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch parties with member counts
  const { data: parties } = await supabase
    .from('parties')
    .select('*')
    .order('created_at', { ascending: false });

  // Get member counts for each party (including merged children)
  const partyWithCounts = await Promise.all(
    (parties || []).map(async (party) => {
      // Use get_party_total_members to include merged party members
      const { data: totalMembers } = await supabase.rpc('get_party_total_members', {
        p_party_id: party.id
      });

      // Also check if this party is merged into another
      const { data: mergeData } = await supabase
        .from('party_merges')
        .select('parent_party_id, parent:parent_party_id(issue_text)')
        .eq('child_party_id', party.id)
        .is('demerged_at', null)
        .maybeSingle();

      return {
        party,
        memberCount: totalMembers || 0,
        mergedInto: mergeData?.parent ? (mergeData.parent as { issue_text: string }).issue_text : null
      };
    })
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-10 sm:mb-12 px-5 py-8 sm:p-12 bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 rounded-2xl border border-border-primary backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">
          Local issues, collective power
        </p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent tracking-tight">
          Decentralized Issue-Based Politics
        </h1>
        <p className="text-text-secondary text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8">
          Form single-issue local parties. Leadership emerges through trust votes.
          No central authority, no elections, no ideology.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link href="/party/create" className="btn btn-primary btn-lg shadow-xl shadow-primary/20">
            + Create Issue-Party
          </Link>
          <Link href="/alliances" className="btn btn-secondary btn-lg">
            View Alliances
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="stat-card group hover:scale-[1.02] transition-transform">
          <div className="stat-value text-primary group-hover:text-primary-dark transition-colors">{parties?.length || 0}</div>
          <div className="stat-label">Issue-Parties</div>
        </div>
        <div className="stat-card group hover:scale-[1.02] transition-transform">
          <div className="stat-value text-accent group-hover:text-accent-dark transition-colors">
            {partyWithCounts.reduce((sum, p) => sum + p.memberCount, 0)}
          </div>
          <div className="stat-label">Total Members</div>
        </div>
        <div className="stat-card group hover:scale-[1.02] transition-transform">
          <div className="stat-value text-secondary group-hover:text-secondary-dark transition-colors">
            {new Set(parties?.flatMap(p => p.pincodes) || []).size}
          </div>
          <div className="stat-label">Pincodes Covered</div>
        </div>
      </div>

      {/* Party Levels Legend */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8">
        <span className="badge badge-level-1">Level 1: 1-10</span>
        <span className="badge badge-level-2">Level 2: 11-100</span>
        <span className="badge badge-level-3">Level 3: 101-1000</span>
        <span className="badge badge-level-4">Level 4: 1000+</span>
      </div>

      {/* Parties List */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-text-secondary">
          All Issue-Parties
        </h2>
        <Link href="/party/create" className="btn btn-secondary btn-sm hidden sm:inline-flex">
          + Create Party
        </Link>
      </div>

      {partyWithCounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partyWithCounts.map(({ party, memberCount, mergedInto }) => (
            <PartyCard
              key={party.id}
              party={party}
              memberCount={memberCount}
              mergedInto={mergedInto}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="text-text-muted">No issue-parties yet. Be the first to create one!</p>
          <Link href="/party/create" className="btn btn-primary">
            Create Issue-Party
          </Link>
        </div>
      )}

      {/* Philosophy Section */}
      <div className="mt-12 sm:mt-16 px-6 py-8 sm:p-10 bg-bg-secondary rounded-2xl border border-border-primary">
        <h3 className="text-lg font-semibold mb-6 text-text-primary flex items-center gap-2">
          <span>🏛️</span> How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-sm text-text-secondary">
          <div className="p-4 bg-bg-card rounded-xl border border-border-primary hover:shadow-md transition-shadow">
            <strong className="block text-primary-light mb-2 text-base">1. Create Issue-Party</strong>
            <p>One issue only. Tied to pincodes. No ideology, no manifesto. Focus on what matters locally.</p>
          </div>
          <div className="p-4 bg-bg-card rounded-xl border border-border-primary hover:shadow-md transition-shadow">
            <strong className="block text-primary-light mb-2 text-base">2. Join & Vote Trust</strong>
            <p>Members give trust votes. Leader = most trusted. Votes expire in 90 days ensuring active consent.</p>
          </div>
          <div className="p-4 bg-bg-card rounded-xl border border-border-primary hover:shadow-md transition-shadow">
            <strong className="block text-primary-light mb-2 text-base">3. Ask Questions</strong>
            <p>Public Q&A board. Questions can never be deleted. Accountability matters more than promises.</p>
          </div>
          <div className="p-4 bg-bg-card rounded-xl border border-border-primary hover:shadow-md transition-shadow">
            <strong className="block text-primary-light mb-2 text-base">4. Support & Escalate</strong>
            <p>Larger parties support smaller ones. Issues propagate up. Pressure builds from the bottom up.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
