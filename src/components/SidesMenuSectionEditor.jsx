import { useState } from 'react';
import MenuEditorCard from './MenuEditorCard';
import MenuEditorItemList from './MenuEditorItemList';
import {
    getFountainDrinkBrands
} from '../data/fountainDrinkBrands';

const DRINK_OPTION_PRESETS = [
    ...getFountainDrinkBrands().map((brand) => ({
        drinkSourceId: brand.id,
        name: brand.name,
        nameEs: ''
    })),
    {
        drinkSourceId: 'sweet_tea',
        name: 'Sweet Tea',
        nameEs: 'Té Dulce'
    },
    {
        drinkSourceId: 'unsweet_tea',
        name: 'Unsweet Tea',
        nameEs: 'Té Sin Azúcar'
    }
];

const DIETARY_OPTIONS = [
    {
        id: 'gluten_free',
        label: 'GF*'
    },
    {
        id: 'dairy_free',
        label: 'Dairy Free'
    },
    {
        id: 'vegetarian',
        label: 'Vegetarian'
    },
    {
        id: 'vegan',
        label: 'Vegan'
    }
];

const DIRECT_PRICE_VALUE = '__direct__';

const createEditorId = (prefix) => {
    const uniquePart =
        globalThis.crypto?.randomUUID?.()
        || `${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}`;

    return `${prefix}_${uniquePart}`;
};

const linesToText = (values) =>
    (Array.isArray(values) ? values : [])
        .join('\n');

const textToLines = (value) =>
    String(value || '')
        .split(/\r?\n/);

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

    const finishEditing = () => {
        setIsEditing(false);

        const numericValue = Number(displayValue);

        if (
            displayValue.trim() === ''
            || !Number.isFinite(numericValue)
            || numericValue < 0
        ) {
            setDisplayValue(formatPrice(priceCents));
            return;
        }

        const normalizedCents =
            Math.round(numericValue * 100);

        onChange(normalizedCents);
        setDisplayValue(formatPrice(normalizedCents));
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
                onChange={(event) => {
                    const nextValue = event.target.value;

                    if (/^\d*(\.\d{0,2})?$/.test(nextValue)) {
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
                className="w-full rounded-xl border border-border bg-bg py-2.5 pl-7 pr-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            />
        </div>
    );
}

function FieldLabel({ children }) {
    return (
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            {children}
        </label>
    );
}

function ReorderButtons({
    index,
    count,
    onMove,
    disabled
}) {
    return (
        <div className="flex gap-2">
            <button
                type="button"
                onClick={() => onMove(-1)}
                disabled={disabled || index === 0}
                aria-label="Move up"
                className="rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:bg-border disabled:opacity-30"
            >
                ↑
            </button>

            <button
                type="button"
                onClick={() => onMove(1)}
                disabled={
                    disabled
                    || index === count - 1
                }
                aria-label="Move down"
                className="rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:bg-border disabled:opacity-30"
            >
                ↓
            </button>
        </div>
    );
}

function AvailabilityOptionsEditor({
    options,
    disabled,
    onChange,
    allowDrinkPresets = false
}) {
    const updateOption = (optionId, field, value) => {
        onChange(
            options.map((option) =>
                option.id === optionId
                    ? { ...option, [field]: value }
                    : option
            )
        );
    };

    const addDrinkOptions = () => {
        const existingSources = new Set(
            options.map(
                (option) => option.drinkSourceId
            )
        );

        const additions = DRINK_OPTION_PRESETS
            .filter(
                (preset) =>
                    !existingSources.has(
                        preset.drinkSourceId
                    )
            )
            .map((preset) => ({
                ...preset,
                id: createEditorId('availability')
            }));

        if (additions.length === 0) {
            return;
        }

        onChange([
            ...options,
            ...additions
        ]);
    };

    const addOption = () => {
        onChange([
            ...options,
            {
                id: createEditorId('availability'),
                name: 'New option',
                nameEs: ''
            }
        ]);
    };

    const removeOption = (option) => {
        const confirmed = window.confirm(
            `Remove "${option.name || 'this option'}"? `
            + 'Adding it again will create a new availability ID.'
        );

        if (!confirmed) {
            return;
        }

        onChange(
            options.filter(
                (current) => current.id !== option.id
            )
        );
    };

    const moveOption = (index, direction) => {
        const targetIndex = index + direction;

        if (
            targetIndex < 0
            || targetIndex >= options.length
        ) {
            return;
        }

        const nextOptions = [...options];
        const [movedOption] = nextOptions.splice(index, 1);
        nextOptions.splice(targetIndex, 0, movedOption);

        onChange(nextOptions);
    };

    return (
        <section className="space-y-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                    Individual Brands / Choices
                </h4>

                {allowDrinkPresets && (
                    <button
                        type="button"
                        onClick={addDrinkOptions}
                        disabled={disabled}
                        className="rounded-full border border-border px-3 py-2 text-xs font-bold text-text-primary hover:bg-border disabled:opacity-40"
                    >
                        Add Fountain Flavors & Tea
                    </button>
                )}

                <button
                    type="button"
                    onClick={addOption}
                    disabled={disabled}
                    className="rounded-full border border-border px-3 py-2 text-xs font-bold text-text-primary hover:bg-border disabled:opacity-40"
                >
                    Add Option
                </button>
            </div>

            <p className="text-xs leading-relaxed text-text-secondary">
                Optional choices sharing this item's price.
                Rename an existing option to keep its availability
                ID. Remove it and add another when replacing it
                with a different product.
            </p>

            {options.length === 0 && (
                <p className="text-xs text-text-secondary">
                    No individual options configured.
                </p>
            )}

            {options.map((option, index) => (
                <div
                    key={option.id}
                    className="space-y-3 rounded-xl border border-border bg-bg p-3"
                >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                            <FieldLabel>Option — English</FieldLabel>

                            <input
                                type="text"
                                value={option.name || ''}
                                onChange={(event) =>
                                    updateOption(
                                        option.id,
                                        'name',
                                        event.target.value
                                    )
                                }
                                disabled={disabled}
                                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <FieldLabel>Option — Spanish</FieldLabel>

                            <input
                                type="text"
                                value={option.nameEs || ''}
                                onChange={(event) =>
                                    updateOption(
                                        option.id,
                                        'nameEs',
                                        event.target.value
                                    )
                                }
                                disabled={disabled}
                                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <ReorderButtons
                            index={index}
                            count={options.length}
                            onMove={(direction) =>
                                moveOption(index, direction)
                            }
                            disabled={disabled}
                        />

                        <button
                            type="button"
                            onClick={() => removeOption(option)}
                            disabled={disabled}
                            className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            ))}
        </section>
    );
}

function ItemEditor({
    item,
    index,
    itemCount,
    pricingGroups,
    disabled,
    onChange,
    onMove,
    onRemove
}) {
    const changeField = (field, value) => {
        onChange({
            ...item,
            [field]: value
        });
    };

    const priceOption = (
        item.priceOptions || []
    )[0] || null;

    const changeDirectPrice = (field, value) => {
        const currentPrice = priceOption || {
            id: createEditorId('price'),
            label: '',
            labelEs: '',
            priceCents: 0,
            enabled: true,
            order: 10
        };

        onChange({
            ...item,
            priceOptions: [
                {
                    ...currentPrice,
                    [field]: value
                }
            ]
        });
    };

    const toggleDietaryFlag = (flag) => {
        const currentFlags = new Set(
            item.dietaryFlags || []
        );

        if (currentFlags.has(flag)) {
            currentFlags.delete(flag);
        } else {
            currentFlags.add(flag);
        }

        changeField(
            'dietaryFlags',
            Array.from(currentFlags)
        );
    };

    const pricingValue =
        item.pricingGroupId
        || DIRECT_PRICE_VALUE;

    return (
        <article className="space-y-4 rounded-2xl border border-border bg-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="rounded-full bg-bg px-3 py-1 text-xs font-black text-text-secondary">
                        {index + 1}
                    </span>

                    <p className="truncate font-bold text-text-primary">
                        {item.name || 'New item'}
                    </p>

                    {item.enabled === false && (
                        <span className="rounded-full bg-zinc-200 px-2.5 py-1 text-[10px] font-black uppercase text-zinc-700">
                            Hidden
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <ReorderButtons
                        index={index}
                        count={itemCount}
                        onMove={onMove}
                        disabled={disabled}
                    />

                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={disabled}
                        className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                        Remove
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <FieldLabel>Name — English</FieldLabel>
                    <input
                        type="text"
                        value={item.name || ''}
                        onChange={(event) =>
                            changeField(
                                'name',
                                event.target.value
                            )
                        }
                        disabled={disabled}
                        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 font-bold disabled:opacity-50"
                    />
                </div>

                <div>
                    <FieldLabel>Name — Spanish</FieldLabel>
                    <input
                        type="text"
                        value={item.nameEs || ''}
                        onChange={(event) =>
                            changeField(
                                'nameEs',
                                event.target.value
                            )
                        }
                        disabled={disabled}
                        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 font-bold disabled:opacity-50"
                    />
                </div>

                <div>
                    <FieldLabel>Description — English</FieldLabel>
                    <textarea
                        rows="2"
                        value={item.description || ''}
                        onChange={(event) =>
                            changeField(
                                'description',
                                event.target.value
                            )
                        }
                        disabled={disabled}
                        className="w-full resize-y rounded-xl border border-border bg-bg px-4 py-2.5 disabled:opacity-50"
                    />
                </div>

                <div>
                    <FieldLabel>Description — Spanish</FieldLabel>
                    <textarea
                        rows="2"
                        value={item.descriptionEs || ''}
                        onChange={(event) =>
                            changeField(
                                'descriptionEs',
                                event.target.value
                            )
                        }
                        disabled={disabled}
                        className="w-full resize-y rounded-xl border border-border bg-bg px-4 py-2.5 disabled:opacity-50"
                    />
                </div>

                <div>
                    <FieldLabel>Extra lines — English</FieldLabel>
                    <textarea
                        rows="2"
                        value={linesToText(item.details)}
                        placeholder="One display line per row"
                        onChange={(event) =>
                            changeField(
                                'details',
                                textToLines(event.target.value)
                            )
                        }
                        disabled={disabled}
                        className="w-full resize-y rounded-xl border border-border bg-bg px-4 py-2.5 disabled:opacity-50"
                    />
                </div>

                <div>
                    <FieldLabel>Extra lines — Spanish</FieldLabel>
                    <textarea
                        rows="2"
                        value={linesToText(item.detailsEs)}
                        placeholder="Una línea por renglón"
                        onChange={(event) =>
                            changeField(
                                'detailsEs',
                                textToLines(event.target.value)
                            )
                        }
                        disabled={disabled}
                        className="w-full resize-y rounded-xl border border-border bg-bg px-4 py-2.5 disabled:opacity-50"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                <div>
                    <FieldLabel>Pricing</FieldLabel>
                    <select
                        value={pricingValue}
                        onChange={(event) => {
                            const nextValue = event.target.value;

                            if (nextValue === DIRECT_PRICE_VALUE) {
                                onChange({
                                    ...item,
                                    pricingGroupId: '',
                                    priceOptions:
                                        priceOption
                                            ? item.priceOptions
                                            : [
                                                {
                                                    id: createEditorId('price'),
                                                    label: '',
                                                    labelEs: '',
                                                    priceCents: 0,
                                                    enabled: true,
                                                    order: 10
                                                }
                                            ]
                                });
                                return;
                            }

                            onChange({
                                ...item,
                                pricingGroupId: nextValue,
                                priceOptions: []
                            });
                        }}
                        disabled={disabled}
                        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 disabled:opacity-50"
                    >
                        {pricingGroups.map(
                            (pricingGroup) => (
                                <option
                                    key={pricingGroup.id}
                                    value={pricingGroup.id}
                                >
                                    {pricingGroup.title}
                                </option>
                            )
                        )}

                        <option value={DIRECT_PRICE_VALUE}>
                            Individual price
                        </option>
                    </select>

                    {pricingValue === DIRECT_PRICE_VALUE && (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem]">
                            <input
                                type="text"
                                value={priceOption?.label || ''}
                                placeholder="Price label (optional)"
                                onChange={(event) =>
                                    changeDirectPrice(
                                        'label',
                                        event.target.value
                                    )
                                }
                                disabled={disabled}
                                className="rounded-xl border border-border bg-bg px-3 py-2.5 text-sm disabled:opacity-50"
                            />

                            <input
                                type="text"
                                value={priceOption?.labelEs || ''}
                                placeholder="Etiqueta en español"
                                onChange={(event) =>
                                    changeDirectPrice(
                                        'labelEs',
                                        event.target.value
                                    )
                                }
                                disabled={disabled}
                                className="rounded-xl border border-border bg-bg px-3 py-2.5 text-sm disabled:opacity-50"
                            />

                            <PriceInput
                                priceCents={
                                    priceOption?.priceCents || 0
                                }
                                onChange={(priceCents) =>
                                    changeDirectPrice(
                                        'priceCents',
                                        priceCents
                                    )
                                }
                                disabled={disabled}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <FieldLabel>Dietary badges</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                        {DIETARY_OPTIONS.map((option) => (
                            <label
                                key={option.id}
                                className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-bg px-3 py-2 text-xs font-bold"
                            >
                                <input
                                    type="checkbox"
                                    checked={(
                                        item.dietaryFlags || []
                                    ).includes(option.id)}
                                    onChange={() =>
                                        toggleDietaryFlag(option.id)
                                    }
                                    disabled={disabled}
                                />
                                {option.label}
                            </label>
                        ))}
                    </div>

                    <p className="mt-2 text-xs text-text-secondary">
                        Only apply badges that have been verified for the
                        current recipe and preparation process.
                    </p>
                </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold">
                <input
                    type="checkbox"
                    checked={
                        item.availabilityOptionsDisplay
                        === 'brand_list'
                    }
                    onChange={(event) =>
                        changeField(
                            'availabilityOptionsDisplay',
                            event.target.checked
                                ? 'brand_list'
                                : 'none'
                        )
                    }
                    disabled={disabled}
                />

                Show options as the brand list on the menu
            </label>
            <AvailabilityOptionsEditor
                options={
                    Array.isArray(item.availabilityOptions)
                        ? item.availabilityOptions
                        : []
                }
                disabled={disabled}
                allowDrinkPresets={
                    item.id === 'fountain_drinks_and_tea'
                }
                onChange={(nextOptions) =>
                    changeField(
                        'availabilityOptions',
                        nextOptions
                    )
                }
            />
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-bold">
                <input
                    type="checkbox"
                    checked={item.enabled !== false}
                    onChange={(event) =>
                        changeField(
                            'enabled',
                            event.target.checked
                        )
                    }
                    disabled={disabled}
                />
                Show this item on the menu
            </label>
        </article>
    );
}

function ModifierEditor({
    modifier,
    index,
    modifierCount,
    items,
    disabled,
    onChange,
    onMove,
    onRemove
}) {
    const changeField = (field, value) => {
        onChange({
            ...modifier,
            [field]: value
        });
    };

    return (
        <article className="space-y-4 rounded-2xl border border-amber-300/60 bg-amber-50/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="font-bold text-text-primary">
                        {modifier.label || 'New modifier'}
                    </p>
                    <p className="text-xs text-text-secondary">
                        Display note or optional add-on
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <ReorderButtons
                        index={index}
                        count={modifierCount}
                        onMove={onMove}
                        disabled={disabled}
                    />

                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={disabled}
                        className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                        Remove
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <FieldLabel>Label — English</FieldLabel>
                    <input
                        type="text"
                        value={modifier.label || ''}
                        onChange={(event) =>
                            changeField(
                                'label',
                                event.target.value
                            )
                        }
                        disabled={disabled}
                        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 font-bold disabled:opacity-50"
                    />
                </div>

                <div>
                    <FieldLabel>Label — Spanish</FieldLabel>
                    <input
                        type="text"
                        value={modifier.labelEs || ''}
                        onChange={(event) =>
                            changeField(
                                'labelEs',
                                event.target.value
                            )
                        }
                        disabled={disabled}
                        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 font-bold disabled:opacity-50"
                    />
                </div>

                <div>
                    <FieldLabel>Description — English</FieldLabel>
                    <input
                        type="text"
                        value={modifier.description || ''}
                        onChange={(event) =>
                            changeField(
                                'description',
                                event.target.value
                            )
                        }
                        disabled={disabled}
                        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 disabled:opacity-50"
                    />
                </div>

                <div>
                    <FieldLabel>Description — Spanish</FieldLabel>
                    <input
                        type="text"
                        value={modifier.descriptionEs || ''}
                        onChange={(event) =>
                            changeField(
                                'descriptionEs',
                                event.target.value
                            )
                        }
                        disabled={disabled}
                        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 disabled:opacity-50"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem]">
                <div>
                    <FieldLabel>Placement</FieldLabel>
                    <select
                        value={modifier.placement || 'end'}
                        onChange={(event) => {
                            const placement = event.target.value;

                            onChange({
                                ...modifier,
                                placement,
                                afterItemId:
                                    placement === 'after_item'
                                        ? modifier.afterItemId
                                        || items[0]?.id
                                        || ''
                                        : ''
                            });
                        }}
                        disabled={disabled}
                        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 disabled:opacity-50"
                    >
                        <option value="start">
                            Before the first item
                        </option>
                        <option value="after_item">
                            After a specific item
                        </option>
                        <option value="end">
                            After the last item
                        </option>
                    </select>
                </div>

                <div>
                    <FieldLabel>Place after</FieldLabel>
                    <select
                        value={modifier.afterItemId || ''}
                        onChange={(event) =>
                            changeField(
                                'afterItemId',
                                event.target.value
                            )
                        }
                        disabled={
                            disabled
                            || modifier.placement !== 'after_item'
                        }
                        className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 disabled:opacity-50"
                    >
                        {items.map((item) => (
                            <option
                                key={item.id}
                                value={item.id}
                            >
                                {item.name || item.id}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <FieldLabel>Price</FieldLabel>
                    <PriceInput
                        priceCents={modifier.priceCents || 0}
                        onChange={(priceCents) =>
                            changeField(
                                'priceCents',
                                priceCents
                            )
                        }
                        disabled={disabled}
                    />
                </div>
            </div>

            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-bold">
                <input
                    type="checkbox"
                    checked={modifier.enabled !== false}
                    onChange={(event) =>
                        changeField(
                            'enabled',
                            event.target.checked
                        )
                    }
                    disabled={disabled}
                />
                Show this modifier on the menu
            </label>
        </article>
    );
}

export default function SidesMenuSectionEditor({
    section,
    pricingGroups = [],
    disabled = false,
    onChange
}) {
    const items = section.items || [];
    const modifiers = section.modifiers || [];

    const [
        recentlyAddedItemId,
        setRecentlyAddedItemId
    ] = useState('');

    const changeSectionField = (field, value) => {
        onChange({
            ...section,
            [field]: value
        });
    };

    const changeItem = (itemId, nextItem) => {
        onChange({
            ...section,
            items: items.map((item) =>
                item.id === itemId
                    ? nextItem
                    : item
            )
        });
    };

    const moveItem = (itemIndex, direction) => {
        const targetIndex = itemIndex + direction;

        if (
            targetIndex < 0
            || targetIndex >= items.length
        ) {
            return;
        }

        const nextItems = [...items];
        const [movedItem] = nextItems.splice(
            itemIndex,
            1
        );

        nextItems.splice(targetIndex, 0, movedItem);

        onChange({
            ...section,
            items: nextItems.map((item, index) => ({
                ...item,
                order: (index + 1) * 10
            }))
        });
    };

    const removeItem = (item) => {
        if (!window.confirm(
            `Remove “${item.name || 'this item'}” from the draft?`
        )) {
            return;
        }

        onChange({
            ...section,
            items: items.filter(
                (currentItem) =>
                    currentItem.id !== item.id
            ),
            modifiers: modifiers.map((modifier) =>
                modifier.afterItemId === item.id
                    ? {
                        ...modifier,
                        placement: 'end',
                        afterItemId: ''
                    }
                    : modifier
            )
        });
    };

    const addItem = () => {
        const defaultPricingGroupId =
            section.id === 'drinks'
                ? ''
                : section.id === 'bbq_sauces'
                    ? 'bulk_sauces'
                    : 'sides_and_desserts';

        const nextItem = {
            id: createEditorId('item'),
            name: 'NEW ITEM',
            nameEs: '',
            description: '',
            descriptionEs: '',
            details: [],
            detailsEs: [],
            dietaryFlags: [],
            pricingGroupId: defaultPricingGroupId,
            priceOptions:
                defaultPricingGroupId
                    ? []
                    : [
                        {
                            id: createEditorId('price'),
                            label: '',
                            labelEs: '',
                            priceCents: 0,
                            enabled: true,
                            order: 10
                        }
                    ],
            bulkPriceEligible: true,
            enabled: true,
            order: (items.length + 1) * 10
        };

        onChange({
            ...section,
            items: [...items, nextItem]
        });

        setRecentlyAddedItemId(nextItem.id);
    };

    const changeModifier = (
        modifierId,
        nextModifier
    ) => {
        onChange({
            ...section,
            modifiers: modifiers.map((modifier) =>
                modifier.id === modifierId
                    ? nextModifier
                    : modifier
            )
        });
    };

    const moveModifier = (
        modifierIndex,
        direction
    ) => {
        const targetIndex = modifierIndex + direction;

        if (
            targetIndex < 0
            || targetIndex >= modifiers.length
        ) {
            return;
        }

        const nextModifiers = [...modifiers];
        const [movedModifier] = nextModifiers.splice(
            modifierIndex,
            1
        );

        nextModifiers.splice(
            targetIndex,
            0,
            movedModifier
        );

        onChange({
            ...section,
            modifiers: nextModifiers.map(
                (modifier, index) => ({
                    ...modifier,
                    order: (index + 1) * 10
                })
            )
        });
    };

    const removeModifier = (modifier) => {
        if (!window.confirm(
            `Remove “${modifier.label || 'this modifier'}” from the draft?`
        )) {
            return;
        }

        onChange({
            ...section,
            modifiers: modifiers.filter(
                (currentModifier) =>
                    currentModifier.id !== modifier.id
            )
        });
    };

    const addModifier = () => {
        const lastItem = items[items.length - 1];

        const nextModifier = {
            id: createEditorId('modifier'),
            label: 'NEW MODIFIER',
            labelEs: '',
            description: '',
            descriptionEs: '',
            priceCents: 0,
            placement:
                lastItem
                    ? 'after_item'
                    : 'end',
            afterItemId: lastItem?.id || '',
            enabled: true,
            order: (modifiers.length + 1) * 10
        };

        onChange({
            ...section,
            modifiers: [
                ...modifiers,
                nextModifier
            ]
        });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <FieldLabel>Section title — English</FieldLabel>
                    <input
                        type="text"
                        value={section.title || ''}
                        onChange={(event) =>
                            changeSectionField(
                                'title',
                                event.target.value
                            )
                        }
                        disabled={disabled}
                        className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-bold disabled:opacity-50"
                    />
                </div>

                <div>
                    <FieldLabel>Section title — Spanish</FieldLabel>
                    <input
                        type="text"
                        value={section.titleEs || ''}
                        onChange={(event) =>
                            changeSectionField(
                                'titleEs',
                                event.target.value
                            )
                        }
                        disabled={disabled}
                        className="w-full rounded-xl border border-border bg-surface px-4 py-3 font-bold disabled:opacity-50"
                    />
                </div>

                <div>
                    <FieldLabel>Section subtitle — English</FieldLabel>
                    <input
                        type="text"
                        value={section.subtitle || ''}
                        onChange={(event) =>
                            changeSectionField(
                                'subtitle',
                                event.target.value
                            )
                        }
                        disabled={disabled}
                        className="w-full rounded-xl border border-border bg-surface px-4 py-3 disabled:opacity-50"
                    />
                </div>

                <div>
                    <FieldLabel>Section subtitle — Spanish</FieldLabel>
                    <input
                        type="text"
                        value={section.subtitleEs || ''}
                        onChange={(event) =>
                            changeSectionField(
                                'subtitleEs',
                                event.target.value
                            )
                        }
                        disabled={disabled}
                        className="w-full rounded-xl border border-border bg-surface px-4 py-3 disabled:opacity-50"
                    />
                </div>
            </div>

            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-bold">
                <input
                    type="checkbox"
                    checked={section.enabled !== false}
                    onChange={(event) =>
                        changeSectionField(
                            'enabled',
                            event.target.checked
                        )
                    }
                    disabled={disabled}
                />
                Show this section on the menu
            </label>

            <MenuEditorItemList
                itemCount={items.length}
                onAddItem={addItem}
                disabled={disabled}
                className="border-t border-border pt-5"
            >
                {items.map((item, index) => (
                    <MenuEditorCard
                        key={item.id}
                        revealKey={
                            recentlyAddedItemId === item.id
                                ? item.id
                                : ''
                        }
                        className="rounded-2xl"
                    >
                        <ItemEditor
                            item={item}
                            index={index}
                            itemCount={items.length}
                            pricingGroups={pricingGroups}
                            disabled={disabled}
                            onChange={(nextItem) =>
                                changeItem(
                                    item.id,
                                    nextItem
                                )
                            }
                            onMove={(direction) =>
                                moveItem(
                                    index,
                                    direction
                                )
                            }
                            onRemove={() =>
                                removeItem(item)
                            }
                        />
                    </MenuEditorCard>
                ))}
            </MenuEditorItemList>

            <div className="space-y-4 border-t border-border pt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h4 className="font-bold text-text-primary">
                            Modifiers and add-ons
                        </h4>
                        <p className="mt-1 text-sm text-text-secondary">
                            Place a priced note before, after or between items.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={addModifier}
                        disabled={disabled}
                        className="rounded-full border border-amber-400 bg-amber-100 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-amber-900 hover:bg-amber-200 disabled:opacity-40"
                    >
                        Add Modifier
                    </button>
                </div>

                {modifiers.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-4 text-sm text-text-secondary">
                        No modifiers in this section.
                    </p>
                ) : (
                    modifiers.map((modifier, index) => (
                        <ModifierEditor
                            key={modifier.id}
                            modifier={modifier}
                            index={index}
                            modifierCount={modifiers.length}
                            items={items}
                            disabled={disabled}
                            onChange={(nextModifier) =>
                                changeModifier(
                                    modifier.id,
                                    nextModifier
                                )
                            }
                            onMove={(direction) =>
                                moveModifier(index, direction)
                            }
                            onRemove={() =>
                                removeModifier(modifier)
                            }
                        />
                    ))
                )}
            </div>
        </div>
    );
}
