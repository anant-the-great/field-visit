import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabase, supabaseAdmin } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (session.role !== 'field_agent') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()

  const loanId = formData.get('loanId') as string | null
  const latitude = formData.get('latitude') as string | null
  const longitude = formData.get('longitude') as string | null
  const locationAddress = formData.get('locationAddress') as string | null
  const customerName = formData.get('customerName') as string | null
  const visitStatus = formData.get('visitStatus') as string | null
  const comments = formData.get('comments') as string | null
  const photos = formData.getAll('photos') as File[]

  if (!loanId || !/^\d{21}$/.test(loanId)) {
    return NextResponse.json(
      { error: 'Loan ID must be exactly 21 digits' },
      { status: 400 }
    )
  }

  if (!latitude || !longitude) {
    return NextResponse.json(
      { error: 'Latitude and longitude are required' },
      { status: 400 }
    )
  }

  if (!photos.length) {
    return NextResponse.json(
      { error: 'At least one photo is required' },
      { status: 400 }
    )
  }

  if (photos.length > 3) {
    return NextResponse.json(
      { error: 'Maximum 3 photos allowed' },
      { status: 400 }
    )
  }

  const totalSize = photos.reduce((sum, f) => sum + f.size, 0)
  if (totalSize > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Total photo size must not exceed 10MB' },
      { status: 400 }
    )
  }

  const invalidTypes = photos.filter(
    (f) => f.type !== 'image/jpeg' && f.type !== 'image/png'
  )
  if (invalidTypes.length > 0) {
    return NextResponse.json(
      { error: 'Only JPEG and PNG photos are allowed' },
      { status: 400 }
    )
  }

  if (!customerName || !customerName.trim()) {
    return NextResponse.json(
      { error: 'Customer name is required' },
      { status: 400 }
    )
  }

  if (
    !visitStatus ||
    !['PTP', 'Not Found', 'Partial Recieved', 'Recieved', 'Others'].includes(
      visitStatus
    )
  ) {
    return NextResponse.json(
      { error: 'Visit status is required' },
      { status: 400 }
    )
  }

  const lat = Number(latitude)
  const lon = Number(longitude)

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json(
      { error: 'Invalid coordinates' },
      { status: 400 }
    )
  }

  const client = supabaseAdmin ?? supabase

  try {
    // Create visit record
    const { data: visit, error: visitError } = await client
      .from('visits')
      .insert([
        {
          agent_id: session.userId,
          loan_id: loanId,
          visit_date: new Date().toISOString(),
          latitude: lat,
          longitude: lon,
          location_address: locationAddress,
          status: 'completed',
          customer_name: customerName.trim(),
          visit_status: visitStatus,
          comments: comments ?? null,
        },
      ])
      .select()
      .single()

    if (visitError || !visit) {
      console.error('Error creating visit:', visitError)
      return NextResponse.json(
        { error: 'Failed to create visit' },
        { status: 500 }
      )
    }

    // Upload photos and create visit_photos records
    for (let i = 0; i < photos.length; i++) {
      const file = photos[i]
      const filename = `${visit.id}/${i}-${Date.now()}.jpg`

      const { error: uploadError } = await client.storage
        .from('visit-photos')
        .upload(filename, file)

      if (uploadError) {
        console.error('Error uploading photo:', uploadError)
        return NextResponse.json(
          { error: 'Failed to upload photo' },
          { status: 500 }
        )
      }

      const { data: urlData } = client.storage
        .from('visit-photos')
        .getPublicUrl(filename)

      const { error: photoError } = await client.from('visit_photos').insert([
        {
          visit_id: visit.id,
          photo_url: urlData.publicUrl,
          photo_size_bytes: file.size,
        },
      ])

      if (photoError) {
        console.error('Error saving photo record:', photoError)
        return NextResponse.json(
          { error: 'Failed to save photo record' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      visitId: visit.id,
    })
  } catch (e) {
    console.error('Unexpected error submitting visit:', e)
    return NextResponse.json(
      { error: 'Failed to submit visit' },
      { status: 500 }
    )
  }
}

