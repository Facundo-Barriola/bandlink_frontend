'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { AppNavbar } from '@/components/AppNavbar'
import { socialApi } from '@/lib/api/social'
import type { ReceivedRequest, FriendRequest } from '@/types/social'
import { Bell, Send, Check, X, UserX, Loader2, Clock } from 'lucide-react'

const BRAND = '#65558F'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  if (hours < 24) return `hace ${hours}h`
  if (days < 7) return `hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// ── ReceivedItem ──────────────────────────────────────────────────────────────

function ReceivedItem({
  req,
  onAccept,
  onReject,
  loading,
}: {
  req: ReceivedRequest
  onAccept: () => void
  onReject: () => void
  loading: boolean
}) {
  const router = useRouter()
  const name = req.from_user.display_name || req.from_user.username

  return (
    <div className="flex items-center gap-3 p-4">
      <button
        onClick={() => router.push(`/perfil/${req.from_user.user_id}`)}
        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 hover:opacity-80 transition-opacity"
        style={{ backgroundColor: BRAND }}
      >
        {getInitials(name)}
      </button>

      <div className="flex-1 min-w-0">
        <button
          onClick={() => router.push(`/perfil/${req.from_user.user_id}`)}
          className="text-sm font-semibold text-gray-900 hover:underline text-left"
        >
          {name}
        </button>
        <p className="text-xs text-gray-400 mt-0.5">@{req.from_user.username}</p>
        {req.message && (
          <p className="text-xs text-gray-500 mt-1 italic">"{req.message}"</p>
        )}
        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
          <Clock size={10} /> {timeAgo(req.created_at)}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onAccept}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: BRAND }}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Aceptar
        </button>
        <button
          onClick={onReject}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <X size={12} /> Rechazar
        </button>
      </div>
    </div>
  )
}

// ── SentItem ──────────────────────────────────────────────────────────────────

function SentItem({
  req,
  onCancel,
  loading,
}: {
  req: FriendRequest
  onCancel: () => void
  loading: boolean
}) {
  const router = useRouter()
  const name = req.other_display_name || req.other_username

  return (
    <div className="flex items-center gap-3 p-4">
      <button
        onClick={() => router.push(`/perfil/${req.other_user_id}`)}
        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 hover:opacity-80 transition-opacity"
        style={{ backgroundColor: '#9e8bbf' }}
      >
        {getInitials(name)}
      </button>

      <div className="flex-1 min-w-0">
        <button
          onClick={() => router.push(`/perfil/${req.other_user_id}`)}
          className="text-sm font-semibold text-gray-900 hover:underline text-left"
        >
          {name}
        </button>
        <p className="text-xs text-gray-400 mt-0.5">@{req.other_username}</p>
        {req.message && (
          <p className="text-xs text-gray-500 mt-1 italic">"{req.message}"</p>
        )}
        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
          <Clock size={10} /> {timeAgo(req.created_at)} · Pendiente
        </p>
      </div>

      <button
        onClick={onCancel}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 shrink-0"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <UserX size={12} />}
        Cancelar
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'received' | 'sent'

export default function SolicitudesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('received')
  const [actionId, setActionId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: received, isLoading: loadingReceived } = useQuery({
    queryKey: ['social', 'friend-requests', 'received'],
    queryFn: socialApi.getReceivedRequests,
    refetchOnWindowFocus: true,
  })

  const { data: sent, isLoading: loadingSent } = useQuery({
    queryKey: ['social', 'friend-requests', 'sent'],
    queryFn: socialApi.getSentRequests,
    refetchOnWindowFocus: true,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['social', 'friend-requests'] })
    queryClient.invalidateQueries({ queryKey: ['social', 'friends'] })
  }

  const acceptMut = useMutation({
    mutationFn: socialApi.acceptRequest,
    onMutate: (id) => setActionId(id),
    onSettled: () => { setActionId(null); invalidate() },
  })

  const rejectMut = useMutation({
    mutationFn: socialApi.rejectRequest,
    onMutate: (id) => setActionId(id),
    onSettled: () => { setActionId(null); invalidate() },
  })

  const cancelMut = useMutation({
    mutationFn: socialApi.cancelRequest,
    onMutate: (id) => setActionId(id),
    onSettled: () => { setActionId(null); invalidate() },
  })

  const receivedCount = received?.length ?? 0
  const sentCount = sent?.length ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${BRAND}1A` }}
          >
            <Bell size={20} style={{ color: BRAND }} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Solicitudes de conexión</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl shadow-sm p-1 mb-4">
          {([
            { key: 'received', label: 'Recibidas', count: receivedCount, icon: Bell },
            { key: 'sent', label: 'Enviadas', count: sentCount, icon: Send },
          ] as const).map(({ key, label, count, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === key
                  ? 'text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === key ? { backgroundColor: BRAND } : {}}
            >
              <Icon size={14} />
              {label}
              {count > 0 && (
                <span
                  className={`text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${
                    activeTab === key ? 'bg-white/30 text-white' : 'text-white'
                  }`}
                  style={activeTab !== key ? { backgroundColor: BRAND } : {}}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {/* Recibidas */}
          {activeTab === 'received' && (
            <>
              {loadingReceived && (
                <div className="py-12 flex justify-center">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              )}
              {!loadingReceived && receivedCount === 0 && (
                <div className="py-16 text-center">
                  <Bell size={36} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">No tenés solicitudes pendientes</p>
                </div>
              )}
              {received?.map((req) => (
                <ReceivedItem
                  key={req.request_id}
                  req={req}
                  loading={actionId === req.request_id}
                  onAccept={() => acceptMut.mutate(req.request_id)}
                  onReject={() => rejectMut.mutate(req.request_id)}
                />
              ))}
            </>
          )}

          {/* Enviadas */}
          {activeTab === 'sent' && (
            <>
              {loadingSent && (
                <div className="py-12 flex justify-center">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              )}
              {!loadingSent && sentCount === 0 && (
                <div className="py-16 text-center">
                  <Send size={36} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">No tenés solicitudes enviadas pendientes</p>
                </div>
              )}
              {sent?.map((req) => (
                <SentItem
                  key={req.request_id}
                  req={req}
                  loading={actionId === req.request_id}
                  onCancel={() => cancelMut.mutate(req.request_id)}
                />
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
