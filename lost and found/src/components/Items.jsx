import { useNavigate } from 'react-router-dom'
import items from '../data/items'

export default function Items() {
    const navigate = useNavigate()
    return (
        <main className="min-h-screen bg-[#F9F6F0] px-4 pt-24 sm:px-8">
            <div className="mx-auto flex h-fit w-full max-w-md flex-row rounded-2xl border border-slate-400 bg-white px-3 py-2">
                <input
                    type="search"
                    placeholder="Search items"
                    aria-label="Search items"
                    className="w-full px-2 text-lg focus:outline-none"
                />
                <button type="button" aria-label="Search">
                    <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                </button>
            </div>
            <section className="mx-auto mt-4 grid w-full max-w-7xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                    <article onClick={() => navigate(`/items/${item.id}`)} key={item.id} className="hover:opacity-90 cursor-pointer min-w-0 rounded-lg bg-white p-3">
                        <img
                            className="aspect-[4/3] hover:brightness-150 w-full rounded-2xl object-cover"
                            src={item.image}
                            alt={item.name}
                        />
                        <h2 className="mt-2 font-semibold" >{item.name}</h2>
                        <p className="mt-1">{item.description}</p>
                        <div className="mt-2 flex flex-wrap justify-between gap-2">
                            <p>{item.location}</p>
                            {item.contact && <p>{item.contact}</p>}
                        </div>
                    </article>
                ))}
            </section>
        </main>
    )
}