import { client } from './client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EventUserRef {
  user_id: string
  username: string
  display_name: string | null
}

export interface EventPlace {
  place_id: string
  name: string | null
  address_line1: string | null
  city: string | null
  region: string | null
  country: string | null
  lat: number | string | null
  lng: number | string | null
}

export interface BandEvent {
  event_id: string
  host_user_id: string
  host_band_id: string | null
  title: string
  description: string | null
  starts_at: string | null
  ends_at: string | null
  timezone: string | null
  capacity: number | null
  visibility: 'public' | 'private' | null
  place_id: string | null
  is_cancelled: boolean | null
  cancel_reason: string | null
  created_at: string
  updated_at: string | null
  users: EventUserRef
  bands: { band_id: string; name: string; description: string | null } | null
  places: EventPlace | null
  event_band_attendance?: { band_id: string; status: string; bands: { band_id: string; name: string } }[]
  _count: { event_attendees: number; event_invites: number; event_media: number }
}

export interface EventDetail extends BandEvent {
  user_state: {
    /** 'attending' | 'saved' | 'declined' | null */
    attendance_status: string | null
    /** 'pending' | 'accepted' | 'rejected' | null */
    invite_status: string | null
    invite_id: string | null
  }
  attending_count: number
  available_capacity: number | null
}

export interface SavedEvent {
  event_attendee_id: string
  status: string
  saved_at: string
  event: BandEvent
}

export interface EventInvite {
  invite_id: string
  event_id: string
  from_user_id: string
  to_user_id: string
  status: string
  created_at: string
  responded_at: string | null
  events: BandEvent
  users_event_invites_from_user_idTousers: EventUserRef
}

export interface EventAttendee {
  event_attendee_id: string
  user_id: string
  status: string
  created_at: string
  users: EventUserRef
}

export interface EventInput {
  title: string
  description?: string
  starts_at?: string
  ends_at?: string
  timezone?: string
  capacity?: number
  visibility?: 'public' | 'private'
  place_id?: string
  host_band_id?: string
}

export interface ListEventsParams {
  search?: string
  from?: string
  to?: string
  visibility?: 'public' | 'private'
  include_cancelled?: 'true' | 'false'
  limit?: number
  offset?: number
}

// ── API ───────────────────────────────────────────────────────────────────────

export const eventsApi = {
  /** Búsqueda por nombre (el backend espera el parámetro `name`). */
  search: (name: string, limit = 6) =>
    client.get<BandEvent[]>('/events/search', { params: { name, limit } }).then((r) => r.data),

  /** Eventos visibles para el usuario (públicos + privados donde participa). */
  getAll: (params?: ListEventsParams) =>
    client.get<BandEvent[]>('/events', { params }).then((r) => r.data),

  getById: (eventId: string) =>
    client.get<EventDetail>(`/events/${eventId}`).then((r) => r.data),

  /** Eventos creados por mí o por mis bandas. */
  getMine: (params?: ListEventsParams) =>
    client.get<BandEvent[]>('/events/mine', { params }).then((r) => r.data),

  getSaved: (params?: ListEventsParams) =>
    client.get<SavedEvent[]>('/events/saved', { params }).then((r) => r.data),

  create: (data: EventInput) => client.post<BandEvent>('/events', data).then((r) => r.data),

  update: (eventId: string, data: Partial<EventInput>) =>
    client.patch<BandEvent>(`/events/${eventId}`, data).then((r) => r.data),

  cancel: (eventId: string, cancel_reason?: string) =>
    client.patch(`/events/${eventId}/cancel`, { cancel_reason }).then((r) => r.data),

  attend: (eventId: string) => client.post(`/events/${eventId}/attend`).then((r) => r.data),

  leave: (eventId: string) => client.delete(`/events/${eventId}/attend`).then((r) => r.data),

  save: (eventId: string) => client.post(`/events/${eventId}/save`).then((r) => r.data),

  unsave: (eventId: string) => client.delete(`/events/${eventId}/save`).then((r) => r.data),

  getAttendees: (eventId: string) =>
    client.get<EventAttendee[]>(`/events/${eventId}/attendees`).then((r) => r.data),

  invite: (eventId: string, toUserIds: string[]) =>
    client.post(`/events/${eventId}/invites`, { to_user_ids: toUserIds }).then((r) => r.data),

  getReceivedInvites: () =>
    client.get<EventInvite[]>('/events/invites/received').then((r) => r.data),

  acceptInvite: (inviteId: string) =>
    client.patch(`/events/invites/${inviteId}/accept`).then((r) => r.data),

  rejectInvite: (inviteId: string) =>
    client.patch(`/events/invites/${inviteId}/reject`).then((r) => r.data),

  /** Una banda (que administro) confirma o declina tocar en el evento. */
  setBandAttendance: (eventId: string, bandId: string, status: 'attending' | 'declined') =>
    client.patch(`/events/${eventId}/bands/${bandId}/attendance`, { status }).then((r) => r.data),
}
