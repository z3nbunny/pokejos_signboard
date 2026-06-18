import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // Ensure your firebase config is set up
import { collection, onSnapshot } from 'firebase/firestore';

export default function BottomCards() {
    const [cards, setCards] = useState([]);

    useEffect(() => {
        // Listens to your 'bottomCards' collection in Firebase
        const unsubscribe = onSnapshot(collection(db, 'infoCards'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCards(data);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="w-full h-full grid grid-cols-3 gap-[3vw] pb-[2vw]">
            {cards.map((card) => (
                <div key={card.id} className="relative w-full h-full rounded-[1vw] overflow-hidden shadow-2xl bg-[#1a1a1d] border border-black/10 flex flex-col shrink-0">
                    <div className="w-full h-[65%] bg-black relative">
                        <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center px-[1.5vw]">
                        <h4 className="text-[0.8vw] tracking-[0.2em] text-[#f59e0b] uppercase font-bold mb-[0.5vh]">
                            {card.subtitle}
                        </h4>
                        <h2 className="text-[1.6vw] font-black text-white uppercase tracking-tight leading-none">
                            {card.title}
                        </h2>
                        <p className="text-[0.9vw] text-white/60 mt-[1vh] font-medium leading-tight line-clamp-2">
                            {card.description}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}