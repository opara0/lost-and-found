import { useParams } from "react-router-dom"
import items from "../data/items"
export default function ItemsDetails() {
    const { id } = useParams()
    const item = items.find((item) => item.id === id)
    if (!item) {
        return (
            <div className="min-h-screen grid place-items-center"><h1>No item matched</h1></div>
        )
    }
    return (
        <main className="min-h-screen grid place-items-center">
            <div className="px-4 py-4">
                <img src={item.image} className="aspect-[4/3] w-full rounded-2xl object-cover" alt="" />
                <h1>{item.name}</h1>
                <p>{item.description}</p>
                <p>Found at:{item.location}</p>
            </div>
        </main>
    )
}