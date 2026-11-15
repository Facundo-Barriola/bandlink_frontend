'use client'

/**
 * Página de retorno de MercadoPago (back_urls del backend):
 *   /bookings/:bookingId/payment/success | pending | failure
 * El estado real lo define el webhook, así que consultamos el backend
 * hasta que la reserva quede confirmada (o se agote el tiempo de espera).
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, XCircle, Loader2, FileDown, CreditCard } from 'lucide-react'
import { AppNavbar } from '@/components/AppNavbar'
import { bookingsApi } from '@/lib/api/bookings'
import { paymentsApi, startCheckout } from '@/lib/api/payments'
import { apiErrorMessage, formatBookingDate, formatBookingRange, formatMoney } from '@/lib/booking-format'

const POLL_MS = 3000
const MAX_POLL_MS = 10 * 60 * 1000 // el usuario puede estar pagando en la otra pestaña

export default function PaymentResultPage() {
  const { bookingId, result } = useParams<{ bookingId: string; result: string }>()
  const router = useRouter()
    const [error, setError] = useState<string | null>(null)
  const timedOutRef = useRef(false)

  const { data: booking } = useQuery({
    queryKey: ['bookings', bookingId],
    queryFn: () => bookingsApi.getById(bookingId),
  })

  const { data: payment, isLoading } = useQuery({
    queryKey: ['bookings', 'payment', bookingId],
    queryFn: () => paymentsApi.getStatus(bookingId),
    refetchInterval: (q) => {
      const d = q.state.data
      const settled = d?.booking_status === 'confirmed' || ['rejected', 'cancelled'].includes(d?.payment_status ?? '')
      return settled || timedOutRef.current ? false : POLL_MS
    },
  })

  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => { timedOutRef.current = true; setTimedOut(true) }, MAX_POLL_MS)
    return () => clearTimeout(t)
  }, [])

  const retry = useMutation({
    mutationFn: () => startCheckout(bookingId),
    onSuccess: (waitingPath) => { if (waitingPath && result !== 'pending') router.push(waitingPath) },
    onError: (e) => setError(apiErrorMessage(e, 'No se pudo reintentar el pago.')),
  })

  const receipt = useMutation({
    mutationFn: () => paymentsApi.downloadReceipt(bookingId),
    onError: (e) => setError(apiErrorMessage(e)),
  })

  const confirmed = payment?.booking_status === 'confirmed'
  const failed = !confirmed && (result === 'failure' || ['rejected', 'cancelled'].includes(payment?.payment_status ?? ''))
  const waiting = !confirmed && !failed

  const view = isLoading
    ? { icon: <Loader2 size={48} className="animate-spin text-[#65558F]" />, title: 'Verificando el pago…', text: '' }
    : confirmed
      ? { icon: <CheckCircle2 size={48} className="text-green-500" />, title: '¡Pago aprobado!', text: 'Tu reserva quedó confirmada. Te enviamos la confirmación por notificación.' }
      : failed
        ? { icon: <XCircle size={48} className="text-red-500" />, title: 'El pago no se pudo completar', text: 'No se realizó ningún cobro. Podés intentar nuevamente mientras el horario siga disponible.' }
        : result === 'pending' && !payment?.payment_status
          ? { icon: <Clock size={48} className="text-[#65558F]" />, title: 'Esperando tu pago', text: 'Completá el pago en la pestaña de MercadoPago. Esta página se actualiza sola cuando se acredite.' }
          : { icon: <Clock size={48} className="text-orange-500" />, title: 'Pago en proceso', text: 'MercadoPago todavía está procesando el pago. Te avisaremos cuando se acredite.' }

  return (
    <div className="min-h-screen bg-gray-100">
      <AppNavbar />
      <main className="max-w-5xl mx-auto px-4 py-12 flex justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-md flex flex-col items-center text-center gap-3">
          {view.icon}
          <h1 className="text-lg font-bold text-gray-900">{view.title}</h1>
          {view.text && <p className="text-sm text-gray-500">{view.text}</p>}

          {booking && (
            <div className="w-full rounded-xl bg-[#65558F1A] px-4 py-3 text-sm text-[#65558F] flex flex-col gap-0.5 mt-2">
              <span className="font-semibold">{booking.rehearsal_rooms.name}{booking.rehearsal_rooms.studios?.name ? ` · ${booking.rehearsal_rooms.studios.name}` : ''}</span>
              <span className="capitalize">{formatBookingDate(booking.starts_at)} · {formatBookingRange(booking.starts_at, booking.ends_at)}</span>
              <span className="font-semibold">{formatMoney(payment?.amount ?? booking.total_amount)}</span>
            </div>
          )}

          {waiting && !isLoading && (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              {timedOut
                ? 'Podés revisar el estado más tarde desde Mis reservas.'
                : <><Loader2 size={12} className="animate-spin" /> Actualizando estado…</>}
            </p>
          )}

          {error && <p className="w-full text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {confirmed && payment?.can_download_receipt && (
              <button
                onClick={() => receipt.mutate()}
                disabled={receipt.isPending}
                className="rounded-full px-5 py-2.5 text-sm font-semibold border border-[#65558F] text-[#65558F] flex items-center gap-2 disabled:opacity-60"
              >
                <FileDown size={15} /> Comprobante
              </button>
            )}
            {waiting && !isLoading && (
              <button
                onClick={() => retry.mutate()}
                disabled={retry.isPending}
                className="rounded-full px-5 py-2.5 text-sm font-semibold border border-[#009EE3] text-[#009EE3] flex items-center gap-2 disabled:opacity-60"
              >
                <CreditCard size={15} /> Abrir MercadoPago de nuevo
              </button>
            )}
            {failed && payment?.can_retry !== false && (
              <button
                onClick={() => retry.mutate()}
                disabled={retry.isPending}
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: '#009EE3' }}
              >
                <CreditCard size={15} /> Reintentar pago
              </button>
            )}
            <Link
              href="/reservas"
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: '#65558F' }}
            >
              Ir a mis reservas
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
