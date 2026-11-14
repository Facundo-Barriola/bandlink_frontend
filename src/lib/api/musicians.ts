import { client } from './client'
import type { Instrument, Genre, MusicianProfile } from '@/types/musician'

export const musiciansApi = {
  getInstrumentCatalog: () =>
    client.get<Instrument[]>('/musicians/catalog/instruments').then((r) => r.data),

  getGenreCatalog: () =>
    client.get<Genre[]>('/musicians/catalog/genres').then((r) => r.data),

  createProfile: (dto: { experience?: number; summary?: string }) =>
    client.post('/musicians', dto).then((r) => r.data),

  getMyProfile: () =>
    client.get<MusicianProfile>('/musicians/profile').then((r) => r.data),

  getMusicianByUserId: (userId: string) =>
    client.get<MusicianProfile>(`/musicians/profile/${userId}`).then((r) => r.data),

  updateProfile: (dto: {
    display_name?: string
    bio?: string
    phone?: string
    profile_visibility?: string
    years_experience?: number
    skill_summary?: string
  }) =>
    client.patch('/musicians/profile', dto).then((r) => r.data),

  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return client.patch<{ profile_picture_url: string }>('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  addInstrument: (dto: {
    instrument_id: string
    level?: string
    is_primary?: boolean
  }) =>
    client.post('/musicians/profile/instruments', dto).then((r) => r.data),

  addGenres: (genre_ids: string[]) =>
    client.post('/musicians/profile/genres', { genre_ids }).then((r) => r.data),

  removeInstrument: (musicianInstrumentId: string) =>
    client.delete(`/musicians/profile/instruments/${musicianInstrumentId}`).then((r) => r.data),

  removeGenre: (genreId: string) =>
    client.delete(`/musicians/profile/genres/${genreId}`).then((r) => r.data),

  uploadUserMedia: (file: File, kind = 'gallery') => {
    const form = new FormData()
    form.append('file', file)
    form.append('kind', kind)
    return client.post('/media/users/me', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  listUserMedia: () =>
    client.get<any[]>('/media/users/me').then((r) => r.data),

  deleteUserMedia: (mediaId: string) =>
    client.delete(`/media/users/me/${mediaId}`).then((r) => r.data),
}