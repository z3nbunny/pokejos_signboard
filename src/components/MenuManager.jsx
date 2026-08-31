import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
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
import MeatMenuPreview from './MeatMenuPreview';
import MenuSpotlightManager from './MenuSpotlightManager';
import { MEAT_MENU_SEED } from '../data/meatMenuSeed';

const DEFAULT_MEAT_AVAILABLE_ON = [
    'plates',
    'sandwiches',
    'by_pound'
];

const EDITABLE_MEAT_CONTEXTS = [
    {
        id: 'plates',
        label: 'Available on Plates'
    },
    {
        id: 'sandwiches',
        label: 'Available on Sandwiches'
    }
];

const DEFAULT_DISPLAY_NOTICES = {
    platesAndSandwichesBrisketUpchargeCents: 200,
    specialtyBrisketUpchargeCents: 100,
    glutenDisclaimer:
        'Products are prepared in a shared kitchen. Cross-contact with gluten and other allergens is possible. Please tell our team about any allergies.',
    glutenDisclaimerEs:
        'Los productos se preparan en una cocina compartida. Puede haber contacto cruzado con gluten y otros alérgenos. Informe a nuestro personal sobre cualquier alergia.'
};

function PriceInput({
    priceCents,
    onChange,
    disabled
}) {
    const formatPrice = (cents) =>
        (Number(cents || 0) / 100).toFixed(2);

    const [displayValue, setDisplayValue] = useState(
        formatPrice(priceCents)
    );

    const [isEditing, setIsEditing] =
        useState(false);

    const handleChange = (event) => {
        const nextValue = event.target.value;

        /*
         * Allow an empty value while editing, whole dollars,
         * and no more than two decimal places.
         */
        if (
            !/^\d*(\.\d{0,2})?$/.test(nextValue)
        ) {
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
                    Math.round(
                        numericValue * 100
                    )
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
                onChange={handleChange}
                onBlur={finishEditing}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.currentTarget.blur();
                    }
                }}
                disabled={disabled}
                className="w-full bg-surface border border-border rounded-xl py-2.5 pl-7 pr-3 text-sm font-bold focus:ring-2 focus:ring-accent focus:outline-none disabled:opacity-50"
            />
        </div>
    );
}

/*
 * ID strategy:
 *
 * Items defined in the bootstrap seed use stable semantic
 * IDs to keep the template readable and maintainable.
 *
 * Items created through the Admin Dashboard receive generated,
 * immutable IDs to prevent collisions and allow names to change
 * without breaking sold-out, Spotlight or revision references.
 *
 * Both ID formats are valid. An ID must never be rewritten after
 * another document may reference it.
 */

const createEditorId = (prefix) => {
    const randomPart =
        typeof crypto !== 'undefined'
            && typeof crypto.randomUUID === 'function'
            ? crypto
                .randomUUID()
                .replace(/-/g, '')
                .slice(0, 12)
            : Date.now().toString(36)
            + Math.random()
                .toString(36)
                .slice(2, 8);

    return `${prefix}_${randomPart}`;
};

const parseAdjustmentCents = (value) => {
    const trimmedValue = String(value).trim();

    if (
        trimmedValue === ''
        || trimmedValue === '+'
        || trimmedValue === '-'
        || trimmedValue === '.'
        || trimmedValue === '+.'
        || trimmedValue === '-.'
    ) {
        return 0;
    }

    if (
        !/^[+-]?(?:\d+\.?\d{0,2}|\.\d{1,2})$/.test(
            trimmedValue
        )
    ) {
        return 0;
    }

    const numericValue = Number(trimmedValue);

    if (!Number.isFinite(numericValue)) {
        return 0;
    }

    return Math.round(numericValue * 100);
};

const formatCurrency = (priceCents) =>
    `$${(Number(priceCents || 0) / 100).toFixed(2)}`;

const buildPriceAdjustmentPreview = (
    menu,
    adjustmentCents
) => {
    if (!menu || adjustmentCents === 0) {
        return [];
    }

    const previewRows = [];

    for (const section of menu.sections || []) {
        for (const item of section.items || []) {
            if (item.bulkPriceEligible === false) {
                continue;
            }

            for (
                const priceOption
                of item.priceOptions || []
            ) {
                previewRows.push({
                    sectionId: section.id,
                    sectionTitle: section.title,
                    itemId: item.id,
                    itemName: item.name,
                    itemEnabled: item.enabled,
                    priceId: priceOption.id,
                    priceLabel:
                        priceOption.label || '',
                    oldPriceCents:
                        priceOption.priceCents,
                    newPriceCents:
                        priceOption.priceCents
                        + adjustmentCents
                });
            }
        }
    }

    return previewRows;
};

function MenuItemEditor({
    sectionId,
    item,
    isHighlighted,
    itemIndex,
    itemCount,
    onItemChange,
    onPriceChange,
    onMoveItem,
    onDeleteItem,
    onAddPrice,
    onDeletePrice
}) {
    const effectiveAvailableOn =
        Array.isArray(item.availableOn)
            ? item.availableOn
            : DEFAULT_MEAT_AVAILABLE_ON;

    const dietaryFlags =
        Array.isArray(item.dietaryFlags)
            ? item.dietaryFlags
            : [];

    const handleOrderingContextChange = (
        orderingContext,
        checked
    ) => {
        const updatedContexts = checked
            ? Array.from(
                new Set([
                    ...effectiveAvailableOn,
                    orderingContext,
                    'by_pound'
                ])
            )
            : effectiveAvailableOn.filter(
                (context) =>
                    context !== orderingContext
            );

        onItemChange(
            sectionId,
            item.id,
            'availableOn',
            Array.from(
                new Set([
                    ...updatedContexts,
                    'by_pound'
                ])
            )
        );
    };

    const handleDietaryFlagChange = (
        dietaryFlag,
        checked
    ) => {
        const updatedFlags = checked
            ? Array.from(
                new Set([
                    ...dietaryFlags,
                    dietaryFlag
                ])
            )
            : dietaryFlags.filter(
                (flag) =>
                    flag !== dietaryFlag
            );

        onItemChange(
            sectionId,
            item.id,
            'dietaryFlags',
            updatedFlags
        );
    };

    return (
        <article
            id={`menu-item-${item.id}`}
            className={`border-2 rounded-2xl p-4 space-y-4 transition-all duration-300 ${isHighlighted
                ? 'bg-surface border-blue-500 ring-4 ring-blue-500/20 shadow-lg'
                : item.enabled
                    ? 'bg-surface border-border shadow-sm'
                    : 'bg-bg border-border opacity-70'
                }`}
        >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                        Item ID
                    </p>

                    <code className="text-xs">
                        {item.id}
                    </code>
                    {isHighlighted && (
                        <span className="inline-block ml-3 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            New Item
                        </span>
                    )}

                    {item.sharedProductKey && (
                        <span
                            title={
                                `Shared product: ${item.sharedProductKey
                                }`
                            }
                            className="inline-block ml-2 px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        >
                            Linked Product
                        </span>
                    )}

                    {(
                        sectionId === 'meat_by_pound'
                            ? effectiveAvailableOn
                            : item.availableOn || []
                    ).map(
                        (orderingContext) => (
                            <span
                                key={orderingContext}
                                className="inline-block ml-2 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            >
                                {orderingContext.replace(
                                    /_/g,
                                    ' '
                                )}
                            </span>
                        )
                    )}

                    {item.orderAt && (
                        <span className="inline-block ml-2 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Order at {item.orderAt}
                        </span>
                    )}
                </div>

                <div className="flex items-center flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            onMoveItem(
                                sectionId,
                                item.id,
                                -1
                            )
                        }
                        disabled={itemIndex === 0}
                        className="px-3 py-2 bg-bg hover:bg-border disabled:opacity-30 border border-border rounded-lg text-xs font-bold"
                    >
                        ↑ Move Up
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            onMoveItem(
                                sectionId,
                                item.id,
                                1
                            )
                        }
                        disabled={
                            itemIndex === itemCount - 1
                        }
                        className="px-3 py-2 bg-bg hover:bg-border disabled:opacity-30 border border-border rounded-lg text-xs font-bold"
                    >
                        ↓ Move Down
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            onDeleteItem(
                                sectionId,
                                item
                            )
                        }
                        className="px-3 py-2 bg-bg hover:bg-danger hover:text-white border border-border rounded-lg text-xs font-bold transition-colors"
                    >
                        Delete
                    </button>

                    <label className="flex items-center gap-2 ml-2 cursor-pointer">
                        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                            {item.enabled
                                ? 'Visible'
                                : 'Hidden'}
                        </span>

                        <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(event) =>
                                onItemChange(
                                    sectionId,
                                    item.id,
                                    'enabled',
                                    event.target.checked
                                )
                            }
                            className="w-5 h-5 accent-accent"
                        />
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                    <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                        English Item Name
                    </label>

                    <input
                        type="text"
                        value={item.name}
                        onChange={(event) =>
                            onItemChange(
                                sectionId,
                                item.id,
                                'name',
                                event.target.value
                            )
                        }
                        className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                    />
                </div>

                <div>
                    <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                        Spanish Item Name
                    </label>

                    <input
                        type="text"
                        value={item.nameEs || ''}
                        placeholder="Optional Spanish display name"
                        onChange={(event) =>
                            onItemChange(
                                sectionId,
                                item.id,
                                'nameEs',
                                event.target.value
                            )
                        }
                        className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                    />
                </div>
            </div>

            <div>
                <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                    Description
                </label>

                <input
                    type="text"
                    value={item.description || ''}
                    onChange={(event) =>
                        onItemChange(
                            sectionId,
                            item.id,
                            'description',
                            event.target.value
                        )
                    }
                    className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                />
            </div>

            <div>
                <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                    Detail Lines
                </label>

                <textarea
                    value={(item.details || []).join('\n')}
                    onChange={(event) =>
                        onItemChange(
                            sectionId,
                            item.id,
                            'details',
                            event.target.value.split('\n')
                        )
                    }
                    rows="3"
                    placeholder="One detail per line"
                    className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-accent focus:outline-none resize-y"
                />
            </div>

            <div>
                <div className="flex items-center justify-between gap-4 mb-2">
                    <p className="text-[11px] uppercase tracking-wider text-text-secondary font-bold">
                        Prices
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            onAddPrice(
                                sectionId,
                                item.id
                            )
                        }
                        className="px-3 py-1.5 bg-bg hover:bg-border border border-border rounded-lg text-xs font-bold"
                    >
                        + Add Price Option
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {(item.priceOptions || []).map(
                        (priceOption) => (
                            <div
                                key={priceOption.id}
                                className="grid grid-cols-[minmax(0,1fr)_8rem_auto] gap-3 items-end bg-bg border border-border rounded-xl p-3"
                            >
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-text-secondary block mb-1">
                                        Label
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            priceOption.label
                                            || ''
                                        }
                                        placeholder="Optional label"
                                        onChange={(event) =>
                                            onPriceChange(
                                                sectionId,
                                                item.id,
                                                priceOption.id,
                                                'label',
                                                event.target.value
                                            )
                                        }
                                        className="w-full bg-surface border border-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-text-secondary block mb-1">
                                        Price
                                    </label>

                                    <PriceInput
                                        priceCents={
                                            priceOption.priceCents
                                        }
                                        onChange={(priceCents) =>
                                            onPriceChange(
                                                sectionId,
                                                item.id,
                                                priceOption.id,
                                                'priceCents',
                                                priceCents
                                            )
                                        }
                                    />
                                </div>

                                <button
                                    type="button"
                                    title="Remove price option"
                                    onClick={() =>
                                        onDeletePrice(
                                            sectionId,
                                            item.id,
                                            priceOption
                                        )
                                    }
                                    disabled={
                                        item.priceOptions.length
                                        <= 1
                                    }
                                    className="h-[42px] px-3 bg-surface hover:bg-danger hover:text-white disabled:opacity-30 border border-border rounded-lg font-bold transition-colors"
                                >
                                    ×
                                </button>
                            </div>
                        )
                    )}
                </div>
            </div>
            {sectionId === 'meat_by_pound' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                    <div>
                        <p className="text-[11px] uppercase tracking-wider text-text-secondary font-bold">
                            Meat Ordering Information
                        </p>

                        <p className="text-xs text-text-secondary mt-1">
                            Controls how this meat appears in customer-facing
                            choice lists and menu messaging.
                        </p>
                    </div>

                    <div>
                        <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                            Customer-Facing Choice Label
                        </label>

                        <input
                            type="text"
                            value={
                                item.choiceLabel
                                || item.name
                                || ''
                            }
                            onChange={(event) =>
                                onItemChange(
                                    sectionId,
                                    item.id,
                                    'choiceLabel',
                                    event.target.value
                                )
                            }
                            placeholder="Example: Pulled Pork"
                            className="w-full bg-surface border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {EDITABLE_MEAT_CONTEXTS.map(
                            (orderingContext) => (
                                <label
                                    key={orderingContext.id}
                                    className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={
                                            effectiveAvailableOn.includes(
                                                orderingContext.id
                                            )
                                        }
                                        onChange={(event) =>
                                            handleOrderingContextChange(
                                                orderingContext.id,
                                                event.target.checked
                                            )
                                        }
                                        className="w-5 h-5 accent-accent"
                                    />

                                    <span className="text-sm font-bold">
                                        {orderingContext.label}
                                    </span>
                                </label>
                            )
                        )}

                        <div className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3">
                            <span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center font-bold">
                                ✓
                            </span>

                            <div>
                                <p className="text-sm font-bold">
                                    Available By the Pound
                                </p>

                                <p className="text-xs text-text-secondary">
                                    Required in this section
                                </p>
                            </div>
                        </div>

                        <label className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={
                                    dietaryFlags.includes(
                                        'gluten_free'
                                    )
                                }
                                onChange={(event) =>
                                    handleDietaryFlagChange(
                                        'gluten_free',
                                        event.target.checked
                                    )
                                }
                                className="w-5 h-5 accent-accent"
                            />

                            <span className="text-sm font-bold">
                                Gluten Free
                            </span>
                        </label>
                    </div>
                </div>
            )}
            <label className="flex items-center gap-3 bg-bg border border-border rounded-xl p-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={
                        item.bulkPriceEligible !== false
                    }
                    onChange={(event) =>
                        onItemChange(
                            sectionId,
                            item.id,
                            'bulkPriceEligible',
                            event.target.checked
                        )
                    }
                    className="w-5 h-5 accent-accent"
                />

                <div>
                    <p className="text-sm font-bold">
                        Include in uniform price adjustments
                    </p>

                    <p className="text-xs text-text-secondary">
                        Spotlights and specials remain separate
                        and will not be affected.
                    </p>
                </div>
            </label>
        </article>
    );
}

function MenuModifierEditor({
    sectionId,
    modifier,
    modifierIndex,
    modifierCount,
    onModifierChange,
    onMoveModifier,
    onDeleteModifier
}) {
    return (
        <article
            className={`border rounded-2xl p-4 space-y-4 ${modifier.enabled
                ? 'bg-white border-amber-300 shadow-sm'
                : 'bg-bg border-border opacity-70'
                }`}
        >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                        Modifier ID
                    </p>

                    <code className="text-xs">
                        {modifier.id}
                    </code>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            onMoveModifier(
                                sectionId,
                                modifier.id,
                                -1
                            )
                        }
                        disabled={modifierIndex === 0}
                        className="px-3 py-2 bg-bg hover:bg-border disabled:opacity-30 border border-border rounded-lg text-xs font-bold"
                    >
                        ↑ Move Up
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            onMoveModifier(
                                sectionId,
                                modifier.id,
                                1
                            )
                        }
                        disabled={
                            modifierIndex
                            === modifierCount - 1
                        }
                        className="px-3 py-2 bg-bg hover:bg-border disabled:opacity-30 border border-border rounded-lg text-xs font-bold"
                    >
                        ↓ Move Down
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            onDeleteModifier(
                                sectionId,
                                modifier
                            )
                        }
                        className="px-3 py-2 bg-bg hover:bg-danger hover:text-white border border-border rounded-lg text-xs font-bold transition-colors"
                    >
                        Delete
                    </button>

                    <label className="flex items-center gap-2 ml-2 cursor-pointer">
                        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                            {modifier.enabled
                                ? 'Visible'
                                : 'Hidden'}
                        </span>

                        <input
                            type="checkbox"
                            checked={modifier.enabled}
                            onChange={(event) =>
                                onModifierChange(
                                    sectionId,
                                    modifier.id,
                                    'enabled',
                                    event.target.checked
                                )
                            }
                            className="w-5 h-5 accent-accent"
                        />
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_10rem] gap-4">
                <div>
                    <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                        Customer-Facing Label
                    </label>

                    <input
                        type="text"
                        value={modifier.label}
                        onChange={(event) =>
                            onModifierChange(
                                sectionId,
                                modifier.id,
                                'label',
                                event.target.value
                            )
                        }
                        className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                    />
                </div>

                <div>
                    <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                        Price
                    </label>

                    <PriceInput
                        priceCents={
                            modifier.priceCents
                        }
                        onChange={(priceCents) =>
                            onModifierChange(
                                sectionId,
                                modifier.id,
                                'priceCents',
                                priceCents
                            )
                        }
                    />
                </div>
            </div>

            <div>
                <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                    Internal Explanation
                </label>

                <input
                    type="text"
                    value={modifier.description || ''}
                    placeholder="Example: Charged once per plate"
                    onChange={(event) =>
                        onModifierChange(
                            sectionId,
                            modifier.id,
                            'description',
                            event.target.value
                        )
                    }
                    className="w-full bg-bg border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                />
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-300 p-3">
                <p className="text-xs text-amber-900 font-bold">
                    Manual price only
                </p>

                <p className="text-xs text-amber-800 mt-1">
                    Section modifiers are always excluded from
                    uniform price adjustments.
                </p>
            </div>
        </article>
    );
}

function MenuSectionEditor({
    section,
    isOpen,
    highlightedItemId,
    onToggle,
    onSectionChange,
    onItemChange,
    onPriceChange,
    onAddItem,
    onMoveItem,
    onDeleteItem,
    onAddPrice,
    onDeletePrice,
    onAddModifier,
    onModifierChange,
    onMoveModifier,
    onDeleteModifier
}) {
    const visibleItemCount = (
        section.items || []
    ).filter((item) => item.enabled).length;

    return (
        <section className="border-2 border-border rounded-3xl overflow-hidden bg-surface shadow-sm">
            <div className="relative flex items-center gap-4 p-5 pl-10 bg-surface">
                <span
                    aria-hidden="true"
                    className="absolute left-3 top-4 bottom-4 w-1.5 rounded-full bg-accent pointer-events-none"
                />                <button
                    type="button"
                    onClick={onToggle}
                    className="flex-1 text-left"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-black">
                            {isOpen ? '−' : '+'}
                        </span>

                        <div>
                            <h3 className="text-lg font-bold">
                                {section.title}
                            </h3>

                            <p className="text-xs text-text-secondary mt-1">
                                {visibleItemCount} of{' '}
                                {section.items?.length || 0}{' '}
                                items visible
                            </p>
                        </div>
                    </div>
                </button>

                <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs uppercase tracking-wider font-bold text-text-secondary">
                        {section.enabled
                            ? 'Section Visible'
                            : 'Section Hidden'}
                    </span>

                    <input
                        type="checkbox"
                        checked={section.enabled}
                        onChange={(event) =>
                            onSectionChange(
                                section.id,
                                'enabled',
                                event.target.checked
                            )
                        }
                        className="w-5 h-5 accent-accent"
                    />
                </label>
            </div>

            {isOpen && (
                <div className="border-t border-border bg-bg/60 p-5 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                                Section Title
                            </label>

                            <input
                                type="text"
                                value={section.title}
                                onChange={(event) =>
                                    onSectionChange(
                                        section.id,
                                        'title',
                                        event.target.value
                                    )
                                }
                                className="w-full bg-surface border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                                Section Subtitle
                            </label>

                            <input
                                type="text"
                                value={section.subtitle || ''}
                                onChange={(event) =>
                                    onSectionChange(
                                        section.id,
                                        'subtitle',
                                        event.target.value
                                    )
                                }
                                className="w-full bg-surface border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h4 className="text-sm font-bold uppercase tracking-wider">
                                    Section Modifiers
                                </h4>

                                <p className="text-xs text-text-secondary mt-1">
                                    Add-ons and upcharges shown with
                                    this section. Their prices are
                                    always adjusted manually.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    onAddModifier(
                                        section.id
                                    )
                                }
                                className="px-4 py-2 bg-bg hover:bg-border border border-border rounded-full text-xs font-bold uppercase tracking-wider"
                            >
                                + Add Modifier
                            </button>
                        </div>

                        {(section.modifiers || []).length === 0 ? (
                            <div className="border border-dashed border-border rounded-xl p-4 text-center">
                                <p className="text-xs text-text-secondary">
                                    No modifiers in this section.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {(section.modifiers || []).map(
                                    (
                                        modifier,
                                        modifierIndex
                                    ) => (
                                        <MenuModifierEditor
                                            key={
                                                modifier.id
                                            }
                                            sectionId={
                                                section.id
                                            }
                                            modifier={
                                                modifier
                                            }
                                            modifierIndex={
                                                modifierIndex
                                            }
                                            modifierCount={
                                                section
                                                    .modifiers
                                                    .length
                                            }
                                            onModifierChange={
                                                onModifierChange
                                            }
                                            onMoveModifier={
                                                onMoveModifier
                                            }
                                            onDeleteModifier={
                                                onDeleteModifier
                                            }
                                        />
                                    )
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h4 className="text-sm font-bold uppercase tracking-wider">
                                Menu Items
                            </h4>

                            <p className="text-xs text-text-secondary mt-1">
                                Customer-facing products and their prices.
                            </p>
                        </div>

                        <span className="px-3 py-1 bg-surface border border-border rounded-full text-xs font-bold text-text-secondary">
                            {section.items?.length || 0} Items
                        </span>
                    </div>
                    <div className="space-y-4">
                        {(section.items || []).map(
                            (item, itemIndex) => (
                                <MenuItemEditor
                                    key={item.id}
                                    sectionId={section.id}
                                    item={item}
                                    isHighlighted={
                                        highlightedItemId === item.id
                                    }
                                    itemIndex={itemIndex}
                                    itemCount={
                                        section.items.length
                                    }
                                    onItemChange={
                                        onItemChange
                                    }
                                    onPriceChange={
                                        onPriceChange
                                    }
                                    onMoveItem={
                                        onMoveItem
                                    }
                                    onDeleteItem={
                                        onDeleteItem
                                    }
                                    onAddPrice={
                                        onAddPrice
                                    }
                                    onDeletePrice={
                                        onDeletePrice
                                    }
                                />
                            )
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            onAddItem(section.id)
                        }
                        className="w-full py-3 bg-accent-light hover:bg-blue-100 border-2 border-dashed border-accent text-accent rounded-2xl text-sm font-bold uppercase tracking-wider transition-colors"                    >
                        + Add Menu Item
                    </button>
                </div>
            )}
        </section>
    );
}

export default function MenuManager() {
    const { currentUser, userData } = useAuth();

    const [draftMenu, setDraftMenu] = useState(null);
    const [savedDraftMenu, setSavedDraftMenu] =
        useState(null);

    const [openSections, setOpenSections] =
        useState(new Set());

    const [
        highlightedItemId,
        setHighlightedItemId
    ] = useState(null);

    const [
        isPreviewOpen,
        setIsPreviewOpen
    ] = useState(false);

    const [
        previewSpotlight,
        setPreviewSpotlight
    ] = useState(null);

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

    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] =
        useState(false);

    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] =
        useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] =
        useState(false);

    const [message, setMessage] = useState('');

    const [
        priceAdjustmentInput,
        setPriceAdjustmentInput
    ] = useState('');

    const [
        priceAdjustmentBackup,
        setPriceAdjustmentBackup
    ] = useState(null);

    useEffect(() => {
        if (userData?.role !== 'super_admin') {
            return;
        }

        const draftRef = doc(
            db,
            'globalMenuDrafts',
            'meat'
        );

        const unsubscribe = onSnapshot(
            draftRef,
            (snapshot) => {
                const storedDraft = snapshot.exists()
                    ? snapshot.data()
                    : null;

                const loadedDraft = storedDraft
                    ? {
                        ...storedDraft,
                        displayNotices: {
                            ...DEFAULT_DISPLAY_NOTICES,
                            ...(
                                storedDraft.displayNotices
                                || {}
                            )
                        }
                    }
                    : null;

                setDraftMenu(loadedDraft);
                setSavedDraftMenu(loadedDraft);
                setHasUnsavedChanges(false);
                setPriceAdjustmentBackup(null);
                setPriceAdjustmentInput('');
                setLoading(false);
                setHighlightedItemId(null);
            },
            (error) => {
                console.error(
                    'Unable to load Meat Menu draft:',
                    error
                );

                setMessage(
                    'Unable to load the Meat Menu draft.'
                );

                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userData?.role]);

    useEffect(() => {
        if (!highlightedItemId) {
            return;
        }

        const animationFrame =
            requestAnimationFrame(() => {
                const itemElement =
                    document.getElementById(
                        `menu-item-${highlightedItemId}`
                    );

                itemElement?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            });

        return () =>
            cancelAnimationFrame(animationFrame);
    }, [highlightedItemId]);

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

    const updateDisplayNotice = (
        field,
        value
    ) => {
        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            displayNotices: {
                ...DEFAULT_DISPLAY_NOTICES,
                ...(
                    currentDraft.displayNotices
                    || {}
                ),
                [field]: value
            }
        }));
    };

    const updateSection = (
        sectionId,
        field,
        value
    ) => {
        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            sections: currentDraft.sections.map(
                (section) =>
                    section.id === sectionId
                        ? {
                            ...section,
                            [field]: value
                        }
                        : section
            )
        }));
    };
    const addModifier = (sectionId) => {
        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            sections: currentDraft.sections.map(
                (section) => {
                    if (section.id !== sectionId) {
                        return section;
                    }

                    const currentModifiers =
                        section.modifiers || [];

                    return {
                        ...section,
                        modifiers: [
                            ...currentModifiers,
                            {
                                id:
                                    createEditorId(
                                        'modifier'
                                    ),
                                label: 'New Modifier',
                                description: '',
                                priceCents: 0,
                                bulkPriceEligible: false,
                                enabled: true,
                                order:
                                    (
                                        currentModifiers.length
                                        + 1
                                    ) * 10
                            }
                        ]
                    };
                }
            )
        }));
    };

    const updateModifier = (
        sectionId,
        modifierId,
        field,
        value
    ) => {
        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            sections: currentDraft.sections.map(
                (section) =>
                    section.id === sectionId
                        ? {
                            ...section,
                            modifiers:
                                (
                                    section.modifiers
                                    || []
                                ).map(
                                    (modifier) =>
                                        modifier.id
                                            === modifierId
                                            ? {
                                                ...modifier,
                                                [field]: value,
                                                bulkPriceEligible:
                                                    false
                                            }
                                            : modifier
                                )
                        }
                        : section
            )
        }));
    };

    const moveModifier = (
        sectionId,
        modifierId,
        direction
    ) => {
        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            sections: currentDraft.sections.map(
                (section) => {
                    if (section.id !== sectionId) {
                        return section;
                    }

                    const reorderedModifiers = [
                        ...(section.modifiers || [])
                    ];

                    const currentIndex =
                        reorderedModifiers.findIndex(
                            (modifier) =>
                                modifier.id
                                === modifierId
                        );

                    const targetIndex =
                        currentIndex + direction;

                    if (
                        currentIndex < 0
                        || targetIndex < 0
                        || targetIndex
                        >= reorderedModifiers.length
                    ) {
                        return section;
                    }

                    [
                        reorderedModifiers[currentIndex],
                        reorderedModifiers[targetIndex]
                    ] = [
                            reorderedModifiers[targetIndex],
                            reorderedModifiers[currentIndex]
                        ];

                    return {
                        ...section,
                        modifiers:
                            reorderedModifiers.map(
                                (
                                    modifier,
                                    index
                                ) => ({
                                    ...modifier,
                                    order:
                                        (index + 1) * 10,
                                    bulkPriceEligible:
                                        false
                                })
                            )
                    };
                }
            )
        }));
    };

    const deleteModifier = (
        sectionId,
        modifier
    ) => {
        const confirmed = window.confirm(
            `Remove "${modifier.label}" from the `
            + 'private Meat Menu draft?\n\n'
            + 'You can still use Discard Changes '
            + 'before saving.'
        );

        if (!confirmed) {
            return;
        }

        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            sections: currentDraft.sections.map(
                (section) =>
                    section.id === sectionId
                        ? {
                            ...section,
                            modifiers:
                                (
                                    section.modifiers
                                    || []
                                )
                                    .filter(
                                        (
                                            currentModifier
                                        ) =>
                                            currentModifier.id
                                            !== modifier.id
                                    )
                                    .map(
                                        (
                                            currentModifier,
                                            index
                                        ) => ({
                                            ...currentModifier,
                                            order:
                                                (index + 1)
                                                * 10,
                                            bulkPriceEligible:
                                                false
                                        })
                                    )
                        }
                        : section
            )
        }));
    };
    const updateItem = (
        sectionId,
        itemId,
        field,
        value
    ) => {
        applyDraftUpdate((currentDraft) => {
            const sourceItem =
                currentDraft.sections
                    .flatMap(
                        (section) =>
                            section.items || []
                    )
                    .find(
                        (item) =>
                            item.id === itemId
                    );

            /*
             * Linked placements share their customer-facing
             * English and Spanish names and bulk-price
             * eligibility. Visibility and descriptions remain
             * placement-specific.
             */
            const synchronizeLinkedItems =
                Boolean(
                    sourceItem?.sharedProductKey
                )
                && [
                    'name',
                    'nameEs',
                    'bulkPriceEligible'
                ].includes(field);

            return {
                ...currentDraft,
                sections:
                    currentDraft.sections.map(
                        (section) => ({
                            ...section,
                            items:
                                (
                                    section.items
                                    || []
                                ).map((item) => {
                                    const isSourceItem =
                                        section.id
                                        === sectionId
                                        && item.id
                                        === itemId;

                                    const isLinkedItem =
                                        synchronizeLinkedItems
                                        && item
                                            .sharedProductKey
                                        === sourceItem
                                            .sharedProductKey;

                                    if (
                                        !isSourceItem
                                        && !isLinkedItem
                                    ) {
                                        return item;
                                    }

                                    const updatedItem = {
                                        ...item,
                                        [field]: value
                                    };

                                    if (
                                        isSourceItem
                                        && section.id === 'meat_by_pound'
                                        && field === 'name'
                                        && (
                                            !item.choiceLabel
                                            || item.choiceLabel === item.name
                                        )
                                    ) {
                                        return {
                                            ...updatedItem,
                                            choiceLabel: value
                                        };
                                    }

                                    return updatedItem;
                                })
                        })
                    )
            };
        });
    };

    const updatePrice = (
        sectionId,
        itemId,
        priceId,
        field,
        value
    ) => {
        if (field === 'priceCents') {
            setPriceAdjustmentBackup(null);
        }

        applyDraftUpdate((currentDraft) => {
            const sourceItem =
                currentDraft.sections
                    .flatMap(
                        (section) =>
                            section.items || []
                    )
                    .find(
                        (item) =>
                            item.id === itemId
                    );

            const sharedProductKey =
                sourceItem?.sharedProductKey;

            return {
                ...currentDraft,
                sections:
                    currentDraft.sections.map(
                        (section) => ({
                            ...section,
                            items:
                                (
                                    section.items
                                    || []
                                ).map((item) => {
                                    const isSourceItem =
                                        section.id
                                        === sectionId
                                        && item.id
                                        === itemId;

                                    const isLinkedItem =
                                        Boolean(
                                            sharedProductKey
                                        )
                                        && item
                                            .sharedProductKey
                                        === sharedProductKey;

                                    if (
                                        !isSourceItem
                                        && !isLinkedItem
                                    ) {
                                        return item;
                                    }

                                    return {
                                        ...item,
                                        priceOptions:
                                            (
                                                item
                                                    .priceOptions
                                                || []
                                            ).map(
                                                (
                                                    priceOption
                                                ) =>
                                                    priceOption.id
                                                        === priceId
                                                        ? {
                                                            ...priceOption,
                                                            [field]:
                                                                value
                                                        }
                                                        : priceOption
                                            )
                                    };
                                })
                        })
                    )
            };
        });
    };

    const addItem = (sectionId) => {
        const newItemId =
            createEditorId('item');

        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            sections: currentDraft.sections.map(
                (section) => {
                    if (section.id !== sectionId) {
                        return section;
                    }

                    const currentItems =
                        section.items || [];

                    return {
                        ...section,
                        items: [
                            ...currentItems,
                            {
                                id: newItemId,
                                name: 'New Menu Item',
                                nameEs: '',
                                description: '',
                                details: [],
                                priceOptions: [
                                    {
                                        id:
                                            createEditorId(
                                                'price'
                                            ),
                                        label: '',
                                        priceCents: 0
                                    }
                                ],
                                dietaryFlags:
                                    sectionId === 'meat_by_pound'
                                        ? ['gluten_free']
                                        : [],

                                ...(sectionId === 'meat_by_pound'
                                    ? {
                                        choiceLabel:
                                            'New Menu Item',
                                        availableOn:
                                            DEFAULT_MEAT_AVAILABLE_ON
                                    }
                                    : {}),

                                bulkPriceEligible: true,
                                enabled: true,
                                order:
                                    (
                                        currentItems.length
                                        + 1
                                    ) * 10
                            }
                        ]
                    };
                }
            )
        }));

        setHighlightedItemId(newItemId);

        setOpenSections((current) => {
            const next = new Set(current);
            next.add(sectionId);
            return next;
        });
    };

    const moveItem = (
        sectionId,
        itemId,
        direction
    ) => {
        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            sections: currentDraft.sections.map(
                (section) => {
                    if (section.id !== sectionId) {
                        return section;
                    }

                    const reorderedItems = [
                        ...(section.items || [])
                    ];

                    const currentIndex =
                        reorderedItems.findIndex(
                            (item) => item.id === itemId
                        );

                    const targetIndex =
                        currentIndex + direction;

                    if (
                        currentIndex < 0
                        || targetIndex < 0
                        || targetIndex
                        >= reorderedItems.length
                    ) {
                        return section;
                    }

                    [
                        reorderedItems[currentIndex],
                        reorderedItems[targetIndex]
                    ] = [
                            reorderedItems[targetIndex],
                            reorderedItems[currentIndex]
                        ];

                    return {
                        ...section,
                        items: reorderedItems.map(
                            (item, index) => ({
                                ...item,
                                order: (index + 1) * 10
                            })
                        )
                    };
                }
            )
        }));
    };

    const deleteItem = (sectionId, item) => {
        const confirmed = window.confirm(
            `Remove "${item.name}" from the `
            + 'private Meat Menu draft?\n\n'
            + 'You can still use Discard Changes '
            + 'before saving.'
        );

        if (!confirmed) {
            return;
        }

        if (highlightedItemId === item.id) {
            setHighlightedItemId(null);
        }

        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            sections: currentDraft.sections.map(
                (section) =>
                    section.id === sectionId
                        ? {
                            ...section,
                            items: section.items
                                .filter(
                                    (currentItem) =>
                                        currentItem.id
                                        !== item.id
                                )
                                .map(
                                    (
                                        currentItem,
                                        index
                                    ) => ({
                                        ...currentItem,
                                        order:
                                            (index + 1) * 10
                                    })
                                )
                        }
                        : section
            )
        }));
    };

    const addPrice = (
        sectionId,
        itemId
    ) => {
        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            sections: currentDraft.sections.map(
                (section) =>
                    section.id === sectionId
                        ? {
                            ...section,
                            items: section.items.map(
                                (item) =>
                                    item.id === itemId
                                        ? {
                                            ...item,
                                            priceOptions: [
                                                ...item.priceOptions,
                                                {
                                                    id:
                                                        createEditorId(
                                                            'price'
                                                        ),
                                                    label:
                                                        'New Option',
                                                    priceCents:
                                                        0
                                                }
                                            ]
                                        }
                                        : item
                            )
                        }
                        : section
            )
        }));
    };

    const deletePrice = (
        sectionId,
        itemId,
        priceOption
    ) => {
        const confirmed = window.confirm(
            `Remove the price option "${priceOption.label || 'Unlabeled'
            }" from this draft item?`
        );

        if (!confirmed) {
            return;
        }

        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            sections: currentDraft.sections.map(
                (section) =>
                    section.id === sectionId
                        ? {
                            ...section,
                            items: section.items.map(
                                (item) =>
                                    item.id === itemId
                                        ? {
                                            ...item,
                                            priceOptions:
                                                item.priceOptions.filter(
                                                    (
                                                        currentPrice
                                                    ) =>
                                                        currentPrice.id
                                                        !== priceOption.id
                                                )
                                        }
                                        : item
                            )
                        }
                        : section
            )
        }));
    };

    const toggleSection = (sectionId) => {
        setOpenSections((current) => {
            const next = new Set(current);

            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }

            return next;
        });
    };

    const handlePriceAdjustmentInput = (event) => {
        const nextValue = event.target.value;

        /*
         * Accept positive or negative dollar amounts with
         * up to two decimal places.
         */
        if (
            /^[+-]?\d*(?:\.\d{0,2})?$/.test(
                nextValue
            )
        ) {
            setPriceAdjustmentInput(nextValue);
        }
    };

    const applyPriceAdjustment = () => {
        const adjustmentCents =
            parseAdjustmentCents(
                priceAdjustmentInput
            );

        if (adjustmentCents === 0) {
            setMessage(
                'Enter a non-zero price adjustment.'
            );

            return;
        }

        const previewRows =
            buildPriceAdjustmentPreview(
                draftMenu,
                adjustmentCents
            );

        if (previewRows.length === 0) {
            setMessage(
                'No menu prices are eligible for adjustment.'
            );

            return;
        }

        const invalidResult = previewRows.find(
            (row) => row.newPriceCents <= 0
        );

        if (invalidResult) {
            setMessage(
                `The adjustment would make ${invalidResult.itemName
                } ${invalidResult.priceLabel
                    ? `(${invalidResult.priceLabel}) `
                    : ''
                }zero or negative. No prices were changed.`
            );

            return;
        }

        /*
         * Store only the affected price values. Undoing the
         * adjustment will not overwrite names, descriptions,
         * visibility, ordering, or other draft edits.
         */
        setPriceAdjustmentBackup(
            previewRows.map((row) => ({
                sectionId: row.sectionId,
                itemId: row.itemId,
                priceId: row.priceId,
                priceCents: row.oldPriceCents
            }))
        );

        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            sections: currentDraft.sections.map(
                (section) => ({
                    ...section,
                    items: (section.items || []).map(
                        (item) => {
                            if (
                                item.bulkPriceEligible
                                === false
                            ) {
                                return item;
                            }

                            return {
                                ...item,
                                priceOptions:
                                    (
                                        item.priceOptions
                                        || []
                                    ).map(
                                        (priceOption) => ({
                                            ...priceOption,
                                            priceCents:
                                                priceOption
                                                    .priceCents
                                                + adjustmentCents
                                        })
                                    )
                            };
                        }
                    )
                })
            )
        }));

        const direction =
            adjustmentCents > 0
                ? 'increase'
                : 'decrease';

        setPriceAdjustmentInput('');

        setMessage(
            `Draft ${direction} applied to `
            + `${previewRows.length} price options. `
            + 'Review the changes before saving.'
        );
    };

    const undoPriceAdjustment = () => {
        if (!priceAdjustmentBackup?.length) {
            return;
        }

        const backupMap = new Map(
            priceAdjustmentBackup.map(
                (backupPrice) => [
                    [
                        backupPrice.sectionId,
                        backupPrice.itemId,
                        backupPrice.priceId
                    ].join('|'),
                    backupPrice.priceCents
                ]
            )
        );

        applyDraftUpdate((currentDraft) => ({
            ...currentDraft,
            sections: currentDraft.sections.map(
                (section) => ({
                    ...section,
                    items: (section.items || []).map(
                        (item) => ({
                            ...item,
                            priceOptions:
                                (
                                    item.priceOptions
                                    || []
                                ).map(
                                    (priceOption) => {
                                        const key = [
                                            section.id,
                                            item.id,
                                            priceOption.id
                                        ].join('|');

                                        if (
                                            !backupMap.has(key)
                                        ) {
                                            return priceOption;
                                        }

                                        return {
                                            ...priceOption,
                                            priceCents:
                                                backupMap.get(
                                                    key
                                                )
                                        };
                                    }
                                )
                        })
                    )
                })
            )
        }));

        setPriceAdjustmentBackup(null);

        setMessage(
            'The last uniform price adjustment was undone.'
        );
    };

    const validateDraft = () => {
        if (!draftMenu.title?.trim()) {
            throw new Error(
                'The menu title cannot be empty.'
            );
        }

        const displayNotices = {
            ...DEFAULT_DISPLAY_NOTICES,
            ...(draftMenu.displayNotices || {})
        };

        if (
            !Number.isInteger(
                displayNotices
                    .platesAndSandwichesBrisketUpchargeCents
            )
            || displayNotices
                .platesAndSandwichesBrisketUpchargeCents
            < 0
        ) {
            throw new Error(
                'The plate and sandwich brisket upcharge is invalid.'
            );
        }

        if (
            !Number.isInteger(
                displayNotices
                    .specialtyBrisketUpchargeCents
            )
            || displayNotices
                .specialtyBrisketUpchargeCents
            < 0
        ) {
            throw new Error(
                'The specialty-item brisket upcharge is invalid.'
            );
        }

        if (!displayNotices.glutenDisclaimer?.trim()) {
            throw new Error(
                'The shared-kitchen disclaimer cannot be empty.'
            );
        }

        for (const section of draftMenu.sections) {
            if (!section.title?.trim()) {
                throw new Error(
                    'Every section must have a title.'
                );
            }

            for (
                const modifier
                of section.modifiers || []
            ) {
                if (!modifier.label?.trim()) {
                    throw new Error(
                        `A modifier in ${section.title} `
                        + 'is missing its label.'
                    );
                }

                if (
                    !Number.isInteger(
                        modifier.priceCents
                    )
                    || modifier.priceCents <= 0
                ) {
                    throw new Error(
                        `${modifier.label} must have a `
                        + 'price greater than zero.'
                    );
                }
            }

            for (const item of section.items || []) {
                if (!item.name?.trim()) {
                    throw new Error(
                        `An item in ${section.title} `
                        + 'is missing its name.'
                    );
                }

                if (!item.priceOptions?.length) {
                    throw new Error(
                        `${item.name} must have at least `
                        + 'one price.'
                    );
                }

                for (
                    const priceOption
                    of item.priceOptions
                ) {
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
        }
    };

    const createCleanSections = () =>
        draftMenu.sections.map((section) => ({
            ...section,
            title: section.title.trim(),
            subtitle:
                section.subtitle?.trim() || '',
            modifiers:
                (
                    section.modifiers || []
                ).map(
                    (modifier, index) => ({
                        ...modifier,
                        label:
                            modifier.label.trim(),
                        description:
                            modifier.description?.trim()
                            || '',
                        bulkPriceEligible: false,
                        enabled:
                            modifier.enabled !== false,
                        order: (index + 1) * 10
                    })
                ),
            items: (section.items || []).map(
                (item) => ({
                    ...item,
                    name: item.name.trim(),
                    nameEs:
                        item.nameEs?.trim() || '',
                    description:
                        item.description?.trim() || '',
                    details: (item.details || [])
                        .map((detail) => detail.trim())
                        .filter(Boolean),

                    dietaryFlags: Array.from(
                        new Set(item.dietaryFlags || [])
                    ),

                    ...(section.id === 'meat_by_pound'
                        ? {
                            choiceLabel: String(
                                item.choiceLabel
                                || item.name
                                || ''
                            ).trim(),

                            availableOn: Array.from(
                                new Set([
                                    ...(
                                        Array.isArray(item.availableOn)
                                            ? item.availableOn.filter(
                                                (context) =>
                                                    DEFAULT_MEAT_AVAILABLE_ON
                                                        .includes(context)
                                            )
                                            : DEFAULT_MEAT_AVAILABLE_ON
                                    ),
                                    'by_pound'
                                ])
                            )
                        }
                        : {}),

                    priceOptions:
                        item.priceOptions.map(
                            (priceOption) => ({
                                ...priceOption,
                                label:
                                    priceOption.label?.trim()
                                    || ''
                            })
                        )
                })
            )
        }));

    const handleSaveDraft = async () => {
        if (
            userData?.role !== 'super_admin'
            || !currentUser
            || !draftMenu
        ) {
            return;
        }

        setSaving(true);
        setMessage('');

        try {
            validateDraft();

            const cleanSections =
                createCleanSections();

            await updateDoc(
                doc(
                    db,
                    'globalMenuDrafts',
                    'meat'
                ),
                {
                    title: draftMenu.title.trim(),
                    subtitle:
                        draftMenu.subtitle?.trim() || '',
                    displayNotices: {
                        ...DEFAULT_DISPLAY_NOTICES,
                        ...(draftMenu.displayNotices || {}),
                        glutenDisclaimer:
                            (
                                draftMenu.displayNotices
                                    ?.glutenDisclaimer
                                || DEFAULT_DISPLAY_NOTICES
                                    .glutenDisclaimer
                            ).trim(),
                        glutenDisclaimerEs:
                            (
                                draftMenu.displayNotices
                                    ?.glutenDisclaimerEs
                                || DEFAULT_DISPLAY_NOTICES
                                    .glutenDisclaimerEs
                            ).trim()
                    },
                    sections: cleanSections,
                    updatedAt: serverTimestamp(),
                    updatedBy: currentUser.uid
                }
            );

            setMessage(
                'Meat Menu draft saved successfully.'
            );

            setPriceAdjustmentBackup(null);
            setPriceAdjustmentInput('');

        } catch (error) {
            console.error(
                'Unable to save Meat Menu draft:',
                error
            );

            setMessage(
                error.message
                || 'The Meat Menu draft could not be saved.'
            );
        } finally {
            setSaving(false);
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
            validateDraft();
        } catch (error) {
            setMessage(
                error.message
                || 'The Meat Menu could not be validated.'
            );
            return;
        }

        const confirmed = window.confirm(
            'Publish the saved Meat Menu now? '
            + 'Any Meat Menu displays will update immediately.'
        );

        if (!confirmed) {
            return;
        }

        setPublishing(true);
        setMessage('');

        try {
            const publishedVersion =
                await runTransaction(
                    db,
                    async (transaction) => {
                        const draftRef = doc(
                            db,
                            'globalMenuDrafts',
                            'meat'
                        );

                        const publishedRef = doc(
                            db,
                            'globalMenus',
                            'meat'
                        );

                        /*
                         * All transaction reads must happen before
                         * any writes are queued.
                         */
                        const draftSnapshot =
                            await transaction.get(
                                draftRef
                            );

                        const publishedSnapshot =
                            await transaction.get(
                                publishedRef
                            );

                        if (!draftSnapshot.exists()) {
                            throw new Error(
                                'The saved Meat Menu draft no longer exists.'
                            );
                        }

                        const storedDraft =
                            draftSnapshot.data();

                        const currentVersion =
                            publishedSnapshot.exists()
                                ? Number(
                                    publishedSnapshot
                                        .data()
                                        .version || 0
                                )
                                : 0;

                        const nextVersion =
                            currentVersion + 1;

                        const revisionId =
                            `v${String(nextVersion)
                                .padStart(4, '0')}`;

                        const revisionRef = doc(
                            db,
                            'globalMenuRevisions',
                            'meat',
                            'versions',
                            revisionId
                        );

                        const storedNotices = {
                            ...DEFAULT_DISPLAY_NOTICES,
                            ...(
                                storedDraft
                                    .displayNotices
                                || {}
                            )
                        };

                        const publishedMenu = {
                            title: String(
                                storedDraft.title || ''
                            ).trim(),

                            subtitle: String(
                                storedDraft.subtitle || ''
                            ).trim(),

                            displayNotices: {
                                ...storedNotices,

                                glutenDisclaimer:
                                    String(
                                        storedNotices
                                            .glutenDisclaimer
                                        || ''
                                    ).trim(),

                                glutenDisclaimerEs:
                                    String(
                                        storedNotices
                                            .glutenDisclaimerEs
                                        || ''
                                    ).trim()
                            },

                            sections:
                                storedDraft.sections || [],

                            version: nextVersion,
                            publishedAt:
                                serverTimestamp(),
                            publishedBy:
                                currentUser.uid
                        };

                        if (
                            !publishedMenu.title
                            || publishedMenu
                                .sections.length === 0
                        ) {
                            throw new Error(
                                'The saved Meat Menu draft is incomplete.'
                            );
                        }

                        transaction.set(
                            publishedRef,
                            publishedMenu
                        );

                        transaction.set(
                            revisionRef,
                            {
                                ...publishedMenu,
                                revisionId
                            }
                        );

                        transaction.update(
                            draftRef,
                            {
                                sourceVersion:
                                    nextVersion,

                                revisionNumber:
                                    nextVersion,

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
                `Meat Menu version ${publishedVersion} `
                + 'published successfully.'
            );
        } catch (error) {
            console.error(
                'Unable to publish Meat Menu:',
                error
            );

            setMessage(
                error.message
                || 'The Meat Menu could not be published.'
            );
        } finally {
            setPublishing(false);
        }
    };


    const handleDiscardChanges = () => {
        setDraftMenu(savedDraftMenu);
        setHasUnsavedChanges(false);
        setPriceAdjustmentBackup(null);
        setPriceAdjustmentInput('');
        setHighlightedItemId(null);
        setMessage('Unsaved changes discarded.');
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
                'meat'
            );

            const existingDraft =
                await getDoc(draftRef);

            if (existingDraft.exists()) {
                setMessage(
                    'The Meat Menu draft already exists. '
                    + 'No data was changed.'
                );

                return;
            }

            await setDoc(draftRef, {
                ...MEAT_MENU_SEED,
                displayNotices:
                    DEFAULT_DISPLAY_NOTICES,
                sourceVersion: 0,
                revisionNumber: 0,
                createdAt: serverTimestamp(),
                createdBy: currentUser.uid,
                updatedAt: serverTimestamp(),
                updatedBy: currentUser.uid
            });

            setMessage(
                'Private Meat Menu draft initialized successfully.'
            );
        } catch (error) {
            console.error(
                'Unable to initialize Meat Menu draft:',
                error
            );

            setMessage(
                'The Meat Menu draft could not be initialized.'
            );
        } finally {
            setInitializing(false);
        }
    };

    if (userData?.role !== 'super_admin') {
        return (
            <div className="bg-bg border border-border rounded-3xl p-8">
                <p className="text-danger font-bold">
                    Menu management is restricted to super admins.
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-bg border border-border rounded-3xl p-8">
                <p className="text-text-secondary">
                    Loading Meat Menu draft...
                </p>
            </div>
        );
    }

    if (!draftMenu) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold">
                        Restaurant Menu Manager
                    </h2>

                    <p className="text-sm text-text-secondary mt-2">
                        The Meat Menu draft has not been
                        initialized.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleInitializeDraft}
                    disabled={initializing}
                    className="px-6 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-full text-sm font-bold uppercase tracking-wider transition-colors"
                >
                    {initializing
                        ? 'Initializing...'
                        : 'Initialize Meat Menu Draft'}
                </button>

                {message && (
                    <p className="text-sm font-bold">
                        {message}
                    </p>
                )}
            </div>
        );
    }

    const sections = draftMenu.sections || [];

    const itemCount = sections.reduce(
        (total, section) =>
            total + (section.items?.length || 0),
        0
    );

    const adjustmentCents =
        parseAdjustmentCents(
            priceAdjustmentInput
        );

    const priceAdjustmentPreview =
        buildPriceAdjustmentPreview(
            draftMenu,
            adjustmentCents
        );

    const affectedItemCount = new Set(
        priceAdjustmentPreview.map(
            (row) =>
                `${row.sectionId}|${row.itemId}`
        )
    ).size;

    const hasInvalidAdjustedPrice =
        priceAdjustmentPreview.some(
            (row) => row.newPriceCents <= 0
        );

    return (
        <div className="space-y-6">
            {isPreviewOpen && createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Full-screen Meat Menu preview"
                    className="fixed inset-0 z-[10000] bg-black overflow-hidden flex items-center justify-center p-[2vw]"
                >
                    <button
                        type="button"
                        onClick={() =>
                            setIsPreviewOpen(false)
                        }
                        className="absolute top-4 right-4 z-10 px-5 py-2.5 rounded-full bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200"
                    >
                        Close Preview
                    </button>

                    <div className="w-[min(96vw,160vh)] aspect-video overflow-hidden shadow-2xl">
                        <MeatMenuPreview
                            menu={draftMenu}
                            spotlight={previewSpotlight}
                        />
                    </div>
                </div>,
                document.body
            )}
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-2xl font-bold">
                            Restaurant Menu Manager
                        </h2>

                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase">
                            Private Draft
                        </span>

                        {hasUnsavedChanges && (
                            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase">
                                Unsaved Changes
                            </span>
                        )}
                    </div>

                    <p className="text-sm text-text-secondary mt-2">
                        Edit the shared Meat Menu safely before
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
                        className="px-5 py-2.5 bg-surface hover:bg-border disabled:opacity-40 border border-border rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
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
                        className="px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
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
                        className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black rounded-full text-xs font-black uppercase tracking-wider transition-colors"
                    >
                        {publishing
                            ? 'Publishing...'
                            : 'Publish Menu'}
                    </button>
                </div>
            </div>

            <section className="bg-bg border border-border rounded-3xl p-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                            Menu Title
                        </label>

                        <input
                            type="text"
                            value={draftMenu.title}
                            onChange={(event) =>
                                updateMenuField(
                                    'title',
                                    event.target.value
                                )
                            }
                            className="w-full bg-surface border border-border rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                            Menu Subtitle
                        </label>

                        <input
                            type="text"
                            value={draftMenu.subtitle || ''}
                            onChange={(event) =>
                                updateMenuField(
                                    'subtitle',
                                    event.target.value
                                )
                            }
                            className="w-full bg-surface border border-border rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
                    <div className="bg-surface border border-border rounded-2xl p-4">
                        <p className="text-xs uppercase text-text-secondary font-bold">
                            Sections
                        </p>

                        <p className="text-2xl font-black mt-1">
                            {sections.length}
                        </p>
                    </div>

                    <div className="bg-surface border border-border rounded-2xl p-4">
                        <p className="text-xs uppercase text-text-secondary font-bold">
                            Items
                        </p>

                        <p className="text-2xl font-black mt-1">
                            {itemCount}
                        </p>
                    </div>

                    <div className="bg-surface border border-border rounded-2xl p-4">
                        <p className="text-xs uppercase text-text-secondary font-bold">
                            Published Version
                        </p>

                        <p className="text-2xl font-black mt-1">
                            {draftMenu.sourceVersion || 0}
                        </p>
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
            </section>

            <section className="bg-bg border border-border rounded-3xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold">
                            Live Meat Menu Preview
                        </h3>

                        <p className="text-sm text-text-secondary mt-1">
                            This preview reflects the current working
                            draft, including unsaved changes.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setIsPreviewOpen(true)
                        }
                        className="px-5 py-2.5 bg-surface hover:bg-border border border-border rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                        Open Full-Screen Preview
                    </button>
                </div>

                <div className="w-full aspect-video overflow-hidden rounded-2xl border border-border bg-black shadow-xl">
                    <MeatMenuPreview
                        menu={draftMenu}
                        spotlight={previewSpotlight}
                    />
                </div>

                <p className="text-xs text-text-secondary">
                    Preview only—opening or closing this display does
                    not save or publish the menu.
                </p>
            </section>

            <MenuSpotlightManager
                menu={draftMenu}
                onPreviewChange={setPreviewSpotlight}
            />

            <section className="bg-bg border border-border rounded-3xl p-5 space-y-5">
                <div>
                    <h3 className="text-lg font-bold">
                        Menu Display Notices
                    </h3>

                    <p className="text-sm text-text-secondary mt-1">
                        These centralized notices replace repeated
                        brisket modifiers on the display. Their prices
                        remain excluded from uniform adjustments.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                            Plates and Sandwiches Brisket Upcharge
                        </label>

                        <PriceInput
                            priceCents={
                                draftMenu.displayNotices
                                    ?.platesAndSandwichesBrisketUpchargeCents
                                ?? DEFAULT_DISPLAY_NOTICES
                                    .platesAndSandwichesBrisketUpchargeCents
                            }
                            onChange={(priceCents) =>
                                updateDisplayNotice(
                                    'platesAndSandwichesBrisketUpchargeCents',
                                    priceCents
                                )
                            }
                            disabled={saving}
                        />
                    </div>

                    <div>
                        <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                            Pok-E-To, Spud and Salad Brisket Upcharge
                        </label>

                        <PriceInput
                            priceCents={
                                draftMenu.displayNotices
                                    ?.specialtyBrisketUpchargeCents
                                ?? DEFAULT_DISPLAY_NOTICES
                                    .specialtyBrisketUpchargeCents
                            }
                            onChange={(priceCents) =>
                                updateDisplayNotice(
                                    'specialtyBrisketUpchargeCents',
                                    priceCents
                                )
                            }
                            disabled={saving}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                            Shared-Kitchen Disclaimer
                        </label>

                        <textarea
                            rows="4"
                            value={
                                draftMenu.displayNotices
                                    ?.glutenDisclaimer
                                || DEFAULT_DISPLAY_NOTICES
                                    .glutenDisclaimer
                            }
                            onChange={(event) =>
                                updateDisplayNotice(
                                    'glutenDisclaimer',
                                    event.target.value
                                )
                            }
                            className="w-full bg-surface border border-border rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                            Spanish Shared-Kitchen Disclaimer
                        </label>

                        <textarea
                            rows="4"
                            value={
                                draftMenu.displayNotices
                                    ?.glutenDisclaimerEs
                                || DEFAULT_DISPLAY_NOTICES
                                    .glutenDisclaimerEs
                            }
                            onChange={(event) =>
                                updateDisplayNotice(
                                    'glutenDisclaimerEs',
                                    event.target.value
                                )
                            }
                            className="w-full bg-surface border border-border rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none"
                        />
                    </div>
                </div>

                <p className="text-xs text-text-secondary">
                    Have the final disclaimer wording approved by
                    ownership or the restaurant's food-safety lead
                    before publishing the menu.
                </p>
            </section>

            <section className="bg-bg border border-border rounded-3xl p-5 space-y-5">
                <div>
                    <h3 className="text-lg font-bold">
                        Uniform Price Adjustment
                    </h3>

                    <p className="text-sm text-text-secondary mt-1">
                        Apply a fixed increase or decrease to every
                        eligible Meat Menu price in the private draft.
                        Hidden seasonal items are included, but items
                        unchecked for uniform adjustments, section
                        modifiers, and all Spotlight specials are
                        excluded.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                        <label className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                            Adjustment Amount
                        </label>

                        <input
                            type="text"
                            inputMode="decimal"
                            value={priceAdjustmentInput}
                            onChange={
                                handlePriceAdjustmentInput
                            }
                            placeholder="+1.00 or -0.50"
                            className="w-full bg-surface border border-border rounded-xl p-3 font-bold focus:ring-2 focus:ring-accent focus:outline-none"
                        />
                    </div>

                    <div className="flex items-end gap-3">
                        <button
                            type="button"
                            onClick={applyPriceAdjustment}
                            disabled={
                                adjustmentCents === 0
                                || hasInvalidAdjustedPrice
                            }
                            className="px-6 py-3 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                            Apply to Draft
                        </button>

                        <button
                            type="button"
                            onClick={undoPriceAdjustment}
                            disabled={
                                !priceAdjustmentBackup?.length
                            }
                            className="px-5 py-3 bg-surface hover:bg-border disabled:opacity-40 border border-border rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                            Undo Last Adjustment
                        </button>
                    </div>
                </div>

                {priceAdjustmentPreview.length > 0 && (
                    <div className="border border-border rounded-2xl overflow-hidden">
                        <div className="bg-surface border-b border-border p-4 flex flex-wrap justify-between gap-3">
                            <p className="text-sm font-bold">
                                Price Preview
                            </p>

                            <p className="text-xs text-text-secondary">
                                {affectedItemCount} items ·{' '}
                                {priceAdjustmentPreview.length}{' '}
                                price options
                            </p>
                        </div>

                        {hasInvalidAdjustedPrice && (
                            <div className="bg-red-50 text-red-800 p-3 text-sm font-bold border-b border-red-200">
                                This adjustment would create a zero
                                or negative price and cannot be applied.
                            </div>
                        )}

                        <div className="max-h-80 overflow-y-auto divide-y divide-border">
                            {priceAdjustmentPreview.map(
                                (row) => (
                                    <div
                                        key={
                                            `${row.sectionId}-`
                                            + `${row.itemId}-`
                                            + row.priceId
                                        }
                                        className="grid grid-cols-[1fr_auto] gap-4 p-3 bg-bg"
                                    >
                                        <div>
                                            <p className="text-sm font-bold">
                                                {row.itemName}
                                                {!row.itemEnabled && (
                                                    <span className="ml-2 text-[10px] uppercase text-text-secondary">
                                                        Hidden
                                                    </span>
                                                )}
                                            </p>

                                            <p className="text-xs text-text-secondary">
                                                {row.sectionTitle}
                                                {row.priceLabel
                                                    ? ` · ${row.priceLabel}`
                                                    : ''}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 font-bold text-sm">
                                            <span className="text-text-secondary line-through">
                                                {formatCurrency(
                                                    row.oldPriceCents
                                                )}
                                            </span>

                                            <span>→</span>

                                            <span
                                                className={
                                                    row.newPriceCents
                                                        <= 0
                                                        ? 'text-danger'
                                                        : 'text-accent'
                                                }
                                            >
                                                {formatCurrency(
                                                    row.newPriceCents
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}

                <div className="rounded-2xl bg-amber-50 border border-amber-300 p-4">
                    <p className="text-sm text-amber-900 font-medium">
                        Applying an adjustment changes only the
                        working draft. Use Undo Last Adjustment,
                        Discard Changes, or Save Draft afterward.
                        Nothing is published automatically.
                    </p>
                </div>
            </section>

            <div className="space-y-4">
                {sections.map((section) => (
                    <MenuSectionEditor
                        key={section.id}
                        section={section}
                        isOpen={
                            openSections.has(section.id)
                        }
                        onToggle={() =>
                            toggleSection(section.id)
                        }
                        onSectionChange={updateSection}
                        onItemChange={updateItem}
                        onPriceChange={updatePrice}
                        onAddItem={addItem}
                        onMoveItem={moveItem}
                        onDeleteItem={deleteItem}
                        onAddPrice={addPrice}
                        onDeletePrice={deletePrice}
                        onAddModifier={addModifier}
                        onModifierChange={updateModifier}
                        onMoveModifier={moveModifier}
                        onDeleteModifier={deleteModifier}
                        highlightedItemId={highlightedItemId}
                    />
                ))}
            </div>

            <div className="sticky bottom-4 bg-surface/95 backdrop-blur border border-border rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-sm font-bold">
                        {hasUnsavedChanges
                            ? 'You have unsaved draft changes.'
                            : 'All draft changes are saved.'}
                    </p>

                    {message && (
                        <p className="text-xs text-text-secondary mt-1">
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
                    className="px-6 py-3 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
                >
                    {saving
                        ? 'Saving Draft...'
                        : 'Save Draft'}
                </button>
            </div>
        </div>
    );
}
