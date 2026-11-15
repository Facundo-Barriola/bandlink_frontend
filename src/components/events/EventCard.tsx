'use client'

import Link from 'next/link'
import { MapPin, Clock, Users, Lock, Ban } from 'lucide-react'
import type { BandEvent } from '@/lib/api/events'
import { eventHasEnded, formatEventShortDate, formatEventTime, formatPlace, hostName } from '@/lib/event-format'

export function EventCard({ event, footer }: { event: BandEvent; footer?: React.ReactNode }) {
  const { day, month } = formatEventShortDate(event.starts_at)
  const ended = eventHasEnded(event)
  const attending = event._count?.event_attendees ?? 0

  return (
    <div className={`border border-gray-100 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow ${ended || event.is_cancelled ? 'opacity-70' : ''}`}>
      <Link href={`/eventos/${event.event_id}`} className="flex gap-4 p-4">
        <div className="w-14 shrink-0 rounded-xl flex flex-col items-center justify-center py-2" style={{ backgroundColor: '#65558F1A' }}>
          <span className="text-xl font-bold text-[#65558F] leading-none">{day}</span>
          <span className="text-[11px] uppercase font-semibold text-[#65558F]/80">{month}</span>
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 truncate">{event.title}</p>
            {event.visibility === 'private' && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"><Lock size={10} /> Privado</span>
            )}
            {event.is_cancelled && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600"><Ban size={10} /> Cancelado</span>
            )}
            {!event.is_cancelled && ended && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Finalizado</span>
            )}
          </div>
          <p className="text-xs text-gray-500">por {hostName(event)}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            {event.starts_at && <span className="flex items-center gap-1"><Clock size={12} />{formatEventTime(event.starts_at, event.ends_at)}</span>}
            <span className="flex items-center gap-1 min-w-0"><MapPin size={12} className="shrink-0" /><span className="truncate">{formatPlace(event.places)}</span></span>
            <span className="flex items-center gap-1">
              <Users size={12} />
              {attending}{event.capacity ? ` / ${event.capacity}` : ''} asistentes
            </span>
          </div>
        </div>
      </Link>
      {footer && <div className="border-t border-gray-100 px-4 py-2.5">{footer}</div>}
    </div>
  )
}
