import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface Props {
    params: Promise<{ id: string }>;
}

// POST /api/parties/[id]/join - Join a party
export async function POST(request: NextRequest, { params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if already a member
    const { data: existing } = await supabase
        .from('memberships')
        .select('id')
        .eq('party_id', id)
        .eq('user_id', user.id)
        .is('left_at', null)
        .maybeSingle();

    if (existing) {
        return NextResponse.json({ error: 'Already a member' }, { status: 400 });
    }

    // Enforce single active membership across parties
    const { data: activeMembership } = await supabase
        .from('memberships')
        .select('party_id')
        .eq('user_id', user.id)
        .is('left_at', null)
        .maybeSingle();

    if (activeMembership) {
        return NextResponse.json(
            { error: 'You can only join one party at a time. Leave your current party first.' },
            { status: 400 }
        );
    }

    // Join party
    const { data, error } = await supabase
        .from('memberships')
        .insert({
            party_id: id,
            user_id: user.id
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}
