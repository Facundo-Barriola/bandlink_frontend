'use client'

import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { AppNavbar } from '@/components/AppNavbar'
import { bandsApi } from '@/lib/api/bands'
import type { Band, BandInvite } from '@/lib/api/bands'
import {
  Music2,
  Plus,
  Users,
  ChevronRight,
  Bell,
  Check,
  X,
  Loader2,
} from 'lucide-react'

// ── Invite card ───────────────────────────────────────────────────────────────

function InviteCard({ invite, onAccept, onReject }: {
  invite: BandInvite
  onAccept: (id: string) => void
  onReject: (id: string) => void
}) {
  const fromUser = invite.users_band_invite_from_user_idTousers
  return (
    <div className="flex items-center justify-between gap-3 bg-white border border-[#65558F]/20 rounded-2xl px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#65558F1A' }}>
          <Music2 size={16} style={{ color: '#65558F' }} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {invite.bands?.name ?? 'Banda'}
          </p>
          <p className="text-xs text-gray-400">
            Invitación de{' '}
            <span className="font-medium text-gray-600">
              {fromUser?.display_name ?? fromUser?.username ?? 'alguien'}
            </span>
          </p>
          {invite.message && (
            <p className="text-xs text-gray-400 mt-0.5 italic truncate">"{invite.message}"</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => onAccept(invite.invite_id)}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
          title="Aceptar"
        >
          <Check size={15} />
        </button>
        <button
          onClick={() => onReject(invite.invite_id)}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
          title="Rechazar"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}

// ── Band card ─────────────────────────────────────────────────────────────────

function BandCard({ band, isOwner }: { band: Band; isOwner: boolean }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(`/bandas/${band.band_id}`)}
      className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 text-left hover:shadow-md transition-shadow w-full group"
    >
      <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#65558F1A' }}>
        <Music2 size={22} style={{ color: '#65558F' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-gray-900 text-base truncate">{band.name}</p>
          {isOwner && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#65558F1A', color: '#65558F' }}
            >
              Owner
            </span>
          )}
        </div>
        {band.description && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{band.description}</p>
        )}
        {band.places && band.places.length > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            📍 {band.places[0].city}, {band.places[0].country}
          </p>
        )}
      </div>
      <ChevronRight size={18} className="text-gray-300 group-hover:text-[#65558F] transition-colors shrink-0" />
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BandasPage() {
  const router = useRouter()
  const { user } = useAuth()
  const qc = useQueryClient()

  const isMusician = user?.role === 'MUSICIAN'

  const { data: bands = [], isLoading: loadingBands } = useQuery({
    queryKey: ['bands', 'mine'],
    queryFn: bandsApi.getMine,
    enabled: !!user,
  })

  const { data: invites = [], isLoading: loadingInvites } = useQuery({
    queryKey: ['bands', 'invites', 'received'],
    queryFn: bandsApi.getReceivedInvites,
    enabled: isMusician,
  })

  const acceptMutation = useMutation({
    mutationFn: bandsApi.acceptInvite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bands'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: bandsApi.rejectInvite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bands', 'invites', 'received'] })
    },
  })

  // El backend devuelve status en español
  const pendingInvites = invites.filter(i => i.status === 'Pendiente')

  const isLoading = loadingBands || loadingInvites

  return (
    <div className="min-h-screen bg-gray-100">
      <AppNavbar />

      <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mis Bandas</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Bandas en las que participás o administrás
            </p>
          </div>
          {isMusician && (
            <button
              onClick={() => router.push('/bandas/crear')}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#65558F' }}
            >
              <Plus size={16} />
              Crear banda
            </button>
          )}
        </div>

        {/* Invitaciones pendientes */}
        {isMusician && pendingInvites.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Bell size={16} style={{ color: '#65558F' }} />
              <h2 className="text-sm font-bold text-gray-700">
                Invitaciones pendientes ({pendingInvites.length})
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {pendingInvites.map(inv => (
                <InviteCard
                  key={inv.invite_id}
                  invite={inv}
                  onAccept={id => acceptMutation.mutate(id)}
                  onReject={id => rejectMutation.mutate(id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Listado de bandas */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin" style={{ color: '#65558F' }} />
          </div>
        ) : bands.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#65558F1A' }}>
              <Music2 size={30} style={{ color: '#65558F' }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-700">Todavía no tenés bandas</p>
              {isMusician ? (
                <p className="text-sm text-gray-400 mt-1">
                  Creá tu primera banda o esperá una invitación de un amigo.
                </p>
              ) : (
                <p className="text-sm text-gray-400 mt-1">
                  Solo los músicos pueden crear y unirse a bandas.
                </p>
              )}
            </div>
            {isMusician && (
              <button
                onClick={() => router.push('/bandas/crear')}
                className="mt-2 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: '#65558F' }}
              >
                <Plus size={15} />
                Crear primera banda
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {bands.map(band => (
              <BandCard
                key={band.band_id}
                band={band}
                isOwner={band.owner_user_id === user?.userId}
              />
            ))}
          </div>
        )}

      </main>
    </div>
  )
}
