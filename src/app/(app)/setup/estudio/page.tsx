'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Building2, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { studioApi } from '@/lib/api/studio'
import { geoApi } from '@/lib/api/geo'
import { useAuthStore } from '@/store/auth.store'
import type { Equipment, AddAvailabilityRule } from '@/types/studio'


const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const inputClass =
  'w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65558F] border-[#65558F] placeholder-[#65558F]/50 text-[#65558F]'
const labelClass = 'block text-sm font-semibold text-[#65558F] mb-1'


type SelectedEquipment = {
  equipment_id: string
  name: string
  category: string | null
  quantity: string
}

type AvailabilityRuleForm = Omit<AddAvailabilityRule, 'timezone'> & { timezone: string }

type RoomForm = {
  id: string
  name: string
  description: string
  capacity: string
  base_hourly_price: string
  min_booking_minutes: string
  equipment: SelectedEquipment[]
  availabilityRules: AvailabilityRuleForm[]
  expanded: boolean
}


function newRoom(id: string): RoomForm {
  return {
    id,
    name: '',
    description: '',
    capacity: '',
    base_hourly_price: '',
    min_booking_minutes: '',
    equipment: [],
    availabilityRules: [],
    expanded: true,
  }
}


export default function SetupEstudioPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')

  const [addressSearch, setAddressSearch] = useState('')
  const [addressResults, setAddressResults] = useState<any[]>([])
  const [selectedPlace, setSelectedPlace] = useState<{ label: string; placeId: string | null; lat: number; lng: number; address: string; city: string; region: string; country: string } | null>(null)

  const [rooms, setRooms] = useState<RoomForm[]>([newRoom('1')])
  const [roomCounter, setRoomCounter] = useState(2)

  const { data: equipmentCatalog = [] } = useQuery({
    queryKey: ['studios', 'equipment', 'catalog'],
    queryFn: studioApi.getEquipmentCatalog,
    staleTime: Infinity,
  })

  const [error, setError] = useState<string | null>(null)


  const searchAddress = async (q: string) => {
    setAddressSearch(q)
    setSelectedPlace(null)
    if (q.length < 3) { setAddressResults([]); return }
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&language=es&limit=5&country=ar`
    const res = await fetch(url)
    const json = await res.json()
    setAddressResults(json.features ?? [])
  }

  const selectAddress = (feature: any) => {
    const [lng, lat] = feature.geometry.coordinates
    const ctx = feature.context ?? []
    const city = ctx.find((c: any) => c.id.startsWith('place'))?.text ?? ''
    const region = ctx.find((c: any) => c.id.startsWith('region'))?.text ?? ''
    const country = ctx.find((c: any) => c.id.startsWith('country'))?.text ?? ''
    setSelectedPlace({
      label: feature.place_name,
      placeId: feature.properties?.mapbox_id ?? null,
      lat,
      lng,
      address: feature.place_name,
      city,
      region,
      country,
    })
    setAddressSearch(feature.place_name)
    setAddressResults([])
  }

  const addRoom = () => {
    setRooms((prev) => [...prev, newRoom(String(roomCounter))])
    setRoomCounter((c) => c + 1)
  }

  const removeRoom = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id))
  }

  const updateRoom = (id: string, patch: Partial<RoomForm>) => {
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const toggleRoom = (id: string) => {
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, expanded: !r.expanded } : r)))
  }


  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('El nombre del estudio es obligatorio.')
      if (rooms.length === 0) throw new Error('Agregá al menos una sala.')
      for (const r of rooms) {
        if (!r.name.trim()) throw new Error('Cada sala debe tener un nombre.')
        if (r.availabilityRules.length === 0)
          throw new Error(`La sala "${r.name}" debe tener al menos una regla de horario.`)
      }

      let place_id: string | null = null
      if (selectedPlace) {
        const place = await geoApi.createPlace({
          name: selectedPlace.label,
          lat: selectedPlace.lat,
          lng: selectedPlace.lng,
          address_line1: selectedPlace.address,
          city: selectedPlace.city,
          region: selectedPlace.region,
          country: selectedPlace.country,
          mapbox_id: selectedPlace.placeId ?? undefined,
        })
        place_id = place.place_id
      }

      const studio = await studioApi.createStudio({
        name: name.trim(),
        description: description.trim() || null,
        phone: phone.trim(),
        place_id,
      })
      const studioId = studio.studio_id

      for (const r of rooms) {
        const room = await studioApi.createRoom(studioId, {
          name: r.name.trim(),
          description: r.description.trim() || null,
          capacity: r.capacity ? parseInt(r.capacity) : null,
          base_hourly_price: r.base_hourly_price ? parseFloat(r.base_hourly_price) : null,
          min_booking_minutes: r.min_booking_minutes ? parseInt(r.min_booking_minutes) : null,
          is_active: true,
        })
        const roomId = room.room_id

        for (const eq of r.equipment) {
          await studioApi.addRoomEquipment(studioId, roomId, {
            equipment_id: eq.equipment_id,
            quantity: eq.quantity || null,
          })
        }

        for (const rule of r.availabilityRules) {
          await studioApi.addAvailabilityRule(studioId, roomId, rule)
        }
      }
    },
    onSuccess: () => {
      if (user) setUser({ ...user, role: 'STUDIO_OWNER' })
      router.push('/dashboard')
    },
    onError: (err: Error) => {
      setError(err.message || 'Ocurrió un error. Intentá de nuevo.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    mutate()
  }


  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center pt-10 pb-16 px-4">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-2xl flex flex-col gap-7">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: '#65558F' }}>
            <Building2 size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#65558F]">Registrá tu estudio</h1>
            <p className="text-sm text-gray-500">
              Completá los datos del estudio y sus salas para comenzar a recibir reservas.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-7">

          <section className="flex flex-col gap-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Datos del estudio
            </p>

            <div>
              <label className={labelClass}>Nombre <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Estudio La Fábrica"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contá qué tiene tu estudio, el ambiente, servicios..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className={labelClass}>Teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. +54 11 1234-5678"
                className={inputClass}
              />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Ubicación
            </p>
            <label className={labelClass}>Dirección</label>
            <div className="relative">
              <input
                type="text"
                value={addressSearch}
                onChange={(e) => searchAddress(e.target.value)}
                placeholder="Buscar dirección..."
                className={inputClass}
              />
              {addressResults.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-[#65558F]/30 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                  {addressResults.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onMouseDown={() => selectAddress(f)}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#65558F]/10 transition-colors text-sm text-[#65558F]"
                    >
                      {f.place_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedPlace && (
              <p className="text-xs text-[#65558F]/70 mt-1">
                ✓ {selectedPlace.label}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Salas <span className="text-red-400">*</span>
              </p>
              <button
                type="button"
                onClick={addRoom}
                className="flex items-center gap-1.5 text-sm font-medium text-[#65558F] hover:opacity-75 transition-opacity"
              >
                <Plus size={16} /> Agregar sala
              </button>
            </div>

            {rooms.map((room, idx) => (
              <RoomSection
                key={room.id}
                room={room}
                index={idx}
                equipmentCatalog={equipmentCatalog}
                canRemove={rooms.length > 1}
                onUpdate={(patch) => updateRoom(room.id, patch)}
                onRemove={() => removeRoom(room.id)}
                onToggle={() => toggleRoom(room.id)}
              />
            ))}
          </section>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full py-3 font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#65558F' }}
          >
            {isPending ? 'Creando estudio...' : 'Crear estudio'}
          </button>
        </form>
      </div>
    </div>
  )
}


function RoomSection({
  room,
  index,
  equipmentCatalog,
  canRemove,
  onUpdate,
  onRemove,
  onToggle,
}: {
  room: RoomForm
  index: number
  equipmentCatalog: Equipment[]
  canRemove: boolean
  onUpdate: (patch: Partial<RoomForm>) => void
  onRemove: () => void
  onToggle: () => void
}) {
  const [equipSearch, setEquipSearch] = useState('')
  const [showEquipDropdown, setShowEquipDropdown] = useState(false)

  const inputClass =
    'w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65558F] border-[#65558F] placeholder-[#65558F]/50 text-[#65558F]'
  const labelClass = 'block text-sm font-semibold text-[#65558F] mb-1'

  const filteredEquipment = useMemo(() => {
    const q = equipSearch.toLowerCase()
    const selectedIds = new Set(room.equipment.map((e) => e.equipment_id))
    return equipmentCatalog
      .filter((e) => !selectedIds.has(e.equipment_id))
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          (e.category ?? '').toLowerCase().includes(q),
      )
      .slice(0, 20)
  }, [equipmentCatalog, equipSearch, room.equipment])

  const addEquipment = (eq: Equipment) => {
    onUpdate({
      equipment: [...room.equipment, { equipment_id: eq.equipment_id, name: eq.name, category: eq.category, quantity: '' }],
    })
    setEquipSearch('')
    setShowEquipDropdown(false)
  }

  const removeEquipment = (id: string) => {
    onUpdate({ equipment: room.equipment.filter((e) => e.equipment_id !== id) })
  }

  const updateEquipmentQuantity = (id: string, quantity: string) => {
    onUpdate({
      equipment: room.equipment.map((e) => (e.equipment_id === id ? { ...e, quantity } : e)),
    })
  }

  const addRule = () => {
    onUpdate({
      availabilityRules: [
        ...room.availabilityRules,
        { day_of_week: 1, start_time: '09:00', end_time: '21:00', timezone: 'America/Argentina/Buenos_Aires' },
      ],
    })
  }

  const removeRule = (idx: number) => {
    onUpdate({ availabilityRules: room.availabilityRules.filter((_, i) => i !== idx) })
  }

  const updateRule = (idx: number, patch: Partial<AvailabilityRuleForm>) => {
    onUpdate({
      availabilityRules: room.availabilityRules.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    })
  }

  return (
    <div className="border border-[#65558F]/30 rounded-xl overflow-hidden">
      {/* Room header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        style={{ backgroundColor: '#65558F10' }}
        onClick={onToggle}
      >
        <span className="font-semibold text-[#65558F] text-sm">
          {room.name || `Sala ${index + 1}`}
        </span>
        <div className="flex items-center gap-2">
          {canRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              className="p-1 rounded-full hover:bg-red-50 text-red-400 transition-colors"
            >
              <X size={15} />
            </button>
          )}
          {room.expanded ? <ChevronUp size={16} className="text-[#65558F]" /> : <ChevronDown size={16} className="text-[#65558F]" />}
        </div>
      </div>

      {room.expanded && (
        <div className="p-4 flex flex-col gap-5">

          {/* Basic fields */}
          <div className="flex flex-col gap-3">
            <div>
              <label className={labelClass}>Nombre <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={room.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="Ej. Sala A"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Descripción</label>
              <textarea
                value={room.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="Describí la sala..."
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Capacidad</label>
                <input
                  type="number"
                  min={1}
                  value={room.capacity}
                  onChange={(e) => onUpdate({ capacity: e.target.value })}
                  placeholder="personas"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Precio / hora</label>
                <input
                  type="number"
                  min={0}
                  value={room.base_hourly_price}
                  onChange={(e) => onUpdate({ base_hourly_price: e.target.value })}
                  placeholder="$"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Mín. minutos</label>
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={room.min_booking_minutes}
                  onChange={(e) => onUpdate({ min_booking_minutes: e.target.value })}
                  placeholder="60"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className={labelClass}>Equipamiento</label>
            <div className="relative">
              <input
                type="text"
                value={equipSearch}
                onChange={(e) => { setEquipSearch(e.target.value); setShowEquipDropdown(true) }}
                onFocus={() => setShowEquipDropdown(true)}
                onBlur={() => setTimeout(() => setShowEquipDropdown(false), 150)}
                placeholder="Buscar equipamiento..."
                className={inputClass}
              />
              {showEquipDropdown && filteredEquipment.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-[#65558F]/30 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredEquipment.map((eq) => (
                    <button
                      key={eq.equipment_id}
                      type="button"
                      onMouseDown={() => addEquipment(eq)}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#65558F]/10 flex justify-between items-center transition-colors"
                    >
                      <span className="text-[#65558F] font-medium text-sm">{eq.name}</span>
                      <span className="text-xs text-gray-400">{eq.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {room.equipment.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                {room.equipment.map((eq) => (
                  <div key={eq.equipment_id} className="flex items-center gap-2 border border-[#65558F]/20 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#65558F] truncate">{eq.name}</p>
                      <p className="text-xs text-gray-400">{eq.category}</p>
                    </div>
                    <input
                      type="text"
                      value={eq.quantity}
                      onChange={(e) => updateEquipmentQuantity(eq.equipment_id, e.target.value)}
                      placeholder="cantidad"
                      className="w-24 border border-[#65558F]/30 rounded-lg px-2 py-1.5 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F]"
                    />
                    <button
                      type="button"
                      onClick={() => removeEquipment(eq.equipment_id)}
                      className="p-1 rounded-full hover:bg-red-50 text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Availability rules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`${labelClass} mb-0`}>
                Horarios <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={addRule}
                className="flex items-center gap-1 text-xs font-medium text-[#65558F] hover:opacity-75 transition-opacity"
              >
                <Plus size={13} /> Agregar día
              </button>
            </div>

            {room.availabilityRules.length === 0 && (
              <p className="text-xs text-gray-400">Sin horarios. Agregá al menos uno.</p>
            )}

            <div className="flex flex-col gap-2">
              {room.availabilityRules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2 flex-wrap">
                  <select
                    value={rule.day_of_week}
                    onChange={(e) => updateRule(i, { day_of_week: parseInt(e.target.value) })}
                    className="border border-[#65558F]/30 rounded-lg px-2 py-2 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F] bg-white"
                  >
                    {DAYS.map((d, idx) => (
                      <option key={idx} value={idx}>{d}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={rule.start_time}
                    onChange={(e) => updateRule(i, { start_time: e.target.value })}
                    className="border border-[#65558F]/30 rounded-lg px-2 py-2 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F]"
                  />
                  <span className="text-xs text-gray-400">a</span>
                  <input
                    type="time"
                    value={rule.end_time}
                    onChange={(e) => updateRule(i, { end_time: e.target.value })}
                    className="border border-[#65558F]/30 rounded-lg px-2 py-2 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F]"
                  />
                  <button
                    type="button"
                    onClick={() => removeRule(i)}
                    className="p-1 rounded-full hover:bg-red-50 text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
