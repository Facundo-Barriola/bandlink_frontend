'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { AppNavbar } from '@/components/AppNavbar'
import { socialApi } from '@/lib/api/social'
import { chatApi } from '@/lib/api/chat'
import type { Friend } from '@/types/social'
import { Users, MessageSquare, UserMinus, Loader2, Search, UserPlus } from 'lucide-react'

const BRAND = '#65558F'

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// ── FriendCard ────────────────────────────────────────────────────────────────

function FriendCard({
  friendship,
  onChat,
  onRemove,
  chatLoading,
  removeLoading,
}: {
  friendship: Friend
  onChat: () => void
  onRemove: () => void
  chatLoading: boolean
  removeLoading: boolean
}) {
  const router = useRouter()
  const { friend } = friendship
  const name = friend.display_name || friend.username

  return (
    <div className="flex items-center gap-3 p-4">
      {/* Avatar */}
      <button
        onClick={() => router.push(`/perfil/${friend.user_id}`)}
        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 hover:opacity-80 transition-opacity"
        style={{ backgroundColor: BRAND }}
      >
        {getInitials(name)}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <button
          onClick={() => router.push(`/perfil/${friend.user_id}`)}
          className="text-sm font-semibold text-gray-900 hover:underline text-left block"
        >
          {name}
        </button>
        <p className="text-xs text-gray-400">@{friend.username}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onChat}
          disabled={chatLoading}
          title="Chatear"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: BRAND }}
        >
          {chatLoading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <MessageSquare size={15} />
          )}
        </button>
        <button
          onClick={onRemove}
          disabled={removeLoading}
          title="Eliminar conexión"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-red-400 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
        >
          {removeLoading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <UserMinus size={15} />
          )}
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConexionesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [chattingWith, setChattingWith] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const { data: friends, isLoading } = useQuery({
    queryKey: ['social', 'friends'],
    queryFn: socialApi.getMyFriends,
    refetchOnWindowFocus: true,
  })

  const removeMut = useMutation({
    mutationFn: socialApi.removeFriendship,
    onMutate: (id) => setRemovingId(id),
    onSettled: () => {
      setRemovingId(null)
      queryClient.invalidateQueries({ queryKey: ['social', 'friends'] })
    },
  })

  const handleChat = async (friend: Friend['friend']) => {
    setChattingWith(friend.user_id)
    try {
      const conv = await chatApi.createDirectConversation(friend.user_id)
      router.push(`/chat/${conv.conversation_id}`)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'No se pudo abrir el chat'
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setChattingWith(null)
    }
  }

  const handleRemove = (friendship: Friend) => {
    const name = friendship.friend.display_name || friendship.friend.username
    if (!confirm(`¿Eliminar a ${name} de tus conexiones?`)) return
    removeMut.mutate(friendship.friendship_id)
  }

  const filtered = (friends ?? []).filter((f) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const name = (f.friend.display_name || '').toLowerCase()
    const username = f.friend.username.toLowerCase()
    return name.includes(q) || username.includes(q)
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${BRAND}1A` }}
            >
              <Users size={20} style={{ color: BRAND }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Conexiones</h1>
              {friends && friends.length > 0 && (
                <p className="text-xs text-gray-500">
                  {friends.length} {friends.length === 1 ? 'conexión' : 'conexiones'}
                </p>
              )}
            </div>
          </div>

          {/* Ir a solicitudes */}
          <button
            onClick={() => router.push('/solicitudes')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
            style={{ color: BRAND, backgroundColor: `${BRAND}12` }}
          >
            <UserPlus size={14} />
            Solicitudes
          </button>
        </div>

        {/* Search */}
        {friends && friends.length > 3 && (
          <div className="relative mb-4">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en tus conexiones..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': BRAND } as React.CSSProperties}
            />
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {isLoading && (
            <div className="py-12 flex justify-center">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          )}

          {!isLoading && (friends?.length ?? 0) === 0 && (
            <div className="py-16 text-center px-4">
              <Users size={36} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Todavía no tenés conexiones</p>
              <p className="text-xs text-gray-400 mt-1">
                Buscá músicos o estudios en{' '}
                <button
                  onClick={() => router.push('/descubrir')}
                  className="font-medium hover:underline"
                  style={{ color: BRAND }}
                >
                  Descubrir
                </button>{' '}
                y enviá solicitudes de conexión
              </p>
            </div>
          )}

          {!isLoading && friends && friends.length > 0 && filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">
                No hay resultados para "<span className="font-medium">{search}</span>"
              </p>
            </div>
          )}

          {filtered.map((friendship) => (
            <FriendCard
              key={friendship.friendship_id}
              friendship={friendship}
              chatLoading={chattingWith === friendship.friend.user_id}
              removeLoading={removingId === friendship.friendship_id}
              onChat={() => handleChat(friendship.friend)}
              onRemove={() => handleRemove(friendship)}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
