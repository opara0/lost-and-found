import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProfileIdentity from './ProfileIdentity'
import supabase from '../supabase'

function ClaimItemDetails({ post }) {
    return (
        <div className="space-y-3">
            <ProfileIdentity profile={post.profile} />
            <div className="flex flex-col gap-4 sm:flex-row">
                {post.media_type === 'video' ? (
                    <video
                        src={post.media_url}
                        controls
                        className="aspect-[4/3] w-full rounded-xl object-cover sm:w-56"
                    />
                ) : (
                    <img
                        src={post.media_url}
                        alt={post.description}
                        className="aspect-[4/3] w-full rounded-xl object-cover sm:w-56"
                    />
                )}
                <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{post.description}</h3>
                    {post.location && <p className="mt-1 text-slate-600">Found at: {post.location}</p>}
                    <Link
                        to={`/items/${post.id}`}
                        className="mt-3 inline-block font-semibold text-emerald-800 underline"
                    >
                        View item
                    </Link>
                </div>
            </div>
        </div>
    )
}

function StatusBadge({ status }) {
    const styles = status === 'accepted'
        ? 'bg-emerald-100 text-emerald-800'
        : status === 'rejected'
            ? 'bg-red-100 text-red-800'
            : status === 'withdrawn'
                ? 'bg-slate-100 text-slate-700'
            : 'bg-amber-100 text-amber-800'

    return (
        <span className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${styles}`}>
            {status || 'pending'}
        </span>
    )
}

export default function Myclaims() {
    const [user, setUser] = useState(null)
    const [incomingClaims, setIncomingClaims] = useState([])
    const [myClaims, setMyClaims] = useState([])
    const [profiles, setProfiles] = useState({})
    const [chatIdsByClaim, setChatIdsByClaim] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [reviewingClaimId, setReviewingClaimId] = useState('')
    const [withdrawingClaimId, setWithdrawingClaimId] = useState('')
    const [confirmWithdrawClaimId, setConfirmWithdrawClaimId] = useState('')
    const [message, setMessage] = useState('')

    useEffect(() => {
        let isActive = true

        async function loadClaims() {
            setError('')

            const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
            if (authError) throw authError
            if (!isActive) return
            setUser(currentUser)

            if (!currentUser) {
                setIncomingClaims([])
                setMyClaims([])
                setProfiles({})
                setLoading(false)
                return
            }

            const [
                { data: ownPosts, error: postsError },
                { data: submittedClaims, error: submittedError },
            ] = await Promise.all([
                supabase
                    .from('posts')
                    .select('id, user_id, description, location, media_url, media_type, questions')
                    .eq('user_id', currentUser.id),
                supabase
                    .from('claim_answers')
                    .select('id, post_id, claimer_id, answers, status, created_at')
                    .eq('claimer_id', currentUser.id)
                    .order('created_at', { ascending: false }),
            ])

            if (postsError) throw postsError
            if (submittedError) throw submittedError
            if (!isActive) return

            const posts = ownPosts ?? []
            let postById = new Map(posts.map((post) => [String(post.id), post]))
            const postIds = posts.map((post) => String(post.id))
            let receivedClaims = []

            if (postIds.length > 0) {
                const { data, error: receivedError } = await supabase
                    .from('claim_answers')
                    .select('id, post_id, claimer_id, answers, status, created_at')
                    .in('post_id', postIds)
                    .neq('claimer_id', currentUser.id)
                    .order('created_at', { ascending: false })

                if (receivedError) throw receivedError
                receivedClaims = data ?? []
            }

            const submittedPostIds = [...new Set(
                (submittedClaims ?? [])
                    .map((claim) => String(claim.post_id))
                    .filter((postId) => !postById.has(postId))
            )]
            if (submittedPostIds.length > 0) {
                const { data: claimedPosts, error: claimedPostsError } = await supabase
                    .from('posts')
                    .select('id, user_id, description, location, media_url, media_type, questions')
                    .in('id', submittedPostIds)

                if (claimedPostsError) throw claimedPostsError
                postById = new Map([
                    ...postById,
                    ...(claimedPosts ?? []).map((post) => [String(post.id), post]),
                ])
            }

            const claims = (submittedClaims ?? [])
                .map((claim) => ({ ...claim, post: postById.get(String(claim.post_id)) }))
                .filter((claim) => claim.post)

            const claimIds = [...new Set([
                ...receivedClaims.map((claim) => claim.id),
                ...claims.map((claim) => claim.id),
            ])]
            let chatIdByClaim = {}
            if (claimIds.length > 0) {
                const { data: chats, error: chatsError } = await supabase
                    .from('claim_chats')
                    .select('id, claim_id')
                    .in('claim_id', claimIds)

                if (chatsError) throw chatsError
                chatIdByClaim = Object.fromEntries(
                    (chats ?? []).map((chat) => [chat.claim_id, chat.id])
                )
            }

            const claimerIds = [...new Set([
                ...receivedClaims.map((claim) => claim.claimer_id),
                ...claims.map((claim) => claim.post.user_id),
            ])]
            let profileById = {}
            if (claimerIds.length > 0) {
                const { data: claimerProfiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, avatar_url')
                    .in('id', claimerIds)

                if (profilesError) throw profilesError
                profileById = Object.fromEntries(
                    (claimerProfiles ?? []).map((profile) => [profile.id, profile])
                )
            }
            postById = new Map([...postById].map(([postId, post]) => [
                postId,
                { ...post, profile: profileById[post.user_id] ?? null },
            ]))

            if (!isActive) return
            setIncomingClaims(receivedClaims.map((claim) => ({
                ...claim,
                post: postById.get(String(claim.post_id)),
            })).filter((claim) => claim.post))
            setMyClaims(claims.map((claim) => ({
                ...claim,
                post: postById.get(String(claim.post_id)),
            })))
            setProfiles(profileById)
            setChatIdsByClaim(chatIdByClaim)
            setLoading(false)
        }

        loadClaims().catch((loadError) => {
            if (!isActive) return
            setError(loadError instanceof Error ? loadError.message : 'Could not load claims.')
            setLoading(false)
        })

        return () => {
            isActive = false
        }
    }, [])

    useEffect(() => {
        if (!user?.id) return

        const channel = supabase
            .channel(`my-claims-${user.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'claim_answers',
                filter: `claimer_id=eq.${user.id}`,
            }, async ({ new: claim }) => {
                setMyClaims((current) => current.map((existingClaim) => (
                    existingClaim.id === claim.id
                        ? { ...existingClaim, status: claim.status }
                        : existingClaim
                )))

                if (claim.status !== 'accepted') return

                const { data: chat, error: chatError } = await supabase
                    .from('claim_chats')
                    .select('id, claim_id')
                    .eq('claim_id', claim.id)
                    .single()

                if (chatError) {
                    setError(chatError.message)
                    return
                }

                setChatIdsByClaim((current) => ({ ...current, [chat.claim_id]: chat.id }))
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setError('Live claim updates failed. Refresh to check for new decisions.')
                }
            })

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [user?.id])

    async function reviewClaim(claimId, status) {
        setReviewingClaimId(claimId)
        setError('')
        setMessage('')
        try {
            const { error: reviewError } = await supabase.rpc('review_claim', {
                p_claim_id: claimId,
                p_status: status,
            })
            if (reviewError) throw reviewError

            setIncomingClaims((current) => current.map((claim) => (
                claim.id === claimId ? { ...claim, status } : claim
            )))
            if (status === 'accepted') {
                const { data: chat, error: chatError } = await supabase
                    .from('claim_chats')
                    .select('id, claim_id')
                    .eq('claim_id', claimId)
                    .single()

                if (chatError) throw chatError
                setChatIdsByClaim((current) => ({ ...current, [chat.claim_id]: chat.id }))
            }
            setMessage(`Claim ${status}.`)
        } catch (reviewError) {
            setError(reviewError instanceof Error ? reviewError.message : 'Could not update the claim.')
        } finally {
            setReviewingClaimId('')
        }
    }

    async function withdrawClaim(claimId) {
        setWithdrawingClaimId(claimId)
        setError('')
        setMessage('')
        try {
            const { error: withdrawError } = await supabase.rpc('withdraw_claim', {
                p_claim_id: claimId,
            })
            if (withdrawError) throw withdrawError

            setMyClaims((current) => current.map((claim) => (
                claim.id === claimId ? { ...claim, status: 'withdrawn' } : claim
            )))
            setConfirmWithdrawClaimId('')
            setMessage('Claim withdrawn. Your conversation history is preserved.')
        } catch (withdrawError) {
            setError(withdrawError instanceof Error ? withdrawError.message : 'Could not withdraw the claim.')
        } finally {
            setWithdrawingClaimId('')
        }
    }

    if (loading) {
        return <main className="mx-auto min-h-screen max-w-5xl px-4 pt-24">Loading claims...</main>
    }

    if (!user) {
        return (
            <main className="mx-auto min-h-screen max-w-5xl px-4 pt-24">
                <h1 className="text-3xl font-bold">My claims</h1>
                <p className="mt-4 text-slate-600">Log in to view claims and responses.</p>
                <Link to="/login" className="mt-3 inline-block font-semibold text-emerald-800 underline">
                    Log in
                </Link>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-[#F9F6F0] px-4 py-8 sm:px-8">
            <div className="mx-auto max-w-5xl">
                <h1 className="text-3xl font-bold">My claims</h1>
                {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
                {message && <p className="mt-4 text-emerald-800" role="status">{message}</p>}

                <section className="mt-8">
                    <h2 className="mb-4 text-2xl font-semibold">Claims on your posts</h2>
                    {incomingClaims.length === 0 ? (
                        <p className="rounded-xl bg-white p-5 text-slate-600">No one has claimed your posts yet.</p>
                    ) : (
                        <div className="space-y-5">
                            {incomingClaims.map((claim) => (
                                <article key={claim.id} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
                                    <ClaimItemDetails post={claim.post} />
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                        <ProfileIdentity profile={profiles[claim.claimer_id]} />
                                        <StatusBadge status={claim.status} />
                                    </div>
                                    <div className="space-y-3">
                                        {(claim.post.questions ?? []).map((question, index) => (
                                            <div key={`${claim.id}-${index}`}>
                                                <p className="text-sm font-semibold text-slate-700">{question}</p>
                                                <p className="whitespace-pre-wrap">{claim.answers?.[index] || 'No answer provided.'}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {claim.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={Boolean(reviewingClaimId)}
                                                onClick={() => reviewClaim(claim.id, 'accepted')}
                                                className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                                            >
                                                {reviewingClaimId === claim.id ? 'Saving...' : 'Accept'}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={Boolean(reviewingClaimId)}
                                                onClick={() => reviewClaim(claim.id, 'rejected')}
                                                className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                    {claim.status === 'accepted' && chatIdsByClaim[claim.id] && (
                                        <Link
                                            to={`/chats/${claim.id}`}
                                            className="inline-block rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
                                        >
                                            Open chat
                                        </Link>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <section className="mt-10">
                    <h2 className="mb-4 text-2xl font-semibold">Items you claimed</h2>
                    {myClaims.length === 0 ? (
                        <p className="rounded-xl bg-white p-5 text-slate-600">You haven&apos;t claimed any items yet.</p>
                    ) : (
                        <div className="space-y-5">
                            {myClaims.map((claim) => (
                                <article key={claim.id} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
                                    <ClaimItemDetails post={claim.post} />
                                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                        <h3 className="font-semibold">Your claim</h3>
                                        <StatusBadge status={claim.status} />
                                    </div>
                                    <div className="space-y-3">
                                        {(claim.post.questions ?? []).map((question, index) => (
                                            <div key={`${claim.id}-${index}`}>
                                                <p className="text-sm font-semibold text-slate-700">{question}</p>
                                                <p className="whitespace-pre-wrap">{claim.answers?.[index] || 'No answer provided.'}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {claim.status === 'accepted' && chatIdsByClaim[claim.id] && (
                                        <Link
                                            to={`/chats/${claim.id}`}
                                            className="inline-block rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
                                        >
                                            Open chat
                                        </Link>
                                    )}
                                    {['pending', 'accepted'].includes(claim.status) && (
                                        <div className="border-t border-slate-100 pt-4">
                                            {confirmWithdrawClaimId === claim.id ? (
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <p className="text-sm text-slate-700">
                                                        Withdraw this claim? The conversation history will remain available.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        disabled={Boolean(withdrawingClaimId)}
                                                        onClick={() => withdrawClaim(claim.id)}
                                                        className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                                                    >
                                                        {withdrawingClaimId === claim.id ? 'Withdrawing...' : 'Confirm withdrawal'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={Boolean(withdrawingClaimId)}
                                                        onClick={() => setConfirmWithdrawClaimId('')}
                                                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
                                                    >
                                                        Keep claim
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmWithdrawClaimId(claim.id)}
                                                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                                                >
                                                    Withdraw claim
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}
