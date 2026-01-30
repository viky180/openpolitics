import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface Props {
    params: Promise<{ id: string }>;
}

// POST /api/parties/[id]/leave - Leave a party
export async function POST(request: NextRequest, { params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { feedback } = body;

    // Update membership
    const { error: leaveError } = await supabase
        .from('memberships')
        .update({
            left_at: new Date().toISOString(),
            leave_feedback: feedback || null
        })
        .eq('party_id', id)
        .eq('user_id', user.id)
        .is('left_at', null);

    if (leaveError) {
        return NextResponse.json({ error: leaveError.message }, { status: 500 });
    }

    // Remove any trust votes given by this user
    await supabase
        .from('trust_votes')
        .delete()
        .eq('party_id', id)
        .eq('from_user_id', user.id);

    return NextResponse.json({ success: true });
}
