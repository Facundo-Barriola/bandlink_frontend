'use client'

import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import type { AppNotification } from '@/lib/api/notifications'
import { relatedQueryKeys } from '@/lib/notification-format'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

/**
 * Escucha el canal /notifications del backend (RE09, tiempo real).
 * Al llegar una notificación refresca el contador, la lista y los datos relacionados.
 */
export function useNotificationsSocket(onNotification?: (n: AppNotification) => void) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const queryClient = useQueryClient()
  const cbRef = useRef(onNotification)

  useEffect(() => {
    cbRef.current = onNotification
  }, [onNotification])

  useEffect(() => {
    if (!accessToken) return
    const socket = io(`${BASE_URL}/notifications`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })

    socket.on('notification', (n: AppNotification) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      for (const key of relatedQueryKeys(n.notification_type)) {
        queryClient.invalidateQueries({ queryKey: key })
      }
      cbRef.current?.(n)
    })

    return () => {
      socket.disconnect()
    }
  }, [accessToken, queryClient])
}
