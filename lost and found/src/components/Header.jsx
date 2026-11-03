import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function Header() {
    const [open, setOpen] = useState(false)
    const navigate = useNavigate()

    return (
        <header className="fixed left-0 top-0 z-50 flex w-full items-center justify-between border-b border-slate-500 bg-white px-8 py-4">
            <button
                type="button"
                onClick={() => navigate('/')}
                className="cursor-pointer font-bold transition duration-200 hover:brightness-90 hover:opacity-70"
            >
                Lost and Found
            </button>
            <button
                type="button"
                onClick={() => navigate('/items')}
                className="m-1 px-3 py-1 text-lg font-semibold transition duration-200 hover:brightness-90 hover:opacity-70"
            >
                Items
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
                <nav className="absolute right-8 top-full flex flex-col gap-2 border border-slate-200 bg-white px-4 py-2">
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
                    <h3 className="m-1 px-3 py-1 transition duration-200 hover:brightness-90 hover:opacity-70">Report Found</h3>
                    <h3 className="m-1 px-3 py-1 transition duration-200 hover:brightness-90 hover:opacity-70">My claims</h3>
                    <h3 className="m-1 px-3 py-1 transition duration-200 hover:brightness-90 hover:opacity-70">Contact</h3>
                    <h3 className="m-1 px-3 py-1 transition duration-200 hover:brightness-90 hover:opacity-70">Avanta</h3>
                </nav>
            )}
        </header>
    )
}
