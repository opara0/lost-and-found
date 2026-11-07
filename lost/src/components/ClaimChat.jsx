import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProfileIdentity from './ProfileIdentity'
import supabase from '../supabase'

export default function ClaimChat() {
    const { claimId } = useParams()
    const [user, setUser] = useState(null)
    const [chat, setChat] = useState(null)
    const [messages, setMessages] = useState([])
    const [profiles, setProfiles] = useState({})
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')

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

            setChat(chatData)
            setMessages(messageData ?? [])
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

    async function sendMessage(event) {
        event.preventDefault()
        const body = message.trim()
        if (!body || !chat || !user) return

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
        return <main className="mx-auto min-h-screen max-w-3xl px-4 pt-24">Loading chat...</main>
    }

    if (!user) {
        return (
            <main className="mx-auto min-h-screen max-w-3xl px-4 pt-24">
                <p>Log in to view this chat.</p>
                <Link to="/login" className="mt-2 inline-block font-semibold text-emerald-800 underline">Log in</Link>
            </main>
        )
    }

    if (error && !chat) {
        return (
            <main className="mx-auto min-h-screen max-w-3xl px-4 pt-24">
                <p role="alert" className="text-red-700">{error}</p>
                <Link to="/my-claims" className="mt-3 inline-block font-semibold text-emerald-800 underline">
                    Back to My claims
                </Link>
            </main>
        )
    }

    if (!chat) return null

    const otherParticipantId = chat.owner_id === user.id ? chat.claimer_id : chat.owner_id

    return (
        <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 sm:px-8">
            <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col rounded-2xl bg-white p-4 shadow-sm sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                        <Link to="/my-claims" className="text-sm font-semibold text-emerald-800 underline">
                            Back to My claims
                        </Link>
                        <h1 className="mt-2 text-2xl font-bold">Item claim chat</h1>
                    </div>
                </div>
                <div className="py-3">
                    <ProfileIdentity profile={profiles[otherParticipantId]} />
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto border-y border-slate-100 py-4" aria-live="polite">
                    {messages.length === 0 && (
                        <p className="text-center text-slate-500">This chat is open. Send a message to get started.</p>
                    )}
                    {messages.map((chatMessage) => {
                        const isOwnMessage = chatMessage.sender_id === user.id
                        return (
                            <div
                                key={chatMessage.id}
                                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                    isOwnMessage
                                        ? 'ml-auto bg-emerald-700 text-white'
                                        : 'bg-slate-100 text-slate-900'
                                }`}
                            >
                                <p className="mb-1 text-xs font-semibold opacity-75">
                                    {isOwnMessage ? 'You' : [profiles[chatMessage.sender_id]?.first_name, profiles[chatMessage.sender_id]?.last_name].filter(Boolean).join(' ') || 'Other participant'}
                                </p>
                                <p className="whitespace-pre-wrap break-words">{chatMessage.body}</p>
                                <time className="mt-1 block text-right text-xs opacity-70">
                                    {new Date(chatMessage.created_at).toLocaleString()}
                                </time>
                            </div>
                        )
                    })}
                </div>
                {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
                <form onSubmit={sendMessage} className="mt-4 flex gap-2">
                    <label className="sr-only" htmlFor="chat-message">Message</label>
                    <textarea
                        id="chat-message"
                        required
                        maxLength={2000}
                        rows={2}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Write a message..."
                        className="min-w-0 flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2"
                    />
                    <button
                        type="submit"
                        disabled={sending || !message.trim()}
                        className="self-end rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                    >
                        {sending ? 'Sending...' : 'Send'}
                    </button>
                </form>
            </section>
        </main>
    )
}
