import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase, supabaseAdmin } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (session.role !== 'collection_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { type, query } = await request.json()

  if (!query || typeof query !== 'string' || !query.trim()) {
    return NextResponse.json(
      { error: 'Search query is required' },
      { status: 400 }
    )
  }

  if (type !== 'loan_id' && type !== 'agent') {
    return NextResponse.json(
      { error: 'Invalid search type' },
      { status: 400 }
    )
  }

  const client = supabaseAdmin ?? supabase
  const searchQuery = query.trim()

  try {
    if (type === 'loan_id') {
      const { data, error } = await client
        .from('visits')
        .select(
          `
          *,
          agent:agent_id (
            full_name,
            phone_number
          )
        `
        )
        .eq('loan_id', searchQuery)
        .order('visit_date', { ascending: false })

      if (error) {
        console.error('Error searching visits by loan_id:', error)
        return NextResponse.json(
          { error: 'Failed to search visits' },
          { status: 500 }
        )
      }

      return NextResponse.json({ visits: data ?? [] })
    }

    // type === 'agent' (search by agent name or phone)
    const { data: agents, error: agentsError } = await client
      .from('users')
      .select('id')
      .or(
        `full_name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`
      )

    if (agentsError) {
      console.error('Error searching agents:', agentsError)
      return NextResponse.json(
        { error: 'Failed to search agents' },
        { status: 500 }
      )
    }

    if (!agents || agents.length === 0) {
      return NextResponse.json({ visits: [] })
    }

    const agentIds = agents.map((a) => a.id)

    const { data, error } = await client
      .from('visits')
      .select(
        `
        *,
        agent:agent_id (
          full_name,
          phone_number
        )
      `
      )
      .in('agent_id', agentIds)
      .order('visit_date', { ascending: false })

    if (error) {
      console.error('Error searching visits by agent:', error)
      return NextResponse.json(
        { error: 'Failed to search visits' },
        { status: 500 }
      )
    }

    return NextResponse.json({ visits: data ?? [] })
  } catch (e) {
    console.error('Unexpected error searching visits:', e)
    return NextResponse.json(
      { error: 'Failed to search visits' },
      { status: 500 }
    )
  }
}

