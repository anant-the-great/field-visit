import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Server-side admin client (bypasses RLS). Only available when SUPABASE_SERVICE_ROLE_KEY is set.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin =
  serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null

// Get user by phone number
export async function getUserByPhone(phoneNumber: string) {
  // Login happens before there is an authenticated user, so RLS-protected tables
  // must be queried using a server-side service role client.
  const client = supabaseAdmin ?? supabase

  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single()

  if (error) return null
  return data
}

// Get user by ID
export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

// Get all visits for a user (with pagination)
export async function getUserVisits(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('visits')
    .select('*, visit_photos(*)')
    .eq('agent_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data
}

// Get all visits (for collection managers)
export async function getAllVisits(limit = 100) {
  const { data, error } = await supabase
    .from('visits')
    .select('*, agent:users(id, full_name, phone_number), visit_photos(*)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data
}

// Search visits by loan ID or agent name
export async function searchVisits(query: string) {
  const { data, error } = await supabase
    .from('visits')
    .select('*, agent:users(id, full_name, phone_number), visit_photos(*)')
    .or(`loan_id.ilike.%${query}%,agent.full_name.ilike.%${query}%`)
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

// Get all users (for collection managers)
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return []
  return data
}

// Get audit logs (for collection managers)
export async function getAuditLogs(limit = 100) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, actor:actor_id(full_name), target_user:target_user_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data
}

// Insert a new visit
export async function createVisit(visitData: any) {
  const { data, error } = await supabase
    .from('visits')
    .insert([visitData])
    .select()
    .single()

  if (error) throw error
  return data
}

// Insert visit photos
export async function addVisitPhoto(photoData: any) {
  const { data, error } = await supabase
    .from('visit_photos')
    .insert([photoData])
    .select()
    .single()

  if (error) throw error
  return data
}

// Update user (for collection managers)
export async function updateUser(userId: string, updates: any) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Log audit action
export async function logAuditAction(action: string, actorId: string, targetUserId?: string, details?: any) {
  const { data, error } = await supabase
    .from('audit_logs')
    .insert([
      {
        action,
        actor_id: actorId,
        target_user_id: targetUserId,
        details,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}
