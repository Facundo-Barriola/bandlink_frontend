export type CreatePlaceDTO = {
    name: string,
    lat: number,
    lng: number,
    address_line1?: string | null,
    city?: string | null,
    region?: string | null,
    postal_code?: string | null,
    country?: string | null,
    mapbox_id?: string | null, 
}