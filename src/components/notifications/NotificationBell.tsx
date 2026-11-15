'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, X } from 'lucide-react'
import { notificationsApi, type AppNotification } from '@/lib/api/notifications'
import { describeNotification, timeAgo } from '@/lib/notification-format'
import { useNotificationsSocket } from '@/hooks/useNotificationsSocket'

/** Campanita del navbar: contador de no leídas, panel desplegable y aviso en tiempo real. */
export function NotificationBell() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<AppNotification | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 60_000, // respaldo por si el socket se desconecta
  })

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: notificationsApi.getAll,
    enabled: open,
  })

  const onNotification = useCallback((n: AppNotification) => setToast(n), [])
  useNotificationsSocket(onNotification)

  // El aviso flotante desaparece solo
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast])

  // Cerrar el panel al hacer click afuera
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  const markRead = useMutation({ mutationFn: notificationsApi.markAsRead, onSuccess: invalidate })
  const markAll = useMutation({ mutationFn: notificationsApi.markAllAsRead, onSuccess: invalidate })

  const openNotification = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.notification_id)
    setOpen(false)
    setToast(null)
    router.push(describeNotification(n).href)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-[#65558F]/10 text-gray-500 hover:text-[#65558F] transition-colors"
        aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ''}`}
      >
        <Bell size={26} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 flex flex-col max-h-[70vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-bold text-gray-900">Notificaciones</p>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="text-xs font-semibold text-[#65558F] hover:underline flex items-center gap-1"
              >
                <CheckCheck size={13} /> Marcar todas como leídas
              </button>
            )}
          </div>
          <div className="overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-gray-400 text-center py-8">Cargando…</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No tenés notificaciones.</p>
            ) : (
              items.slice(0, 12).map((n) => <NotificationRow key={n.notification_id} n={n} onClick={() => openNotification(n)} />)
            )}
          </div>
          <Link
            href="/notificaciones"
            onClick={() => setOpen(false)}
            className="text-center text-sm font-semibold text-[#65558F] py-3 border-t border-gray-100 hover:bg-gray-50 rounded-b-2xl"
          >
            Ver todas
          </Link>
        </div>
      )}

      {toast && !open && (
        <div className="fixed bottom-6 right-6 z-[60] w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-[#65558F]/20 animate-in slide-in-from-bottom-4">
          <div className="flex items-start">
            <div className="flex-1 min-w-0">
              <NotificationRow n={toast} onClick={() => openNotification(toast)} />
            </div>
            <button onClick={() => setToast(null)} className="p-2 text-gray-400 hover:text-gray-600" aria-label="Cerrar">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function NotificationRow({ n, onClick }: { n: AppNotification; onClick: () => void }) {
  const v = describeNotification(n)
  const Icon = v.icon
  const unread = !n.read_at
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${unread ? 'bg-[#65558F]/5' : ''}`}
    >
      <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#65558F1A' }}>
        <Icon size={16} className="text-[#65558F]" />
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm leading-snug ${unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{v.text}</span>
        {v.detail && <span className="block text-xs text-gray-500 truncate capitalize">{v.detail}</span>}
        <span className="block text-[11px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</span>
      </span>
      {unread && <span className="w-2 h-2 rounded-full bg-[#65558F] mt-2 shrink-0" />}
    </button>
  )
}
