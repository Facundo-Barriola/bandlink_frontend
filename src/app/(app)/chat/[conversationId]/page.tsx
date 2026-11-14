'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { AppNavbar } from '@/components/AppNavbar'
import { chatApi } from '@/lib/api/chat'
import { useChatSocket } from '@/hooks/useChatSocket'
import type { Message, Conversation } from '@/types/chat'
import { ArrowLeft, Send, Loader2, MoreVertical, Pencil, Trash2, Check, X } from 'lucide-react'

const BRAND = '#65558F'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMsgTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getConversationName(conv: Conversation, currentUserId: string): string {
  if (conv.conversation_type === 'direct') {
    const other = conv.members.find((m) => m.user_id !== currentUserId)
    return other?.display_name || other?.username || 'Usuario'
  }
  if (conv.conversation_type === 'band') return 'Chat de banda'
  return 'Conversación'
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isOwn,
  isGroup,
  onEdit,
  onDelete,
}: {
  msg: Message
  isOwn: boolean
  isGroup: boolean
  onEdit: (msg: Message) => void
  onDelete: (msg: Message) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group px-4`}>
      <div className={`max-w-[72%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {/* Sender name for group chats */}
        {!isOwn && isGroup && (
          <span className="text-[11px] font-medium px-1" style={{ color: BRAND }}>
            {msg.users?.display_name || msg.users?.username}
          </span>
        )}

        <div className="flex items-end gap-1.5">
          {/* Menu button — own messages only */}
          {isOwn && (
            <div className="relative self-center opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <MoreVertical size={13} className="text-gray-400" />
              </button>
              {menuOpen && (
                <div className="absolute bottom-7 right-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-32 z-10">
                  <button
                    onClick={() => { onEdit(msg); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    onClick={() => { onDelete(msg); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={12} /> Eliminar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bubble */}
          <div
            className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
              isOwn
                ? 'rounded-br-sm text-white'
                : 'rounded-bl-sm bg-white text-gray-800 shadow-sm border border-gray-100'
            }`}
            style={isOwn ? { backgroundColor: BRAND } : {}}
          >
            {msg.body}
          </div>
        </div>

        {/* Time + edited */}
        <div className={`flex items-center gap-1.5 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-gray-400">{formatMsgTime(msg.created_at)}</span>
          {msg.edited_at && (
            <span className="text-[10px] text-gray-400 italic">editado</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── DateSeparator ─────────────────────────────────────────────────────────────

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>()
  const conversationId = params.conversationId
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [messages, setMessages] = useState<Message[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  // Edit state
  const [editingMsg, setEditingMsg] = useState<Message | null>(null)
  const [editInput, setEditInput] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initialScrollDone = useRef(false)

  // ── Load initial messages ──────────────────────────────────────────────────

  const { isLoading: loadingInitial } = useQuery({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: () => chatApi.getMessages(conversationId),
    staleTime: Infinity,
    gcTime: 0,
    refetchOnMount: true,
    select: (data) => data,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(undefined as any),
  })

  // Workaround: call manually and set state
  useEffect(() => {
    if (!conversationId) return
    chatApi.getMessages(conversationId).then((data) => {
      setMessages(data.messages)
      setHasMore(data.has_more)
      setNextCursor(data.next_cursor)
    })
  }, [conversationId])

  // ── Scroll to bottom on first load ────────────────────────────────────────

  useEffect(() => {
    if (messages.length > 0 && !initialScrollDone.current) {
      initialScrollDone.current = true
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50)
    }
  }, [messages.length])

  // ── Conversation info from cache ──────────────────────────────────────────

  const conversations = queryClient.getQueryData<Conversation[]>(['chat', 'conversations'])
  const conversation = conversations?.find((c) => c.conversation_id === conversationId)
  const convName = conversation && user
    ? getConversationName(conversation, user.userId)
    : 'Chat'
  const convInitials = getInitials(convName)
  const isGroup = conversation?.conversation_type !== 'direct'

  // ── Socket ────────────────────────────────────────────────────────────────

  const { sendMessage: socketSend, markRead } = useChatSocket(conversationId, {
    onNewMessage: (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m.message_id === msg.message_id)) return prev
        return [...prev, msg]
      })
      setTimeout(() => {
        const area = scrollAreaRef.current
        if (area) {
          const nearBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 120
          if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      }, 50)
      markRead()
      // Invalidate conversations list to refresh unread counts
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    },
    onMessageEdited: (edited) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.message_id === edited.message_id
            ? { ...m, body: edited.body, edited_at: edited.edited_at }
            : m,
        ),
      )
    },
    onMessageDeleted: ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.message_id !== messageId))
    },
  })

  // Mark as read on mount
  useEffect(() => {
    if (!conversationId) return
    const t = setTimeout(() => {
      chatApi.markAsRead(conversationId).catch(() => {})
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    }, 500)
    return () => clearTimeout(t)
  }, [conversationId, queryClient])

  // ── Send message ──────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const body = input.trim()
    if (!body || sending) return
    setInput('')
    setSending(true)
    try {
      const sent = socketSend(body)
      if (!sent) {
        // Fallback to REST if socket not connected
        const msg = await chatApi.sendMessageRest(conversationId, body)
        setMessages((prev) => [...prev, msg])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    } catch {
      setInput(body) // restore on error
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [input, sending, socketSend, conversationId])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Load more ─────────────────────────────────────────────────────────────

  const loadMore = async () => {
    if (!hasMore || loadingMore || !nextCursor) return
    setLoadingMore(true)
    const area = scrollAreaRef.current
    const prevHeight = area?.scrollHeight ?? 0
    try {
      const data = await chatApi.getMessages(conversationId, nextCursor)
      setMessages((prev) => [...data.messages, ...prev])
      setHasMore(data.has_more)
      setNextCursor(data.next_cursor)
      // Keep scroll position after prepend
      requestAnimationFrame(() => {
        if (area) area.scrollTop = area.scrollHeight - prevHeight
      })
    } finally {
      setLoadingMore(false)
    }
  }

  // ── Edit message ──────────────────────────────────────────────────────────

  const startEdit = (msg: Message) => {
    setEditingMsg(msg)
    setEditInput(msg.body)
  }

  const cancelEdit = () => {
    setEditingMsg(null)
    setEditInput('')
  }

  const confirmEdit = async () => {
    if (!editingMsg || !editInput.trim()) return
    try {
      const updated = await chatApi.editMessage(conversationId, editingMsg.message_id, editInput.trim())
      setMessages((prev) =>
        prev.map((m) => (m.message_id === updated.message_id ? { ...m, ...updated } : m)),
      )
    } finally {
      cancelEdit()
    }
  }

  // ── Delete message ────────────────────────────────────────────────────────

  const handleDelete = async (msg: Message) => {
    if (!confirm('¿Eliminar este mensaje?')) return
    try {
      await chatApi.deleteMessage(conversationId, msg.message_id)
      setMessages((prev) => prev.filter((m) => m.message_id !== msg.message_id))
    } catch {
      alert('No se pudo eliminar el mensaje')
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderedMessages = () => {
    const items: React.ReactNode[] = []
    let lastDate = ''

    messages.forEach((msg) => {
      const msgDate = new Date(msg.created_at).toDateString()
      if (msgDate !== lastDate) {
        lastDate = msgDate
        items.push(<DateSeparator key={`sep-${msg.created_at}`} label={formatDateSeparator(msg.created_at)} />)
      }
      items.push(
        <MessageBubble
          key={msg.message_id}
          msg={msg}
          isOwn={msg.sender_user_id === user?.userId}
          isGroup={isGroup}
          onEdit={startEdit}
          onDelete={handleDelete}
        />,
      )
    })
    return items
  }

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppNavbar />

      {/* Conversation header */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push('/chat')}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
          >
            <ArrowLeft size={16} className="text-gray-600" />
          </button>

          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
            style={{ backgroundColor: BRAND }}
          >
            {convInitials}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{convName}</p>
            {conversation?.conversation_type && (
              <p className="text-xs text-gray-400 capitalize">
                {conversation.conversation_type === 'direct'
                  ? 'Mensaje directo'
                  : conversation.conversation_type === 'band'
                    ? 'Banda'
                    : 'Reserva'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 flex flex-col max-w-2xl w-full mx-auto">
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto py-4 space-y-2"
          style={{ maxHeight: 'calc(100vh - 64px - 56px - 72px)' }}
        >
          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center py-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-xs font-medium px-4 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                style={{ color: BRAND }}
              >
                {loadingMore ? <Loader2 size={11} className="animate-spin" /> : null}
                {loadingMore ? 'Cargando...' : 'Ver mensajes anteriores'}
              </button>
            </div>
          )}

          {/* Loading state */}
          {loadingInitial && messages.length === 0 && (
            <div className="flex justify-center py-12">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          )}

          {/* Empty state */}
          {!loadingInitial && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <p className="text-sm text-gray-500">No hay mensajes todavía</p>
              <p className="text-xs text-gray-400 mt-1">¡Sé el primero en escribir!</p>
            </div>
          )}

          {renderedMessages()}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-100 px-4 py-3 sticky bottom-0">
          {/* Edit mode banner */}
          {editingMsg && (
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <Pencil size={12} style={{ color: BRAND }} className="shrink-0" />
                <span className="text-xs text-gray-500 truncate">
                  Editando: <span className="italic">{editingMsg.body.slice(0, 40)}</span>
                </span>
              </div>
              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 shrink-0">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            {editingMsg ? (
              <>
                <textarea
                  value={editInput}
                  onChange={(e) => setEditInput(e.target.value)}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmEdit() }
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  className="flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': BRAND } as React.CSSProperties}
                  autoFocus
                />
                <button
                  onClick={confirmEdit}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-colors shrink-0"
                  style={{ backgroundColor: BRAND }}
                >
                  <Check size={16} />
                </button>
              </>
            ) : (
              <>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Escribí un mensaje..."
                  className="flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': BRAND } as React.CSSProperties}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-colors shrink-0 disabled:opacity-40"
                  style={{ backgroundColor: BRAND }}
                >
                  {sending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
