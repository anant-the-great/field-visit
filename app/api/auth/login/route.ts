import { NextRequest, NextResponse } from 'next/server'
import { getUserByPhone, supabase } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, password } = await request.json()

    if (!phoneNumber || !password) {
      return NextResponse.json(
        { error: 'Phone number and password are required' },
        { status: 400 }
      )
    }

    // Normalize phone for Supabase Auth (expects E.164, e.g. +91xxxxxxxxxx)
    const phoneForAuth = phoneNumber.startsWith('+')
      ? phoneNumber
      : `+91${phoneNumber}`

    // First, verify credentials using Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword(
      {
        phone: phoneForAuth,
        password,
      }
    )

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      )
    }

    // Then load the domain user profile by phone number
    const user = await getUserByPhone(phoneNumber)

    // Check if user is active
    if (user && user.is_active === false) {
      return NextResponse.json(
        { error: 'User account is inactive' },
        { status: 403 }
      )
    }

    // Create session token (JWT-like)
    const sessionData = {
      userId: user?.id ?? authData.user.id,
      phoneNumber: user?.phone_number ?? phoneNumber,
      role: user?.role ?? authData.user.user_metadata?.role ?? 'field_agent',
      fullName: user?.full_name ?? authData.user.user_metadata?.full_name ?? '',
      timestamp: Date.now(),
    }

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64')

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user?.id ?? authData.user.id,
        phoneNumber: user?.phone_number ?? phoneNumber,
        fullName: user?.full_name ?? authData.user.user_metadata?.full_name ?? '',
        role: user?.role ?? authData.user.user_metadata?.role ?? 'field_agent',
      },
    })

    // Set HTTP-only cookie
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    )
  }
}
