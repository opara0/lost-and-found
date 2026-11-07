import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import AuthModal from "./AuthModal"
import supabase from "../supabase"

export default function Header() {
    const [open, setOpen] = useState(false)
    const [authMode, setAuthMode] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) setAuthMode(null)
        })

        return () => subscription.unsubscribe()
    }, [])

    return (
        <header className="sticky left-0 top-0 z-50 flex w-full items-center justify-between border-b border-slate-500 bg-white px-8 py-4">
            <button
                type="button"
                onClick={() => navigate('/')}
                className="cursor-pointer font-bold transition duration-200 hover:brightness-90 hover:opacity-70"
            >
                Lost and Found
            </button>

            <div className="flex items-center gap-4">
                <button
                    type="button"
                    aria-label="Home"
                    onClick={() => navigate('/')}
                    className="transition duration-200 hover:brightness-90 hover:opacity-70"
                >
                    <i className="fa-solid fa-house" aria-hidden="true"></i>
                </button>

                <button
                    type="button"
                    aria-label="Profile"
                    onClick={() => navigate('/profile')}
                    className="transition duration-200 hover:brightness-90 hover:opacity-70"
                >
                    <i className="fa-regular fa-user" aria-hidden="true"></i>
                </button>
                <button
                    type="button"
                    aria-label={open ? "Close menu" : "Open menu"}
                    aria-expanded={open}
                    onClick={() => setOpen((isOpen) => !isOpen)}
                    className="transition duration-200 hover:brightness-90 hover:opacity-70"
                >
                    <i
                        className={`fa-solid ${open ? "fa-xmark" : "fa-bars"}`}
                        aria-hidden="true"
                    ></i>
                </button>
            </div>
            {open && (
                <nav className="absolute right-8 top-full flex flex-col gap-2 border border-slate-200 bg-white px-4 py-2 shadow-lg">

                    <button
                        type="button"
                        onClick={() => {
                            navigate('/items')
                            setOpen(false)
                        }}
                        className="m-1 px-3 py-1 text-left transition duration-200 hover:brightness-90 hover:opacity-70"
                    >
                        Items
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            navigate('/report-found')
                            setOpen(false)
                        }}
                        className="m-1 px-3 py-1 text-left transition duration-200 hover:brightness-90 hover:opacity-70"
                    >
                        Report Found
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            navigate('/my-claims')
                            setOpen(false)
                        }}
                        className="m-1 px-3 py-1 text-left transition duration-200 hover:brightness-90 hover:opacity-70"
                    >
                        My claims
                    </button>
                    <div className="flex flex-row gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setAuthMode("login")
                                setOpen(false)
                            }}
                            className="rounded-lg bg-slate-100 px-3 py-2 shadow-md transition duration-200 hover:brightness-90 hover:opacity-70"
                        >
                            LOG IN
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setAuthMode("signup")
                                setOpen(false)
                            }}
                            className="rounded-lg bg-emerald-700 px-3 py-2 text-white shadow-md transition duration-200 hover:brightness-90 hover:opacity-70"
                        >
                            SIGN UP
                        </button>
                    </div>
                </nav>
            )}
            {authMode && (
                <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} />
            )}
        </header>
    )
}
