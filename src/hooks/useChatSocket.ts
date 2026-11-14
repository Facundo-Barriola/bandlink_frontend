'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth.store'
import type { Message } from '@/types/chat'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface EditedMessage {
  message_id: string
  body: string
  edited_at: string
  sender_user_id: string
  conversation_id: string
}

interface DeletedMessage {
  conversationId: string
  messageId: string
}

interface ChatSocketCallbacks {
  onNewMessage?: (message: Message) => void
  onMessageEdited?: (message: EditedMessage) => void
  onMessageDeleted?: (data: DeletedMessage) => void
}

export function useChatSocket(
  conversationId: string | null,
  callbacks: ChatSocketCallbacks = {},
) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const socketRef = useRef<Socket | null>(null)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  useEffect(() => {
    if (!accessToken || !conversationId) return

    const socket = io(`${BASE_URL}/chat`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join_conversation', { conversationId })
    })

    socket.on('new_message', (message: Message) => {
      callbacksRef.current.onNewMessage?.(message)
    })

    socket.on('message_edited', (message: EditedMessage) => {
      callbacksRef.current.onMessageEdited?.(message)
    })

    socket.on('message_deleted', (data: DeletedMessage) => {
      callbacksRef.current.onMessageDeleted?.(data)
    })

    socket.on('error', (err: { message: string }) => {
      console.error('[ChatSocket] error:', err.message)
    })

    return () => {
      socket.emit('leave_conversation', { conversationId })
      socket.disconnect()
      socketRef.current = null
    }
  }, [conversationId, accessToken])

  const sendMessage = useCallback(
    (body: string) => {
      const socket = socketRef.current
      if (!socket?.connected || !conversationId) return false
      socket.emit('send_message', { conversationId, body })
      return true
    },
    [conversationId],
  )

  const markRead = useCallback(() => {
    const socket = socketRef.current
    if (!socket?.connected || !conversationId) return
    socket.emit('mark_read', { conversationId })
  }, [conversationId])

  return { sendMessage, markRead }
}
