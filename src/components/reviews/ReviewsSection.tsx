'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star, Pencil, Trash2, Loader2 } from 'lucide-react'
import { reviewsApi, type ReviewAuthor } from '@/lib/api/reviews'
import { useAuthStore } from '@/store/auth.store'
import { apiErrorMessage } from '@/lib/booking-format'
import { StarDisplay, StarInput } from './StarInput'

type Target = { type: 'studio' | 'user'; id: string }

interface NormalizedReview {
  id: string
  authorId: string
  author: ReviewAuthor | undefined
  rating: number
  comment: string | null
  created_at: string
}

/** Query key compartida con otras pantallas (ej. el encabezado del estudio usa el promedio). */
export function reviewsQueryKey(t: Target) {
  return t.type === 'studio' ? ['studio', t.id, 'reviews'] : ['user', t.id, 'reviews']
}

/**
 * Reseñas de una sala (CU34/CU44) o de un músico (CU35/CU45):
 * listado, promedio, y escribir / editar / borrar la reseña propia.
 * El backend valida si se puede calificar (reserva completada o interacción previa).
 */
export function ReviewsSection({
  target,
  canWrite,
  emptyText,
  writeHint,
}: {
  target: Target
  /** Mostrar el formulario (el usuario no es el dueño de lo que se reseña). */
  canWrite: boolean
  emptyText: string
  writeHint?: string
}) {
  const queryClient = useQueryClient()
  const me = useAuthStore((s) => s.user)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const key = reviewsQueryKey(target)

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (target.type === 'studio') {
        const r = await reviewsApi.getStudioReviews(target.id)
        return {
          ...r,
          items: r.items.map<NormalizedReview>((x) => ({
            id: x.studio_review_id, authorId: x.user_id, author: x.users,
            rating: x.rating, comment: x.comment, created_at: x.created_at,
          })),
        }
      }
      const r = await reviewsApi.getUserReviews(target.id)
      return {
        ...r,
        items: r.items.map<NormalizedReview>((x) => ({
          id: x.user_review_id, authorId: x.user_reviewer_id, author: x.users_user_reviews_user_reviewer_idTousers,
          rating: x.rating, comment: x.comment, created_at: x.created_at,
        })),
      }
    },
  })

  const items = data?.items ?? []
  const avg = Number(data?.average_rating ?? 0)
  const total = data?.total_reviews ?? 0
  const mine = items.find((r) => r.authorId === me?.userId)

  const reset = () => { setFormOpen(false); setEditingId(null); setRating(0); setComment(''); setError(null) }
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key })

  const save = useMutation({
    mutationFn: () => {
      if (rating < 1) throw new Error('Elegí una puntuación de 1 a 5 estrellas.')
      const body = { rating, comment: comment.trim() || undefined }
      if (editingId) {
        return target.type === 'studio'
          ? reviewsApi.updateStudioReview(editingId, body)
          : reviewsApi.updateUserReview(editingId, body)
      }
      return target.type === 'studio'
        ? reviewsApi.createStudioReview(target.id, body)
        : reviewsApi.createUserReview(target.id, body)
    },
    onSuccess: () => { reset(); invalidate() },
    onError: (e) => setError(apiErrorMessage(e)),
  })

  const remove = useMutation({
    mutationFn: (id: string) =>
      target.type === 'studio' ? reviewsApi.deleteStudioReview(id) : reviewsApi.deleteUserReview(id),
    onSuccess: () => { setConfirmDeleteId(null); invalidate() },
  })

  const startEdit = (r: NormalizedReview) => {
    setEditingId(r.id)
    setRating(r.rating)
    setComment(r.comment ?? '')
    setError(null)
    setFormOpen(true)
  }

  // Distribución de puntajes (5★ … 1★)
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: items.filter((r) => r.rating === n).length }))

  return (
    <div id="resenas" className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-5 scroll-mt-24">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Star size={18} style={{ color: '#65558F' }} />
          <h2 className="text-base font-bold text-gray-900">Reseñas</h2>
          <span className="text-sm text-gray-400">({total})</span>
        </div>
        {canWrite && !mine && !formOpen && (
          <button
            onClick={() => { reset(); setFormOpen(true) }}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white flex items-center gap-1.5"
            style={{ backgroundColor: '#65558F' }}
          >
            <Star size={14} /> Dejar reseña
          </button>
        )}
      </div>

      {total > 0 && (
        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900 leading-none">{avg.toFixed(1)}</p>
            <StarDisplay rating={avg} />
            <p className="text-xs text-gray-400 mt-1">{total} {total === 1 ? 'reseña' : 'reseñas'}</p>
          </div>
          <div className="flex-1 min-w-[180px] flex flex-col gap-1">
            {dist.map(({ n, count }) => (
              <div key={n} className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-3">{n}</span>
                <Star size={11} className="fill-amber-400 text-amber-400" />
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
                </div>
                <span className="w-5 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Formulario ── */}
      {formOpen && (
        <div className="rounded-xl border border-[#65558F]/20 bg-[#65558F]/5 p-4 flex flex-col gap-3">
          <p className="text-sm font-semibold text-[#65558F]">{editingId ? 'Editar tu reseña' : 'Tu reseña'}</p>
          <StarInput value={rating} onChange={setRating} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 1000))}
            rows={3}
            placeholder="Contá cómo fue tu experiencia (opcional)"
            className="w-full border border-[#65558F]/30 rounded-lg p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#65558F] resize-none bg-white"
          />
          {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setError(null); save.mutate() }}
              disabled={save.isPending}
              className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 flex items-center gap-1.5"
              style={{ backgroundColor: '#65558F' }}
            >
              {save.isPending && <Loader2 size={13} className="animate-spin" />}
              {editingId ? 'Guardar cambios' : 'Publicar reseña'}
            </button>
            <button onClick={reset} className="rounded-full px-5 py-2 text-sm font-semibold border border-gray-200 text-gray-500">
              Cancelar
            </button>
          </div>
          {writeHint && !editingId && <p className="text-xs text-gray-400">{writeHint}</p>}
        </div>
      )}

      {/* ── Listado ── */}
      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-6">Cargando reseñas…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">{emptyText}</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-50">
          {items.map((r) => {
            const name = r.author?.display_name || r.author?.username || 'Usuario'
            const isMine = r.authorId === me?.userId
            return (
              <div key={r.id} className="flex gap-3 py-3 first:pt-0">
                <Link
                  href={`/perfil/${r.authorId}`}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: '#65558F' }}
                >
                  {name.charAt(0).toUpperCase()}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/perfil/${r.authorId}`} className="text-sm font-semibold text-gray-800 hover:underline">{name}</Link>
                    <StarDisplay rating={r.rating} />
                    {isMine && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#65558F1A] text-[#65558F]">Tu reseña</span>}
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 leading-relaxed mt-1 whitespace-pre-line">{r.comment}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                {isMine && !formOpen && confirmDeleteId === r.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-gray-500 mr-1">¿Borrar?</span>
                    <button
                      onClick={() => remove.mutate(r.id)}
                      disabled={remove.isPending}
                      className="rounded-full px-3 py-1 text-xs font-semibold bg-red-500 text-white disabled:opacity-60"
                    >
                      Sí
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="rounded-full px-3 py-1 text-xs font-semibold border border-gray-200 text-gray-500">
                      No
                    </button>
                  </div>
                )}
                {isMine && !formOpen && confirmDeleteId !== r.id && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(r)} className="p-1.5 rounded-full hover:bg-[#65558F]/10 text-[#65558F]" title="Editar">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(r.id)}
                      className="p-1.5 rounded-full hover:bg-red-50 text-red-400"
                      title="Borrar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
