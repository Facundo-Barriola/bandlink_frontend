'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { AppNavbar } from '@/components/AppNavbar'
import { bandsApi } from '@/lib/api/bands'
import { socialApi } from '@/lib/api/social'
import type { Friend } from '@/lib/api/social'
import {
  Music2,
  ArrowLeft,
  Loader2,
  UserPlus,
  Check,
  Users,
  AlertCircle,
} from 'lucide-react'

// ── Friend toggle button ───────────────────────────────────────────────────────

function FriendToggle({
  friend,
  selected,
  onToggle,
}: {
  friend: Friend
  selected: boolean
  onToggle: () => void
}) {
  const displayName = friend.friend.display_name || friend.friend.username
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
        selected
          ? 'border-[#65558F] bg-[#65558F]/5'
          : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
        style={{ backgroundColor: '#65558F' }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
        <p className="text-xs text-gray-400 truncate">@{friend.friend.username}</p>
      </div>

      {/* Check */}
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
          selected ? 'border-[#65558F] bg-[#65558F]' : 'border-gray-200'
        }`}
      >
        {selected && <Check size={11} className="text-white" />}
      </div>
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CrearBandaPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]) // user ids
  const [error, setError] = useState<string | null>(null)

  // Redirigir si no es músico
  if (user && user.role !== 'MUSICIAN') {
    router.replace('/bandas')
    return null
  }

  const { data: friends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ['social', 'friends'],
    queryFn: socialApi.getMyFriends,
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      // 1. Crear la banda
      const band = await bandsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      // 2. Invitar a los amigos seleccionados
      await Promise.allSettled(
        selectedFriends.map(userId =>
          bandsApi.invite(band.band_id, { to_user_id: userId })
        )
      )
      return band
    },
    onSuccess: (band) => {
      router.push(`/bandas/${band.band_id}`)
    },
    onError: (e: any) => {
      setError(
        e?.response?.data?.message ?? 'Ocurrió un error al crear la banda.'
      )
    },
  })

  function toggleFriend(userId: string) {
    setSelectedFriends(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('El nombre de la banda es obligatorio.')
      return
    }
    createMutation.mutate()
  }

  const isPending = createMutation.isPending

  return (
    <div className="min-h-screen bg-gray-100">
      <AppNavbar />

      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-5"
        >
          <ArrowLeft size={16} />
          Volver
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-7">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#65558F1A' }}
            >
              <Music2 size={20} style={{ color: '#65558F' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Crear banda</h1>
              <p className="text-xs text-gray-400">
                Vas a ser el owner. Podés invitar amigos ahora o después.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Nombre */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700" htmlFor="band-name">
                Nombre de la banda <span className="text-red-400">*</span>
              </label>
              <input
                id="band-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={120}
                placeholder="Ej: The Rolling Stones"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#65558F] focus:ring-2 focus:ring-[#65558F]/20 transition"
              />
              <p className="text-xs text-gray-400 text-right">{name.length}/120</p>
            </div>

            {/* Descripción */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700" htmlFor="band-desc">
                Descripción{' '}
                <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                id="band-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="¿Qué estilo toca la banda? ¿Qué buscan?"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#65558F] focus:ring-2 focus:ring-[#65558F]/20 transition resize-none"
              />
              <p className="text-xs text-gray-400 text-right">{description.length}/1000</p>
            </div>

            {/* Invitar amigos */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <UserPlus size={15} style={{ color: '#65558F' }} />
                <span className="text-sm font-semibold text-gray-700">
                  Invitar amigos{' '}
                  <span className="text-gray-400 font-normal">(opcional)</span>
                </span>
              </div>

              {loadingFriends ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              ) : friends.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-4 bg-gray-50 rounded-xl text-sm text-gray-400">
                  <Users size={15} />
                  <span>
                    No tenés amigos para invitar todavía.
                  </span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {friends.map(friend => (
                      <FriendToggle
                        key={friend.friendship_id}
                        friend={friend}
                        selected={selectedFriends.includes(friend.friend.user_id)}
                        onToggle={() => toggleFriend(friend.friend.user_id)}
                      />
                    ))}
                  </div>
                  {selectedFriends.length > 0 && (
                    <p className="text-xs text-gray-500 text-center">
                      Se invitará a{' '}
                      <strong>{selectedFriends.length}</strong>{' '}
                      {selectedFriends.length === 1 ? 'amigo' : 'amigos'} al crear la banda.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 px-4 py-3 bg-red-50 rounded-xl text-sm text-red-600">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50 mt-1"
              style={{ backgroundColor: '#65558F' }}
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creando…
                </>
              ) : (
                <>
                  <Music2 size={16} />
                  Crear banda
                </>
              )}
            </button>

          </form>
        </div>
      </main>
    </div>
  )
}
