'use client'

import dynamic from 'next/dynamic'

// El mapa usa APIs del navegador (window, WebGL, geolocalización): solo cliente.
const MapaView = dynamic(() => import('./MapaView'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-gray-100" />,
})

export default function MapaPage() {
  return <MapaView />
}
