'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/lib/api/auth'
import { apiErrorMessage } from '@/lib/booking-format'
import { AuthCard, AuthError, AuthSuccess, authButtonClass, authInputClass } from '@/components/auth/AuthCard'

/** CU41 – Recuperar contraseña: paso 1, pedir el mail con el link. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')

  const forgot = useMutation({
    mutationFn: () => authApi.forgotPassword({ email: email.trim() }),
  })

  return (
    <AuthCard
      title="¿Olvidaste tu contraseña?"
      subtitle="Ingresá tu email y te mandamos un link para crear una nueva."
    >
      {forgot.isSuccess ? (
        <>
          <AuthSuccess msg="Si el email está registrado, en unos minutos te llega un correo con el link para restablecer tu contraseña. Revisá también la carpeta de spam." />
          <p className="text-xs text-gray-400 text-center">El link vence en poco tiempo, usalo cuanto antes.</p>
        </>
      ) : (
        <form
          onSubmit={(e) => { e.preventDefault(); forgot.mutate() }}
          className="flex flex-col gap-4"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoComplete="email"
            className={authInputClass}
          />
          {forgot.isError && <AuthError msg={apiErrorMessage(forgot.error)} />}
          <button type="submit" disabled={forgot.isPending || !email} className={authButtonClass}>
            {forgot.isPending ? 'Enviando…' : 'Enviar link'}
          </button>
        </form>
      )}
      <Link href="/login" className="text-center text-sm font-semibold text-[#65558F] underline">
        Volver a iniciar sesión
      </Link>
    </AuthCard>
  )
}
