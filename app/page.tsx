import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  // No app session → go to login
  if (!sessionCookie) {
    redirect('/login')
  }

  let sessionData: any
  try {
    sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    )
  } catch {
    redirect('/login')
  }

  // Redirect based on role stored in our session cookie
  if (sessionData.role === 'collection_manager') {
    redirect('/collection-manager/all-visits')
  }

  if (sessionData.role === 'field_agent') {
    redirect('/field-agent/new-visit')
  }

  // Fallback
  redirect('/protected')
}
