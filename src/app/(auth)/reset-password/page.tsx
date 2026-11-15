'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/lib/api/auth'
import { apiErrorMessage } from '@/lib/booking-format'
import { AuthCard, AuthError, AuthSuccess, authButtonClass, authInputClass } from '@/components/auth/AuthCard'

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}

/** CU41 – Recuperar contraseña: paso 2, definir la nueva con el token del mail. */
function ResetPasswordForm() {
  const token = useSearchParams().get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const reset = useMutation({
    mutationFn: () => authApi.resetPassword({ token, newPassword: password }),
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (password.length < 6) return setLocalError('La contraseña tiene que tener al menos 6 caracteres.')
    if (password !== confirm) return setLocalError('Las contraseñas no coinciden.')
    reset.mutate()
  }

  if (!token) {
    return (
      <AuthCard title="Link inválido" subtitle="El link para restablecer la contraseña está incompleto.">
        <Link href="/forgot-password" className={`${authButtonClass} text-center`}>Pedir un link nuevo</Link>
      </AuthCard>
    )
  }

  if (reset.isSuccess) {
    return (
      <AuthCard title="¡Contraseña actualizada!">
        <AuthSuccess msg="Ya podés iniciar sesión con tu nueva contraseña." />
        <Link href="/login" className={`${authButtonClass} text-center`}>Iniciar sesión</Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Nueva contraseña" subtitle="Elegí una contraseña de al menos 6 caracteres.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          type={show ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nueva contraseña"
          autoComplete="new-password"
          required
          className={authInputClass}
        />
        <input
          type={show ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repetir contraseña"
          autoComplete="new-password"
          required
          className={authInputClass}
        />
        <label className="flex items-center gap-2 text-sm text-[#65558F] select-none cursor-pointer">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="w-4 h-4 accent-[#65558F]" />
          Mostrar contraseñas
        </label>
        {(localError || reset.isError) && (
          <AuthError
            msg={localError ?? apiErrorMessage(reset.error, 'El link es inválido o venció. Pedí uno nuevo.')}
          />
        )}
        <button type="submit" disabled={reset.isPending} className={authButtonClass}>
          {reset.isPending ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
      {reset.isError && (
        <Link href="/forgot-password" className="text-center text-sm font-semibold text-[#65558F] underline">
          Pedir un link nuevo
        </Link>
      )}
    </AuthCard>
  )
}
