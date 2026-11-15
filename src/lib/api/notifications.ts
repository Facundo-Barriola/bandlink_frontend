import { client } from './client'

export interface NotificationContext {
  actor_name?: string | null
  event_title?: string | null
  band_name?: string | null
  studio_name?: string | null
  studio_id?: string | null
  room_name?: string | null
  starts_at?: string | null
}

export interface AppNotification {
  notification_id: string
  notification_type: string | null
  payload: Record<string, unknown> | null
  read_at: string | null
  created_at: string
  context?: NotificationContext
}

export const notificationsApi = {
  /** Últimos 30 días (máx. 50), ya enriquecidas con nombres. */
  getAll: () => client.get<AppNotification[]>('/notifications').then((r) => r.data),

  getUnreadCount: () =>
    client.get<{ unread_count: number }>('/notifications/unread-count').then((r) => r.data.unread_count),

  markAsRead: (id: string) => client.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllAsRead: () => client.patch('/notifications/read-all').then((r) => r.data),
}
