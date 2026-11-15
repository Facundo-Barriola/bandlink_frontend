'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { AppNavbar } from '@/components/AppNavbar'
import { NotificationRow } from '@/components/notifications/NotificationBell'
import { notificationsApi, type AppNotification } from '@/lib/api/notifications'
import { describeNotification } from '@/lib/notification-format'

type Filter = 'all' | 'unread'

export default function NotificacionesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')

  const { data = [], isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: notificationsApi.getAll,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  const markRead = useMutation({ mutationFn: notificationsApi.markAsRead, onSuccess: invalidate })
  const markAll = useMutation({ mutationFn: notificationsApi.markAllAsRead, onSuccess: invalidate })

  const items = filter === 'unread' ? data.filter((n) => !n.read_at) : data
  const unreadCount = data.filter((n) => !n.read_at).length

  const open = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.notification_id)
    router.push(describeNotification(n).href)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AppNavbar />
      <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: '#65558F1A' }}>
              <Bell size={20} className="text-[#65558F]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Notificaciones</h1>
              <p className="text-sm text-gray-500">Últimos 30 días.</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="rounded-full px-4 py-2 text-sm font-semibold border border-[#65558F]/40 text-[#65558F] hover:bg-[#65558F]/10 flex items-center gap-1.5 disabled:opacity-60"
            >
              <CheckCheck size={15} /> Marcar todas como leídas
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {(['all', 'unread'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                filter === f ? 'bg-[#65558F] text-white' : 'bg-white text-[#65558F] hover:bg-[#65558F]/10'
              }`}
            >
              {f === 'all' ? 'Todas' : `No leídas (${unreadCount})`}
            </button>
          ))}
        </div>

        <section className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-12">
              <Loader2 size={16} className="animate-spin" /> Cargando…
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">
              {filter === 'unread' ? 'No tenés notificaciones sin leer.' : 'Todavía no tenés notificaciones.'}
            </p>
          ) : (
            items.map((n) => <NotificationRow key={n.notification_id} n={n} onClick={() => open(n)} />)
          )}
        </section>
      </main>
    </div>
  )
}
