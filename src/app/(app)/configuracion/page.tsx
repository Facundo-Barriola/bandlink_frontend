'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Settings, KeyRound, LogOut, MapPinOff, Trash2, MailCheck, MailWarning, Loader2, Eye, EyeOff, Wallet, CheckCircle2 } from 'lucide-react'
import { AppNavbar } from '@/components/AppNavbar'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/lib/api/auth'
import { geoApi } from '@/lib/api/geo'
import { paymentsApi } from '@/lib/api/payments'
import { apiErrorMessage } from '@/lib/booking-format'

const inputClass =
  'w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65558F] border-[#65558F]/50 placeholder-[#65558F]/50 text-[#65558F]'
const SHARE_KEY = 'bandlink:sharing-location'
const DELETE_WORD = 'ELIMINAR'

export default function ConfiguracionPage() {
  const user = useAuthStore((s) => s.user)
  const isStudio = user?.role === 'STUDIO_OWNER'

  return (
    <div className="min-h-screen bg-gray-100">
      <AppNavbar />
      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: '#65558F1A' }}>
            <Settings size={20} className="text-[#65558F]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
            <p className="text-sm text-gray-500">Tu cuenta, seguridad y privacidad.</p>
          </div>
        </div>

        <AccountSection />
        {isStudio && (
          <Suspense>
            <StudioPaymentsSection />
          </Suspense>
        )}
        <ChangePasswordSection />
        <SessionsSection />
        {!isStudio && <LocationSection />}
        <DeleteAccountSection isStudio={isStudio} />
      </main>
    </div>
  )
}

function Card({ icon: Icon, title, desc, children, danger }: {
  icon: React.ElementType; title: string; desc?: string; children: React.ReactNode; danger?: boolean
}) {
  return (
    <section className={`bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4 ${danger ? 'border border-red-100' : ''}`}>
      <div>
        <h2 className={`text-base font-bold flex items-center gap-2 ${danger ? 'text-red-600' : 'text-gray-900'}`}>
          <Icon size={18} className={danger ? 'text-red-500' : 'text-[#65558F]'} /> {title}
        </h2>
        {desc && <p className="text-sm text-gray-500 mt-1">{desc}</p>}
      </div>
      {children}
    </section>
  )
}

function Msg({ ok, text }: { ok?: boolean; text: string }) {
  return (
    <p className={`text-sm rounded-lg px-4 py-3 border ${ok ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
      {text}
    </p>
  )
}

// ── Datos de la cuenta + verificación de email ──────────────────────────────

function AccountSection() {
  const user = useAuthStore((s) => s.user)
  const resend = useMutation({ mutationFn: authApi.resendVerification })

  return (
    <Card icon={user?.emailVerified ? MailCheck : MailWarning} title="Cuenta">
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Email</p>
          <p className="text-gray-800">{user?.email}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Usuario</p>
          <p className="text-gray-800">@{user?.username}</p>
        </div>
      </div>
      {user && !user.emailVerified && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-orange-50 px-4 py-3">
          <p className="text-sm text-orange-700">Tu email todavía no está verificado.</p>
          <button
            onClick={() => resend.mutate()}
            disabled={resend.isPending || resend.isSuccess}
            className="rounded-full px-4 py-2 text-xs font-semibold border border-orange-300 text-orange-700 hover:bg-orange-100 disabled:opacity-60"
          >
            {resend.isSuccess ? 'Mail enviado' : resend.isPending ? 'Enviando…' : 'Reenviar mail de verificación'}
          </button>
        </div>
      )}
      {resend.isError && <Msg text={apiErrorMessage(resend.error)} />}
    </Card>
  )
}

// ── Cobros: cuenta de Mercado Pago de la sala (marketplace) ────────────────

function StudioPaymentsSection() {
  const queryClient = useQueryClient()
  const params = useSearchParams()
  const result = params.get('mp')
  const reason = params.get('reason')
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  const { data: status, isLoading } = useQuery({
    queryKey: ['payments', 'mp-status'],
    queryFn: paymentsApi.getMpStatus,
  })

  const connect = useMutation({
    mutationFn: paymentsApi.getMpConnectUrl,
    onSuccess: (url) => { window.location.href = url },
  })

  const disconnect = useMutation({
    mutationFn: paymentsApi.disconnectMp,
    onSuccess: () => {
      setConfirmDisconnect(false)
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  })

  const fee = status?.fee_percent ?? 5

  return (
    <Card
      icon={Wallet}
      title="Cobros con Mercado Pago"
      desc={`Conectá la cuenta de Mercado Pago de tu sala para recibir los pagos de las reservas directamente. BandLink retiene una comisión del ${fee} % por cada pago online.`}
    >
      {result === 'ok' && <Msg ok text="¡Listo! Tu cuenta de Mercado Pago quedó conectada." />}
      {result === 'error' && <Msg text={`No se pudo conectar la cuenta${reason ? `: ${reason}` : '.'}`} />}

      {isLoading ? (
        <p className="text-sm text-gray-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Consultando…</p>
      ) : status?.connected ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 size={16} />
            <span>
              Cuenta conectada <span className="text-green-600/70">(ID {status.mp_user_id})</span>. Los músicos ya pueden pagar online.
            </span>
          </div>
          <div className="text-xs text-gray-500 grid sm:grid-cols-3 gap-2">
            <div className="rounded-lg bg-gray-50 px-3 py-2">Reserva de $10.000</div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">Comisión BandLink: ${(10000 * fee / 100).toLocaleString('es-AR')}</div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">Recibís: ${(10000 - 10000 * fee / 100).toLocaleString('es-AR')} (menos la comisión de MP)</div>
          </div>
          {confirmDisconnect ? (
            <div className="flex flex-col gap-2 rounded-xl bg-red-50/60 p-3">
              <p className="text-sm text-red-700">Si desconectás la cuenta, los músicos solo van a poder pagar en la sala. Los pagos ya hechos no se ven afectados.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => disconnect.mutate()}
                  disabled={disconnect.isPending}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60"
                >
                  {disconnect.isPending ? 'Desconectando…' : 'Sí, desconectar'}
                </button>
                <button onClick={() => setConfirmDisconnect(false)} className="rounded-full px-4 py-2 text-xs font-semibold border border-gray-200 text-gray-600">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDisconnect(true)}
              className="self-start rounded-full px-5 py-2.5 text-sm font-semibold border border-red-200 text-red-500 hover:bg-red-50"
            >
              Desconectar cuenta
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-orange-700 bg-orange-50 rounded-xl px-4 py-3">
            Todavía no conectaste tu cuenta: los músicos solo pueden reservar y pagar en la sala.
          </p>
          {connect.isError && <Msg text={apiErrorMessage(connect.error)} />}
          <button
            onClick={() => connect.mutate()}
            disabled={connect.isPending}
            className="self-start rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 flex items-center gap-2"
            style={{ backgroundColor: '#009EE3' }}
          >
            {connect.isPending && <Loader2 size={14} className="animate-spin" />}
            Conectar Mercado Pago
          </button>
        </div>
      )}
    </Card>
  )
}

// ── CU42: cambiar contraseña ────────────────────────────────────────────────

function ChangePasswordSection() {
  const { changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (next.length < 6) return setLocalError('La nueva contraseña tiene que tener al menos 6 caracteres.')
    if (next !== confirm) return setLocalError('Las contraseñas nuevas no coinciden.')
    if (next === current) return setLocalError('La nueva contraseña tiene que ser distinta a la actual.')
    changePassword.mutate({ currentPassword: current, newPassword: next })
  }

  return (
    <Card icon={KeyRound} title="Cambiar contraseña" desc="Por seguridad, después del cambio vas a tener que iniciar sesión de nuevo.">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Contraseña actual"
            autoComplete="current-password"
            required
            className={`${inputClass} pr-11`}
          />
          <button type="button" onClick={() => setShow((v) => !v)} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#65558F]">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input type={show ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nueva contraseña" autoComplete="new-password" required className={inputClass} />
          <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repetir nueva contraseña" autoComplete="new-password" required className={inputClass} />
        </div>
        {(localError || changePassword.isError) && (
          <Msg text={localError ?? apiErrorMessage(changePassword.error, 'No se pudo cambiar la contraseña.')} />
        )}
        <button
          type="submit"
          disabled={changePassword.isPending}
          className="self-start rounded-full px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: '#65558F' }}
        >
          {changePassword.isPending ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </form>
    </Card>
  )
}

// ── Sesiones ─────────────────────────────────────────────────────────────────

function SessionsSection() {
  const router = useRouter()
  const clear = useAuthStore((s) => s.clear)
  const logoutAll = useMutation({
    mutationFn: authApi.logoutAll,
    onSuccess: () => { clear(); router.push('/login') },
  })

  return (
    <Card icon={LogOut} title="Sesiones" desc="Cerrá la sesión en todos los dispositivos donde hayas entrado (incluido este).">
      {logoutAll.isError && <Msg text={apiErrorMessage(logoutAll.error)} />}
      <button
        onClick={() => logoutAll.mutate()}
        disabled={logoutAll.isPending}
        className="self-start rounded-full px-5 py-2.5 text-sm font-semibold border border-[#65558F]/40 text-[#65558F] hover:bg-[#65558F]/10 disabled:opacity-60 flex items-center gap-2"
      >
        {logoutAll.isPending && <Loader2 size={14} className="animate-spin" />}
        Cerrar sesión en todos los dispositivos
      </button>
    </Card>
  )
}

// ── Privacidad de ubicación (CU47) ──────────────────────────────────────────

function LocationSection() {
  const stop = useMutation({
    mutationFn: geoApi.removeMyLocation,
    onSuccess: () => { try { localStorage.removeItem(SHARE_KEY) } catch {} },
  })

  return (
    <Card
      icon={MapPinOff}
      title="Ubicación"
      desc="Si activaste “Aparecer en el mapa”, otros músicos pueden verte cerca. Podés dejar de compartir tu ubicación cuando quieras."
    >
      {stop.isSuccess && <Msg ok text="Listo, ya no compartís tu ubicación." />}
      {stop.isError && <Msg text={apiErrorMessage(stop.error)} />}
      <button
        onClick={() => stop.mutate()}
        disabled={stop.isPending || stop.isSuccess}
        className="self-start rounded-full px-5 py-2.5 text-sm font-semibold border border-[#65558F]/40 text-[#65558F] hover:bg-[#65558F]/10 disabled:opacity-60"
      >
        Dejar de compartir mi ubicación
      </button>
    </Card>
  )
}

// ── CU03 / CU06: eliminar cuenta ────────────────────────────────────────────

function DeleteAccountSection({ isStudio }: { isStudio: boolean }) {
  const router = useRouter()
  const clear = useAuthStore((s) => s.clear)
  const [open, setOpen] = useState(false)
  const [word, setWord] = useState('')

  const del = useMutation({
    mutationFn: authApi.deleteAccount,
    onSuccess: () => { clear(); router.push('/login') },
  })

  return (
    <Card
      danger
      icon={Trash2}
      title="Eliminar cuenta"
      desc={
        isStudio
          ? 'Se desactiva tu cuenta y la de tu estudio: dejará de aparecer en búsquedas y no podrá recibir reservas.'
          : 'Se desactiva tu cuenta: tu perfil deja de aparecer en búsquedas y se cierran todas tus sesiones.'
      }
    >
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="self-start rounded-full px-5 py-2.5 text-sm font-semibold border border-red-200 text-red-500 hover:bg-red-50"
        >
          Eliminar mi cuenta
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl bg-red-50/60 p-4">
          <p className="text-sm text-red-700">
            Esta acción no se puede deshacer desde la app. Para confirmar, escribí <b>{DELETE_WORD}</b>.
          </p>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder={DELETE_WORD}
            className="border border-red-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          {del.isError && <Msg text={apiErrorMessage(del.error)} />}
          <div className="flex gap-2">
            <button
              onClick={() => del.mutate()}
              disabled={word.trim().toUpperCase() !== DELETE_WORD || del.isPending}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
            >
              {del.isPending ? 'Eliminando…' : 'Eliminar definitivamente'}
            </button>
            <button onClick={() => { setOpen(false); setWord('') }} className="rounded-full px-5 py-2.5 text-sm font-semibold border border-gray-200 text-gray-600">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
