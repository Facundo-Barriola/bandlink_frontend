'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, CalendarCheck, Clock, CreditCard, Store, CheckCircle2, Loader2 } from 'lucide-react'
import { bookingsApi, type Booking, type AvailabilitySlot } from '@/lib/api/bookings'
import { startCheckout, paymentsApi } from '@/lib/api/payments'
import {
  apiErrorMessage,
  formatBookingDate,
  formatBookingRange,
  formatMoney,
  nowAsWallClockUtc,
  todayYmd,
} from '@/lib/booking-format'

const HOLD_TTL_MS = 10 * 60 * 1000

const labelClass = 'block text-xs font-semibold text-[#65558F] uppercase tracking-wide mb-1.5'
const inputClass =
  'w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65558F] border-[#65558F] placeholder-[#65558F]/50 text-[#65558F]'

export interface BookableRoom {
  room_id: string
  name: string
  base_hourly_price: number | string | null
  min_booking_minutes: number | null
}

type Props = {
  studioId: string
  room: BookableRoom
  /** Si viene, el modal funciona en modo "reprogramar". */
  booking?: Booking
  onClose: () => void
}

type Step = 'select' | 'review' | 'done'

function durationOptions(minMinutes: number) {
  const opts: number[] = []
  const start = Math.max(30, Math.ceil(minMinutes / 30) * 30)
  for (let m = start; m <= Math.max(start, 360); m += 30) opts.push(m)
  return opts
}

function durationLabel(m: number) {
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r} min`
  return r ? `${h} h ${r} min` : `${h} h`
}

export function BookingModal({ studioId, room, booking, onClose }: Props) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const isReschedule = !!booking

  const minMinutes = room.min_booking_minutes ?? 60
  const options = useMemo(() => durationOptions(minMinutes), [minMinutes])

  const initialDuration = booking
    ? Math.round((new Date(booking.ends_at).getTime() - new Date(booking.starts_at).getTime()) / 60000)
    : Math.max(60, options[0])

  const [step, setStep] = useState<Step>('select')
  const [date, setDate] = useState(booking ? booking.starts_at.slice(0, 10) : todayYmd())
  const [duration, setDuration] = useState(options.includes(initialDuration) ? initialDuration : options[0])
  const [slot, setSlot] = useState<AvailabilitySlot | null>(null)
  const [notes, setNotes] = useState(booking?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [hold, setHold] = useState<Booking | null>(null)
  const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const hourly = room.base_hourly_price != null ? Number(room.base_hourly_price) : null
  const estimated = hourly != null ? (hourly * duration) / 60 : null

  const { data: availability, isFetching: loadingSlots } = useQuery({
    queryKey: ['availability', room.room_id, date, duration],
    queryFn: () => bookingsApi.getRoomAvailability(studioId, room.room_id, date, duration, 30),
    enabled: step === 'select' && !!date,
  })

  const { data: onlinePayments } = useQuery({
    queryKey: ['payments', 'studio-online', studioId],
    queryFn: () => paymentsApi.getStudioOnlinePayments(studioId),
    staleTime: 5 * 60_000,
  })
  const canPayOnline = onlinePayments?.enabled ?? false

  const slots = useMemo(() => {
    const nowWall = nowAsWallClockUtc()
    return (availability?.slots ?? []).filter((s) => new Date(s.starts_at).getTime() > nowWall)
  }, [availability])

  // Countdown del hold
  useEffect(() => {
    if (step !== 'review') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [step])

  const remainingMs = holdExpiresAt ? Math.max(0, holdExpiresAt - now) : 0
  const holdExpired = step === 'review' && remainingMs === 0
  const mmss = `${String(Math.floor(remainingMs / 60000)).padStart(2, '0')}:${String(
    Math.floor((remainingMs % 60000) / 1000),
  ).padStart(2, '0')}`

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
    queryClient.invalidateQueries({ queryKey: ['availability', room.room_id] })
  }

  const createHold = useMutation({
    mutationFn: () =>
      bookingsApi.createHold(room.room_id, {
        starts_at: slot!.starts_at,
        ends_at: slot!.ends_at,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (data) => {
      setError(null)
      setHold(data)
      setHoldExpiresAt(Date.now() + HOLD_TTL_MS)
      setStep('review')
      invalidate()
    },
    onError: (e) => setError(apiErrorMessage(e, 'No se pudo reservar el horario.')),
  })

  const reschedule = useMutation({
    mutationFn: () =>
      bookingsApi.reschedule(booking!.booking_id, {
        starts_at: slot!.starts_at,
        ends_at: slot!.ends_at,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      setError(null)
      invalidate()
      setStep('done')
    },
    onError: (e) => setError(apiErrorMessage(e, 'No se pudo reprogramar la reserva.')),
  })

  const confirm = useMutation({
    mutationFn: () => bookingsApi.confirm(hold!.booking_id),
    onSuccess: () => {
      setError(null)
      invalidate()
      setStep('done')
    },
    onError: (e) => setError(apiErrorMessage(e, 'No se pudo confirmar la reserva.')),
  })

  const pay = useMutation({
    mutationFn: () => startCheckout(hold!.booking_id),
    onSuccess: (waitingPath) => {
      if (waitingPath) router.push(waitingPath)
    },
    onError: (e) => setError(apiErrorMessage(e, 'No se pudo iniciar el pago.')),
  })

  const releaseHold = useMutation({
    mutationFn: () => bookingsApi.cancel(hold!.booking_id, 'Hold liberado por el usuario'),
    onSettled: () => {
      invalidate()
      onClose()
    },
  })

  const handleClose = () => {
    // Si hay un hold vigente sin confirmar, lo liberamos para no bloquear la sala.
    if (step === 'review' && hold && !holdExpired && !pay.isPending) {
      releaseHold.mutate()
      return
    }
    onClose()
  }

  const busy = createHold.isPending || reschedule.isPending || confirm.isPending || pay.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-[#65558F]">
              {isReschedule ? 'Reprogramar reserva' : 'Reservar sala'}
            </h2>
            <p className="text-xs text-gray-400">{room.name}</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600" disabled={releaseHold.isPending}>
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-6 flex flex-col gap-5">
          {/* ── Paso 1: elegir fecha/horario ─────────────────────────── */}
          {step === 'select' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Fecha</label>
                  <input
                    type="date"
                    value={date}
                    min={todayYmd()}
                    onChange={(e) => { setDate(e.target.value); setSlot(null) }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Duración</label>
                  <select
                    value={duration}
                    onChange={(e) => { setDuration(parseInt(e.target.value)); setSlot(null) }}
                    className={`${inputClass} bg-white`}
                  >
                    {options.map((m) => (
                      <option key={m} value={m}>
                        {durationLabel(m)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Horarios disponibles</label>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                    <Loader2 size={16} className="animate-spin" /> Buscando horarios…
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-gray-400 bg-gray-50 rounded-lg px-4 py-3">
                    No hay horarios libres para esa fecha y duración. Probá con otro día.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((s) => {
                      const selected = slot?.starts_at === s.starts_at
                      return (
                        <button
                          key={s.starts_at}
                          type="button"
                          onClick={() => setSlot(s)}
                          className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                            selected
                              ? 'bg-[#65558F] text-white border-[#65558F]'
                              : 'border-[#65558F]/30 text-[#65558F] hover:bg-[#65558F]/10'
                          }`}
                        >
                          {formatBookingRange(s.starts_at, s.ends_at).split(' – ')[0]}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Notas para la sala (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Ej. Somos 4, necesitamos 2 micrófonos"
                  className={`${inputClass} resize-none`}
                />
              </div>

              {slot && (
                <div className="rounded-xl bg-[#65558F1A] px-4 py-3 text-sm text-[#65558F] flex flex-col gap-1">
                  <span className="font-semibold capitalize">{formatBookingDate(slot.starts_at)}</span>
                  <span>{formatBookingRange(slot.starts_at, slot.ends_at)} · {durationLabel(duration)}</span>
                  {estimated != null && <span className="font-semibold">Total estimado: {formatMoney(estimated)}</span>}
                </div>
              )}

              {error && <ErrorBox msg={error} />}

              <button
                onClick={() => (isReschedule ? reschedule.mutate() : createHold.mutate())}
                disabled={!slot || busy}
                className="rounded-full py-3 font-semibold text-white disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
                style={{ backgroundColor: '#65558F' }}
              >
                <CalendarCheck size={16} />
                {busy ? 'Procesando…' : isReschedule ? 'Guardar nuevo horario' : 'Continuar'}
              </button>
            </>
          )}

          {/* ── Paso 2: confirmar / pagar ─────────────────────────────── */}
          {step === 'review' && hold && (
            <>
              <div className="rounded-xl border border-[#65558F]/20 p-4 flex flex-col gap-1 text-sm">
                <span className="font-semibold text-gray-800 capitalize">{formatBookingDate(hold.starts_at)}</span>
                <span className="text-gray-600">{formatBookingRange(hold.starts_at, hold.ends_at)} · {room.name}</span>
                <span className="text-base font-bold text-[#65558F] mt-1">{formatMoney(hold.total_amount)}</span>
              </div>

              <div
                className={`flex items-center gap-2 text-sm rounded-lg px-4 py-3 ${
                  holdExpired ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'
                }`}
              >
                <Clock size={16} />
                {holdExpired
                  ? 'El horario se liberó porque pasaron 10 minutos. Elegí uno nuevo.'
                  : `Te guardamos el horario por ${mmss}. Confirmá antes de que expire.`}
              </div>

              {error && <ErrorBox msg={error} />}

              {holdExpired ? (
                <button
                  onClick={() => { setHold(null); setStep('select'); setError(null) }}
                  className="rounded-full py-3 font-semibold text-white"
                  style={{ backgroundColor: '#65558F' }}
                >
                  Elegir otro horario
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  {!canPayOnline && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      Esta sala todavía no acepta pago online: confirmá la reserva y pagás directamente en la sala.
                    </p>
                  )}
                  {canPayOnline && (
                  <button
                    onClick={() => pay.mutate()}
                    disabled={busy}
                    className="rounded-full py-3 font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#009EE3' }}
                  >
                    <CreditCard size={16} />
                    {pay.isPending ? 'Redirigiendo a MercadoPago…' : 'Pagar ahora con MercadoPago'}
                  </button>
                  )}
                  <button
                    onClick={() => confirm.mutate()}
                    disabled={busy}
                    className="rounded-full py-3 font-semibold border border-[#65558F] text-[#65558F] hover:bg-[#65558F]/10 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <Store size={16} />
                    {confirm.isPending ? 'Confirmando…' : 'Confirmar y pagar en la sala'}
                  </button>
                  <button
                    onClick={handleClose}
                    disabled={busy || releaseHold.isPending}
                    className="text-sm text-gray-400 hover:text-gray-600 py-1"
                  >
                    {releaseHold.isPending ? 'Liberando horario…' : 'Cancelar'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Paso 3: listo ─────────────────────────────────────────── */}
          {step === 'done' && (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <CheckCircle2 size={48} className="text-green-500" />
              <p className="font-semibold text-gray-800">
                {isReschedule ? '¡Reserva reprogramada!' : '¡Reserva confirmada!'}
              </p>
              <p className="text-sm text-gray-500">
                {isReschedule
                  ? 'Le avisamos a la sala del cambio de horario.'
                  : 'La sala recibió tu reserva. Podés verla y gestionarla desde Mis reservas.'}
              </p>
              <div className="flex gap-2 mt-2">
                <Link
                  href="/reservas"
                  className="rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: '#65558F' }}
                >
                  Ver mis reservas
                </Link>
                <button onClick={onClose} className="rounded-full px-5 py-2.5 text-sm font-semibold border border-gray-200 text-gray-600">
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{msg}</p>
}
