import { NavLink, useLocation } from 'react-router-dom'

const navigationItems = [
    { label: 'Home', path: '/', icon: 'fa-house', end: true },
    { label: 'Browse', path: '/items', icon: 'fa-magnifying-glass' },
    { label: 'Report', path: '/report-found', icon: 'fa-circle-plus' },
    { label: 'Claims', path: '/my-claims', icon: 'fa-clipboard-list' },
    { label: 'Chat', path: '/chats', icon: 'fa-comments' },
    { label: 'Profile', path: '/profile', icon: 'fa-user' },
]

export default function ResponsiveNavigation() {
    const { pathname } = useLocation()

    return (
        <nav
            className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-slate-200 bg-white px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:inset-x-auto md:top-14 md:right-auto md:bottom-0 md:flex md:w-60 md:flex-col md:gap-1.5 md:border-t-0 md:border-r md:px-4 md:py-5"
            aria-label="Main navigation"
        >
            {navigationItems.map(({ label, path, icon, end }) => (
                <NavLink
                    key={path}
                    to={path}
                    end={end}
                    className={({ isActive }) => {
                        const isCurrentSection = isActive || (path === '/chats' && pathname.startsWith('/chats/'))
                        return `group flex min-w-0 min-h-13 flex-col items-center justify-center gap-1 rounded-xl text-[0.7rem] font-semibold no-underline transition-all duration-200 ease-out active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 motion-reduce:transition-none md:min-h-12 md:flex-row md:justify-start md:gap-4 md:px-4 md:text-[0.95rem] ${isCurrentSection ? 'bg-emerald-100 text-emerald-900 shadow-sm ring-1 ring-emerald-200 md:translate-x-1 md:font-bold' : 'text-slate-500 hover:scale-[1.02] hover:bg-slate-100 hover:text-slate-900 md:hover:translate-x-1'}`
                    }}
                >
                    <span className="flex size-8 items-center justify-center rounded-full transition-all duration-200 group-hover:scale-110 group-active:scale-95 md:size-9">
                        <i className={`fa-solid ${icon} text-[1.1rem]`} aria-hidden="true"></i>
                    </span>
                    <span className="transition-transform duration-200 group-hover:-translate-y-0.5 md:group-hover:translate-y-0">{label}</span>
                </NavLink>
            ))}
        </nav>
    )
}
