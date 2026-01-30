import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/parties/[id]/merge - Get merge status and breakdown
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();

    // Get current merge status (if this party is merged into another)
    const { data: currentMerge } = await supabase
        .from('party_merges')
        .select('*, parent_party:parties!party_merges_parent_party_id_fkey(*)')
        .eq('child_party_id', id)
        .is('demerged_at', null)
        .maybeSingle();

    // Get children (parties merged into this one)
    const { data: children } = await supabase
        .from('party_merges')
        .select('*, child_party:parties!party_merges_child_party_id_fkey(*)')
        .eq('parent_party_id', id)
        .is('demerged_at', null);

    // Get member breakdown using RPC function
    const { data: breakdown } = await supabase.rpc('get_party_member_breakdown', {
        p_party_id: id
    });

    // Get total members including merged children
    const { data: totalMembers } = await supabase.rpc('get_party_total_members', {
        p_party_id: id
    });

    return NextResponse.json({
        current_merge: currentMerge,
        children: children || [],
        breakdown: breakdown || [],
        total_members: totalMembers || 0
    });
}

// POST /api/parties/[id]/merge - Merge this party into a parent
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: childPartyId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { parent_party_id } = body;

    if (!parent_party_id) {
        return NextResponse.json({ error: 'parent_party_id is required' }, { status: 400 });
    }

    if (childPartyId === parent_party_id) {
        return NextResponse.json({ error: 'Cannot merge party into itself' }, { status: 400 });
    }

    // Check if user is the leader of the child party
    const { data: leaderId } = await supabase.rpc('get_party_leader', {
        p_party_id: childPartyId
    });

    if (leaderId !== user.id) {
        return NextResponse.json({ error: 'Only the party leader can initiate a merge' }, { status: 403 });
    }

    // Check if child party is already merged
    const { data: existingMerge } = await supabase
        .from('party_merges')
        .select('id')
        .eq('child_party_id', childPartyId)
        .is('demerged_at', null)
        .maybeSingle();

    if (existingMerge) {
        return NextResponse.json({ error: 'Party is already merged. Demerge first.' }, { status: 400 });
    }

    // Check for circular merge (parent can't be a descendant of child)
    const { data: wouldCycle } = await supabase.rpc('check_merge_cycle', {
        child_id: childPartyId,
        parent_id: parent_party_id
    });

    if (wouldCycle) {
        return NextResponse.json({ error: 'Cannot create circular merge. The target party is already in your merge tree.' }, { status: 400 });
    }

    // Create the merge
    const { data: merge, error } = await supabase
        .from('party_merges')
        .insert({
            child_party_id: childPartyId,
            parent_party_id: parent_party_id,
            merged_by: user.id
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(merge, { status: 201 });
}

// DELETE /api/parties/[id]/merge - Demerge this party from its parent
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: childPartyId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current merge
    const { data: currentMerge } = await supabase
        .from('party_merges')
        .select('*')
        .eq('child_party_id', childPartyId)
        .is('demerged_at', null)
        .maybeSingle();

    if (!currentMerge) {
        return NextResponse.json({ error: 'Party is not merged' }, { status: 400 });
    }

    // Check if user is the leader who initiated the merge OR the current leader
    const { data: leaderId } = await supabase.rpc('get_party_leader', {
        p_party_id: childPartyId
    });

    // Allow demerge if user is the original merger or current leader
    if (currentMerge.merged_by !== user.id && leaderId !== user.id) {
        return NextResponse.json({ error: 'Only the party leader can demerge' }, { status: 403 });
    }

    // Perform demerge
    const { error } = await supabase
        .from('party_merges')
        .update({
            demerged_at: new Date().toISOString(),
            demerged_by: user.id
        })
        .eq('id', currentMerge.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
