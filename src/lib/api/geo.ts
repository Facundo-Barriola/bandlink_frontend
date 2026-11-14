import {client} from './client';
import type { CreatePlaceDTO } from '@/types/geo';

export const geoApi = {
    createPlace: (dto: CreatePlaceDTO) =>
        client.post('/geo/places', dto).then((r) => r.data),
}