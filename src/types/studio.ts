export type CreateStudio = {
    name: string
    description: string | null
    place_id: string | null
    phone: string 
}

export type CreateRoom = {
    name: string
    description: string | null
    capacity: number | null
    base_hourly_price: number | null
    min_booking_minutes: number | null
    is_active: boolean

}

export type AddAvailabilityRule = {
    day_of_week: number,
    start_time: string,
    end_time: string,
    timezone: string,
}

export type AddRoomEquipment = {
    equipment_id: string,
    quantity: string | null
}

export type Equipment = {
  equipment_id: string
  name: string
  category: string | null
}

export type Studio = {
  studio_id: string
  name: string
  description: string | null
  phone: string | null
  is_active: boolean
  place_id: string | null
}

export type Room = {
  room_id: string
  studio_id: string
  name: string
  description: string | null
  capacity: number | null
  base_hourly_price: number | null
  min_booking_minutes: number | null
  is_active: boolean
}

export type AvailabilityRule = {
  rule_id: string
  day_of_week: number
  start_time: string
  end_time: string
  timezone: string
}