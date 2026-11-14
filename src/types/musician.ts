export type Instrument = {
  instrument_id: string
  name: string
  category: string
}

export type Genre = {
  genre_id: string
  name: string
}

export type InstrumentLevel = 'Principiante' | 'Intermedio' | 'Avanzado' | 'Profesional'

export type SelectedInstrument = {
  instrument_id: string
  name: string
  category: string
  level: InstrumentLevel
}

export type MusicianProfileInstrument = {
  musician_instrument_id?: string
  level: string | null
  is_primary: boolean
  instrument: {
    instrument_id?: string
    name: string
    category: string
  }
}

export type MusicianProfileGenre = {
  genres: {
    genre_id: string
    name: string
  }
}

export type UserMedia = {
  kind: string
  sort_order: number
  media: {
    media_id?: string
    url: string
    media_type: string
    mime_type: string
  }
}

export type MusicianProfile = {
  user_id: string
  username: string
  display_name: string | null
  bio: string | null
  profile_visibility: string | null
  profile_picture_url: string | null
  created_at: string
  places: {
    city: string | null
    region: string | null
    country: string | null
  } | null
  musician_profile: {
    musician_id: string
    years_experience: number
    skill_summary: string | null
  } | null
  musician_instrument: MusicianProfileInstrument[]
  musician_genre: MusicianProfileGenre[]
  user_media: UserMedia[]
}