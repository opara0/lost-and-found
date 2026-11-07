import { useEffect, useState } from "react"
import supabase from "../supabase"

export default function AuthModal({ initialMode = "login", onClose }) {
    const [mode, setMode] = useState(initialMode)
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [successMessage, setSuccessMessage] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === "Escape") onClose()
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [onClose])

    function selectMode(nextMode) {
        setMode(nextMode)
        setErrorMessage("")
        setSuccessMessage("")
    }

    async function handleSubmit(event) {
        event.preventDefault()
        setErrorMessage("")
        setSuccessMessage("")
        setIsSubmitting(true)

        try {
            if (mode === "signup") {
                const trimmedFirstName = firstName.trim()
                const trimmedLastName = lastName.trim()

                if (!trimmedFirstName || !trimmedLastName) {
                    setErrorMessage("Please enter your first and last name.")
                    return
                }

                const { data, error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: {
                        data: {
                            first_name: trimmedFirstName,
                            last_name: trimmedLastName,
                        },
                    },
                })

                if (error) {
                    setErrorMessage(error.message)
                    return
                }

                if (data.session) {
                    onClose()
                    return
                }

                setSuccessMessage("If you can register with this email, you'll receive a confirmation link shortly.")
                return
            }

            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            })

            if (error) {
                setErrorMessage(error.message)
                return
            }

            onClose()
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : "Something went wrong. Please try again."
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose()
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
                className="relative w-full max-w-md rounded-2xl bg-white p-6 text-slate-900 shadow-2xl sm:p-8"
            >
                <button
                    type="button"
                    aria-label="Close dialog"
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                    <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>

                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Lost and Found
                </p>
                <h2 id="auth-modal-title" className="mt-3 text-3xl font-bold">
                    {mode === "signup" ? "Join the community" : "Welcome back"}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                    {mode === "signup"
                        ? "Create an account to report items and manage your claims."
                        : "Log in to report items and manage your claims."}
                </p>

                <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                    <button
                        type="button"
                        aria-pressed={mode === "login"}
                        onClick={() => selectMode("login")}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                            mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                        }`}
                    >
                        Log in
                    </button>
                    <button
                        type="button"
                        aria-pressed={mode === "signup"}
                        onClick={() => selectMode("signup")}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                            mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                        }`}
                    >
                        Sign up
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    {mode === "signup" && (
                        <div className="grid grid-cols-2 gap-3">
                            <label className="text-sm font-medium text-slate-700">
                                First name
                                <input
                                    type="text"
                                    autoComplete="given-name"
                                    required
                                    value={firstName}
                                    onChange={(event) => setFirstName(event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                                />
                            </label>
                            <label className="text-sm font-medium text-slate-700">
                                Last name
                                <input
                                    type="text"
                                    autoComplete="family-name"
                                    required
                                    value={lastName}
                                    onChange={(event) => setLastName(event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                                />
                            </label>
                        </div>
                    )}
                    <label className="block text-sm font-medium text-slate-700">
                        Email
                        <input
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                        />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Password
                        <input
                            type="password"
                            autoComplete={mode === "signup" ? "new-password" : "current-password"}
                            minLength={6}
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                        />
                    </label>

                    {errorMessage && <p className="text-sm text-red-700" role="alert">{errorMessage}</p>}
                    {successMessage && <p className="text-sm text-emerald-800" role="status">{successMessage}</p>}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting
                            ? "Please wait..."
                            : mode === "signup" ? "Create account" : "Log in"}
                    </button>
                </form>

                <p className="mt-5 text-center text-xs text-slate-500">
                    Use the email linked to your account to log in. No device tracking needed.
                </p>
            </section>
        </div>
    )
}
