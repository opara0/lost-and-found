import { useNavigate } from 'react-router-dom'
import useItems from '../data/items'
import ProfileIdentity from './ProfileIdentity'
import { useEffect, useState } from 'react'

export default function Items() {
    const navigate = useNavigate()
    const { items, loading, error } = useItems()
    const [term, setTerm] = useState('')
    const [filteredItems, setFilteredItems] = useState(items)

    useEffect(() => {
        const searchTerm = term.trim().toLowerCase()
        const timeoutId = window.setTimeout(() => {
            setFilteredItems(items.filter((item) => {
                const searchText = `${item.desc} ${item.location ?? ''}`.toLowerCase()
                return searchText.includes(searchTerm)
            }))
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [items, term])

    return (
        <main className="min-h-screen bg-[#F9F6F0] px-4 pt-24 sm:px-8">
            <div className="mx-auto flex h-fit w-full max-w-md flex-row rounded-2xl border border-slate-400 bg-white px-3 py-2">
                <input
                    type="search"
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                    placeholder="Search items"
                    aria-label="Search items"
                    className="w-full px-2 text-lg focus:outline-none"
                />
                <button type="button" aria-label="Search">
                    <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                </button>
            </div>
            <section className="mx-auto mt-4 grid w-full max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {loading && <p>Loading posts...</p>}
                {error && <p role="alert">Could not load posts: {error}</p>}
                {!loading && !error && filteredItems.length === 0 && (
                    <p className="text-slate-600">
                        {term.trim() ? `No posts match "${term.trim()}".` : 'No posts yet.'}
                    </p>
                )}
                {filteredItems.map((item) => (
                    <article onClick={() => navigate(`/items/${item.id}`)} key={item.id} className="hover:opacity-90 cursor-pointer min-w-0 rounded-lg bg-white p-3">
                        <ProfileIdentity profile={item.profile} />
                        {item.mediaType === 'video' ? (
                            <video className="aspect-[4/3] w-full rounded-2xl object-cover" src={item.img} controls />
                        ) : (
                            <img
                                className="aspect-[4/3] hover:brightness-150 w-full rounded-2xl object-cover"
                                src={item.img}
                                alt={item.desc}
                            />
                        )}
                        <h2 className="mt-2 font-semibold">{item.desc}</h2>
                        <div className="mt-2 flex flex-wrap justify-between gap-2">
                            <p>{item.location}</p>
                        </div>
                    </article>
                ))}
            </section>
        </main>
    )
}