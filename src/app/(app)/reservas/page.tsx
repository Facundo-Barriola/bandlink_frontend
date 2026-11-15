'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays, ChevronDown, ChevronUp, CreditCard, FileDown, Ban, CheckCheck,
  CalendarClock, Undo2, Loader2, Building2, User, Store, Star,
} from 'lucide-react'
import { AppNavbar } from '@/components/AppNavbar'
import { useAuthStore } from '@/store/auth.store'
import { bookingsApi, type Booking } from '@/lib/api/bookings'
import { paymentsApi, startCheckout } from '@/lib/api/payments'
import { studioApi } from '@/lib/api/studio'
import { BookingModal } from '@/components/bookings/BookingModal'
import type { Room } from '@/types/studio'
import {
  ACTIVE_BOOKING_STATUSES,
  BOOKING_STATUS_COLOR,
  BOOKING_STATUS_LABEL,
  apiErrorMessage,
  formatBookingDate,
  formatBookingRange,
  formatMoney,
  nowAsWallClockUtc,
  paymentStatusLabel,
} from '@/lib/booking-format'

type Tab = 'upcoming' | 'history'
type Role = 'musician' | 'studio'

const HISTORY_STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'pending_payment', label: 'Pago pendiente' },
  { value: 'cancelled_by_user', label: 'Canceladas por músico' },
  { value: 'cancelled_by_studio', label: 'Canceladas por sala' },
  { value: 'expired', label: 'Expiradas' },
]

export default function ReservasPage() {
  const user = useAuthStore((s) => s.user)
  const role: Role = user?.role === 'STUDIO_OWNER' ? 'studio' : 'musician'
  const [tab, setTab] = useState<Tab>('upcoming')

  return (
    <div className="min-h-screen bg-gray-100">
      <AppNavbar />
      <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: '#65558F1A' }}>
            <CalendarDays size={20} className="text-[#65558F]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{role === 'studio' ? 'Reservas de mi estudio' : 'Mis reservas'}</h1>
            <p className="text-sm text-gray-500">
              {role === 'studio'
                ? 'Gestioná las reservas de tus salas.'
                : 'Gestioná tus reservas de salas de ensayo.'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {(['upcoming', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t ? 'bg-[#65558F] text-white' : 'bg-white text-[#65558F] hover:bg-[#65558F]/10'
              }`}
            >
              {t === 'upcoming' ? 'Próximas' : 'Historial'}
            </button>
          ))}
        </div>

        {role === 'musician' ? <MusicianBookings tab={tab} /> : <StudioBookings tab={tab} />}
      </main>
    </div>
  )
}

// ─── Músico ─────────────────────────────────────────────────────────────────

function MusicianBookings({ tab }: { tab: Tab }) {
  const [status, setStatus] = useState('')

  const active = useQuery({
    queryKey: ['bookings', 'me', 'active'],
    queryFn: () => bookingsApi.getMyActiveBookings(20),
    enabled: tab === 'upcoming',
  })

  const history = useQuery({
    queryKey: ['bookings', 'me', 'history', status],
    queryFn: () => bookingsApi.getMyBookingHistory({ status: status || undefined }),
    enabled: tab === 'history',
  })

  const q = tab === 'upcoming' ? active : history
  const items = q.data?.items ?? []

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
      {tab === 'history' && (
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
          {HISTORY_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      <BookingList
        loading={q.isLoading}
        items={items}
        role="musician"
        empty={
          tab === 'upcoming' ? (
            <>
              No tenés reservas próximas.{' '}
              <Link href="/descubrir" className="text-[#65558F] font-semibold hover:underline">Buscá una sala</Link>
            </>
          ) : 'No hay reservas en tu historial.'
        }
      />
    </section>
  )
}

// ─── Sala ───────────────────────────────────────────────────────────────────

function StudioBookings({ tab }: { tab: Tab }) {
  const [roomId, setRoomId] = useState('')
  const [date, setDate] = useState('')

  const { data: myStudios = [], isLoading: loadingStudios } = useQuery({
    queryKey: ['studios', 'mine'],
    queryFn: studioApi.getMyStudios,
    staleTime: Infinity,
  })
  const studioId: string | undefined = myStudios[0]?.studio_id

  const { data: studio } = useQuery({
    queryKey: ['studio', studioId],
    queryFn: () => studioApi.getStudioById(studioId!),
    enabled: !!studioId,
  })
  const rooms: Room[] = studio?.rehearsal_rooms ?? []

  const active = useQuery({
    queryKey: ['bookings', 'studio', studioId, 'active'],
    queryFn: () => bookingsApi.getStudioActiveBookings(studioId!),
    enabled: !!studioId && tab === 'upcoming',
  })

  const history = useQuery({
    queryKey: ['bookings', 'studio', studioId, 'history', roomId, date],
    queryFn: () => bookingsApi.getStudioBookingHistory(studioId!, { roomId: roomId || undefined, date: date || undefined }),
    enabled: !!studioId && tab === 'history',
  })

  if (!loadingStudios && !studioId) {
    return (
      <section className="bg-white rounded-2xl shadow-sm p-6 text-sm text-gray-500">
        Todavía no registraste un estudio. <Link href="/setup/estudio" className="text-[#65558F] font-semibold">Crear estudio</Link>
      </section>
    )
  }

  const q = tab === 'upcoming' ? active : history
  const items = q.data?.items ?? []

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
      {tab === 'history' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={selectClass}>
            <option value="">Todas las salas</option>
            {rooms.map((r) => <option key={r.room_id} value={r.room_id}>{r.name}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectClass} />
          {(roomId || date) && (
            <button onClick={() => { setRoomId(''); setDate('') }} className="text-sm text-gray-400 hover:text-gray-600">
              Limpiar filtros
            </button>
          )}
        </div>
      )}
      <BookingList
        loading={loadingStudios || q.isLoading}
        items={items}
        role="studio"
        rooms={rooms}
        empty={tab === 'upcoming' ? 'No hay reservas próximas.' : 'No hay reservas para esos filtros.'}
      />
    </section>
  )
}

// ─── Lista / tarjeta ────────────────────────────────────────────────────────

const selectClass =
  'border border-[#65558F]/30 rounded-lg px-3 py-2 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F] bg-white'

function BookingList({
  loading, items, role, rooms, empty,
}: { loading: boolean; items: Booking[]; role: Role; rooms?: Room[]; empty: React.ReactNode }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
        <Loader2 size={16} className="animate-spin" /> Cargando reservas…
      </div>
    )
  }
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">{empty}</p>
  }
  return (
    <div className="flex flex-col gap-3">
      {items.map((b) => <BookingCard key={b.booking_id} booking={b} role={role} rooms={rooms} />)}
    </div>
  )
}

function BookingCard({ booking, role, rooms }: { booking: Booking; role: Role; rooms?: Room[] }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const status = booking.status
  const isActive = ACTIVE_BOOKING_STATUSES.includes(status)
  const ended = new Date(booking.ends_at).getTime() <= nowAsWallClockUtc()
  const studioId = booking.rehearsal_rooms.studio_id
  const studioName = booking.rehearsal_rooms.studios?.name

  const { data: payment, isLoading: loadingPayment } = useQuery({
    queryKey: ['bookings', 'payment', booking.booking_id],
    queryFn: () => paymentsApi.getStatus(booking.booking_id),
    enabled: expanded,
    retry: false,
  })

  // Datos de la sala necesarios para reprogramar (precio, duración mínima)
  const { data: studio } = useQuery({
    queryKey: ['studio', studioId],
    queryFn: () => studioApi.getStudioById(studioId),
    enabled: rescheduleOpen && role === 'musician',
  })
  const roomForReschedule = useMemo(() => {
    const list: Room[] = rooms ?? studio?.rehearsal_rooms ?? []
    return list.find((r) => r.room_id === booking.room_id)
  }, [rooms, studio, booking.room_id])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['bookings'] })
  const onErr = (e: unknown) => setError(apiErrorMessage(e))

  const cancel = useMutation({
    mutationFn: () => bookingsApi.cancel(booking.booking_id, reason.trim() || undefined),
    onSuccess: () => { setCancelOpen(false); setError(null); invalidate() },
    onError: onErr,
  })
  const complete = useMutation({
    mutationFn: () => bookingsApi.complete(booking.booking_id),
    onSuccess: () => { setError(null); invalidate() },
    onError: onErr,
  })
  const confirm = useMutation({
    mutationFn: () => bookingsApi.confirm(booking.booking_id),
    onSuccess: () => { setError(null); invalidate() },
    onError: onErr,
  })
  const pay = useMutation({
    mutationFn: () => startCheckout(booking.booking_id),
    onSuccess: (waitingPath) => { if (waitingPath) router.push(waitingPath) },
    onError: onErr,
  })
  const receipt = useMutation({
    mutationFn: () => paymentsApi.downloadReceipt(booking.booking_id),
    onError: onErr,
  })
  const refund = useMutation({
    mutationFn: () => paymentsApi.refund(booking.booking_id, { reason: reason.trim() || undefined }),
    onSuccess: () => { setError(null); invalidate() },
    onError: onErr,
  })

  const { data: onlinePayments } = useQuery({
    queryKey: ['payments', 'studio-online', studioId],
    queryFn: () => paymentsApi.getStudioOnlinePayments(studioId),
    enabled: expanded && role === 'musician',
    staleTime: 5 * 60_000,
  })

  const canPay =
    role === 'musician' && (status === 'hold' || status === 'pending_payment') && !!onlinePayments?.enabled
  const canConfirmWithoutPay = role === 'musician' && status === 'hold'
  const canReschedule = role === 'musician' && isActive && !ended && status !== 'hold'
  const canCancel = isActive && !ended
  const canComplete = role === 'studio' && status === 'confirmed' && ended

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {rescheduleOpen && roomForReschedule && (
        <BookingModal
          studioId={studioId}
          room={roomForReschedule}
          booking={booking}
          onClose={() => setRescheduleOpen(false)}
        />
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-center shrink-0 w-14">
            <p className="text-[10px] uppercase text-gray-400">{formatBookingDate(booking.starts_at).split(',')[0]}</p>
            <p className="text-sm font-bold text-[#65558F]">{formatBookingRange(booking.starts_at, booking.ends_at).split(' – ')[0]}</p>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {booking.rehearsal_rooms.name}
              {role === 'musician' && studioName && <span className="text-gray-400 font-normal"> · {studioName}</span>}
            </p>
            <p className="text-xs text-gray-400 truncate capitalize">
              {formatBookingDate(booking.starts_at)} · {formatBookingRange(booking.starts_at, booking.ends_at)}
              {role === 'studio' && booking.users && (
                <span className="normal-case"> · {booking.users.display_name || booking.users.username}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline text-sm font-semibold text-gray-700">{formatMoney(booking.total_amount)}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BOOKING_STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600'}`}>
            {BOOKING_STATUS_LABEL[status] ?? status}
          </span>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 flex flex-col gap-4 text-sm">
          <div className="grid sm:grid-cols-2 gap-3">
            <Info icon={role === 'studio' ? User : Building2} label={role === 'studio' ? 'Músico' : 'Estudio'}>
              {role === 'studio'
                ? (booking.users?.display_name || booking.users?.username || '—')
                : <Link href={`/estudio/${studioId}`} className="text-[#65558F] hover:underline">{studioName ?? 'Ver estudio'}</Link>}
            </Info>
            <Info icon={CreditCard} label="Pago">
              {loadingPayment ? 'Consultando…' : payment ? (
                <>
                  {paymentStatusLabel(payment.friendly_status)}
                  {payment.refunded_amount > 0 && <span className="text-gray-400"> · reembolsado {formatMoney(payment.refunded_amount)}</span>}
                </>
              ) : 'Sin pagos online'}
            </Info>
            {booking.notes && <Info icon={Store} label="Notas">{booking.notes}</Info>}
            {booking.cancellation_reasons && <Info icon={Ban} label="Motivo de cancelación">{booking.cancellation_reasons}</Info>}
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

          {cancelOpen ? (
            <div className="flex flex-col gap-2 bg-red-50/50 rounded-xl p-3">
              <p className="text-sm font-semibold text-red-600">¿Cancelar esta reserva?</p>
              {role === 'studio' && payment?.can_refund && (
                <p className="text-xs text-gray-500">La reserva tiene un pago aprobado. Después de cancelar podés reembolsarlo.</p>
              )}
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Motivo (opcional)"
                className="border border-red-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <div className="flex gap-2">
                <ActionButton danger onClick={() => cancel.mutate()} loading={cancel.isPending} icon={Ban}>Sí, cancelar</ActionButton>
                <ActionButton onClick={() => setCancelOpen(false)}>Volver</ActionButton>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {canPay && (
                <ActionButton primary onClick={() => pay.mutate()} loading={pay.isPending} icon={CreditCard}>
                  Pagar con MercadoPago
                </ActionButton>
              )}
              {canConfirmWithoutPay && (
                <ActionButton onClick={() => confirm.mutate()} loading={confirm.isPending} icon={Store}>
                  Confirmar y pagar en la sala
                </ActionButton>
              )}
              {canReschedule && (
                <ActionButton onClick={() => setRescheduleOpen(true)} icon={CalendarClock}>Reprogramar</ActionButton>
              )}
              {payment?.can_download_receipt && (
                <ActionButton onClick={() => receipt.mutate()} loading={receipt.isPending} icon={FileDown}>
                  Descargar comprobante
                </ActionButton>
              )}
              {role === 'musician' && status === 'completed' && (
                <Link
                  href={`/estudio/${studioId}#resenas`}
                  className="rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-1.5 bg-amber-400 text-white hover:bg-amber-500"
                >
                  <Star size={13} /> Calificar la sala
                </Link>
              )}
              {canComplete && (
                <ActionButton primary onClick={() => complete.mutate()} loading={complete.isPending} icon={CheckCheck}>
                  Marcar como completada
                </ActionButton>
              )}
              {role === 'studio' && payment?.can_refund && !isActive && (
                <ActionButton onClick={() => refund.mutate()} loading={refund.isPending} icon={Undo2}>
                  Reembolsar pago
                </ActionButton>
              )}
              {canCancel && (
                <ActionButton danger onClick={() => setCancelOpen(true)} icon={Ban}>Cancelar reserva</ActionButton>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Info({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-[#65558F] mt-0.5 shrink-0" />
      <div>
        <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
        <div className="text-gray-700">{children}</div>
      </div>
    </div>
  )
}

function ActionButton({
  children, onClick, loading, icon: Icon, primary, danger,
}: {
  children: React.ReactNode
  onClick: () => void
  loading?: boolean
  icon?: React.ElementType
  primary?: boolean
  danger?: boolean
}) {
  const cls = primary
    ? 'bg-[#65558F] text-white hover:opacity-90'
    : danger
      ? 'border border-red-200 text-red-500 hover:bg-red-50'
      : 'border border-[#65558F]/40 text-[#65558F] hover:bg-[#65558F]/10'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60 transition-colors ${cls}`}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : Icon ? <Icon size={13} /> : null}
      {children}
    </button>
  )
}
