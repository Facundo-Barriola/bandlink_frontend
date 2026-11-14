'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { AppNavbar } from '@/components/AppNavbar'
import { chatApi } from '@/lib/api/chat'
import { socialApi } from '@/lib/api/social'
import type { Conversation } from '@/types/chat'
import type { Friend } from '@/types/social'
import { MessageSquare, ChevronRight, PenSquare, Search, X, Loader2 } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

function getConversationName(conv: Conversation, currentUserId: string): string {
  if (conv.conversation_type === 'direct') {
    const other = conv.members.find((m) => m.user_id !== currentUserId)
    return other?.display_name || other?.username || 'Usuario'
  }
  if (conv.conversation_type === 'band') return 'Chat de banda'
  if (conv.conversation_type === 'booking') {
    const other = conv.members.find((m) => m.user_id !== currentUserId)
    return `Reserva · ${other?.display_name || other?.username || 'Estudio'}`
  }
  return 'Conversación'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

const BRAND = '#65558F'

// ── ConversationItem ──────────────────────────────────────────────────────────

function ConversationItem({
  conv,
  currentUserId,
  onClick,
}: {
  conv: Conversation
  currentUserId: string
  onClick: () => void
}) {
  const name = getConversationName(conv, currentUserId)
  const initials = getInitials(name)
  const lastMsg = conv.last_message
  const preview = lastMsg?.body
    ? lastMsg.body.length > 55
      ? lastMsg.body.slice(0, 52) + '...'
      : lastMsg.body
    : 'Sin mensajes'
  const isOwn = lastMsg?.sender_user_id === currentUserId
  const hasUnread = conv.unread_count > 0

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left group"
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white font-semibold text-sm"
        style={{ backgroundColor: BRAND }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${hasUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
            {name}
          </span>
          <span className="text-xs text-gray-400 shrink-0">
            {formatTime(conv.last_message?.created_at ?? conv.updated_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={`text-xs truncate ${hasUnread ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
            {isOwn && lastMsg ? <span className="text-gray-400">Vos: </span> : null}
            {preview}
          </p>
          {hasUnread ? (
            <span
              className="shrink-0 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1"
              style={{ backgroundColor: BRAND }}
            >
              {conv.unread_count > 99 ? '99+' : conv.unread_count}
            </span>
          ) : null}
        </div>
      </div>
      <ChevronRight size={14} className="text-gray-300 shrink-0 group-hover:text-gray-400 transition-colors" />
    </button>
  )
}

// ── NewConversationModal ──────────────────────────────────────────────────────

function NewConversationModal({
  onClose,
  onNavigate,
}: {
  onClose: () => void
  onNavigate: (convId: string) => void
}) {
  const [search, setSearch] = useState('')
  const [startingId, setStartingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ['social', 'friends'],
    queryFn: socialApi.getMyFriends,
    staleTime: 30_000,
  })

  const filtered = friends.filter((f) => {
    const q = search.toLowerCase()
    return (
      f.friend.username.toLowerCase().includes(q) ||
      (f.friend.display_name ?? '').toLowerCase().includes(q)
    )
  })

  const handleSelect = async (friend: Friend['friend']) => {
    if (startingId) return
    setErrorMsg(null)
    setStartingId(friend.user_id)
    try {
      const conv = await chatApi.createDirectConversation(friend.user_id)
      onNavigate(conv.conversation_id)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'No se pudo abrir el chat'
      setErrorMsg(typeof msg === 'string' ? msg : 'Error al abrir el chat')
      setStartingId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-base font-bold text-gray-900">Nueva conversación</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar amigo..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': BRAND } as React.CSSProperties}
            />
          </div>
          {errorMsg && (
            <p className="text-xs text-red-500 mt-2 px-1">{errorMsg}</p>
          )}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 pb-4">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              {friends.length === 0
                ? 'No tenés conexiones todavía'
                : 'Ningún amigo coincide con la búsqueda'}
            </p>
          )}

          {filtered.map((f) => {
            const name = f.friend.display_name || f.friend.username
            const initials = getInitials(name)
            const isLoading = startingId === f.friend.user_id

            return (
              <button
                key={f.friendship_id}
                onClick={() => handleSelect(f.friend)}
                disabled={!!startingId}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left disabled:opacity-60"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white font-semibold text-sm"
                  style={{ backgroundColor: BRAND }}
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                  <p className="text-xs text-gray-400 truncate">@{f.friend.username}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [showNew, setShowNew] = useState(false)

  const { data: conversations, isLoading, isError, refetch } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: chatApi.getConversations,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  })

  const totalUnread = conversations?.reduce((acc, c) => acc + c.unread_count, 0) ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${BRAND}1A` }}
            >
              <MessageSquare size={20} style={{ color: BRAND }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Mensajes</h1>
              {totalUnread > 0 && (
                <p className="text-xs text-gray-500">{totalUnread} sin leer</p>
              )}
            </div>
          </div>

          {/* Nueva conversación */}
          <button
            onClick={() => setShowNew(true)}
            title="Nueva conversación"
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
            style={{ backgroundColor: BRAND }}
          >
            <PenSquare size={18} className="text-white" />
          </button>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {isLoading && (
            <div className="py-16 text-center text-sm text-gray-400">
              Cargando conversaciones...
            </div>
          )}

          {isError && (
            <div className="py-16 text-center">
              <p className="text-sm text-gray-500 mb-3">No se pudieron cargar los mensajes</p>
              <button
                onClick={() => refetch()}
                className="text-sm font-medium"
                style={{ color: BRAND }}
              >
                Reintentar
              </button>
            </div>
          )}

          {!isLoading && !isError && conversations?.length === 0 && (
            <div className="py-16 text-center">
              <MessageSquare size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No tenés conversaciones todavía</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">
                Buscá un amigo para empezar a chatear
              </p>
              <button
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: BRAND }}
              >
                <PenSquare size={14} />
                Nueva conversación
              </button>
            </div>
          )}

          {!isLoading &&
            conversations?.map((conv) => (
              <ConversationItem
                key={conv.conversation_id}
                conv={conv}
                currentUserId={user?.userId ?? ''}
                onClick={() => router.push(`/chat/${conv.conversation_id}`)}
              />
            ))}
        </div>
      </main>

      {showNew && (
        <NewConversationModal
          onClose={() => setShowNew(false)}
          onNavigate={(convId) => {
            setShowNew(false)
            router.push(`/chat/${convId}`)
          }}
        />
      )}
    </div>
  )
}
