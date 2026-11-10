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
import SpotlightCalendar from './SpotlightCalendar';
import SpotlightScheduleEditor from './SpotlightScheduleEditor';
import SpotlightSchedulingToggle from './SpotlightSchedulingToggle';
import useSpotlightSettings from '../hooks/useSpotlightSettings';
import {
    DEFAULT_SPOTLIGHT_SECONDS, SPOTLIGHT_TIME_ZONE,
    formatCentralInput, getSpotlightSeconds, parseCentralInput, validateRecurrence
} from '../utils/menuSpotlightSchedule';

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

const defaultWeeklyRule = () => ({
    type: 'weekly', timeZone: SPOTLIGHT_TIME_ZONE,
    days: [5], startTime: '11:00', endTime: '15:00',
    startDate: '', endDate: ''
});

const createBlankSpotlight = (id) => ({
    id, layoutMode: 'text', imageUrl: '', imageAlt: '',
    imageFraming: { ...DEFAULT_IMAGE_FRAMING },
    label: '', labelEs: '', title: '', titleEs: '',
    description: '', descriptionEs: '', priceCents: null,
    linkedItemId: '', enabled: false, targetLocationIds: [],
    startsAtInput: '', endsAtInput: '', scheduleType: 'always',
    recurrence: defaultWeeklyRule(), displayDurationSeconds: DEFAULT_SPOTLIGHT_SECONDS
});

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
        priceCents:
            data.priceCents === null
                || data.priceCents === undefined
                || data.priceCents === ''
                ? null
                : Number(data.priceCents),
        linkedItemId: data.linkedItemId || '',
        enabled: data.enabled !== false,
        targetLocationIds: Array.isArray(
            data.targetLocationIds
        )
            ? data.targetLocationIds
            : [],
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
        startsAtInput: formatCentralInput(data.startsAt),
        endsAtInput: formatCentralInput(data.endsAt),
        scheduleType: data.recurrence?.allDay === true
            ? 'daily'
            : data.recurrence
                ? 'weekly'
                : data.startsAt || data.endsAt
                    ? 'window'
                    : 'always',
        recurrence: {
            ...defaultWeeklyRule(), ...data.recurrence,
            days: Array.isArray(data.recurrence?.days)
                ? data.recurrence.days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
                : defaultWeeklyRule().days
        },
        displayDurationSeconds: getSpotlightSeconds(data.displayDurationSeconds)
    };
};

function SpotlightPriceInput({
    priceCents,
    onChange,
    disabled
}) {
    const formatPrice = (cents) =>
        cents === null || cents === undefined || cents === ''
            ? ''
            : (Number(cents) / 100).toFixed(2);

    const [displayValue, setDisplayValue] =
        useState(formatPrice(priceCents));

    const [isEditing, setIsEditing] =
        useState(false);

    const finishEditing = () => {
        setIsEditing(false);
        if (displayValue.trim() === '') {
            onChange(null);
            setDisplayValue('');
            return;
        }

        const numericValue = Number(displayValue);

        if (
            !Number.isFinite(numericValue)
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
    const { calendarEnabled, ready: settingsReady, error: settingsError } = useSpotlightSettings('meat');

    const [spotlights, setSpotlights] =
        useState([]);
    const [selectedId, setSelectedId] =
        useState('');
    const selectedIdRef = useRef('');
    const [drafts, setDrafts] = useState({});
    const draftsRef = useRef({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const draft = drafts[selectedId] || spotlights.find((ad) => ad.id === selectedId) || null;
    const dirty = Boolean(drafts[selectedId]);
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

                // Preserve unsaved edits during listener updates and card switching.
                if (draftsRef.current[selectedIdRef.current]) return;
                const selected = loadedSpotlights.find((ad) => ad.id === selectedIdRef.current)
                    || Object.values(draftsRef.current)[0] || loadedSpotlights[0];
                if (selected) {
                    setSelectedId(selected.id);
                    selectedIdRef.current = selected.id;
                    onPreviewChange(selected);
                } else {
                    const blank = createBlankSpotlight(doc(spotlightCollection).id);
                    draftsRef.current = { [blank.id]: blank };
                    setDrafts(draftsRef.current);
                    setSelectedId(blank.id);
                    selectedIdRef.current = blank.id;
                    onPreviewChange(blank);
                }
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
        if (!draft || saving) return;
        const next = { ...draft, [field]: value };
        draftsRef.current = { ...draftsRef.current, [draft.id]: next };
        setDrafts(draftsRef.current);
        onPreviewChange(next);
        setMessage('');
    };

    const handleNewSpotlight = () => {
        const next = createBlankSpotlight(doc(collection(
            db, 'globalMenuSpotlights', 'meat', 'items'
        )).id);
        draftsRef.current = { ...draftsRef.current, [next.id]: next };
        setDrafts(draftsRef.current);
        setSelectedId(next.id);
        selectedIdRef.current = next.id;
        setMessage('Blank ad added. Enable and save it when ready.');
        onPreviewChange(next);
    };

    const handleSelect = (id) => {
        const selected = draftsRef.current[id] || spotlights.find((ad) => ad.id === id);
        if (!selected || saving) return;
        setSelectedId(id);
        selectedIdRef.current = id;
        setMessage('');
        onPreviewChange(selected);
    };

    const useCalendarDate = (date) => {
        if (!draft || saving) return;
        const next = {
            ...draft, scheduleType: 'window',
            startsAtInput: `${date}T11:00`, endsAtInput: `${date}T15:00`
        };
        draftsRef.current = { ...draftsRef.current, [draft.id]: next };
        setDrafts(draftsRef.current);
        onPreviewChange(next);
        setMessage('Date filled in the editor. Save this ad to apply it.');
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
            || !settingsReady
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
            draft.priceCents !== null
            && (
                !Number.isInteger(draft.priceCents)
                || draft.priceCents < 0
            )
        ) {
            setMessage(
                'Spotlight price must be valid.'
            );
            return;
        }

        const seconds = Number(draft.displayDurationSeconds);
        if (!Number.isInteger(seconds) || seconds < 5 || seconds > 300) {
            setMessage('Display duration must be a whole number from 5 to 300 seconds.');
            return;
        }
        let startsAt = null;
        let endsAt = null;
        let recurrence = null;
        let scheduleType = draft.scheduleType;
        let startsAtInput = draft.startsAtInput;
        let endsAtInput = draft.endsAtInput;
        try {
            if (!calendarEnabled && draft.scheduleType !== 'daily') {
                // Hidden controls must never block a content save or erase a saved schedule.
                const savedSchedule = spotlights.find(
                    (ad) =>
                        ad.id === draft.id
                        && ad.scheduleType !== 'daily'
                );
                scheduleType = savedSchedule?.scheduleType || 'always';
                startsAt = savedSchedule?.startsAt ?? null;
                endsAt = savedSchedule?.endsAt ?? null;
                recurrence = ['weekly', 'daily'].includes(scheduleType)
                    ? savedSchedule.recurrence
                    : null;
                startsAtInput = savedSchedule?.startsAtInput || '';
                endsAtInput = savedSchedule?.endsAtInput || '';
            } else if (draft.scheduleType === 'window') {
                if (!draft.startsAtInput && !draft.endsAtInput) {
                    throw new Error('Choose at least one date/time limit, or use Whenever enabled.');
                }
                const start = parseCentralInput(draft.startsAtInput);
                const end = parseCentralInput(draft.endsAtInput);
                if (start !== null && end !== null && end <= start) {
                    throw new Error('Spotlight end time must be after its start time.');
                }
                startsAt = start === null ? null : Timestamp.fromDate(new Date(start));
                endsAt = end === null ? null : Timestamp.fromDate(new Date(end));
            } else if (['weekly', 'daily'].includes(draft.scheduleType)) {
                const isDailySpecial = draft.scheduleType === 'daily';

                recurrence = {
                    ...draft.recurrence,
                    type: 'weekly',
                    timeZone: SPOTLIGHT_TIME_ZONE,
                    allDay: isDailySpecial,
                    ...(isDailySpecial
                        ? {
                            days: [draft.recurrence.days[0]],
                            startDate: '',
                            endDate: ''
                        }
                        : {})
                };

                const error = validateRecurrence(recurrence);
                if (error) throw new Error(error);
            } else if (draft.scheduleType !== 'always') {
                throw new Error('Choose a schedule type.');
            }
        } catch (error) {
            setMessage(error.message);
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
                    recurrence,
                    displayDurationSeconds: seconds,
                    updatedAt: serverTimestamp(),
                    updatedBy: currentUser.uid
                }
            );

            const saved = {
                ...draft, startsAt, endsAt, scheduleType, startsAtInput, endsAtInput,
                recurrence: recurrence || defaultWeeklyRule(), displayDurationSeconds: seconds
            };
            setSpotlights((ads) => [...ads.filter((ad) => ad.id !== saved.id), saved]);
            const nextDrafts = { ...draftsRef.current };
            delete nextDrafts[draft.id];
            draftsRef.current = nextDrafts;
            setDrafts(nextDrafts);
            setMessage('Spotlight saved successfully.');
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
        if (!draft || saving) return;
        const saved = spotlights.some((ad) => ad.id === draft.id);
        if (saved && !globalThis.confirm(`Delete the Spotlight "${draft.title}"?`)) return;
        setSaving(true);
        try {
            if (saved) await deleteDoc(doc(db, 'globalMenuSpotlights', 'meat', 'items', draft.id));
            const remaining = spotlights.filter((ad) => ad.id !== draft.id);
            const nextDrafts = { ...draftsRef.current };
            delete nextDrafts[draft.id];
            let next = Object.values(nextDrafts)[0] || remaining[0];
            if (!next) {
                next = createBlankSpotlight(doc(collection(db, 'globalMenuSpotlights', 'meat', 'items')).id);
                nextDrafts[next.id] = next;
            }
            draftsRef.current = nextDrafts;
            setDrafts(nextDrafts);
            setSpotlights(remaining);
            setSelectedId(next.id);
            selectedIdRef.current = next.id;
            onPreviewChange(next);
            setMessage(saved ? 'Spotlight deleted.' : 'Unsaved ad removed.');
        } catch (error) {
            console.error('Unable to delete menu Spotlight:', error);
            setMessage('The Spotlight could not be deleted.');
        } finally {
            setSaving(false);
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

    const cards = [...new Map([
        ...spotlights.map((ad) => [ad.id, ad]),
        ...Object.values(drafts).map((ad) => [ad.id, ad])
    ]).values()];
    const scheduledAds = spotlights.map((ad) => ({
        ...ad,
        recurrence: ['weekly', 'daily'].includes(ad.scheduleType)
            ? ad.recurrence
            : null
    }));

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


            </div>

            {loading ? (
                <p className="text-sm text-text-secondary">
                    Loading Spotlights...
                </p>
            ) : (
                <>
                    <div aria-label="Spotlight ads" className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                        {cards.map((card, index) => (
                            <button key={card.id} type="button" disabled={saving}
                                aria-label={`Edit ad ${index + 1}: ${card.title || 'Blank ad'}`}
                                aria-pressed={selectedId === card.id} onClick={() => handleSelect(card.id)}
                                className={`min-w-0 overflow-hidden rounded-2xl border-2 bg-surface text-left transition-colors disabled:opacity-50 ${selectedId === card.id
                                    ? 'border-blue-500 ring-4 ring-blue-500/20 shadow-lg'
                                    : 'border-border hover:border-blue-400'}`}>
                                <div className="relative flex aspect-[2/1] items-center justify-center overflow-hidden bg-black p-3 text-center text-white">
                                    {card.layoutMode !== 'text' && card.imageUrl ? (
                                        <img src={card.imageUrl} alt={card.imageAlt || card.title || 'Ad preview'}
                                            className="absolute inset-0 h-full w-full object-cover"
                                            style={{
                                                objectPosition: `${card.imageFraming.x}% ${card.imageFraming.y}%`,
                                                transform: `scale(${card.imageFraming.zoom})`,
                                                transformOrigin: `${card.imageFraming.x}% ${card.imageFraming.y}%`
                                            }} />
                                    ) : <span className="text-sm font-black">{card.title || 'Blank ad'}</span>}
                                    {card.layoutMode === 'image_text' && card.imageUrl && (
                                        <span className="relative rounded-lg bg-black/70 px-3 py-2 text-sm font-black">{card.title || 'Add a headline'}</span>
                                    )}
                                </div>
                                <div className="space-y-1 p-3">
                                    <span className="block truncate text-sm font-bold">{card.title || `Ad ${index + 1}`}</span>
                                    <span className="block text-xs text-text-secondary">{drafts[card.id] ? 'Unsaved changes'
                                        : card.enabled ? 'Enabled · follows schedule' : 'Disabled'} · {card.displayDurationSeconds}s</span>
                                </div>
                            </button>
                        ))}
                        <button type="button" disabled={saving} onClick={handleNewSpotlight} aria-label="Add Spotlight ad"
                            className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-5 text-text-secondary hover:border-blue-500 hover:text-blue-500 disabled:opacity-50">
                            <span aria-hidden="true" className="text-4xl font-light">+</span>
                            <span className="text-sm font-bold">Add ad</span>
                        </button>
                    </div>
                    <p className="text-xs text-text-secondary">Select an ad to edit it below. Unsaved edits stay while you switch ads;
                        save each ad before leaving this page. Eligible specials play in shuffled cycles without immediate repeats.</p>
                    <SpotlightSchedulingToggle menuId="meat" calendarEnabled={calendarEnabled}
                        ready={settingsReady} error={settingsError} disabled={saving} />
                    {calendarEnabled && settingsReady && (
                        <SpotlightCalendar ads={scheduledAds} onSelect={handleSelect} onUseDate={useCalendarDate}
                            disabled={saving || !draft} />
                    )}

                    {!draft ? (
                        <div className="border border-dashed border-border rounded-2xl p-8 text-center">
                            <p className="text-sm text-text-secondary">
                                Select an ad to begin.
                            </p>
                        </div>
                    ) : (
                        <fieldset key={draft.id} disabled={saving} className="space-y-5">
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

                            <div className="max-w-sm">
                                <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">Special Price (optional)</label>
                                <SpotlightPriceInput priceCents={draft.priceCents}
                                    onChange={(value) => updateDraft('priceCents', value)} disabled={saving} />
                                <p className="mt-2 text-xs text-text-secondary">
                                    Leave blank to hide the price on the TV.
                                </p>
                            </div>
                            <SpotlightScheduleEditor draft={draft} onChange={updateDraft} calendarEnabled={calendarEnabled} />

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
                                    disabled={!dirty || saving || !settingsReady}
                                    className="px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-full text-xs font-bold uppercase tracking-wider"
                                >
                                    {saving
                                        ? 'Saving...'
                                        : 'Save Spotlight'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={saving}
                                    className="px-5 py-2.5 bg-surface hover:bg-red-50 disabled:opacity-40 border border-border text-danger rounded-full text-xs font-bold uppercase tracking-wider"
                                >
                                    Delete Spotlight
                                </button>
                            </div>
                        </fieldset>
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
