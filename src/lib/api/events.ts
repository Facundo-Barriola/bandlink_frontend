import { client } from './client'

export const eventsApi = {
  search: (q: string, limit = 6): Promise<any[]> =>
    client.get('/events/search', { params: { q, limit } }).then((r) => r.data),

  getAll: (params?: Record<string, any>): Promise<any[]> =>
    client.get('/events', { params }).then((r) => r.data),

  getById: (eventId: string): Promise<any> =>
    client.get(`/events/${eventId}`).then((r) => r.data),

  getMine: (params?: Record<string, any>): Promise<any[]> =>
    client.get('/events/mine', { params }).then((r) => r.data),

  attend: (eventId: string): Promise<any> =>
    client.post(`/events/${eventId}/attend`).then((r) => r.data),

  leave: (eventId: string): Promise<any> =>
    client.delete(`/events/${eventId}/attend`).then((r) => r.data),

  save: (eventId: string): Promise<any> =>
    client.post(`/events/${eventId}/save`).then((r) => r.data),

  unsave: (eventId: string): Promise<any> =>
    client.delete(`/events/${eventId}/save`).then((r) => r.data),
}
