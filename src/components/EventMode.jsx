import React, { useState, useEffect } from 'react';

export default function EventMode({ slides }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Initialize an array of random effects (0 to 5) for each slide
    const [effects, setEffects] = useState(() =>
        slides?.length ? slides.map(() => Math.floor(Math.random() * 6)) : []
    );

    // Reset slideshow state whenever the campaign slides change.
    useEffect(() => {
        setCurrentIndex(0);

        setEffects(
            slides?.map(() =>
                Math.floor(Math.random() * 6)
            ) || []
        );
    }, [slides]);

    // Run the slideshow timer
    useEffect(() => {
        if (!slides || slides.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex(prev => {
                const next = (prev + 1) % slides.length;
                // Assign a new random effect to the incoming slide so it's different next time
                setEffects(prevEff => {
                    const newEff = [...prevEff];
                    newEff[next] = Math.floor(Math.random() * 6);
                    return newEff;
                });
                return next;
            });
        }, 8000); // 8 seconds per slide

        return () => clearInterval(timer);
    }, [slides]);

    if (!slides || slides.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-white">
                <h2 className="text-4xl font-black uppercase tracking-widest mb-4 text-[#f59e0b]">Awaiting Campaign Payload</h2>
                <p className="text-zinc-500 uppercase tracking-widest text-sm">Add slides to this campaign in the Library</p>
            </div>
        );
    }

    const safeCurrentIndex =
        currentIndex % slides.length;

    const currentSlide =
        slides[safeCurrentIndex];

    const safeTitle = String(
        currentSlide.title || ''
    ).replace(/<br\s*\/?>/gi, '\n');

    return (
        <div className="w-full h-full relative bg-black flex flex-col justify-end overflow-hidden">

            {/* The 6 Ken Burns Animation Keyframes */}
            <style>{`
                @keyframes kb-0 { 0% { transform: scale(1.0); } 100% { transform: scale(1.15) translate(-2%, -2%); } }
                @keyframes kb-1 { 0% { transform: scale(1.15) translate(2%, 2%); } 100% { transform: scale(1.0); } }
                @keyframes kb-2 { 0% { transform: scale(1.0); } 100% { transform: scale(1.15) translate(2%, -2%); } }
                @keyframes kb-3 { 0% { transform: scale(1.15) translate(-2%, 2%); } 100% { transform: scale(1.0); } }
                @keyframes kb-4 { 0% { transform: scale(1.1) translate(-2%, 0%); } 100% { transform: scale(1.1) translate(2%, 0%); } }
                @keyframes kb-5 { 0% { transform: scale(1.1) translate(2%, 0%); } 100% { transform: scale(1.1) translate(-2%, 0%); } }
            `}</style>

            {/* Cinematic Image Background with Crossfade & Ken Burns */}
            {slides.map((slide, index) => {
                const isActive = index === currentIndex;
                // Keep animation running while the previous slide fades out to prevent freezing
                const isFadingOut = slides.length > 1 && index === (currentIndex - 1 + slides.length) % slides.length;
                const shouldAnimate = isActive || isFadingOut;

                return (
                    <img
                        key={index}
                        src={slide.imageUrl}
                        alt={slide.title}
                        style={{
                            // 12s duration ensures the animation continues smoothly through the 1s fade-out
                            animation: shouldAnimate ? `kb-${effects[index] ?? index % 6} 12s linear forwards` : 'none'
                        }}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100 z-0' : 'opacity-0 -z-10'}`}
                    />
                );
            })}

            {/* Bottom Gradient Overlay for Text Readability - Upper screen stays fully transparent */}
            <div className="absolute bottom-0 w-full h-[55vh] bg-gradient-to-t from-black/95 via-black/60 to-transparent z-10 pointer-events-none"></div>

            {/* Content Overlay - Anchored to the Bottom */}
            <div className="relative z-20 flex flex-col items-center justify-end px-12 pb-[6vh] text-center w-full">
                {currentSlide.subtitle && (
                    <h3 className="text-[2.5vw] font-bold text-[#f59e0b] uppercase tracking-[0.3em] mb-[1vh] drop-shadow-md">
                        {currentSlide.subtitle}
                    </h3>
                )}

                <h1 className="text-[7.5vw] font-black text-white uppercase tracking-tighter leading-none mb-[3vh] drop-shadow-xl whitespace-pre-line">
                    {safeTitle}
                </h1>

                {currentSlide.description && (
                    <div className="w-24 h-1 bg-[#f59e0b]/50 mb-[3vh]"></div>
                )}

                {currentSlide.description && (
                    <p className="text-[2.2vw] text-white/90 font-medium max-w-[80vw] leading-tight drop-shadow-md">
                        {currentSlide.description}
                    </p>
                )}
            </div>

        </div>
    );
}