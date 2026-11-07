import { useState } from "react"
import supabase from "../supabase"
export default function Login() {
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    async function login() {
        setIsLoggingIn(true)
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) {
                alert(error.message)
                return
            }

            alert('Login successful!')
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Unable to log in. Please try again.')
        } finally {
            setIsLoggingIn(false)
            setPassword('')
            setEmail('')
        }
    }
    return (
        <div className="flex flex-col min-h-screen justify-baseline  px-4 pt-24 gap-2 bg-[#292333] p-8 text-white shadow-2xl">
            <h1 className="text-emerald-500 text-4xl">WELCOME BACK</h1>
            <p className="font-light text-lg mx-3">sign in to access your account</p>
            <div className="mt-5 flex w-full flex-col gap-4">
                <input type="email" value={email} placeholder="Email" onChange={(e) => setEmail(e.target.value)} className="w-full min-w-0 rounded-lg border p-2 text-white shadow-2xl placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full min-w-0 rounded-lg border p-2 text-white shadow-2xl placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white" />
            </div>
            <button className="w-full min-w-0 p-2 text-white bg-pink-500 rounded-lg"
                onClick={login}
                disabled={isLoggingIn}>{isLoggingIn ? 'abobi wait, am comming' : 'Log in'}</button>
        </div>
    )
}