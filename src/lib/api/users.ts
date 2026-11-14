import { client } from './client'

export const usersApi = {
  getMe: () =>
    client.get('/users/me').then((r) => r.data),

  getUserById: (userId: string) =>
    client.get(`/users/${userId}`).then((r) => r.data),
}