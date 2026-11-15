'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { AppNavbar } from '@/components/AppNavbar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Search,
  X,
  Music2,
  Building2,
  CalendarDays,
  Users,
  MapPin,
  Star,
  ChevronRight,
  Clock,
  Guitar,
  Map as MapIcon,
} from 'lucide-react'
import { discoveryApi } from '@/lib/api/discovery'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Category = 'all' | 'musicians' | 'studios' | 'events'

// ── Utils ─────────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function initials(name?: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Normaliza respuesta: acepta array directo, { data: [] } o { items: [] } (paginado) */
function toArray(res: any): any[] {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.items)) return res.items
  if (Array.isArray(res.data)) return res.data
  return []
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  onSeeAll,
}: {
  icon: React.ElementType
  title: string
  onSeeAll?: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon size={18} style={{ color: '#65558F' }} />
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
      </div>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          className="flex items-center gap-0.5 text-xs font-semibold hover:underline"
          style={{ color: '#65558F' }}
        >
          Ver todos <ChevronRight size={13} />
        </button>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-gray-300">
      <Icon size={40} strokeWidth={1} />
      <p className="text-sm text-gray-400 text-center">{text}</p>
    </div>
  )
}

// ── Musician card ─────────────────────────────────────────────────────────────

function MusicianCard({ musician, onClick }: { musician: any; onClick: () => void }) {
  // El endpoint /discovery/musicians anida bajo `.users`; /musicians/discover devuelve plano
  const name =
    musician.display_name ||
    musician.users?.display_name ||
    musician.username ||
    musician.users?.username ||
    '—'
  const instruments: any[] =
    musician.musician_instrument ?? musician.users?.musician_instrument ?? []
  const genres: any[] =
    musician.musician_genre ?? musician.users?.musician_genre ?? []
  const sharedGenres: number | undefined = musician.shared_genres
  // ID para navegación: puede venir en raíz (búsqueda) o bajo users (discovery)
  const userId = musician.user_id ?? musician.users?.user_id

  return (
    <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-[#65558F]/30 hover:bg-purple-50/30 transition-all">
      <Avatar className="w-12 h-12 ring-2 ring-[#65558F]/20 shrink-0">
        <AvatarFallback className="text-white font-semibold text-sm" style={{ backgroundColor: '#65558F' }}>
          {initials(name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900 truncate">{name}</p>
          {!!sharedGenres && sharedGenres > 0 && (
            <span
              className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#65558F1A', color: '#65558F' }}
            >
              {sharedGenres} gén. en común
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {instruments
            .slice(0, 2)
            .map((i: any) => i.instrument?.name)
            .filter(Boolean)
            .join(' · ') || 'Sin instrumento registrado'}
        </p>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {genres.slice(0, 3).map((g: any) => (
            <Badge key={g.genres?.genre_id} variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full">
              {g.genres?.name}
            </Badge>
          ))}
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={onClick}
        className="shrink-0 border-[#65558F]/30 hover:bg-[#65558F]/10 text-[#65558F] font-semibold"
      >
        Ver perfil
      </Button>
    </div>
  )
}

// ── Event card ────────────────────────────────────────────────────────────────

function EventCard({ event, onClick }: { event: any; onClick: () => void }) {
  const title = event.title || 'Evento sin título'
  const organizer =
    event.users?.display_name || event.users?.username || event.bands?.name || '—'
  const date = event.starts_at ? formatDate(event.starts_at) : null

  return (
    <div
      onClick={onClick}
      className="p-4 border border-gray-100 rounded-xl hover:border-[#65558F]/30 hover:bg-purple-50/30 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            Organizado por {organizer}
          </p>
        </div>
        {date && (
          <div className="shrink-0 flex items-center gap-1 text-xs font-medium" style={{ color: '#65558F' }}>
            <Clock size={11} />
            {date}
          </div>
        )}
      </div>
      {event.description && (
        <p className="text-xs text-gray-400 mt-2 line-clamp-2">{event.description}</p>
      )}
    </div>
  )
}

// ── Studio card ───────────────────────────────────────────────────────────────

function StudioCard({
  studio,
  onClick,
  onBook,
}: {
  studio: any
  onClick: () => void
  onBook: () => void
}) {
  const name = studio.name || 'Sala sin nombre'
  const rating = studio.avg_rating ? Number(studio.avg_rating).toFixed(1) : null
  const city = studio.places?.city || studio.place?.city || null

  return (
    <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-[#65558F]/30 hover:bg-purple-50/30 transition-all">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: '#65558F1A' }}
      >
        <Building2 size={22} style={{ color: '#65558F' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{name}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {rating && (
            <div className="flex items-center gap-1">
              <Star size={12} className="fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium text-gray-600">{rating}</span>
            </div>
          )}
          {city && (
            <p className="text-xs text-gray-400 flex items-center gap-0.5 truncate">
              <MapPin size={10} />
              {city}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={onClick}
          className="border-[#65558F]/30 hover:bg-[#65558F]/10 text-[#65558F] font-semibold"
        >
          Ver perfil
        </Button>
        <Button
          size="sm"
          onClick={onBook}
          className="text-white font-semibold"
          style={{ backgroundColor: '#65558F' }}
        >
          Reservar
        </Button>
      </div>
    </div>
  )
}

// ── Band card ─────────────────────────────────────────────────────────────────

function BandCard({ band, onClick }: { band: any; onClick: () => void }) {
  const name = band.name || 'Banda sin nombre'
  const genres: any[] = band.band_genres ?? []
  const openings: any[] = band.band_openings ?? []

  return (
    <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-[#65558F]/30 hover:bg-purple-50/30 transition-all">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: '#65558F1A' }}
      >
        <Music2 size={22} style={{ color: '#65558F' }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{name}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {genres.slice(0, 3).map((g: any) => (
            <Badge key={g.genres?.genre_id} variant="secondary" className="text-[10px] px-1.5 py-0 rounded-full">
              {g.genres?.name}
            </Badge>
          ))}
        </div>
        {openings.length > 0 && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Guitar size={10} />
            Busca:{' '}
            {openings
              .slice(0, 2)
              .map((o: any) => o.instrument?.name)
              .filter(Boolean)
              .join(', ')}
          </p>
        )}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={onClick}
        className="shrink-0 border-[#65558F]/30 hover:bg-[#65558F]/10 text-[#65558F] font-semibold"
      >
        Ver banda
      </Button>
    </div>
  )
}

// ── Search results ────────────────────────────────────────────────────────────

function SearchResults({ query, category }: { query: string; category: Category }) {
  const router = useRouter()

  const showMusicians = category === 'all' || category === 'musicians'
  const showStudios   = category === 'all' || category === 'studios'
  const showEvents    = category === 'all' || category === 'events'

  const { data: rawMusicians, isLoading: loadingM } = useQuery({
    queryKey: ['search', 'musicians', query],
    queryFn: () => discoveryApi.searchMusicians(query),
    enabled: query.length >= 2 && showMusicians,
    staleTime: 30_000,
  })

  const { data: rawStudios, isLoading: loadingS } = useQuery({
    queryKey: ['search', 'studios', query],
    queryFn: () => discoveryApi.searchStudios(query),
    enabled: query.length >= 2 && showStudios,
    staleTime: 30_000,
  })

  const { data: rawEvents, isLoading: loadingE } = useQuery({
    queryKey: ['search', 'events', query],
    queryFn: () => discoveryApi.searchEvents(query),
    enabled: query.length >= 2 && showEvents,
    staleTime: 30_000,
  })

  const isLoading =
    (showMusicians && loadingM) ||
    (showStudios && loadingS) ||
    (showEvents && loadingE)

  const musicians = showMusicians ? toArray(rawMusicians) : []
  const studios   = showStudios   ? toArray(rawStudios)   : []
  const events    = showEvents    ? toArray(rawEvents)     : []
  const hasResults = musicians.length > 0 || studios.length > 0 || events.length > 0

  if (isLoading) return <Skeleton rows={5} />

  if (!hasResults) {
    return <EmptyState icon={Search} text={`Sin resultados para "${query}"`} />
  }

  return (
    <div className="flex flex-col gap-7">
      {musicians.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Music2 size={14} style={{ color: '#65558F' }} />
            <span className="text-sm font-semibold text-gray-700">Músicos</span>
            <span className="text-xs text-gray-400">({musicians.length})</span>
          </div>
          <div className="flex flex-col gap-2">
            {musicians.slice(0, 5).map((m: any) => (
              <MusicianCard
                key={m.musician_id ?? m.user_id ?? m.users?.user_id}
                musician={m}
                onClick={() => router.push(`/perfil/${m.user_id ?? m.users?.user_id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {studios.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={14} style={{ color: '#65558F' }} />
            <span className="text-sm font-semibold text-gray-700">Salas de ensayo</span>
            <span className="text-xs text-gray-400">({studios.length})</span>
          </div>
          <div className="flex flex-col gap-2">
            {studios.slice(0, 5).map((s: any) => (
              <StudioCard
                key={s.studio_id}
                studio={s}
                onClick={() => router.push(`/estudio/${s.studio_id}`)}
                onBook={() => router.push(`/estudio/${s.studio_id}?reservar=1`)}
              />
            ))}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={14} style={{ color: '#65558F' }} />
            <span className="text-sm font-semibold text-gray-700">Eventos</span>
            <span className="text-xs text-gray-400">({events.length})</span>
          </div>
          <div className="flex flex-col gap-2">
            {events.slice(0, 5).map((e: any) => (
              <EventCard
                key={e.event_id}
                event={e}
                onClick={() => router.push(`/eventos/${e.event_id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Discovery sections ────────────────────────────────────────────────────────

function DiscoverySections({ category }: { category: Category }) {
  const router = useRouter()

  const showEvents    = category === 'all' || category === 'events'
  const showBands     = category === 'all' || category === 'musicians' // bandas bajo músicos
  const showMusicians = category === 'all' || category === 'musicians'

  const { data: rawEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ['discovery', 'events'],
    queryFn: discoveryApi.getSuggestedEvents,
    enabled: showEvents,
    staleTime: 5 * 60_000,
  })

  const { data: rawBands, isLoading: loadingBands } = useQuery({
    queryKey: ['discovery', 'bands'],
    queryFn: discoveryApi.getSuggestedBands,
    enabled: showBands,
    staleTime: 5 * 60_000,
  })

  const { data: rawMusicians, isLoading: loadingMusicians } = useQuery({
    queryKey: ['discovery', 'musicians'],
    queryFn: discoveryApi.getSuggestedMusicians,
    enabled: showMusicians,
    staleTime: 5 * 60_000,
  })

  const events    = toArray(rawEvents)
  const bands     = toArray(rawBands)
  const musicians = toArray(rawMusicians)

  return (
    <div className="flex flex-col gap-6">

      {/* ── Eventos sugeridos ─────────────────────────────────────────────── */}
      {showEvents && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <SectionHeader
            icon={CalendarDays}
            title="Eventos cerca tuyo"
            onSeeAll={() => router.push('/eventos')}
          />
          {loadingEvents ? (
            <Skeleton rows={3} />
          ) : events.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              text="No hay eventos sugeridos. Completá tu perfil con géneros para ver recomendaciones."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {events.slice(0, 4).map((e: any) => (
                <EventCard
                  key={e.event_id}
                  event={e}
                  onClick={() => router.push(`/eventos/${e.event_id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Salas (solo en categoría Salas — no hay discovery endpoint, se muestra aviso) */}
      {category === 'studios' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <SectionHeader icon={Building2} title="Salas de ensayo" />
          <EmptyState
            icon={Building2}
            text="Buscá una sala por nombre para ver resultados."
          />
        </div>
      )}

      {/* ── Bandas buscando integrantes ──────────────────────────────────── */}
      {showBands && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <SectionHeader icon={Users} title="Bandas buscando integrantes" />
          {loadingBands ? (
            <Skeleton rows={3} />
          ) : bands.length === 0 ? (
            <EmptyState
              icon={Users}
              text="No hay bandas buscando integrantes en este momento."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {bands.slice(0, 5).map((b: any) => (
                <BandCard
                  key={b.band_id}
                  band={b}
                  onClick={() => router.push(`/bandas/${b.band_id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Músicos sugeridos ─────────────────────────────────────────────── */}
      {showMusicians && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <SectionHeader icon={Music2} title="Músicos que podrían conectar con vos" />
          {loadingMusicians ? (
            <Skeleton rows={4} />
          ) : musicians.length === 0 ? (
            <EmptyState
              icon={Music2}
              text="Completá tu perfil con géneros musicales para ver músicos compatibles."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {musicians.slice(0, 6).map((m: any) => (
                <MusicianCard
                  key={m.musician_id ?? m.user_id ?? m.users?.user_id}
                  musician={m}
                  onClick={() => router.push(`/perfil/${m.user_id ?? m.users?.user_id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}

// ── Category chips ────────────────────────────────────────────────────────────

const CATEGORIES: { key: Category; label: string; icon: React.ElementType }[] = [
  { key: 'all',       label: 'Todo',    icon: Search      },
  { key: 'musicians', label: 'Músicos', icon: Music2      },
  { key: 'studios',   label: 'Salas',   icon: Building2   },
  { key: 'events',    label: 'Eventos', icon: CalendarDays },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DescubrirPage() {
  const [query, setQuery]       = useState('')
  const [category, setCategory] = useState<Category>('all')
  const debouncedQuery          = useDebounce(query, 400)
  const isSearching             = debouncedQuery.trim().length >= 2

  return (
    <div className="min-h-screen bg-gray-100">
      <AppNavbar />

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Barra de búsqueda + chips ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Descubrir
            </p>
            <Link
              href="/mapa"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#65558F] hover:underline"
            >
              <MapIcon size={13} /> Ver cerca mío en el mapa
            </Link>
          </div>

          {/* Input */}
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                category === 'musicians' ? 'Buscá músicos por nombre...' :
                category === 'studios'   ? 'Buscá salas de ensayo por nombre...' :
                category === 'events'    ? 'Buscá eventos por nombre...' :
                'Buscá músicos, salas de ensayo o eventos...'
              }
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#65558F]/40 focus:border-[#65558F]/60 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Chips de categoría — ahora interactivos */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {CATEGORIES.map(({ key, label, icon: Icon }) => {
              const active = category === key
              return (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    active
                      ? 'border-[#65558F] text-white'
                      : 'border-gray-200 text-gray-500 hover:border-[#65558F]/40 hover:text-[#65558F]'
                  }`}
                  style={active ? { backgroundColor: '#65558F' } : {}}
                >
                  <Icon size={12} />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Contenido ─────────────────────────────────────────────────── */}
        {isSearching ? (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <p className="text-sm text-gray-500 mb-5">
              Resultados para{' '}
              <span className="font-semibold text-gray-800">"{debouncedQuery}"</span>
              {category !== 'all' && (
                <span className="ml-1 text-xs font-medium" style={{ color: '#65558F' }}>
                  · {CATEGORIES.find((c) => c.key === category)?.label}
                </span>
              )}
            </p>
            <SearchResults query={debouncedQuery.trim()} category={category} />
          </div>
        ) : (
          <DiscoverySections category={category} />
        )}

      </main>
    </div>
  )
}
