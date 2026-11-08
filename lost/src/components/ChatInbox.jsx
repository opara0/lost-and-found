import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import supabase from '../supabase'

export default function ChatInbox({ sidebar = false, selectedClaimId = '' }) {
    const [user, setUser] = useState(null)
    const [chats, setChats] = useState([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let isActive = true

        async function loadChats() {
            try {
                const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
                if (authError) throw authError
                if (!isActive) return
                setUser(currentUser)

                if (!currentUser) return

                const { data: chatData, error: chatsError } = await supabase
                    .from('claim_chats')
                    .select('id, claim_id, post_id, owner_id, claimer_id, created_at')
                    .order('created_at', { ascending: false })

                if (chatsError) throw chatsError
                const availableChats = chatData ?? []
                if (availableChats.length === 0) {
                    setChats([])
                    return
                }

                const postIds = [...new Set(availableChats.map((chat) => chat.post_id))]
                const participantIds = [...new Set(availableChats.flatMap((chat) => [
                    chat.owner_id === currentUser.id ? chat.claimer_id : chat.owner_id,
                ]))]
                const [
                    { data: posts, error: postsError },
                    { data: profiles, error: profilesError },
                ] = await Promise.all([
                    supabase.from('posts').select('id, description, location').in('id', postIds),
                    supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', participantIds),
                ])

                if (postsError) throw postsError
                if (profilesError) throw profilesError

                const postById = Object.fromEntries((posts ?? []).map((post) => [String(post.id), post]))
                const profileById = Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile]))
                const chatList = availableChats.map((chat) => ({
                    ...chat,
                    post: postById[String(chat.post_id)],
                    otherParticipant: profileById[chat.owner_id === currentUser.id ? chat.claimer_id : chat.owner_id],
                })).filter((chat) => chat.post)

                if (isActive) setChats(chatList)
            } catch (loadError) {
                if (isActive) {
                    setError(loadError instanceof Error ? loadError.message : 'Could not load your chats.')
                }
            } finally {
                if (isActive) setLoading(false)
            }
        }

        loadChats()
        return () => {
            isActive = false
        }
    }, [])

    if (loading) {
        if (sidebar) {
            return <aside className="grid h-full w-[22rem] shrink-0 place-items-center border-r border-slate-200 text-sm text-slate-500">Loading chats...</aside>
        }
        return <main className="grid min-h-[calc(100dvh-8rem)] place-items-center text-slate-600 md:min-h-[calc(100dvh-3.5rem)]">Loading chats...</main>
    }

    if (!user) {
        if (sidebar) {
            return (
                <aside className="h-full w-[22rem] shrink-0 border-r border-slate-200 p-5">
                    <h1 className="text-xl font-bold">Chats</h1>
                    <p className="mt-4 text-sm text-slate-600">Log in to view your conversations.</p>
                    <Link to="/login" className="mt-3 inline-block font-semibold text-emerald-800 underline">Log in</Link>
                </aside>
            )
        }
        return (
            <main className="mx-auto min-h-[calc(100dvh-8rem)] max-w-5xl px-4 py-8 md:min-h-[calc(100dvh-3.5rem)]">
                <h1 className="text-3xl font-bold">Chats</h1>
                <p className="mt-4 text-slate-600">Log in to view your conversations.</p>
                <Link to="/login" className="mt-3 inline-block font-semibold text-emerald-800 underline">
                    Log in
                </Link>
            </main>
        )
    }

    const filteredChats = chats.filter((chat) => {
        const participantName = [chat.otherParticipant?.first_name, chat.otherParticipant?.last_name]
            .filter(Boolean)
            .join(' ')
        const searchText = `${participantName} ${chat.post.description} ${chat.post.location ?? ''}`.toLowerCase()
        return searchText.includes(search.trim().toLowerCase())
    })

    return (
        <main className={sidebar ? 'h-full min-h-0' : 'min-h-[calc(100dvh-8rem)] bg-slate-50 md:min-h-[calc(100dvh-3.5rem)]'}>
            <section className={sidebar
                ? 'flex h-full min-h-0 w-full flex-col bg-white'
                : 'mx-auto flex min-h-[calc(100dvh-8rem)] max-w-7xl flex-col bg-white md:min-h-[calc(100dvh-3.5rem)] md:flex-row md:border-x md:border-slate-200'
            }>
                <div className={`flex min-h-0 w-full flex-col border-slate-200 ${sidebar ? 'h-full md:w-[22rem] md:shrink-0 md:border-r' : 'md:w-[22rem] md:shrink-0 md:border-r lg:w-[25rem]'}`}>
                    <header className="border-b border-slate-100 px-5 pb-4 pt-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Chats</h1>
                                <p className="mt-1 text-sm text-slate-500">Your item conversations</p>
                            </div>
                            <span className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-800">
                                <i className="fa-solid fa-comments" aria-hidden="true"></i>
                            </span>
                        </div>
                        <label className="mt-4 flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 text-slate-500 focus-within:ring-2 focus-within:ring-emerald-600">
                            <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                            <span className="sr-only">Search chats</span>
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search conversations"
                                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500"
                            />
                        </label>
                    </header>

                    {error && <p className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {!error && filteredChats.length === 0 && (
                            <p className="px-5 py-8 text-center text-sm text-slate-500">
                                {chats.length === 0
                                    ? 'No conversations yet. Chats will appear when a claim is accepted.'
                                    : 'No conversations match your search.'}
                            </p>
                        )}
                        {filteredChats.map((chat) => {
                            const participantName = [
                                chat.otherParticipant?.first_name,
                                chat.otherParticipant?.last_name,
                            ].filter(Boolean).join(' ') || 'Community member'
                            const initials = participantName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

                            return (
                                <Link
                                    key={chat.id}
                                    to={`/chats/${chat.claim_id}`}
                                    aria-current={selectedClaimId === chat.claim_id ? 'page' : undefined}
                                    className={`flex items-center gap-3 border-b border-slate-100 px-4 py-4 transition focus-visible:bg-emerald-50 focus-visible:outline-none ${selectedClaimId === chat.claim_id ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                                >
                                    {chat.otherParticipant?.avatar_url ? (
                                        <img
                                            src={chat.otherParticipant.avatar_url}
                                            alt=""
                                            className="size-12 shrink-0 rounded-full object-cover"
                                        />
                                    ) : (
                                        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-100 font-semibold text-emerald-800">
                                            {initials}
                                        </span>
                                    )}
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="truncate font-semibold text-slate-900">{participantName}</span>
                                            <span className="shrink-0 text-xs text-slate-500">
                                                {new Date(chat.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </span>
                                        </span>
                                        <span className="mt-1 block truncate text-sm text-slate-600">{chat.post.description}</span>
                                        {chat.post.location && (
                                            <span className="mt-0.5 block truncate text-xs text-slate-500">{chat.post.location}</span>
                                        )}
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {!sidebar && (
                    <div className="hidden min-w-0 flex-1 flex-col items-center justify-center bg-slate-50 px-8 text-center md:flex">
                        <span className="grid size-20 place-items-center rounded-full bg-white text-3xl text-emerald-700 shadow-sm ring-1 ring-slate-200">
                            <i className="fa-regular fa-message" aria-hidden="true"></i>
                        </span>
                        <h2 className="mt-5 text-xl font-semibold text-slate-800">Your conversations</h2>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                            Choose a chat to continue discussing a found item, or check back when one of your claims is accepted.
                        </p>
                    </div>
                )}
            </section>
        </main>
    )
}
