'use client'

import { Suspense, useRef, useState, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppNavbar } from '@/components/AppNavbar'
import { useAuthStore } from '@/store/auth.store'
import { studioApi } from '@/lib/api/studio'
import { BookingModal } from '@/components/bookings/BookingModal'
import { ReviewsSection } from '@/components/reviews/ReviewsSection'
import { ReportButton } from '@/components/reviews/ReportButton'
import { RoomBlocksPanel } from '@/components/studio/RoomBlocksPanel'
import { EditStudioModal } from '@/components/studio/EditStudioModal'
import { RoomPickerModal } from '@/components/studio/RoomPickerModal'
import type { Equipment, AddAvailabilityRule } from '@/types/studio'
import {
  Building2, Star, MapPin, Phone, Clock, ImageIcon,
  ChevronDown, ChevronUp, Wrench, Camera, Plus, Pencil,
  CalendarCheck, X,
} from 'lucide-react'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

function staticMapUrl(lat: number, lng: number) {
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+65558f(${lng},${lat})/${lng},${lat},14,0/600x280@2x?access_token=${MAPBOX_TOKEN}`
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={s <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
    </div>
  )
}

type SelectedEquipment = { equipment_id: string; name: string; category: string | null; quantity: string }
type AvailabilityRuleForm = Omit<AddAvailabilityRule, 'timezone'> & { timezone: string }
type RoomFormState = {
  name: string; description: string; capacity: string
  base_hourly_price: string; min_booking_minutes: string
  equipment: SelectedEquipment[]
  availabilityRules: AvailabilityRuleForm[]
}

const DAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const inputClass = 'w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65558F] border-[#65558F] placeholder-[#65558F]/50 text-[#65558F]'
const labelClass = 'block text-sm font-semibold text-[#65558F] mb-1'

function emptyRoomForm(): RoomFormState {
  return { name: '', description: '', capacity: '', base_hourly_price: '', min_booking_minutes: '', equipment: [], availabilityRules: [] }
}

function AddRoomModal({ studioId, equipmentCatalog, onClose }: {
  studioId: string
  equipmentCatalog: Equipment[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<RoomFormState>(emptyRoomForm())
  const [equipSearch, setEquipSearch] = useState('')
  const [showEquipDropdown, setShowEquipDropdown] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredEquipment = useMemo(() => {
    const q = equipSearch.toLowerCase()
    const selectedIds = new Set(form.equipment.map((e) => e.equipment_id))
    return equipmentCatalog
      .filter((e) => !selectedIds.has(e.equipment_id))
      .filter((e) => e.name.toLowerCase().includes(q) || (e.category ?? '').toLowerCase().includes(q))
      .slice(0, 20)
  }, [equipmentCatalog, equipSearch, form.equipment])

  const addEquipment = (eq: Equipment) => {
    setForm((f) => ({ ...f, equipment: [...f.equipment, { equipment_id: eq.equipment_id, name: eq.name, category: eq.category, quantity: '' }] }))
    setEquipSearch('')
    setShowEquipDropdown(false)
  }

  const removeEquipment = (id: string) =>
    setForm((f) => ({ ...f, equipment: f.equipment.filter((e) => e.equipment_id !== id) }))

  const updateEquipmentQuantity = (id: string, quantity: string) =>
    setForm((f) => ({ ...f, equipment: f.equipment.map((e) => e.equipment_id === id ? { ...e, quantity } : e) }))

  const addRule = () =>
    setForm((f) => ({ ...f, availabilityRules: [...f.availabilityRules, { day_of_week: 1, start_time: '09:00', end_time: '21:00', timezone: 'America/Argentina/Buenos_Aires' }] }))

  const removeRule = (i: number) =>
    setForm((f) => ({ ...f, availabilityRules: f.availabilityRules.filter((_, idx) => idx !== i) }))

  const updateRule = (i: number, patch: Partial<AvailabilityRuleForm>) =>
    setForm((f) => ({ ...f, availabilityRules: f.availabilityRules.map((r, idx) => idx === i ? { ...r, ...patch } : r) }))

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('El nombre de la sala es obligatorio.')
      if (form.availabilityRules.length === 0) throw new Error('Agregá al menos una regla de horario.')
      const room = await studioApi.createRoom(studioId, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        base_hourly_price: form.base_hourly_price ? parseFloat(form.base_hourly_price) : null,
        min_booking_minutes: form.min_booking_minutes ? parseInt(form.min_booking_minutes) : null,
        is_active: true
      })
      for (const eq of form.equipment) {
        await studioApi.addRoomEquipment(studioId, room.room_id, { equipment_id: eq.equipment_id, quantity: eq.quantity || null })
      }
      for (const rule of form.availabilityRules) {
        await studioApi.addAvailabilityRule(studioId, room.room_id, rule)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', studioId] })
      onClose()
    },
    onError: (err: Error) => setError(err.message),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-lg font-bold text-[#65558F]">Agregar sala</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto px-6 pb-6 flex flex-col gap-5">
          <div>
            <label className={labelClass}>Nombre <span className="text-red-400">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej. Sala A" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describí la sala..." rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Capacidad</label>
              <input type="number" min={1} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="personas" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Precio / hora</label>
              <input type="number" min={0} value={form.base_hourly_price} onChange={(e) => setForm((f) => ({ ...f, base_hourly_price: e.target.value }))} placeholder="$" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Mín. minutos</label>
              <input type="number" min={15} step={15} value={form.min_booking_minutes} onChange={(e) => setForm((f) => ({ ...f, min_booking_minutes: e.target.value }))} placeholder="60" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Equipamiento</label>
            <div className="relative">
              <input type="text" value={equipSearch} onChange={(e) => { setEquipSearch(e.target.value); setShowEquipDropdown(true) }} onFocus={() => setShowEquipDropdown(true)} onBlur={() => setTimeout(() => setShowEquipDropdown(false), 150)} placeholder="Buscar equipamiento..." className={inputClass} />
              {showEquipDropdown && filteredEquipment.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-[#65558F]/30 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredEquipment.map((eq) => (
                    <button key={eq.equipment_id} type="button" onMouseDown={() => addEquipment(eq)} className="w-full text-left px-4 py-2.5 hover:bg-[#65558F]/10 flex justify-between items-center transition-colors">
                      <span className="text-[#65558F] font-medium text-sm">{eq.name}</span>
                      <span className="text-xs text-gray-400">{eq.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.equipment.length > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                {form.equipment.map((eq) => (
                  <div key={eq.equipment_id} className="flex items-center gap-2 border border-[#65558F]/20 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#65558F] truncate">{eq.name}</p>
                      <p className="text-xs text-gray-400">{eq.category}</p>
                    </div>
                    <input type="text" value={eq.quantity} onChange={(e) => updateEquipmentQuantity(eq.equipment_id, e.target.value)} placeholder="cantidad" className="w-24 border border-[#65558F]/30 rounded-lg px-2 py-1.5 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F]" />
                    <button type="button" onClick={() => removeEquipment(eq.equipment_id)} className="p-1 rounded-full hover:bg-red-50 text-red-400 transition-colors"><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`${labelClass} mb-0`}>Horarios <span className="text-red-400">*</span></label>
              <button type="button" onClick={addRule} className="flex items-center gap-1 text-xs font-medium text-[#65558F] hover:opacity-75 transition-opacity">
                <Plus size={13} /> Agregar día
              </button>
            </div>
            {form.availabilityRules.length === 0 && <p className="text-xs text-gray-400">Sin horarios. Agregá al menos uno.</p>}
            <div className="flex flex-col gap-2">
              {form.availabilityRules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2 flex-wrap">
                  <select value={rule.day_of_week} onChange={(e) => updateRule(i, { day_of_week: parseInt(e.target.value) })} className="border border-[#65558F]/30 rounded-lg px-2 py-2 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F] bg-white">
                    {DAYS_LONG.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
                  </select>
                  <input type="time" value={rule.start_time} onChange={(e) => updateRule(i, { start_time: e.target.value })} className="border border-[#65558F]/30 rounded-lg px-2 py-2 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F]" />
                  <span className="text-xs text-gray-400">a</span>
                  <input type="time" value={rule.end_time} onChange={(e) => updateRule(i, { end_time: e.target.value })} className="border border-[#65558F]/30 rounded-lg px-2 py-2 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F]" />
                  <button type="button" onClick={() => removeRule(i)} className="p-1 rounded-full hover:bg-red-50 text-red-400 transition-colors"><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
          <button onClick={() => mutate()} disabled={isPending} className="rounded-full py-3 font-semibold text-white disabled:opacity-60 transition-opacity" style={{ backgroundColor: '#65558F' }}>
            {isPending ? 'Creando sala...' : 'Crear sala'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditRoomModal({ room, studioId, onClose }: { room: any; studioId: string; onClose: () => void }) {
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    name: room.name ?? '',
    description: room.description ?? '',
    capacity: room.capacity != null ? String(room.capacity) : '',
    base_hourly_price: room.base_hourly_price != null ? String(room.base_hourly_price) : '',
    min_booking_minutes: room.min_booking_minutes != null ? String(room.min_booking_minutes) : '',
    is_active: room.is_active ?? true
  })

  const { data: existingRules = [], isLoading: loadingRules } = useQuery({
    queryKey: ['studio', studioId, 'room', room.room_id, 'rules'],
    queryFn: () => studioApi.getRoomAvailabilityRules(studioId, room.room_id),
    staleTime: Infinity,
  })

  const [deletedRuleIds, setDeletedRuleIds] = useState<string[]>([])
  const [newRules, setNewRules] = useState<{ day_of_week: number; start_time: string; end_time: string; timezone: string }[]>([])
  const [error, setError] = useState<string | null>(null)

  const visibleExisting = existingRules.filter((r: any) => !deletedRuleIds.includes(r.rule_id))

  const addNewRule = () =>
    setNewRules((prev) => [...prev, { day_of_week: 1, start_time: '09:00', end_time: '21:00', timezone: 'America/Argentina/Buenos_Aires' }])

  const removeNewRule = (i: number) =>
    setNewRules((prev) => prev.filter((_, idx) => idx !== i))

  const updateNewRule = (i: number, patch: Partial<typeof newRules[0]>) =>
    setNewRules((prev) => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('El nombre es obligatorio.')
      await studioApi.updateRoom(studioId, room.room_id, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        base_hourly_price: form.base_hourly_price ? parseFloat(form.base_hourly_price) : null,
        min_booking_minutes: form.min_booking_minutes ? parseInt(form.min_booking_minutes) : null,
        is_active: true
      })
      for (const ruleId of deletedRuleIds) {
        await studioApi.deleteAvailabilityRule(studioId, room.room_id, ruleId)
      }
      for (const rule of newRules) {
        await studioApi.addAvailabilityRule(studioId, room.room_id, rule)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', studioId] })
      queryClient.invalidateQueries({ queryKey: ['studio', studioId, 'room', room.room_id, 'rules'] })
      onClose()
    },
    onError: (err: Error) => setError(err.message),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-lg font-bold text-[#65558F]">Editar sala</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto px-6 pb-6 flex flex-col gap-5">
          <div>
            <label className={labelClass}>Nombre <span className="text-red-400">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Descripción</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Capacidad</label>
              <input type="number" min={1} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="personas" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Precio / hora</label>
              <input type="number" min={0} value={form.base_hourly_price} onChange={(e) => setForm((f) => ({ ...f, base_hourly_price: e.target.value }))} placeholder="$" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Mín. minutos</label>
              <input type="number" min={15} step={15} value={form.min_booking_minutes} onChange={(e) => setForm((f) => ({ ...f, min_booking_minutes: e.target.value }))} placeholder="60" className={inputClass} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`${labelClass} mb-0`}>Horarios</label>
              <button type="button" onClick={addNewRule} className="flex items-center gap-1 text-xs font-medium text-[#65558F] hover:opacity-75 transition-opacity">
                <Plus size={13} /> Agregar día
              </button>
            </div>
            {loadingRules ? (
              <p className="text-xs text-gray-400">Cargando horarios...</p>
            ) : (
              <div className="flex flex-col gap-2">
                {visibleExisting.map((r: any) => (
                  <div key={r.rule_id} className="flex items-center gap-2">
                    <span className="border border-[#65558F]/30 rounded-lg px-3 py-2 text-sm text-[#65558F] bg-[#65558F]/5 w-28 shrink-0">
                      {DAYS_LONG[r.day_of_week]}
                    </span>
                    <span className="text-sm text-gray-600 flex-1">{r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}</span>
                    <button type="button" onClick={() => setDeletedRuleIds((ids) => [...ids, r.rule_id])} className="p-1 rounded-full hover:bg-red-50 text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {newRules.map((rule, i) => (
                  <div key={`new-${i}`} className="flex items-center gap-2 flex-wrap">
                    <select value={rule.day_of_week} onChange={(e) => updateNewRule(i, { day_of_week: parseInt(e.target.value) })} className="border border-[#65558F]/30 rounded-lg px-2 py-2 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F] bg-white">
                      {DAYS_LONG.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
                    </select>
                    <input type="time" value={rule.start_time} onChange={(e) => updateNewRule(i, { start_time: e.target.value })} className="border border-[#65558F]/30 rounded-lg px-2 py-2 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F]" />
                    <span className="text-xs text-gray-400">a</span>
                    <input type="time" value={rule.end_time} onChange={(e) => updateNewRule(i, { end_time: e.target.value })} className="border border-[#65558F]/30 rounded-lg px-2 py-2 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F]" />
                    <button type="button" onClick={() => removeNewRule(i)} className="p-1 rounded-full hover:bg-red-50 text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {visibleExisting.length === 0 && newRules.length === 0 && (
                  <p className="text-xs text-gray-400">Sin horarios. Usá "Agregar día" para añadir.</p>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
          <button onClick={() => mutate()} disabled={isPending} className="rounded-full py-3 font-semibold text-white disabled:opacity-60 transition-opacity" style={{ backgroundColor: '#65558F' }}>
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}


function RoomCard({ room, studioId, isMusician, isOwner }: { room: any; studioId: string; isMusician: boolean; isOwner: boolean }) {
  const [editOpen, setEditOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)

  const { data: rules = [] } = useQuery({
    queryKey: ['studio', studioId, 'room', room.room_id, 'rules'],
    queryFn: () => studioApi.getRoomAvailabilityRules(studioId, room.room_id),
    enabled: expanded,
    staleTime: Infinity,
  })

  const { data: equipment = [] } = useQuery({
    queryKey: ['studio', studioId, 'room', room.room_id, 'equipment'],
    queryFn: () => studioApi.getRoomEquipment(studioId, room.room_id),
    enabled: expanded,
    staleTime: Infinity,
  })

  return (
    <div className="border border-[#65558F]/20 rounded-xl overflow-hidden">
      {editOpen && <EditRoomModal room={room} studioId={studioId} onClose={() => setEditOpen(false)} />}
      {bookingOpen && <BookingModal studioId={studioId} room={room} onClose={() => setBookingOpen(false)} />}
      <div
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#65558F]/5 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="text-left">
          <p className="font-semibold text-[#65558F] text-sm">{room.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {room.capacity && (
              <span className="text-xs text-gray-400">{room.capacity} personas</span>
            )}
            {room.base_hourly_price && (
              <span className="text-xs font-medium text-[#65558F]">
                ${room.base_hourly_price.toLocaleString('es-AR')}/h
              </span>
            )}
            {room.min_booking_minutes && (
              <span className="text-xs text-gray-400">mín. {room.min_booking_minutes} min</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isOwner && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditOpen(true) }}
              className="p-1.5 rounded-full hover:bg-[#65558F]/10 text-[#65558F] transition-colors"
            >
              <Pencil size={13} />
            </button>
          )}
          {expanded
            ? <ChevronUp size={16} className="text-[#65558F]" />
            : <ChevronDown size={16} className="text-[#65558F]" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-[#65558F]/10">

          {room.description && (
            <p className="text-sm text-gray-600 pt-3 leading-relaxed">{room.description}</p>
          )}

          {/* Horarios */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock size={13} className="text-[#65558F]" />
              <span className="text-xs font-semibold text-[#65558F] uppercase tracking-wide">Horarios</span>
            </div>
            {rules.length === 0 ? (
              <p className="text-xs text-gray-400">Sin horarios cargados.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {rules.map((r: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-8 font-medium text-[#65558F] text-xs">{DAYS[r.day_of_week]}</span>
                    <span>{r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bloqueos puntuales (CU25) – solo el dueño */}
          {isOwner && <RoomBlocksPanel studioId={studioId} roomId={room.room_id} />}

          {/* Equipamiento */}
          {equipment.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Wrench size={13} className="text-[#65558F]" />
                <span className="text-xs font-semibold text-[#65558F] uppercase tracking-wide">Equipamiento</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {equipment.map((eq: any, i: number) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full text-xs border border-[#65558F]/30 text-[#65558F]"
                  >
                    {eq.equipment?.name ?? eq.name}
                    {eq.quantity && <span className="opacity-60 ml-1">× {eq.quantity}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isMusician && (
            <button
              type="button"
              onClick={() => setBookingOpen(true)}
              disabled={!room.base_hourly_price}
              title={!room.base_hourly_price ? 'La sala todavía no tiene precio configurado' : undefined}
              className="mt-1 w-full disabled:opacity-50 disabled:cursor-not-allowed rounded-full py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#65558F' }}
            >
              <CalendarCheck size={15} />
              Reservar esta sala
            </button>
          )}

        </div>
      )}
    </div>
  )
}


export default function EstudioPage() {
  return (
    <Suspense>
      <EstudioPageInner />
    </Suspense>
  )
}

function EstudioPageInner() {
  const params = useParams()
  const studioId = params.studioId as string
  const searchParams = useSearchParams()
  const [editStudioOpen, setEditStudioOpen] = useState(false)
  // Viene de "Reservar" en la búsqueda: abrir directamente la elección de sala
  const [roomPickerOpen, setRoomPickerOpen] = useState(searchParams.get('reservar') === '1')
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const [addRoomOpen, setAddRoomOpen] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string } | null>(null)

  const { data: studio, isLoading: loadingStudio } = useQuery({
    queryKey: ['studio', studioId],
    queryFn: () => studioApi.getStudioById(studioId),
    enabled: !!studioId,
  })

  const { data: reviewsData } = useQuery({
    queryKey: ['studio', studioId, 'reviews'],
    queryFn: () => studioApi.getStudioReviews(studioId),
    enabled: !!studioId,
  })

  const { data: media = [] } = useQuery({
    queryKey: ['studio', studioId, 'media'],
    queryFn: () => studioApi.getStudioMedia(studioId),
    enabled: !!studioId,
  })

  const { data: equipmentCatalog = [] } = useQuery({
    queryKey: ['studios', 'equipment', 'catalog'],
    queryFn: studioApi.getEquipmentCatalog,
    staleTime: Infinity,
    enabled: addRoomOpen,
  })

  const { mutate: uploadAvatar, isPending: uploadingAvatar } = useMutation({
    mutationFn: (file: File) => studioApi.uploadStudioAvatar(studioId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['studio', studioId] }),
  })

  const { mutate: uploadStudioMedia, isPending: uploadingMedia } = useMutation({
    mutationFn: (file: File) => studioApi.uploadStudioMedia(studioId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['studio', studioId, 'media'] }),
  })

  const { mutate: deleteStudioMedia } = useMutation({
    mutationFn: (mediaId: string) => studioApi.deleteStudioMedia(studioId, mediaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['studio', studioId, 'media'] }),
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadAvatar(file)
  }

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadStudioMedia(file)
    e.target.value = ''
  }

  const isOwner = currentUser?.userId === studio?.owner_user_id
  const isMusician = currentUser?.role === 'MUSICIAN'

  const place = studio?.places
  const rooms: any[] = studio?.rehearsal_rooms ?? []
  const avgRating: number = Number(reviewsData?.average_rating ?? 0)
  const totalReviews: number = reviewsData?.total_reviews ?? 0

  const avatarUrl = studio?.profile_picture_url
    ? `${API_URL}${studio.profile_picture_url}`
    : null

  const locationLabel = place
    ? [place.address_line1, place.city, place.region].filter(Boolean).join(', ')
    : null

  if (loadingStudio) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AppNavbar />
        <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm h-40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!studio) {
    return (
      <div className="min-h-screen bg-gray-100">
        <AppNavbar />
        <div className="max-w-5xl mx-auto px-4 py-20 text-center text-gray-500">
          Estudio no encontrado.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AppNavbar />
      {editStudioOpen && studio && <EditStudioModal studio={studio} onClose={() => setEditStudioOpen(false)} />}
      {roomPickerOpen && studio && isMusician && (
        <RoomPickerModal
          studioId={studioId}
          studioName={studio.name}
          rooms={rooms}
          onClose={() => setRoomPickerOpen(false)}
        />
      )}

      {addRoomOpen && (
        <AddRoomModal
          studioId={studioId}
          equipmentCatalog={equipmentCatalog}
          onClose={() => setAddRoomOpen(false)}
        />
      )}

      <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">

        {/* ── Header card ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="h-36 sm:h-48" style={{ backgroundColor: '#65558F' }} />

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="-mt-12 mb-4">
              <div className="relative w-24 h-24 group inline-block">
                {isOwner && (
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={avatarInputRef}
                    onChange={handleAvatarChange}
                  />
                )}
                <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-md overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#65558F' }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 size={36} className="text-white" />
                  )}
                </div>
                {isOwner && (
                  <div
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 rounded-2xl border-4 border-white bg-black/40 flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploadingAvatar
                      ? <span className="text-white text-[10px]">Subiendo...</span>
                      : <>
                          <Camera size={16} className="text-white" />
                          <span className="text-white text-[10px] font-semibold">Cambiar foto</span>
                        </>
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Nombre + acciones */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{studio.name}</h1>
                {locationLabel && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <MapPin size={12} /> {locationLabel}
                  </p>
                )}
                {studio.phone && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Phone size={12} /> {studio.phone}
                  </p>
                )}
                {totalReviews > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <StarRating rating={avgRating} />
                    <span className="text-xs text-gray-500">
                      {avgRating.toFixed(1)} · {totalReviews} reseña{totalReviews !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {!isOwner && (
                <div className="flex items-center gap-2 shrink-0">
                  {isMusician && (
                    <button
                      onClick={() => setRoomPickerOpen(true)}
                      className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white"
                      style={{ backgroundColor: '#65558F' }}
                    >
                      <CalendarCheck size={14} /> Reservar
                    </button>
                  )}
                  <ReportButton targetType="studio" targetId={studioId} variant="icon" />
                </div>
              )}

              {isOwner && (
                <button
                  onClick={() => setEditStudioOpen(true)}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold border-2 transition-colors hover:bg-[#65558F]/10 shrink-0"
                  style={{ borderColor: '#65558F', color: '#65558F' }}
                >
                  <Pencil size={13} /> Editar estudio
                </button>
              )}
            </div>

            {studio.description && (
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{studio.description}</p>
            )}
          </div>
        </div>

        {/* ── Mapa estático ────────────────────────────────────────────────── */}
        {place?.lat && place?.lng && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-3 flex items-center gap-2">
              <MapPin size={16} style={{ color: '#65558F' }} />
              <h2 className="text-base font-bold text-gray-900">Ubicación</h2>
            </div>
            <img
              src={staticMapUrl(place.lat, place.lng)}
              alt="Mapa del estudio"
              className="w-full object-cover"
              style={{ maxHeight: 280 }}
            />
            {locationLabel && (
              <p className="text-xs text-gray-400 px-6 py-3">{locationLabel}</p>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={18} style={{ color: '#65558F' }} />
              <h2 className="text-base font-bold text-gray-900">Salas disponibles</h2>
              <span className="text-sm text-gray-400 ml-1">({rooms.length})</span>
            </div>
            {isOwner && (
              <button
                onClick={() => setAddRoomOpen(true)}
                className="flex items-center gap-1.5 text-sm font-semibold rounded-full px-4 py-1.5 border-2 transition-colors hover:bg-[#65558F]/10"
                style={{ borderColor: '#65558F', color: '#65558F' }}
              >
                <Plus size={14} /> Agregar sala
              </button>
            )}
          </div>

          {rooms.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin salas cargadas.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {rooms.map((room) => (
                <RoomCard key={room.room_id} room={room} studioId={studioId} isMusician={isMusician} isOwner={isOwner} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Camera size={18} style={{ color: '#65558F' }} />
              <h2 className="text-base font-bold text-gray-900">Galería</h2>
            </div>
            {isOwner && (
              <>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4"
                  className="hidden"
                  ref={mediaInputRef}
                  onChange={handleMediaChange}
                />
                <button
                  onClick={() => mediaInputRef.current?.click()}
                  disabled={uploadingMedia}
                  className="flex items-center gap-1.5 text-sm font-semibold rounded-full px-4 py-1.5 border-2 transition-colors hover:bg-[#65558F]/10 disabled:opacity-60"
                  style={{ borderColor: '#65558F', color: '#65558F' }}
                >
                  <Plus size={14} />
                  {uploadingMedia ? 'Subiendo...' : 'Agregar'}
                </button>
              </>
            )}
          </div>

          {media.length > 0 ? (
            <div className="grid grid-cols-4 gap-1.5">
              {media.map((m: any, i: number) => (
                <div
                  key={m.media?.media_id ?? i}
                  className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group cursor-pointer"
                  onClick={() => setSelectedMedia({ url: `${API_URL}${m.media.url}`, type: m.media.media_type })}
                >
                  {m.media.media_type === 'image' ? (
                    <img src={`${API_URL}${m.media.url}`} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                  ) : (
                    <video src={`${API_URL}${m.media.url}`} className="w-full h-full object-cover" muted />
                  )}
                  {isOwner && m.media?.media_id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteStudioMedia(m.media.media_id) }}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/90"
                      title="Eliminar"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-300">
              <ImageIcon size={56} strokeWidth={1} />
              <p className="text-sm text-gray-400">
                {isOwner ? 'Todavía no subiste fotos ni videos.' : 'Todavía no hay fotos ni videos.'}
              </p>
            </div>
          )}
        </div>

        {/* ── Reseñas (CU34 / CU44) ──────────────────────────────────────── */}
        <ReviewsSection
          target={{ type: 'studio', id: studioId }}
          canWrite={!isOwner && isMusician}
          emptyText={isOwner ? 'Todavía no recibiste reseñas.' : 'Este estudio aún no tiene reseñas.'}
          writeHint="Podés calificar la sala después de completar una reserva."
        />

      </main>

      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setSelectedMedia(null)}
        >
          <button
            onClick={() => setSelectedMedia(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={22} />
          </button>
          <div
            className="max-w-3xl w-full mx-4 max-h-[88vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedMedia.type === 'image' ? (
              <img
                src={selectedMedia.url}
                alt=""
                className="max-w-full max-h-[88vh] rounded-xl object-contain shadow-2xl"
              />
            ) : (
              <video
                src={selectedMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-[88vh] rounded-xl shadow-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
