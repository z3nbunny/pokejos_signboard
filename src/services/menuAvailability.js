import {
    doc,
    onSnapshot,
    runTransaction,
    serverTimestamp,
    setDoc
} from 'firebase/firestore';

import { db } from '../firebase';

export const MENU_TIME_ZONE = 'America/Chicago';

const centralClock = new Intl.DateTimeFormat('en-US', {
    timeZone: MENU_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
});

const getCentralTimeParts = (date) =>
    Object.fromEntries(
        centralClock.formatToParts(date)
            .filter(
                (part) => part.type !== 'literal'
            )
            .map(
                (part) => [
                    part.type,
                    Number(part.value)
                ]
            )
    );

const centralWallTimeToDate = (wallTimeMillis) => {
    let candidateMillis = wallTimeMillis;

    for (let attempt = 0; attempt < 3; attempt += 1) {
        const parts = getCentralTimeParts(
            new Date(candidateMillis)
        );

        const displayedWallTime = Date.UTC(
            parts.year,
            parts.month - 1,
            parts.day,
            parts.hour,
            parts.minute,
            parts.second
        );

        const correction =
            wallTimeMillis - displayedWallTime;

        if (correction === 0) {
            return new Date(candidateMillis);
        }

        candidateMillis += correction;
    }

    throw new Error(
        'Unable to calculate Central-time expiration.'
    );
};

const SUPPORTED_MENU_IDS = new Set([
    'meat',
    'sides'
]);

const getAvailabilityReference = (
    locationId,
    menuId
) => {
    if (!locationId) {
        throw new Error(
            'A location ID is required.'
        );
    }

    if (!SUPPORTED_MENU_IDS.has(menuId)) {
        throw new Error(
            `Unsupported menu ID: ${menuId}`
        );
    }

    return doc(
        db,
        'locations',
        locationId,
        'menuAvailability',
        menuId
    );
};

const expirationToMilliseconds = (
    expiresAt
) => {
    if (expiresAt === null) {
        return Number.POSITIVE_INFINITY;
    }

    if (expiresAt instanceof Date) {
        return expiresAt.getTime();
    }

    if (
        typeof expiresAt?.toMillis
        === 'function'
    ) {
        return expiresAt.toMillis();
    }

    return Number.NaN;
};

const validateSoldOutItems = (
    soldOutItems
) => {
    if (
        !soldOutItems
        || typeof soldOutItems !== 'object'
        || Array.isArray(soldOutItems)
    ) {
        throw new Error(
            'Sold-out items must be an object.'
        );
    }

    const entries = Object.entries(
        soldOutItems
    );

    if (entries.length > 200) {
        throw new Error(
            'No more than 200 items may be marked sold out.'
        );
    }

    entries.forEach(
        ([itemId, expiresAt]) => {
            if (!itemId) {
                throw new Error(
                    'Every sold-out item needs an ID.'
                );
            }

            if (
                expiresAt !== null
                && !Number.isFinite(
                    expirationToMilliseconds(
                        expiresAt
                    )
                )
            ) {
                throw new Error(
                    `Invalid expiration for ${itemId}.`
                );
            }
        }
    );
};

export const subscribeToMenuAvailability = ({
    locationId,
    menuId,
    onChange,
    onError
}) => {
    const availabilityReference =
        getAvailabilityReference(
            locationId,
            menuId
        );

    return onSnapshot(
        availabilityReference,
        (snapshot) => {
            const soldOutItems =
                snapshot.exists()
                    ? snapshot.data()
                        .soldOutItems || {}
                    : {};

            onChange(soldOutItems);
        },
        onError
    );
};

export const saveMenuAvailability = async ({
    locationId,
    menuId,
    soldOutItems,
    updatedBy
}) => {
    validateSoldOutItems(soldOutItems);

    if (!updatedBy) {
        throw new Error(
            'The updating user ID is required.'
        );
    }

    const availabilityReference =
        getAvailabilityReference(
            locationId,
            menuId
        );

    await setDoc(
        availabilityReference,
        {
            soldOutItems,
            updatedAt: serverTimestamp(),
            updatedBy
        }
    );
};

export const isItemSoldOut = (
    soldOutItems,
    itemId,
    now = Date.now()
) => {
    const hasItem =
        Object.prototype.hasOwnProperty.call(
            soldOutItems || {},
            itemId
        );

    if (!hasItem) {
        return false;
    }

    return (
        expirationToMilliseconds(
            soldOutItems[itemId]
        ) > now
    );
};

export const getNextMorningExpiration = (
    now = new Date()
) => {
    if (
        !(now instanceof Date)
        || !Number.isFinite(now.getTime())
    ) {
        throw new Error(
            'A valid current date is required.'
        );
    }

    const parts = getCentralTimeParts(now);

    let wallTimeMillis = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        5
    );

    let expiration =
        centralWallTimeToDate(wallTimeMillis);

    if (expiration.getTime() <= now.getTime()) {
        wallTimeMillis = Date.UTC(
            parts.year,
            parts.month - 1,
            parts.day + 1,
            5
        );

        expiration =
            centralWallTimeToDate(wallTimeMillis);
    }

    return expiration;
};

export const setMenuItemSoldOut = async ({
    locationId,
    menuId,
    itemId,
    legacyItemIds = [],
    soldOut,
    expiresAt = null,
    updatedBy
}) => {
    if (!itemId) {
        throw new Error(
            'A menu item ID is required.'
        );
    }

    if (!updatedBy) {
        throw new Error(
            'The updating user ID is required.'
        );
    }

    if (typeof soldOut !== 'boolean') {
        throw new Error(
            'Sold-out status must be true or false.'
        );
    }

    if (
        !Array.isArray(legacyItemIds)
        || legacyItemIds.some(
            (id) => typeof id !== 'string' || !id
        )
    ) {
        throw new Error(
            'Legacy item IDs must be nonempty strings.'
        );
    }

    const availabilityReference =
        getAvailabilityReference(
            locationId,
            menuId
        );

    await runTransaction(
        db,
        async (transaction) => {
            const snapshot =
                await transaction.get(
                    availabilityReference
                );

            const storedItems =
                snapshot.exists()
                    ? snapshot.data().soldOutItems ?? {}
                    : {};

            validateSoldOutItems(storedItems);

            const nextItems = {
                ...storedItems
            };

            legacyItemIds.forEach((legacyId) => {
                if (legacyId !== itemId) {
                    delete nextItems[legacyId];
                }
            });

            if (soldOut) {
                nextItems[itemId] = expiresAt;
            } else {
                delete nextItems[itemId];
            }

            validateSoldOutItems(nextItems);

            transaction.set(
                availabilityReference,
                {
                    soldOutItems: nextItems,
                    updatedAt: serverTimestamp(),
                    updatedBy
                }
            );
        }
    );
};

export const getCustomMenuExpiration = (
    value,
    now = new Date()
) => {
    const match = String(value || '').match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
    );

    if (!match) {
        throw new Error(
            'Choose a custom date and time.'
        );
    }

    if (
        !(now instanceof Date)
        || !Number.isFinite(now.getTime())
    ) {
        throw new Error(
            'A valid current date is required.'
        );
    }

    const [year, month, day, hour, minute] =
        match.slice(1).map(Number);

    const wallTimeMillis = Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute
    );

    const calendarCheck = new Date(wallTimeMillis);

    if (
        calendarCheck.getUTCFullYear() !== year
        || calendarCheck.getUTCMonth() !== month - 1
        || calendarCheck.getUTCDate() !== day
        || calendarCheck.getUTCHours() !== hour
        || calendarCheck.getUTCMinutes() !== minute
    ) {
        throw new Error(
            'Choose a valid date and time.'
        );
    }

    let expiration;

    try {
        expiration =
            centralWallTimeToDate(wallTimeMillis);
    } catch {
        throw new Error(
            'That Central time is skipped by daylight saving. '
            + 'Choose another time.'
        );
    }

    const clockLabel = centralClock.format(expiration);

    const repeatedTime = [-1, 1].some(
        (direction) =>
            centralClock.format(
                new Date(
                    expiration.getTime()
                    + direction * 60 * 60 * 1000
                )
            ) === clockLabel
    );

    if (repeatedTime) {
        throw new Error(
            'That Central time occurs twice during '
            + 'the daylight-saving change. Choose another time.'
        );
    }

    if (expiration.getTime() <= now.getTime()) {
        throw new Error(
            'Expiration must be in the future.'
        );
    }

    return expiration;
};

export const getMenuExpirationInputValue = (expiresAt) => {
    const milliseconds =
        expirationToMilliseconds(expiresAt);

    if (!Number.isFinite(milliseconds)) {
        return '';
    }

    const parts = getCentralTimeParts(
        new Date(milliseconds)
    );

    const pad = (value) =>
        String(value).padStart(2, '0');

    return (
        `${String(parts.year).padStart(4, '0')}`
        + `-${pad(parts.month)}-${pad(parts.day)}`
        + `T${pad(parts.hour)}:${pad(parts.minute)}`
    );
};

export const getMenuOptionAvailabilityId = (
    itemId,
    optionId
) => `option:${itemId}:${optionId}`;

export const isMenuItemSoldOut = (
    soldOutItems,
    item,
    currentTime
) => {
    if (
        !item?.id
        || !Number.isFinite(currentTime)
    ) {
        return false;
    }

    if (
        isItemSoldOut(
            soldOutItems,
            item.id,
            currentTime
        )
    ) {
        return true;
    }

    const options = Array.isArray(item.availabilityOptions)
        ? item.availabilityOptions.filter(
            (option) =>
                option.id
                && String(option.name || '').trim()
        )
        : [];

    return (
        options.length > 0
        && options.every((option) =>
            isItemSoldOut(
                soldOutItems,
                getMenuOptionAvailabilityId(
                    item.id,
                    option.id
                ),
                currentTime
            )
        )
    );
};

export const getMenuItemAvailabilityId = (item) => {
    const key = item?.sharedProductKey;

    return typeof key === 'string' && key.trim()
        ? `product:${key}`
        : item?.id;
};

export const getMenuItemLegacyIds = (
    menu,
    availabilityId
) =>
    Array.from(new Set(
        (menu?.sections || [])
            .flatMap((section) => section.items || [])
            .filter((item) =>
                item.id
                && item.id !== availabilityId
                && getMenuItemAvailabilityId(item)
                === availabilityId
            )
            .map((item) => item.id)
    ));

export const createMenuAvailabilityDisplayModel = (
    menu,
    soldOutItems = {}
) => {
    const result = { ...soldOutItems };
    const groups = new Map();

    for (const section of menu?.sections || []) {
        for (const item of section.items || []) {
            const availabilityId =
                getMenuItemAvailabilityId(item);

            if (
                !item.id
                || availabilityId === item.id
            ) {
                continue;
            }

            const ids =
                groups.get(availabilityId) || new Set();

            ids.add(item.id);
            groups.set(availabilityId, ids);
        }
    }

    for (const [availabilityId, ids] of groups) {
        let expiration;

        let found =
            Object.prototype.hasOwnProperty.call(
                soldOutItems,
                availabilityId
            );

        if (found) {
            // A shared status takes precedence,
            // including after its expiration.
            expiration = soldOutItems[availabilityId];
        } else {
            let latest = Number.NEGATIVE_INFINITY;

            for (const id of ids) {
                if (
                    !Object.prototype.hasOwnProperty.call(
                        soldOutItems,
                        id
                    )
                ) {
                    continue;
                }

                const milliseconds =
                    expirationToMilliseconds(
                        soldOutItems[id]
                    );

                if (milliseconds > latest) {
                    expiration = soldOutItems[id];
                    latest = milliseconds;
                    found = true;
                }
            }
        }

        if (found) {
            result[availabilityId] = expiration;

            for (const id of ids) {
                result[id] = expiration;
            }
        }
    }

    return result;
};