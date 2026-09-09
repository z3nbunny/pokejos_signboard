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

    const parsedTime = new Date(value).getTime();

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

    const targetedLocations = Array.isArray(
        spotlight.targetLocationIds
    )
        ? spotlight.targetLocationIds
        : [];

    if (
        targetedLocations.length > 0
        && !targetedLocations.includes(activeLocation)
    ) {
        return false;
    }

    /*
     * A device preview may display an enabled future Spotlight.
     * Published menu screens continue to respect its schedule.
     */
    if (includeScheduledSpotlights) {
        return true;
    }

    const startsAt = timestampToMillis(
        spotlight.startsAt
    );

    const endsAt = timestampToMillis(
        spotlight.endsAt
    );

    return (
        (
            startsAt === null
            || startsAt <= currentTime
        )
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
     * A location-created Spotlight takes precedence over a
     * globally shared Spotlight.
     */
    if (
        firstSpotlight.scope
        !== secondSpotlight.scope
    ) {
        return firstSpotlight.scope === 'local'
            ? -1
            : 1;
    }

    const firstStart = timestampToMillis(
        firstSpotlight.startsAt
    ) || 0;

    const secondStart = timestampToMillis(
        secondSpotlight.startsAt
    ) || 0;

    if (firstStart !== secondStart) {
        return secondStart - firstStart;
    }

    const firstUpdated = timestampToMillis(
        firstSpotlight.updatedAt
    ) || 0;

    const secondUpdated = timestampToMillis(
        secondSpotlight.updatedAt
    ) || 0;

    return secondUpdated - firstUpdated;
};

function DisplayMessage({
    heading,
    message,
    tone = 'notice'
}) {
    const headingColor = tone === 'error'
        ? 'text-red-400'
        : 'text-[#f4c542]';

    return (
        <div className="w-screen h-screen bg-[#0d0d0c] text-white flex flex-col items-center justify-center text-center px-8">
            <h1
                className={`text-4xl font-black uppercase tracking-wider ${headingColor}`}
            >
                {heading}
            </h1>

            <p className="mt-4 text-xl text-white/75">
                {message}
            </p>
        </div>
    );
}

export default function MenuDisplayController({
    activeLocation,
    deviceId,
    previewMode = false,
    menuId,
    menuLabel,
    PreviewComponent
}) {
    const [displayedMenu, setDisplayedMenu] =
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
        const menuRef = previewMode
            ? doc(
                db,
                'locations',
                activeLocation,
                'devices',
                deviceId,
                'menuPreviews',
                menuId
            )
            : doc(
                db,
                'globalMenus',
                menuId
            );

        const unsubscribe = onSnapshot(
            menuRef,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setDisplayedMenu(null);
                    setMenuStatus(
                        previewMode
                            ? 'preview-missing'
                            : 'missing'
                    );
                    return;
                }

                const snapshotData = snapshot.data();

                /*
                 * A TV preview stores its menu inside a menu field.
                 * Published documents store the menu directly.
                 */
                const menuData =
                    previewMode && snapshotData.menu
                        ? snapshotData.menu
                        : snapshotData;

                setDisplayedMenu({
                    id: snapshot.id,
                    ...menuData
                });

                setMenuStatus('ready');
            },
            (error) => {
                console.error(
                    previewMode
                        ? `Unable to load ${menuLabel} TV preview:`
                        : `Unable to load published ${menuLabel}:`,
                    error
                );

                setDisplayedMenu(null);
                setMenuStatus('error');
            }
        );

        return () => unsubscribe();
    }, [
        activeLocation,
        deviceId,
        menuId,
        menuLabel,
        previewMode
    ]);

    useEffect(() => {
        const globalSpotlightCollection = collection(
            db,
            'globalMenuSpotlights',
            menuId,
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
                    `Unable to load global ${menuLabel} Spotlights:`,
                    error
                );

                setGlobalSpotlights([]);
            }
        );

        return () => unsubscribe();
    }, [menuId, menuLabel]);

    useEffect(() => {
        const localSpotlightCollection = collection(
            db,
            'locations',
            activeLocation,
            'menuSpotlights',
            menuId,
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
                    `Unable to load location ${menuLabel} Spotlights:`,
                    error
                );

                setLocalSpotlights([]);
            }
        );

        return () => unsubscribe();
    }, [
        activeLocation,
        menuId,
        menuLabel
    ]);

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
                previewMode
            )
        )
        .sort(compareSpotlights)[0] || null;

    if (menuStatus === 'loading') {
        return (
            <div className="w-screen h-screen bg-[#0d0d0c] text-white flex items-center justify-center">
                <p className="text-xl font-bold uppercase tracking-widest text-white/70">
                    Loading {menuLabel}...
                </p>
            </div>
        );
    }

    if (menuStatus === 'preview-missing') {
        return (
            <DisplayMessage
                heading="TV Preview Not Sent"
                message={`Select this TV in the administrator dashboard and send the current ${menuLabel} draft.`}
            />
        );
    }

    if (menuStatus === 'missing') {
        return (
            <DisplayMessage
                heading={`${menuLabel} Not Published`}
                message={`Publish the saved ${menuLabel} from the administrator dashboard.`}
            />
        );
    }

    if (
        menuStatus === 'error'
        || !displayedMenu
    ) {
        return (
            <DisplayMessage
                heading={`${menuLabel} Unavailable`}
                message={`The ${previewMode ? 'preview' : 'published'} menu could not be loaded.`}
                tone="error"
            />
        );
    }

    return (
        <div className="w-screen h-screen overflow-hidden bg-[#0d0d0c] select-none">
            <PreviewComponent
                menu={displayedMenu}
                spotlight={activeSpotlight}
            />
        </div>
    );
}
