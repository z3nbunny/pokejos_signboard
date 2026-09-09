import {
    useEffect,
    useState
} from 'react';
import { createPortal } from 'react-dom';
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    runTransaction,
    serverTimestamp,
    setDoc,
    updateDoc
} from 'firebase/firestore';

import { db } from '../firebase';
import { useAuth } from '../contexts/useAuth';
import MenuPreviewThumbnail from './MenuPreviewThumbnail';
import MenuWorkspacePanel from './MenuWorkspacePanel';
import SidesMenuPreview from './SidesMenuPreview';
import SidesMenuSectionEditor from './SidesMenuSectionEditor';
import { SIDES_MENU_SEED } from '../data/sidesMenuSeed';

const MENU_ID = 'sides';

const MENU_PREVIEW_LOCATIONS = [
    {
        id: 'brodie',
        label: 'Brodie'
    },
    {
        id: 'parmer',
        label: 'Parmer'
    },
    {
        id: 'round_rock',
        label: 'Round Rock'
    }
];

const DEFAULT_DISPLAY_NOTICES =
    SIDES_MENU_SEED.displayNotices;

function PriceInput({
    priceCents,
    onChange,
    disabled = false
}) {
    const formatPrice = (cents) =>
        (Number(cents || 0) / 100).toFixed(2);

    const [displayValue, setDisplayValue] =
        useState(formatPrice(priceCents));
    const [isEditing, setIsEditing] =
        useState(false);

    const handleChange = (event) => {
        const nextValue = event.target.value;

        if (!/^\d*(\.\d{0,2})?$/.test(nextValue)) {
            return;
        }

        setDisplayValue(nextValue);

        if (
            nextValue !== ''
            && nextValue !== '.'
        ) {
            const numericValue = Number(nextValue);

            if (
                Number.isFinite(numericValue)
                && numericValue >= 0
            ) {
                onChange(
                    Math.round(numericValue * 100)
                );
            }
        }
    };

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
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-text-secondary">
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
                onChange={handleChange}
                onBlur={finishEditing}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.currentTarget.blur();
                    }
                }}
                disabled={disabled}
                className="w-full rounded-xl border border-border bg-surface py-2.5 pl-7 pr-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
        </div>
    );
}

const cleanText = (value) =>
    String(value || '').trim();

const cleanTextList = (values) =>
    (Array.isArray(values) ? values : [])
        .map(cleanText)
        .filter(Boolean);

const cleanPriceOptions = (priceOptions) =>
    (Array.isArray(priceOptions) ? priceOptions : [])
        .map((priceOption, index) => ({
            ...priceOption,
            id:
                cleanText(priceOption.id)
                || `price_${index + 1}`,
            label: cleanText(priceOption.label),
            labelEs: cleanText(priceOption.labelEs),
            priceCents: Number(priceOption.priceCents),
            order:
                Number(priceOption.order)
                || (index + 1) * 10
        }));

const createCleanMenu = (menu) => ({
    schemaVersion:
        Number(menu.schemaVersion)
        || SIDES_MENU_SEED.schemaVersion,
    menuId: MENU_ID,
    title: cleanText(menu.title),
    titleEs: cleanText(menu.titleEs),
    subtitle: cleanText(menu.subtitle),
    subtitleEs: cleanText(menu.subtitleEs),
    displayNotices: {
        allergenDisclaimer: cleanText(
            menu.displayNotices?.allergenDisclaimer
            || DEFAULT_DISPLAY_NOTICES
                .allergenDisclaimer
        ),
        allergenDisclaimerEs: cleanText(
            menu.displayNotices?.allergenDisclaimerEs
            || DEFAULT_DISPLAY_NOTICES
                .allergenDisclaimerEs
        )
    },
    pricingGroups: (
        Array.isArray(menu.pricingGroups)
            ? menu.pricingGroups
            : []
    ).map((pricingGroup, index) => ({
        ...pricingGroup,
        id: cleanText(pricingGroup.id),
        title: cleanText(pricingGroup.title),
        titleEs: cleanText(pricingGroup.titleEs),
        priceOptions: cleanPriceOptions(
            pricingGroup.priceOptions
        ),
        enabled: pricingGroup.enabled !== false,
        order:
            Number(pricingGroup.order)
            || (index + 1) * 10
    })),
    sections: (
        Array.isArray(menu.sections)
            ? menu.sections
            : []
    ).map((section, sectionIndex) => ({
        ...section,
        id: cleanText(section.id),
        title: cleanText(section.title),
        titleEs: cleanText(section.titleEs),
        subtitle: cleanText(section.subtitle),
        subtitleEs: cleanText(section.subtitleEs),
        enabled: section.enabled !== false,
        order:
            Number(section.order)
            || (sectionIndex + 1) * 10,
        modifiers: (
            Array.isArray(section.modifiers)
                ? section.modifiers
                : []
        ).map((modifier, modifierIndex) => ({
            ...modifier,
            id:
                cleanText(modifier.id)
                || `modifier_${modifierIndex + 1}`,
            label: cleanText(modifier.label),
            labelEs: cleanText(modifier.labelEs),
            description: cleanText(
                modifier.description
            ),
            descriptionEs: cleanText(
                modifier.descriptionEs
            ),
            priceCents: Number(
                modifier.priceCents || 0
            ),
            placement: [
                'start',
                'after_item',
                'end'
            ].includes(modifier.placement)
                ? modifier.placement
                : 'end',
            afterItemId:
                modifier.placement === 'after_item'
                    ? cleanText(modifier.afterItemId)
                    : '',
            enabled: modifier.enabled !== false,
            order:
                Number(modifier.order)
                || (modifierIndex + 1) * 10
        })),
        items: (
            Array.isArray(section.items)
                ? section.items
                : []
        ).map((item, itemIndex) => ({
            ...item,
            id: cleanText(item.id),
            name: cleanText(item.name),
            nameEs: cleanText(item.nameEs),
            description: cleanText(item.description),
            descriptionEs: cleanText(
                item.descriptionEs
            ),
            details: cleanTextList(item.details),
            detailsEs: cleanTextList(item.detailsEs),
            dietaryFlags: Array.from(
                new Set(
                    Array.isArray(item.dietaryFlags)
                        ? item.dietaryFlags
                            .map(cleanText)
                            .filter(Boolean)
                        : []
                )
            ),
            pricingGroupId: cleanText(
                item.pricingGroupId
            ),
            priceOptions: cleanPriceOptions(
                item.priceOptions
            ),
            bulkPriceEligible:
                item.bulkPriceEligible !== false,
            enabled: item.enabled !== false,
            order:
                Number(item.order)
                || (itemIndex + 1) * 10
        }))
    }))
});

const validateMenu = (menu) => {
    const cleanMenu = createCleanMenu(menu);

    if (!cleanMenu.title) {
        throw new Error(
            'The Sides Menu needs an English title.'
        );
    }

    if (cleanMenu.sections.length === 0) {
        throw new Error(
            'The Sides Menu needs at least one section.'
        );
    }

    const pricingGroupIds = new Set();

    for (const pricingGroup of cleanMenu.pricingGroups) {
        if (!pricingGroup.id || !pricingGroup.title) {
            throw new Error(
                'Every shared pricing group needs an ID and title.'
            );
        }

        if (pricingGroupIds.has(pricingGroup.id)) {
            throw new Error(
                `Duplicate pricing group ID: ${pricingGroup.id}`
            );
        }

        pricingGroupIds.add(pricingGroup.id);

        if (pricingGroup.priceOptions.length === 0) {
            throw new Error(
                `${pricingGroup.title} needs at least one price.`
            );
        }

        for (const priceOption of pricingGroup.priceOptions) {
            if (
                !Number.isInteger(priceOption.priceCents)
                || priceOption.priceCents < 0
            ) {
                throw new Error(
                    `${pricingGroup.title} has an invalid price.`
                );
            }
        }
    }

    for (const section of cleanMenu.sections) {
        if (!section.id || !section.title) {
            throw new Error(
                'Every menu section needs an ID and title.'
            );
        }

        for (const item of section.items) {
            if (!item.id || !item.name) {
                throw new Error(
                    `An item in ${section.title} is missing its ID or name.`
                );
            }

            const hasSharedPricing =
                item.pricingGroupId
                && pricingGroupIds.has(
                    item.pricingGroupId
                );

            if (
                !hasSharedPricing
                && item.priceOptions.length === 0
            ) {
                throw new Error(
                    `${item.name} needs a price or shared pricing group.`
                );
            }

            for (const priceOption of item.priceOptions) {
                if (
                    !Number.isInteger(
                        priceOption.priceCents
                    )
                    || priceOption.priceCents < 0
                ) {
                    throw new Error(
                        `${item.name} has an invalid price.`
                    );
                }
            }
        }

        const itemIds = new Set(
            section.items.map((item) => item.id)
        );

        for (const modifier of section.modifiers) {
            if (!modifier.id || !modifier.label) {
                throw new Error(
                    `A modifier in ${section.title} is missing its ID or label.`
                );
            }

            if (
                !Number.isInteger(modifier.priceCents)
                || modifier.priceCents < 0
            ) {
                throw new Error(
                    `${modifier.label} has an invalid price.`
                );
            }

            if (
                modifier.placement === 'after_item'
                && !itemIds.has(modifier.afterItemId)
            ) {
                throw new Error(
                    `${modifier.label} must be placed after an existing item.`
                );
            }
        }
    }

    return cleanMenu;
};

export default function SidesMenuManager({
    onUnsavedChangesChange = null
}) {
    const { currentUser, userData } = useAuth();

    const [draftMenu, setDraftMenu] = useState(null);
    const [savedDraftMenu, setSavedDraftMenu] =
        useState(null);
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] =
        useState(false);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] =
        useState(false);
    const [sendingTvPreview, setSendingTvPreview] =
        useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] =
        useState(false);
    const [message, setMessage] = useState('');
    const [isPreviewOpen, setIsPreviewOpen] =
        useState(false);

    const [previewLocationId, setPreviewLocationId] =
        useState('brodie');
    const [previewDeviceId, setPreviewDeviceId] =
        useState('');
    const [previewDeviceIds, setPreviewDeviceIds] =
        useState([]);

    useEffect(() => {
        onUnsavedChangesChange?.(
            hasUnsavedChanges
        );
    }, [
        hasUnsavedChanges,
        onUnsavedChangesChange
    ]);

    useEffect(() => {
        if (!isPreviewOpen) {
            return undefined;
        }

        const previousOverflow =
            document.body.style.overflow;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsPreviewOpen(false);
            }
        };

        document.body.style.overflow = 'hidden';
        document.addEventListener(
            'keydown',
            handleKeyDown
        );

        return () => {
            document.body.style.overflow =
                previousOverflow;
            document.removeEventListener(
                'keydown',
                handleKeyDown
            );
        };
    }, [isPreviewOpen]);

    useEffect(() => {
        if (userData?.role !== 'super_admin') {
            return undefined;
        }

        const draftRef = doc(
            db,
            'globalMenuDrafts',
            MENU_ID
        );

        const unsubscribe = onSnapshot(
            draftRef,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setDraftMenu(null);
                    setSavedDraftMenu(null);
                    setHasUnsavedChanges(false);
                    setLoading(false);
                    return;
                }

                const storedDraft = snapshot.data();

                const loadedDraft = {
                    ...storedDraft,
                    displayNotices: {
                        ...DEFAULT_DISPLAY_NOTICES,
                        ...(storedDraft.displayNotices || {})
                    },
                    pricingGroups:
                        Array.isArray(
                            storedDraft.pricingGroups
                        )
                            ? storedDraft.pricingGroups
                            : [],
                    sections:
                        Array.isArray(storedDraft.sections)
                            ? storedDraft.sections
                            : []
                };

                setDraftMenu(loadedDraft);
                setSavedDraftMenu(loadedDraft);
                setHasUnsavedChanges(false);
                setLoading(false);
            },
            (error) => {
                console.error(
                    'Unable to load Sides Menu draft:',
                    error
                );

                setMessage(
                    'Unable to load the Sides Menu draft.'
                );
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userData?.role]);

    useEffect(() => {
        if (userData?.role !== 'super_admin') {
            return undefined;
        }

        const deviceCollection = collection(
            db,
            'locations',
            previewLocationId,
            'devices'
        );

        const unsubscribe = onSnapshot(
            deviceCollection,
            (snapshot) => {
                const deviceIds = snapshot.docs
                    .map(
                        (deviceSnapshot) =>
                            deviceSnapshot.id
                    )
                    .sort(
                        (firstId, secondId) =>
                            firstId.localeCompare(secondId)
                    );

                setPreviewDeviceIds(deviceIds);
                setPreviewDeviceId(
                    (currentDeviceId) =>
                        deviceIds.includes(currentDeviceId)
                            ? currentDeviceId
                            : deviceIds[0] || ''
                );
            },
            (error) => {
                console.error(
                    'Unable to load preview devices:',
                    error
                );
                setPreviewDeviceIds([]);
                setPreviewDeviceId('');
            }
        );

        return () => unsubscribe();
    }, [
        previewLocationId,
        userData?.role
    ]);

    const applyDraftUpdate = (updater) => {
        setDraftMenu((currentDraft) =>
            updater(currentDraft)
        );
        setHasUnsavedChanges(true);
        setMessage('');
    };

    const updateMenuField = (field, value) => {
        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            [field]: value
        }));
    };

    const updateDisplayNotice = (field, value) => {
        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            displayNotices: {
                ...DEFAULT_DISPLAY_NOTICES,
                ...(currentDraft.displayNotices || {}),
                [field]: value
            }
        }));
    };

    const updatePricingGroupField = (
        pricingGroupId,
        field,
        value
    ) => {
        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            pricingGroups: (
                currentDraft.pricingGroups || []
            ).map((pricingGroup) =>
                pricingGroup.id === pricingGroupId
                    ? {
                        ...pricingGroup,
                        [field]: value
                    }
                    : pricingGroup
            )
        }));
    };

    const updatePricingGroupPrice = (
        pricingGroupId,
        priceOptionId,
        field,
        value
    ) => {
        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            pricingGroups: (
                currentDraft.pricingGroups || []
            ).map((pricingGroup) =>
                pricingGroup.id === pricingGroupId
                    ? {
                        ...pricingGroup,
                        priceOptions: (
                            pricingGroup.priceOptions || []
                        ).map((priceOption) =>
                            priceOption.id === priceOptionId
                                ? {
                                    ...priceOption,
                                    [field]: value
                                }
                                : priceOption
                        )
                    }
                    : pricingGroup
            )
        }));
    };

    const updateItemPrice = (
        sectionId,
        itemId,
        priceOptionId,
        field,
        value
    ) => {
        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            sections: (
                currentDraft.sections || []
            ).map((section) =>
                section.id === sectionId
                    ? {
                        ...section,
                        items: (
                            section.items || []
                        ).map((item) =>
                            item.id === itemId
                                ? {
                                    ...item,
                                    priceOptions: (
                                        item.priceOptions || []
                                    ).map((priceOption) =>
                                        priceOption.id
                                            === priceOptionId
                                            ? {
                                                ...priceOption,
                                                [field]: value
                                            }
                                            : priceOption
                                    )
                                }
                                : item
                        )
                    }
                    : section
            )
        }));
    };

    const updateSection = (
        sectionId,
        nextSection
    ) => {
        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            sections: (
                currentDraft.sections || []
            ).map((section) =>
                section.id === sectionId
                    ? nextSection
                    : section
            )
        }));
    };

    const handleInitializeDraft = async () => {
        if (
            userData?.role !== 'super_admin'
            || !currentUser
        ) {
            return;
        }

        setInitializing(true);
        setMessage('');

        try {
            const draftRef = doc(
                db,
                'globalMenuDrafts',
                MENU_ID
            );

            const existingDraft = await getDoc(draftRef);

            if (existingDraft.exists()) {
                setMessage(
                    'The Sides Menu draft already exists. No data was changed.'
                );
                return;
            }

            await setDoc(draftRef, {
                ...SIDES_MENU_SEED,
                sourceVersion: 0,
                revisionNumber: 0,
                createdAt: serverTimestamp(),
                createdBy: currentUser.uid,
                updatedAt: serverTimestamp(),
                updatedBy: currentUser.uid
            });

            setMessage(
                'Private Sides Menu draft initialized successfully.'
            );
        } catch (error) {
            console.error(
                'Unable to initialize Sides Menu draft:',
                error
            );
            setMessage(
                'The Sides Menu draft could not be initialized.'
            );
        } finally {
            setInitializing(false);
        }
    };

    const handleSaveDraft = async () => {
        if (
            userData?.role !== 'super_admin'
            || !currentUser
            || !draftMenu
            || !hasUnsavedChanges
        ) {
            return;
        }

        setSaving(true);
        setMessage('');

        try {
            const cleanMenu = validateMenu(draftMenu);

            await updateDoc(
                doc(
                    db,
                    'globalMenuDrafts',
                    MENU_ID
                ),
                {
                    ...cleanMenu,
                    updatedAt: serverTimestamp(),
                    updatedBy: currentUser.uid
                }
            );

            setMessage(
                'Sides Menu draft saved successfully.'
            );
        } catch (error) {
            console.error(
                'Unable to save Sides Menu draft:',
                error
            );
            setMessage(
                error.message
                || 'The Sides Menu draft could not be saved.'
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDiscardChanges = () => {
        setDraftMenu(savedDraftMenu);
        setHasUnsavedChanges(false);
        setMessage('Unsaved changes discarded.');
    };

    const handleSendToTvPreview = async () => {
        if (
            userData?.role !== 'super_admin'
            || !currentUser
            || !draftMenu
            || hasUnsavedChanges
            || saving
            || publishing
            || sendingTvPreview
            || !previewLocationId
            || !previewDeviceId
        ) {
            return;
        }

        setSendingTvPreview(true);
        setMessage('');

        try {
            const draftRef = doc(
                db,
                'globalMenuDrafts',
                MENU_ID
            );
            const deviceRef = doc(
                db,
                'locations',
                previewLocationId,
                'devices',
                previewDeviceId
            );

            const [draftSnapshot, deviceSnapshot] =
                await Promise.all([
                    getDoc(draftRef),
                    getDoc(deviceRef)
                ]);

            if (!draftSnapshot.exists()) {
                throw new Error(
                    'The saved Sides Menu draft no longer exists.'
                );
            }

            if (!deviceSnapshot.exists()) {
                throw new Error(
                    'The selected preview device no longer exists.'
                );
            }

            if (
                !cleanText(
                    deviceSnapshot.data().authUid
                )
            ) {
                throw new Error(
                    'The selected preview device is not paired.'
                );
            }

            const storedDraft = draftSnapshot.data();
            const previewMenu = {
                ...validateMenu(storedDraft),
                sourceVersion: Number(
                    storedDraft.sourceVersion || 0
                ),
                sourceDraftUpdatedAt:
                    storedDraft.updatedAt || null,
                previewedAt: serverTimestamp(),
                previewedBy: currentUser.uid
            };

            await setDoc(
                doc(
                    db,
                    'locations',
                    previewLocationId,
                    'devices',
                    previewDeviceId,
                    'menuPreviews',
                    MENU_ID
                ),
                previewMenu
            );

            const locationLabel =
                MENU_PREVIEW_LOCATIONS.find(
                    (location) =>
                        location.id === previewLocationId
                )?.label || previewLocationId;

            const deviceLabel =
                previewDeviceId.replace(/_/g, ' ');

            setMessage(
                `Saved Sides Menu draft sent to `
                + `${locationLabel} — ${deviceLabel}. `
                + 'The published menu version was not changed.'
            );
        } catch (error) {
            console.error(
                'Unable to send Sides Menu preview:',
                error
            );
            setMessage(
                error.message
                || 'The Sides Menu preview could not be sent.'
            );
        } finally {
            setSendingTvPreview(false);
        }
    };

    const handlePublishMenu = async () => {
        if (
            userData?.role !== 'super_admin'
            || !currentUser
            || !draftMenu
            || hasUnsavedChanges
            || saving
            || publishing
        ) {
            return;
        }

        try {
            validateMenu(draftMenu);
        } catch (error) {
            setMessage(
                error.message
                || 'The Sides Menu could not be validated.'
            );
            return;
        }

        const confirmed = window.confirm(
            'Publish the saved Sides Menu now? '
            + 'Any Sides Menu displays will update immediately.'
        );

        if (!confirmed) {
            return;
        }

        setPublishing(true);
        setMessage('');

        try {
            const publishedVersion = await runTransaction(
                db,
                async (transaction) => {
                    const draftRef = doc(
                        db,
                        'globalMenuDrafts',
                        MENU_ID
                    );
                    const publishedRef = doc(
                        db,
                        'globalMenus',
                        MENU_ID
                    );

                    const draftSnapshot =
                        await transaction.get(draftRef);
                    const publishedSnapshot =
                        await transaction.get(
                            publishedRef
                        );

                    if (!draftSnapshot.exists()) {
                        throw new Error(
                            'The saved Sides Menu draft no longer exists.'
                        );
                    }

                    const storedDraft =
                        draftSnapshot.data();
                    const currentVersion =
                        publishedSnapshot.exists()
                            ? Number(
                                publishedSnapshot
                                    .data().version || 0
                            )
                            : 0;
                    const nextVersion =
                        currentVersion + 1;
                    const revisionId =
                        `v${String(nextVersion)
                            .padStart(4, '0')}`;

                    const publishedMenu = {
                        ...validateMenu(storedDraft),
                        version: nextVersion,
                        publishedAt: serverTimestamp(),
                        publishedBy: currentUser.uid
                    };

                    transaction.set(
                        publishedRef,
                        publishedMenu
                    );
                    transaction.set(
                        doc(
                            db,
                            'globalMenuRevisions',
                            MENU_ID,
                            'versions',
                            revisionId
                        ),
                        {
                            ...publishedMenu,
                            revisionId
                        }
                    );
                    transaction.update(
                        draftRef,
                        {
                            sourceVersion: nextVersion,
                            revisionNumber: nextVersion,
                            publishedAt:
                                serverTimestamp(),
                            publishedBy:
                                currentUser.uid
                        }
                    );

                    return nextVersion;
                }
            );

            setMessage(
                `Sides Menu version ${publishedVersion} `
                + 'published successfully.'
            );
        } catch (error) {
            console.error(
                'Unable to publish Sides Menu:',
                error
            );
            setMessage(
                error.message
                || 'The Sides Menu could not be published.'
            );
        } finally {
            setPublishing(false);
        }
    };

    if (userData?.role !== 'super_admin') {
        return (
            <div className="rounded-3xl border border-border bg-bg p-8">
                <p className="font-bold text-danger">
                    Menu management is restricted to super admins.
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="rounded-3xl border border-border bg-bg p-8">
                <p className="text-text-secondary">
                    Loading Sides Menu draft...
                </p>
            </div>
        );
    }

    if (!draftMenu) {
        return (
            <div className="space-y-6 rounded-3xl border border-border bg-bg p-8">
                <div>
                    <h2 className="text-2xl font-bold">
                        Sides Menu Manager
                    </h2>

                    <p className="mt-2 text-sm text-text-secondary">
                        The private Sides Menu draft has not been
                        initialized.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleInitializeDraft}
                    disabled={initializing}
                    className="w-fit rounded-full bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                    {initializing
                        ? 'Initializing...'
                        : 'Initialize Sides Menu Draft'}
                </button>

                {message && (
                    <p
                        role="status"
                        aria-live="polite"
                        className="text-sm font-bold"
                    >
                        {message}
                    </p>
                )}
            </div>
        );
    }

    const sections = draftMenu.sections || [];
    const itemCount = sections.reduce(
        (total, section) =>
            total + (section.items || []).length,
        0
    );

    const directlyPricedItems = sections.flatMap(
        (section) =>
            (section.items || [])
                .filter(
                    (item) =>
                        !item.pricingGroupId
                        && (item.priceOptions || []).length > 0
                )
                .map((item) => ({
                    sectionId: section.id,
                    sectionTitle: section.title,
                    item
                }))
    );

    const sharedPriceCount = (
        draftMenu.pricingGroups || []
    ).reduce(
        (total, pricingGroup) =>
            total
            + (pricingGroup.priceOptions || []).length,
        0
    );

    return (
        <div className="space-y-6">
            {isPreviewOpen && createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Full-screen Sides Menu preview"
                    className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden bg-black p-[2vw]"
                >
                    <button
                        type="button"
                        onClick={() =>
                            setIsPreviewOpen(false)
                        }
                        className="absolute right-4 top-4 z-10 rounded-full bg-white px-5 py-2.5 text-xs font-black uppercase tracking-wider text-black hover:bg-zinc-200"
                    >
                        Close Preview
                    </button>

                    <div className="w-[min(96vw,160vh)] aspect-video overflow-hidden shadow-2xl">
                        <SidesMenuPreview
                            menu={draftMenu}
                        />
                    </div>
                </div>,
                document.body
            )}

            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-bold">
                            Sides Menu Manager
                        </h2>

                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-800">
                            Private Draft
                        </span>

                        {hasUnsavedChanges && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase text-blue-800">
                                Unsaved Changes
                            </span>
                        )}
                    </div>

                    <p className="mt-2 text-sm text-text-secondary">
                        Edit the shared Sides Menu safely before
                        publishing it to restaurant screens.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={handleDiscardChanges}
                        disabled={
                            !hasUnsavedChanges
                            || saving
                            || publishing
                        }
                        className="rounded-full border border-border bg-surface px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-border disabled:opacity-40"
                    >
                        Discard Changes
                    </button>

                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={
                            !hasUnsavedChanges
                            || saving
                        }
                        className="rounded-full bg-accent px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
                    >
                        {saving
                            ? 'Saving...'
                            : 'Save Draft'}
                    </button>

                    <button
                        type="button"
                        onClick={handlePublishMenu}
                        disabled={
                            hasUnsavedChanges
                            || saving
                            || publishing
                        }
                        title={
                            hasUnsavedChanges
                                ? 'Save or discard draft changes before publishing.'
                                : 'Publish the saved menu to restaurant displays.'
                        }
                        className="rounded-full bg-amber-400 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black transition-colors hover:bg-amber-300 disabled:opacity-40"
                    >
                        {publishing
                            ? 'Publishing...'
                            : 'Publish Menu'}
                    </button>
                </div>
            </div>

            {message && (
                <div
                    role="status"
                    aria-live="polite"
                    className="rounded-2xl border border-accent/30 bg-accent-light px-5 py-4 text-sm font-bold text-text-primary"
                >
                    {message}
                </div>
            )}

            <MenuWorkspacePanel
                panelKey="sides-preview-and-tv"
                title="Preview & TV Testing"
                description="Inspect the working draft, open it full-screen, or send the last saved draft to a paired TV."
                summary={
                    <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <MenuPreviewThumbnail label="Working Sides Menu preview">
                                <SidesMenuPreview
                                    menu={draftMenu}
                                />
                            </MenuPreviewThumbnail>

                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                                    Working Draft
                                </p>

                                <p className="mt-1 text-sm font-bold text-text-primary">
                                    {hasUnsavedChanges
                                        ? 'Save the draft before sending it to a TV'
                                        : 'Saved draft is ready to send'}
                                </p>

                                <p className="mt-1 text-xs text-text-secondary">
                                    Published version{' '}
                                    {draftMenu.sourceVersion || 0}
                                    {' · '}
                                    {sections.length} sections
                                    {' · '}
                                    {itemCount} items
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 2xl:items-end">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div>
                                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                                        Location
                                    </label>

                                    <select
                                        value={previewLocationId}
                                        onChange={(event) => {
                                            setPreviewLocationId(
                                                event.target.value
                                            );
                                            setPreviewDeviceId('');
                                        }}
                                        disabled={sendingTvPreview}
                                        className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 sm:w-auto"
                                    >
                                        {MENU_PREVIEW_LOCATIONS.map(
                                            (location) => (
                                                <option
                                                    key={location.id}
                                                    value={location.id}
                                                >
                                                    {location.label}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                                        Paired TV
                                    </label>

                                    <select
                                        value={previewDeviceId}
                                        onChange={(event) =>
                                            setPreviewDeviceId(
                                                event.target.value
                                            )
                                        }
                                        disabled={
                                            sendingTvPreview
                                            || previewDeviceIds.length === 0
                                        }
                                        className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 sm:w-auto"
                                    >
                                        {previewDeviceIds.length === 0 ? (
                                            <option value="">
                                                No paired TVs found
                                            </option>
                                        ) : (
                                            previewDeviceIds.map(
                                                (deviceId) => (
                                                    <option
                                                        key={deviceId}
                                                        value={deviceId}
                                                    >
                                                        {deviceId.replace(
                                                            /_/g,
                                                            ' '
                                                        )}
                                                    </option>
                                                )
                                            )
                                        )}
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSendToTvPreview}
                                    disabled={
                                        hasUnsavedChanges
                                        || saving
                                        || publishing
                                        || sendingTvPreview
                                        || !previewDeviceId
                                    }
                                    title={
                                        hasUnsavedChanges
                                            ? 'Save or discard changes before sending the TV preview.'
                                            : 'Send the saved draft to this paired TV.'
                                    }
                                    className="rounded-full bg-violet-600 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
                                >
                                    {sendingTvPreview
                                        ? 'Sending...'
                                        : 'Send Saved Draft'}
                                </button>
                            </div>

                            <p className="text-xs text-text-secondary 2xl:text-right">
                                Sends the last saved draft without publishing
                                a new menu version.
                            </p>
                        </div>
                    </div>
                }
            >
                <div className="space-y-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h4 className="font-bold text-text-primary">
                                Working Draft Preview
                            </h4>
                            <p className="mt-1 text-sm text-text-secondary">
                                This preview includes unsaved changes.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setIsPreviewOpen(true)
                            }
                            className="rounded-full border border-border bg-surface px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-border"
                        >
                            Open Full-Screen Preview
                        </button>
                    </div>

                    <div className="w-full aspect-video overflow-hidden rounded-2xl border border-border bg-black shadow-xl">
                        <SidesMenuPreview
                            menu={draftMenu}
                        />
                    </div>

                    <div className="flex flex-col gap-2 text-xs text-text-secondary sm:flex-row sm:items-center sm:justify-between">
                        <p>
                            Opening or closing this preview does not save or
                            publish the menu.
                        </p>
                        <p>
                            TV URL requires matching location and device
                            values with screen=sides&amp;preview=1.
                        </p>
                    </div>
                </div>
            </MenuWorkspacePanel>

            <MenuWorkspacePanel
                panelKey="sides-menu-settings"
                title="Menu Settings"
                description="Edit the menu identity and shared allergen notice."
                defaultOpen
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                            Menu Title — English
                        </label>
                        <input
                            type="text"
                            value={draftMenu.title || ''}
                            onChange={(event) =>
                                updateMenuField(
                                    'title',
                                    event.target.value
                                )
                            }
                            className="w-full rounded-xl border border-border bg-surface px-4 py-3"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                            Menu Title — Spanish
                        </label>
                        <input
                            type="text"
                            value={draftMenu.titleEs || ''}
                            onChange={(event) =>
                                updateMenuField(
                                    'titleEs',
                                    event.target.value
                                )
                            }
                            className="w-full rounded-xl border border-border bg-surface px-4 py-3"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                            Allergen Notice — English
                        </label>
                        <textarea
                            rows="4"
                            value={
                                draftMenu.displayNotices
                                    ?.allergenDisclaimer
                                || ''
                            }
                            onChange={(event) =>
                                updateDisplayNotice(
                                    'allergenDisclaimer',
                                    event.target.value
                                )
                            }
                            className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 leading-relaxed"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                            Allergen Notice — Spanish
                        </label>
                        <textarea
                            rows="4"
                            value={
                                draftMenu.displayNotices
                                    ?.allergenDisclaimerEs
                                || ''
                            }
                            onChange={(event) =>
                                updateDisplayNotice(
                                    'allergenDisclaimerEs',
                                    event.target.value
                                )
                            }
                            className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 leading-relaxed"
                        />
                    </div>
                </div>
            </MenuWorkspacePanel>

            <MenuWorkspacePanel
                panelKey="sides-pricing"
                title="Pricing"
                description="Update shared portion prices once, plus individual drink and beer prices."
                summary={
                    <p className="text-sm text-text-secondary">
                        {(draftMenu.pricingGroups || []).length}{' '}
                        shared groups
                        {' · '}
                        {sharedPriceCount} shared prices
                        {' · '}
                        {directlyPricedItems.length}{' '}
                        individually priced items
                    </p>
                }
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-bold text-text-primary">
                                Shared Pricing Groups
                            </h4>
                            <p className="mt-1 text-sm text-text-secondary">
                                Every item assigned to a group updates
                                automatically when these prices change.
                            </p>
                        </div>

                        {(draftMenu.pricingGroups || []).map(
                            (pricingGroup) => (
                                <section
                                    key={pricingGroup.id}
                                    className="space-y-4 rounded-2xl border border-border bg-surface p-4"
                                >
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                                                Group Name — English
                                            </label>
                                            <input
                                                type="text"
                                                value={
                                                    pricingGroup.title
                                                    || ''
                                                }
                                                onChange={(event) =>
                                                    updatePricingGroupField(
                                                        pricingGroup.id,
                                                        'title',
                                                        event.target.value
                                                    )
                                                }
                                                disabled={
                                                    saving
                                                    || publishing
                                                }
                                                className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 font-bold disabled:opacity-50"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                                                Group Name — Spanish
                                            </label>
                                            <input
                                                type="text"
                                                value={
                                                    pricingGroup.titleEs
                                                    || ''
                                                }
                                                onChange={(event) =>
                                                    updatePricingGroupField(
                                                        pricingGroup.id,
                                                        'titleEs',
                                                        event.target.value
                                                    )
                                                }
                                                disabled={
                                                    saving
                                                    || publishing
                                                }
                                                className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 font-bold disabled:opacity-50"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                                        {(pricingGroup.priceOptions || [])
                                            .map((priceOption) => (
                                                <div
                                                    key={priceOption.id}
                                                    className="space-y-3 rounded-xl border border-border bg-bg p-3"
                                                >
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                        <div>
                                                            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                                                English Label
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    priceOption.label
                                                                    || ''
                                                                }
                                                                onChange={(event) =>
                                                                    updatePricingGroupPrice(
                                                                        pricingGroup.id,
                                                                        priceOption.id,
                                                                        'label',
                                                                        event.target.value
                                                                    )
                                                                }
                                                                disabled={
                                                                    saving
                                                                    || publishing
                                                                }
                                                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-50"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                                                Spanish Label
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    priceOption.labelEs
                                                                    || ''
                                                                }
                                                                onChange={(event) =>
                                                                    updatePricingGroupPrice(
                                                                        pricingGroup.id,
                                                                        priceOption.id,
                                                                        'labelEs',
                                                                        event.target.value
                                                                    )
                                                                }
                                                                disabled={
                                                                    saving
                                                                    || publishing
                                                                }
                                                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm disabled:opacity-50"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                                            Price
                                                        </label>
                                                        <PriceInput
                                                            priceCents={
                                                                priceOption
                                                                    .priceCents
                                                            }
                                                            onChange={(priceCents) =>
                                                                updatePricingGroupPrice(
                                                                    pricingGroup.id,
                                                                    priceOption.id,
                                                                    'priceCents',
                                                                    priceCents
                                                                )
                                                            }
                                                            disabled={
                                                                saving
                                                                || publishing
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </section>
                            )
                        )}
                    </div>

                    <div className="space-y-4 border-t border-border pt-6">
                        <div>
                            <h4 className="font-bold text-text-primary">
                                Drinks and Individual Prices
                            </h4>
                            <p className="mt-1 text-sm text-text-secondary">
                                These items do not use a shared pricing
                                group and may be changed independently.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {directlyPricedItems.map((entry) => (
                                <section
                                    key={entry.item.id}
                                    className="space-y-3 rounded-2xl border border-border bg-surface p-4"
                                >
                                    <div>
                                        <p className="font-bold text-text-primary">
                                            {entry.item.name}
                                        </p>
                                        <p className="mt-0.5 text-xs text-text-secondary">
                                            {entry.sectionTitle}
                                        </p>
                                    </div>

                                    {(entry.item.priceOptions || []).map(
                                        (priceOption) => (
                                            <div
                                                key={priceOption.id}
                                                className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem]"
                                            >
                                                <div>
                                                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                                        Display Label
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={
                                                            priceOption.label
                                                            || ''
                                                        }
                                                        placeholder="Standard price"
                                                        onChange={(event) =>
                                                            updateItemPrice(
                                                                entry.sectionId,
                                                                entry.item.id,
                                                                priceOption.id,
                                                                'label',
                                                                event.target.value
                                                            )
                                                        }
                                                        disabled={
                                                            saving
                                                            || publishing
                                                        }
                                                        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm disabled:opacity-50"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                                        Spanish Label
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={
                                                            priceOption.labelEs
                                                            || ''
                                                        }
                                                        placeholder="Precio estándar"
                                                        onChange={(event) =>
                                                            updateItemPrice(
                                                                entry.sectionId,
                                                                entry.item.id,
                                                                priceOption.id,
                                                                'labelEs',
                                                                event.target.value
                                                            )
                                                        }
                                                        disabled={
                                                            saving
                                                            || publishing
                                                        }
                                                        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm disabled:opacity-50"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                                        Price
                                                    </label>
                                                    <PriceInput
                                                        priceCents={
                                                            priceOption
                                                                .priceCents
                                                        }
                                                        onChange={(priceCents) =>
                                                            updateItemPrice(
                                                                entry.sectionId,
                                                                entry.item.id,
                                                                priceOption.id,
                                                                'priceCents',
                                                                priceCents
                                                            )
                                                        }
                                                        disabled={
                                                            saving
                                                            || publishing
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        )
                                    )}
                                </section>
                            ))}
                        </div>
                    </div>
                </div>
            </MenuWorkspacePanel>

            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-bold text-text-primary">
                        Menu Sections
                    </h3>
                    <p className="mt-1 text-sm text-text-secondary">
                        Edit items in the same section order used by the TV menu.
                    </p>
                </div>

                {sections.map((section) => (
                    <MenuWorkspacePanel
                        key={section.id}
                        panelKey={`sides-section-${section.id}`}
                        title={
                            section.titleEs
                                ? `${section.title} / ${section.titleEs}`
                                : section.title
                        }
                        description={`${(section.items || []).length} items · ${(section.modifiers || []).length} modifiers`}
                        summary={
                            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-text-secondary">
                                <span>
                                    {(section.items || [])
                                        .filter(
                                            (item) =>
                                                item.enabled !== false
                                        )
                                        .length}{' '}
                                    visible
                                </span>

                                {section.enabled === false && (
                                    <span className="rounded-full bg-zinc-200 px-2.5 py-1 uppercase text-zinc-700">
                                        Section hidden
                                    </span>
                                )}
                            </div>
                        }
                    >
                        <SidesMenuSectionEditor
                            section={section}
                            pricingGroups={
                                draftMenu.pricingGroups || []
                            }
                            disabled={saving || publishing}
                            onChange={(nextSection) =>
                                updateSection(
                                    section.id,
                                    nextSection
                                )
                            }
                        />
                    </MenuWorkspacePanel>
                ))}
            </div>

            <div className="sticky bottom-4 flex flex-col gap-4 rounded-2xl border border-border bg-surface/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-bold">
                        {hasUnsavedChanges
                            ? 'You have unsaved draft changes.'
                            : 'All draft changes are saved.'}
                    </p>

                    {message && (
                        <p className="mt-1 text-xs text-text-secondary">
                            {message}
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={
                        !hasUnsavedChanges
                        || saving
                    }
                    className="rounded-full bg-accent px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
                >
                    {saving
                        ? 'Saving Draft...'
                        : 'Save Draft'}
                </button>
            </div>
        </div>
    );
}
