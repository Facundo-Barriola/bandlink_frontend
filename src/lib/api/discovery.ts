import { client } from './client'

export const discoveryApi = {
  getSuggestedMusicians: (): Promise<any[]> =>
    client.get('/discovery/musicians').then((r) => r.data),

  getSuggestedEvents: (): Promise<any[]> =>
    client.get('/discovery/events').then((r) => r.data),

  getSuggestedBands: (): Promise<any[]> =>
    client.get('/discovery/bands').then((r) => r.data),

  searchMusicians: (q: string, limit = 6): Promise<any> =>
    client
      .get('/musicians/discover', { params: { q, limit } })
      .then((r) => r.data),

  searchStudios: (name: string, limit = 6): Promise<any[]> =>
    client
      .get('/studios/search', { params: { name, limit } })
      .then((r) => r.data),

  searchEvents: (name: string, limit = 6): Promise<any[]> =>
    client
      .get('/events/search', { params: { name, limit } })
      .then((r) => r.data),
}
