'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Flag, X, Check } from 'lucide-react'
import { reviewsApi, type ReportTarget } from '@/lib/api/reviews'
import { apiErrorMessage } from '@/lib/booking-format'

const REASONS: Record<ReportTarget, string[]> = {
  user: ['Comportamiento inapropiado', 'Acoso u ofensas', 'Perfil falso o suplantación', 'Spam', 'No se presentó a un ensayo o evento', 'Otro'],
  studio: ['Información falsa (precios, equipos, horarios)', 'Mala atención', 'Cobros indebidos', 'Instalaciones inseguras', 'Otro'],
  band: ['Contenido inapropiado', 'Perfil falso', 'Spam', 'Otro'],
  event: ['Evento falso o engañoso', 'Contenido inapropiado', 'Spam', 'Otro'],
  booking: ['Problema con la reserva', 'Otro'],
  message: ['Acoso u ofensas', 'Spam', 'Otro'],
}

const TARGET_LABEL: Record<ReportTarget, string> = {
  user: 'este usuario', studio: 'esta sala', band: 'esta banda', event: 'este evento', booking: 'esta reserva', message: 'este mensaje',
}

/** CU21 – Reportar (anónimo para el reportado; queda pendiente de moderación). */
export function ReportButton({
  targetType,
  targetId,
  variant = 'link',
}: {
  targetType: ReportTarget
  targetId: string
  variant?: 'link' | 'icon'
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')

  const report = useMutation({
    mutationFn: () =>
      reviewsApi.createReport({
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details.trim() || undefined,
      }),
  })

  const close = () => {
    setOpen(false)
    setReason('')
    setDetails('')
    report.reset()
  }

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-full border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
          title="Reportar"
          aria-label="Reportar"
        >
          <Flag size={15} />
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500">
          <Flag size={13} /> Reportar
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <h2 className="text-lg font-bold text-gray-900">Reportar {TARGET_LABEL[targetType]}</h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {report.isSuccess ? (
              <div className="px-6 pb-6 flex flex-col items-center text-center gap-3">
                <Check size={40} className="text-green-500" />
                <p className="font-semibold text-gray-800">Recibimos tu reporte</p>
                <p className="text-sm text-gray-500">Lo vamos a revisar. La persona reportada no sabrá quién lo envió.</p>
                <button onClick={close} className="rounded-full px-6 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: '#65558F' }}>
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="px-6 pb-6 flex flex-col gap-3 overflow-y-auto">
                <p className="text-sm text-gray-500">¿Cuál es el motivo?</p>
                <div className="flex flex-col gap-1.5">
                  {REASONS[targetType].map((r) => (
                    <label
                      key={r}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                        reason === r ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-red-500" />
                      {r}
                    </label>
                  ))}
                </div>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                  rows={3}
                  placeholder="Contanos qué pasó (opcional)"
                  className="border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200"
                />
                {report.isError && (
                  <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{apiErrorMessage(report.error)}</p>
                )}
                <button
                  onClick={() => report.mutate()}
                  disabled={!reason || report.isPending}
                  className="rounded-full py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                >
                  {report.isPending ? 'Enviando…' : 'Enviar reporte'}
                </button>
                <p className="text-xs text-gray-400 text-center">Tu identidad no se comparte con la persona reportada.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
