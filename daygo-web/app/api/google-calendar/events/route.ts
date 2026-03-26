import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { googleCalendarService } from '@/lib/services/googleCalendar'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const tz = searchParams.get('tz') || 'America/Toronto'
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    const isConnected = await googleCalendarService.isConnected(user.id)
    if (!isConnected) {
      return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 })
    }

    const events = await googleCalendarService.getEvents(user.id, date, tz)

    // Transform Google Calendar events to a simpler format
    const transformedEvents = events.map(event => ({
      id: event.id,
      title: event.summary || 'Untitled',
      description: event.description || null,
      start_time: event.start?.dateTime
        ? new Date(event.start.dateTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: tz })
        : '00:00:00',
      end_time: event.end?.dateTime
        ? new Date(event.end.dateTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: tz })
        : '23:59:59',
      is_all_day: !event.start?.dateTime,
    }))

    return NextResponse.json({ events: transformedEvents })
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error)
    const message = error instanceof Error ? error.message : ''
    if (message === 'GOOGLE_REAUTH_REQUIRED') {
      return NextResponse.json({ error: 'reauth_required' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}
