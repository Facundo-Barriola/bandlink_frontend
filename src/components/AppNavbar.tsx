'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { studioApi } from '@/lib/api/studio'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserPlus, CalendarCheck, CalendarDays, Users, Inbox, User, Settings, LogOut, Binoculars, Building2 } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/NotificationBell'

const NAV_ITEMS = [
  { label: 'Solicitudes', icon: UserPlus,    href: '/solicitudes' },
  { label: 'Mis eventos', icon: CalendarDays, href: '/eventos'     },
  { label: 'Reservas',    icon: CalendarCheck, href: '/reservas'   },
  { label: 'Conexiones',  icon: Users,        href: '/conexiones'  },
  { label: 'Inbox',       icon: Inbox,        href: '/chat'       },
  { label: 'Descubrir',   icon: Binoculars,   href: '/descubrir'   },
]

export function AppNavbar() {
  const router = useRouter()
  const { user, logout } = useAuth()

  const isStudioOwner = user?.role === 'STUDIO_OWNER'

  const { data: myStudios } = useQuery({
    queryKey: ['studios', 'mine'],
    queryFn: studioApi.getMyStudios,
    enabled: isStudioOwner,
    staleTime: Infinity,
  })

  const myStudioId = myStudios?.[0]?.studio_id ?? null

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        <Link href="/dashboard" className="flex-shrink-0">
          <Image src="/logo-bandlink.png" alt="BandLink" width={80} height={80} className="object-contain" />
        </Link>

        <nav className="flex items-center gap-4 lg:gap-10">
          {NAV_ITEMS.map(({ label, icon: Icon, href }) => (
            <Button
              key={href}
              variant="ghost"
              onClick={() => router.push(href)}
              className="flex flex-col h-auto py-1.5 px-3 gap-0.5 rounded-xl hover:bg-[#65558F]/10 text-gray-500 hover:text-[#65558F]"
            >
              <Icon size={40} strokeWidth={2} />
              <span className="text-[10px] font-medium hidden sm:block">{label}</span>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2 flex-shrink-0">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#65558F]">
            <Avatar className="w-10 h-10 ring-2 ring-[#65558F]/30 hover:ring-[#65558F] transition-all cursor-pointer">
              <AvatarImage src={undefined} alt={user?.displayName} />
              <AvatarFallback className="text-white font-semibold text-sm" style={{ backgroundColor: '#65558F' }}>
                {user?.displayName?.charAt(0).toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 mt-1 rounded-xl shadow-lg border border-gray-100">

            {/* Perfil personal — solo si no es studio owner */}
            {!isStudioOwner && (
              <DropdownMenuItem
                onClick={() => router.push(`/perfil/${user?.userId}`)}
                className="flex items-center gap-2 cursor-pointer text-gray-700"
              >
                <User size={15} /> Mi Perfil
              </DropdownMenuItem>
            )}

            {/* Perfil de estudio — solo si es studio owner */}
            {isStudioOwner && myStudioId && (
              <DropdownMenuItem
                onClick={() => router.push(`/estudio/${myStudioId}`)}
                className="flex items-center gap-2 cursor-pointer text-gray-700"
              >
                <Building2 size={15} /> Mi Estudio
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={() => router.push('/configuracion')}
              className="flex items-center gap-2 cursor-pointer text-gray-700"
            >
              <Settings size={15} /> Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout.mutate()}
              className="flex items-center gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50"
            >
              <LogOut size={15} /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>

      </div>
    </header>
  )
}