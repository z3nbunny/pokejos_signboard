import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase'; // Import your initialized database instance
import { collection, onSnapshot, query } from 'firebase/firestore';

const VISIBLE_COUNT = 3;

export default function MerchCarousel() {
    const [slides, setSlides] = useState([]);
    const [offset, setOffset] = useState(0);

    // 1. Listen to Firestore in Real Time
    useEffect(() => {
        const q = query(collection(db, "merchSlides"));

        // Establishing the real-time persistent data socket
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const liveData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSlides(liveData);
        });

        return () => unsubscribe(); // Clean up socket on component unmount
    }, []);

    // 2. Drive the conveyor rotation interval
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

    // Calculate the rolling window array
    const visibleSlides = Array.from({ length: VISIBLE_COUNT }).map((_, i) => {
        const slideIndex = (offset + i) % slides.length;
        return {
            ...slides[slideIndex],
            instanceKey: `slide-instance-${offset + i}-${slides[slideIndex].id}`
        };
    });

    return (
        // Added a slightly wider gap-[2vw] to spread the squares out beautifully
        <div className="relative w-full h-full overflow-hidden flex items-center justify-center gap-[2vw] p-[1vw]">
            <AnimatePresence mode="popLayout">
                {visibleSlides.map((slide) => (
                    <motion.div
                        layout
                        key={slide.instanceKey}
                        initial={{ opacity: 0, x: 100, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -100, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        // Swapped h-full for aspect-square. Added bg-white in case your shirts are transparent PNGs
                        className="w-[32%] aspect-square relative overflow-hidden rounded-[1vw] border border-black/10 shrink-0 shadow-2xl bg-white"
                    >
                        {/* The image fills the perfect square */}
                        <img
                            src={slide.imageUrl || slide.image}
                            alt={slide.title}
                            className="w-full h-full object-cover"
                        />

                        {/* Translucent Grey Overlay pinned to the bottom */}
                        <div className="absolute bottom-0 left-0 w-full py-[1.5vh] px-[1vw] flex flex-col items-center justify-center bg-zinc-800/85 backdrop-blur-sm border-t border-white/10">
                            <h4 className="text-[0.7vw] tracking-[0.2em] text-[#f59e0b] uppercase font-bold mb-[0.5vh] line-clamp-1 text-center">
                                {slide.subtitle}
                            </h4>
                            <h2 className="text-[1.4vw] font-black text-white tracking-tight leading-none line-clamp-2 text-center drop-shadow-md">
                                {slide.title}
                            </h2>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}