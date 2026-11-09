import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { getSpotlightSeconds, nextSpotlight, shuffleSpotlights } from '../utils/menuSpotlightSchedule';

const MotionPanel = motion.div;
const adKey = (ad) => `${ad.scope || 'global'}:${ad.id}`;

function RotationPlayer({ items, children }) {
    const playlistKey = JSON.stringify(items.map(adKey).sort());
    const keys = useMemo(() => JSON.parse(playlistKey), [playlistKey]);
    const [playback, setPlayback] = useState(() => {
        const bag = shuffleSpotlights(keys);
        return { key: bag[0], queue: bag.slice(1) };
    });
    const [settledKey, setSettledKey] = useState(playback.key);
    const reducedMotion = useReducedMotion();
    const current = items.find((ad) => adKey(ad) === playback.key) || items[0];
    const currentKey = adKey(current);
    const duration = getSpotlightSeconds(current.displayDurationSeconds) * 1000;
    const nextImage = items.find((ad) => adKey(ad) === playback.queue[0])?.imageUrl;

    useEffect(() => {
        if (keys.length < 2 || settledKey !== currentKey) return undefined;
        const timer = window.setTimeout(() => {
            setPlayback((state) => nextSpotlight(keys, state.queue, currentKey));
        }, duration);
        // Begin the dwell timer only once the incoming ad has finished turning.
        return () => window.clearTimeout(timer);
    }, [keys, currentKey, duration, settledKey]);

    useEffect(() => {
        if (nextImage) {
            const image = new Image();
            image.src = nextImage;
        }
    }, [nextImage]);

    return (
        <div className="relative flex-1 min-h-0" style={{ perspective: 1200 }} aria-label="Menu Spotlight">
            <AnimatePresence mode="wait" initial={false}>
                <MotionPanel key={currentKey} className="absolute inset-0 flex flex-col"
                    initial={{ rotateY: reducedMotion ? 0 : -90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: reducedMotion ? 0 : 90, opacity: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.35, ease: 'easeInOut' }}
                    onAnimationComplete={() => setSettledKey(currentKey)}
                    style={{ backfaceVisibility: 'hidden' }}>
                    {children(current)}
                </MotionPanel>
            </AnimatePresence>
        </div>
    );
}

export default function SpotlightRotator({ items = [], children, fallback = null }) {
    return items.length
        ? <RotationPlayer items={items}>{children}</RotationPlayer>
        : fallback;
}
