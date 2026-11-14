import { client } from './client'
import type { Conversation, Message, MessagesResponse } from '@/types/chat'

export const chatApi = {
  getConversations: async (): Promise<Conversation[]> => {
    const { data } = await client.get('/chat/conversations')
    return data
  },

  getMessages: async (conversationId: string, before?: string): Promise<MessagesResponse> => {
    const { data } = await client.get(`/chat/conversations/${conversationId}/messages`, {
      params: { limit: 30, ...(before ? { before } : {}) },
    })
    return data
  },

  createDirectConversation: async (otherUserId: string): Promise<{ conversation_id: string }> => {
    const { data } = await client.post('/chat/conversations/direct', {
      other_user_id: otherUserId,
    })
    return data
  },

  markAsRead: async (conversationId: string): Promise<void> => {
    await client.post(`/chat/conversations/${conversationId}/read`)
  },

  sendMessageRest: async (conversationId: string, body: string): Promise<Message> => {
    const { data } = await client.post(`/chat/conversations/${conversationId}/messages`, { body })
    return data
  },

  editMessage: async (
    conversationId: string,
    messageId: string,
    body: string,
  ): Promise<Message> => {
    const { data } = await client.patch(
      `/chat/conversations/${conversationId}/messages/${messageId}`,
      { body },
    )
    return data
  },

  deleteMessage: async (conversationId: string, messageId: string): Promise<void> => {
    await client.delete(`/chat/conversations/${conversationId}/messages/${messageId}`)
  },
}
