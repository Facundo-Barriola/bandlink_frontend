'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { X, Music2 } from 'lucide-react'
import { musiciansApi } from '@/lib/api/musicians'
import { useAuthStore } from '@/store/auth.store'
import type { Instrument, InstrumentLevel, SelectedInstrument } from '@/types/musician'

const LEVELS: InstrumentLevel[] = ['Principiante', 'Intermedio', 'Avanzado', 'Profesional']

const inputClass =
  'w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65558F] border-[#65558F] placeholder-[#65558F]/50 text-[#65558F]'
const labelClass = 'block text-sm font-semibold text-[#65558F] mb-1'

export default function SetupMusicoPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  // Instruments state
  const [instrumentSearch, setInstrumentSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedInstruments, setSelectedInstruments] = useState<SelectedInstrument[]>([])
  const [primaryId, setPrimaryId] = useState<string | null>(null)

  // Genres state
  const [selectedGenreIds, setSelectedGenreIds] = useState<Set<string>>(new Set())
  const [genreSearch, setGenreSearch] = useState('')

  // Optional fields
  const [experience, setExperience] = useState('')
  const [summary, setSummary] = useState('')

  // Error
  const [error, setError] = useState<string | null>(null)

  // Load catalogs
  const { data: instruments = [], isLoading: loadingInstruments } = useQuery({
    queryKey: ['musicians', 'catalog', 'instruments'],
    queryFn: musiciansApi.getInstrumentCatalog,
    staleTime: Infinity,
  })

  const { data: genres = [], isLoading: loadingGenres } = useQuery({
    queryKey: ['musicians', 'catalog', 'genres'],
    queryFn: musiciansApi.getGenreCatalog,
    staleTime: Infinity,
  })

  // Filtered instrument dropdown (exclude already selected)
  const filteredInstruments = useMemo(() => {
    const q = instrumentSearch.toLowerCase()
    const selectedIds = new Set(selectedInstruments.map((i) => i.instrument_id))
    return instruments
      .filter((i) => !selectedIds.has(i.instrument_id))
      .filter(
        (i) =>
          i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q),
      )
      .slice(0, 20)
  }, [instruments, instrumentSearch, selectedInstruments])

  const filteredGenres = useMemo(() => {
    const q = genreSearch.toLowerCase()
    return genres.filter((g) => g.name.toLowerCase().includes(q))
  }, [genres, genreSearch])

  const addInstrument = (instrument: Instrument) => {
    const isFirst = selectedInstruments.length === 0
    const newInst: SelectedInstrument = {
      instrument_id: instrument.instrument_id,
      name: instrument.name,
      category: instrument.category,
      level: 'Intermedio',
    }
    setSelectedInstruments((prev) => [...prev, newInst])
    if (isFirst) setPrimaryId(instrument.instrument_id)
    setInstrumentSearch('')
    setShowDropdown(false)
  }

  const removeInstrument = (id: string) => {
    const updated = selectedInstruments.filter((i) => i.instrument_id !== id)
    setSelectedInstruments(updated)
    if (primaryId === id) {
      setPrimaryId(updated[0]?.instrument_id ?? null)
    }
  }

  // Update level
  const updateLevel = (id: string, level: InstrumentLevel) => {
    setSelectedInstruments((prev) =>
      prev.map((i) => (i.instrument_id === id ? { ...i, level } : i)),
    )
  }

  // Toggle genre
  const toggleGenre = (id: string) => {
    setSelectedGenreIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Submit
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (selectedInstruments.length === 0) throw new Error('Agregá al menos un instrumento.')
      if (selectedGenreIds.size === 0) throw new Error('Seleccioná al menos un género.')

      await musiciansApi.createProfile({
        experience: experience ? parseInt(experience, 10) : undefined,
        summary: summary || undefined,
      })

      for (const inst of selectedInstruments) {
        await musiciansApi.addInstrument({
          instrument_id: inst.instrument_id,
          level: inst.level,
          is_primary:
            selectedInstruments.length === 1 || inst.instrument_id === primaryId,
        })
      }

      await musiciansApi.addGenres(Array.from(selectedGenreIds))
    },
    onSuccess: () => {
      if (user) {
        setUser({ ...user, role: 'MUSICIAN' })
      }
      router.push('/dashboard')
    },
    onError: (err: Error) => {
      setError(err.message || 'Ocurrió un error. Intentá de nuevo.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    mutate()
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center pt-10 pb-16 px-4">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-2xl flex flex-col gap-7">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: '#65558F' }}>
            <Music2 size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#65558F]">Armá tu perfil de músico</h1>
            <p className="text-sm text-gray-500">
              Elegí tus instrumentos y géneros para conectarte con otros músicos y bandas.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-7">

          {/* ── Instrumentos ───────────────────────────────────── */}
          <div>
            <label className={labelClass}>
              Instrumentos <span className="text-red-400">*</span>
            </label>

            <div className="relative">
              <input
                type="text"
                value={instrumentSearch}
                onChange={(e) => {
                  setInstrumentSearch(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder={loadingInstruments ? 'Cargando...' : 'Buscar instrumento...'}
                disabled={loadingInstruments}
                className={inputClass}
              />

              {showDropdown && filteredInstruments.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-[#65558F]/30 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                  {filteredInstruments.map((inst) => (
                    <button
                      key={inst.instrument_id}
                      type="button"
                      onMouseDown={() => addInstrument(inst)}
                      className="w-full text-left px-4 py-2.5 hover:bg-[#65558F]/10 flex justify-between items-center transition-colors"
                    >
                      <span className="text-[#65558F] font-medium text-sm">{inst.name}</span>
                      <span className="text-xs text-gray-400">{inst.category}</span>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && instrumentSearch.length > 0 && filteredInstruments.length === 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-[#65558F]/30 rounded-xl shadow-lg px-4 py-3">
                  <p className="text-sm text-gray-400">Sin resultados para "{instrumentSearch}"</p>
                </div>
              )}
            </div>

            {/* Selected instruments list */}
            {selectedInstruments.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {selectedInstruments.map((inst) => {
                  const isPrimary =
                    selectedInstruments.length === 1 || inst.instrument_id === primaryId
                  return (
                    <div
                      key={inst.instrument_id}
                      className="flex flex-wrap items-center gap-3 border rounded-xl px-4 py-3 transition-colors"
                      style={{ borderColor: isPrimary ? '#65558F' : '#e5e7eb' }}
                    >
                      {selectedInstruments.length === 1 ? (
                        <span className="text-xs font-semibold shrink-0" style={{ color: '#65558F' }}>
                          Principal
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPrimaryId(inst.instrument_id)}
                          className="flex items-center gap-1.5 text-xs font-medium shrink-0 transition-colors"
                          style={{ color: isPrimary ? '#65558F' : '#9ca3af' }}
                          title="Marcar como principal"
                        >
                          <div
                            className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                            style={{
                              borderColor: isPrimary ? '#65558F' : '#d1d5db',
                            }}
                          >
                            {isPrimary && (
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: '#65558F' }}
                              />
                            )}
                          </div>
                          Principal
                        </button>
                      )}

                      {/* Name + category */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#65558F] truncate">{inst.name}</p>
                        <p className="text-xs text-gray-400">{inst.category}</p>
                      </div>

                      {/* Level selector */}
                      <select
                        value={inst.level}
                        onChange={(e) =>
                          updateLevel(inst.instrument_id, e.target.value as InstrumentLevel)
                        }
                        className="text-sm border border-[#65558F]/30 rounded-lg px-2 py-1.5 text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F] bg-white"
                      >
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeInstrument(inst.instrument_id)}
                        className="p-1 rounded-full hover:bg-red-50 text-red-400 shrink-0 transition-colors"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Géneros ────────────────────────────────────────── */}
          <div>
            <label className={labelClass}>
              Géneros <span className="text-red-400">*</span>
            </label>

            <input
              type="text"
              value={genreSearch}
              onChange={(e) => setGenreSearch(e.target.value)}
              placeholder={loadingGenres ? 'Cargando...' : 'Filtrar géneros...'}
              disabled={loadingGenres}
              className={`${inputClass} mb-3`}
            />

            <div className="flex flex-wrap gap-2">
              {filteredGenres.map((genre) => {
                const selected = selectedGenreIds.has(genre.genre_id)
                return (
                  <button
                    key={genre.genre_id}
                    type="button"
                    onClick={() => toggleGenre(genre.genre_id)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all"
                    style={{
                      borderColor: '#65558F',
                      backgroundColor: selected ? '#65558F' : 'white',
                      color: selected ? 'white' : '#65558F',
                    }}
                  >
                    {genre.name}
                  </button>
                )
              })}
            </div>

            {selectedGenreIds.size > 0 && (
              <p className="text-xs mt-2" style={{ color: '#65558F99' }}>
                {selectedGenreIds.size} género{selectedGenreIds.size > 1 ? 's' : ''} seleccionado
                {selectedGenreIds.size > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* ── Datos opcionales ───────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Opcional
            </p>

            <div>
              <label className={labelClass}>Años de experiencia</label>
              <input
                type="number"
                min={0}
                max={80}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="ej. 5"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Bio musical</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Contá tu estilo, proyectos o lo que buscás en BandLink..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full py-3 font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#65558F' }}
          >
            {isPending ? 'Creando perfil...' : 'Crear perfil de músico'}
          </button>
        </form>
      </div>
    </div>
  )
}
