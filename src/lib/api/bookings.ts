import { client } from './client'

export interface Booking {
  booking_id: string
  room_id: string
  user_id: string
  starts_at: string
  ends_at: string
  status: string
  total_amount: number | null
  notes: string | null
  cancelled_at: string | null
  cancellation_reasons: string | null
  created_at: string
  updated_at: string
  rehearsal_rooms: {
    room_id: string
    name: string
    studio_id: string
  }
  users: {
    user_id: string
    username: string
    display_name: string
    email: string
  }
}

export interface ActiveBookingsResponse {
  studio_id: string
  total: number
  items: Booking[]
}

export interface HistoryBookingsResponse {
  studio_id: string
  filters: { room_id: string | null; date: string | null }
  total: number
  items: Booking[]
}

export const bookingsApi = {
  /** Próximas reservas de un estudio (solo owner). */
  getStudioActiveBookings: (studioId: string) =>
    client
      .get<ActiveBookingsResponse>(`/bookings/studios/${studioId}/active`)
      .then((r) => r.data),

  /** Historial de reservas de un estudio (solo owner). */
  getStudioBookingHistory: (studioId: string, params?: { roomId?: string; date?: string }) =>
    client
      .get<HistoryBookingsResponse>(`/bookings/studios/${studioId}/history`, {
        params: {
          ...(params?.roomId && { roomId: params.roomId }),
          ...(params?.date && { date: params.date }),
        },
      })
      .then((r) => r.data),
}
