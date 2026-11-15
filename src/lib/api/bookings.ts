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
    studios?: { studio_id: string; name: string; owner_user_id?: string }
  }
  users?: {
    user_id: string
    username: string
    display_name: string
    email: string
  }
}

export interface MyBookingsResponse {
  user_id: string
  total: number
  items: Booking[]
}

export interface AvailabilitySlot {
  starts_at: string
  ends_at: string
}

export interface RoomAvailabilityResponse {
  room_id: string
  date: string
  slots: AvailabilitySlot[]
}

export interface BookingWindowInput {
  starts_at: string
  ends_at: string
  notes?: string
}

export interface BookingStatusHistoryItem {
  status: string
  changed_at: string
  note: string | null
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

  /** Horarios libres de una sala para una fecha (YYYY-MM-DD). */
  getRoomAvailability: (
    studioId: string,
    roomId: string,
    date: string,
    durationMinutes = 60,
    slotStepMinutes = 30,
  ) =>
    client
      .get<RoomAvailabilityResponse>(`/studios/${studioId}/rooms/${roomId}/availability`, {
        params: { date, durationMinutes, slotStepMinutes },
      })
      .then((r) => r.data),

  /** Bloquea el horario por 10 minutos (estado hold). */
  createHold: (roomId: string, data: BookingWindowInput) =>
    client.post<Booking>('/bookings/hold', { room_id: roomId, ...data }).then((r) => r.data),

  /** Confirma una reserva en hold sin pago online (paga en la sala). */
  confirm: (bookingId: string) =>
    client.post<Booking>(`/bookings/${bookingId}/confirm`).then((r) => r.data),

  cancel: (bookingId: string, reason?: string) =>
    client.post<Booking>(`/bookings/${bookingId}/cancel`, { reason }).then((r) => r.data),

  reschedule: (bookingId: string, data: BookingWindowInput & { room_id?: string }) =>
    client.patch<Booking>(`/bookings/${bookingId}/reschedule`, data).then((r) => r.data),

  /** Solo la sala, cuando la reserva confirmada ya terminó. */
  complete: (bookingId: string) =>
    client.post<Booking>(`/bookings/${bookingId}/complete`).then((r) => r.data),

  getById: (bookingId: string) =>
    client.get<Booking>(`/bookings/${bookingId}`).then((r) => r.data),

  getStatusHistory: (bookingId: string) =>
    client.get<BookingStatusHistoryItem[]>(`/bookings/${bookingId}/status-history`).then((r) => r.data),

  /** Próximas reservas del músico logueado. */
  getMyActiveBookings: (limit = 20) =>
    client.get<MyBookingsResponse>('/bookings/me/active', { params: { limit } }).then((r) => r.data),

  /** Historial de reservas del músico logueado. */
  getMyBookingHistory: (params?: { status?: string; dateFrom?: string; dateTo?: string; limit?: number }) =>
    client
      .get<MyBookingsResponse>('/bookings/me/history', {
        params: {
          limit: params?.limit ?? 50,
          ...(params?.status && { status: params.status }),
          ...(params?.dateFrom && { dateFrom: params.dateFrom }),
          ...(params?.dateTo && { dateTo: params.dateTo }),
        },
      })
      .then((r) => r.data),
}
