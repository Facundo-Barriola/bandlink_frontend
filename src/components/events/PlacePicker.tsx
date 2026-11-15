'use client'

import { useRef, useState } from 'react'
import { MapPin, X } from 'lucide-react'
import { geoApi } from '@/lib/api/geo'

const inputClass =
  'w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65558F] border-[#65558F] placeholder-[#65558F]/50 text-[#65558F]'

interface MapboxFeature {
  id: string
  place_name: string
  text: string
  geometry: { coordinates: [number, number] }
  properties?: { mapbox_id?: string; address?: string }
  context?: { id: string; text: string }[]
}

export interface PickedPlace {
  place_id: string
  label: string
}

/**
 * Buscador de direcciones con Mapbox. Al elegir un resultado lo registra en
 * /geo/places y devuelve el place_id para asociarlo al evento.
 */
export function PlacePicker({
  value,
  onChange,
}: {
  value: PickedPlace | null
  onChange: (p: PickedPlace | null) => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<MapboxFeature[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = (text: string) => {
    setQ(text)
    setError(null)
    if (timer.current) clearTimeout(timer.current)
    if (text.trim().length < 3) { setResults([]); return }
    timer.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      if (!token) { setError('Falta NEXT_PUBLIC_MAPBOX_TOKEN para buscar direcciones.'); return }
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${token}&language=es&limit=5&country=ar&types=poi,address,place,neighborhood`
      try {
        const res = await fetch(url)
        const json = await res.json()
        setResults(json.features ?? [])
      } catch {
        setError('No se pudo buscar la dirección.')
      }
    }, 300)
  }

  const select = async (f: MapboxFeature) => {
    const [lng, lat] = f.geometry.coordinates
    const ctx = f.context ?? []
    const find = (prefix: string) => ctx.find((c) => c.id.startsWith(prefix))?.text ?? undefined
    setResults([])
    setSaving(true)
    try {
      const place = await geoApi.createPlace({
        name: f.text,
        lat,
        lng,
        address_line1: f.place_name,
        city: find('place') ?? null,
        region: find('region') ?? null,
        country: find('country') ?? null,
        postal_code: find('postcode') ?? null,
        mapbox_id: f.properties?.mapbox_id ?? f.id,
      })
      onChange({ place_id: place.place_id, label: f.place_name })
      setQ('')
    } catch {
      setError('No se pudo guardar el lugar. Intentá de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-[#65558F] px-3 py-2.5 text-sm text-[#65558F]">
        <span className="flex items-center gap-2 min-w-0">
          <MapPin size={15} className="shrink-0" />
          <span className="truncate">{value.label}</span>
        </span>
        <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-gray-600 shrink-0">
          <X size={15} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={q}
        onChange={(e) => search(e.target.value)}
        placeholder={saving ? 'Guardando lugar…' : 'Buscá el lugar o la dirección…'}
        disabled={saving}
        className={inputClass}
      />
      {results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-[#65558F]/30 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {results.map((f) => (
            <button
              key={f.id}
              type="button"
              onMouseDown={() => select(f)}
              className="w-full text-left px-4 py-2.5 hover:bg-[#65558F]/10 transition-colors text-sm text-[#65558F]"
            >
              {f.place_name}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
