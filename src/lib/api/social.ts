import { client } from './client'
import type { Friend, Follow, ReceivedRequest, FriendRequest, SocialStatus } from '@/types/social'

// El backend devuelve esta forma rara para las solicitudes recibidas
type RawReceivedRequest = {
  request_id: string
  message: string | null
  status: string
  created_at: string
  users_friend_requests_from_user_idTousers: {
    user_id: string
    username: string
    display_name: string
  }
}

export const socialApi = {
  // ── Amigos ────────────────────────────────────────────────────────────────

  getMyFriends: (): Promise<Friend[]> =>
    client.get<Friend[]>('/social/friends').then((r) => r.data),

  removeFriendship: (friendshipId: string): Promise<{ message: string }> =>
    client.delete(`/social/friends/${friendshipId}`).then((r) => r.data),

  // ── Solicitudes ───────────────────────────────────────────────────────────

  sendFriendRequest: (
    toUserId: string,
    message?: string,
  ): Promise<{ request_id: string }> =>
    client
      .post('/social/friend-requests', { to_user_id: toUserId, ...(message ? { message } : {}) })
      .then((r) => r.data),

  getReceivedRequests: (): Promise<ReceivedRequest[]> =>
    client
      .get<RawReceivedRequest[]>('/social/friend-requests/received')
      .then((r) =>
        r.data.map((req) => ({
          request_id: req.request_id,
          message: req.message,
          status: req.status,
          created_at: req.created_at,
          from_user: req.users_friend_requests_from_user_idTousers,
        })),
      ),

  getSentRequests: (): Promise<FriendRequest[]> =>
    client.get<FriendRequest[]>('/social/friend-requests/sent').then((r) => r.data),

  acceptRequest: (requestId: string): Promise<{ message: string }> =>
    client.patch(`/social/friend-requests/${requestId}/accept`).then((r) => r.data),

  rejectRequest: (requestId: string): Promise<{ message: string }> =>
    client.patch(`/social/friend-requests/${requestId}/reject`).then((r) => r.data),

  cancelRequest: (requestId: string): Promise<{ message: string }> =>
    client.delete(`/social/friend-requests/${requestId}`).then((r) => r.data),

  // ── Estado social de un usuario ───────────────────────────────────────────

  getUserSocialStatus: (userId: string): Promise<SocialStatus> =>
    client.get<SocialStatus>(`/social/users/${userId}/status`).then((r) => r.data),

  // ── Follows ───────────────────────────────────────────────────────────────

  follow: (targetType: string, targetId: string): Promise<{ message: string }> =>
    client
      .post('/social/follows', { target_type: targetType, target_id: targetId })
      .then((r) => r.data),

  unfollow: (targetType: string, targetId: string): Promise<{ message: string }> =>
    client.delete(`/social/follows/${targetType}/${targetId}`).then((r) => r.data),

  getMyFollows: (): Promise<Follow[]> =>
    client.get<Follow[]>('/social/follows').then((r) => r.data),
}
