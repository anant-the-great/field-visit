import { cookies } from 'next/headers'

export interface SessionData {
  userId: string
  phoneNumber: string
  role: 'collection_manager' | 'field_agent'
  fullName: string
  timestamp: number
}

// Get session from cookies (server-side)
export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie?.value) {
      return null
    }

    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    )

    return sessionData as SessionData
  } catch (error) {
    return null
  }
}

// Clear session (client-side logout)
export async function logout() {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    })

    if (response.ok) {
      // Redirect to login
      window.location.href = '/login'
    }
  } catch (error) {
    console.error('Logout error:', error)
  }
}
