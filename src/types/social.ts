export type FriendUser = {
  user_id: string
  username: string
  display_name: string | null
}

export type Friend = {
  friendship_id: string
  friend: FriendUser
  created_at: string
}

export type Follow = {
  target_type: 'user' | 'band' | 'event'
  target_id: string
  created_at: string
}

/** Solicitud recibida (shape directa del backend) */
export type ReceivedRequest = {
  request_id: string
  message: string | null
  status: string
  created_at: string
  from_user: FriendUser
}

/** Solicitud enviada o archivada (shape normalizada) */
export type FriendRequest = {
  request_id: string
  from_user_id: string
  to_user_id: string
  message: string | null
  status: string | null
  created_at: string
  responded_at: string | null
  direction: 'sent' | 'received'
  other_user_id: string
  other_username: string
  other_display_name: string | null
}

export type SocialStatus = {
  user_id: string
  is_me: boolean
  are_friends: boolean
  friendship_id: string | null
  request_status: 'Pendiente' | 'Aceptada' | 'Rechazada' | null
  request_direction: 'sent' | 'received' | null
  request_id: string | null
  is_following: boolean
  is_blocked_by_me: boolean
  has_blocked_me: boolean
}
