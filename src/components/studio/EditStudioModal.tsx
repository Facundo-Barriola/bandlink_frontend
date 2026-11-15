'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { studioApi } from '@/lib/api/studio'
import { apiErrorMessage } from '@/lib/booking-format'
import { PlacePicker, type PickedPlace } from '@/components/events/PlacePicker'

const labelClass = 'block text-xs font-semibold text-[#65558F] uppercase tracking-wide mb-1.5'
const inputClass =
  'w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65558F] border-[#65558F] placeholder-[#65558F]/50 text-[#65558F]'

interface StudioLike {
  studio_id: string
  name: string
  description: string | null
  phone: string | null
  places?: { place_id: string; name?: string | null; address_line1?: string | null; city?: string | null } | null
}

/** CU05 – Editar información del perfil de la sala de ensayo. */
export function EditStudioModal({ studio, onClose }: { studio: StudioLike; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(studio.name ?? '')
  const [description, setDescription] = useState(studio.description ?? '')
  const [phone, setPhone] = useState(studio.phone ?? '')
  const [place, setPlace] = useState<PickedPlace | null>(
    studio.places
      ? {
          place_id: studio.places.place_id,
          label: studio.places.address_line1 || [studio.places.name, studio.places.city].filter(Boolean).join(', '),
        }
      : null,
  )
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error('El nombre del estudio es obligatorio.')
      return studioApi.updateStudio(studio.studio_id, {
        name: name.trim(),
        description: description.trim(),
        phone: phone.trim(),
        ...(place?.place_id ? { place_id: place.place_id } : {}),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', studio.studio_id] })
      queryClient.invalidateQueries({ queryKey: ['studios', 'mine'] })
      onClose()
    },
    onError: (e) => setError(apiErrorMessage(e, 'No se pudieron guardar los cambios.')),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-lg font-bold text-[#65558F]">Editar estudio</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto px-6 pb-6 flex flex-col gap-5">
          <div>
            <label className={labelClass}>Nombre <span className="text-red-400">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 120))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              rows={4}
              placeholder="Contá qué tiene tu estudio, el ambiente, servicios…"
              className={`${inputClass} resize-none`}
            />
            <p className="text-[11px] text-gray-400 text-right mt-1">{description.length}/1000</p>
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value.slice(0, 50))} placeholder="Ej. +54 11 1234-5678" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ubicación</label>
            <PlacePicker value={place} onChange={setPlace} />
            <p className="text-[11px] text-gray-400 mt-1">Si no cambiás la ubicación, se mantiene la actual.</p>
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
          <button
            onClick={() => { setError(null); save.mutate() }}
            disabled={save.isPending}
            className="rounded-full py-3 font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#65558F' }}
          >
            {save.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
