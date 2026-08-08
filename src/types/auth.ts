
export type LoginDTO = {
  email: string
  password: string
}

export type RegisterDTO = {
  email: string
  password: string           
  username: string           
  display_name: string       
  bio?: string              
  phone?: string           
  birthdate?: string        
}

export type ForgotPasswordDTO = {
  email: string
}

export type ResetPasswordDTO = {
  token: string
  newPassword: string
}

export type ChangePasswordDTO = {
  currentPassword: string
  newPassword: string
}

export type AuthUser = {
  userId: string
  email: string
  username: string
  displayName: string
  emailVerified: boolean
  role: 'musician' | 'studio' | null
}

export type AuthMe = {
  userId: string
  email: string
  username: string
  sessionId: string
  emailVerified: boolean
}

export type AuthTokens = {
  access_token: string
  refresh_token: string
  session_id: string
  refresh_expires_at: string
}

export type AuthResponse = AuthTokens & {
  message?: string
  user: AuthUser
}