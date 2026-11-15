'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

export type MapItemType = 'musician' | 'studio' | 'event'

export interface MapItem {
  id: string
  type: MapItemType
  lat: number
  lng: number
  title: string
  subtitle?: string
  href: string
}

export const TYPE_COLOR: Record<MapItemType, string> = {
  musician: '#65558F',
  studio: '#0E9F6E',
  event: '#E8590C',
}

const TYPE_LABEL: Record<MapItemType, string> = {
  musician: 'Músico',
  studio: 'Sala de ensayo',
  event: 'Evento',
}

interface Props {
  center: { lat: number; lng: number }
  radiusKm: number
  userPos: { lat: number; lng: number } | null
  items: MapItem[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Se llama cuando el usuario mueve el mapa a mano (para "Buscar en esta zona"). */
  onUserMove: (center: { lat: number; lng: number }) => void
}

/** Polígono aproximado de un círculo de `radiusKm` alrededor de `center`. */
function circlePolygon(center: { lat: number; lng: number }, radiusKm: number, steps = 64) {
  const coords: [number, number][] = []
  const latR = radiusKm / 110.574
  const lngR = radiusKm / (111.32 * Math.cos((center.lat * Math.PI) / 180))
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI
    coords.push([center.lng + lngR * Math.cos(t), center.lat + latR * Math.sin(t)])
  }
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [coords] } }
}

function boundsOf(center: { lat: number; lng: number }, radiusKm: number): mapboxgl.LngLatBoundsLike {
  const latR = radiusKm / 110.574
  const lngR = radiusKm / (111.32 * Math.cos((center.lat * Math.PI) / 180))
  return [[center.lng - lngR, center.lat - latR], [center.lng + lngR, center.lat + latR]]
}

/** Contenido del popup armado con DOM (sin innerHTML, para evitar XSS con títulos de usuarios). */
function popupContent(item: MapItem) {
  const root = document.createElement('div')
  root.style.cssText = 'font-family:inherit;min-width:160px'
  const tag = document.createElement('div')
  tag.textContent = TYPE_LABEL[item.type]
  tag.style.cssText = `font-size:10px;font-weight:700;text-transform:uppercase;color:${TYPE_COLOR[item.type]};margin-bottom:2px`
  const title = document.createElement('div')
  title.textContent = item.title
  title.style.cssText = 'font-size:14px;font-weight:700;color:#111827'
  root.append(tag, title)
  if (item.subtitle) {
    const sub = document.createElement('div')
    sub.textContent = item.subtitle
    sub.style.cssText = 'font-size:12px;color:#6B7280;margin-top:2px'
    root.append(sub)
  }
  const link = document.createElement('a')
  link.href = item.href
  link.textContent = 'Ver detalle →'
  link.style.cssText = 'display:inline-block;margin-top:6px;font-size:12px;font-weight:600;color:#65558F'
  root.append(link)
  return root
}

function markerEl(item: MapItem, selected: boolean) {
  const el = document.createElement('button')
  el.type = 'button'
  el.setAttribute('aria-label', `${TYPE_LABEL[item.type]}: ${item.title}`)
  const size = selected ? 22 : 16
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:9999px;background:${TYPE_COLOR[item.type]};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35);cursor:pointer;padding:0`
  return el
}

export default function NearbyMap({ center, radiusKm, userPos, items, selectedId, onSelect, onUserMove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const loadedRef = useRef(false)
  const markersRef = useRef<Map<string, { marker: mapboxgl.Marker; popup: mapboxgl.Popup }>>(new Map())
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const onUserMoveRef = useRef(onUserMove)
  const onSelectRef = useRef(onSelect)

  useEffect(() => {
    onUserMoveRef.current = onUserMove
    onSelectRef.current = onSelect
  }, [onUserMove, onSelect])

  // ── Inicialización ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [center.lng, center.lat],
      zoom: 12,
      language: 'es',
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => {
      map.addSource('radius', { type: 'geojson', data: circlePolygon(center, radiusKm) })
      map.addLayer({ id: 'radius-fill', type: 'fill', source: 'radius', paint: { 'fill-color': '#65558F', 'fill-opacity': 0.08 } })
      map.addLayer({ id: 'radius-line', type: 'line', source: 'radius', paint: { 'line-color': '#65558F', 'line-width': 2, 'line-dasharray': [2, 2] } })
      loadedRef.current = true
      map.fitBounds(boundsOf(center, radiusKm), { padding: 40, duration: 0 })
    })
    map.on('moveend', (e) => {
      // Solo movimientos hechos por el usuario (arrastrar / zoom), no los programáticos
      if ((e as { originalEvent?: unknown }).originalEvent) {
        const c = map.getCenter()
        onUserMoveRef.current({ lat: c.lat, lng: c.lng })
      }
    })
    map.on('click', () => onSelectRef.current(null))
    mapRef.current = map
    const markers = markersRef.current
    return () => {
      markers.forEach(({ marker }) => marker.remove())
      markers.clear()
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
    // Se inicializa una sola vez; los cambios se aplican en los efectos de abajo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Centro / radio de búsqueda ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      const src = map.getSource('radius') as mapboxgl.GeoJSONSource | undefined
      src?.setData(circlePolygon(center, radiusKm))
      map.fitBounds(boundsOf(center, radiusKm), { padding: 40, duration: 600 })
    }
    if (loadedRef.current) apply()
    else map.once('load', apply)
  }, [center, radiusKm])

  // ── Posición del usuario ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    userMarkerRef.current?.remove()
    userMarkerRef.current = null
    if (!userPos) return
    const el = document.createElement('div')
    el.title = 'Tu ubicación'
    el.style.cssText = 'width:16px;height:16px;border-radius:9999px;background:#2563EB;border:3px solid white;box-shadow:0 0 0 6px rgba(37,99,235,.25)'
    userMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([userPos.lng, userPos.lat]).addTo(map)
  }, [userPos])

  // ── Marcadores de resultados ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const current = markersRef.current
    current.forEach(({ marker }) => marker.remove())
    current.clear()
    for (const item of items) {
      const popup = new mapboxgl.Popup({ offset: 14, closeButton: false, maxWidth: '240px' }).setDOMContent(popupContent(item))
      const el = markerEl(item, item.id === selectedId)
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        onSelectRef.current(item.id)
      })
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([item.lng, item.lat]).setPopup(popup).addTo(map)
      current.set(item.id, { marker, popup })
    }
  }, [items, selectedId])

  // ── Selección desde la lista ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) return
    const entry = markersRef.current.get(selectedId)
    if (!entry) return
    map.flyTo({ center: entry.marker.getLngLat(), zoom: Math.max(map.getZoom(), 14), duration: 600 })
    if (!entry.popup.isOpen()) entry.marker.togglePopup()
  }, [selectedId, items])

  return <div ref={containerRef} className="w-full h-full" />
}
