// src/hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/lib/api/auth'
import type {
  LoginDTO,
  RegisterDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  ChangePasswordDTO,
} from '@/types/auth'

export function useAuth() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const setTokens = useAuthStore((s) => s.setTokens)
  const setUser = useAuthStore((s) => s.setUser)
  const clear = useAuthStore((s) => s.clear)

  const isAuthenticated = !!accessToken

  const loginMutation = useMutation({
    mutationFn: (dto: LoginDTO) => authApi.login(dto),
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token, data.session_id)
      setUser(data.user)
      router.push('/dashboard')
    },
  })

  const registerMutation = useMutation({
    mutationFn: (dto: RegisterDTO) => authApi.register(dto),
  })

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clear()
      router.push('/login')
    },
  })

  const forgotPasswordMutation = useMutation({
    mutationFn: (dto: ForgotPasswordDTO) => authApi.forgotPassword(dto),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (dto: ResetPasswordDTO) => authApi.resetPassword(dto),
    onSuccess: () => {
      router.push('/login')
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (dto: ChangePasswordDTO) => authApi.changePassword(dto),
    onSuccess: () => {
      clear()
      router.push('/login')
    },
  })

  return {
    user,
    isAuthenticated,

    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
    forgotPassword: forgotPasswordMutation,
    resetPassword: resetPasswordMutation,
    changePassword: changePasswordMutation,
  }
}