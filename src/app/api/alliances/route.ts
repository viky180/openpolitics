import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/alliances - List all active alliances with members
export async function GET() {
    const supabase = await createClient();

    const { data: alliances, error } = await supabase
        .from('alliances')
        .select('*')
        .is('disbanded_at', null)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allianceIds = (alliances || []).map(a => a.id);
    if (allianceIds.length === 0) {
        return NextResponse.json([]);
    }

    const { data: members, error: membersError } = await supabase
        .from('alliance_members')
        .select('*')
        .in('alliance_id', allianceIds)
        .is('left_at', null);

    if (membersError) {
        return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    const partyIds = Array.from(new Set((members || []).map(member => member.party_id)));
    const { data: parties, error: partiesError } = await supabase
        .from('parties')
        .select('*')
        .in('id', partyIds);

    if (partiesError) {
        return NextResponse.json({ error: partiesError.message }, { status: 500 });
    }

    const partyMap = new Map((parties || []).map(party => [party.id, party]));
    const membersByAlliance = new Map<string, Array<Record<string, unknown>>>();
    (members || []).forEach(member => {
        const enrichedMember = {
            ...member,
            party: partyMap.get(member.party_id) || null
        };
        const existing = membersByAlliance.get(member.alliance_id) || [];
        existing.push(enrichedMember);
        membersByAlliance.set(member.alliance_id, existing);
    });

    const activeAlliances = (alliances || [])
        .map(alliance => ({
            ...alliance,
            members: membersByAlliance.get(alliance.id) || []
        }))
        .filter(alliance => alliance.members.length > 0);

    return NextResponse.json(activeAlliances);
}

// POST /api/alliances - Create an alliance or add party to existing alliance
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, party_ids, alliance_id, party_id } = body;

    // If alliance_id and party_id provided, add party to existing alliance
    if (alliance_id && party_id) {
        // Check if party is already in an alliance
        const { data: existingMembership } = await supabase
            .from('alliance_members')
            .select('id')
            .eq('party_id', party_id)
            .is('left_at', null)
            .maybeSingle();

        if (existingMembership) {
            return NextResponse.json(
                { error: 'This party is already in an alliance. Leave the current alliance first.' },
                { status: 400 }
            );
        }

        const { data: member, error: memberError } = await supabase
            .from('alliance_members')
            .insert({ alliance_id, party_id })
            .select()
            .single();

        if (memberError) {
            return NextResponse.json({ error: memberError.message }, { status: 500 });
        }

        return NextResponse.json(member, { status: 201 });
    }

    // Otherwise create new alliance with multiple parties
    if (!party_ids || !Array.isArray(party_ids) || party_ids.length < 2) {
        return NextResponse.json(
            { error: 'At least 2 party_ids are required to create an alliance' },
            { status: 400 }
        );
    }

    // Check if any party is already in an alliance
    const { data: existingMemberships } = await supabase
        .from('alliance_members')
        .select('party_id')
        .in('party_id', party_ids)
        .is('left_at', null);

    if (existingMemberships && existingMemberships.length > 0) {
        return NextResponse.json(
            { error: 'One or more parties are already in an alliance.' },
            { status: 400 }
        );
    }

    // Create the alliance
    const { data: alliance, error: allianceError } = await supabase
        .from('alliances')
        .insert({ name: name || null })
        .select()
        .single();

    if (allianceError) {
        return NextResponse.json({ error: allianceError.message }, { status: 500 });
    }

    // Add all parties as members
    const memberInserts = party_ids.map(pid => ({
        alliance_id: alliance.id,
        party_id: pid
    }));

    const { error: membersError } = await supabase
        .from('alliance_members')
        .insert(memberInserts);

    if (membersError) {
        // Rollback alliance creation
        await supabase.from('alliances').delete().eq('id', alliance.id);
        return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    return NextResponse.json(alliance, { status: 201 });
}

// DELETE /api/alliances - Leave an alliance (remove party)
export async function DELETE(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { alliance_id, party_id, disband } = body;

    if (!alliance_id) {
        return NextResponse.json({ error: 'alliance_id is required' }, { status: 400 });
    }

    // If disband is true, disband the entire alliance
    if (disband) {
        const { error } = await supabase
            .from('alliances')
            .update({ disbanded_at: new Date().toISOString() })
            .eq('id', alliance_id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Also mark all members as left
        await supabase
            .from('alliance_members')
            .update({ left_at: new Date().toISOString() })
            .eq('alliance_id', alliance_id)
            .is('left_at', null);

        return NextResponse.json({ success: true, disbanded: true });
    }

    // Otherwise remove specific party from alliance
    if (!party_id) {
        return NextResponse.json({ error: 'party_id is required to leave alliance' }, { status: 400 });
    }

    const { error } = await supabase
        .from('alliance_members')
        .update({ left_at: new Date().toISOString() })
        .eq('alliance_id', alliance_id)
        .eq('party_id', party_id)
        .is('left_at', null);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check remaining members
    const { count } = await supabase
        .from('alliance_members')
        .select('*', { count: 'exact', head: true })
        .eq('alliance_id', alliance_id)
        .is('left_at', null);

    // If less than 2 members remain, disband the alliance
    if (count !== null && count < 2) {
        await supabase
            .from('alliances')
            .update({ disbanded_at: new Date().toISOString() })
            .eq('id', alliance_id);

        // Mark remaining member as left
        await supabase
            .from('alliance_members')
            .update({ left_at: new Date().toISOString() })
            .eq('alliance_id', alliance_id)
            .is('left_at', null);

        return NextResponse.json({ success: true, disbanded: true, reason: 'Less than 2 members remaining' });
    }

    return NextResponse.json({ success: true });
}
