import { client } from './client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BandGenre {
  band_genre_id: string
  genres: { genre_id: string; name: string }
}

export interface BandMember {
  band_member_id: string
  role: string
  status: string
  joined_at: string
  description?: string | null
  users: {
    user_id: string
    username: string
    display_name: string
  }
}

export interface Band {
  band_id: string
  owner_user_id: string
  name: string
  description?: string | null
  is_active?: boolean
  created_at: string
  places?: { place_id: string; city: string; country: string }[]
  band_genres?: BandGenre[]
}

export interface BandInvite {
  invite_id: string
  band_id: string
  from_user_id: string
  to_user_id: string
  message?: string | null
  /** Valores en español: 'Pendiente' | 'Aceptada' | 'Rechazada' | 'Cancelada' */
  status: string
  created_at: string
  responded_at?: string | null
  bands?: { band_id: string; name: string; description?: string | null }
  users_band_invite_from_user_idTousers?: {
    user_id: string
    username: string
    display_name: string
  }
}

export interface BandOpening {
  opening_id: string
  band_id: string
  description?: string | null
  /** 'Abierta' | 'Cerrada' */
  status: string
  created_at: string
  updated_at: string
  instrument?: { instrument_id: string; name: string }
  places?: { place_id: string; city: string; country: string } | null
}


export interface BandMedia {
  kind: string
  sort_order: number | null
  created_at: string
  media: {
    media_id: string
    url: string
    original_filename: string
    media_type: string   // 'image' | 'video' | 'audio'
    mime_type: string
    size_bytes: string
    uploaded_by: string
    created_at: string
  }
}

// ── API ───────────────────────────────────────────────────────────────────────

export const bandsApi = {
  /** Crea una banda. Solo músicos. */
  create: (dto: { name: string; description?: string }) =>
    client.post<Band>('/bands', dto).then(r => r.data),

  /** Bandas donde el usuario es miembro o owner. */
  getMine: () =>
    client.get<Band[]>('/bands/mine').then(r => r.data),

  /** Bandas de otro usuario (públicas). */
  getByUser: (userId: string) =>
    client.get<Band[]>(`/bands/user/${userId}`).then(r => r.data),

  /** Detalle completo de una banda. */
  getById: (bandId: string) =>
    client.get<Band>(`/bands/${bandId}`).then(r => r.data),

  /** Actualiza nombre / descripción (solo owner). */
  update: (bandId: string, dto: { name?: string; description?: string }) =>
    client.patch<Band>(`/bands/${bandId}`, dto).then(r => r.data),

  /** Disuelve la banda (solo owner). */
  delete: (bandId: string) =>
    client.delete(`/bands/${bandId}`).then(r => r.data),

  /** Miembros de una banda. */
  getMembers: (bandId: string) =>
    client.get<BandMember[]>(`/bands/${bandId}/members`).then(r => r.data),

  /** Expulsa a un miembro (solo owner). */
  kickMember: (bandId: string, memberId: string) =>
    client.delete(`/bands/${bandId}/members/${memberId}`).then(r => r.data),

  /** El usuario autenticado abandona la banda. */
  leave: (bandId: string) =>
    client.delete(`/bands/${bandId}/members/me`).then(r => r.data),

  /** Invita a un amigo (solo owner o admin). */
  invite: (bandId: string, dto: { to_user_id: string; message?: string }) =>
    client.post(`/bands/${bandId}/invites`, dto).then(r => r.data),

  /** Invitaciones enviadas de una banda. */
  getBandInvites: (bandId: string) =>
    client.get<BandInvite[]>(`/bands/${bandId}/invites`).then(r => r.data),

  /** Invitaciones recibidas por el usuario. */
  getReceivedInvites: () =>
    client.get<BandInvite[]>('/bands/invites/received').then(r => r.data),

  /** Acepta una invitación. */
  acceptInvite: (inviteId: string) =>
    client.patch(`/bands/invites/${inviteId}/accept`).then(r => r.data),

  /** Rechaza una invitación. */
  rejectInvite: (inviteId: string) =>
    client.patch(`/bands/invites/${inviteId}/reject`).then(r => r.data),

  /** Cancela una invitación enviada. */
  cancelInvite: (inviteId: string) =>
    client.delete(`/bands/invites/${inviteId}`).then(r => r.data),

  // ── Búsquedas / Openings ──────────────────────────────────────────────────

  /** Convocatorias activas de una banda. */
  getOpenings: (bandId: string) =>
    client.get<BandOpening[]>(`/bands/${bandId}/openings`).then(r => r.data),

  /** Publica una búsqueda (solo owner). */
  createOpening: (bandId: string, dto: { instrument_id: string; description?: string }) =>
    client.post<BandOpening>(`/bands/${bandId}/openings`, dto).then(r => r.data),

  /** Elimina una búsqueda (solo owner). */
  deleteOpening: (bandId: string, openingId: string) =>
    client.delete(`/bands/${bandId}/openings/${openingId}`).then(r => r.data),

  /** Postularse a una convocatoria. */
  applyToOpening: (openingId: string, dto?: { message?: string }) =>
    client.post(`/bands/openings/${openingId}/apply`, dto ?? {}).then(r => r.data),
  /** Media de una banda (galería + avatar). */
  getMedia: (bandId: string) =>
    client.get<BandMedia[]>(`/media/bands/${bandId}`).then(r => r.data),

  /** Sube una imagen/video a la banda (cualquier miembro; kind='avatar' solo owner). */
  uploadMedia: (bandId: string, file: File, kind = 'gallery') => {
    const form = new FormData()
    form.append('file', file)
    form.append('kind', kind)
    return client.post<{ message: string; media: BandMedia['media'] }>(
      `/media/bands/${bandId}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ).then(r => r.data)
  },

  /** Elimina una media de la banda (el que subió o el owner). */
  deleteMedia: (bandId: string, mediaId: string) =>
    client.delete(`/media/bands/${bandId}/${mediaId}`).then(r => r.data),

}