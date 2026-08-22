import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase'; // Ensure your firebase config is set up
import { collection, onSnapshot } from 'firebase/firestore';

const getSafeFramingValue = (
    value,
    fallback,
    minimum,
    maximum
) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return fallback;
    }

    return Math.min(
        maximum,
        Math.max(minimum, numericValue)
    );
};

const getCardImageFraming = (card, isFeature) => {
    const mode = isFeature ? 'feature' : 'standard';
    const framing = card?.imageFraming?.[mode] || {};

    return {
        zoom: getSafeFramingValue(
            framing.zoom,
            1,
            1,
            3
        ),
        x: getSafeFramingValue(
            framing.x,
            50,
            0,
            100
        ),
        y: getSafeFramingValue(
            framing.y,
            50,
            0,
            100
        )
    };
};

export default function BottomCards({ isFeature, activeLocation }) {
    // We hold ALL cards from the database here
    const [allCards, setAllCards] = useState([]);
    // We hold exactly the cards currently visible on the TV here
    const [displayCards, setDisplayCards] = useState([]);

    useEffect(() => {
        setAllCards([]);
        setDisplayCards([]);

        const unsubscribe = onSnapshot(
            collection(
                db,
                'locations',
                activeLocation,
                'infoCards'
            ),
            (snapshot) => {
                const data = snapshot.docs.map(
                    (document) => ({
                        id: document.id,
                        ...document.data()
                    })
                );

                setAllCards(data);
                setDisplayCards(data.slice(0, 3));
            }
        );

        return () => unsubscribe();
    }, [activeLocation]);

    // The Random Flip Engine
    useEffect(() => {
        if (allCards.length <= 3) return;

        const flipTimer = setInterval(() => {
            setDisplayCards(prev => {
                const newDisplay = [...prev];

                // 1. Determine how many slots are currently active
                const slotCount = isFeature ? 1 : 3;

                // 2. Pick a random slot to flip based on the active layout
                const randomSlot = Math.floor(Math.random() * slotCount);

                // --- THE FIX IS HERE ---
                // Slice the array so we ONLY look at the slots currently being rendered
                const visibleCards = newDisplay.slice(0, slotCount);

                // Find all cards in the database that are NOT in a visible slot
                const availableCards = allCards.filter(
                    card => !visibleCards.some(displayedCard => displayedCard?.id === card.id)
                );

                // Pick a random card from the unused pile
                const randomNewCard = availableCards[Math.floor(Math.random() * availableCards.length)];

                // Swap it into the slot
                newDisplay[randomSlot] = randomNewCard;
                return newDisplay;
            });
        }, 8191);

        return () => clearInterval(flipTimer);
    }, [allCards, isFeature]); // Added isFeature so the engine instantly knows if the layout changes

    return (
        // Added perspective-[1000px] for the 3D flip effect, dynamically swap columns
        <div className={`w-full h-full grid gap-[1vw] perspective-[1000px] ${isFeature ? 'grid-cols-1' : 'grid-cols-3'
            }`}>
            {/* Map over the correct number of slots based on the layout mode */}
            {(isFeature ? [0] : [0, 1, 2]).map((slotIndex) => {
                const card = displayCards[slotIndex];

                const imageFraming = getCardImageFraming(
                    card,
                    isFeature
                );

                return (
                    // This div lo cks down the physical grid space so the layout doesn't collapse
                    <div key={`slot-${slotIndex}`} className="relative w-full h-full">
                        <AnimatePresence mode="wait">
                            {card && (
                                <motion.div
                                    key={card.id}
                                    initial={{ rotateY: -90, opacity: 0 }}
                                    animate={{ rotateY: 0, opacity: 1 }}
                                    exit={{ rotateY: 90, opacity: 0 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    className="absolute inset-0 rounded-[1vw] overflow-hidden bg-black border border-black/10 flex flex-col"
                                >
                                    <div className="w-full h-[60%] bg-black relative overflow-hidden">
                                        <img
                                            src={card.imageUrl}
                                            alt={card.title}
                                            className="w-full h-full object-cover"
                                            style={{
                                                objectPosition:
                                                    `${imageFraming.x}% ${imageFraming.y}%`,
                                                transform:
                                                    `scale(${imageFraming.zoom})`,
                                                transformOrigin:
                                                    `${imageFraming.x}% ${imageFraming.y}%`
                                            }}
                                        />
                                    </div>

                                    {/* Updated the text box to match the monochrome design */}
                                    <div className="flex-1 flex flex-col items-center justify-center px-[1.5vw] py-[1vh] bg-black border-t border-white/20">

                                        {/* Faded white subtitle */}
                                        <h4 className="text-[1.5vw] tracking-[0.2em] text-white/60 uppercase font-bold text-center">
                                            {card.subtitle}
                                        </h4>

                                        {/* The new horizontal divider */}
                                        <div className="w-[20vw] h-[0.5vh] bg-white/50 my-[0.8vh]"></div>

                                        {/* Main Title */}
                                        <h2 className="text-[1.6vw] font-black text-white uppercase tracking-tight leading-none text-center">
                                            {card.title}
                                        </h2>

                                        {/* Description text */}
                                        <p className="text-[0.9vw] text-white/60 mt-[1vh] font-medium leading-tight line-clamp-2 text-center">
                                            {card.description}
                                        </p>

                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}