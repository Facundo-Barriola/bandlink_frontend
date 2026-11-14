'use client'

import { useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppNavbar } from '@/components/AppNavbar'
import { useAuthStore } from '@/store/auth.store'
import { musiciansApi } from '@/lib/api/musicians'
import { bandsApi } from '@/lib/api/bands'
import { socialApi } from '@/lib/api/social'
import { chatApi } from '@/lib/api/chat'
import {
    Music2, Star, Users, Camera, ImageIcon,
    Pencil, Plus, X, MapPin, ChevronRight,
    MessageCircle, UserPlus, UserCheck, UserX,
} from 'lucide-react'

const SPOTIFY_ICON = (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#1DB954]" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.318a.75.75 0 0 1-1.032.25c-2.827-1.727-6.387-2.117-10.578-1.16a.75.75 0 1 1-.334-1.463c4.587-1.047 8.52-.596 11.695 1.341a.75.75 0 0 1 .249 1.032zm1.47-3.268a.937.937 0 0 1-1.288.308c-3.233-1.987-8.163-2.563-11.984-1.403a.937.937 0 0 1-.578-1.786c4.37-1.314 9.8-.678 13.542 1.594a.937.937 0 0 1 .308 1.287zm.127-3.402C15.27 8.45 9.395 8.25 5.92 9.303a1.125 1.125 0 1 1-.652-2.154c4.024-1.218 10.718-.982 14.944 1.58a1.125 1.125 0 0 1-1.098 1.919z" />
    </svg>
)

const inputClass = 'w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#65558F] border-[#65558F] placeholder-[#65558F]/50 text-[#65558F]'
const labelClass = 'block text-sm font-semibold text-[#65558F] mb-1'

export default function PerfilPage() {
    const params = useParams()
    const router = useRouter()
    const profileUserId = params.userId as string
    const currentUser = useAuthStore((s) => s.user)
    const isOwnProfile = currentUser?.userId === profileUserId
    const avatarInputRef = useRef<HTMLInputElement>(null)
    const mediaInputRef = useRef<HTMLInputElement>(null)

    const [editOpen, setEditOpen] = useState(false)
    const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string } | null>(null)
    const [form, setForm] = useState({
        display_name: '',
        bio: '',
        skill_summary: '',
        years_experience: '',
    })
    const [editTab, setEditTab] = useState<'info' | 'instrumentos' | 'generos'>('info')
    const [instSearch, setInstSearch] = useState('')
    const [instDropdownOpen, setInstDropdownOpen] = useState(false)
    const [pendingInst, setPendingInst] = useState<{ instrument_id: string; name: string } | null>(null)
    const [pendingLevel, setPendingLevel] = useState('Intermedio')
    const [startingChat, setStartingChat] = useState(false)
    const [confirmRemoveFriend, setConfirmRemoveFriend] = useState(false)

    const queryClient = useQueryClient()

    const { data: catalogInstruments = [] } = useQuery({
        queryKey: ['musicians', 'catalog', 'instruments'],
        queryFn: musiciansApi.getInstrumentCatalog,
        staleTime: Infinity,
        enabled: editOpen,
    })

    const { data: catalogGenres = [] } = useQuery({
        queryKey: ['musicians', 'catalog', 'genres'],
        queryFn: musiciansApi.getGenreCatalog,
        staleTime: Infinity,
        enabled: editOpen,
    })

    const { data: profile, isLoading } = useQuery({
        queryKey: ['musician-profile', profileUserId],
        queryFn: () =>
            isOwnProfile
                ? musiciansApi.getMyProfile()
                : musiciansApi.getMusicianByUserId(profileUserId),
        enabled: !!profileUserId,
    })

    const { data: myBands = [], isLoading: loadingBands } = useQuery({
        queryKey: isOwnProfile ? ['bands', 'mine'] : ['bands', 'user', profileUserId],
        queryFn: isOwnProfile ? bandsApi.getMine : () => bandsApi.getByUser(profileUserId),
        enabled: !!profileUserId,
    })

    const { data: socialStatus, refetch: refetchStatus } = useQuery({
        queryKey: ['social', 'status', profileUserId],
        queryFn: () => socialApi.getUserSocialStatus(profileUserId),
        enabled: !!profileUserId && !isOwnProfile,
    })

    // Social mutations
    const { mutate: doSendRequest, isPending: sendingRequest } = useMutation({
        mutationFn: () => socialApi.sendFriendRequest(profileUserId),
        onSuccess: () => {
            refetchStatus()
            queryClient.invalidateQueries({ queryKey: ['social', 'friend-requests'] })
        },
    })

    const { mutate: doCancelRequest, isPending: cancellingRequest } = useMutation({
        mutationFn: () => socialApi.cancelRequest(socialStatus!.request_id!),
        onSuccess: () => {
            refetchStatus()
            queryClient.invalidateQueries({ queryKey: ['social', 'friend-requests'] })
        },
    })

    const { mutate: doAcceptRequest, isPending: acceptingRequest } = useMutation({
        mutationFn: () => socialApi.acceptRequest(socialStatus!.request_id!),
        onSuccess: () => {
            refetchStatus()
            queryClient.invalidateQueries({ queryKey: ['social', 'friends'] })
        },
    })

    const { mutate: doRejectRequest, isPending: rejectingRequest } = useMutation({
        mutationFn: () => socialApi.rejectRequest(socialStatus!.request_id!),
        onSuccess: () => refetchStatus(),
    })

    const { mutate: doRemoveFriendship, isPending: removingFriend } = useMutation({
        mutationFn: () => socialApi.removeFriendship(socialStatus!.friendship_id!),
        onSuccess: () => {
            setConfirmRemoveFriend(false)
            refetchStatus()
            queryClient.invalidateQueries({ queryKey: ['social', 'friends'] })
        },
    })

    const { mutate: doFollow, isPending: followingUser } = useMutation({
        mutationFn: () => socialApi.follow('user', profileUserId),
        onSuccess: () => refetchStatus(),
    })

    const { mutate: doUnfollow, isPending: unfollowingUser } = useMutation({
        mutationFn: () => socialApi.unfollow('user', profileUserId),
        onSuccess: () => refetchStatus(),
    })

    const handleStartChat = async () => {
        setStartingChat(true)
        try {
            const conv = await chatApi.createDirectConversation(profileUserId)
            router.push(`/chat/${conv.conversation_id}`)
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? 'No se pudo abrir el chat'
            alert(typeof msg === 'string' ? msg : JSON.stringify(msg))
        } finally {
            setStartingChat(false)
        }
    }

    // Profile mutations
    const { mutate: doUploadAvatar, isPending: uploadingAvatar } = useMutation({
        mutationFn: (file: File) => musiciansApi.uploadAvatar(file),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['musician-profile', profileUserId] }),
    })

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) doUploadAvatar(file)
    }

    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) doUploadMedia(file)
        e.target.value = ''
    }

    const { mutate: saveProfile, isPending: saving } = useMutation({
        mutationFn: () =>
            musiciansApi.updateProfile({
                display_name: form.display_name || undefined,
                bio: form.bio || undefined,
                skill_summary: form.skill_summary || undefined,
                years_experience: form.years_experience ? parseInt(form.years_experience) : undefined,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['musician-profile', profileUserId] })
            setEditOpen(false)
        },
    })

    const { mutate: doAddInstrument, isPending: addingInst } = useMutation({
        mutationFn: () =>
            musiciansApi.addInstrument({
                instrument_id: pendingInst!.instrument_id,
                level: pendingLevel,
                is_primary: instruments.length === 0,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['musician-profile', profileUserId] })
            setPendingInst(null)
            setInstSearch('')
        },
    })

    const { mutate: doRemoveInstrument } = useMutation({
        mutationFn: (id: string) => musiciansApi.removeInstrument(id),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ['musician-profile', profileUserId] }),
    })

    const { mutate: doToggleGenre } = useMutation({
        mutationFn: ({ genreId, selected }: { genreId: string; selected: boolean }) =>
            selected ? musiciansApi.removeGenre(genreId) : musiciansApi.addGenres([genreId]),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ['musician-profile', profileUserId] }),
    })

    const { data: ownMedia = [] } = useQuery({
        queryKey: ['user-media', profileUserId],
        queryFn: musiciansApi.listUserMedia,
        enabled: isOwnProfile,
    })

    const { mutate: doUploadMedia, isPending: uploadingMedia } = useMutation({
        mutationFn: (file: File) => musiciansApi.uploadUserMedia(file),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-media', profileUserId] }),
    })

    const { mutate: doDeleteMedia } = useMutation({
        mutationFn: (mediaId: string) => musiciansApi.deleteUserMedia(mediaId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-media', profileUserId] }),
    })

    const openEdit = () => {
        if (!profile) return
        setForm({
            display_name: profile.display_name ?? '',
            bio: profile.bio ?? '',
            skill_summary: profile.musician_profile?.skill_summary ?? '',
            years_experience: String(profile.musician_profile?.years_experience ?? ''),
        })
        setEditOpen(true)
    }

    const displayName = profile?.display_name || profile?.username || '—'
    const initials = displayName.charAt(0).toUpperCase()
    const instruments = profile?.musician_instrument ?? []
    const genres = profile?.musician_genre?.map((mg: any) => mg.genres) ?? []
    const location = profile?.places
        ? [profile.places.city, profile.places.region].filter(Boolean).join(', ')
        : null
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    const avatarUrl = profile?.profile_picture_url
        ? `${API_URL}${profile.profile_picture_url}`
        : null
    const mediaItems: any[] = isOwnProfile ? ownMedia : (profile?.user_media ?? [])

    const filteredCatalog = useMemo(() => {
        const q = instSearch.toLowerCase()
        const existingIds = new Set(
            instruments.map((i: any) => i.instrument.instrument_id).filter(Boolean)
        )
        return catalogInstruments
            .filter((i: any) => !existingIds.has(i.instrument_id))
            .filter((i: any) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
            .slice(0, 15)
    }, [catalogInstruments, instSearch, instruments])

    const currentGenreIds = useMemo(
        () => new Set(genres.map((g: any) => g.genre_id)),
        [genres]
    )

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100">
                <AppNavbar />
                <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-2xl shadow-sm h-40 animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gray-100">
                <AppNavbar />
                <div className="max-w-5xl mx-auto px-4 py-20 text-center text-gray-500">
                    Perfil no encontrado.
                </div>
            </div>
        )
    }

    const isFriend = socialStatus?.are_friends
    const isPendingSent =
        !isFriend &&
        socialStatus?.request_status === 'Pendiente' &&
        socialStatus?.request_direction === 'sent'
    const isPendingReceived =
        !isFriend &&
        socialStatus?.request_status === 'Pendiente' &&
        socialStatus?.request_direction === 'received'

    const SocialActions = () => {
        if (isOwnProfile) {
            return (
                <button
                    onClick={openEdit}
                    className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold border-2 transition-colors hover:bg-[#65558F]/10"
                    style={{ borderColor: '#65558F', color: '#65558F' }}
                >
                    <Pencil size={14} />
                    Editar perfil
                </button>
            )
        }

        return (
            <div className="flex items-center gap-2 flex-wrap justify-end">
                {isFriend ? (
                    <>
                        <button
                            onClick={handleStartChat}
                            disabled={startingChat}
                            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                            style={{ backgroundColor: '#65558F' }}
                        >
                            <MessageCircle size={14} />
                            {startingChat ? '...' : 'Mensaje'}
                        </button>
                        {confirmRemoveFriend ? (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-500">¿Eliminar amigo?</span>
                                <button
                                    onClick={() => doRemoveFriendship()}
                                    disabled={removingFriend}
                                    className="rounded-full px-3 py-1.5 text-xs font-semibold bg-red-500 text-white disabled:opacity-60"
                                >
                                    {removingFriend ? '...' : 'Sí'}
                                </button>
                                <button
                                    onClick={() => setConfirmRemoveFriend(false)}
                                    className="rounded-full px-3 py-1.5 text-xs font-semibold border border-gray-300 text-gray-500"
                                >
                                    No
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setConfirmRemoveFriend(true)}
                                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold border-2 hover:border-red-300 hover:text-red-500 transition-colors"
                                style={{ borderColor: '#65558F', color: '#65558F' }}
                            >
                                <UserCheck size={14} />
                                Amigos
                            </button>
                        )}
                    </>
                ) : isPendingSent ? (
                    <button
                        onClick={() => doCancelRequest()}
                        disabled={cancellingRequest}
                        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold border-2 transition-colors hover:bg-red-50 hover:border-red-300 hover:text-red-500"
                        style={{ borderColor: '#65558F', color: '#65558F' }}
                    >
                        <UserCheck size={14} />
                        {cancellingRequest ? '...' : 'Solicitud enviada'}
                    </button>
                ) : isPendingReceived ? (
                    <>
                        <button
                            onClick={() => doAcceptRequest()}
                            disabled={acceptingRequest}
                            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                            style={{ backgroundColor: '#65558F' }}
                        >
                            <UserPlus size={14} />
                            {acceptingRequest ? '...' : 'Aceptar'}
                        </button>
                        <button
                            onClick={() => doRejectRequest()}
                            disabled={rejectingRequest}
                            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold border-2 border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500 transition-colors"
                        >
                            <UserX size={14} />
                            {rejectingRequest ? '...' : 'Rechazar'}
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => doSendRequest()}
                        disabled={sendingRequest || !socialStatus}
                        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: '#65558F' }}
                    >
                        <UserPlus size={14} />
                        {sendingRequest ? 'Enviando...' : 'Agregar amigo'}
                    </button>
                )}

                {socialStatus?.is_following ? (
                    <button
                        onClick={() => doUnfollow()}
                        disabled={unfollowingUser}
                        className="rounded-full px-4 py-2 text-sm font-semibold border-2 transition-colors hover:bg-[#65558F]/10 disabled:opacity-60"
                        style={{ borderColor: '#65558F', color: '#65558F' }}
                    >
                        {unfollowingUser ? '...' : 'Siguiendo'}
                    </button>
                ) : (
                    <button
                        onClick={() => doFollow()}
                        disabled={followingUser || !socialStatus}
                        className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: '#65558F' }}
                    >
                        {followingUser ? '...' : 'Seguir'}
                    </button>
                )}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <AppNavbar />

            <main className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="h-36 sm:h-52" style={{ backgroundColor: '#65558F' }} />

                    <div className="px-6 pb-6">
                        <div className="flex items-end justify-between -mt-12 mb-4">
                            <div className="relative w-24 h-24 group">
                                {isOwnProfile && (
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={avatarInputRef}
                                        onChange={handleAvatarChange}
                                    />
                                )}
                                <div className="w-24 h-24 rounded-full border-4 border-white overflow-hidden shadow-md">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold" style={{ backgroundColor: '#65558F' }}>
                                            {initials}
                                        </div>
                                    )}
                                </div>
                                {isOwnProfile && (
                                    <div
                                        onClick={() => avatarInputRef.current?.click()}
                                        className="absolute inset-0 rounded-full border-4 border-white bg-black/40 flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                        {uploadingAvatar
                                            ? <span className="text-white text-[10px]">Subiendo...</span>
                                            : <>
                                                <Camera size={16} className="text-white" />
                                                <span className="text-white text-[10px] font-semibold leading-tight">Cambiar foto</span>
                                            </>
                                        }
                                    </div>
                                )}
                            </div>

                            <SocialActions />
                        </div>

                        <div className="mb-3">
                            <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
                            <p className="text-sm text-gray-500">@{profile.username}</p>
                            {location && (
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                    <MapPin size={12} /> {location}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {instruments.map((mi: any) => (
                                <span
                                    key={mi.musician_instrument_id ?? mi.instrument.name}
                                    className="px-3 py-1 rounded-full text-xs font-semibold border-2 flex items-center gap-1"
                                    style={{ borderColor: '#65558F', color: '#65558F' }}
                                >
                                    {mi.is_primary && <span title="Principal">★</span>}
                                    {mi.instrument.name}
                                    {mi.level && <span className="opacity-60">· {mi.level}</span>}
                                </span>
                            ))}
                            {genres.map((g: any) => (
                                <span
                                    key={g.genre_id}
                                    className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
                                >
                                    {g.name}
                                </span>
                            ))}
                        </div>

                        {profile.bio && (
                            <p className="text-sm text-gray-600 mb-4 leading-relaxed">{profile.bio}</p>
                        )}

                        {profile.musician_profile?.skill_summary && (
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <Music2 size={14} style={{ color: '#65558F' }} />
                                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#65558F' }}>
                                        Resumen musical
                                        {profile.musician_profile.years_experience > 0 && (
                                            <span className="ml-2 normal-case font-normal text-gray-400">
                                                · {profile.musician_profile.years_experience}{' '}
                                                {profile.musician_profile.years_experience === 1 ? 'año' : 'años'} de experiencia
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {profile.musician_profile.skill_summary}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Star size={18} style={{ color: '#65558F' }} />
                        <h2 className="text-base font-bold text-gray-900">Reseñas</h2>
                        <span className="text-sm text-gray-400 ml-1">(0)</span>
                    </div>
                    <p className="text-sm text-gray-400 text-center py-8">
                        {isOwnProfile ? 'Todavía no recibiste reseñas.' : 'Este músico aún no tiene reseñas.'}
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users size={18} style={{ color: '#65558F' }} />
                            <h2 className="text-base font-bold text-gray-900">Bandas</h2>
                        </div>
                        {isOwnProfile && (
                            <button
                                onClick={() => router.push('/bandas')}
                                className="text-xs font-semibold"
                                style={{ color: '#65558F' }}
                            >
                                Ver todas →
                            </button>
                        )}
                    </div>
                    {loadingBands ? (
                        <div className="flex justify-center py-8">
                            <div className="w-5 h-5 border-2 border-[#65558F] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : myBands.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">
                            {isOwnProfile ? 'No formás parte de ninguna banda todavía.' : 'No forma parte de ninguna banda todavía.'}
                        </p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {myBands.map((band: any) => (
                                <button
                                    key={band.band_id}
                                    onClick={() => router.push(`/bandas/${band.band_id}`)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left w-full group"
                                >
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#65558F1A' }}>
                                        <Music2 size={16} style={{ color: '#65558F' }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{band.name}</p>
                                        {band.description && (
                                            <p className="text-xs text-gray-400 truncate">{band.description}</p>
                                        )}
                                    </div>
                                    <ChevronRight size={15} className="text-gray-300 group-hover:text-[#65558F] transition-colors shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Camera size={18} style={{ color: '#65558F' }} />
                            <h2 className="text-base font-bold text-gray-900">Galería</h2>
                        </div>
                        {isOwnProfile && (
                            <>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,video/mp4"
                                    className="hidden"
                                    ref={mediaInputRef}
                                    onChange={handleMediaChange}
                                />
                                <button
                                    onClick={() => mediaInputRef.current?.click()}
                                    disabled={uploadingMedia}
                                    className="flex items-center gap-1.5 text-sm font-semibold rounded-full px-4 py-1.5 border-2 transition-colors hover:bg-[#65558F]/10 disabled:opacity-60"
                                    style={{ borderColor: '#65558F', color: '#65558F' }}
                                >
                                    <Plus size={14} />
                                    {uploadingMedia ? 'Subiendo...' : 'Agregar'}
                                </button>
                            </>
                        )}
                    </div>

                    {mediaItems.length > 0 ? (
                        <div className="grid grid-cols-4 gap-1.5">
                            {mediaItems.map((m: any, i: number) => (
                                <div
                                    key={m.media?.media_id ?? i}
                                    className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group cursor-pointer"
                                    onClick={() => setSelectedMedia({ url: `${API_URL}${m.media.url}`, type: m.media.media_type })}
                                >
                                    {m.media.media_type === 'image' ? (
                                        <img src={`${API_URL}${m.media.url}`} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                                    ) : (
                                        <video src={`${API_URL}${m.media.url}`} className="w-full h-full object-cover" muted />
                                    )}
                                    {isOwnProfile && m.media?.media_id && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); doDeleteMedia(m.media.media_id) }}
                                            className="absolute top-1 right-1 p-0.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/90"
                                            title="Eliminar"
                                        >
                                            <X size={11} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-300">
                            <ImageIcon size={56} strokeWidth={1} />
                            <p className="text-sm text-gray-400">
                                {isOwnProfile ? 'Todavía no subiste fotos ni videos.' : 'Todavía no hay fotos ni videos.'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            {SPOTIFY_ICON}
                            <h2 className="text-base font-bold text-gray-900">Spotify</h2>
                        </div>
                        {isOwnProfile && (
                            <button
                                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: '#1DB954' }}
                            >
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.516 17.318a.75.75 0 0 1-1.032.25c-2.827-1.727-6.387-2.117-10.578-1.16a.75.75 0 1 1-.334-1.463c4.587-1.047 8.52-.596 11.695 1.341a.75.75 0 0 1 .249 1.032zm1.47-3.268a.937.937 0 0 1-1.288.308c-3.233-1.987-8.163-2.563-11.984-1.403a.937.937 0 0 1-.578-1.786c4.37-1.314 9.8-.678 13.542 1.594a.937.937 0 0 1 .308 1.287zm.127-3.402C15.27 8.45 9.395 8.25 5.92 9.303a1.125 1.125 0 1 1-.652-2.154c4.024-1.218 10.718-.982 14.944 1.58a1.125 1.125 0 0 1-1.098 1.919z" />
                                </svg>
                                Conectar Spotify
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-gray-400 text-center py-8">
                        {isOwnProfile
                            ? 'Conectá tu cuenta de Spotify para mostrar los artistas que más escuchás.'
                            : 'Este músico no conectó su Spotify todavía.'}
                    </p>
                </div>

            </main>

            {selectedMedia && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
                    onClick={() => setSelectedMedia(null)}
                >
                    <button
                        onClick={() => setSelectedMedia(null)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                        <X size={22} />
                    </button>
                    <div
                        className="max-w-3xl w-full mx-4 max-h-[88vh] flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {selectedMedia.type === 'image' ? (
                            <img
                                src={selectedMedia.url}
                                alt=""
                                className="max-w-full max-h-[88vh] rounded-xl object-contain shadow-2xl"
                            />
                        ) : (
                            <video
                                src={selectedMedia.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[88vh] rounded-xl shadow-2xl"
                            />
                        )}
                    </div>
                </div>
            )}

            {editOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

                        <div className="flex items-center justify-between px-8 pt-8 pb-4 shrink-0">
                            <h2 className="text-lg font-bold text-[#65558F]">Editar perfil</h2>
                            <button onClick={() => setEditOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex border-b border-gray-100 px-8 shrink-0">
                            {(['info', 'instrumentos', 'generos'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setEditTab(tab)}
                                    className="pb-2 mr-6 text-sm font-semibold capitalize transition-colors border-b-2"
                                    style={{
                                        borderColor: editTab === tab ? '#65558F' : 'transparent',
                                        color: editTab === tab ? '#65558F' : '#9ca3af',
                                    }}
                                >
                                    {tab === 'info' ? 'Información' : tab === 'instrumentos' ? 'Instrumentos' : 'Géneros'}
                                </button>
                            ))}
                        </div>

                        <div className="overflow-y-auto px-8 py-6 flex flex-col gap-5">

                            {editTab === 'info' && (
                                <>
                                    <div>
                                        <label className={labelClass}>Nombre para mostrar</label>
                                        <input
                                            type="text"
                                            value={form.display_name}
                                            onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                                            placeholder="Tu nombre o apodo"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Biografía</label>
                                        <textarea
                                            value={form.bio}
                                            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                                            placeholder="Contá algo sobre vos..."
                                            rows={3}
                                            className={`${inputClass} resize-none`}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Resumen musical</label>
                                        <textarea
                                            value={form.skill_summary}
                                            onChange={(e) => setForm((f) => ({ ...f, skill_summary: e.target.value }))}
                                            placeholder="Tu estilo, proyectos, lo que buscás..."
                                            rows={3}
                                            className={`${inputClass} resize-none`}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Años de experiencia</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={80}
                                            value={form.years_experience}
                                            onChange={(e) => setForm((f) => ({ ...f, years_experience: e.target.value }))}
                                            placeholder="ej. 5"
                                            className={inputClass}
                                        />
                                    </div>
                                    <button
                                        onClick={() => saveProfile()}
                                        disabled={saving}
                                        className="rounded-full py-3 font-semibold text-white disabled:opacity-60"
                                        style={{ backgroundColor: '#65558F' }}
                                    >
                                        {saving ? 'Guardando...' : 'Guardar cambios'}
                                    </button>
                                </>
                            )}

                            {editTab === 'instrumentos' && (
                                <>
                                    <div className="flex flex-col gap-2">
                                        {instruments.map((mi: any) => (
                                            <div
                                                key={mi.musician_instrument_id ?? mi.instrument.name}
                                                className="flex items-center justify-between border border-[#65558F]/20 rounded-xl px-4 py-3"
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold text-[#65558F] flex items-center gap-1">
                                                        {mi.is_primary && <span title="Principal">★</span>}
                                                        {mi.instrument.name}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{mi.level ?? 'Sin nivel'} · {mi.instrument.category}</p>
                                                </div>
                                                {mi.musician_instrument_id && (
                                                    <button
                                                        onClick={() => doRemoveInstrument(mi.musician_instrument_id!)}
                                                        className="p-1 rounded-full hover:bg-red-50 text-red-400"
                                                    >
                                                        <X size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Agregar instrumento</p>

                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={pendingInst ? pendingInst.name : instSearch}
                                                onChange={(e) => {
                                                    setPendingInst(null)
                                                    setInstSearch(e.target.value)
                                                    setInstDropdownOpen(true)
                                                }}
                                                onFocus={() => setInstDropdownOpen(true)}
                                                onBlur={() => setTimeout(() => setInstDropdownOpen(false), 150)}
                                                placeholder="Buscar instrumento..."
                                                className={inputClass}
                                            />
                                            {instDropdownOpen && filteredCatalog.length > 0 && !pendingInst && (
                                                <div className="absolute z-20 w-full mt-1 bg-white border border-[#65558F]/30 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                    {filteredCatalog.map((inst: any) => (
                                                        <button
                                                            key={inst.instrument_id}
                                                            type="button"
                                                            onMouseDown={() => {
                                                                setPendingInst({ instrument_id: inst.instrument_id, name: inst.name })
                                                                setInstSearch('')
                                                                setInstDropdownOpen(false)
                                                            }}
                                                            className="w-full text-left px-4 py-2.5 hover:bg-[#65558F]/10 flex justify-between items-center"
                                                        >
                                                            <span className="text-sm text-[#65558F] font-medium">{inst.name}</span>
                                                            <span className="text-xs text-gray-400">{inst.category}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {pendingInst && (
                                            <div className="flex gap-2">
                                                <select
                                                    value={pendingLevel}
                                                    onChange={(e) => setPendingLevel(e.target.value)}
                                                    className="flex-1 border border-[#65558F]/30 rounded-lg px-3 py-2.5 text-sm text-[#65558F] focus:outline-none focus:ring-2 focus:ring-[#65558F] bg-white"
                                                >
                                                    {['Principiante', 'Intermedio', 'Avanzado', 'Profesional'].map((l) => (
                                                        <option key={l} value={l}>{l}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => doAddInstrument()}
                                                    disabled={addingInst}
                                                    className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                                    style={{ backgroundColor: '#65558F' }}
                                                >
                                                    {addingInst ? '...' : 'Agregar'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {editTab === 'generos' && (
                                <div className="flex flex-wrap gap-2">
                                    {catalogGenres.map((g: any) => {
                                        const selected = currentGenreIds.has(g.genre_id)
                                        return (
                                            <button
                                                key={g.genre_id}
                                                onClick={() => doToggleGenre({ genreId: g.genre_id, selected })}
                                                className="px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all"
                                                style={{
                                                    borderColor: '#65558F',
                                                    backgroundColor: selected ? '#65558F' : 'white',
                                                    color: selected ? 'white' : '#65558F',
                                                }}
                                            >
                                                {g.name}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
