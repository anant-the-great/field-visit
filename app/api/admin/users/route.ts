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
      fullName: string
      phoneNumber: string
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const session = getSessionData(request)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'collection_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const client = supabaseAdmin ?? supabase

  const { data, error } = await client
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to load users' },
      { status: 500 }
    )
  }

  return NextResponse.json({ users: data ?? [] })
}

export async function POST(request: NextRequest) {
  const session = getSessionData(request)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'collection_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server not configured for admin operations' },
      { status: 500 }
    )
  }

  const { fullName, phoneNumber, password, role } = await request.json()

  if (
    !fullName ||
    !phoneNumber ||
    !password ||
    (role !== 'field_agent' && role !== 'collection_manager')
  ) {
    return NextResponse.json(
      { error: 'Invalid request payload' },
      { status: 400 }
    )
  }

  try {
    const phoneForAuth = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+91${phoneNumber}`

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      phone: phoneForAuth,
      password,
      phone_confirm: true,
      user_metadata: {
        role,
        phone_number: phoneNumber,
        full_name: fullName,
      },
    })

    if (error || !data?.user) {
      console.error('Error creating user:', error)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Log audit entry
    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert([
        {
          action: 'user_created',
          actor_id: session.userId,
          target_user_id: data.user.id,
          details: {
            full_name: fullName,
            phone_number: phoneNumber,
            role,
          },
        },
      ])

    if (auditError) {
      console.error('Error logging audit entry:', auditError)
    }

    return NextResponse.json({
      success: true,
      userId: data.user.id,
    })
  } catch (e) {
    console.error('Unexpected error creating user:', e)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const session = getSessionData(request)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'collection_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server not configured for admin operations' },
      { status: 500 }
    )
  }

  const { userId, fullName, phoneNumber, role, isActive } = await request.json()

  if (
    !userId ||
    !fullName ||
    !phoneNumber ||
    (role !== 'field_agent' && role !== 'collection_manager')
  ) {
    return NextResponse.json(
      { error: 'Invalid request payload' },
      { status: 400 }
    )
  }

  try {
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('full_name, phone_number, role, is_active')
      .eq('id', userId)
      .single()

    const phoneForAuth = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+91${phoneNumber}`

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        phone: phoneForAuth,
        user_metadata: {
          role,
          phone_number: phoneNumber,
          full_name: fullName,
        },
      }
    )

    if (authError) {
      console.error('Error updating auth user:', authError)
      return NextResponse.json(
        { error: 'Failed to update user auth record' },
        { status: 500 }
      )
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        full_name: fullName,
        phone_number: phoneNumber,
        role,
        is_active: typeof isActive === 'boolean' ? isActive : undefined,
      })
      .eq('id', userId)
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating user profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    const details: Record<string, { from: unknown; to: unknown }> = {}
    if (existingUser) {
      if (existingUser.full_name !== fullName) {
        details.full_name = { from: existingUser.full_name, to: fullName }
      }
      if (existingUser.phone_number !== phoneNumber) {
        details.phone_number = { from: existingUser.phone_number, to: phoneNumber }
      }
      if (existingUser.role !== role) {
        details.role = { from: existingUser.role, to: role }
      }
      if (existingUser.is_active !== updatedUser.is_active) {
        details.is_active = { from: existingUser.is_active, to: updatedUser.is_active }
      }
    }
    if (Object.keys(details).length === 0) {
      details._note = { from: 'no changes', to: 'no changes' }
    }

    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert([
        {
          action: 'user_updated',
          actor_id: session.userId,
          target_user_id: userId,
          details,
        },
      ])

    if (auditError) {
      console.error('Error logging audit entry:', auditError)
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (e) {
    console.error('Unexpected error updating user:', e)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const session = getSessionData(request)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.role !== 'collection_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Server not configured for admin operations' },
      { status: 500 }
    )
  }

  const { userId } = await request.json()

  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    )
  }

  try {
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('full_name, phone_number, role')
      .eq('id', userId)
      .single()

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      userId
    )

    if (deleteError && (deleteError as any).code !== 'user_not_found') {
      console.error('Error deleting auth user:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    const { error: deleteProfileError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteProfileError) {
      console.error('Error deleting user profile:', deleteProfileError)
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert([
        {
          action: 'user_deleted',
          actor_id: session.userId,
          target_user_id: userId,
          details: {
            removed_user_name: existingUser?.full_name ?? 'Unknown',
            full_name: existingUser?.full_name,
            phone_number: existingUser?.phone_number,
            role: existingUser?.role,
          },
        },
      ])

    if (auditError) {
      console.error('Error logging audit entry:', auditError)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Unexpected error deleting user:', e)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}


