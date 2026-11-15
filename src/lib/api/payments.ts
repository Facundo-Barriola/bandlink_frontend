import { client } from './client'

export interface CheckoutProResponse {
  payment_id?: string
  preference_id?: string
  init_point: string | null
  sandbox_init_point: string | null
}

export interface BookingPaymentStatus {
  booking_id: string
  booking_status: string
  payment_status: string | null
  payment_status_detail: string | null
  friendly_status: string
  amount: number
  currency: string
  refunded_amount: number
  refund_count: number
  approved_at: string | null
  can_retry: boolean
  can_refund: boolean
  can_download_receipt: boolean
}

export interface MpConnectionStatus {
  connected: boolean
  mp_user_id: string | null
  connected_at: string | null
  token_expires_at: string | null
  fee_percent: number
}

export interface StudioOnlinePayments {
  enabled: boolean
  seller_connected?: boolean
  fee_percent: number
}

export const paymentsApi = {
  // ── Marketplace: cuenta de Mercado Pago de la sala ──
  getMpStatus: () => client.get<MpConnectionStatus>('/payments/mp/status').then((r) => r.data),

  getMpConnectUrl: () => client.get<{ url: string }>('/payments/mp/connect-url').then((r) => r.data.url),

  disconnectMp: () => client.delete('/payments/mp/connection').then((r) => r.data),

  /** Si la sala acepta pago online (conectó su cuenta de Mercado Pago). */
  getStudioOnlinePayments: (studioId: string) =>
    client.get<StudioOnlinePayments>(`/payments/studios/${studioId}/online-payments`).then((r) => r.data),

  /** Crea (o reutiliza) la preferencia de MercadoPago y devuelve el link de pago. */
  createCheckout: (bookingId: string) =>
    client
      .post<CheckoutProResponse>(`/payments/bookings/${bookingId}/checkout-pro`)
      .then((r) => r.data),

  getStatus: (bookingId: string) =>
    client
      .get<BookingPaymentStatus>(`/payments/bookings/${bookingId}/status`)
      .then((r) => r.data),

  /** Reembolso (solo la sala). Sin amount = reembolso total. */
  refund: (bookingId: string, data?: { amount?: number; reason?: string }) =>
    client.post(`/payments/bookings/${bookingId}/refund`, data ?? {}).then((r) => r.data),

  /** Descarga el comprobante PDF y lo abre como archivo. */
  downloadReceipt: async (bookingId: string) => {
    const res = await client.get<Blob>(`/payments/bookings/${bookingId}/receipt`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `comprobante-reserva-${bookingId.slice(0, 8)}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}

/**
 * Con las credenciales de prueba actuales (APP_USR-) MercadoPago usa init_point
 * + cuentas de prueba. sandbox_init_point solo para integraciones viejas (TEST-).
 * Se puede forzar con NEXT_PUBLIC_MP_USE_SANDBOX=true.
 */
const USE_SANDBOX = process.env.NEXT_PUBLIC_MP_USE_SANDBOX === 'true'

function checkoutUrl(data: CheckoutProResponse) {
  const url = USE_SANDBOX
    ? (data.sandbox_init_point ?? data.init_point)
    : (data.init_point ?? data.sandbox_init_point)
  if (!url) throw new Error('No se pudo obtener el link de pago')
  return url
}

/** Redirige al checkout de MercadoPago en la pestaña actual. */
export function goToCheckout(data: CheckoutProResponse) {
  window.location.href = checkoutUrl(data)
}

/**
 * Abre el checkout de MercadoPago en una pestaña nueva y devuelve la ruta de
 * espera para la pestaña actual, que consulta el estado hasta que se acredite.
 * Así el usuario "vuelve" solo a BandLink aunque MP no pueda redirigir
 * (MP solo hace auto_return a URLs https, no a localhost).
 * La pestaña se abre antes de esperar la API para que no la bloquee el navegador.
 */
export async function startCheckout(bookingId: string): Promise<string | null> {
  const win = window.open('', '_blank')
  try {
    const data = await paymentsApi.createCheckout(bookingId)
    const url = checkoutUrl(data)
    if (!win) {
      // Bloqueador de popups: seguimos en la misma pestaña
      window.location.href = url
      return null
    }
    win.location.href = url
    return `/bookings/${bookingId}/payment/pending`
  } catch (e) {
    win?.close()
    throw e
  }
}
