'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { AppNavbar } from '@/components/AppNavbar'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
import { bandsApi } from '@/lib/api/bands'
import { socialApi } from '@/lib/api/social'
import { musiciansApi } from '@/lib/api/musicians'
import type { BandMember, BandOpening } from '@/lib/api/bands'
import {
  Music2,
  ArrowLeft,
  Loader2,
  UserPlus,
  UserMinus,
  Trash2,
  Edit3,
  LogOut,
  X,
  Check,
  AlertCircle,
  Crown,
  Users,
  Send,
  Bell,
  BellOff,
  Megaphone,
  Plus,
  ImageIcon,
  Film,
  Upload,
  Camera,
} from 'lucide-react'

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 10 }: { name: string; size?: number }) {
  const initials = name.slice(0, 2).toUpperCase()
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}
      style={{ backgroundColor: '#65558F' }}
    >
      {initials}
    </div>
  )
}

// ── Member row ────────────────────────────────────────────────────────────────

function MemberRow({
  member,
  isOwner,
  isSelf,
  canKick,
  onKick,
}: {
  member: BandMember
  isOwner: boolean
  isSelf: boolean
  canKick: boolean
  onKick: () => void
}) {
  const name = member.users?.display_name || member.users?.username || 'Usuario'
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors">
      <Avatar name={name} size={10} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 truncate">{name}</span>
          {isSelf && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
              Vos
            </span>
          )}
          {isOwner && (
            <span
              className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: '#65558F1A', color: '#65558F' }}
            >
              <Crown size={9} />
              Owner
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400">@{member.users?.username ?? '—'}</p>
      </div>
      {canKick && (
        <button
          onClick={onKick}
          className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
          title="Expulsar"
        >
          <UserMinus size={15} />
        </button>
      )}
    </div>
  )
}

// ── Invite modal ──────────────────────────────────────────────────────────────

function InviteModal({
  bandId,
  existingMemberIds,
  onClose,
}: {
  bandId: string
  existingMemberIds: string[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const { data: friends = [], isLoading } = useQuery({
    queryKey: ['social', 'friends'],
    queryFn: socialApi.getMyFriends,
  })

  const eligible = friends.filter(
    f =>
      !existingMemberIds.includes(f.friend.user_id) &&
      !sent.includes(f.friend.user_id)
  )

  const inviteMutation = useMutation({
    mutationFn: (userId: string) =>
      bandsApi.invite(bandId, { to_user_id: userId, message: message.trim() || undefined }),
    onSuccess: (_, userId) => {
      setSent(prev => [...prev, userId])
      setSelected(null)
      setMessage('')
      qc.invalidateQueries({ queryKey: ['bands', bandId, 'invites'] })
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message ?? 'No se pudo enviar la invitación.')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 flex flex-col gap-4 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus size={18} style={{ color: '#65558F' }} />
            <h2 className="font-bold text-gray-900 text-base">Invitar amigo</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={22} className="animate-spin text-gray-400" />
          </div>
        ) : eligible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Users size={28} className="text-gray-300" />
            <p className="text-sm text-gray-400">No hay amigos disponibles para invitar.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              {eligible.map(f => {
                const name = f.friend.display_name || f.friend.username
                const isSelected = selected === f.friend.user_id
                return (
                  <button
                    key={f.friendship_id}
                    type="button"
                    onClick={() => setSelected(isSelected ? null : f.friend.user_id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-[#65558F] bg-[#65558F]/5'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <Avatar name={name} size={9} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                      <p className="text-xs text-gray-400">@{f.friend.username}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'border-[#65558F] bg-[#65558F]' : 'border-gray-200'
                      }`}
                    >
                      {isSelected && <Check size={10} className="text-white" />}
                    </div>
                  </button>
                )
              })}
            </div>

            {selected && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600">Mensaje opcional</label>
                <input
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={500}
                  placeholder="¿Queremos que te sumes!"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#65558F] focus:ring-2 focus:ring-[#65558F]/20 transition"
                />
              </div>
            )}

            {sent.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl text-xs text-green-700">
                <Check size={13} />
                {sent.length === 1 ? 'Invitación enviada.' : `${sent.length} invitaciones enviadas.`}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-xl text-xs text-red-600">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={!selected || inviteMutation.isPending}
              onClick={() => selected && inviteMutation.mutate(selected)}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: '#65558F' }}
            >
              {inviteMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Enviar invitación
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditModal({
  bandId,
  initialName,
  initialDescription,
  onClose,
}: {
  bandId: string
  initialName: string
  initialDescription?: string | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [error, setError] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: () =>
      bandsApi.update(bandId, {
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bands', bandId] })
      onClose()
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message ?? 'No se pudo actualizar la banda.')
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 size={17} style={{ color: '#65558F' }} />
            <h2 className="font-bold text-gray-900 text-base">Editar banda</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={120}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#65558F] focus:ring-2 focus:ring-[#65558F]/20 transition"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">
            Descripción <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#65558F] focus:ring-2 focus:ring-[#65558F]/20 transition resize-none"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-xl text-xs text-red-600">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={updateMutation.isPending || !name.trim()}
          onClick={() => updateMutation.mutate()}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: '#65558F' }}
        >
          {updateMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          Guardar cambios
        </button>
      </div>
    </div>
  )
}

// ── Create Opening modal ──────────────────────────────────────────────────────

function CreateOpeningModal({
  bandId,
  onClose,
}: {
  bandId: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [instrumentId, setInstrumentId] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const { data: instruments = [], isLoading: loadingInstruments } = useQuery({
    queryKey: ['musicians', 'catalog', 'instruments'],
    queryFn: musiciansApi.getInstrumentCatalog,
    staleTime: Infinity,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      bandsApi.createOpening(bandId, {
        instrument_id: instrumentId,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bands', bandId, 'openings'] })
      setDone(true)
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message ?? 'No se pudo crear la búsqueda.')
    },
  })

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative z-10 bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 flex flex-col items-center gap-3 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
            <Check size={22} className="text-green-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900">¡Búsqueda publicada!</p>
          <button
            onClick={onClose}
            className="text-sm font-semibold py-2 px-6 rounded-full text-white"
            style={{ backgroundColor: '#65558F' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone size={18} style={{ color: '#65558F' }} />
            <h2 className="font-bold text-gray-900 text-base">Nueva búsqueda</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">Instrumento *</label>
          {loadingInstruments ? (
            <div className="flex justify-center py-4">
              <Loader2 size={18} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <select
              value={instrumentId}
              onChange={e => setInstrumentId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#65558F] focus:ring-2 focus:ring-[#65558F]/20 transition"
            >
              <option value="">Seleccioná un instrumento…</option>
              {instruments.map(i => (
                <option key={i.instrument_id} value={i.instrument_id}>{i.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">
            Descripción <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Contanos qué buscás en el músico…"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#65558F] focus:ring-2 focus:ring-[#65558F]/20 transition resize-none"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-xl text-xs text-red-600">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={!instrumentId || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: '#65558F' }}
        >
          {createMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Megaphone size={15} />}
          Publicar búsqueda
        </button>
      </div>
    </div>
  )
}

// ── Apply modal ───────────────────────────────────────────────────────────────

function ApplyModal({
  opening,
  onClose,
}: {
  opening: BandOpening
  onClose: () => void
}) {
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applyMutation = useMutation({
    mutationFn: () =>
      bandsApi.applyToOpening(opening.opening_id, {
        message: message.trim() || undefined,
      }),
    onSuccess: () => setDone(true),
    onError: (e: any) => {
      setError(e?.response?.data?.message ?? 'No se pudo enviar la postulación.')
    },
  })

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative z-10 bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 flex flex-col items-center gap-3 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
            <Check size={22} className="text-green-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900">¡Postulación enviada!</p>
          <p className="text-xs text-gray-500 text-center">La banda recibirá tu solicitud.</p>
          <button
            onClick={onClose}
            className="text-sm font-semibold py-2 px-6 rounded-full text-white"
            style={{ backgroundColor: '#65558F' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Postularme</h2>
            <p className="text-xs text-gray-400 mt-0.5">{opening.instrument?.name ?? 'Instrumento'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-gray-700">
            Mensaje <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Contales un poco sobre vos…"
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#65558F] focus:ring-2 focus:ring-[#65558F]/20 transition resize-none"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-xl text-xs text-red-600">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={applyMutation.isPending}
          onClick={() => applyMutation.mutate()}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: '#65558F' }}
        >
          {applyMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Enviar postulación
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BandaDetailPage() {
  const params = useParams()
  const bandId = params.bandId as string
  const router = useRouter()
  const { user } = useAuth()
  const qc = useQueryClient()

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showCreateOpeningModal, setShowCreateOpeningModal] = useState(false)
  const [applyingOpening, setApplyingOpening] = useState<BandOpening | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const { data: band, isLoading } = useQuery({
    queryKey: ['bands', bandId],
    queryFn: () => bandsApi.getById(bandId),
    enabled: !!bandId,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['bands', bandId, 'members'],
    queryFn: () => bandsApi.getMembers(bandId),
    enabled: !!bandId,
  })

  const { data: openings = [] } = useQuery({
    queryKey: ['bands', bandId, 'openings'],
    queryFn: () => bandsApi.getOpenings(bandId),
    enabled: !!bandId,
  })

  const { data: myFollows = [] } = useQuery({
    queryKey: ['social', 'follows'],
    queryFn: socialApi.getMyFollows,
    enabled: !!user,
  })

  const { data: bandMedia = [] } = useQuery({
    queryKey: ['bands', bandId, 'media'],
    queryFn: () => bandsApi.getMedia(bandId),
    enabled: !!bandId,
  })

  const isOwner = band?.owner_user_id === user?.userId
  const isMember = isOwner || members.some(m => m.users.user_id === user?.userId)
  const isFollowing = myFollows.some(f => f.target_type === 'band' && f.target_id === bandId)

  const kickMutation = useMutation({
    mutationFn: (memberId: string) => bandsApi.kickMember(bandId, memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bands', bandId, 'members'] }),
  })

  const leaveMutation = useMutation({
    mutationFn: () => bandsApi.leave(bandId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bands', 'mine'] })
      router.push('/bandas')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => bandsApi.delete(bandId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bands', 'mine'] })
      router.push('/bandas')
    },
  })

  const followMutation = useMutation({
    mutationFn: () => socialApi.follow('band', bandId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'follows'] }),
  })

  const unfollowMutation = useMutation({
    mutationFn: () => socialApi.unfollow('band', bandId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social', 'follows'] }),
  })

  const deleteOpeningMutation = useMutation({
    mutationFn: (openingId: string) => bandsApi.deleteOpening(bandId, openingId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bands', bandId, 'openings'] }),
  })

  const uploadMediaMutation = useMutation({
    mutationFn: ({ file, kind }: { file: File; kind: string }) =>
      bandsApi.uploadMedia(bandId, file, kind),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bands', bandId, 'media'] }),
  })

  const deleteMediaMutation = useMutation({
    mutationFn: (mediaId: string) => bandsApi.deleteMedia(bandId, mediaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bands', bandId, 'media'] }),
  })

  const bandAvatar = bandMedia.find(m => m.kind === 'avatar')
  const gallery = bandMedia.filter(m => m.kind !== 'avatar')

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AppNavbar />
        <div className="flex justify-center py-24">
          <Loader2 size={28} className="animate-spin" style={{ color: '#65558F' }} />
        </div>
      </div>
    )
  }

  if (!band) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AppNavbar />
        <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400">
          <p className="text-lg">Banda no encontrada.</p>
          <button
            onClick={() => router.push('/bandas')}
            className="mt-4 text-sm underline"
            style={{ color: '#65558F' }}
          >
            Volver a mis bandas
          </button>
        </div>
      </div>
    )
  }

  const memberUserIds = members.map(m => m.users.user_id)

  return (
    <div className="min-h-screen bg-gray-100">
      <AppNavbar />

      <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors self-start"
        >
          <ArrowLeft size={16} />
          {isMember ? 'Mis bandas' : 'Volver'}
        </button>

        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0 group/avatar">
              {bandAvatar ? (
                <img
                  src={`${API_URL}${bandAvatar.media.url}`}
                  alt={band.name}
                  className="w-16 h-16 rounded-2xl object-cover"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: '#65558F1A' }}
                >
                  <Music2 size={28} style={{ color: '#65558F' }} />
                </div>
              )}
              {isOwner && (
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                  title="Cambiar foto de perfil"
                >
                  <Camera size={18} className="text-white" />
                </button>
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) uploadMediaMutation.mutate({ file, kind: 'avatar' })
                  e.target.value = ''
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{band.name}</h1>
                {isOwner && (
                  <span
                    className="flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: '#65558F1A', color: '#65558F' }}
                  >
                    <Crown size={10} />
                    Owner
                  </span>
                )}
              </div>
              {band.description && (
                <p className="text-sm text-gray-500 mt-1">{band.description}</p>
              )}
              <div className="flex items-center gap-1.5 mt-2">
                <Users size={13} className="text-gray-400" />
                <span className="text-xs text-gray-400">
                  {members.length} integrante{members.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {isOwner && (
              <>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border-2 transition-colors hover:bg-[#65558F]/5"
                  style={{ borderColor: '#65558F', color: '#65558F' }}
                >
                  <UserPlus size={13} />
                  Invitar amigo
                </button>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Edit3 size={13} />
                  Editar
                </button>
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border-2 border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={13} />
                    Disolver banda
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-500 font-medium">¿Confirmás?</span>
                    <button
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Sí, disolver'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </>
            )}

            {!isOwner && isMember && (
              <button
                onClick={() => leaveMutation.mutate()}
                disabled={leaveMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border-2 border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {leaveMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <LogOut size={13} />
                )}
                Salir de la banda
              </button>
            )}

            {!isMember && user && (
              <button
                onClick={() =>
                  isFollowing ? unfollowMutation.mutate() : followMutation.mutate()
                }
                disabled={followMutation.isPending || unfollowMutation.isPending}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border-2 transition-colors disabled:opacity-50 ${
                  isFollowing
                    ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    : 'hover:bg-[#65558F]/5'
                }`}
                style={!isFollowing ? { borderColor: '#65558F', color: '#65558F' } : {}}
              >
                {followMutation.isPending || unfollowMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : isFollowing ? (
                  <BellOff size={13} />
                ) : (
                  <Bell size={13} />
                )}
                {isFollowing ? 'Siguiendo' : 'Seguir'}
              </button>
            )}
          </div>
        </div>

        {/* Búsquedas */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone size={17} style={{ color: '#65558F' }} />
              <h2 className="font-bold text-gray-900 text-base">
                Búsquedas ({openings.length})
              </h2>
            </div>
            {isOwner && (
              <button
                onClick={() => setShowCreateOpeningModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors hover:bg-[#65558F]/5"
                style={{ borderColor: '#65558F', color: '#65558F' }}
              >
                <Plus size={12} />
                Nueva
              </button>
            )}
          </div>

          {openings.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              {isOwner
                ? 'Publicá una búsqueda para encontrar nuevos integrantes.'
                : 'Esta banda no tiene búsquedas activas.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {openings.map(opening => (
                <div
                  key={opening.opening_id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {opening.instrument?.name ?? 'Instrumento'}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          opening.status === 'Abierta'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {opening.status}
                      </span>
                    </div>
                    {opening.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{opening.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isMember && opening.status === 'Abierta' && (
                      <button
                        onClick={() => setApplyingOpening(opening)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: '#65558F' }}
                      >
                        Postularme
                      </button>
                    )}
                    {isOwner && (
                      <button
                        onClick={() => deleteOpeningMutation.mutate(opening.opening_id)}
                        disabled={deleteOpeningMutation.isPending}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Multimedia */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ImageIcon size={17} style={{ color: '#65558F' }} />
              <h2 className="font-bold text-gray-900 text-base">
                Multimedia {gallery.length > 0 && `(${gallery.length})`}
              </h2>
            </div>
            {isMember && (
              <button
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploadMediaMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-colors hover:bg-[#65558F]/5 disabled:opacity-50"
                style={{ borderColor: '#65558F', color: '#65558F' }}
              >
                {uploadMediaMutation.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Upload size={12} />
                )}
                Subir
              </button>
            )}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,video/mp4"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) uploadMediaMutation.mutate({ file, kind: 'gallery' })
                e.target.value = ''
              }}
            />
          </div>

          {gallery.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <ImageIcon size={36} strokeWidth={1} className="text-gray-300" />
              <p className="text-sm text-gray-400">
                {isMember ? 'Subí fotos o videos de la banda.' : 'Esta banda no tiene fotos ni videos todavía.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {gallery.map(item => (
                <div key={item.media.media_id} className="relative group/media aspect-square rounded-xl overflow-hidden bg-gray-100">
                  {item.media.media_type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <Film size={28} className="text-white/60" />
                      <video
                        src={`${API_URL}${item.media.url}`}
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                        muted
                      />
                    </div>
                  ) : (
                    <img
                      src={`${API_URL}${item.media.url}`}
                      alt={item.media.original_filename}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {(isOwner || item.media.uploaded_by === user?.userId) && (
                    <button
                      onClick={() => deleteMediaMutation.mutate(item.media.media_id)}
                      disabled={deleteMediaMutation.isPending}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover/media:opacity-100 transition-opacity disabled:opacity-50"
                      title="Eliminar"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Miembros */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={17} style={{ color: '#65558F' }} />
            <h2 className="font-bold text-gray-900 text-base">
              Integrantes ({members.length})
            </h2>
          </div>

          {members.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay integrantes.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50">
              {members.map(member => (
                <MemberRow
                  key={member.band_member_id}
                  member={member}
                  isOwner={member.users.user_id === band.owner_user_id}
                  isSelf={member.users.user_id === user?.userId}
                  canKick={isOwner && member.users.user_id !== user?.userId}
                  onKick={() => kickMutation.mutate(member.band_member_id)}
                />
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Modals */}
      {showInviteModal && (
        <InviteModal
          bandId={bandId}
          existingMemberIds={memberUserIds}
          onClose={() => setShowInviteModal(false)}
        />
      )}
      {showEditModal && (
        <EditModal
          bandId={bandId}
          initialName={band.name}
          initialDescription={band.description}
          onClose={() => setShowEditModal(false)}
        />
      )}
      {showCreateOpeningModal && (
        <CreateOpeningModal
          bandId={bandId}
          onClose={() => setShowCreateOpeningModal(false)}
        />
      )}
      {applyingOpening && (
        <ApplyModal
          opening={applyingOpening}
          onClose={() => setApplyingOpening(null)}
        />
      )}
    </div>
  )
}
