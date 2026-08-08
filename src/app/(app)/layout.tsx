// src/app/(app)/layout.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/lib/api/auth'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const clear = useAuthStore((s) => s.clear)

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !accessToken) {
      router.replace('/login')
    }
  }, [mounted, accessToken, router])

  const { data: meData, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    enabled: mounted && !!accessToken && !user,
    retry: false, 
    staleTime: Infinity, 
  })

  useEffect(() => {
    if (meData) {
      setUser({
        userId: meData.userId,
        email: meData.email,
        username: meData.username,
        displayName: meData.username,
        emailVerified: meData.emailVerified,
      })
    }
  }, [meData, setUser])

  useEffect(() => {
    if (isError) {
      clear()
      router.replace('/login')
    }
  }, [isError, clear, router])

  if (!mounted) return null

  if (!accessToken) return null

  if (!user) return <div>Cargando...</div>

  return <>{children}</>
}