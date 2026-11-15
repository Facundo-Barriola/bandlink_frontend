import {
  Bell, UserPlus, UserCheck, UserX, Heart, MessageCircle, Music2, CalendarDays, CalendarX,
  CalendarCheck, CreditCard, Star, Clock, Users,
} from 'lucide-react'
import type { AppNotification } from '@/lib/api/notifications'
import { formatBookingDate, formatBookingTime } from '@/lib/booking-format'

export interface NotificationView {
  text: string
  detail?: string
  href: string
  icon: React.ElementType
}

const s = (v: unknown) => (typeof v === 'string' && v ? v : null)

function eventWhen(iso: string | null | undefined) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Texto, link e ícono de cada tipo de notificación que genera el backend. */
export function describeNotification(n: AppNotification): NotificationView {
  const p = n.payload ?? {}
  const c = n.context ?? {}
  const actor = c.actor_name ?? 'Alguien'
  const band = c.band_name ? `“${c.band_name}”` : 'tu banda'
  const event = c.event_title ? `“${c.event_title}”` : 'un evento'
  const studio = c.studio_name ?? 'la sala'
  const bookingWhen = c.starts_at ? `${formatBookingDate(c.starts_at)} · ${formatBookingTime(c.starts_at)}` : undefined
  const eventHref = s(p.event_id) ? `/eventos/${s(p.event_id)}` : '/eventos'
  const bandHref = s(p.band_id) ? `/bandas/${s(p.band_id)}` : '/bandas'

  switch (n.notification_type) {
    // ── Conexiones ──
    case 'friend_request_received':
      return { text: `${actor} te envió una solicitud de conexión`, href: '/solicitudes', icon: UserPlus }
    case 'friend_request_accepted':
      return { text: `${actor} aceptó tu solicitud de conexión`, href: s(p.by_user_id) ? `/perfil/${s(p.by_user_id)}` : '/conexiones', icon: UserCheck }
    case 'friend_request_rejected':
      return { text: `${actor} rechazó tu solicitud de conexión`, href: '/conexiones', icon: UserX }
    case 'new_follower':
      return {
        text: p.target_type === 'band' ? `${actor} empezó a seguir a ${band}` : `${actor} empezó a seguirte`,
        href: s(p.follower_user_id) ? `/perfil/${s(p.follower_user_id)}` : '/conexiones',
        icon: Heart,
      }
    case 'new_message':
      return {
        text: `${actor} te envió un mensaje`,
        detail: s(p.preview) ?? undefined,
        href: s(p.conversation_id) ? `/chat/${s(p.conversation_id)}` : '/chat',
        icon: MessageCircle,
      }

    // ── Bandas ──
    case 'band_invite_received':
      return { text: `${actor} te invitó a unirte a ${band}`, href: '/bandas', icon: Music2 }
    case 'band_invite_accepted':
      return { text: `${actor} aceptó unirse a ${band}`, href: bandHref, icon: Music2 }
    case 'band_invite_rejected':
      return { text: `${actor} rechazó la invitación a ${band}`, href: bandHref, icon: Music2 }
    case 'band_member_kicked':
      return { text: `Ya no formás parte de ${band}`, href: '/bandas', icon: UserX }
    case 'band_member_role_updated':
      return { text: `Cambió tu rol en ${band}`, detail: s(p.role) ? `Nuevo rol: ${s(p.role)}` : undefined, href: bandHref, icon: Music2 }
    case 'opening_application_received':
      return { text: `${actor} se postuló a la búsqueda de ${band}`, href: bandHref, icon: Users }
    case 'opening_application_accepted':
      return { text: `¡Te aceptaron en la búsqueda de ${band}!`, href: bandHref, icon: UserCheck }
    case 'opening_application_rejected':
      return { text: `No quedaste seleccionado en la búsqueda de ${band}`, href: bandHref, icon: UserX }

    // ── Reservas y pagos ──
    case 'booking_confirmed':
      return { text: `Reserva confirmada en ${studio}`, detail: bookingWhen, href: '/reservas', icon: CalendarCheck }
    case 'booking_cancelled_by_user':
      return { text: `Un músico canceló su reserva${c.room_name ? ` en ${c.room_name}` : ''}`, detail: bookingWhen, href: '/reservas', icon: CalendarX }
    case 'booking_cancelled_by_studio':
      return { text: `${studio} canceló tu reserva`, detail: bookingWhen, href: '/reservas', icon: CalendarX }
    case 'booking_rescheduled':
      return { text: 'Se reprogramó una reserva', detail: bookingWhen, href: '/reservas', icon: Clock }
    case 'booking_completed':
      return {
        text: `Tu ensayo en ${studio} finalizó. ¡Contanos qué te pareció!`,
        href: c.studio_id ? `/estudio/${c.studio_id}` : '/reservas',
        icon: Star,
      }
    case 'booking_reminder':
      return { text: `Recordatorio: tenés ensayo en ${studio}`, detail: bookingWhen, href: '/reservas', icon: Clock }
    case 'payment_approved':
      return { text: `Pago aprobado de tu reserva en ${studio}`, detail: bookingWhen, href: '/reservas', icon: CreditCard }
    case 'payment_rejected':
      return { text: `El pago de tu reserva en ${studio} fue rechazado`, detail: 'Podés reintentarlo desde Mis reservas', href: '/reservas', icon: CreditCard }

    // ── Eventos ──
    case 'event_invite_received':
      return { text: `Te invitaron a ${event}`, href: eventHref, icon: CalendarDays }
    case 'event_invite_accepted':
      return { text: `${actor} aceptó la invitación a ${event}`, href: eventHref, icon: CalendarCheck }
    case 'event_invite_rejected':
      return { text: `${actor} no podrá ir a ${event}`, href: eventHref, icon: CalendarX }
    case 'event_attendance_confirmed':
      return { text: `${actor} va a asistir a ${event}`, href: eventHref, icon: CalendarCheck }
    case 'event_band_attendance_confirmed':
      return { text: `${band} confirmó que toca en ${event}`, href: eventHref, icon: Music2 }
    case 'event_band_attendance_declined':
      return { text: `${band} no va a tocar en ${event}`, href: eventHref, icon: Music2 }
    case 'event_cancelled':
      return { text: `Se canceló ${event}`, href: eventHref, icon: CalendarX }
    case 'event_reminder':
      return { text: `Recordatorio: ${event} se acerca`, detail: eventWhen(c.starts_at), href: eventHref, icon: Clock }

    // ── Reseñas ──
    case 'studio_review_created':
      return {
        text: `Tu sala recibió una nueva reseña${typeof p.rating === 'number' ? ` (${'★'.repeat(p.rating)})` : ''}`,
        href: s(p.studio_id) ? `/estudio/${s(p.studio_id)}` : '/dashboard',
        icon: Star,
      }
    case 'user_review_created':
      return {
        text: `Recibiste una nueva reseña${typeof p.rating === 'number' ? ` (${'★'.repeat(p.rating)})` : ''}`,
        href: '/dashboard',
        icon: Star,
      }

    default:
      return { text: 'Tenés una nueva notificación', href: '/notificaciones', icon: Bell }
  }
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'recién'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  if (diff < 7 * 86400) return `hace ${Math.floor(diff / 86400)} d`
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

/** Qué datos de la app conviene refrescar cuando llega cada tipo de notificación. */
export function relatedQueryKeys(type: string | null): string[][] {
  if (!type) return []
  if (type.startsWith('booking_') || type.startsWith('payment_')) return [['bookings']]
  if (type.startsWith('event_')) return [['events']]
  if (type.startsWith('band_') || type.startsWith('opening_')) return [['bands']]
  if (type.startsWith('friend_') || type === 'new_follower') return [['social']]
  if (type === 'new_message') return [['chat']]
  if (type.endsWith('review_created')) return [['studio'], ['reviews']]
  return []
}
