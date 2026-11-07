import { useState } from "react"
import { useNavigate } from "react-router-dom"
import supabase from '../supabase'

export default function Auth() {
    const navigate = useNavigate()

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [termsAccepted, setTermsAccepted] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function signUp(event) {
        event.preventDefault()
        setErrorMessage('')
        setSuccessMessage('')

        const trimmedFirstName = firstName.trim()
        const trimmedLastName = lastName.trim()
        if (!trimmedFirstName || !trimmedLastName) {
            setErrorMessage('Please enter your first and last name.')
            return
        }

        setIsSubmitting(true)
        try {
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
                navigate('/')
                return
            }

            setSuccessMessage('Account created. Check your email to confirm your account.')
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'Unable to create your account. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col min-h-screen justify-baseline  px-4 pt-24 gap-2 bg-[#292333] p-8 text-white shadow-2xl">
            <h1 className="text-4xl">Create an account</h1>
            <p className="font-light">
                If you already have an account?{" "}
                <span onClick={() => navigate('/login')} className="cursor-pointer text-emerald-500">Login</span>
            </p>
            <form onSubmit={signUp}>
                <div className="mt-10 flex w-full items-center gap-2">
                    <input
                        type="text"
                        placeholder="First name"
                        aria-label="First name"
                        autoComplete="given-name"
                        required
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        className="min-w-0 flex-1 rounded-lg border p-2 text-white shadow-2xl placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white"
                    />
                    <input
                        type="text"
                        placeholder="Last name"
                        aria-label="Last name"
                        autoComplete="family-name"
                        required
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        className="min-w-0 flex-1 rounded-lg border p-2 text-white shadow-2xl placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white"
                    />
                </div>
                <div className="mt-5 flex w-full flex-col gap-4">
                    <input
                        type="email"
                        placeholder="Email"
                        aria-label="Email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full min-w-0 rounded-lg border p-2 text-white shadow-2xl placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white"
                    />
                    <input
                        type="password"
                        placeholder="Enter your password"
                        aria-label="Password"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full min-w-0 rounded-lg border p-2 text-white shadow-2xl placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white"
                    />
                </div>
                <label className="mt-4 flex cursor-pointer items-center gap-2">
                    <input
                        type="checkbox"
                        className="size-4 accent-emerald-500"
                        name="terms"
                        required
                        checked={termsAccepted}
                        onChange={(event) => setTermsAccepted(event.target.checked)}
                    />
                    <span>I agree to the terms and conditions</span>
                </label>
                {errorMessage && <p className="mt-3 text-red-300" role="alert">{errorMessage}</p>}
                {successMessage && <p className="mt-3 text-emerald-300" role="status">{successMessage}</p>}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 w-full min-w-0 rounded-lg bg-pink-500 p-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSubmitting ? 'Creating account...' : 'Sign Up'}
                </button>
            </form>
        </div>
    )
}