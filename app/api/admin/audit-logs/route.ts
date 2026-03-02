import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(_request: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (session.role !== 'collection_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const client = supabaseAdmin ?? supabase

  try {
    const { data, error } = await client
      .from('audit_logs')
      .select(
        `
        *,
        actor:actor_id (full_name),
        target_user:target_user_id (full_name)
      `
      )
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching audit logs:', error)
      return NextResponse.json(
        { error: 'Failed to load audit logs' },
        { status: 500 }
      )
    }

    return NextResponse.json({ logs: data ?? [] })
  } catch (e) {
    console.error('Unexpected error fetching audit logs:', e)
    return NextResponse.json(
      { error: 'Failed to load audit logs' },
      { status: 500 }
    )
  }
}

