import { client } from './client'
import type {
  LoginDTO,
  RegisterDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  ChangePasswordDTO,
  AuthTokens,
  AuthMe,
  AuthResponse,
} from '@/types/auth'


export const authApi = {

  login: (dto: LoginDTO) =>
    client
      .post<AuthResponse>('/auth/login', dto)
      .then((r) => r.data),

  register: (dto: RegisterDTO) =>
    client.post('/auth/register', dto).then((r) => r.data),

  forgotPassword: (dto: ForgotPasswordDTO) =>
    client.post('/auth/forgotPassword', dto).then((r) => r.data),

  resetPassword: (dto: ResetPasswordDTO) =>
    client.post('/auth/resetPassword', dto).then((r) => r.data),

  changePassword: (dto: ChangePasswordDTO) =>
    client.post('/auth/change-password', dto).then((r) => r.data),

  verifyEmail: (token: string) =>
    client.post('/auth/verifyEmail', { token }).then((r) => r.data),

  resendVerification: () =>
    client.post('/auth/resend-verification').then((r) => r.data),

  refresh: (refreshToken: string, sessionId: string) =>
    client
      .post<AuthTokens>('/auth/refresh', { refreshToken, sessionId })
      .then((r) => r.data),

  logout: () =>
    client.post('/auth/logout').then((r) => r.data),

  logoutAll: () =>
    client.post('/auth/logout-all').then((r) => r.data),

  getMe: () =>
    client.get<AuthMe>('/auth/me').then((r) => r.data),

  deleteAccount: () =>
    client.delete('/auth/delete').then((r) => r.data),
}