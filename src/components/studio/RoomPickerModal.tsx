'use client'

import { useState } from 'react'
import { X, Users, Clock, ChevronRight } from 'lucide-react'
import { BookingModal, type BookableRoom } from '@/components/bookings/BookingModal'
import { formatMoney } from '@/lib/booking-format'

type PickableRoom = BookableRoom & { capacity?: number | null; is_active?: boolean | null; description?: string | null }

/**
 * Al tocar "Reservar" desde la búsqueda: si el estudio tiene una sola sala
 * reservable se abre directo la reserva; si tiene varias, primero se elige la sala.
 */
export function RoomPickerModal({
  studioId,
  studioName,
  rooms,
  onClose,
}: {
  studioId: string
  studioName: string
  rooms: PickableRoom[]
  onClose: () => void
}) {
  const bookable = rooms.filter((r) => r.is_active !== false && r.base_hourly_price != null)
  const [selected, setSelected] = useState<PickableRoom | null>(bookable.length === 1 ? bookable[0] : null)

  if (selected) {
    return <BookingModal studioId={studioId} room={selected} onClose={onClose} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#65558F]">Elegí una sala</h2>
            <p className="text-xs text-gray-400">{studioName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="px-6 pb-6 flex flex-col gap-2 overflow-y-auto">
          {bookable.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Este estudio todavía no tiene salas disponibles para reservar.</p>
          ) : (
            bookable.map((r) => (
              <button
                key={r.room_id}
                onClick={() => setSelected(r)}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#65558F]/20 px-4 py-3 text-left hover:bg-[#65558F]/5 transition-colors"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-[#65558F]">{r.name}</span>
                  <span className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    <span className="font-semibold text-gray-700">{formatMoney(r.base_hourly_price)}/h</span>
                    {r.capacity && <span className="flex items-center gap-1"><Users size={11} />{r.capacity}</span>}
                    {r.min_booking_minutes && <span className="flex items-center gap-1"><Clock size={11} />mín. {r.min_booking_minutes} min</span>}
                  </span>
                </span>
                <ChevronRight size={16} className="text-[#65558F] shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
