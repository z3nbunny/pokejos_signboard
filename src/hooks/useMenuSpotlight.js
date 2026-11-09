import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';

import { db } from '../firebase';

import { isSpotlightEligible } from '../utils/menuSpotlightSchedule';
import useSpotlightSettings from './useSpotlightSettings';

const snapshotToSpotlights = (snapshot, scope) => snapshot.docs.map((document) => ({
    ...document.data(), id: document.id, scope
}));

export function useMenuSpotlights({
    locationId,
    menuId,
    currentTime,
    includeScheduledSpotlights = false
}) {
    const { calendarEnabled } = useSpotlightSettings(menuId);
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
        return [];
    }

    return [
        ...localSpotlights,
        ...globalSpotlights
    ]
        .filter((spotlight) =>
            isSpotlightEligible(
                spotlight,
                locationId,
                currentTime,
                includeScheduledSpotlights,
                calendarEnabled
            )
        )
        .sort((first, second) => `${first.scope}:${first.id}`.localeCompare(`${second.scope}:${second.id}`));
}

export default function useMenuSpotlight(options) {
    return useMenuSpotlights(options)[0] || null;
}
