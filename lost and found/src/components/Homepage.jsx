import Photo from '../assets/vadim-sherbakov-tCICLJ5ktBE-unsplash.jpg'
export default function Homepage() {
    return (
        <main className="max-h-screen bg-[#F9F6F0]">
            <div className="relative">
                <img
                    className="h-[400px] w-full object-cover md:h-96 lg:h-[500px]"
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