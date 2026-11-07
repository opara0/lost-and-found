import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useItems from '../data/items'
import supabase from '../supabase'
import ProfileIdentity from './ProfileIdentity'

const MEDIA_BUCKET = 'lost-found-media'
const MAX_AVATAR_SIZE = 5 * 1024 * 1024
const MAX_POST_QUESTIONS = 5
const MAX_POST_QUESTION_LENGTH = 200

function createId() {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID()
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getProfileDetails(user) {
    const metadata = user?.user_metadata ?? {}
    return {
        firstName: metadata.first_name ?? '',
        lastName: metadata.last_name ?? '',
        bio: metadata.bio ?? '',
        avatarUrl: metadata.avatar_url ?? '',
    }
}

export default function Profile() {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [isLoadingUser, setIsLoadingUser] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [bio, setBio] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [avatarFile, setAvatarFile] = useState(null)
    const [avatarPreview, setAvatarPreview] = useState('')
    const [profileError, setProfileError] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [editingPostId, setEditingPostId] = useState(null)
    const [postDraft, setPostDraft] = useState(null)
    const [postActionError, setPostActionError] = useState('')
    const [postActionMessage, setPostActionMessage] = useState('')
    const [isSavingPost, setIsSavingPost] = useState(false)
    const [deletingPostId, setDeletingPostId] = useState(null)
    const [confirmDeletePostId, setConfirmDeletePostId] = useState(null)
    const [updatedPosts, setUpdatedPosts] = useState({})
    const [deletedPostIds, setDeletedPostIds] = useState([])
    const { items, loading, error } = useItems({
        userId: user?.id,
        enabled: Boolean(user?.id),
    })
    const visibleItems = items
        .filter((item) => !deletedPostIds.includes(item.id))
        .map((item) => updatedPosts[item.id] ?? item)

    function startEditingPost(item) {
        setEditingPostId(item.id)
        setPostDraft({
            description: item.desc,
            location: item.location ?? '',
            questions: item.questions.length > 0 ? [...item.questions] : [''],
        })
        setPostActionError('')
        setPostActionMessage('')
        setConfirmDeletePostId(null)
    }

    function cancelEditingPost() {
        setEditingPostId(null)
        setPostDraft(null)
        setPostActionError('')
    }

    async function savePost(event, item) {
        event.preventDefault()
        if (!postDraft || !user) return

        const description = postDraft.description.trim()
        const questions = postDraft.questions.map((question) => question.trim()).filter(Boolean)
        if (!description) {
            setPostActionError('Add a description before saving your post.')
            return
        }
        if (questions.length === 0 || questions.length > MAX_POST_QUESTIONS) {
            setPostActionError(`Add between 1 and ${MAX_POST_QUESTIONS} questions for claimers.`)
            return
        }
        if (questions.some((question) => question.length > MAX_POST_QUESTION_LENGTH)) {
            setPostActionError(`Questions must be ${MAX_POST_QUESTION_LENGTH} characters or fewer.`)
            return
        }

        setIsSavingPost(true)
        setPostActionError('')
        setPostActionMessage('')
        try {
            const changes = {
                description,
                location: postDraft.location.trim(),
                questions,
            }
            const { data, error: updateError } = await supabase
                .from('posts')
                .update(changes)
                .eq('id', item.id)
                .eq('user_id', user.id)
                .select('id')
                .maybeSingle()

            if (updateError) throw updateError
            if (!data) throw new Error('Post could not be updated. It may have been removed or is no longer yours.')

            setUpdatedPosts((current) => ({
                ...current,
                [item.id]: { ...item, desc: changes.description, location: changes.location, questions },
            }))
            setEditingPostId(null)
            setPostDraft(null)
            setPostActionMessage('Post updated successfully.')
        } catch (saveError) {
            setPostActionError(saveError instanceof Error ? saveError.message : 'Could not update your post.')
        } finally {
            setIsSavingPost(false)
        }
    }

    async function deletePost(item) {
        if (!user) return

        setDeletingPostId(item.id)
        setPostActionError('')
        setPostActionMessage('')
        try {
            const { data, error: deleteError } = await supabase
                .from('posts')
                .delete()
                .eq('id', item.id)
                .eq('user_id', user.id)
                .select('id')
                .maybeSingle()

            if (deleteError) throw deleteError
            if (!data) throw new Error('Post could not be deleted. It may have been removed or is no longer yours.')

            setDeletedPostIds((current) => [...current, item.id])
            setConfirmDeletePostId(null)
            if (editingPostId === item.id) cancelEditingPost()
            setPostActionMessage('Post deleted successfully.')
        } catch (deleteError) {
            setPostActionError(deleteError instanceof Error ? deleteError.message : 'Could not delete your post.')
        } finally {
            setDeletingPostId(null)
        }
    }

    useEffect(() => {
        let isActive = true

        function applyUser(nextUser) {
            setUser(nextUser)
            const details = getProfileDetails(nextUser)
            setFirstName(details.firstName)
            setLastName(details.lastName)
            setBio(details.bio)
            setAvatarUrl(details.avatarUrl)
            setAvatarFile(null)
            setAvatarPreview('')
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isActive) {
                applyUser(session?.user ?? null)
                setIsLoadingUser(false)
            }
        })

        supabase.auth.getUser().then(({ data, error: authError }) => {
            if (!isActive) return
            if (authError) {
                setProfileError(authError.message)
            } else {
                applyUser(data.user)
            }
            setIsLoadingUser(false)
        }).catch((authError) => {
            if (!isActive) return
            setProfileError(authError instanceof Error ? authError.message : 'Could not load your profile.')
            setIsLoadingUser(false)
        })

        return () => {
            isActive = false
            subscription.unsubscribe()
        }
    }, [])

    useEffect(() => () => {
        if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }, [avatarPreview])

    function handleAvatarChange(event) {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setProfileError('Choose an image for your profile picture.')
            return
        }
        if (file.size > MAX_AVATAR_SIZE) {
            setProfileError('Profile pictures must be 5 MB or smaller.')
            return
        }

        setProfileError('')
        setAvatarFile(file)
        setAvatarPreview(URL.createObjectURL(file))
    }

    async function saveProfile(event) {
        event.preventDefault()
        if (!user) return

        const trimmedFirstName = firstName.trim()
        const trimmedLastName = lastName.trim()
        if (!trimmedFirstName || !trimmedLastName) {
            setProfileError('Please enter your first and last name.')
            return
        }

        setIsSaving(true)
        setProfileError('')
        try {
            let nextAvatarUrl = avatarUrl
            if (avatarFile) {
                const extension = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg'
                const filePath = `avatars/${user.id}/${createId()}.${extension}`
                const { data, error: uploadError } = await supabase.storage
                    .from(MEDIA_BUCKET)
                    .upload(filePath, avatarFile, {
                        cacheControl: '3600',
                        contentType: avatarFile.type,
                    })

                if (uploadError) throw uploadError

                const { data: publicUrl } = supabase.storage
                    .from(MEDIA_BUCKET)
                    .getPublicUrl(data.path)
                nextAvatarUrl = publicUrl.publicUrl
            }

            const { data, error: updateError } = await supabase.auth.updateUser({
                data: {
                    ...user.user_metadata,
                    first_name: trimmedFirstName,
                    last_name: trimmedLastName,
                    bio: bio.trim(),
                    avatar_url: nextAvatarUrl,
                },
            })

            if (updateError) throw updateError
            setUser(data.user)
            setAvatarUrl(nextAvatarUrl)
            setAvatarFile(null)
            setAvatarPreview('')
            setIsEditing(false)
        } catch (saveError) {
            setProfileError(saveError instanceof Error ? saveError.message : 'Could not save your profile.')
        } finally {
            setIsSaving(false)
        }
    }

    const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Your profile'
    const shownAvatar = avatarPreview || avatarUrl

    if (isLoadingUser) {
        return <main className="grid min-h-screen place-items-center px-4 pt-24">Loading profile...</main>
    }

    if (!user) {
        return (
            <main className="grid min-h-screen place-items-center px-4 pt-24">
                <section className="max-w-md text-center">
                    <h1 className="text-2xl font-bold">Log in to view your profile</h1>
                    <p className="mt-2 text-slate-600">Your profile and posts are available after you sign in.</p>
                    {profileError && <p className="mt-3 text-red-700" role="alert">{profileError}</p>}
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="mt-5 rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white hover:bg-emerald-800"
                    >
                        Log in
                    </button>
                </section>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-[#F9F6F0] px-4 pb-12 pt-24 sm:px-8">
            <div className="mx-auto max-w-4xl">
                <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
                    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                        <div className="grid size-32 shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-100 text-3xl font-bold text-emerald-800">
                            {shownAvatar ? (
                                <img src={shownAvatar} alt={`${displayName}'s profile`} className="size-full object-cover" />
                            ) : (
                                displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
                            )}
                        </div>

                        <div className="min-w-0 flex-1 text-center sm:text-left">
                            {isEditing ? (
                                <form onSubmit={saveProfile} className="space-y-4">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <label className="text-left text-sm font-medium text-slate-700">
                                            First name
                                            <input
                                                required
                                                value={firstName}
                                                onChange={(event) => setFirstName(event.target.value)}
                                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                                            />
                                        </label>
                                        <label className="text-left text-sm font-medium text-slate-700">
                                            Last name
                                            <input
                                                required
                                                value={lastName}
                                                onChange={(event) => setLastName(event.target.value)}
                                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                                            />
                                        </label>
                                    </div>
                                    <label className="block text-left text-sm font-medium text-slate-700">
                                        About you
                                        <textarea
                                            rows={3}
                                            maxLength={500}
                                            value={bio}
                                            onChange={(event) => setBio(event.target.value)}
                                            placeholder="Tell people a little about yourself"
                                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                                        />
                                    </label>
                                    <label className="block text-left text-sm font-medium text-slate-700">
                                        Profile picture
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarChange}
                                            className="mt-1 block w-full text-sm"
                                        />
                                    </label>
                                    <div className="flex justify-center gap-3 sm:justify-start">
                                        <button
                                            type="submit"
                                            disabled={isSaving}
                                            className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                                        >
                                            {isSaving ? 'Saving...' : 'Save profile'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const details = getProfileDetails(user)
                                                setFirstName(details.firstName)
                                                setLastName(details.lastName)
                                                setBio(details.bio)
                                                setAvatarUrl(details.avatarUrl)
                                                setAvatarFile(null)
                                                setAvatarPreview('')
                                                setProfileError('')
                                                setIsEditing(false)
                                            }}
                                            className="rounded-lg border border-slate-300 px-4 py-2"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                                        <div>
                                            <h1 className="text-3xl font-bold text-slate-900">{displayName}</h1>
                                            <p className="mt-1 break-all text-sm text-slate-500">User ID: {user.id}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(true)}
                                            className="rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50"
                                        >
                                            Edit profile
                                        </button>
                                    </div>
                                    <p className="mt-4 whitespace-pre-wrap text-slate-700">
                                        {bio || 'Add a short bio to tell people about yourself.'}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                    {profileError && <p className="mt-4 text-sm text-red-700" role="alert">{profileError}</p>}
                </section>

                <section className="mt-6">
                    <h2 className="mb-4 text-xl font-bold">Your posts ({visibleItems.length})</h2>
                    {loading && <p>Loading your posts...</p>}
                    {error && <p role="alert">Could not load your posts: {error}</p>}
                    {postActionError && <p className="mb-3 text-sm text-red-700" role="alert">{postActionError}</p>}
                    {postActionMessage && <p className="mb-3 text-sm text-emerald-700" role="status">{postActionMessage}</p>}
                    {!loading && !error && visibleItems.length === 0 && (
                        <p className="rounded-xl bg-white p-5 text-slate-600">
                            You haven&apos;t posted anything yet. Your posts will appear here.
                        </p>
                    )}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {visibleItems.map((item) => (
                            <article
                                onClick={() => navigate(`/items/${item.id}`)}
                                key={item.id}
                                className="min-w-0 cursor-pointer rounded-xl bg-white p-3 transition hover:opacity-90"
                            >
                                <ProfileIdentity
                                    profile={item.profile ?? {
                                        first_name: firstName,
                                        last_name: lastName,
                                        avatar_url: shownAvatar,
                                    }}
                                />
                                {item.mediaType === 'video' ? (
                                    <video className="aspect-[4/3] w-full rounded-lg object-cover" src={item.img} controls />
                                ) : (
                                    <img
                                        className="aspect-[4/3] w-full rounded-lg object-cover"
                                        src={item.img}
                                        alt={item.desc}
                                    />
                                )}
                                <h3 className="mt-2 font-semibold">{item.desc}</h3>
                                {item.location && <p className="mt-1 text-sm text-slate-600">{item.location}</p>}
                                {editingPostId === item.id && postDraft ? (
                                    <form
                                        className="mt-4 space-y-3 border-t border-slate-200 pt-4"
                                        onClick={(event) => event.stopPropagation()}
                                        onSubmit={(event) => savePost(event, item)}
                                    >
                                        <label className="block text-sm font-medium text-slate-700">
                                            Description
                                            <input
                                                required
                                                value={postDraft.description}
                                                onChange={(event) => setPostDraft((current) => ({
                                                    ...current,
                                                    description: event.target.value,
                                                }))}
                                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                                            />
                                        </label>
                                        <label className="block text-sm font-medium text-slate-700">
                                            Location
                                            <input
                                                value={postDraft.location}
                                                onChange={(event) => setPostDraft((current) => ({
                                                    ...current,
                                                    location: event.target.value,
                                                }))}
                                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                                            />
                                        </label>
                                        <fieldset className="space-y-2">
                                            <legend className="text-sm font-medium text-slate-700">Questions for claimers</legend>
                                            {postDraft.questions.map((question, index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <input
                                                        required
                                                        maxLength={MAX_POST_QUESTION_LENGTH}
                                                        aria-label={`Question ${index + 1}`}
                                                        value={question}
                                                        onChange={(event) => setPostDraft((current) => ({
                                                            ...current,
                                                            questions: current.questions.map((currentQuestion, questionIndex) => (
                                                                questionIndex === index ? event.target.value : currentQuestion
                                                            )),
                                                        }))}
                                                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                                                    />
                                                    {postDraft.questions.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPostDraft((current) => ({
                                                                ...current,
                                                                questions: current.questions.filter((_, questionIndex) => questionIndex !== index),
                                                            }))}
                                                            className="shrink-0 text-sm font-semibold text-red-700 hover:text-red-900"
                                                            aria-label={`Remove question ${index + 1}`}
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {postDraft.questions.length < MAX_POST_QUESTIONS && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPostDraft((current) => ({
                                                        ...current,
                                                        questions: [...current.questions, ''],
                                                    }))}
                                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                                                >
                                                    Add question
                                                </button>
                                            )}
                                        </fieldset>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="submit"
                                                disabled={isSavingPost}
                                                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                                            >
                                                {isSavingPost ? 'Saving...' : 'Save changes'}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isSavingPost}
                                                onClick={cancelEditingPost}
                                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div
                                        className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => startEditingPost(item)}
                                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                                        >
                                            Edit post
                                        </button>
                                        {confirmDeletePostId === item.id ? (
                                            <>
                                                <span className="text-sm text-slate-600">Delete this post?</span>
                                                <button
                                                    type="button"
                                                    disabled={deletingPostId === item.id}
                                                    onClick={() => deletePost(item)}
                                                    className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                                                >
                                                    {deletingPostId === item.id ? 'Deleting...' : 'Confirm delete'}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={deletingPostId === item.id}
                                                    onClick={() => setConfirmDeletePostId(null)}
                                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDeletePostId(item.id)}
                                                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                                            >
                                                Delete post
                                            </button>
                                        )}
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    )
}
