export default function ProfileIdentity({ profile }) {
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Community member'
    const avatarUrl = profile?.avatar_url
    const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

    return (
        <div className="m-2 flex items-center gap-4">
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    className="size-10 shrink-0 rounded-full object-cover"
                    alt={`${name}'s profile`}
                />
            ) : (
                <span
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800"
                    aria-label={`${name}'s profile`}
                >
                    {initials}
                </span>
            )}
            <h1 className="text-lg font-light">{name}</h1>
        </div>
    )
}
