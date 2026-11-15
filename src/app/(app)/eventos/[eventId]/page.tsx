'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, CalendarDays, Clock, MapPin, Users, Lock, Globe, Ban, Pencil, UserPlus,
  Check, X, Bookmark, BookmarkCheck, CalendarPlus, Share2, Copy, Loader2, Music2,
} from 'lucide-react'
import { AppNavbar } from '@/components/AppNavbar'
import { EventFormModal } from '@/components/events/EventFormModal'
import { InviteModal } from '@/components/events/InviteModal'
import { ReportButton } from '@/components/reviews/ReportButton'
import { eventsApi, type EventDetail } from '@/lib/api/events'
import { bandsApi } from '@/lib/api/bands'
import { useAuthStore } from '@/store/auth.store'
import { apiErrorMessage } from '@/lib/booking-format'
import {
  downloadIcs, eventHasEnded, eventHasStarted, formatEventDate, formatEventTime,
  formatPlace, googleCalendarUrl, hostName,
} from '@/lib/event-format'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

function staticMapUrl(lat: number, lng: number) {
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+65558f(${lng},${lat})/${lng},${lat},14,0/600x240@2x?access_token=${MAPBOX_TOKEN}`
}

export default function EventDetailPage() {
  return (
    <Suspense>
      <EventDetailInner />
    </Suspense>
  )
}

function EventDetailInner() {
  const { eventId } = useParams<{ eventId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [editOpen, setEditOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(searchParams.get('invitar') === '1')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: event, isLoading, error: loadError } = useQuery({
    queryKey: ['events', eventId],
    queryFn: () => eventsApi.getById(eventId),
    retry: false,
  })

  const { data: attendees = [] } = useQuery({
    queryKey: ['events', eventId, 'attendees'],
    queryFn: () => eventsApi.getAttendees(eventId),
    enabled: !!event,
  })

  const isHost = !!event && event.host_user_id === user?.userId

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['events'] })
  const onErr = (e: unknown) => setError(apiErrorMessage(e))
  const mut = <T,>(fn: () => Promise<T>) => ({
    mutationFn: fn,
    onSuccess: () => { setError(null); invalidate() },
    onError: onErr,
  })

  const attend = useMutation(mut(() => eventsApi.attend(eventId)))
  const leave = useMutation(mut(() => eventsApi.leave(eventId)))
  const save = useMutation(mut(() => eventsApi.save(eventId)))
  const unsave = useMutation(mut(() => eventsApi.unsave(eventId)))
  const acceptInvite = useMutation(mut(() => eventsApi.acceptInvite(event!.user_state.invite_id!)))
  const rejectInvite = useMutation(mut(() => eventsApi.rejectInvite(event!.user_state.invite_id!)))
  const cancelEvent = useMutation({
    ...mut(() => eventsApi.cancel(eventId, cancelReason.trim() || undefined)),
    onSuccess: () => { setCancelOpen(false); setError(null); invalidate() },
  })

  if (isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-20">
          <Loader2 size={16} className="animate-spin" /> Cargando evento…
        </div>
      </Shell>
    )
  }

  if (loadError || !event) {
    const status = (loadError as { response?: { status?: number } } | null)?.response?.status
    return (
      <Shell>
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center flex flex-col items-center gap-3">
          <Lock size={40} className="text-gray-300" />
          <p className="font-semibold text-gray-800">
            {status === 403 ? 'Este evento es privado' : 'No encontramos este evento'}
          </p>
          <p className="text-sm text-gray-500">
            {status === 403 ? 'Solo pueden verlo las personas invitadas.' : 'Puede que haya sido eliminado.'}
          </p>
          <Link href="/eventos" className="text-sm font-semibold text-[#65558F] hover:underline">Volver a eventos</Link>
        </div>
      </Shell>
    )
  }

  const started = eventHasStarted(event)
  const ended = eventHasEnded(event)
  const cancelled = !!event.is_cancelled
  const attending = event.user_state.attendance_status === 'attending'
  const saved = event.user_state.attendance_status === 'saved'
  const invitePending = event.user_state.invite_status === 'pending' && !!event.user_state.invite_id
  const full = event.available_capacity === 0
  const canInteract = !cancelled && !ended
  const lat = event.places?.lat != null ? Number(event.places.lat) : null
  const lng = event.places?.lng != null ? Number(event.places.lng) : null
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/eventos/${event.event_id}` : ''

  return (
    <Shell>
      {editOpen && (
        <EventFormModal event={event} onClose={() => setEditOpen(false)} onSaved={() => setEditOpen(false)} />
      )}
      {inviteOpen && isHost && (
        <InviteModal
          eventId={event.event_id}
          excludeUserIds={[event.host_user_id, ...attendees.map((a) => a.user_id)]}
          onClose={() => { setInviteOpen(false); router.replace(`/eventos/${event.event_id}`) }}
        />
      )}

      <Link href="/eventos" className="flex items-center gap-1.5 text-sm text-[#65558F] hover:underline w-fit">
        <ArrowLeft size={15} /> Eventos
      </Link>

      {cancelled && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700 flex items-start gap-2">
          <Ban size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Este evento fue cancelado.</p>
            {event.cancel_reason && <p>Motivo: {event.cancel_reason}</p>}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Columna principal ─────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <section className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#65558F1A] text-[#65558F]">
                    {event.visibility === 'private' ? <><Lock size={11} /> Privado</> : <><Globe size={11} /> Público</>}
                  </span>
                  {ended && !cancelled && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Finalizado</span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 break-words">{event.title}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Organiza{' '}
                  {event.bands ? (
                    <Link href={`/bandas/${event.bands.band_id}`} className="font-semibold text-[#65558F] hover:underline">{event.bands.name}</Link>
                  ) : (
                    <Link href={`/perfil/${event.host_user_id}`} className="font-semibold text-[#65558F] hover:underline">{hostName(event)}</Link>
                  )}
                </p>
              </div>
              {!isHost && <ReportButton targetType="event" targetId={event.event_id} variant="icon" />}
              {isHost && !cancelled && !started && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="rounded-full p-2 border border-[#65558F]/30 text-[#65558F] hover:bg-[#65558F]/10 shrink-0"
                  title="Editar evento"
                >
                  <Pencil size={15} />
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <InfoRow icon={CalendarDays}><span className="capitalize">{formatEventDate(event.starts_at)}</span></InfoRow>
              <InfoRow icon={Clock}>{formatEventTime(event.starts_at, event.ends_at) || 'Horario a confirmar'}</InfoRow>
              <InfoRow icon={MapPin}>
                {formatPlace(event.places)}
                {event.places?.address_line1 && <span className="block text-xs text-gray-400">{event.places.address_line1}</span>}
              </InfoRow>
              <InfoRow icon={Users}>
                {event.attending_count} {event.attending_count === 1 ? 'asistente' : 'asistentes'}
                {event.capacity != null && (
                  <span className="block text-xs text-gray-400">
                    {full ? 'Aforo completo' : `Quedan ${event.available_capacity} de ${event.capacity} lugares`}
                  </span>
                )}
              </InfoRow>
            </div>

            {event.capacity != null && (
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${full ? 'bg-red-400' : 'bg-[#65558F]'}`}
                  style={{ width: `${Math.min(100, (event.attending_count / event.capacity) * 100)}%` }}
                />
              </div>
            )}

            {event.description && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{event.description}</p>}
          </section>

          {lat != null && lng != null && MAPBOX_TOKEN && (
            <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={staticMapUrl(lat, lng)} alt="Mapa del lugar" className="w-full object-cover" style={{ maxHeight: 240 }} />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                target="_blank"
                rel="noreferrer"
                className="block text-xs text-[#65558F] px-6 py-3 hover:underline"
              >
                Cómo llegar
              </a>
            </section>
          )}

          <BandLineup event={event} canInteract={canInteract} onError={onErr} />

          <section className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users size={18} className="text-[#65558F]" /> Asistentes ({attendees.length})
              </h2>
              {isHost && canInteract && (
                <button
                  onClick={() => setInviteOpen(true)}
                  className="rounded-full px-4 py-1.5 text-xs font-semibold border border-[#65558F]/40 text-[#65558F] hover:bg-[#65558F]/10 flex items-center gap-1.5"
                >
                  <UserPlus size={13} /> Invitar
                </button>
              )}
            </div>
            {attendees.length === 0 ? (
              <p className="text-sm text-gray-400">Todavía nadie confirmó asistencia.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {attendees.map((a) => (
                  <Link
                    key={a.event_attendee_id}
                    href={`/perfil/${a.user_id}`}
                    className="flex items-center gap-2 rounded-full border border-gray-100 pl-1 pr-3 py-1 hover:bg-gray-50"
                  >
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: '#65558F' }}>
                      {(a.users.display_name ?? a.users.username).charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-700">{a.users.display_name ?? a.users.username}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Columna de acciones ───────────────────────────────────── */}
        <aside className="flex flex-col gap-4">
          <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-3">
            {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            {/* Invitación pendiente */}
            {invitePending && canInteract && (
              <div className="flex flex-col gap-2 rounded-xl bg-[#65558F1A] p-3">
                <p className="text-sm font-semibold text-[#65558F]">Te invitaron a este evento</p>
                <div className="flex gap-2">
                  <Btn primary onClick={() => acceptInvite.mutate()} loading={acceptInvite.isPending} icon={Check}>Asistiré</Btn>
                  <Btn onClick={() => rejectInvite.mutate()} loading={rejectInvite.isPending} icon={X}>No puedo</Btn>
                </div>
              </div>
            )}

            {/* CU39 / CU37 – asistencia */}
            {!isHost && canInteract && !invitePending && (
              attending ? (
                <>
                  <p className="text-sm font-semibold text-green-600 flex items-center gap-1.5"><Check size={16} /> Vas a asistir</p>
                  <Btn onClick={() => leave.mutate()} loading={leave.isPending} icon={X}>Cancelar asistencia</Btn>
                </>
              ) : full ? (
                <p className="text-sm font-semibold text-red-500 text-center py-2">Evento completo</p>
              ) : (
                <Btn primary onClick={() => attend.mutate()} loading={attend.isPending} icon={Check}>Asistiré</Btn>
              )
            )}

            {/* CU60 – guardar */}
            {!isHost && canInteract && !attending && (
              saved ? (
                <Btn onClick={() => unsave.mutate()} loading={unsave.isPending} icon={BookmarkCheck}>Guardado · quitar</Btn>
              ) : (
                <Btn onClick={() => save.mutate()} loading={save.isPending} icon={Bookmark}>Guardar</Btn>
              )
            )}

            {isHost && canInteract && (
              <>
                <Btn primary onClick={() => setInviteOpen(true)} icon={UserPlus}>Invitar conexiones</Btn>
                {!started && <Btn onClick={() => setEditOpen(true)} icon={Pencil}>Editar evento</Btn>}
              </>
            )}

            {/* CU60 – agendar en calendario */}
            {event.starts_at && !ended && !cancelled && <AddToCalendar event={event} url={shareUrl} />}

            {/* CU62 – compartir */}
            {!cancelled && (event.visibility !== 'private' || isHost) && <ShareBox event={event} url={shareUrl} />}
          </section>

          {/* CU12 – cancelar evento */}
          {isHost && !cancelled && !ended && (
            <section className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-2">
              {cancelOpen ? (
                <>
                  <p className="text-sm font-semibold text-red-600">¿Cancelar el evento?</p>
                  <p className="text-xs text-gray-500">Se les avisará a los asistentes. Esta acción no se puede deshacer.</p>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value.slice(0, 255))}
                    rows={2}
                    placeholder="Motivo (opcional)"
                    className="border border-red-200 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                  <div className="flex gap-2">
                    <Btn danger onClick={() => cancelEvent.mutate()} loading={cancelEvent.isPending} icon={Ban}>Sí, cancelar</Btn>
                    <Btn onClick={() => setCancelOpen(false)}>Volver</Btn>
                  </div>
                </>
              ) : (
                <Btn danger onClick={() => setCancelOpen(true)} icon={Ban}>Cancelar evento</Btn>
              )}
            </section>
          )}
        </aside>
      </div>
    </Shell>
  )
}

// ── Line-up de bandas (CU37: bandas confirman presencia) ─────────────────────

function BandLineup({ event, canInteract, onError }: { event: EventDetail; canInteract: boolean; onError: (e: unknown) => void }) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [bandId, setBandId] = useState('')

  const { data: myBands = [] } = useQuery({
    queryKey: ['bands', 'mine'],
    queryFn: bandsApi.getMine,
    enabled: user?.role === 'MUSICIAN',
  })
  const managed = myBands.filter((b) => b.owner_user_id === user?.userId)
  const lineup = event.event_band_attendance ?? []
  const confirmedIds = new Set(lineup.map((l) => l.band_id))

  const setAttendance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'attending' | 'declined' }) =>
      eventsApi.setBandAttendance(event.event_id, id, status),
    onSuccess: () => { setBandId(''); queryClient.invalidateQueries({ queryKey: ['events', event.event_id] }) },
    onError,
  })

  if (lineup.length === 0 && (managed.length === 0 || !canInteract)) return null

  const available = managed.filter((b) => !confirmedIds.has(b.band_id))

  return (
    <section className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-3">
      <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
        <Music2 size={18} className="text-[#65558F]" /> Bandas que tocan
      </h2>
      {lineup.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no hay bandas confirmadas.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {lineup.map((l) => {
            const mine = managed.some((b) => b.band_id === l.band_id)
            return (
              <span key={l.band_id} className="flex items-center gap-2 rounded-full bg-[#65558F1A] text-[#65558F] text-sm font-semibold pl-3 pr-2 py-1">
                <Link href={`/bandas/${l.band_id}`} className="hover:underline">{l.bands.name}</Link>
                {mine && canInteract && (
                  <button
                    onClick={() => setAttendance.mutate({ id: l.band_id, status: 'declined' })}
                    title="Bajar a mi banda"
                    className="rounded-full hover:bg-[#65558F]/20 p-0.5"
                  >
                    <X size={13} />
                  </button>
                )}
              </span>
            )
          })}
        </div>
      )}
      {canInteract && available.length > 0 && (
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={bandId}
            onChange={(e) => setBandId(e.target.value)}
            className="border border-[#65558F]/30 rounded-lg px-3 py-2 text-sm text-[#65558F] bg-white focus:outline-none focus:ring-2 focus:ring-[#65558F]"
          >
            <option value="">Elegí una de tus bandas…</option>
            {available.map((b) => <option key={b.band_id} value={b.band_id}>{b.name}</option>)}
          </select>
          <Btn
            primary
            onClick={() => bandId && setAttendance.mutate({ id: bandId, status: 'attending' })}
            loading={setAttendance.isPending}
            icon={Check}
          >
            Confirmar que tocamos
          </Btn>
        </div>
      )}
    </section>
  )
}

// ── Agendar (CU60) ────────────────────────────────────────────────────────────

function AddToCalendar({ event, url }: { event: EventDetail; url: string }) {
  const [open, setOpen] = useState(false)
  const gcal = googleCalendarUrl(event, url)
  return (
    <div className="flex flex-col gap-2">
      <Btn onClick={() => setOpen((v) => !v)} icon={CalendarPlus}>Agregar al calendario</Btn>
      {open && (
        <div className="flex flex-col gap-1 pl-2">
          {gcal && (
            <a href={gcal} target="_blank" rel="noreferrer" className="text-sm text-[#65558F] hover:underline">Google Calendar</a>
          )}
          <button onClick={() => downloadIcs(event, url)} className="text-sm text-[#65558F] hover:underline text-left">
            Descargar .ics (Outlook, Apple, otros)
          </button>
        </div>
      )}
    </div>
  )
}

// ── Compartir (CU62) ──────────────────────────────────────────────────────────

function ShareBox({ event, url }: { event: EventDetail; url: string }) {
  const [copied, setCopied] = useState(false)
  const text = `${event.title} — ${formatEventDate(event.starts_at)}`

  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: event.title, text, url }) } catch { /* cancelado */ }
    } else {
      await copy()
    }
  }
  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Compartir</p>
      <div className="flex gap-2 flex-wrap">
        <button onClick={nativeShare} className="rounded-full p-2 border border-gray-200 text-gray-600 hover:bg-gray-50" title="Compartir">
          <Share2 size={15} />
        </button>
        <button onClick={copy} className="rounded-full px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5">
          {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar link</>}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold"
        >
          WhatsApp
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full px-3 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold"
        >
          X
        </a>
      </div>
    </div>
  )
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <AppNavbar />
      <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">{children}</main>
    </div>
  )
}

function InfoRow({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-gray-700">
      <Icon size={16} className="text-[#65558F] mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function Btn({
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
      className={`rounded-full px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 transition-colors w-full ${cls}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  )
}
