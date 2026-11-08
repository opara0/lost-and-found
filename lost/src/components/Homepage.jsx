import Photo from '../assets/vadim-sherbakov-tCICLJ5ktBE-unsplash.jpg'
export default function Homepage() {
    return (
        <main>
            <div className="relative min-h-[calc(100dvh-7.5rem)] md:min-h-[calc(100dvh-3rem)]">
                <img
                    className="absolute inset-0 h-full w-full object-cover"
                    src={Photo}
                    alt="A lost item"
                />
                <div className="absolute inset-0 flex items-center justify-center 
             text-3xl bg-black/30 px-4">
                    <h1 className="text-center text-4xl font-bold text-white md:text-5xl">
                        Find your missing items
                    </h1>
                </div>
            </div>

        </main>
    )
}