import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';

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

export default function useMenuSpotlight({
    locationId,
    menuId,
    currentTime,
    includeScheduledSpotlights = false
}) {
    const [globalState, setGlobalState] = useState(null);
    const [localState, setLocalState] = useState(null);

    useEffect(() => {
        if (!menuId) {
            return undefined;
        }

        return onSnapshot(
            collection(
                db,
                'globalMenuSpotlights',
                menuId,
                'items'
            ),
            (snapshot) => {
                setGlobalState({
                    menuId,
                    items: snapshotToSpotlights(
                        snapshot,
                        'global'
                    )
                });
            },
            (error) => {
                console.error(
                    `Unable to load global ${menuId} Spotlights:`,
                    error
                );

                setGlobalState({
                    menuId,
                    items: []
                });
            }
        );
    }, [menuId]);

    useEffect(() => {
        if (!locationId || !menuId) {
            return undefined;
        }

        return onSnapshot(
            collection(
                db,
                'locations',
                locationId,
                'menuSpotlights',
                menuId,
                'items'
            ),
            (snapshot) => {
                setLocalState({
                    locationId,
                    menuId,
                    items: snapshotToSpotlights(
                        snapshot,
                        'local'
                    )
                });
            },
            (error) => {
                console.error(
                    `Unable to load ${locationId} ${menuId} Spotlights:`,
                    error
                );

                setLocalState({
                    locationId,
                    menuId,
                    items: []
                });
            }
        );
    }, [locationId, menuId]);

    const globalSpotlights =
        globalState?.menuId === menuId
            ? globalState.items
            : [];

    const localSpotlights =
        localState?.locationId === locationId
        && localState?.menuId === menuId
            ? localState.items
            : [];

    if (!Number.isFinite(currentTime)) {
        return null;
    }

    return [
        ...localSpotlights,
        ...globalSpotlights
    ]
        .filter((spotlight) =>
            isSpotlightAvailable(
                spotlight,
                locationId,
                currentTime,
                includeScheduledSpotlights
            )
        )
        .sort(compareSpotlights)[0] || null;
}