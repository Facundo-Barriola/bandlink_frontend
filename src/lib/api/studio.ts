import {client} from './client';
import type { CreateStudio, Studio, Equipment, Room, CreateRoom, AddRoomEquipment, AddAvailabilityRule, AvailabilityRule } from '@/types/studio';

export interface RoomBlock {
    block_id: string
    room_id: string
    starts_at: string
    ends_at: string
    reason: string | null
}


export const studioApi = {
    getEquipmentCatalog: () =>
        client.get<Equipment[]>('studios/equipment/catalog').then((r) => r.data),

    createStudio: (dto: CreateStudio) =>
        client.post<Studio>('studios', dto).then((r) => r.data),

    createRoom: (studioId: string, dto: CreateRoom) =>
        client.post<Room>(`studios/${studioId}/rooms`, dto).then((r) => r.data),

    addRoomEquipment: (studioId: string, roomId: string, dto: AddRoomEquipment) =>
        client.post(`studios/${studioId}/rooms/${roomId}/equipment`, dto).then((r) => r.data),

    addAvailabilityRule: (studioId: string, roomId: string, dto: AddAvailabilityRule) =>
        client.post(`studios/${studioId}/rooms/${roomId}/availability-rules`, dto).then((r) => r.data),

    getMyStudios: () =>
        client.get<any[]>('studios/mine').then((r) => r.data),

    uploadStudioAvatar: (studioId: string, file: File) => {
        const form = new FormData()
        form.append('file', file)
        return client.patch<{ profile_picture_url: string }>(`studios/${studioId}/avatar`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then((r) => r.data)
    },

    uploadStudioMedia: (studioId: string, file: File, kind = 'gallery') => {
        const form = new FormData()
        form.append('file', file)
        form.append('kind', kind)
        return client.post(`media/studios/${studioId}`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }).then((r) => r.data)
    },

    deleteStudioMedia: (studioId: string, mediaId: string) =>
        client.delete(`media/studios/${studioId}/${mediaId}`).then((r) => r.data),

    /** Editar datos del estudio (nombre, descripción, teléfono, ubicación). */
    updateStudio: (studioId: string, dto: { name?: string; description?: string; phone?: string; place_id?: string }) =>
        client.patch<any>(`studios/${studioId}`, dto).then((r) => r.data),

    // ── Bloqueos de sala (CU25: feriados, mantenimiento, uso propio) ──
    getRoomBlocks: (studioId: string, roomId: string) =>
        client.get<RoomBlock[]>(`studios/${studioId}/rooms/${roomId}/blocks`).then((r) => r.data),

    createRoomBlock: (studioId: string, roomId: string, dto: { starts_at: string; ends_at: string; reason?: string }) =>
        client.post<RoomBlock>(`studios/${studioId}/rooms/${roomId}/blocks`, dto).then((r) => r.data),

    deleteRoomBlock: (studioId: string, roomId: string, blockId: string) =>
        client.delete(`studios/${studioId}/rooms/${roomId}/blocks/${blockId}`).then((r) => r.data),

    getStudioById: (studioId: string) =>
        client.get<any>(`studios/${studioId}`).then((r) => r.data),

    getRoomAvailabilityRules: (studioId: string, roomId: string) =>
        client.get<AvailabilityRule[]>(`studios/${studioId}/rooms/${roomId}/availability-rules`).then((r) => r.data),

    getRoomEquipment: (studioId: string, roomId: string) =>
        client.get<any[]>(`studios/${studioId}/rooms/${roomId}/equipment`).then((r) => r.data),

    updateRoom: (studioId: string, roomId: string, dto: Partial<import('@/types/studio').CreateRoom>) =>
        client.patch<import('@/types/studio').Room>(`studios/${studioId}/rooms/${roomId}`, dto).then((r) => r.data),

    deleteAvailabilityRule: (studioId: string, roomId: string, ruleId: string) =>
        client.delete(`studios/${studioId}/rooms/${roomId}/availability-rules/${ruleId}`).then((r) => r.data),

    getStudioReviews: (studioId: string) =>
        client.get<any>(`reviews/studios/${studioId}`).then((r) => r.data),

    getStudioMedia: (studioId: string) =>
        client.get<any[]>(`media/studios/${studioId}`).then((r) => r.data),
}