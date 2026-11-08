import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ChatInbox from './ChatInbox'
import supabase from '../supabase'

export default function ClaimChat() {
    const { claimId } = useParams()
    const [user, setUser] = useState(null)
    const [chat, setChat] = useState(null)
    const [chatPost, setChatPost] = useState(null)
    const [claimStatus, setClaimStatus] = useState('')
    const [messages, setMessages] = useState([])
    const [profiles, setProfiles] = useState({})
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const messagesEndRef = useRef(null)

    const loadChat = useCallback(async () => {
        try {
            const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
            if (authError) throw authError
            setError('')
            setUser(currentUser)
            if (!currentUser) {
                setChat(null)
                setMessages([])
                setLoading(false)
                return
            }

            const { data: chatData, error: chatError } = await supabase
                .from('claim_chats')
                .select('id, claim_id, post_id, owner_id, claimer_id')
                .eq('claim_id', claimId)
                .single()

            if (chatError) throw chatError

            const { data: claim, error: claimError } = await supabase
                .from('claim_answers')
                .select('status')
                .eq('id', claimId)
                .single()

            if (claimError) throw claimError

            const { data: messageData, error: messagesError } = await supabase
                .from('claim_chat_messages')
                .select('id, sender_id, body, created_at')
                .eq('chat_id', chatData.id)
                .order('created_at', { ascending: true })

            if (messagesError) throw messagesError

            const participantIds = [...new Set([chatData.owner_id, chatData.claimer_id])]
            const { data: participantProfiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, avatar_url')
                .in('id', participantIds)

            if (profilesError) throw profilesError

            const { data: post, error: postError } = await supabase
                .from('posts')
                .select('description, location')
                .eq('id', chatData.post_id)
                .maybeSingle()

            if (postError) throw postError

            setChat(chatData)
            setClaimStatus(claim.status)
            setMessages(messageData ?? [])
            setChatPost(post)
            setProfiles(Object.fromEntries(
                (participantProfiles ?? []).map((profile) => [profile.id, profile])
            ))
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Could not load this chat.')
        } finally {
            setLoading(false)
        }
    }, [claimId])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, [messages])

    useEffect(() => {
        const initialLoadId = window.setTimeout(loadChat, 0)

        return () => {
            window.clearTimeout(initialLoadId)
        }
    }, [loadChat])

    useEffect(() => {
        if (!chat?.id) return

        const channel = supabase
            .channel(`claim-chat-${chat.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'claim_chat_messages',
                filter: `chat_id=eq.${chat.id}`,
            }, async () => {
                const { data, error: messagesError } = await supabase
                    .from('claim_chat_messages')
                    .select('id, sender_id, body, created_at')
                    .eq('chat_id', chat.id)
                    .order('created_at', { ascending: true })

                if (messagesError) {
                    setError(messagesError.message)
                } else {
                    setMessages(data ?? [])
                }
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setError('Live chat connection failed. Please refresh to reconnect.')
                }
            })

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [chat?.id])

    useEffect(() => {
        if (!claimId) return

        const channel = supabase
            .channel(`claim-status-${claimId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'claim_answers',
                filter: `id=eq.${claimId}`,
            }, ({ new: claim }) => setClaimStatus(claim.status))
            .subscribe()

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [claimId])

    async function sendMessage(event) {
        event.preventDefault()
        const body = message.trim()
        if (!body || !chat || !user || claimStatus !== 'accepted') return

        setSending(true)
        setError('')
        try {
            const { error: sendError } = await supabase
                .from('claim_chat_messages')
                .insert({
                    chat_id: chat.id,
                    sender_id: user.id,
                    body,
                })

            if (sendError) throw sendError
            setMessage('')
            await loadChat()
        } catch (sendError) {
            setError(sendError instanceof Error ? sendError.message : 'Could not send your message.')
        } finally {
            setSending(false)
        }
    }

    if (loading) {
        return <main className="grid min-h-[calc(100dvh-7.5rem)] place-items-center text-slate-600 md:min-h-[calc(100dvh-3.5rem)]">Loading chat...</main>
    }

    if (!user) {
        return (
            <main className="mx-auto min-h-[calc(100dvh-7.5rem)] max-w-3xl px-4 pt-8 md:min-h-[calc(100dvh-3.5rem)]">
                <p>Log in to view this chat.</p>
                <Link to="/login" className="mt-2 inline-block font-semibold text-emerald-800 underline">Log in</Link>
            </main>
        )
    }

    if (error && !chat) {
        return (
            <main className="mx-auto min-h-[calc(100dvh-7.5rem)] max-w-3xl px-4 pt-8 md:min-h-[calc(100dvh-3.5rem)]">
                <p role="alert" className="text-red-700">{error}</p>
                <Link to="/my-claims" className="mt-3 inline-block font-semibold text-emerald-800 underline">
                    Back to My claims
                </Link>
            </main>
        )
    }

    if (!chat) return null

    const otherParticipantId = chat.owner_id === user.id ? chat.claimer_id : chat.owner_id
    const otherParticipant = profiles[otherParticipantId]
    const participantName = [otherParticipant?.first_name, otherParticipant?.last_name].filter(Boolean).join(' ') || 'Community member'
    const participantInitials = participantName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

    return (
        <main className="h-[calc(100dvh-7.5rem)] bg-slate-50 md:h-[calc(100dvh-3.5rem)]">
            <div className="mx-auto flex h-full max-w-7xl bg-white md:border-x md:border-slate-200">
                <aside className="hidden h-full shrink-0 md:flex">
                    <ChatInbox sidebar selectedClaimId={claimId} />
                </aside>
                <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white shadow-sm">
                <header className="z-10 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 text-slate-900 sm:px-5">
                    <Link
                        to="/chats"
                        aria-label="Back to chats"
                        className="grid size-10 shrink-0 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-700"
                    >
                        <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>
                    </Link>
                    {otherParticipant?.avatar_url ? (
                        <img
                            src={otherParticipant.avatar_url}
                            alt=""
                            className="size-10 shrink-0 rounded-full object-cover"
                        />
                    ) : (
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-900">
                            {participantInitials}
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate font-semibold">{participantName}</h1>
                        <p className="truncate text-xs text-slate-500">
                            {chatPost?.description || 'Item claim conversation'}
                            {chatPost?.location ? ` · ${chatPost.location}` : ''}
                        </p>
                    </div>
                    <Link
                        to="/my-claims"
                        className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 sm:inline-flex"
                    >
                        My claims
                    </Link>
                    <Link
                        to="/my-claims"
                        aria-label="View my claims"
                        className="grid size-10 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 sm:hidden"
                    >
                        <i className="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i>
                    </Link>
                </header>

                <div
                    className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 px-3 py-4 sm:px-8"
                    aria-live="polite"
                >
                    {claimStatus === 'withdrawn' && (
                        <p className="mx-auto max-w-md rounded-lg bg-white px-4 py-2 text-center text-xs text-slate-600 shadow-sm ring-1 ring-slate-200" role="status">
                            This claim was withdrawn. The conversation is available as read-only history.
                        </p>
                    )}
                    {messages.length === 0 && (
                        <p className="mx-auto mt-8 rounded-lg bg-white px-4 py-2 text-center text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
                            This chat is open. Send a message to get started.
                        </p>
                    )}
                    {messages.map((chatMessage) => {
                        const isOwnMessage = chatMessage.sender_id === user.id
                        return (
                            <div
                                key={chatMessage.id}
                                className={`relative max-w-[88%] px-3 py-2 shadow-sm sm:max-w-[75%] ${
                                    isOwnMessage
                                        ? 'self-end rounded-2xl rounded-br-sm bg-emerald-100 text-slate-900'
                                        : 'self-start rounded-2xl rounded-bl-sm bg-white text-slate-900 ring-1 ring-slate-200'
                                }`}
                            >
                                {!isOwnMessage && (
                                    <p className="mb-1 text-xs font-semibold text-emerald-800">
                                        {[profiles[chatMessage.sender_id]?.first_name, profiles[chatMessage.sender_id]?.last_name].filter(Boolean).join(' ') || 'Community member'}
                                    </p>
                                )}
                                <p className="whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">{chatMessage.body}</p>
                                <time className="mt-1 block text-right text-[0.65rem] text-slate-500">
                                    {new Date(chatMessage.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </time>
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {error && <p role="alert" className="bg-white px-4 py-2 text-sm text-red-700">{error}</p>}
                <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-slate-200 bg-white px-3 py-3 sm:px-5">
                    <label className="sr-only" htmlFor="chat-message">Message</label>
                    <textarea
                        id="chat-message"
                        required
                        maxLength={2000}
                        rows={1}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault()
                                event.currentTarget.form?.requestSubmit()
                            }
                        }}
                        placeholder={claimStatus === 'accepted' ? 'Type a message' : 'This chat is read-only'}
                        disabled={claimStatus !== 'accepted'}
                        className="max-h-32 min-h-11 min-w-0 flex-1 resize-y rounded-3xl border-0 bg-white px-4 py-3 text-sm shadow-sm outline-none placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:bg-slate-100"
                    />
                    <button
                        type="submit"
                        aria-label={sending ? 'Sending message' : 'Send message'}
                        disabled={sending || !message.trim() || claimStatus !== 'accepted'}
                        className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-700 text-white shadow-sm transition hover:bg-emerald-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <i className={`fa-solid ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} aria-hidden="true"></i>
                    </button>
                </form>
                </section>
            </div>
        </main>
    )
}
