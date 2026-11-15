import Image from 'next/image'

export const authInputClass =
  'w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65558F] border-[#65558F] placeholder-[#65558F]/50 text-[#65558F]'

export const authButtonClass =
  'w-full py-3 rounded-full font-semibold transition-colors duration-200 disabled:opacity-50 text-white bg-[#65558F] hover:brightness-95 active:scale-[0.99]'

/** Contenedor visual de las pantallas de autenticación (mismo estilo que el login). */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md flex flex-col gap-5">
        <div className="flex justify-center">
          <Image src="/logo-bandlink.png" alt="BandLink" width={96} height={96} priority className="object-contain" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#65558F]">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

export function AuthError({ msg }: { msg: string }) {
  return <p className="text-sm text-red-600 border border-red-300 bg-red-50 rounded-lg px-3.5 py-2.5">{msg}</p>
}

export function AuthSuccess({ msg }: { msg: string }) {
  return <p className="text-sm text-green-700 border border-green-300 bg-green-50 rounded-lg px-3.5 py-2.5">{msg}</p>
}
