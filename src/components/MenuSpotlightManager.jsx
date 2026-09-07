import {
    useEffect,
    useRef,
    useState
} from 'react';
import {
    Timestamp,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc
} from 'firebase/firestore';

import { db } from '../firebase';
import { useAuth } from '../contexts/useAuth';
import ImageFramingEditor from './ImageFramingEditor';

const LOCATIONS = [
    { id: 'brodie', label: 'Brodie' },
    { id: 'parmer', label: 'Parmer' },
    { id: 'round_rock', label: 'Round Rock' }
];

const SPOTLIGHT_LAYOUT_MODES = new Set([
    'text',
    'image',
    'image_text'
]);

const DEFAULT_IMAGE_FRAMING = {
    zoom: 1,
    x: 50,
    y: 50
};

const normalizeSpotlightLayoutMode = (value) =>
    SPOTLIGHT_LAYOUT_MODES.has(value)
        ? value
        : 'text';

const normalizeFramingNumber = (
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

const normalizeSpotlightImageFraming = (
    framing
) => ({
    zoom: normalizeFramingNumber(
        framing?.zoom,
        1,
        1,
        3
    ),
    x: normalizeFramingNumber(
        framing?.x,
        50,
        0,
        100
    ),
    y: normalizeFramingNumber(
        framing?.y,
        50,
        0,
        100
    )
});

const createLaborDaySpotlight = (id) => ({
    id,
    layoutMode: 'text',
    imageUrl: '',
    imageAlt: '',
    imageFraming: {
        ...DEFAULT_IMAGE_FRAMING
    },
    label: 'Labor Day Weekend',
    labelEs: 'Especial del Día del Trabajo',
    title: 'Full Rack of Ribs',
    titleEs: 'Costillar Completo',
    description:
        'Slow-smoked pork ribs, available Labor Day weekend.',
    descriptionEs:
        'Costillas de cerdo ahumadas, disponibles durante el fin de semana festivo.',
    priceCents: 2000,
    linkedItemId: 'pork_ribs',
    enabled: true,
    targetLocationIds: [],
    startsAtInput: '2026-09-04T00:00',
    endsAtInput: '2026-09-08T00:00'
});

const timestampToInput = (value) => {
    const date = value?.toDate?.();

    if (!date) {
        return '';
    }

    const offsetMilliseconds =
        date.getTimezoneOffset() * 60000;

    return new Date(
        date.getTime() - offsetMilliseconds
    ).toISOString().slice(0, 16);
};

const inputToTimestamp = (value) => {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return Timestamp.fromDate(date);
};

const snapshotToSpotlight = (snapshot) => {
    const data = snapshot.data();

    return {
        id: snapshot.id,
        layoutMode:
            normalizeSpotlightLayoutMode(
                data.layoutMode
            ),
        imageUrl: data.imageUrl || '',
        imageAlt: data.imageAlt || '',
        imageFraming:
            normalizeSpotlightImageFraming(
                data.imageFraming
            ),
        label: data.label || '',
        labelEs: data.labelEs || '',
        title: data.title || '',
        titleEs: data.titleEs || '',
        description: data.description || '',
        descriptionEs: data.descriptionEs || '',
        priceCents: Number(data.priceCents || 0),
        linkedItemId: data.linkedItemId || '',
        enabled: data.enabled !== false,
        targetLocationIds: Array.isArray(
            data.targetLocationIds
        )
            ? data.targetLocationIds
            : [],
        startsAtInput: timestampToInput(
            data.startsAt
        ),
        endsAtInput: timestampToInput(
            data.endsAt
        )
    };
};

function SpotlightPriceInput({
    priceCents,
    onChange,
    disabled
}) {
    const formatPrice = (cents) =>
        (Number(cents || 0) / 100).toFixed(2);

    const [displayValue, setDisplayValue] =
        useState(formatPrice(priceCents));

    const [isEditing, setIsEditing] =
        useState(false);

    const finishEditing = () => {
        setIsEditing(false);

        const numericValue = Number(displayValue);

        if (
            displayValue.trim() === ''
            || !Number.isFinite(numericValue)
            || numericValue < 0
        ) {
            setDisplayValue(
                formatPrice(priceCents)
            );
            return;
        }

        const normalizedCents =
            Math.round(numericValue * 100);

        onChange(normalizedCents);
        setDisplayValue(
            formatPrice(normalizedCents)
        );
    };

    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-bold">
                $
            </span>

            <input
                type="text"
                inputMode="decimal"
                value={
                    isEditing
                        ? displayValue
                        : formatPrice(priceCents)
                }
                onFocus={() => {
                    setDisplayValue(
                        formatPrice(priceCents)
                    );
                    setIsEditing(true);
                }}
                onChange={(event) => {
                    const nextValue =
                        event.target.value;

                    if (
                        /^\d*(\.\d{0,2})?$/.test(
                            nextValue
                        )
                    ) {
                        setDisplayValue(nextValue);
                    }
                }}
                onBlur={finishEditing}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.currentTarget.blur();
                    }
                }}
                disabled={disabled}
                className="w-full bg-surface border border-border rounded-xl py-3 pl-7 pr-3 font-bold focus:ring-2 focus:ring-accent focus:outline-none disabled:opacity-50"
            />
        </div>
    );
}

export default function MenuSpotlightManager({
    menu,
    onPreviewChange
}) {
    const { currentUser, userData } = useAuth();

    const [spotlights, setSpotlights] =
        useState([]);
    const [selectedId, setSelectedId] =
        useState('');
    const selectedIdRef = useRef('');
    const [draft, setDraft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (userData?.role !== 'super_admin') {
            return undefined;
        }

        const spotlightCollection = collection(
            db,
            'globalMenuSpotlights',
            'meat',
            'items'
        );

        const unsubscribe = onSnapshot(
            spotlightCollection,
            (snapshot) => {
                const loadedSpotlights =
                    snapshot.docs
                        .map(snapshotToSpotlight)
                        .sort((first, second) =>
                            first.title.localeCompare(
                                second.title
                            )
                        );

                setSpotlights(loadedSpotlights);
                setLoading(false);

                if (loadedSpotlights.length === 0) {
                    return;
                }

                const selectedSpotlight =
                    loadedSpotlights.find(
                        (spotlight) =>
                            spotlight.id
                            === selectedIdRef.current
                    )
                    || loadedSpotlights.find(
                        (spotlight) =>
                            spotlight.enabled
                    )
                    || loadedSpotlights[0];

                setSelectedId(
                    selectedSpotlight.id
                );
                selectedIdRef.current =
                    selectedSpotlight.id;
                setDraft(selectedSpotlight);
                setDirty(false);
                onPreviewChange(selectedSpotlight);
            },
            (error) => {
                console.error(
                    'Unable to load menu Spotlights:',
                    error
                );
                setMessage(
                    'Unable to load menu Spotlights.'
                );
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [
        onPreviewChange,
        userData?.role
    ]);

    const updateDraft = (field, value) => {
        setDraft((currentDraft) => {
            if (!currentDraft) {
                return currentDraft;
            }

            const nextDraft = {
                ...currentDraft,
                [field]: value
            };

            onPreviewChange(nextDraft);

            return nextDraft;
        });

        setDirty(true);
        setMessage('');
    };

    const handleNewSpotlight = () => {
        const spotlightRef = doc(
            collection(
                db,
                'globalMenuSpotlights',
                'meat',
                'items'
            )
        );

        const nextDraft =
            createLaborDaySpotlight(
                spotlightRef.id
            );

        setSelectedId(nextDraft.id);
        selectedIdRef.current = nextDraft.id;
        setDraft(nextDraft);
        setDirty(true);
        setMessage(
            'New unsaved Spotlight created.'
        );
        onPreviewChange(nextDraft);
    };

    const handleSelect = (spotlightId) => {
        const selectedSpotlight =
            spotlights.find(
                (spotlight) =>
                    spotlight.id === spotlightId
            );

        if (!selectedSpotlight) {
            return;
        }

        setSelectedId(spotlightId);
        selectedIdRef.current = spotlightId;
        setDraft(selectedSpotlight);
        setDirty(false);
        setMessage('');
        onPreviewChange(selectedSpotlight);
    };

    const handleLocationToggle = (
        locationId,
        checked
    ) => {
        const currentTargets =
            draft?.targetLocationIds || [];

        const nextTargets = checked
            ? Array.from(
                new Set([
                    ...currentTargets,
                    locationId
                ])
            )
            : currentTargets.filter(
                (currentId) =>
                    currentId !== locationId
            );

        updateDraft(
            'targetLocationIds',
            nextTargets
        );
    };

    const handleSave = async () => {
        if (
            userData?.role !== 'super_admin'
            || !currentUser
            || !draft
        ) {
            return;
        }

        if (!draft.label.trim()) {
            setMessage(
                'Spotlight label is required.'
            );
            return;
        }

        if (!draft.title.trim()) {
            setMessage(
                'Spotlight headline is required.'
            );
            return;
        }

        const layoutMode =
            normalizeSpotlightLayoutMode(
                draft.layoutMode
            );

        if (
            layoutMode !== 'text'
            && !String(
                draft.imageUrl || ''
            ).trim()
        ) {
            setMessage(
                'Choose an image before saving this layout.'
            );
            return;
        }

        if (
            !Number.isInteger(draft.priceCents)
            || draft.priceCents < 0
        ) {
            setMessage(
                'Spotlight price must be valid.'
            );
            return;
        }

        const startsAt = inputToTimestamp(
            draft.startsAtInput
        );
        const endsAt = inputToTimestamp(
            draft.endsAtInput
        );

        if (
            startsAt
            && endsAt
            && endsAt.toMillis()
            <= startsAt.toMillis()
        ) {
            setMessage(
                'Spotlight end time must be after its start time.'
            );
            return;
        }

        setSaving(true);
        setMessage('');

        try {
            await setDoc(
                doc(
                    db,
                    'globalMenuSpotlights',
                    'meat',
                    'items',
                    draft.id
                ),
                {
                    layoutMode,
                    imageUrl:
                        String(
                            draft.imageUrl || ''
                        ).trim(),
                    imageAlt:
                        String(
                            draft.imageAlt || ''
                        ).trim(),
                    imageFraming:
                        normalizeSpotlightImageFraming(
                            draft.imageFraming
                        ),
                    label: draft.label.trim(),
                    labelEs:
                        draft.labelEs.trim(),
                    title: draft.title.trim(),
                    titleEs:
                        draft.titleEs.trim(),
                    description:
                        draft.description.trim(),
                    descriptionEs:
                        draft.descriptionEs.trim(),
                    priceCents:
                        draft.priceCents,
                    linkedItemId:
                        draft.linkedItemId,
                    enabled:
                        draft.enabled !== false,
                    targetLocationIds:
                        draft.targetLocationIds,
                    startsAt,
                    endsAt,
                    updatedAt: serverTimestamp(),
                    updatedBy: currentUser.uid
                }
            );

            setDirty(false);
            setMessage(
                'Spotlight saved successfully.'
            );
        } catch (error) {
            console.error(
                'Unable to save menu Spotlight:',
                error
            );
            setMessage(
                'The Spotlight could not be saved.'
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (
            !draft
            || !spotlights.some(
                (spotlight) =>
                    spotlight.id === draft.id
            )
        ) {
            return;
        }

        const confirmed = globalThis.confirm(
            `Delete the Spotlight "${draft.title}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            await deleteDoc(
                doc(
                    db,
                    'globalMenuSpotlights',
                    'meat',
                    'items',
                    draft.id
                )
            );

            setSelectedId('');
            selectedIdRef.current = '';
            setDraft(null);
            setDirty(false);
            setMessage('Spotlight deleted.');
            onPreviewChange(null);
        } catch (error) {
            console.error(
                'Unable to delete menu Spotlight:',
                error
            );
            setMessage(
                'The Spotlight could not be deleted.'
            );
        }
    };

    const menuItemMap = new Map();

    (menu?.sections || [])
        .flatMap(
            (section) => section.items || []
        )
        .filter((item) => item.enabled !== false)
        .forEach((item) => {
            if (!menuItemMap.has(item.id)) {
                menuItemMap.set(item.id, item);
            }
        });

    const menuItems = Array.from(
        menuItemMap.values()
    ).sort((first, second) =>
        first.name.localeCompare(second.name)
    );

    return (
        <section className="bg-bg border border-border rounded-3xl p-5 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold">
                        Menu Spotlight Library
                    </h3>

                    <p className="text-sm text-text-secondary mt-1">
                        Create scheduled specials for every restaurant
                        or target selected locations. Spotlight prices
                        are excluded from uniform price adjustments.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleNewSpotlight}
                    className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-full text-xs font-bold uppercase tracking-wider"
                >
                    + New Spotlight
                </button>
            </div>

            {loading ? (
                <p className="text-sm text-text-secondary">
                    Loading Spotlights...
                </p>
            ) : (
                <>
                    {spotlights.length > 0 && (
                        <div>
                            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                                Existing Spotlight
                            </label>

                            <select
                                value={selectedId}
                                onChange={(event) =>
                                    handleSelect(
                                        event.target.value
                                    )
                                }
                                className="w-full bg-surface border border-border rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none"
                            >
                                {spotlights.map(
                                    (spotlight) => (
                                        <option
                                            key={spotlight.id}
                                            value={spotlight.id}
                                        >
                                            {spotlight.title}
                                            {spotlight.enabled
                                                ? ' — Enabled'
                                                : ' — Disabled'}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    )}

                    {!draft ? (
                        <div className="border border-dashed border-border rounded-2xl p-8 text-center">
                            <p className="text-sm text-text-secondary">
                                No Spotlights exist yet. Create the Labor
                                Day special to begin.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-[11px] uppercase tracking-wider text-text-secondary font-bold">
                                        Spotlight Layout
                                    </h4>

                                    <p className="mt-1 text-sm text-text-secondary">
                                        Choose how this Spotlight will appear on the menu.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[
                                        {
                                            value: 'text',
                                            label: 'Text Only',
                                            description:
                                                'Use the branded yellow text card.'
                                        },
                                        {
                                            value: 'image',
                                            label: 'Image Only',
                                            description:
                                                'Display a finished promotional graphic.'
                                        },
                                        {
                                            value: 'image_text',
                                            label: 'Image + Text',
                                            description:
                                                'Place readable menu copy over a photo.'
                                        }
                                    ].map((option) => {
                                        const selected =
                                            draft.layoutMode
                                            === option.value;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() =>
                                                    updateDraft(
                                                        'layoutMode',
                                                        option.value
                                                    )
                                                }
                                                className={
                                                    'rounded-2xl border p-4 text-left transition-colors '
                                                    + (
                                                        selected
                                                            ? 'border-accent bg-accent/10 ring-2 ring-accent'
                                                            : 'border-border bg-surface hover:bg-border'
                                                    )
                                                }
                                            >
                                                <span className="block font-bold">
                                                    {option.label}
                                                </span>

                                                <span className="mt-1 block text-sm text-text-secondary">
                                                    {option.description}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {draft.layoutMode !== 'text' && (
                                <div className="space-y-4">
                                    <ImageFramingEditor
                                        label="Spotlight Image"
                                        imageUrl={
                                            draft.imageUrl
                                            || ''
                                        }
                                        imageAlt={
                                            draft.imageAlt
                                            || draft.title
                                        }
                                        framing={
                                            draft.imageFraming
                                        }
                                        aspectRatio="2 / 1"
                                        disabled={saving}
                                        onImageChange={(
                                            imageUrl
                                        ) =>
                                            updateDraft(
                                                'imageUrl',
                                                imageUrl
                                            )
                                        }
                                        onFramingChange={(
                                            imageFraming
                                        ) =>
                                            updateDraft(
                                                'imageFraming',
                                                imageFraming
                                            )
                                        }
                                    />

                                    <div>
                                        <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                                            Image Description
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                draft.imageAlt
                                                || ''
                                            }
                                            onChange={(event) =>
                                                updateDraft(
                                                    'imageAlt',
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Example: A full rack of smoked pork ribs"
                                            className="w-full bg-surface border border-border rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none"
                                        />

                                        <p className="mt-1 text-[11px] text-text-secondary">
                                            Briefly describe the image for accessibility and administration.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {draft.layoutMode === 'image' && (
                                <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                                    The saved headline, descriptions and price identify this Spotlight in the dashboard, but they will not appear over an Image Only creative.
                                </p>
                            )}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {[
                                    ['label', 'English Label'],
                                    ['labelEs', 'Spanish Label'],
                                    ['title', 'English Headline'],
                                    ['titleEs', 'Spanish Headline']
                                ].map(([field, label]) => (
                                    <div key={field}>
                                        <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                                            {label}
                                        </label>

                                        <input
                                            type="text"
                                            value={draft[field]}
                                            onChange={(event) =>
                                                updateDraft(
                                                    field,
                                                    event.target.value
                                                )
                                            }
                                            className="w-full bg-surface border border-border rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                                        English Description
                                    </label>

                                    <textarea
                                        rows="3"
                                        value={draft.description}
                                        onChange={(event) =>
                                            updateDraft(
                                                'description',
                                                event.target.value
                                            )
                                        }
                                        className="w-full bg-surface border border-border rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                                        Spanish Description
                                    </label>

                                    <textarea
                                        rows="3"
                                        value={draft.descriptionEs}
                                        onChange={(event) =>
                                            updateDraft(
                                                'descriptionEs',
                                                event.target.value
                                            )
                                        }
                                        className="w-full bg-surface border border-border rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                                        Special Price
                                    </label>

                                    <SpotlightPriceInput
                                        priceCents={draft.priceCents}
                                        onChange={(priceCents) =>
                                            updateDraft(
                                                'priceCents',
                                                priceCents
                                            )
                                        }
                                        disabled={saving}
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                                        Starts
                                    </label>

                                    <input
                                        type="datetime-local"
                                        value={draft.startsAtInput}
                                        onChange={(event) =>
                                            updateDraft(
                                                'startsAtInput',
                                                event.target.value
                                            )
                                        }
                                        className="w-full bg-surface border border-border rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                                        Ends
                                    </label>

                                    <input
                                        type="datetime-local"
                                        value={draft.endsAtInput}
                                        onChange={(event) =>
                                            updateDraft(
                                                'endsAtInput',
                                                event.target.value
                                            )
                                        }
                                        className="w-full bg-surface border border-border rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                                    Linked Menu Item
                                </label>

                                <select
                                    value={draft.linkedItemId}
                                    onChange={(event) =>
                                        updateDraft(
                                            'linkedItemId',
                                            event.target.value
                                        )
                                    }
                                    className="w-full bg-surface border border-border rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none"
                                >
                                    <option value="">
                                        No linked item
                                    </option>

                                    {menuItems.map((item) => (
                                        <option
                                            key={item.id}
                                            value={item.id}
                                        >
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-surface border border-border rounded-2xl p-4 space-y-4">
                                <div>
                                    <h4 className="font-bold">
                                        Location Targeting
                                    </h4>

                                    <p className="text-sm text-text-secondary mt-1">
                                        No selected locations means the
                                        Spotlight is available everywhere.
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-5">
                                    {LOCATIONS.map((location) => (
                                        <label
                                            key={location.id}
                                            className="flex items-center gap-2 text-sm font-semibold"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={
                                                    draft.targetLocationIds
                                                        .includes(location.id)
                                                }
                                                onChange={(event) =>
                                                    handleLocationToggle(
                                                        location.id,
                                                        event.target.checked
                                                    )
                                                }
                                                className="w-5 h-5 accent-accent"
                                            />

                                            {location.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <label className="flex items-center gap-3 bg-surface border border-border rounded-2xl p-4">
                                <input
                                    type="checkbox"
                                    checked={draft.enabled}
                                    onChange={(event) =>
                                        updateDraft(
                                            'enabled',
                                            event.target.checked
                                        )
                                    }
                                    className="w-6 h-6 accent-accent"
                                />

                                <span>
                                    <span className="font-bold block">
                                        Spotlight Enabled
                                    </span>

                                    <span className="text-sm text-text-secondary">
                                        Scheduling and location targeting
                                        still determine where it appears.
                                    </span>
                                </span>
                            </label>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={!dirty || saving}
                                    className="px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-full text-xs font-bold uppercase tracking-wider"
                                >
                                    {saving
                                        ? 'Saving...'
                                        : 'Save Spotlight'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={
                                        saving
                                        || !spotlights.some(
                                            (spotlight) =>
                                                spotlight.id
                                                === draft.id
                                        )
                                    }
                                    className="px-5 py-2.5 bg-surface hover:bg-red-50 disabled:opacity-40 border border-border text-danger rounded-full text-xs font-bold uppercase tracking-wider"
                                >
                                    Delete Spotlight
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {message && (
                <p className="text-sm font-bold">
                    {message}
                </p>
            )}
        </section>
    );
}
