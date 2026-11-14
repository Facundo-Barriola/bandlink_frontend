'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { bandsApi } from '@/lib/api/bands'
import { studioApi } from '@/lib/api/studio'
import { bookingsApi, type Booking } from '@/lib/api/bookings'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  Music2,
  Building2,
  Users,
  Star,
  CalendarDays,
  Plus,
  Map,
  Clock,
  ChevronRight,
  History,
  Mic2,
  BarChart3,
} from 'lucide-react'
import { AppNavbar } from '@/components/AppNavbar'
import { useMemo } from 'react'

// ── Shared UI ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | number
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 flex-1 min-w-0">
      <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#65558F1A' }}>
        <Icon size={20} style={{ color: '#65558F' }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children, action }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={18} style={{ color: '#65558F' }} />
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function BookingRow({ booking }: { booking: Booking }) {
  const start = new Date(booking.starts_at)
  const end = new Date(booking.ends_at)

  const dateStr = start.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const timeFrom = start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  const timeTo = end.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })

  const statusLabel: Record<string, string> = {
    confirmed: 'Confirmada',
    pending: 'Pendiente',
    pending_payment: 'Pago pendiente',
    hold: 'Reservada',
    cancelled: 'Cancelada',
  }
  const statusColor: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    pending_payment: 'bg-orange-100 text-orange-700',
    hold: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3 gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800 truncate">{booking.rehearsal_rooms.name}</p>
        <p className="text-xs text-gray-400 truncate">{booking.users.display_name || booking.users.username}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-medium text-gray-700">{dateStr}</p>
        <p className="text-xs text-gray-400">{timeFrom} – {timeTo}</p>
      </div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColor[booking.status] ?? 'bg-gray-100 text-gray-600'}`}>
        {statusLabel[booking.status] ?? booking.status}
      </span>
    </div>
  )
}

// ── Studio Dashboard ──────────────────────────────────────────────────────────

function StudioDashboard() {
  // 1. Get the studios owned by this user
  const { data: studios = [], isLoading: loadingStudios } = useQuery({
    queryKey: ['studios', 'mine'],
    queryFn: studioApi.getMyStudios,
  })

  const studioId: string | undefined = studios[0]?.studio_id

  // 2. Active (upcoming) bookings
  const { data: activeRes, isLoading: loadingActive } = useQuery({
    queryKey: ['bookings', 'studio', studioId, 'active'],
    queryFn: () => bookingsApi.getStudioActiveBookings(studioId!),
    enabled: !!studioId,
  })

  // 3. Full history (used for KPIs and history section)
  const { data: historyRes, isLoading: loadingHistory } = useQuery({
    queryKey: ['bookings', 'studio', studioId, 'history'],
    queryFn: () => bookingsApi.getStudioBookingHistory(studioId!),
    enabled: !!studioId,
  })

  const activeBookings = activeRes?.items ?? []
  const allHistory = historyRes?.items ?? []

  // 4. Compute KPIs for the last 30 days
  const kpis = useMemo(() => {
    const now = new Date()
    const monthAgo = new Date(now)
    monthAgo.setDate(monthAgo.getDate() - 30)

    const monthBookings = allHistory.filter((b) => {
      const d = new Date(b.starts_at)
      return d >= monthAgo && d <= now && b.status !== 'cancelled'
    })

    // Most rented room
    const roomCount: Record<string, { name: string; count: number }> = {}
    for (const b of monthBookings) {
      const rid = b.rehearsal_rooms.room_id
      if (!roomCount[rid]) roomCount[rid] = { name: b.rehearsal_rooms.name, count: 0 }
      roomCount[rid].count++
    }
    const topRoom = Object.values(roomCount).sort((a, b) => b.count - a.count)[0]

    // Total hours
    let totalMs = 0
    for (const b of monthBookings) {
      totalMs += new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()
    }
    const totalHours = Math.round(totalMs / 3_600_000)

    return {
      topRoomName: topRoom?.name ?? '—',
      totalHours,
      totalBookings: monthBookings.length,
    }
  }, [allHistory])

  const isLoading = loadingStudios || (!!studioId && (loadingActive || loadingHistory))

  if (loadingStudios) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#65558F] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!studioId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Building2 size={48} strokeWidth={1} className="text-gray-300" />
        <p className="text-gray-500 font-semibold">Todavía no configuraste tu sala</p>
        <p className="text-sm text-gray-400">Creá tu sala de ensayo para empezar a recibir reservas.</p>
        <Link href="/setup/estudio">
          <Button className="mt-2" style={{ backgroundColor: '#65558F' }}>Configurar sala</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* KPIs — último mes */}
      <div className="flex flex-col sm:flex-row gap-4">
        <KpiCard icon={Mic2} label="Sala más alquilada (mes)" value={kpis.topRoomName} />
        <KpiCard icon={Clock} label="Horas alquiladas (mes)" value={isLoading ? '…' : `${kpis.totalHours} h`} />
        <KpiCard icon={BarChart3} label="Reservas del mes" value={isLoading ? '…' : kpis.totalBookings} />
      </div>

      {/* Próximas reservas */}
      <Section title="Próximas reservas" icon={CalendarDays}>
        {loadingActive ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#65558F] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Clock size={40} strokeWidth={1} className="text-gray-300" />
            <p className="text-sm text-gray-400">Sin reservas próximas</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activeBookings.slice(0, 5).map((b) => (
              <BookingRow key={b.booking_id} booking={b} />
            ))}
            {activeBookings.length > 5 && (
              <p className="text-xs text-center font-semibold mt-1" style={{ color: '#65558F' }}>
                +{activeBookings.length - 5} más
              </p>
            )}
          </div>
        )}
      </Section>

      {/* Historial de reservas */}
      <Section title="Historial de reservas" icon={History}>
        {loadingHistory ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#65558F] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <History size={40} strokeWidth={1} className="text-gray-300" />
            <p className="text-sm text-gray-400">Sin reservas registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left pb-2 font-medium">Sala</th>
                  <th className="text-left pb-2 font-medium">Cliente</th>
                  <th className="text-left pb-2 font-medium">Fecha</th>
                  <th className="text-left pb-2 font-medium">Horario</th>
                  <th className="text-left pb-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allHistory.slice(0, 15).map((b) => {
                  const start = new Date(b.starts_at)
                  const end = new Date(b.ends_at)
                  const dateStr = start.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
                  const timeFrom = start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
                  const timeTo = end.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
                  const statusLabel: Record<string, string> = {
                    confirmed: 'Confirmada', pending: 'Pendiente',
                    pending_payment: 'Pago pend.', hold: 'Reservada', cancelled: 'Cancelada',
                  }
                  const statusColor: Record<string, string> = {
                    confirmed: 'text-green-600', pending: 'text-yellow-600',
                    pending_payment: 'text-orange-600', hold: 'text-blue-600', cancelled: 'text-red-500',
                  }
                  return (
                    <tr key={b.booking_id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-gray-800 truncate max-w-[120px]">{b.rehearsal_rooms.name}</td>
                      <td className="py-2.5 pr-4 text-gray-500 truncate max-w-[120px]">{b.users.display_name || b.users.username}</td>
                      <td className="py-2.5 pr-4 text-gray-600 whitespace-nowrap">{dateStr}</td>
                      <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">{timeFrom} – {timeTo}</td>
                      <td className={`py-2.5 font-semibold whitespace-nowrap ${statusColor[b.status] ?? 'text-gray-500'}`}>
                        {statusLabel[b.status] ?? b.status}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {allHistory.length > 15 && (
              <p className="text-xs text-center font-semibold mt-3" style={{ color: '#65558F' }}>
                +{allHistory.length - 15} más en el historial
              </p>
            )}
          </div>
        )}
      </Section>

    </div>
  )
}

// ── Musician Dashboard ────────────────────────────────────────────────────────

function MusicianDashboard() {
  const router = useRouter()

  const { data: bands = [], isLoading: loadingBands } = useQuery({
    queryKey: ['bands', 'mine'],
    queryFn: bandsApi.getMine,
  })

  const upcomingBookings: {
    id: string
    roomName: string
    studioName: string
    date: string
    timeFrom: string
    timeTo: string
  }[] = []

  return (
    <div className="flex flex-col gap-6">

      {/* KPIs */}
      <div className="flex flex-col sm:flex-row gap-4">
        <KpiCard icon={Users} label="Conexiones" value={0} />
        <KpiCard icon={Star} label="Puntaje promedio" value="—" />
        <KpiCard icon={Music2} label="Bandas activas" value={bands.length} />
      </div>

      {/* Próximas reservas */}
      <Section title="Próximas reservas" icon={CalendarDays}>
        {upcomingBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-300">
            <Clock size={48} strokeWidth={1} />
            <p className="text-sm text-gray-400">Sin reservas activas</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingBookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">{b.roomName}</p>
                  <p className="text-xs text-gray-400">{b.studioName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">{b.date}</p>
                  <p className="text-xs text-gray-400">{b.timeFrom} – {b.timeTo}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Bandas */}
      <Section
        title="Mis bandas"
        icon={Music2}
        action={
          <button
            onClick={() => router.push('/bandas/crear')}
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold border-2 transition-colors hover:bg-[#65558F]/10"
            style={{ borderColor: '#65558F', color: '#65558F' }}
          >
            <Plus size={14} />
            Crear banda
          </button>
        }
      >
        {loadingBands ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-[#65558F] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bands.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            Todavía no formás parte de ninguna banda.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {bands.map((band) => (
              <button
                key={band.band_id}
                onClick={() => router.push(`/bandas/${band.band_id}`)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left w-full group"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#65558F1A' }}>
                  <Music2 size={16} style={{ color: '#65558F' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{band.name}</p>
                  {band.description && (
                    <p className="text-xs text-gray-400 truncate">{band.description}</p>
                  )}
                </div>
                <ChevronRight size={15} className="text-gray-300 group-hover:text-[#65558F] transition-colors shrink-0" />
              </button>
            ))}
            <button
              onClick={() => router.push('/bandas')}
              className="mt-1 text-xs text-center font-semibold"
              style={{ color: '#65558F' }}
            >
              Ver todas →
            </button>
          </div>
        )}
      </Section>

      <MapBanner />
    </div>
  )
}

// ── Standard / no-role dashboard ──────────────────────────────────────────────

function StandardDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <MapBanner />
    </div>
  )
}

function MapBanner() {
  const router = useRouter()
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-sm cursor-pointer relative group"
      onClick={() => router.push('/mapa')}
      style={{ minHeight: 160, backgroundColor: '#65558F' }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
        <Map size={36} strokeWidth={1.5} />
        <div className="text-center">
          <p className="font-bold text-base">Explorar el mapa</p>
          <p className="text-sm text-white/70">Encontrá músicos y salas cerca tuyo</p>
        </div>
        <span className="mt-1 px-5 py-2 rounded-full bg-white text-[#65558F] text-sm font-semibold group-hover:bg-gray-100 transition-colors">
          Ir al mapa
        </span>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth()

  const isMusician = user?.role === 'MUSICIAN'
  const isStudio = user?.role === 'STUDIO_OWNER'
  const hasRole = isMusician || isStudio

  return (
    <div className="min-h-screen bg-gray-100">
      <AppNavbar />

      {/* Banner de rol para usuarios sin rol */}
      {user && !hasRole && (
        <div className="max-w-5xl mx-auto px-4 mt-4">
          <div
            className="rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
            style={{ backgroundColor: '#65558F' }}
          >
            <div className="text-white">
              <p className="font-semibold text-base">¿Qué sos en BandLink?</p>
              <p className="text-sm text-white/70">
                Completá tu perfil eligiendo tu rol para acceder a todas las funciones.
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <Link href="/setup/musico">
                <Button variant="secondary" className="gap-2 bg-white text-[#65558F] hover:bg-gray-100 font-semibold">
                  <Music2 size={16} />
                  Soy músico
                </Button>
              </Link>
              <Link href="/setup/estudio">
                <Button variant="secondary" className="gap-2 bg-white text-[#65558F] hover:bg-gray-100 font-semibold">
                  <Building2 size={16} />
                  Soy sala de ensayo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6">
        {isMusician && <MusicianDashboard />}
        {isStudio   && <StudioDashboard />}
        {!hasRole   && <StandardDashboard />}
      </main>
    </div>
  )
}
