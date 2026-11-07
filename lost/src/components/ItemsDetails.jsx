import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import useItems from "../data/items"
import ProfileIdentity from "./ProfileIdentity"
import supabase from "../supabase"

export default function ItemsDetails() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { items, loading, error } = useItems()
    const item = items.find((item) => String(item.id) === id)
    const [userId, setUserId] = useState('')
    const [answers, setAnswers] = useState([])
    const [claimAnswers, setClaimAnswers] = useState([])
    const [claimsLoadedFor, setClaimsLoadedFor] = useState('')
    const [isClaimFormOpen, setIsClaimFormOpen] = useState(false)
    const [isSubmittingClaim, setIsSubmittingClaim] = useState(false)
    const [claimError, setClaimError] = useState('')
    const [claimMessage, setClaimMessage] = useState('')
    const isLoadingClaims = Boolean(item && claimsLoadedFor !== String(item.id))

    useEffect(() => {
        let isActive = true

        async function loadClaims() {
            const { data: { user }, error: authError } = await supabase.auth.getUser()
            if (!isActive) return
            if (authError) throw authError

            setClaimError('')
            setUserId(user?.id ?? '')
            if (!user || !item) {
                setClaimAnswers([])
                setClaimsLoadedFor(item ? String(item.id) : '')
                return
            }

            if (String(item.ownerId) === user.id) {
                setClaimAnswers([])
                setClaimsLoadedFor(String(item.id))
                return
            }

            const { data, error: claimsError } = await supabase
                .from('claim_answers')
                .select('id, claimer_id, answers, status, created_at')
                .eq('post_id', String(item.id))
                .eq('claimer_id', user.id)
                .order('created_at', { ascending: false })

            if (claimsError) throw claimsError
            if (!isActive) return

            const submissions = data ?? []
            setClaimAnswers(submissions)
            const ownSubmission = submissions.find((submission) => submission.claimer_id === user.id)
            if (ownSubmission && Array.isArray(ownSubmission.answers)) {
                setAnswers(ownSubmission.answers)
            } else {
                setAnswers(item.questions.map(() => ''))
            }
            setClaimsLoadedFor(String(item.id))
        }

        loadClaims().catch((loadError) => {
            if (!isActive) return
            setClaimError(loadError instanceof Error ? loadError.message : 'Could not load claim answers.')
            setClaimsLoadedFor(item ? String(item.id) : '')
        })

        return () => {
            isActive = false
        }
    }, [item])

    async function submitAnswers(event) {
        event.preventDefault()
        if (!item) return

        if (!userId) {
            navigate('/login')
            return
        }
        if (String(item.ownerId) === userId) {
            setClaimError('You cannot submit answers to your own post.')
            return
        }
        if (claimAnswers.some((submission) => submission.claimer_id === userId)) {
            setClaimError('You have already submitted a claim for this item.')
            return
        }
        if (answers.some((answer) => !answer?.trim())) {
            setClaimError('Please answer every question.')
            return
        }

        setIsSubmittingClaim(true)
        setClaimError('')
        setClaimMessage('')
        try {
            const { data, error: submitError } = await supabase
                .from('claim_answers')
                .insert({
                    post_id: String(item.id),
                    claimer_id: userId,
                    answers: answers.map((answer) => answer.trim()),
                })
                .select('id, claimer_id, answers, status, created_at')
                .single()

            if (submitError) throw submitError
            setClaimAnswers((current) => [data, ...current])
            setIsClaimFormOpen(false)
            setClaimMessage('Your answers were sent to the reporter.')
        } catch (submitError) {
            setClaimError(submitError instanceof Error ? submitError.message : 'Could not submit your answers.')
        } finally {
            setIsSubmittingClaim(false)
        }
    }

    if (loading) {
        return <div className="min-h-screen grid place-items-center"><h1>Loading post...</h1></div>
    }
    if (error) {
        return <div className="min-h-screen grid place-items-center"><h1 role="alert">Could not load post: {error}</h1></div>
    }
    if (!item) {
        return (
            <div className="min-h-screen grid place-items-center"><h1>No item matched</h1></div>
        )
    }
    return (
        <main className="min-h-screen grid place-items-center">
            <div className="px-4 py-4">
                <ProfileIdentity profile={item.profile} />
                {item.mediaType === 'video' ? (
                    <video src={item.img} controls className="aspect-[4/3] w-full rounded-2xl object-cover" />
                ) : (
                    <img src={item.img} className="aspect-[4/3] w-full rounded-2xl object-cover" alt={item.desc} />
                )}
                <h1>{item.desc}</h1>
                <p>Found at:{item.location}</p>
                {item.questions.length > 0 && (
                    <section className="mt-6 rounded-xl bg-white p-4">
                        <h2 className="text-xl font-semibold">
                            {String(item.ownerId) === userId ? 'Your post' : 'Claim this item'}
                        </h2>
                        {String(item.ownerId) === userId ? (
                            <div className="mt-3">
                                <p className="text-slate-600">You can review answers to your questions in My claims.</p>
                                <button
                                    type="button"
                                    onClick={() => navigate('/my-claims')}
                                    className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
                                >
                                    View claims
                                </button>
                            </div>
                        ) : (
                            <div className="mt-3 space-y-4">
                                {claimAnswers.filter((submission) => submission.claimer_id === userId).map((submission) => (
                                    <div key={submission.id} className="rounded-lg border border-slate-200 p-3">
                                        <p>
                                            Your claim is <span className="font-semibold capitalize">{submission.status || 'pending'}</span>.
                                        </p>
                                        {item.questions.map((question, index) => (
                                            <div className="mt-3" key={`${submission.id}-${index}`}>
                                                <p className="text-sm font-semibold text-slate-700">{question}</p>
                                                <p>{submission.answers?.[index] || 'No answer provided.'}</p>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                                {!claimAnswers.some((submission) => submission.claimer_id === userId) && (
                                    <>
                                        {!userId ? (
                                            <>
                                                <p className="text-slate-600">Log in to claim this item.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => navigate('/login')}
                                                    className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
                                                >
                                                    Log in
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {!isClaimFormOpen ? (
                                                    <button
                                                        type="button"
                                                        disabled={isLoadingClaims}
                                                        onClick={() => {
                                                            setAnswers(item.questions.map(() => ''))
                                                            setClaimError('')
                                                            setIsClaimFormOpen(true)
                                                        }}
                                                        className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                                                    >
                                                        Claim
                                                    </button>
                                                ) : (
                                                    <form onSubmit={submitAnswers} className="space-y-4">
                                                        {item.questions.map((question, index) => (
                                                            <label className="block font-medium" key={`${item.id}-${index}`}>
                                                                {question}
                                                                <textarea
                                                                    required
                                                                    rows={2}
                                                                    maxLength={1000}
                                                                    value={answers[index] ?? ''}
                                                                    onChange={(event) => setAnswers((current) => {
                                                                        const updated = [...current]
                                                                        updated[index] = event.target.value
                                                                        return updated
                                                                    })}
                                                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                                                                />
                                                            </label>
                                                        ))}
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="submit"
                                                                disabled={isSubmittingClaim}
                                                                className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                                                            >
                                                                {isSubmittingClaim ? 'Submitting...' : 'Submit claim'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsClaimFormOpen(false)}
                                                                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </form>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                        {claimMessage && (
                            <p role="status" className="mt-3 text-sm text-emerald-700">{claimMessage}</p>
                        )}
                        {claimError && (
                            <p role="alert" className="mt-3 text-sm text-red-700">{claimError}</p>
                        )}
                        {isLoadingClaims && <p className="mt-3 text-sm text-slate-500">Loading claim responses...</p>}
                    </section>
                )}
            </div>
        </main>
    )
}