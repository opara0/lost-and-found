import { useEffect, useRef, useState } from "react"
import supabase from "../supabase"
const MAX_ATTACHMENTS = 5
const MAX_FILE_SIZE = 50 * 1024 * 1024
const MAX_QUESTIONS = 5
const MAX_QUESTION_LENGTH = 200
const MEDIA_BUCKET = 'lost-found-media'

function createId() {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID()
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
}

export default function ReportFound() {
    const [location, setLocation] = useState('')
    const [description, setDescription] = useState('')
    const [questions, setQuestions] = useState([''])
    const [attachments, setAttachments] = useState([])
    const [fileError, setFileError] = useState('')
    const [uploadMessage, setUploadMessage] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const previewUrls = useRef(new Set())

    useEffect(() => () => {
        previewUrls.current.forEach((url) => URL.revokeObjectURL(url))
    }, [])

    function handleFilesSelected(event) {
        const selectedFiles = Array.from(event.target.files ?? [])
        event.target.value = ''

        const availableSlots = MAX_ATTACHMENTS - attachments.length
        const acceptedFiles = []
        const errors = []

        for (const file of selectedFiles) {
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
                errors.push(`${file.name}: select an image or video.`)
            } else if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name}: files must be 50 MB or smaller.`)
            } else if (acceptedFiles.length >= availableSlots) {
                errors.push(`You can attach up to ${MAX_ATTACHMENTS} files.`)
                break
            } else {
                const previewUrl = URL.createObjectURL(file)
                previewUrls.current.add(previewUrl)
                acceptedFiles.push({
                    id: createId(),
                    file,
                    previewUrl,
                })
            }
        }

        setAttachments((current) => [...current, ...acceptedFiles])
        setFileError(errors.join(' '))
    }

    function removeAttachment(id) {
        setAttachments((current) => {
            const removed = current.find((attachment) => attachment.id === id)
            if (removed) {
                URL.revokeObjectURL(removed.previewUrl)
                previewUrls.current.delete(removed.previewUrl)
            }
            return current.filter((attachment) => attachment.id !== id)
        })
    }

    function updateQuestion(index, value) {
        setQuestions((current) => current.map((question, questionIndex) => (
            questionIndex === index ? value : question
        )))
    }

    async function uploadMedia(selectedFile) {
        const fileName = `${createId()}-${selectedFile.name}`

        const { data, error } = await supabase.storage
            .from(MEDIA_BUCKET)
            .upload(fileName, selectedFile)

        if (error) {
            throw new Error(`${selectedFile.name}: ${error.message}`)
        }

        const { data: urlData } = supabase.storage
            .from(MEDIA_BUCKET)
            .getPublicUrl(data.path)

        return {
            name: selectedFile.name,
            url: urlData.publicUrl,
            type: selectedFile.type.startsWith('video/') ? 'video' : 'image',
        }
    }
    async function handleSharePost() {
        if (attachments.length === 0) {
            setUploadMessage('Choose at least one photo or video to upload.')
            return
        }
        if (!description.trim()) {
            setUploadMessage('Add a description before sharing your post.')
            return
        }
        const trimmedQuestions = questions.map((question) => question.trim()).filter(Boolean)
        if (trimmedQuestions.length === 0) {
            setUploadMessage('Add at least one question claimers must answer.')
            return
        }

        setIsUploading(true)
        setUploadMessage('')
        const successfulUploads = []
        const uploadErrors = []

        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (userError) throw userError
            if (!user) {
                setUploadMessage('Please log in first.')
                return
            }

            for (const attachment of attachments) {
                try {
                    successfulUploads.push(await uploadMedia(attachment.file))
                } catch (error) {
                    uploadErrors.push(error instanceof Error ? error.message : 'An upload failed.')
                }
            }

            if (successfulUploads.length === 0) {
                setUploadMessage(uploadErrors.join(' ') || 'No files were uploaded.')
                return
            }

            const { error: postError } = await supabase
                .from('posts')
                .insert(successfulUploads.map((file) => ({
                    user_id: user.id,
                    description: description.trim(),
                    location: location.trim(),
                    questions: trimmedQuestions,
                    media_url: file.url,
                    media_type: file.type,
                })))

            if (postError) throw postError

            attachments.forEach(({ previewUrl }) => {
                URL.revokeObjectURL(previewUrl)
                previewUrls.current.delete(previewUrl)
            })
            setAttachments([])
            setDescription('')
            setLocation('')
            setQuestions([''])

            if (uploadErrors.length > 0) {
                setUploadMessage(
                    `Post shared with ${successfulUploads.length} of ${attachments.length} files. ${uploadErrors.join(' ')}`
                )
            } else {
                setUploadMessage('Post shared successfully.')
            }
        } catch (error) {
            setUploadMessage(error instanceof Error ? error.message : 'Could not share the post.')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <main className="min-h-screen box-border bg-[#F9F6F0] px-4 py-8 sm:px-8 sm:py-10">
            <div className="mx-auto w-full max-w-2xl">
                <p className="font-semibold uppercase tracking-[0.12em] text-emerald-700">Community feed</p>
                <h1 className="my-2 mb-5 text-3xl font-bold text-[#292333]">Share a found item</h1>
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_12px_rgba(41,35,51,0.08)] sm:p-6">
                    <input
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        type="text"
                        placeholder="Describe the item and where you found it"
                        aria-label="Describe the item"
                        className="box-border min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                    <input
                        value={location}
                        onChange={(event) => setLocation(event.target.value)}
                        type="text"
                        placeholder="Where was it found?"
                        aria-label="Where was it found?"
                        className="box-border min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    />
                    <fieldset className="space-y-3">
                        <legend className="font-semibold text-slate-800">
                            Questions for claimers <span className="text-red-700">(required)</span>
                        </legend>
                        <p className="text-sm text-slate-600">
                            Add questions that help verify the item belongs to the claimer.
                        </p>
                        {questions.map((question, index) => (
                            <div className="flex items-center gap-2" key={index}>
                                <input
                                    required
                                    maxLength={MAX_QUESTION_LENGTH}
                                    value={question}
                                    onChange={(event) => updateQuestion(index, event.target.value)}
                                    placeholder={`Question ${index + 1}`}
                                    aria-label={`Question ${index + 1}`}
                                    className="box-border min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                                />
                                {questions.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setQuestions((current) => current.filter((_, questionIndex) => questionIndex !== index))}
                                        className="shrink-0 rounded-lg px-3 py-2 font-semibold text-red-700 hover:bg-red-50"
                                        aria-label={`Remove question ${index + 1}`}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                        {questions.length < MAX_QUESTIONS && (
                            <button
                                type="button"
                                onClick={() => setQuestions((current) => [...current, ''])}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                            >
                                Add another question
                            </button>
                        )}
                    </fieldset>

                    {attachments.length > 0 && (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
                            {attachments.map(({ id, file, previewUrl }) => (
                                <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50" key={id}>
                                    {file.type.startsWith('video/') ? (
                                        <video src={previewUrl} controls aria-label={`Preview ${file.name}`} className="block h-36 w-full bg-slate-900 object-cover" />
                                    ) : (
                                        <img src={previewUrl} alt={file.name} className="block h-36 w-full object-cover" />
                                    )}
                                    <div className="flex items-center justify-between gap-2 p-2 text-xs">
                                        <span className="truncate" title={file.name}>{file.name}</span>
                                        <button type="button" onClick={() => removeAttachment(id)} className="shrink-0 font-semibold text-red-700 hover:text-red-900">
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {fileError && <p className="text-sm text-red-700" role="alert">{fileError}</p>}
                    {uploadMessage && (
                        <p className="text-sm text-slate-700" role="status">{uploadMessage}</p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                        <label className={`inline-flex min-h-11 items-center rounded-xl px-4 py-2 font-semibold text-white ${attachments.length >= MAX_ATTACHMENTS ? 'cursor-not-allowed bg-emerald-800/60' : 'cursor-pointer bg-emerald-600 hover:bg-emerald-700'}`}>
                            + Photo or video
                            <input
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                disabled={attachments.length >= MAX_ATTACHMENTS}
                                onChange={handleFilesSelected}
                                aria-label="Choose photos or videos"
                                className="sr-only"
                            />
                        </label>
                        <p className="text-sm text-slate-600">{attachments.length}/{MAX_ATTACHMENTS} attachments</p>
                        <button type="button"
                            onClick={handleSharePost}
                            disabled={isUploading}
                            className="min-h-11 rounded-xl bg-pink-500 px-4 py-2 font-semibold text-white hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60">
                            {isUploading ? 'Uploading...' : 'Share post'}
                        </button>
                    </div>
                </div>
            </div>
        </main>
    )
}