'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Globe, Lock } from 'lucide-react'
import { eventsApi, type BandEvent, type EventInput } from '@/lib/api/events'
import { bandsApi } from '@/lib/api/bands'
import { useAuthStore } from '@/store/auth.store'
import { apiErrorMessage } from '@/lib/booking-format'
import { fromLocalInput, toLocalInput } from '@/lib/event-format'
import { PlacePicker, type PickedPlace } from './PlacePicker'

const labelClass = 'block text-xs font-semibold text-[#65558F] uppercase tracking-wide mb-1.5'
const inputClass =
  'w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65558F] border-[#65558F] placeholder-[#65558F]/50 text-[#65558F]'

const TITLE_MAX = 30
const DESC_MAX = 255

/** CU10 (crear) y CU11 (editar). Incluye CU36 (privado) y CU37 (aforo). */
export function EventFormModal({
  event,
  onClose,
  onSaved,
}: {
  event?: BandEvent
  onClose: () => void
  onSaved: (event: BandEvent) => void
}) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isEdit = !!event

  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [startsAt, setStartsAt] = useState(toLocalInput(event?.starts_at ?? null))
  const [endsAt, setEndsAt] = useState(toLocalInput(event?.ends_at ?? null))
  const [capacity, setCapacity] = useState(event?.capacity != null ? String(event.capacity) : '')
  const [visibility, setVisibility] = useState<'public' | 'private'>(event?.visibility ?? 'public')
  const [hostBandId, setHostBandId] = useState(event?.host_band_id ?? '')
  const [place, setPlace] = useState<PickedPlace | null>(
    event?.places ? { place_id: event.places.place_id, label: [event.places.name, event.places.city].filter(Boolean).join(', ') } : null,
  )
  const [error, setError] = useState<string | null>(null)

  const { data: myBands = [] } = useQuery({
    queryKey: ['bands', 'mine'],
    queryFn: bandsApi.getMine,
    enabled: user?.role === 'MUSICIAN',
  })

  const validate = (): string | null => {
    if (!title.trim()) return 'El título es obligatorio.'
    if (!startsAt) return 'Indicá la fecha y hora de inicio.'
    if (!isEdit && new Date(startsAt).getTime() < Date.now()) return 'La fecha de inicio ya pasó.'
    if (endsAt && new Date(endsAt) <= new Date(startsAt)) return 'La hora de fin tiene que ser posterior al inicio.'
    if (capacity && (!/^\d+$/.test(capacity) || parseInt(capacity) < 1)) return 'El aforo tiene que ser un número mayor a 0.'
    return null
  }

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const v = validate()
      if (v) throw new Error(v)
      const data: EventInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        starts_at: fromLocalInput(startsAt),
        ends_at: fromLocalInput(endsAt),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        capacity: capacity ? parseInt(capacity) : undefined,
        visibility,
        place_id: place?.place_id,
        host_band_id: hostBandId || undefined,
      }
      return isEdit ? eventsApi.update(event!.event_id, data) : eventsApi.create(data)
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      onSaved(saved)
    },
    onError: (e) => setError(apiErrorMessage(e, 'No se pudo guardar el evento.')),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-lg font-bold text-[#65558F]">{isEdit ? 'Editar evento' : 'Crear evento'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto px-6 pb-6 flex flex-col gap-5">
          <div>
            <label className={labelClass}>Título <span className="text-red-400">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              placeholder="Ej. Fecha en Niceto"
              className={inputClass}
            />
            <p className="text-[11px] text-gray-400 text-right mt-1">{title.length}/{TITLE_MAX}</p>
          </div>

          <div>
            <label className={labelClass}>Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
              rows={3}
              placeholder="Contá de qué se trata, quiénes tocan, entradas…"
              className={`${inputClass} resize-none`}
            />
            <p className="text-[11px] text-gray-400 text-right mt-1">{description.length}/{DESC_MAX}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Inicio <span className="text-red-400">*</span></label>
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Fin</label>
              <input type="datetime-local" value={endsAt} min={startsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Lugar</label>
            <PlacePicker value={place} onChange={setPlace} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Aforo</label>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Sin límite"
                className={inputClass}
              />
            </div>
            {myBands.length > 0 && (
              <div>
                <label className={labelClass}>Organiza</label>
                <select value={hostBandId} onChange={(e) => setHostBandId(e.target.value)} className={`${inputClass} bg-white`}>
                  <option value="">Yo ({user?.displayName})</option>
                  {myBands.map((b) => <option key={b.band_id} value={b.band_id}>{b.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Visibilidad</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: 'public', icon: Globe, label: 'Público', hint: 'Lo ve cualquier usuario' },
                { v: 'private', icon: Lock, label: 'Privado', hint: 'Solo invitados' },
              ] as const).map(({ v, icon: Icon, label, hint }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    visibility === v ? 'border-[#65558F] bg-[#65558F1A]' : 'border-gray-200 hover:border-[#65558F]/40'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-[#65558F]"><Icon size={14} /> {label}</span>
                  <span className="text-[11px] text-gray-400">{hint}</span>
                </button>
              ))}
            </div>
            {visibility === 'private' && !isEdit && (
              <p className="text-xs text-gray-400 mt-2">Después de crearlo vas a poder elegir a quién invitar.</p>
            )}
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

          <button
            onClick={() => { setError(null); mutate() }}
            disabled={isPending}
            className="rounded-full py-3 font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#65558F' }}
          >
            {isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear evento'}
          </button>
        </div>
      </div>
    </div>
  )
}
