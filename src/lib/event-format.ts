import type { BandEvent, EventPlace } from '@/lib/api/events'

/** Los eventos guardan fecha/hora reales (con zona), así que se muestran en hora local. */
export function formatEventDate(iso: string | null) {
  if (!iso) return 'Fecha a confirmar'
  return new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatEventShortDate(iso: string | null) {
  if (!iso) return { day: '--', month: '' }
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString('es-AR', { day: '2-digit' }),
    month: d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''),
  }
}

export function formatEventTime(start: string | null, end?: string | null) {
  if (!start) return ''
  const f = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  return end ? `${f(start)} – ${f(end)}` : f(start)
}

export function formatPlace(place: EventPlace | null) {
  if (!place) return 'Lugar a confirmar'
  return [place.name, place.city].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ')
}

export function hostName(event: BandEvent) {
  return event.bands?.name ?? event.users.display_name ?? event.users.username
}

export function eventHasStarted(event: BandEvent) {
  return !!event.starts_at && new Date(event.starts_at).getTime() <= Date.now()
}

export function eventHasEnded(event: BandEvent) {
  const end = event.ends_at ?? event.starts_at
  return !!end && new Date(end).getTime() <= Date.now()
}

/** ISO → valor para <input type="datetime-local"> en hora local. */
export function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Valor de <input type="datetime-local"> (hora local) → ISO UTC. */
export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : undefined
}

/** Archivo .ics para agregar el evento a cualquier calendario (CU60). */
export function downloadIcs(event: BandEvent, url: string) {
  if (!event.starts_at) return
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const end = event.ends_at ?? new Date(new Date(event.starts_at).getTime() + 2 * 3600_000).toISOString()
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
  const location = event.places ? [event.places.name, event.places.address_line1, event.places.city].filter(Boolean).join(', ') : ''
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BandLink//Eventos//ES',
    'BEGIN:VEVENT',
    `UID:${event.event_id}@bandlink`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(event.starts_at)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(event.title)}`,
    event.description ? `DESCRIPTION:${esc(event.description)}\\n\\n${url}` : `DESCRIPTION:${url}`,
    location ? `LOCATION:${esc(location)}` : '',
    `URL:${url}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(event.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${event.title.replace(/[^\w\- ]+/g, '').trim() || 'evento'}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}

export function googleCalendarUrl(event: BandEvent, url: string) {
  if (!event.starts_at) return null
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const end = event.ends_at ?? new Date(new Date(event.starts_at).getTime() + 2 * 3600_000).toISOString()
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${fmt(event.starts_at)}/${fmt(end)}`,
    details: `${event.description ?? ''}\n\n${url}`.trim(),
    location: event.places ? [event.places.name, event.places.city].filter(Boolean).join(', ') : '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
