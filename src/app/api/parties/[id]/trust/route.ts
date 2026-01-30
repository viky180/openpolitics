import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface Props {
    params: Promise<{ id: string }>;
}

// POST /api/parties/[id]/trust - Give trust vote
export async function POST(request: NextRequest, { params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to_user_id } = body;

    if (!to_user_id) {
        return NextResponse.json({ error: 'to_user_id is required' }, { status: 400 });
    }

    // Check if user is a member
    const { data: membership } = await supabase
        .from('memberships')
        .select('id')
        .eq('party_id', id)
        .eq('user_id', user.id)
        .is('left_at', null)
        .maybeSingle();

    if (!membership) {
        return NextResponse.json({ error: 'Must be a member to vote' }, { status: 403 });
    }

    // Remove any existing vote
    await supabase
        .from('trust_votes')
        .delete()
        .eq('party_id', id)
        .eq('from_user_id', user.id);

    // Give new vote
    const { data, error } = await supabase
        .from('trust_votes')
        .insert({
            party_id: id,
            from_user_id: user.id,
            to_user_id
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
}

// DELETE /api/parties/[id]/trust - Withdraw trust vote
export async function DELETE(request: NextRequest, { params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await supabase
        .from('trust_votes')
        .delete()
        .eq('party_id', id)
        .eq('from_user_id', user.id);

    return NextResponse.json({ success: true });
}
