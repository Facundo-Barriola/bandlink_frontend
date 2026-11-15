import { client } from './client'
import type { CreatePlaceDTO } from '@/types/geo'

export type NearbyType = 'all' | 'musicians' | 'studios' | 'events'

export interface NearbyStudio {
  studio_id: string
  name: string
  description: string | null
  place_id: string
  lat: number | string
  lng: number | string
  city: string | null
  country: string | null
  distance_m: number
}

export interface NearbyEvent {
  event_id: string
  title: string
  starts_at: string | null
  ends_at: string | null
  place_id: string
  lat: number | string
  lng: number | string
  city: string | null
  country: string | null
  distance_m: number
}

export interface NearbyUser {
  user_id: string
  username: string
  display_name: string | null
  lat: number
  lng: number
  distance_km: number
}

export interface NearbyResponse {
  center: { lat: number; lng: number }
  radius_km: number
  type: NearbyType
  results: { studios: NearbyStudio[]; events: NearbyEvent[]; users: NearbyUser[] }
}

export const geoApi = {
  createPlace: (dto: CreatePlaceDTO) =>
    client.post('/geo/places', dto).then((r) => r.data),

  /** CU48/49/50: músicos, salas y eventos dentro de un radio (máx. 30 km). */
  nearby: (params: { lat: number; lng: number; radius_km: number; type?: NearbyType }) =>
    client.get<NearbyResponse>('/geo/nearby', { params }).then((r) => r.data),

  /** CU47: compartir mi ubicación para aparecer como músico cercano. */
  setMyLocation: (lat: number, lng: number) =>
    client.put('/geo/location', { lat, lng }).then((r) => r.data),

  removeMyLocation: () => client.delete('/geo/location').then((r) => r.data),
}
