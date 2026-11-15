'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Search, Check } from 'lucide-react'
import { socialApi } from '@/lib/api/social'
import { eventsApi } from '@/lib/api/events'
import { apiErrorMessage } from '@/lib/booking-format'

/** CU63 – Enviar invitación de evento (a conexiones). */
export function InviteModal({
  eventId,
  excludeUserIds,
  onClose,
}: {
  eventId: string
  excludeUserIds: string[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ['social', 'friends'],
    queryFn: socialApi.getMyFriends,
  })

  const eligible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return friends
      .filter((f) => !excludeUserIds.includes(f.friend.user_id))
      .filter((f) =>
        !term ||
        (f.friend.display_name ?? '').toLowerCase().includes(term) ||
        f.friend.username.toLowerCase().includes(term),
      )
  }, [friends, excludeUserIds, q])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const allSelected = eligible.length > 0 && eligible.every((f) => selected.has(f.friend.user_id))
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(eligible.map((f) => f.friend.user_id)))

  const { mutate, isPending } = useMutation({
    mutationFn: () => eventsApi.invite(eventId, Array.from(selected)),
    onSuccess: () => {
      setSent(true)
      queryClient.invalidateQueries({ queryKey: ['events', eventId] })
    },
    onError: (e) => setError(apiErrorMessage(e, 'No se pudieron enviar las invitaciones.')),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-lg font-bold text-[#65558F]">Invitar al evento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {sent ? (
          <div className="px-6 pb-6 flex flex-col items-center gap-3 text-center">
            <Check size={40} className="text-green-500" />
            <p className="font-semibold text-gray-800">¡Invitaciones enviadas!</p>
            <p className="text-sm text-gray-500">Les llega una notificación para confirmar asistencia.</p>
            <button onClick={onClose} className="rounded-full px-6 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: '#65558F' }}>
              Listo
            </button>
          </div>
        ) : (
          <div className="px-6 pb-6 flex flex-col gap-3 min-h-0">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#65558F]/50" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar entre tus conexiones…"
                className="w-full border border-[#65558F]/40 rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F]"
              />
            </div>

            {eligible.length > 1 && (
              <button onClick={toggleAll} className="self-start text-xs font-semibold text-[#65558F] hover:underline">
                {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
              </button>
            )}

            <div className="overflow-y-auto flex flex-col gap-1 min-h-[120px]">
              {isLoading ? (
                <p className="text-sm text-gray-400 py-6 text-center">Cargando conexiones…</p>
              ) : eligible.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">
                  {friends.length === 0 ? 'Todavía no tenés conexiones para invitar.' : 'No hay conexiones disponibles para invitar.'}
                </p>
              ) : (
                eligible.map((f) => {
                  const on = selected.has(f.friend.user_id)
                  return (
                    <button
                      key={f.friend.user_id}
                      onClick={() => toggle(f.friend.user_id)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${on ? 'bg-[#65558F1A]' : 'hover:bg-gray-50'}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold" style={{ backgroundColor: '#65558F' }}>
                          {(f.friend.display_name ?? f.friend.username).charAt(0).toUpperCase()}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-gray-800">{f.friend.display_name ?? f.friend.username}</span>
                          <span className="block text-xs text-gray-400">@{f.friend.username}</span>
                        </span>
                      </span>
                      <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${on ? 'bg-[#65558F] border-[#65558F]' : 'border-gray-300'}`}>
                        {on && <Check size={13} className="text-white" />}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

            <button
              onClick={() => mutate()}
              disabled={selected.size === 0 || isPending}
              className="rounded-full py-3 font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#65558F' }}
            >
              {isPending ? 'Enviando…' : `Invitar${selected.size ? ` (${selected.size})` : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
