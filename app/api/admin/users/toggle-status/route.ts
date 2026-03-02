import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/db'

function getSessionData(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')
  if (!sessionCookie) {
    return null
  }

  try {
    const json = Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    return JSON.parse(json) as {
      userId: string
      role: 'collection_manager' | 'field_agent'
    }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionData(request)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'collection_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const client = supabaseAdmin ?? supabase

  const { userId, isActive } = await request.json()

  if (!userId || typeof isActive !== 'boolean') {
    return NextResponse.json(
      { error: 'Invalid request payload' },
      { status: 400 }
    )
  }

  try {
    const { data: existing } = await client
      .from('users')
      .select('is_active')
      .eq('id', userId)
      .single()

    const { data, error } = await client
      .from('users')
      .update({ is_active: isActive })
      .eq('id', userId)
      .select('id, is_active')
      .single()

    if (error) {
      console.error('Error updating user status:', error)
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    const { error: auditError } = await client
      .from('audit_logs')
      .insert([
        {
          action: isActive ? 'user_activated' : 'user_deactivated',
          actor_id: session.userId,
          target_user_id: userId,
          details: {
            is_active: {
              from: existing?.is_active ?? !isActive,
              to: isActive,
            },
          },
        },
      ])

    if (auditError) {
      console.error('Error logging audit entry:', auditError)
    }

    return NextResponse.json({
      success: true,
      user: data,
    })
  } catch (e) {
    console.error('Unexpected error updating user status:', e)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

