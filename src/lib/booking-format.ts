/**
 * Helpers de formato para reservas.
 *
 * IMPORTANTE: el backend guarda los horarios de las reglas de disponibilidad
 * como "hora de pared" combinada en UTC (ej. regla 18:00 → slot 18:00Z).
 * Por eso todas las fechas de reservas se muestran con timeZone 'UTC',
 * así lo que ve el usuario coincide con los horarios cargados por la sala.
 */

const TZ = 'UTC'

export function formatBookingDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    timeZone: TZ,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatBookingTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatBookingRange(startIso: string, endIso: string) {
  return `${formatBookingTime(startIso)} – ${formatBookingTime(endIso)}`
}

export function formatMoney(value: number | string | null | undefined) {
  if (value == null) return '—'
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(n)) return '—'
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })
}

/**
 * <input type="datetime-local"> → ISO en la convención "hora de pared en UTC"
 * que usan reservas y bloqueos (ej. "2026-11-20T18:00" → "2026-11-20T18:00:00.000Z").
 */
export function wallClockInputToIso(value: string) {
  return `${value}:00.000Z`
}

/** YYYY-MM-DD de "hoy" según el reloj local del usuario. */
export function todayYmd() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** "Ahora" expresado en la misma convención de hora de pared que los slots. */
export function nowAsWallClockUtc() {
  const d = new Date()
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes())
}

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  hold: 'Reservada (sin confirmar)',
  pending: 'Pendiente',
  pending_payment: 'Pago pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled_by_user: 'Cancelada por el músico',
  cancelled_by_studio: 'Cancelada por la sala',
  cancelled: 'Cancelada',
  expired: 'Expirada',
}

export const BOOKING_STATUS_COLOR: Record<string, string> = {
  hold: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  pending_payment: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
  cancelled_by_user: 'bg-red-100 text-red-700',
  cancelled_by_studio: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
}

/** friendly_status que devuelve GET /payments/bookings/:id/status */
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paid: 'Pagado',
  processing: 'Pago en proceso',
  unpaid: 'Sin pagar',
  retry_available: 'Pago rechazado (podés reintentar)',
  refunded: 'Reembolsado',
  partially_refunded: 'Reembolsado parcialmente',
  expired: 'Expirado',
  not_required: 'Sin pago online',
  cancelled: 'Cancelado',
}

export function paymentStatusLabel(status: string | null | undefined) {
  if (!status) return 'Sin pagos online'
  return PAYMENT_STATUS_LABEL[status] ?? status
}

export const ACTIVE_BOOKING_STATUSES = ['hold', 'pending', 'pending_payment', 'confirmed']

export function apiErrorMessage(err: unknown, fallback = 'Ocurrió un error. Intentá de nuevo.') {
  const e = err as { response?: { data?: { message?: string | string[] } }; message?: string }
  const msg = e?.response?.data?.message
  if (Array.isArray(msg)) return msg.join('. ')
  return msg ?? e?.message ?? fallback
}
