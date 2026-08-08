'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Bell,
  CalendarDays,
  Users,
  Inbox,
  Music2,
  Building2,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Solicitudes', icon: Bell,        href: '/solicitudes' },
  { label: 'Mis eventos', icon: CalendarDays, href: '/eventos'     },
  { label: 'Conexiones',  icon: Users,        href: '/conexiones'  },
  { label: 'Inbox',       icon: Inbox,        href: '/inbox'       },
]

const hasRole = (idUserGroup?: number) =>
  idUserGroup === 2 || idUserGroup === 3

export default function DashboardPage() {
  const { user } = useAuth()
  const hasRole = (role?: 'musician' | 'studio' | null) =>
  role === 'musician' || role === 'studio'

  return (
    <div className="min-h-screen bg-gray-100">

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

          <Link href="/dashboard" className="flex-shrink-0">
            <Image
              src="/logo-bandlink.png"
              alt="BandLink"
              width={80}
              height={80}
              className="object-contain"
            />
          </Link>

          {/* Nav central */}
          <nav className="flex items-center gap-16">
            {NAV_ITEMS.map(({ label, icon: Icon, href }) => (
              <Button
                key={href}
                variant="ghost"
                className="flex flex-col h-auto py-1.5 px-3 gap-0.5 rounded-xl hover:bg-[#65558F]/10 text-gray-500 hover:text-[#65558F]"
              >
                <Link href={href}>
                  <Icon size={40} strokeWidth={2} />
                  <span className="text-[10px] font-medium hidden sm:block">{label}</span>
                </Link>
              </Button>
            ))}
          </nav>

          <Link href={`/perfil/${user?.userId}`} className="flex-shrink-0">
            <Avatar className="w-10 h-10 ring-2 ring-[#65558F]/30 hover:ring-[#65558F] transition-all">
              <AvatarImage src={undefined} alt={user?.displayName} />
              <AvatarFallback
                className="text-white font-semibold text-sm"
                style={{ backgroundColor: '#65558F' }}
              >
                {user?.displayName?.charAt(0).toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </header>

      {/* ── Banner: elegir rol ──────────────────────────────────── */}
      {user && !hasRole(user.role) && (
        <div className="max-w-5xl mx-auto px-4 mt-4">
          <div
            className="rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
            style={{ backgroundColor: '#65558F' }}
          >
            <div className="text-white">
              <p className="font-semibold text-base">¿Qué sos en BandLink?</p>
              <p className="text-sm text-white/70">
                Completá tu perfil eligiendo tu rol para acceder a todas las funciones.
              </p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <Button
                variant="secondary"
                className="gap-2 bg-white text-[#65558F] hover:bg-gray-100 font-semibold"
              >
                <Music2 size={16} />
                Soy músico
              </Button>
              <Button
                variant="secondary"
                className="gap-2 bg-white text-[#65558F] hover:bg-gray-100 font-semibold"
              >
                <Building2 size={16} />
                Soy sala de ensayo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contenido principal ─────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* feed / contenido */}
      </main>

    </div>
  )
}