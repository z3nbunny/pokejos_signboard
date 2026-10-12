import {
    useEffect,
    useMemo,
    useState
} from 'react';

import {
    doc,
    onSnapshot
} from 'firebase/firestore';

import { db } from '../firebase';
import { useAuth } from '../contexts/useAuth';

import {
    MENU_TIME_ZONE,
    getCustomMenuExpiration,
    getMenuExpirationInputValue,
    getNextMorningExpiration,
    isItemSoldOut,
    setMenuItemSoldOut,
    subscribeToMenuAvailability,
    createMenuAvailabilityDisplayModel,
    getMenuItemAvailabilityId,
    getMenuItemLegacyIds
} from '../services/menuAvailability';

import SidesMenuPreview from './SidesMenuPreview';
import MeatMenuPreview from './MeatMenuPreview';
import MenuAvailabilityPreview from './MenuAvailabilityPreview';

const LOCATION_LABELS = {
    brodie: 'Brodie',
    parmer: 'Parmer',
    round_rock: 'Round Rock'
};

const MENU_OPTIONS = [
    {
        id: 'meat',
        label: 'Meat Menu'
    },
    {
        id: 'sides',
        label: 'Sides Menu'
    }
];

const expirationToDate = (expiresAt) => {
    if (expiresAt instanceof Date) {
        return expiresAt;
    }

    if (
        typeof expiresAt?.toDate
        === 'function'
    ) {
        return expiresAt.toDate();
    }

    return null;
};

const describeExpiration = (expiresAt) => {
    if (expiresAt === null) {
        return 'No automatic expiration';
    }

    const expirationDate =
        expirationToDate(expiresAt);

    if (!expirationDate) {
        return 'Expiration unavailable';
    }

    return `Until ${expirationDate.toLocaleString(
        'en-US',
        {
            timeZone: MENU_TIME_ZONE,
            timeZoneName: 'short',
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit'
        }
    )}`;
};

const getAvailabilityRows = (item, menu) => {
    const options = Array.isArray(item.availabilityOptions)
        ? item.availabilityOptions.filter(
            (option) =>
                option.id
                && String(option.name || '').trim()
        )
        : [];

    if (options.length > 0) {
        return options.map((option) => ({
            ...item,
            id: `option:${item.id}:${option.id}`,
            name: `${item.name} — ${option.name}`,
            nameEs: '',
            sharedProductKey: '',
            linkedSectionTitles: [],
            parentItemId: item.id,
            optionId: option.id
        }));
    }

    const availabilityId =
        getMenuItemAvailabilityId(item);

    const linkedSectionTitles = Array.from(new Set(
        (menu?.sections || [])
            .filter((section) =>
                section.enabled !== false
                && (section.items || []).some(
                    (candidate) =>
                        candidate.enabled !== false
                        && getMenuItemAvailabilityId(candidate)
                        === availabilityId
                )
            )
            .map((section) => section.title)
            .filter(Boolean)
    ));

    return [{
        ...item,
        id: availabilityId,
        linkedSectionTitles
    }];
};

function SoldOutItemCard({
    item,
    soldOut,
    expiresAt,
    isSaving,
    disabled,
    onSave
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [expirationMode, setExpirationMode] =
        useState('next_morning');
    const [customExpiration, setCustomExpiration] =
        useState('');
    const [editorError, setEditorError] = useState('');

    const openEditor = () => {
        setEditorError('');

        if (soldOut) {
            setExpirationMode(
                expiresAt === null ? 'manual' : 'custom'
            );

            setCustomExpiration(
                getMenuExpirationInputValue(expiresAt)
            );
        } else {
            setExpirationMode('next_morning');
            setCustomExpiration('');
        }

        setIsEditing(true);
    };

    const resolveExpiration = () => {
        const now = new Date();

        switch (expirationMode) {
            case 'next_morning':
                return getNextMorningExpiration(now);

            case 'one_hour':
                return new Date(
                    now.getTime() + 60 * 60 * 1000
                );

            case 'custom':
                return getCustomMenuExpiration(
                    customExpiration,
                    now
                );

            case 'manual':
                return null;

            default:
                throw new Error(
                    'Choose a valid expiration option.'
                );
        }
    };

    const applyExpiration = async (event) => {
        event.preventDefault();
        setEditorError('');

        try {
            const expiration = resolveExpiration();
            const result = await onSave(true, expiration);

            if (result.success) {
                setIsEditing(false);
            } else {
                setEditorError(result.error);
            }
        } catch (error) {
            setEditorError(
                error.message || 'Unable to save expiration.'
            );
        }
    };

    const markAvailable = async () => {
        setEditorError('');

        try {
            const result = await onSave(false, null);

            if (result.success) {
                setIsEditing(false);
            } else {
                setEditorError(result.error);
            }
        } catch (error) {
            setEditorError(
                error.message || 'Unable to restore this item.'
            );
        }
    };

    return (
        <article
            className={`min-w-0 space-y-3 rounded-2xl border p-4 ${soldOut
                ? 'border-red-300 bg-red-50'
                : 'border-border bg-surface'
                }`}
        >
            <div>
                <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-text-primary">
                        {item.name}
                    </h4>

                    {soldOut && (
                        <span className="rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                            Sold Out
                        </span>
                    )}
                </div>

                {item.linkedSectionTitles?.length > 1 && (
                    <p className="mt-1 text-xs text-text-secondary">
                        Controls all linked entries in:{' '}
                        {item.linkedSectionTitles.join(', ')}.
                    </p>
                )}

                {soldOut && (
                    <p className="mt-1 text-xs font-medium text-red-700">
                        {describeExpiration(expiresAt)}
                    </p>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {soldOut && (
                    <button
                        type="button"
                        onClick={markAvailable}
                        disabled={disabled}
                        className="rounded-full bg-green-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-green-800 disabled:opacity-50"
                    >
                        {isSaving ? 'Saving…' : 'Mark Available'}
                    </button>
                )}

                {!isEditing && (
                    <button
                        type="button"
                        onClick={openEditor}
                        disabled={disabled}
                        className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50 ${soldOut
                            ? 'border border-border bg-surface text-text-primary hover:bg-border'
                            : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                    >
                        {soldOut
                            ? 'Update Expiration'
                            : 'Mark Sold Out'}
                    </button>
                )}
            </div>

            {isEditing && (
                <form onSubmit={applyExpiration}>
                    <fieldset
                        disabled={disabled}
                        className="space-y-3 rounded-xl border border-border bg-surface p-4"
                    >
                        <legend className="px-1 text-sm font-bold text-text-primary">
                            {soldOut
                                ? 'Update this item’s expiration'
                                : 'Choose this item’s expiration'}
                        </legend>

                        <label className="block space-y-1.5 text-sm text-text-primary">
                            <span className="font-bold">
                                Sold out until
                            </span>

                            <select
                                value={expirationMode}
                                onChange={(event) =>
                                    setExpirationMode(
                                        event.target.value
                                    )
                                }
                                className="w-full rounded-xl border border-border bg-bg px-3 py-2.5"
                            >
                                <option value="next_morning">
                                    Next morning — 5:00 AM Central
                                </option>
                                <option value="one_hour">
                                    In 1 hour
                                </option>
                                <option value="custom">
                                    Custom date and time
                                </option>
                                <option value="manual">
                                    Until manually restored
                                </option>
                            </select>
                        </label>

                        {expirationMode === 'custom' && (
                            <label className="block space-y-1.5 text-sm text-text-primary">
                                <span className="font-bold">
                                    Available again at — Central time
                                </span>

                                <input
                                    type="datetime-local"
                                    step={60}
                                    required
                                    value={customExpiration}
                                    onChange={(event) =>
                                        setCustomExpiration(
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-xl border border-border bg-bg px-3 py-2.5"
                                />
                            </label>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="submit"
                                className="rounded-full bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-accent-hover disabled:opacity-50"
                            >
                                {isSaving ? 'Saving…' : 'Apply'}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditorError('');
                                }}
                                className="rounded-full border border-border px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-primary hover:bg-border"
                            >
                                Cancel
                            </button>
                        </div>
                    </fieldset>
                </form>
            )}

            {editorError && (
                <p role="alert" className="text-sm text-red-700">
                    {editorError}
                </p>
            )}
        </article>
    );
}

export default function SoldOutManager({
    locationId
}) {
    const [activeMenuId, setActiveMenuId] =
        useState('meat');

    if (!locationId) {
        return (
            <p className="text-sm text-text-secondary">
                Select a location to manage availability.
            </p>
        );
    }

    return (
        <SoldOutMenuPanel
            key={`${locationId}:${activeMenuId}`}
            locationId={locationId}
            activeMenuId={activeMenuId}
            onMenuChange={setActiveMenuId}
        />
    );
}

function SoldOutMenuPanel({
    locationId,
    activeMenuId,
    onMenuChange
}) {
    const { currentUser } = useAuth();

    const [publishedMenu, setPublishedMenu] =
        useState(null);

    const [soldOutItems, setSoldOutItems] =
        useState({});

    const [loadingMenu, setLoadingMenu] =
        useState(true);

    const [
        loadingAvailability,
        setLoadingAvailability
    ] = useState(true);

    const [savingItemId, setSavingItemId] =
        useState(null);

    const [message, setMessage] =
        useState('');

    const [error, setError] =
        useState('');

    const [currentTime, setCurrentTime] =
        useState(() => Date.now());

    const locationLabel =
        LOCATION_LABELS[locationId]
        || locationId?.replaceAll('_', ' ')
        || 'Unknown Location';

    useEffect(() => {
        const timerId = window.setInterval(
            () => {
                setCurrentTime(Date.now());
            },
            60000
        );

        return () => {
            window.clearInterval(timerId);
        };
    }, []);

    useEffect(() => {
        const menuReference = doc(
            db,
            'globalMenus',
            activeMenuId
        );

        return onSnapshot(
            menuReference,
            (snapshot) => {
                setPublishedMenu(
                    snapshot.exists()
                        ? snapshot.data()
                        : null
                );

                setLoadingMenu(false);
            },
            (snapshotError) => {
                console.error(
                    'Unable to load the published menu:',
                    snapshotError
                );

                setError(
                    'Unable to load the published menu.'
                );

                setLoadingMenu(false);
            }
        );
    }, [activeMenuId]);

    useEffect(() => {
        return subscribeToMenuAvailability({
            locationId,
            menuId: activeMenuId,
            onChange: (nextSoldOutItems) => {
                setSoldOutItems(
                    nextSoldOutItems
                );

                setCurrentTime(Date.now());
                setLoadingAvailability(false);
            },
            onError: (snapshotError) => {
                console.error(
                    'Unable to load item availability:',
                    snapshotError
                );

                setError(
                    'Unable to load item availability.'
                );

                setLoadingAvailability(false);
            }
        });
    }, [
        activeMenuId,
        locationId
    ]);

    const displaySoldOutItems = useMemo(
        () => createMenuAvailabilityDisplayModel(
            publishedMenu,
            soldOutItems
        ),
        [publishedMenu, soldOutItems]
    );

    const visibleSections = useMemo(() => {
        const seenIds = new Set();

        return (publishedMenu?.sections || [])
            .filter(
                (section) => section.enabled !== false
            )
            .sort(
                (first, second) =>
                    Number(first.order || 0)
                    - Number(second.order || 0)
            )
            .map((section) => ({
                ...section,
                items: (section.items || [])
                    .filter(
                        (item) => item.enabled !== false
                    )
                    .sort(
                        (first, second) =>
                            Number(first.order || 0)
                            - Number(second.order || 0)
                    )
                    .flatMap((item) =>
                        getAvailabilityRows(
                            item,
                            publishedMenu
                        )
                    )
                    .filter((item) => {
                        if (seenIds.has(item.id)) {
                            return false;
                        }

                        seenIds.add(item.id);
                        return true;
                    })
            }))
            .filter(
                (section) => section.items.length > 0
            );
    }, [publishedMenu]);

    const activeSoldOutCount = useMemo(
        () => {
            const visibleIds = new Set(
                visibleSections.flatMap(
                    (section) =>
                        section.items.map(
                            (item) => item.id
                        )
                )
            );

            return Array.from(visibleIds)
                .filter(
                    (itemId) =>
                        isItemSoldOut(
                            soldOutItems,
                            itemId,
                            currentTime
                        )
                )
                .length;
        },
        [
            currentTime,
            soldOutItems,
            visibleSections
        ]
    );

    const handleAvailabilityChange = async (
        item,
        nextSoldOut,
        expiresAt = null
    ) => {
        setSavingItemId(item.id);
        setMessage('');
        setError('');

        try {
            await setMenuItemSoldOut({
                locationId,
                menuId: activeMenuId,
                itemId: item.id,
                legacyItemIds: getMenuItemLegacyIds(
                    publishedMenu,
                    item.id
                ),
                soldOut: nextSoldOut,
                expiresAt,
                updatedBy: currentUser?.uid
            });

            setMessage(
                nextSoldOut
                    ? `${item.name} is sold out. `
                    + `${describeExpiration(expiresAt)}.`
                    : `${item.name} is available again.`
            );

            return { success: true };
        } catch (availabilityError) {
            console.error(
                'Unable to update item availability:',
                availabilityError
            );

            const errorMessage =
                availabilityError.message
                || 'Unable to update item availability.';

            setError(errorMessage);

            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setSavingItemId(null);
        }
    };

    const isLoading =
        loadingMenu
        || loadingAvailability;

    return (
        <div className="space-y-6">
            <section className="rounded-3xl border border-border bg-bg p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                            {locationLabel} Location
                        </p>

                        <h2 className="mt-1 text-2xl font-bold text-text-primary">
                            Item Availability
                        </h2>

                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
                            Mark unavailable items as sold
                            out or restore them when a new
                            batch becomes available.
                        </p>
                    </div>

                    <div className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-bold text-text-primary">
                        {activeSoldOutCount}
                        {' '}
                        currently sold out
                    </div>
                </div>
            </section>

            {publishedMenu && !isLoading && (
                <MenuAvailabilityPreview
                    menu={publishedMenu}
                    menuId={activeMenuId}
                    locationId={locationId}
                    menuLabel={
                        activeMenuId === 'meat'
                            ? 'Meat Menu'
                            : 'Sides Menu'
                    }
                    locationLabel={locationLabel}
                    soldOutItems={displaySoldOutItems}
                    currentTime={currentTime}
                    PreviewComponent={
                        activeMenuId === 'meat'
                            ? MeatMenuPreview
                            : SidesMenuPreview
                    }
                />
            )}

            <section className="rounded-3xl border border-border bg-bg p-6 shadow-sm">
                <div
                    role="tablist"
                    aria-label="Availability menu"
                    className="grid grid-cols-2 gap-3"
                >
                    {MENU_OPTIONS.map(
                        (menuOption) => {
                            const isActive =
                                activeMenuId
                                === menuOption.id;

                            return (
                                <button
                                    key={menuOption.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={
                                        isActive
                                    }
                                    onClick={() => {
                                        onMenuChange(menuOption.id);
                                    }}
                                    className={`rounded-2xl border px-5 py-3 text-sm font-bold transition-colors ${isActive
                                        ? 'border-accent bg-accent-light text-text-primary'
                                        : 'border-border bg-surface text-text-secondary hover:bg-border/40'
                                        }`}
                                >
                                    {menuOption.label}
                                </button>
                            );
                        }
                    )}
                </div>

                {message && (
                    <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                        {error}
                    </div>
                )}

                {isLoading && (
                    <p className="mt-6 text-sm text-text-secondary">
                        Loading menu availability…
                    </p>
                )}

                {!isLoading && !publishedMenu && (
                    <p className="mt-6 text-sm text-text-secondary">
                        This menu has not been published yet.
                    </p>
                )}

                {!isLoading
                    && publishedMenu
                    && visibleSections.length === 0 && (
                        <p className="mt-6 text-sm text-text-secondary">
                            No available menu items were found.
                        </p>
                    )}

                {!isLoading
                    && visibleSections.length > 0 && (
                        <div className="mt-6 space-y-6">
                            {visibleSections.map(
                                (section) => (
                                    <section
                                        key={section.id}
                                        className="space-y-3"
                                    >
                                        <h3 className="border-b border-border pb-2 text-sm font-bold uppercase tracking-wider text-text-primary">
                                            {section.title}
                                        </h3>

                                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                                            {section.items.map((item) => (
                                                <SoldOutItemCard
                                                    key={item.id}
                                                    item={item}
                                                    soldOut={isItemSoldOut(
                                                        displaySoldOutItems,
                                                        item.id,
                                                        currentTime
                                                    )}
                                                    expiresAt={
                                                        displaySoldOutItems[item.id]
                                                    }
                                                    isSaving={
                                                        savingItemId === item.id
                                                    }
                                                    disabled={
                                                        savingItemId !== null
                                                        || !currentUser
                                                    }
                                                    onSave={(
                                                        nextSoldOut,
                                                        expiresAt
                                                    ) =>
                                                        handleAvailabilityChange(
                                                            item,
                                                            nextSoldOut,
                                                            expiresAt
                                                        )
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )
                            )}
                        </div>
                    )}
            </section>
        </div>
    );
}