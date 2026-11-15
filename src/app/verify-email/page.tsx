'use client'

import { Suspense, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/lib/api/auth'
import { useAuthStore } from '@/store/auth.store'
import { apiErrorMessage } from '@/lib/booking-format'
import { AuthCard, AuthError, AuthSuccess, authButtonClass } from '@/components/auth/AuthCard'

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  )
}

/** Destino del link de verificación que manda el backend por mail. */
function VerifyEmail() {
  const token = useSearchParams().get('token') ?? ''
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const started = useRef(false)

  const verify = useMutation({
    mutationFn: () => authApi.verifyEmail(token),
    onSuccess: () => {
      if (user) setUser({ ...user, emailVerified: true })
    },
  })

  useEffect(() => {
    // Evita el doble llamado de React StrictMode (el token es de un solo uso)
    if (!token || started.current) return
    started.current = true
    verify.mutate()
  }, [token, verify])

  const next = accessToken ? '/dashboard' : '/login'

  return (
    <AuthCard title="Verificación de email">
      {!token ? (
        <AuthError msg="El link de verificación está incompleto." />
      ) : verify.isPending || verify.isIdle ? (
        <p className="text-sm text-gray-500 text-center">Verificando tu email…</p>
      ) : verify.isSuccess ? (
        <AuthSuccess msg="¡Listo! Tu email quedó verificado." />
      ) : (
        <AuthError msg={apiErrorMessage(verify.error, 'El link es inválido o ya fue usado.')} />
      )}
      <Link href={next} className={`${authButtonClass} text-center`}>
        {accessToken ? 'Ir a BandLink' : 'Iniciar sesión'}
      </Link>
    </AuthCard>
  )
}
