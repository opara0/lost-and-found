import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import AuthModal from "./AuthModal"
import supabase from "../supabase"

export default function Header() {
    const [authMode, setAuthMode] = useState(null)
    const [isAuthInitialized, setIsAuthInitialized] = useState(false)
    const [user, setUser] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            setIsAuthInitialized(true)
            if (session) setAuthMode(null)
        })

        return () => subscription.unsubscribe()
    }, [])

    return (
        <header className="sticky left-0 top-0 z-50 flex w-full items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-8">
            <button
                type="button"
                onClick={() => navigate('/')}
                className="cursor-pointer font-bold transition duration-200 hover:brightness-90 hover:opacity-70"
            >
                Lost and Found
            </button>

            {isAuthInitialized && !user && (
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={() => setAuthMode("login")}
                        className="rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:px-3"
                    >
                        LOG IN
                    </button>
                    <button
                        type="button"
                        onClick={() => setAuthMode("signup")}
                        className="rounded-lg bg-emerald-700 px-2 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:px-3"
                    >
                        SIGN UP
                    </button>
                </div>
            )}
            {authMode && (
                <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} />
            )}
        </header>
    )
}
