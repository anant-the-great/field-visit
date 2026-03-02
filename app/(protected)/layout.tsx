import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LeftNavBar } from '@/components/LeftNavBar'
import { supabase, supabaseAdmin } from '@/lib/db'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get session from cookies
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    redirect('/login')
  }

  let sessionData
  try {
    sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    )
  } catch {
    redirect('/login')
  }

  // Verify user is still active (bypass RLS using service role when available)
  const client = supabaseAdmin ?? supabase

  const { data: userData } = await client
    .from('users')
    .select('full_name, role, is_active')
    .eq('id', sessionData.userId)
    .single()

  if (!userData?.is_active) {
    redirect('/error?error=account_disabled')
  }

  const userRole = userData?.role as 'collection_manager' | 'field_agent'
  const userName = userData?.full_name

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Left Sidebar */}
      <LeftNavBar userRole={userRole} userName={userName} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden md:ml-0 pt-16 md:pt-0">
        <div className="flex-1 overflow-y-auto">
          <div className="h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
