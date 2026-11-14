export type ConversationMember = {
  user_id: string
  username: string
  display_name: string
}

export type LastMessage = {
  message_id: string
  body: string | null
  sender_user_id: string
  created_at: string
}

export type Conversation = {
  conversation_id: string
  conversation_type: 'direct' | 'band' | 'booking'
  updated_at: string | null
  unread_count: number
  last_message: LastMessage | null
  members: ConversationMember[]
}

export type MessageSender = {
  user_id: string
  username: string
  display_name: string
}

export type Message = {
  message_id: string
  sender_user_id: string
  conversation_id: string
  body: string
  created_at: string
  edited_at: string | null
  users: MessageSender
}

export type MessagesResponse = {
  messages: Message[]
  has_more: boolean
  next_cursor: string | null
}
