import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase, supabaseAdmin } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (session.role !== 'collection_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const visitId = request.nextUrl.searchParams.get('visitId')

  if (!visitId) {
    return NextResponse.json(
      { error: 'visitId is required' },
      { status: 400 }
    )
  }

  const client = supabaseAdmin ?? supabase

  try {
    const { data, error } = await client
      .from('visit_photos')
      .select('*')
      .eq('visit_id', visitId)

    if (error) {
      console.error('Error fetching visit photos:', error)
      return NextResponse.json(
        { error: 'Failed to load photos' },
        { status: 500 }
      )
    }

    return NextResponse.json({ photos: data ?? [] })
  } catch (e) {
    console.error('Unexpected error fetching visit photos:', e)
    return NextResponse.json(
      { error: 'Failed to load photos' },
      { status: 500 }
    )
  }
}

