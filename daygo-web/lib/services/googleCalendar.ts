import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import type { GoogleCalendarToken } from '../types/database'

// Use service role for server-side operations to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
]

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
}

export const googleCalendarService = {
  // Generate OAuth URL for user to authorize
  getAuthUrl(userId: string): string {
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: userId,
    })
  },

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string
    refresh_token: string
    expiry_date: number
  }> {
    const { tokens } = await oauth2Client.getToken(code)
    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      expiry_date: tokens.expiry_date!,
    }
  },

  // Save tokens to database
  async saveTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
    expiryDate: number
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('google_calendar_tokens')
      .upsert({
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: new Date(expiryDate).toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (error) throw error
  },

  // Get user's tokens from database
  async getTokens(userId: string): Promise<GoogleCalendarToken | null> {
    const { data, error } = await supabaseAdmin
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as GoogleCalendarToken | null
  },

  // Check if user has connected Google Calendar
  async isConnected(userId: string): Promise<boolean> {
    const tokens = await this.getTokens(userId)
    return tokens !== null
  },

  // Delete user's Google Calendar connection
  async disconnect(userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('google_calendar_tokens')
      .delete()
      .eq('user_id', userId)

    if (error) throw error
  },

  // Refresh access token if expired
  async refreshAccessToken(userId: string): Promise<string> {
    const tokens = await this.getTokens(userId)
    if (!tokens) throw new Error('No Google Calendar tokens found')

    const tokenExpiry = new Date(tokens.token_expiry)
    const now = new Date()

    // If token is still valid, return it
    if (tokenExpiry > now) {
      return tokens.access_token
    }

    // Refresh the token
    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token,
    })

    try {
      const { credentials } = await oauth2Client.refreshAccessToken()

      // Save new tokens
      await this.saveTokens(
        userId,
        credentials.access_token!,
        tokens.refresh_token,
        credentials.expiry_date!
      )

      return credentials.access_token!
    } catch (err: unknown) {
      // invalid_grant means the refresh token is revoked/expired
      // Clean up the stale token so the user can re-connect
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('invalid_grant')) {
        await this.disconnect(userId)
        throw new Error('GOOGLE_REAUTH_REQUIRED')
      }
      throw err
    }
  },

  // Get authenticated calendar client
  async getCalendarClient(userId: string) {
    const accessToken = await this.refreshAccessToken(userId)
    oauth2Client.setCredentials({ access_token: accessToken })
    return google.calendar({ version: 'v3', auth: oauth2Client })
  },

  // Read events from all calendars for a specific date
  async getEvents(userId: string, date: string, timeZone: string = 'America/Toronto'): Promise<GoogleCalendarEvent[]> {
    const calendar = await this.getCalendarClient(userId)

    // Google Calendar API handles timezone conversion for us
    const timeMin = `${date}T00:00:00`
    const timeMax = `${date}T23:59:59`

    // Get all calendars
    const calendarList = await calendar.calendarList.list()
    const calendars = calendarList.data.items || []

    // Fetch events from all calendars in parallel
    const allEvents = await Promise.all(
      calendars.map(async (cal) => {
        try {
          const response = await calendar.events.list({
            calendarId: cal.id!,
            timeMin,
            timeMax,
            timeZone,
            singleEvents: true,
            orderBy: 'startTime',
          })
          return (response.data.items || []) as GoogleCalendarEvent[]
        } catch {
          // Skip calendars that fail (e.g., no read access)
          return [] as GoogleCalendarEvent[]
        }
      })
    )

    return allEvents.flat()
  },

  // Create event in Google Calendar
  async createEvent(
    userId: string,
    title: string,
    date: string,
    startTime: string,
    endTime: string,
    description?: string
  ): Promise<GoogleCalendarEvent> {
    const calendar = await this.getCalendarClient(userId)
    const tokens = await this.getTokens(userId)
    const calendarId = tokens?.calendar_id || 'primary'

    const startDateTime = `${date}T${startTime}`
    const endDateTime = `${date}T${endTime}`

    const response = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: title,
        description,
        start: {
          dateTime: startDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    })

    return response.data as GoogleCalendarEvent
  },

  // List all calendars for user
  async listCalendars(userId: string): Promise<Array<{ id: string; summary: string; primary?: boolean }>> {
    const calendar = await this.getCalendarClient(userId)
    const response = await calendar.calendarList.list()
    return (response.data.items || []).map(cal => ({
      id: cal.id!,
      summary: cal.summary || cal.id!,
      primary: cal.primary || false,
    }))
  },

  // Set active calendar for a user
  async setActiveCalendar(userId: string, calendarId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('google_calendar_tokens')
      .update({ calendar_id: calendarId, updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    if (error) throw error
  },

  // Delete event from Google Calendar
  async deleteEvent(userId: string, googleEventId: string): Promise<void> {
    const calendar = await this.getCalendarClient(userId)
    const tokens = await this.getTokens(userId)
    const calendarId = tokens?.calendar_id || 'primary'

    await calendar.events.delete({
      calendarId,
      eventId: googleEventId,
    })
  },
}
