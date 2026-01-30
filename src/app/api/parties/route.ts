import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/parties - List all parties
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    // Optional filters
    const pincode = searchParams.get('pincode');
    const minLevel = searchParams.get('minLevel');

    let query = supabase
        .from('parties')
        .select('*')
        .order('created_at', { ascending: false });

    if (pincode) {
        query = query.contains('pincodes', [pincode]);
    }

    const { data: parties, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get member counts
    const enrichedParties = await Promise.all(
        (parties || []).map(async (party) => {
            const { count } = await supabase
                .from('memberships')
                .select('*', { count: 'exact', head: true })
                .eq('party_id', party.id)
                .is('left_at', null);

            const memberCount = count || 0;
            let level: 1 | 2 | 3 | 4;
            if (memberCount <= 10) level = 1;
            else if (memberCount <= 100) level = 2;
            else if (memberCount <= 1000) level = 3;
            else level = 4;

            return { ...party, member_count: memberCount, level };
        })
    );

    // Filter by level if specified
    let result = enrichedParties;
    if (minLevel) {
        result = enrichedParties.filter(p => p.level >= parseInt(minLevel));
    }

    return NextResponse.json(result);
}

// POST /api/parties - Create a new party
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { issue_text, pincodes } = body;

    // Validation
    if (!issue_text || issue_text.length > 280) {
        return NextResponse.json(
            { error: 'Issue text is required and must be 280 characters or less' },
            { status: 400 }
        );
    }

    if (!pincodes || !Array.isArray(pincodes) || pincodes.length === 0) {
        return NextResponse.json(
            { error: 'At least one pincode is required' },
            { status: 400 }
        );
    }

    // Create party
    const { data: party, error: partyError } = await supabase
        .from('parties')
        .insert({
            issue_text,
            pincodes,
            created_by: user.id
        })
        .select()
        .single();

    if (partyError) {
        return NextResponse.json({ error: partyError.message }, { status: 500 });
    }

    // Auto-join creator
    await supabase
        .from('memberships')
        .insert({
            party_id: party.id,
            user_id: user.id
        });

    return NextResponse.json(party, { status: 201 });
}
