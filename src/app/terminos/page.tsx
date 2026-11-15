import Link from 'next/link'

export const metadata = { title: 'Términos y Condiciones · BandLink' }

const sections: { id?: string; title: string; items: string[] }[] = [
  {
    title: '1. Sobre BandLink',
    items: [
      'BandLink™ es una red social para músicos y salas de ensayo que permite conectar artistas, formar bandas, reservar salas y difundir eventos.',
      'Al crear una cuenta aceptás estos Términos y la Política de Privacidad. Si no estás de acuerdo, no uses la plataforma.',
    ],
  },
  {
    title: '2. Cuentas',
    items: [
      'Tenés que brindar información verdadera y mantener la confidencialidad de tu contraseña.',
      'Cada cuenta es personal. Sos responsable de la actividad que ocurra con ella.',
      'Podés eliminar tu cuenta en cualquier momento desde Configuración.',
    ],
  },
  {
    title: '3. Uso aceptable',
    items: [
      'No está permitido publicar contenido ofensivo, discriminatorio, ilegal o que infrinja derechos de terceros.',
      'No se permite suplantar identidades, enviar spam ni intentar vulnerar la seguridad del sistema.',
      'Podés reportar perfiles que incumplan estas normas. BandLink puede suspender cuentas que las violen.',
    ],
  },
  {
    title: '4. Reservas y pagos',
    items: [
      'Las salas de ensayo son responsables de la veracidad de sus horarios, precios y equipamiento.',
      'Los pagos online se procesan a través de Mercado Pago; BandLink no almacena datos de tarjetas.',
      'Las cancelaciones y reembolsos se rigen por la política de cada sala. Si la sala cancela una reserva paga, corresponde el reembolso.',
    ],
  },
  {
    title: '5. Eventos',
    items: [
      'Quien crea un evento es responsable de su información (fecha, lugar, aforo) y de su realización.',
      'Los eventos privados solo son visibles para las personas invitadas.',
    ],
  },
  {
    id: 'privacidad',
    title: '6. Política de Privacidad',
    items: [
      'Tratamos tus datos personales conforme a la Ley 25.326 de Protección de Datos Personales de la República Argentina.',
      'Solo pedimos la información necesaria para el funcionamiento de la plataforma (perfil, contacto, preferencias musicales y, si la activás, tu ubicación).',
      'Tu ubicación solo se comparte con otros usuarios si activás “Aparecer en el mapa”, y podés desactivarlo cuando quieras.',
      'No compartimos tus datos con terceros sin tu consentimiento, salvo los proveedores necesarios para prestar el servicio (por ejemplo, Mercado Pago para pagos o Mapbox para mapas).',
      'Las contraseñas se almacenan cifradas y toda la comunicación viaja por HTTPS.',
      'Podés ejercer tus derechos de acceso, rectificación y supresión de datos desde tu perfil, desde Configuración o escribiéndonos.',
      'La Agencia de Acceso a la Información Pública, órgano de control de la Ley 25.326, atiende denuncias y reclamos relacionados con el incumplimiento de las normas sobre protección de datos personales.',
    ],
  },
  {
    title: '7. Cambios',
    items: ['Podemos actualizar estos términos. Si los cambios son relevantes, te avisaremos dentro de la plataforma.'],
  },
]

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <article className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-8 flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold text-[#65558F]">Términos y Condiciones</h1>
          <p className="text-sm text-gray-500 mt-1">Última actualización: noviembre de 2026 · Proyecto académico SIP 2025 – USAL</p>
        </header>
        {sections.map((s) => (
          <section key={s.title} id={s.id} className="flex flex-col gap-2 scroll-mt-6">
            <h2 className="text-base font-bold text-gray-900">{s.title}</h2>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 text-sm text-gray-700 leading-relaxed">
              {s.items.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </section>
        ))}
        <Link href="/register" className="self-start text-sm font-semibold text-[#65558F] underline">Volver al registro</Link>
      </article>
    </div>
  )
}
