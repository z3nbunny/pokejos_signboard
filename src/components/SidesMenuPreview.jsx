import FountainFlavorGrid from './FountainFlavorGrid';
import {
    createMenuDisplayModel,
    shouldShowSpanish
} from '../utils/menuLanguage';

import {
    BODY_FONT_STYLE,
    DISPLAY_FONT_STYLE,
    MENU_TEXT_CLASSES
} from '../styles/menuTypography';

const SIDES_TEXT_CLASSES = {
    itemName:
        MENU_TEXT_CLASSES.itemName
        + ' leading-[1.04]',

    price:
        MENU_TEXT_CLASSES.price
        + ' leading-none',

    supporting:
        MENU_TEXT_CLASSES.supporting
        + ' leading-[1.14]',

    detail:
        MENU_TEXT_CLASSES.detail
        + ' leading-[1.14]'
};

const COLUMN_SECTIONS = [
    ['hot_sides'],
    ['cold_sides', 'bbq_sauces'],
    ['desserts', 'drinks']
];

const COLUMN_GAP_CLASSES = [
    'gap-[1.6cqw]',
    'gap-[1.6cqw]',
    'gap-[1.8cqw]'
];

const SECTION_ITEM_SPACING_CLASSES = {
    hot_sides: 'space-y-[1.6cqw]',
    cold_sides: 'space-y-[1.55cqw]',
    desserts: 'space-y-[1.32cqw]',
    bbq_sauces: 'space-y-[1.45cqw]',
    drinks: 'space-y-[1.08cqw]'
};

const COMPACT_BEER_ITEM_IDS = new Set([
    'domestic_beer',
    'imported_beer'
]);

const DIETARY_BADGES = {
    gluten_free: {
        shortLabel: 'GF*',
        label: 'Gluten Free',
        labelEs: 'Sin Gluten',
        className:
            'border-[#f4c542]/70 bg-[#f4c542]/15 text-[#f4c542]'
    },
    dairy_free: {
        shortLabel: 'DF',
        label: 'Dairy Free',
        labelEs: 'Sin Lácteos',
        className:
            'border-sky-300/70 bg-sky-300/15 text-sky-200'
    },
    vegetarian: {
        shortLabel: 'VEG',
        label: 'Vegetarian',
        labelEs: 'Vegetariano',
        className:
            'border-lime-300/70 bg-lime-300/15 text-lime-200'
    },
    vegan: {
        shortLabel: 'VEGAN',
        label: 'Vegan',
        labelEs: 'Vegano',
        className:
            'border-emerald-300/70 bg-emerald-300/15 text-emerald-200'
    }
};

const formatPrice = (priceCents) => {
    const numericPrice = Number(priceCents);

    if (!Number.isFinite(numericPrice)) {
        return '';
    }

    const price = numericPrice / 100;

    return Number.isInteger(price)
        ? `$${price}`
        : `$${price.toFixed(2)}`;
};

const getVisibleSections = (menu) => {
    const sectionMap = new Map(
        (menu?.sections || [])
            .filter(
                (section) =>
                    section.enabled !== false
            )
            .map((section) => [
                section.id,
                section
            ])
    );

    return COLUMN_SECTIONS.map(
        (sectionIds) =>
            sectionIds
                .map(
                    (sectionId) =>
                        sectionMap.get(sectionId)
                )
                .filter(Boolean)
    );
};

const getPricingGroup = (menu, pricingGroupId) =>
    (menu?.pricingGroups || []).find(
        (pricingGroup) =>
            pricingGroup.id === pricingGroupId
            && pricingGroup.enabled !== false
    ) || null;

function DietaryBadges({ flags = [] }) {
    const uniqueFlags = Array.from(
        new Set(flags)
    ).filter(
        (flag) =>
            DIETARY_BADGES[flag]
    );

    /*
     * Vegan already communicates vegetarian suitability.
     * Retain both values in the data while avoiding a redundant
     * pair of badges on the television.
     */
    const displayedFlags = uniqueFlags.includes('vegan')
        ? uniqueFlags.filter(
            (flag) => flag !== 'vegetarian'
        )
        : uniqueFlags;

    if (displayedFlags.length === 0) {
        return null;
    }

    return (
        <span className="inline-flex flex-wrap items-center gap-[0.22cqw]">
            {displayedFlags.map((flag) => {
                const badge = DIETARY_BADGES[flag];

                return (
                    <span
                        key={flag}
                        title={`${badge.label} / ${badge.labelEs}`}
                        className={`inline-flex items-center rounded-[0.28cqw] border px-[0.34cqw] py-[0.04cqw] text-[0.5cqw] font-black tracking-[0.04em] leading-[1.35] ${badge.className}`}
                    >
                        {badge.shortLabel}
                    </span>
                );
            })}
        </span>
    );
}

function BilingualDescription({
    description,
    descriptionEs,
    inline = false
}) {
    if (!description && !descriptionEs) {
        return null;
    }

    if (inline) {
        return (
            <p
                className={
                    'mt-[0.16cqw] '
                    + SIDES_TEXT_CLASSES.supporting
                }
            >
                {description}

                {description && descriptionEs && (
                    <span className="mx-[0.28cqw] text-[#f4c542]/70">
                        |
                    </span>
                )}

                {descriptionEs && (
                    <span>{descriptionEs}</span>
                )}
            </p>
        );
    }

    return (
        <div
            className={
                'mt-[0.16cqw] '
                + SIDES_TEXT_CLASSES.supporting
            }
        >
            {description && (
                <p>{description}</p>
            )}

            {descriptionEs && (
                <p>{descriptionEs}</p>
            )}
        </div>
    );
}

function ItemDetails({
    item,
    inline = false
}) {
    const details = Array.isArray(item.details)
        ? item.details.filter(Boolean)
        : [];

    const detailsEs = Array.isArray(item.detailsEs)
        ? item.detailsEs.filter(Boolean)
        : [];

    if (
        details.length === 0
        && detailsEs.length === 0
    ) {
        return null;
    }

    if (inline) {
        const detailCount = Math.max(
            details.length,
            detailsEs.length
        );

        return (
            <div
                className={
                    'mt-[0.16cqw] '
                    + SIDES_TEXT_CLASSES.detail
                }
            >
                {Array.from(
                    { length: detailCount },
                    (_, index) => {
                        const detail =
                            details[index] || '';

                        const detailEs =
                            detailsEs[index] || '';

                        return (
                            <p
                                key={`${detail}-${detailEs}-${index}`}
                            >
                                {detail}

                                {detail && detailEs && (
                                    <span className="mx-[0.28cqw] text-[#f4c542]/65">
                                        |
                                    </span>
                                )}

                                {detailEs && (
                                    <span>{detailEs}</span>
                                )}
                            </p>
                        );
                    }
                )}
            </div>
        );
    }

    return (
        <div
            className={
                'mt-[0.16cqw] '
                + SIDES_TEXT_CLASSES.detail
            }
        >
            {details.map((detail) => (
                <p key={detail}>{detail}</p>
            ))}

            {detailsEs.map((detail) => (
                <p key={detail}>
                    {detail}
                </p>
            ))}
        </div>
    );
}

function MenuItem({ item }) {
    const visiblePrices = item.pricingGroupId
        ? []
        : (
            item.priceOptions || []
        ).filter(
            (priceOption) =>
                priceOption.enabled !== false
        );

    const inlineTranslations =
        item.translationLayout === 'inline'
        || item.id === 'fountain_drinks_and_tea';

    return (
        <article className="min-w-0">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-[0.55cqw]">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-[0.28cqw] gap-y-[0.12cqw]">
                        <h3 className={SIDES_TEXT_CLASSES.itemName}>
                            {item.name}

                            {item.nameEs && (
                                <>
                                    <span className="mx-[0.24cqw] text-white/45">
                                        |
                                    </span>

                                    <span>
                                        {item.nameEs}
                                    </span>
                                </>
                            )}
                        </h3>

                        <DietaryBadges
                            flags={item.dietaryFlags}
                        />
                    </div>

                    <BilingualDescription
                        description={item.description}
                        descriptionEs={item.descriptionEs}
                        inline={inlineTranslations}
                    />

                    <ItemDetails
                        item={item}
                        inline={inlineTranslations}
                    />
                </div>

                {visiblePrices.length > 0 && (
                    <div className="flex flex-col items-end gap-[0.06cqw] text-right">
                        {visiblePrices.map(
                            (priceOption) => (
                                <div
                                    key={priceOption.id}
                                    className="leading-none"
                                >
                                    {(priceOption.label
                                        || priceOption.labelEs) && (
                                            <span className="mr-[0.3cqw] text-[0.54cqw] font-bold uppercase text-white/55">
                                                {priceOption.label}
                                            </span>
                                        )}

                                    <span className={SIDES_TEXT_CLASSES.price}>
                                        {formatPrice(
                                            priceOption.priceCents
                                        )}
                                    </span>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}
function CompactBeerGroup({
    items = [],
    showSpanish = true
}) {
    const visibleItems = items
        .map((item) => {
            const priceOption = (
                item.priceOptions || []
            ).find(
                (option) =>
                    option.enabled !== false
            );

            if (!priceOption) {
                return null;
            }

            const label = String(
                item.name || ''
            )
                .replace(/\s+beer$/i, '')
                .trim();

            const labelEs = String(
                item.nameEs || ''
            )
                .replace(/^cerveza\s+/i, '')
                .trim();

            return {
                id: item.id,
                label: label || item.name,
                labelEs: labelEs || item.nameEs,
                priceCents: priceOption.priceCents,
                brandText: [
                    item.description,
                    ...(Array.isArray(item.details)
                        ? item.details
                        : [])
                ]
                    .filter(Boolean)
                    .join(' · ')
            };
        })
        .filter(Boolean);

    if (visibleItems.length === 0) {
        return null;
    }

    return (
        <section className="border-t border-[#f4c542]/32 pt-[0.5cqw]">
            <h3
                style={DISPLAY_FONT_STYLE}
                className="
                    mb-[0.62cqw]
                    text-center
                    text-[1.55cqw]
                    leading-[1.02]
                    uppercase
                    tracking-[0.025em]
                    text-[#f4c542]
                "
            >
                BEERS

                {showSpanish && (
                    <>
                        <span className="mx-[0.42cqw] text-white/42">
                            |
                        </span>

                        CERVEZAS
                    </>
                )}
            </h3>

            <div className="space-y-[0.72cqw]">
                {visibleItems.map((item) => (
                    <div
                        key={item.id}
                        className="min-w-0"
                    >
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-[0.7cqw]">
                            <span className="text-[1.02cqw] leading-none font-black uppercase text-white">
                                {item.label}

                                {item.label && item.labelEs
                                    ? ' | '
                                    : ''}

                                {item.labelEs}
                            </span>

                            <span className="text-[1.02cqw] leading-none font-black text-[#f4c542]">
                                {formatPrice(
                                    item.priceCents
                                )}
                            </span>
                        </div>

                        {item.brandText && (
                            <p className="mt-[0.24cqw] text-[0.62cqw] leading-[1.18] font-semibold text-white/68">
                                {item.brandText}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}


function SectionModifier({ modifier }) {
    return (
        <div className="border-y border-[#f4c542]/32 py-[0.32cqw]">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-[0.55cqw]">
                <div className="min-w-0">
                    <p className="text-[0.78cqw] leading-[1.05] font-black uppercase text-[#f4c542]">
                        {modifier.label}

                        {modifier.labelEs && (
                            <>
                                <span className="mx-[0.24cqw] text-white/42">
                                    |
                                </span>

                                <span>
                                    {modifier.labelEs}
                                </span>
                            </>
                        )}
                    </p>

                    <BilingualDescription
                        description={modifier.description}
                        descriptionEs={modifier.descriptionEs}
                    />
                </div>

                {Number(modifier.priceCents) > 0 && (
                    <span className="text-[0.9cqw] leading-none font-black text-[#f4c542]">
                        +{formatPrice(modifier.priceCents)}
                    </span>
                )}
            </div>
        </div>
    );
}

function PricingGroup({
    pricingGroup,
    showSpanish = true
}) {
    if (!pricingGroup) {
        return null;
    }

    const prices = (
        pricingGroup.priceOptions || []
    ).filter(
        (priceOption) =>
            priceOption.enabled !== false
    );

    const isSidesPricing =
        pricingGroup.id === 'sides_and_desserts';

    const priceRows = (
        isSidesPricing
            ? [
                prices.slice(0, 3),
                prices.slice(3)
            ]
            : [prices]
    ).filter(
        (priceRow) => priceRow.length > 0
    );

    const titleSizeClass = isSidesPricing
        ? 'text-[1.02cqw]'
        : 'text-[0.86cqw]';

    return (
        <section
            className={`
                rounded-[0.55cqw]
                border
                border-[#f4c542]/45
                bg-[#f4c542]/8
                ${isSidesPricing
                    ? 'px-[0.92cqw] py-[0.68cqw]'
                    : 'px-[0.78cqw] py-[0.52cqw]'
                }
            `}
        >
            <div className="flex items-center justify-center gap-[0.4cqw] text-center">
                <h2
                    style={DISPLAY_FONT_STYLE}
                    className={`${titleSizeClass} leading-none uppercase tracking-[0.025em] text-[#f4c542]`}
                >
                    {pricingGroup.title}
                </h2>

                {pricingGroup.titleEs && (
                    <>
                        <span className="text-[0.82cqw] text-white/38">
                            |
                        </span>

                        <h2
                            style={DISPLAY_FONT_STYLE}
                            className={`${titleSizeClass} leading-none uppercase tracking-[0.025em] text-[#f4c542]`}
                        >
                            {pricingGroup.titleEs}
                        </h2>
                    </>
                )}
            </div>

            <div
                className={
                    isSidesPricing
                        ? 'mt-[0.62cqw] space-y-[0.62cqw]'
                        : 'mt-[0.44cqw]'
                }
            >
                {priceRows.map(
                    (priceRow, rowIndex) => (
                        <div
                            key={`pricing-row-${rowIndex}`}
                            className={`
                                grid
                                gap-[0.52cqw]
                                ${isSidesPricing
                                    && rowIndex > 0
                                    ? 'border-t border-[#f4c542]/25 pt-[0.62cqw]'
                                    : ''
                                }
                            `}
                            style={{
                                gridTemplateColumns:
                                    `repeat(${priceRow.length}, minmax(0, 1fr))`
                            }}
                        >
                            {priceRow.map(
                                (priceOption) => (
                                    <div
                                        key={priceOption.id}
                                        className="flex flex-col text-center leading-none"
                                    >
                                        <p
                                            className={`
                                                font-bold
                                                uppercase
                                                tracking-[0.04em]
                                                text-white/72
                                                ${isSidesPricing
                                                    ? 'text-[0.72cqw]'
                                                    : 'text-[0.56cqw]'
                                                }
                                            `}
                                        >
                                            {priceOption.label}

                                            {!isSidesPricing
                                                && priceOption.label
                                                && priceOption.labelEs
                                                ? ' | '
                                                : ''}

                                            {!isSidesPricing
                                                && priceOption.labelEs}
                                        </p>

                                        {priceOption.serves && (
                                            <p
                                                className={`
                                                    mt-[0.24cqw]
                                                    leading-none
                                                    font-bold
                                                    uppercase
                                                    tracking-[0.035em]
                                                    text-white/62
                                                    ${isSidesPricing
                                                        ? 'text-[0.62cqw]'
                                                        : 'text-[0.5cqw]'
                                                    }
                                                `}
                                            >
                                                {isSidesPricing || !showSpanish
                                                    ? 'Serves '
                                                    : 'Serves / Rinde '}

                                                {priceOption.serves}
                                            </p>
                                        )}

                                        <p
                                            className={`
                                                mt-auto
                                                pt-[0.3cqw]
                                                font-black
                                                text-white
                                                ${isSidesPricing
                                                    ? 'text-[1.08cqw]'
                                                    : 'text-[0.92cqw]'
                                                }
                                            `}
                                        >
                                            {formatPrice(
                                                priceOption.priceCents
                                            )}
                                        </p>
                                    </div>
                                )
                            )}
                        </div>
                    )
                )}
            </div>
        </section>
    );
}

function MenuSection({
    section,
    menu,
    showSpanish = true,
    beforeItemsContent = null,
    afterItemId = '',
    afterItemContent = null
}) {
    const items = (section.items || [])
        .filter((item) => item.enabled !== false)
        .sort(
            (firstItem, secondItem) =>
                Number(firstItem.order || 0)
                - Number(secondItem.order || 0)
        );

    const beerItems =
        section.id === 'drinks'
            ? items.filter(
                (item) =>
                    COMPACT_BEER_ITEM_IDS.has(
                        item.id
                    )
            )
            : [];

    const firstBeerItemId =
        beerItems[0]?.id || '';

    const itemSpacingClass =
        SECTION_ITEM_SPACING_CLASSES[
        section.id
        ] || (
            items.length >= 7
                ? 'space-y-[0.94cqw]'
                : items.length >= 5
                    ? 'space-y-[1.06cqw]'
                    : 'space-y-[1.14cqw]'
        );

    const pricingGroupId = items.find(
        (item) => item.pricingGroupId
    )?.pricingGroupId;

    const pricingGroup = getPricingGroup(
        menu,
        pricingGroupId
    );

    const modifiers = (section.modifiers || [])
        .filter(
            (modifier) =>
                modifier.enabled !== false
        )
        .sort(
            (firstModifier, secondModifier) =>
                Number(firstModifier.order || 0)
                - Number(secondModifier.order || 0)
        );

    const startingModifiers = modifiers.filter(
        (modifier) =>
            modifier.placement === 'start'
    );

    const endingModifiers = modifiers.filter(
        (modifier) =>
            modifier.placement !== 'start'
            && modifier.placement !== 'after_item'
    );

    const modifiersAfterItem = (itemId) =>
        modifiers.filter(
            (modifier) =>
                modifier.placement === 'after_item'
                && modifier.afterItemId === itemId
        );

    return (
        <section className="min-h-0">
            <header className="mb-[0.78cqw] text-center">
                <div className="flex flex-wrap items-center justify-center gap-x-[0.42cqw] gap-y-[0.12cqw]">
                    <h1
                        style={DISPLAY_FONT_STYLE}
                        className="text-[1.55cqw] leading-[1.02] uppercase tracking-[0.025em] text-[#f4c542]"
                    >
                        {section.title}
                    </h1>

                    {section.titleEs && (
                        <>
                            <span className="text-[1.08cqw] text-white/42">
                                |
                            </span>

                            <h1
                                style={DISPLAY_FONT_STYLE}
                                className="text-[1.55cqw] leading-[1.02] uppercase tracking-[0.025em] text-[#f4c542]"
                            >
                                {section.titleEs}
                            </h1>
                        </>
                    )}
                </div>

                {(section.subtitle
                    || section.subtitleEs) && (
                        <p className="mt-[0.24cqw] text-[0.62cqw] leading-[1.1] font-bold uppercase tracking-[0.08em] text-white/70">
                            {section.subtitle}
                            {section.subtitle
                                && section.subtitleEs
                                ? ' · '
                                : ''}
                            {section.subtitleEs}
                        </p>
                    )}
            </header>

            {beforeItemsContent}

            <div className={itemSpacingClass}>
                {startingModifiers.map((modifier) => (
                    <SectionModifier
                        key={modifier.id}
                        modifier={modifier}
                    />
                ))}
                {items.map((item) => {
                    const isBeerItem =
                        COMPACT_BEER_ITEM_IDS.has(
                            item.id
                        );

                    if (isBeerItem) {
                        if (
                            item.id
                            !== firstBeerItemId
                        ) {
                            return null;
                        }

                        return (
                            <div
                                key="compact_beer_group"
                                className="space-y-[0.52cqw]"
                            >
                                <CompactBeerGroup
                                    items={beerItems}
                                    showSpanish={showSpanish}
                                />

                                {beerItems.flatMap(
                                    (beerItem) =>
                                        modifiersAfterItem(
                                            beerItem.id
                                        ).map(
                                            (modifier) => (
                                                <SectionModifier
                                                    key={modifier.id}
                                                    modifier={modifier}
                                                />
                                            )
                                        )
                                )}
                            </div>
                        );
                    }

                    return (
                        <div
                            key={item.id}
                            className="space-y-[0.52cqw]"
                        >
                            <MenuItem item={item} />

                            {modifiersAfterItem(item.id)
                                .map((modifier) => (
                                    <SectionModifier
                                        key={modifier.id}
                                        modifier={modifier}
                                    />
                                ))}

                            {afterItemContent
                                && afterItemId === item.id
                                && afterItemContent}
                        </div>
                    );
                })}

                {endingModifiers.map((modifier) => (
                    <SectionModifier
                        key={modifier.id}
                        modifier={modifier}
                    />
                ))}
            </div>
            {section.id === 'bbq_sauces' && (
                <div className="mt-[0.72cqw]">
                    <PricingGroup
                        pricingGroup={pricingGroup}
                        showSpanish={showSpanish}
                    />
                </div>
            )}

        </section>
    );
}

function DietaryLegend({
    showSpanish = true
}) {
    return (
        <div className="flex flex-wrap items-center justify-center gap-x-[0.78cqw] gap-y-[0.18cqw] text-[0.56cqw] font-bold text-white/78">
            {Object.entries(DIETARY_BADGES).map(
                ([flag, badge]) => (
                    <div
                        key={flag}
                        className="flex items-center gap-[0.25cqw]"
                    >
                        <DietaryBadges flags={[flag]} />

                        <span>
                            {badge.label}

                            {showSpanish && (
                                <>
                                    {' / '}
                                    {badge.labelEs}
                                </>
                            )}
                        </span>
                    </div>
                )
            )}
        </div>
    );
}

function AllergenNotice({ menu }) {
    const notice =
        menu?.displayNotices?.allergenDisclaimer
        || '';

    const noticeEs =
        menu?.displayNotices?.allergenDisclaimerEs
        || '';

    if (!notice && !noticeEs) {
        return null;
    }

    return (
        <p className="text-center text-[0.57cqw] leading-[1.12] font-semibold text-white/72">
            {notice}

            {notice && noticeEs && (
                <span className="mx-[0.45cqw] text-[#f4c542]">
                    |
                </span>
            )}

            {noticeEs}
        </p>
    );
}

export default function SidesMenuPreview({ menu }) {
    const showSpanish =
        shouldShowSpanish(menu);

    const displayMenu =
        createMenuDisplayModel(menu);

    const columns =
        getVisibleSections(displayMenu);

    const sidesPricing = getPricingGroup(
        displayMenu,
        'sides_and_desserts'
    );

    const fountainFlavorSettings =
        displayMenu?.fountainFlavors || {};

    const visibleSectionCount = columns.reduce(
        (total, column) => total + column.length,
        0
    );

    return (
        <div
            style={{
                ...BODY_FONT_STYLE,
                containerType: 'inline-size'
            }}
            className="w-full h-full overflow-hidden bg-[#0d0d0c] text-white"
        >
            <div className="h-full flex flex-col px-[1.4cqw] pt-[0.85cqw] pb-[0.65cqw]">

                {visibleSectionCount > 0 ? (
                    <main
                        className="
                            flex-1
                            min-h-0
                            grid
                            grid-cols-3
                            gap-x-[1.45cqw]
                        "
                    >
                        {columns.map((column, columnIndex) => (
                            <div
                                key={
                                    COLUMN_SECTIONS[
                                        columnIndex
                                    ].join('-')
                                }
                                className={`
                                    min-w-0
                                    min-h-0
                                    flex
                                    flex-col
                                    ${COLUMN_GAP_CLASSES[
                                    columnIndex
                                    ] || 'gap-[1cqw]'}
                                `}
                            >
                                {column.map((section) => (
                                    <MenuSection
                                        key={section.id}
                                        section={section}
                                        menu={displayMenu}
                                        showSpanish={showSpanish}
                                        afterItemId={
                                            section.id === 'drinks'
                                                ? 'milk'
                                                : ''
                                        }
                                        afterItemContent={
                                            section.id === 'drinks'
                                                ? (
                                                    <FountainFlavorGrid
                                                        enabled={
                                                            fountainFlavorSettings
                                                                .enabled
                                                            !== false
                                                        }
                                                        showTitle
                                                        title="SODA FLAVORS"
                                                        titleEs={
                                                            showSpanish
                                                                ? 'SABORES DE REFRESCOS'
                                                                : ''
                                                        }
                                                        brandIds={
                                                            Array.isArray(
                                                                fountainFlavorSettings
                                                                    .brandIds
                                                            )
                                                                && fountainFlavorSettings
                                                                    .brandIds
                                                                    .length > 0
                                                                ? fountainFlavorSettings
                                                                    .brandIds
                                                                : undefined
                                                        }
                                                    />
                                                )
                                                : null
                                        }
                                    />
                                ))}

                                {columnIndex === 0
                                    && sidesPricing && (
                                        <PricingGroup
                                            pricingGroup={
                                                sidesPricing
                                            }
                                            showSpanish={showSpanish}
                                        />
                                    )}
                            </div>
                        ))}
                    </main>
                ) : (
                    <main className="flex-1 flex items-center justify-center text-center">
                        <p className="text-[1.2cqw] font-bold uppercase tracking-wider text-white/65">
                            No visible menu sections
                        </p>
                    </main>
                )}

                <footer className="shrink-0 mt-[0.62cqw] border-t border-[#f4c542]/38 pt-[0.34cqw] space-y-[0.22cqw]">
                    <DietaryLegend
                        showSpanish={showSpanish}
                    />
                    <AllergenNotice
                        menu={displayMenu}
                        showSpanish={showSpanish}
                    />
                </footer>
            </div>
        </div>
    );
}
