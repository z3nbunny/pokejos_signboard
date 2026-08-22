import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';

export default function MerchCarousel({ isFeature, activeLocation }) {
    const [slides, setSlides] = useState([]);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        setSlides([]);
        setOffset(0);

        const slidesQuery = query(
            collection(
                db,
                'locations',
                activeLocation,
                'merchSlides'
            )
        );

        const unsubscribe = onSnapshot(
            slidesQuery,
            (snapshot) => {
                const liveData = snapshot.docs.map(
                    (document) => ({
                        id: document.id,
                        ...document.data()
                    })
                );

                setSlides(liveData);
            }
        );

        return () => unsubscribe();
    }, [activeLocation]);

    useEffect(() => {
        if (slides.length === 0) return;
        const timer = setInterval(() => {
            setOffset((prev) => prev + 1);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides]);

    if (slides.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-white/20 uppercase tracking-widest text-xs">
                Connecting to display matrix...
            </div>
        );
    }

    const visibleCount = isFeature ? 2 : 3;

    const visibleSlides = Array.from({ length: visibleCount }).map((_, i) => {
        const slideIndex = (offset + i) % slides.length;
        return {
            ...slides[slideIndex],
            instanceKey: `slide-instance-${offset + i}-${slides[slideIndex].id}`
        };
    });

    return (
        <div className={`relative w-full h-full overflow-hidden flex items-center justify-center gap-[1vw] ${isFeature ? 'pb-[2vh]' : 'py-[1.5vh]'}`}>
            <AnimatePresence mode="popLayout">
                {visibleSlides.map((slide) => (
                    <motion.div
                        layout
                        key={slide.instanceKey}
                        initial={{ opacity: 0, x: 100, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -100, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        className={`${isFeature ? 'w-[48%]' : 'w-[32%]'} h-full flex flex-col relative overflow-hidden rounded-[1vw] border border-black/10 shrink-0 bg-black`}
                    >
                        {/* 1. The Image Wrapper: Now flexes to take ONLY the remaining space */}
                        <div className="flex-1 w-full bg-white relative">
                            <img
                                src={slide.imageUrl || slide.image}
                                alt={slide.title}
                                /* absolute inset-0 forces the image to respect the flexible boundaries */
                                className="absolute inset-0 w-full h-full object-contain p-[1vw]"
                            />
                        </div>

                        {/* 2. The Text Box: shrink-0 guarantees it never gets squished or pushed off the edge */}
                        <div className="w-full shrink-0 py-[1.5vh] px-[1vw] flex flex-col items-center justify-center bg-black border-t border-white/20">

                            <h4 className="text-[1.4vw] tracking-[0.2em] text-white/60 uppercase font-bold line-clamp-1 text-center">
                                {slide.subtitle}
                            </h4>

                            <div className="w-[15vw] h-[0.5vh] bg-white/20 my-[1vh]"></div>

                            <h2 className="text-[1.6vw] font-black text-white tracking-tight leading-none line-clamp-2 text-center pb-[0.5vh]">
                                {slide.title}
                            </h2>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}