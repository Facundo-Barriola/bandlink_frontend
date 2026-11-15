'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Plus, Search, Loader2, Check, X, Map as MapIcon } from 'lucide-react'
import { AppNavbar } from '@/components/AppNavbar'
import { EventCard } from '@/components/events/EventCard'
import { EventFormModal } from '@/components/events/EventFormModal'
import { eventsApi, type BandEvent } from '@/lib/api/events'
import { apiErrorMessage } from '@/lib/booking-format'

type Tab = 'explore' | 'mine' | 'saved' | 'invites'

const TABS: { id: Tab; label: string }[] = [
  { id: 'explore', label: 'Explorar' },
  { id: 'mine', label: 'Organizo' },
  { id: 'saved', label: 'Guardados' },
  { id: 'invites', label: 'Invitaciones' },
]

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export default function EventosPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('explore')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: invites = [] } = useQuery({
    queryKey: ['events', 'invites'],
    queryFn: eventsApi.getReceivedInvites,
  })

  return (
    <div className="min-h-screen bg-gray-100">
      <AppNavbar />
      {createOpen && (
        <EventFormModal
          onClose={() => setCreateOpen(false)}
          onSaved={(e) => router.push(`/eventos/${e.event_id}${e.visibility === 'private' ? '?invitar=1' : ''}`)}
        />
      )}

      <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: '#65558F1A' }}>
              <CalendarDays size={20} className="text-[#65558F]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Eventos</h1>
              <p className="text-sm text-gray-500">Encontrá fechas, organizá las tuyas y sumate.</p>
            </div>
          </div>
          <div className="flex gap-2">
          <button
            onClick={() => router.push('/mapa?tipo=event')}
            className="rounded-full px-5 py-2.5 text-sm font-semibold border border-[#65558F]/40 text-[#65558F] hover:bg-[#65558F]/10 flex items-center gap-2"
          >
            <MapIcon size={16} /> Ver en el mapa
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-2"
            style={{ backgroundColor: '#65558F' }}
          >
            <Plus size={16} /> Crear evento
          </button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                tab === t.id ? 'bg-[#65558F] text-white' : 'bg-white text-[#65558F] hover:bg-[#65558F]/10'
              }`}
            >
              {t.label}
              {t.id === 'invites' && invites.length > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full ${tab === t.id ? 'bg-white text-[#65558F]' : 'bg-[#65558F] text-white'}`}>
                  {invites.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <section className="bg-white rounded-2xl shadow-sm p-6">
          {tab === 'explore' && <ExploreTab />}
          {tab === 'mine' && <MineTab />}
          {tab === 'saved' && <SavedTab />}
          {tab === 'invites' && <InvitesTab />}
        </section>
      </main>
    </div>
  )
}

// ── CU13 / CU14: ver y buscar eventos ────────────────────────────────────────

function ExploreTab() {
  const [search, setSearch] = useState('')
  const [showPast, setShowPast] = useState(false)
  const debounced = useDebounced(search)
  const [fromIso] = useState(() => new Date().toISOString())

  const { data = [], isLoading } = useQuery({
    queryKey: ['events', 'explore', debounced, showPast],
    queryFn: () =>
      eventsApi.getAll({
        search: debounced.trim() || undefined,
        from: showPast ? undefined : fromIso,
        limit: 50,
      }),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#65558F]/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar eventos por nombre…"
            className="w-full border border-[#65558F]/40 rounded-full pl-9 pr-4 py-2.5 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F]"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
          <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} className="accent-[#65558F]" />
          Incluir eventos pasados
        </label>
      </div>
      <EventList
        loading={isLoading}
        events={data}
        empty={debounced ? `No encontramos eventos para “${debounced}”.` : 'No hay eventos próximos por ahora.'}
      />
    </div>
  )
}

// ── CU11 / CU12: mis eventos ─────────────────────────────────────────────────

function MineTab() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['events', 'mine'],
    queryFn: () => eventsApi.getMine({ include_cancelled: 'true', limit: 50 }),
  })
  return <EventList loading={isLoading} events={data} empty="Todavía no organizaste eventos." />
}

// ── CU60: guardados ───────────────────────────────────────────────────────────

function SavedTab() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['events', 'saved'],
    queryFn: () => eventsApi.getSaved({ limit: 50 }),
  })
  return (
    <EventList
      loading={isLoading}
      events={data.map((s) => s.event)}
      empty="No guardaste eventos. Usá “Guardar” en un evento para tenerlo a mano."
    />
  )
}

// ── Invitaciones recibidas ────────────────────────────────────────────────────

function InvitesTab() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const { data = [], isLoading } = useQuery({
    queryKey: ['events', 'invites'],
    queryFn: eventsApi.getReceivedInvites,
  })

  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      accept ? eventsApi.acceptInvite(id) : eventsApi.rejectInvite(id),
    onSuccess: () => { setError(null); queryClient.invalidateQueries({ queryKey: ['events'] }) },
    onError: (e) => setError(apiErrorMessage(e)),
  })

  if (isLoading) return <Loading />
  if (data.length === 0) return <Empty text="No tenés invitaciones pendientes." />

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
      {data.map((inv) => {
        const from = inv.users_event_invites_from_user_idTousers
        const busy = respond.isPending && respond.variables?.id === inv.invite_id
        return (
          <EventCard
            key={inv.invite_id}
            event={inv.events}
            footer={
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-xs text-gray-500">
                  Te invitó <span className="font-semibold text-gray-700">{from?.display_name ?? from?.username}</span>
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => respond.mutate({ id: inv.invite_id, accept: true })}
                    disabled={busy}
                    className="rounded-full px-4 py-1.5 text-xs font-semibold text-white flex items-center gap-1 disabled:opacity-60"
                    style={{ backgroundColor: '#65558F' }}
                  >
                    <Check size={13} /> Asistiré
                  </button>
                  <button
                    onClick={() => respond.mutate({ id: inv.invite_id, accept: false })}
                    disabled={busy}
                    className="rounded-full px-4 py-1.5 text-xs font-semibold border border-gray-200 text-gray-500 flex items-center gap-1 disabled:opacity-60"
                  >
                    <X size={13} /> No puedo
                  </button>
                </div>
              </div>
            }
          />
        )
      })}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function EventList({ loading, events, empty }: { loading: boolean; events: BandEvent[]; empty: string }) {
  if (loading) return <Loading />
  if (events.length === 0) return <Empty text={empty} />
  return (
    <div className="flex flex-col gap-3">
      {events.map((e) => <EventCard key={e.event_id} event={e} />)}
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-10">
      <Loader2 size={16} className="animate-spin" /> Cargando eventos…
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-gray-300">
      <CalendarDays size={44} strokeWidth={1} />
      <p className="text-sm text-gray-400 text-center">{text}</p>
    </div>
  )
}
