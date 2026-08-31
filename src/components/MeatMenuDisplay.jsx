import {
    useEffect,
    useState
} from 'react';

import {
    collection,
    doc,
    onSnapshot
} from 'firebase/firestore';

import { db } from '../firebase';
import MeatMenuPreview from './MeatMenuPreview';

const timestampToMillis = (value) => {
    if (!value) {
        return null;
    }

    if (typeof value.toMillis === 'function') {
        return value.toMillis();
    }

    if (typeof value === 'number') {
        return value;
    }

    const parsedTime =
        new Date(value).getTime();

    return Number.isFinite(parsedTime)
        ? parsedTime
        : null;
};

const snapshotToSpotlights = (
    snapshot,
    scope
) =>
    snapshot.docs.map((snapshotDocument) => ({
        id: snapshotDocument.id,
        scope,
        ...snapshotDocument.data()
    }));

const isSpotlightAvailable = (
    spotlight,
    activeLocation,
    currentTime,
    includeScheduledSpotlights
) => {
    if (spotlight.enabled === false) {
        return false;
    }

    const targetedLocations =
        Array.isArray(
            spotlight.targetLocationIds
        )
            ? spotlight.targetLocationIds
            : [];

    if (
        targetedLocations.length > 0
        && !targetedLocations.includes(
            activeLocation
        )
    ) {
        return false;
    }

    /*
     * Test mode may display an enabled future Spotlight,
     * while normal menu screens respect its schedule.
     */
    if (includeScheduledSpotlights) {
        return true;
    }

    const startsAt =
        timestampToMillis(
            spotlight.startsAt
        );

    const endsAt =
        timestampToMillis(
            spotlight.endsAt
        );

    return (
        (startsAt === null
            || startsAt <= currentTime)
        && (
            endsAt === null
            || currentTime < endsAt
        )
    );
};

const compareSpotlights = (
    firstSpotlight,
    secondSpotlight
) => {
    /*
     * A location-created Spotlight takes precedence over
     * a globally shared Spotlight.
     */
    if (
        firstSpotlight.scope
        !== secondSpotlight.scope
    ) {
        return firstSpotlight.scope === 'local'
            ? -1
            : 1;
    }

    const firstStart =
        timestampToMillis(
            firstSpotlight.startsAt
        ) || 0;

    const secondStart =
        timestampToMillis(
            secondSpotlight.startsAt
        ) || 0;

    if (firstStart !== secondStart) {
        return secondStart - firstStart;
    }

    const firstUpdated =
        timestampToMillis(
            firstSpotlight.updatedAt
        ) || 0;

    const secondUpdated =
        timestampToMillis(
            secondSpotlight.updatedAt
        ) || 0;

    return secondUpdated - firstUpdated;
};

export default function MeatMenuDisplay({
    activeLocation,
    includeScheduledSpotlights = false
}) {
    const [publishedMenu, setPublishedMenu] =
        useState(null);

    const [globalSpotlights, setGlobalSpotlights] =
        useState([]);

    const [localSpotlights, setLocalSpotlights] =
        useState([]);

    const [menuStatus, setMenuStatus] =
        useState('loading');

    const [currentTime, setCurrentTime] =
        useState(() => Date.now());

    useEffect(() => {
        const menuRef = doc(
            db,
            'globalMenus',
            'meat'
        );

        const unsubscribe = onSnapshot(
            menuRef,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setPublishedMenu(null);
                    setMenuStatus('missing');
                    return;
                }

                setPublishedMenu({
                    id: snapshot.id,
                    ...snapshot.data()
                });

                setMenuStatus('ready');
            },
            (error) => {
                console.error(
                    'Unable to load published Meat Menu:',
                    error
                );

                setPublishedMenu(null);
                setMenuStatus('error');
            }
        );

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const globalSpotlightCollection =
            collection(
                db,
                'globalMenuSpotlights',
                'meat',
                'items'
            );

        const unsubscribe = onSnapshot(
            globalSpotlightCollection,
            (snapshot) => {
                setGlobalSpotlights(
                    snapshotToSpotlights(
                        snapshot,
                        'global'
                    )
                );
            },
            (error) => {
                console.error(
                    'Unable to load global Meat Menu Spotlights:',
                    error
                );

                setGlobalSpotlights([]);
            }
        );

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const localSpotlightCollection =
            collection(
                db,
                'locations',
                activeLocation,
                'menuSpotlights',
                'meat',
                'items'
            );

        const unsubscribe = onSnapshot(
            localSpotlightCollection,
            (snapshot) => {
                setLocalSpotlights(
                    snapshotToSpotlights(
                        snapshot,
                        'local'
                    )
                );
            },
            (error) => {
                console.error(
                    'Unable to load location Meat Menu Spotlights:',
                    error
                );

                setLocalSpotlights([]);
            }
        );

        return () => unsubscribe();
    }, [activeLocation]);

    useEffect(() => {
        const clock = window.setInterval(
            () => {
                setCurrentTime(Date.now());
            },
            60000
        );

        return () => {
            window.clearInterval(clock);
        };
    }, []);

    const activeSpotlight = [
        ...localSpotlights,
        ...globalSpotlights
    ]
        .filter((spotlight) =>
            isSpotlightAvailable(
                spotlight,
                activeLocation,
                currentTime,
                includeScheduledSpotlights
            )
        )
        .sort(compareSpotlights)[0] || null;

    if (menuStatus === 'loading') {
        return (
            <div className="w-screen h-screen bg-[#0d0d0c] text-white flex items-center justify-center">
                <p className="text-xl font-bold uppercase tracking-widest text-white/70">
                    Loading Meat Menu...
                </p>
            </div>
        );
    }

    if (menuStatus === 'missing') {
        return (
            <div className="w-screen h-screen bg-[#0d0d0c] text-white flex flex-col items-center justify-center text-center px-8">
                <h1 className="text-4xl font-black uppercase tracking-wider text-[#f4c542]">
                    Meat Menu Not Published
                </h1>

                <p className="mt-4 text-xl text-white/75">
                    Publish the saved Meat Menu from the
                    administrator dashboard.
                </p>
            </div>
        );
    }

    if (
        menuStatus === 'error'
        || !publishedMenu
    ) {
        return (
            <div className="w-screen h-screen bg-[#0d0d0c] text-white flex flex-col items-center justify-center text-center px-8">
                <h1 className="text-4xl font-black uppercase tracking-wider text-red-400">
                    Meat Menu Unavailable
                </h1>

                <p className="mt-4 text-xl text-white/75">
                    The published menu could not be loaded.
                </p>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen overflow-hidden bg-[#0d0d0c] select-none">
            <MeatMenuPreview
                menu={publishedMenu}
                spotlight={activeSpotlight}
            />
        </div>
    );
}