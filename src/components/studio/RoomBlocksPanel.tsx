'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { studioApi } from '@/lib/api/studio'
import { bookingsApi } from '@/lib/api/bookings'
import {
  apiErrorMessage, formatBookingDate, formatBookingRange, formatBookingTime, nowAsWallClockUtc, wallClockInputToIso,
} from '@/lib/booking-format'

const QUICK_REASONS = ['Feriado', 'Mantenimiento', 'Uso propio', 'Evento privado']
const inputClass =
  'border border-[#65558F]/30 rounded-lg px-2.5 py-2 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F] bg-white'

/**
 * CU25 – Administrar horarios: bloquear franjas puntuales de una sala
 * (feriados, mantenimiento…). Los bloqueos se descuentan de la disponibilidad
 * que ven los músicos al reservar.
 */
export function RoomBlocksPanel({ studioId, roomId }: { studioId: string; roomId: string }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const key = ['studio', studioId, 'room', roomId, 'blocks']

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () => studioApi.getRoomBlocks(studioId, roomId),
  })

  // Reservas activas de la sala, para avisar si un bloqueo se superpone
  const { data: active } = useQuery({
    queryKey: ['bookings', 'studio', studioId, 'active'],
    queryFn: () => bookingsApi.getStudioActiveBookings(studioId),
    enabled: open,
  })

  const upcoming = useMemo(() => {
    const now = nowAsWallClockUtc()
    return blocks
      .filter((b) => new Date(b.ends_at).getTime() > now)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  }, [blocks])

  const overlapping = useMemo(() => {
    if (!startsAt || !endsAt) return []
    const s = new Date(wallClockInputToIso(startsAt)).getTime()
    const e = new Date(wallClockInputToIso(endsAt)).getTime()
    return (active?.items ?? []).filter(
      (b) => b.room_id === roomId && new Date(b.starts_at).getTime() < e && new Date(b.ends_at).getTime() > s,
    )
  }, [active, startsAt, endsAt, roomId])

  const reset = () => { setOpen(false); setStartsAt(''); setEndsAt(''); setReason(''); setError(null) }

  const create = useMutation({
    mutationFn: () => {
      if (!startsAt || !endsAt) throw new Error('Indicá inicio y fin del bloqueo.')
      if (endsAt <= startsAt) throw new Error('El fin tiene que ser posterior al inicio.')
      return studioApi.createRoomBlock(studioId, roomId, {
        starts_at: wallClockInputToIso(startsAt),
        ends_at: wallClockInputToIso(endsAt),
        reason: reason.trim() || undefined,
      })
    },
    onSuccess: () => {
      reset()
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['availability', roomId] })
    },
    onError: (e) => setError(apiErrorMessage(e)),
  })

  const remove = useMutation({
    mutationFn: (blockId: string) => studioApi.deleteRoomBlock(studioId, roomId, blockId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['availability', roomId] })
    },
  })

  /** Atajo: bloquear un día completo. */
  const wholeDay = () => {
    const day = (startsAt || new Date().toISOString()).slice(0, 10)
    setStartsAt(`${day}T00:00`)
    setEndsAt(`${day}T23:59`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Ban size={13} className="text-[#65558F]" />
          <span className="text-xs font-semibold text-[#65558F] uppercase tracking-wide">Bloqueos</span>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs font-semibold text-[#65558F] hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> Bloquear horario
          </button>
        )}
      </div>

      {open && (
        <div className="rounded-xl bg-[#65558F]/5 p-3 flex flex-col gap-2 mb-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-[11px] text-gray-500">
              Desde
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={`${inputClass} w-full mt-0.5`} />
            </label>
            <label className="text-[11px] text-gray-500">
              Hasta
              <input type="datetime-local" value={endsAt} min={startsAt} onChange={(e) => setEndsAt(e.target.value)} className={`${inputClass} w-full mt-0.5`} />
            </label>
          </div>
          <button type="button" onClick={wholeDay} className="self-start text-[11px] font-semibold text-[#65558F] hover:underline">
            Bloquear el día completo
          </button>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                  reason === r ? 'bg-[#65558F] text-white border-[#65558F]' : 'border-[#65558F]/30 text-[#65558F] hover:bg-[#65558F]/10'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 300))}
            placeholder="Motivo (opcional, no lo ven los músicos)"
            className={inputClass}
          />
          {overlapping.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-700">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                Hay {overlapping.length} reserva{overlapping.length > 1 ? 's' : ''} en ese horario. El bloqueo no las cancela:
                si corresponde, cancelalas desde Reservas para avisarle al músico.
              </span>
            </div>
          )}
          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setError(null); create.mutate() }}
              disabled={create.isPending}
              className="rounded-full px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60 flex items-center gap-1"
              style={{ backgroundColor: '#65558F' }}
            >
              {create.isPending && <Loader2 size={12} className="animate-spin" />} Guardar bloqueo
            </button>
            <button type="button" onClick={reset} className="rounded-full px-4 py-1.5 text-xs font-semibold border border-gray-200 text-gray-500">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-gray-400">Cargando…</p>
      ) : upcoming.length === 0 ? (
        <p className="text-xs text-gray-400">Sin bloqueos próximos.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {upcoming.map((b) => (
            <div key={b.block_id} className="flex items-center justify-between gap-2 text-sm text-gray-600 rounded-lg px-2 py-1.5 hover:bg-gray-50">
              <span className="min-w-0">
                {b.starts_at.slice(0, 10) === b.ends_at.slice(0, 10) ? (
                  <>
                    <span className="capitalize">{formatBookingDate(b.starts_at)}</span>
                    <span className="text-gray-400"> · {formatBookingRange(b.starts_at, b.ends_at)}</span>
                  </>
                ) : (
                  <span className="capitalize">
                    {formatBookingDate(b.starts_at)} {formatBookingTime(b.starts_at)} → {formatBookingDate(b.ends_at)} {formatBookingTime(b.ends_at)}
                  </span>
                )}
                {b.reason && <span className="block text-xs text-gray-400 truncate">{b.reason}</span>}
              </span>
              <button
                type="button"
                onClick={() => remove.mutate(b.block_id)}
                disabled={remove.isPending && remove.variables === b.block_id}
                className="p-1 rounded-full hover:bg-red-50 text-red-400 shrink-0"
                title="Quitar bloqueo"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
