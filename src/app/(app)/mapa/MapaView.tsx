'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Map as MapIcon, LocateFixed, Loader2, Search, Users, Building2, CalendarDays, Radio } from 'lucide-react'
import { AppNavbar } from '@/components/AppNavbar'
import NearbyMap, { TYPE_COLOR, type MapItem, type MapItemType } from '@/components/map/NearbyMap'
import { geoApi } from '@/lib/api/geo'
import { useAuthStore } from '@/store/auth.store'
import { apiErrorMessage } from '@/lib/booking-format'

const DEFAULT_CENTER = { lat: -34.6037, lng: -58.3816 } // Obelisco, CABA
const RADIUS_OPTIONS = [1, 2, 5, 10, 20, 30]
const SHARE_KEY = 'bandlink:sharing-location'
const GEO_SUPPORTED = typeof navigator !== 'undefined' && 'geolocation' in navigator

type Filter = 'all' | MapItemType

const FILTERS: { id: Filter; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'Todo', icon: MapIcon },
  { id: 'musician', label: 'Músicos', icon: Users },
  { id: 'studio', label: 'Salas', icon: Building2 },
  { id: 'event', label: 'Eventos de hoy', icon: CalendarDays },
]

function initialFilter(): Filter {
  const t = new URLSearchParams(window.location.search).get('tipo')
  return t === 'musician' || t === 'studio' || t === 'event' ? t : 'all'
}

function readSharing() {
  try { return localStorage.getItem(SHARE_KEY) === '1' } catch { return false }
}

function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1).replace('.', ',')} km`
}

type ListItem = MapItem & { distance_m: number }

/** Evento "de hoy": empieza hoy (hora local) o está en curso ahora. */
function isToday(startsAt: string | null, endsAt: string | null) {
  if (!startsAt) return false
  const start = new Date(startsAt)
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000)
  const startsToday = start >= dayStart && start < dayEnd
  const ongoing = start <= now && !!endsAt && new Date(endsAt) > now
  return startsToday || ongoing
}

export default function MapaView() {
  const user = useAuthStore((s) => s.user)
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [pendingCenter, setPendingCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [radiusKm, setRadiusKm] = useState(5)
  const [filter, setFilter] = useState<Filter>(initialFilter)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [locating, setLocating] = useState(GEO_SUPPORTED)
  const [geoMsg, setGeoMsg] = useState<string | null>(
    GEO_SUPPORTED ? null : 'Tu navegador no soporta geolocalización. Mostramos CABA.',
  )
  const [sharing, setSharing] = useState(readSharing)
  const [shareError, setShareError] = useState<string | null>(null)

  // ── CU47: ubicación del usuario ────────────────────────────────────────────
  const requestPosition = useCallback(() => {
    if (!GEO_SUPPORTED) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserPos(p)
        setCenter(p)
        setPendingCenter(null)
        setGeoMsg(null)
        setLocating(false)
      },
      () => {
        setLocating(false)
        setGeoMsg('No pudimos acceder a tu ubicación. Mostramos CABA; podés mover el mapa y buscar en otra zona.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  const locate = () => {
    if (!GEO_SUPPORTED) return
    setLocating(true)
    requestPosition()
  }

  useEffect(() => { requestPosition() }, [requestPosition])

  // Si el usuario comparte su ubicación, la mantenemos actualizada en el backend
  useEffect(() => {
    if (sharing && userPos) geoApi.setMyLocation(userPos.lat, userPos.lng).catch(() => {})
  }, [sharing, userPos])

  const toggleSharing = async () => {
    setShareError(null)
    try {
      if (sharing) {
        await geoApi.removeMyLocation()
        setSharing(false)
        try { localStorage.removeItem(SHARE_KEY) } catch {}
      } else {
        if (!userPos) { setShareError('Primero necesitamos tu ubicación (activala en el navegador).'); return }
        await geoApi.setMyLocation(userPos.lat, userPos.lng)
        setSharing(true)
        try { localStorage.setItem(SHARE_KEY, '1') } catch {}
      }
    } catch (e) {
      setShareError(apiErrorMessage(e))
    }
  }

  // ── CU48/49/50/51: búsqueda por cercanía ───────────────────────────────────
  const { data, isFetching, error } = useQuery({
    queryKey: ['geo', 'nearby', center.lat.toFixed(4), center.lng.toFixed(4), radiusKm],
    queryFn: () => geoApi.nearby({ lat: center.lat, lng: center.lng, radius_km: radiusKm, type: 'all' }),
    enabled: !locating,
    placeholderData: (prev) => prev,
  })

  const allItems: ListItem[] = useMemo(() => {
    if (!data) return []
    const r = data.results
    const items: ListItem[] = [
      ...r.users
        .filter((u) => u.user_id !== user?.userId)
        .map((u) => ({
          id: `u:${u.user_id}`,
          type: 'musician' as const,
          lat: Number(u.lat),
          lng: Number(u.lng),
          title: u.display_name ?? u.username,
          subtitle: `@${u.username}`,
          href: `/perfil/${u.user_id}`,
          distance_m: u.distance_km * 1000,
        })),
      ...r.studios.map((s) => ({
        id: `s:${s.studio_id}`,
        type: 'studio' as const,
        lat: Number(s.lat),
        lng: Number(s.lng),
        title: s.name,
        subtitle: s.city ?? undefined,
        href: `/estudio/${s.studio_id}`,
        distance_m: s.distance_m,
      })),
      ...r.events.filter((e) => isToday(e.starts_at, e.ends_at)).map((e) => ({
        id: `e:${e.event_id}`,
        type: 'event' as const,
        lat: Number(e.lat),
        lng: Number(e.lng),
        title: e.title,
        subtitle: e.starts_at
          ? `Hoy ${new Date(e.starts_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })} hs`
          : undefined,
        href: `/eventos/${e.event_id}`,
        distance_m: e.distance_m,
      })),
    ]
    return items
      .filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lng))
      .sort((a, b) => a.distance_m - b.distance_m)
  }, [data, user?.userId])

  const items = useMemo(() => (filter === 'all' ? allItems : allItems.filter((i) => i.type === filter)), [allItems, filter])

  const counts = useMemo(() => {
    const c = { all: allItems.length, musician: 0, studio: 0, event: 0 }
    allItems.forEach((i) => { c[i.type]++ })
    return c
  }, [allItems])

  const searchHere = () => {
    if (!pendingCenter) return
    setCenter(pendingCenter)
    setPendingCenter(null)
    setSelectedId(null)
  }

  const onUserMove = useCallback((c: { lat: number; lng: number }) => setPendingCenter(c), [])

  const noToken = !process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  return (
    <div className="min-h-screen bg-gray-100">
      <AppNavbar />
      <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-4">
        {/* ── Controles ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map(({ id, label, icon: Icon }) => {
                const active = filter === id
                return (
                  <button
                    key={id}
                    onClick={() => { setFilter(id); setSelectedId(null) }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      active ? 'border-[#65558F] bg-[#65558F] text-white' : 'border-gray-200 text-gray-500 hover:border-[#65558F]/40 hover:text-[#65558F]'
                    }`}
                  >
                    {id !== 'all' && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLOR[id] }} />}
                    <Icon size={12} />
                    {label}
                    <span className={active ? 'opacity-80' : 'text-gray-400'}>({counts[id]})</span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                Radio
                <select
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="border border-[#65558F]/30 rounded-lg px-2 py-1.5 text-sm text-[#65558F] bg-white focus:outline-none focus:ring-2 focus:ring-[#65558F]"
                >
                  {RADIUS_OPTIONS.map((r) => <option key={r} value={r}>{r} km</option>)}
                </select>
              </label>
              <button
                onClick={locate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-[#65558F]/40 text-[#65558F] hover:bg-[#65558F]/10"
              >
                {locating ? <Loader2 size={13} className="animate-spin" /> : <LocateFixed size={13} />}
                Mi ubicación
              </button>
              {user?.role === 'MUSICIAN' && (
                <button
                  onClick={toggleSharing}
                  title="Otros músicos te van a ver en el mapa"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    sharing ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:text-[#65558F]'
                  }`}
                >
                  <Radio size={13} />
                  {sharing ? 'Compartiendo ubicación' : 'Aparecer en el mapa'}
                </button>
              )}
            </div>
          </div>
          {(geoMsg || shareError) && (
            <p className="text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">{shareError ?? geoMsg}</p>
          )}
        </div>

        {noToken ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-sm text-gray-500">
            Falta configurar <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> en el <code>.env.local</code> del frontend.
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_320px] gap-4">
            {/* ── Mapa ──────────────────────────────────────────────────── */}
            <div className="relative bg-white rounded-2xl shadow-sm overflow-hidden h-[60vh] lg:h-[calc(100vh-220px)] min-h-[380px]">
              <NearbyMap
                center={center}
                radiusKm={radiusKm}
                userPos={userPos}
                items={items}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onUserMove={onUserMove}
              />
              {pendingCenter && (
                <button
                  onClick={searchHere}
                  className="absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg flex items-center gap-1.5"
                  style={{ backgroundColor: '#65558F' }}
                >
                  <Search size={14} /> Buscar en esta zona
                </button>
              )}
              {isFetching && (
                <div className="absolute bottom-3 left-3 z-10 bg-white/90 rounded-full px-3 py-1.5 text-xs text-gray-500 flex items-center gap-1.5 shadow">
                  <Loader2 size={12} className="animate-spin" /> Buscando…
                </div>
              )}
            </div>

            {/* ── Lista ─────────────────────────────────────────────────── */}
            <aside className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-2 lg:h-[calc(100vh-220px)] min-h-[200px]">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
                {items.length} {items.length === 1 ? 'resultado' : 'resultados'} a menos de {radiusKm} km
              </p>
              {error && <p className="text-sm text-red-500">{apiErrorMessage(error)}</p>}
              <div className="overflow-y-auto flex flex-col gap-1 -mx-1 px-1">
                {!isFetching && items.length === 0 && (
                  <p className="text-sm text-gray-400 py-8 text-center">
                    No encontramos nada en esta zona. Probá ampliando el radio.
                    {filter === 'event' && (
                      <span className="block text-xs mt-2">
                        Se muestran solo los eventos de hoy. Los próximos los ves en{' '}
                        <Link href="/eventos" className="text-[#65558F] font-semibold hover:underline">Eventos</Link>.
                      </span>
                    )}
                    {filter === 'musician' && (
                      <span className="block text-xs mt-2">Solo aparecen los músicos que eligieron compartir su ubicación.</span>
                    )}
                  </p>
                )}
                {items.map((i) => (
                  <div
                    key={i.id}
                    onClick={() => setSelectedId(i.id)}
                    className={`rounded-xl px-3 py-2.5 cursor-pointer transition-colors flex items-start gap-3 ${
                      selectedId === i.id ? 'bg-[#65558F1A]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: TYPE_COLOR[i.type] }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{i.title}</p>
                      {i.subtitle && <p className="text-xs text-gray-400 truncate capitalize">{i.subtitle}</p>}
                      <Link href={i.href} onClick={(e) => e.stopPropagation()} className="text-xs font-semibold text-[#65558F] hover:underline">
                        Ver detalle
                      </Link>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{formatDistance(i.distance_m)}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
