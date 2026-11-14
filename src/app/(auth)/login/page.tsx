
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/auth.store'
import Image from 'next/image'

export default function LoginPage() {
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setLocalRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const setRememberMe = useAuthStore((s) => s.setRememberMe)

const handleSubmit = (e: React.SubmitEvent) => {
  e.preventDefault()
  setRememberMe(rememberMe) 
  login.mutate({ email, password })
}

  const errorMessage =
    (login.error as any)?.response?.data?.message ?? 'Ocurrió un error. Intentá de nuevo.'

  const inputClass =
    'w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65558F] border-[#65558F] placeholder-[#65558F]/50 text-[#65558F]'

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md flex flex-col gap-5"
      >
        <div className="flex justify-center">
          <Image
            src="/logo-bandlink.png"
            alt="BandLink"
            width={120}
            height={120}
            priority
            className="object-contain"
          />
        </div>

        <h2 className="text-3xl font-bold text-center" style={{ color: '#65558F' }}>
          BandLink
        </h2>

        <h3 className="text-lg font-semibold text-center" style={{ color: '#65558F' }}>
          Iniciar sesión
        </h3>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          autoComplete="email"
          className={inputClass}
        />

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            required
            autoComplete="current-password"
            className={`${inputClass} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: '#65558F' }}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label
            className="flex items-center gap-2 text-sm select-none cursor-pointer"
            style={{ color: '#65558F' }}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setLocalRememberMe(e.target.checked)}
              className="w-4 h-4 accent-[#65558F] cursor-pointer"
            />
            Recordar sesión
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium underline"
            style={{ color: '#65558F' }}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {login.isError && (
          <div className="flex items-start gap-2 border border-red-300 bg-red-50 rounded-lg px-3.5 py-2.5">
            <svg className="text-red-500 mt-0.5 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          className="w-full py-3 rounded-full font-semibold transition-colors duration-200 disabled:opacity-50 text-white hover:brightness-95 active:scale-[0.99]"
          style={{ backgroundColor: '#65558F' }}
        >
          {login.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Iniciando sesión...
            </span>
          ) : (
            'Iniciar sesión'
          )}
        </button>

        <p className="text-center text-sm" style={{ color: '#65558F' }}>
          ¿No tenés cuenta?{' '}
          <Link href="/register" className="font-semibold underline" style={{ color: '#65558F' }}>
            Crear cuenta
          </Link>
        </p>
      </form>
    </div>
  )
}
