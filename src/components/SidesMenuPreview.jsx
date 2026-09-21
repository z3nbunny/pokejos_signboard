import '@fontsource/rye/400.css';
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css';

import FountainFlavorGrid from './FountainFlavorGrid';

const DISPLAY_FONT_STYLE = {
    fontFamily: 'Rye, serif'
};

const BODY_FONT_STYLE = {
    fontFamily:
        'Atkinson Hyperlegible Next Variable, sans-serif'
};

const COLUMN_SECTIONS = [
    ['hot_sides'],
    ['cold_sides', 'bbq_sauces'],
    ['desserts', 'drinks']
];

const COLUMN_GAP_CLASSES = [
    'gap-[0.9cqw]',
    'gap-[2.8cqw]',
    'gap-[4.2cqw]'
];

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
            <p className="mt-[0.16cqw] text-[0.68cqw] leading-[1.14] text-white/82">
                {description}

                {description && descriptionEs && (
                    <span className="mx-[0.28cqw] text-[#f4c542]/70">
                        |
                    </span>
                )}

                {descriptionEs && (
                    <span className="text-white/62">
                        {descriptionEs}
                    </span>
                )}
            </p>
        );
    }

    return (
        <div className="mt-[0.16cqw] text-[0.68cqw] leading-[1.14] text-white/82">
            {description && (
                <p>{description}</p>
            )}

            {descriptionEs && (
                <p className="text-white/62">
                    {descriptionEs}
                </p>
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
            <div className="mt-[0.16cqw] text-[0.62cqw] leading-[1.14] text-white/70">
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
                                    <span className="text-white/52">
                                        {detailEs}
                                    </span>
                                )}
                            </p>
                        );
                    }
                )}
            </div>
        );
    }

    return (
        <div className="mt-[0.16cqw] text-[0.62cqw] leading-[1.14] text-white/70">
            {details.map((detail) => (
                <p key={detail}>{detail}</p>
            ))}

            {detailsEs.map((detail) => (
                <p
                    key={detail}
                    className="text-white/52"
                >
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
                        <h3 className="text-[1.02cqw] leading-[1.04] font-[850] uppercase text-white">
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

                                    <span className="text-[1.02cqw] font-black text-[#f4c542]">
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
function CompactBeerGroup({ items = [] }) {
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
                priceCents: priceOption.priceCents
            };
        })
        .filter(Boolean);

    if (visibleItems.length === 0) {
        return null;
    }

    return (
        <section className="mt-[0.42cqw] border-t border-[#f4c542]/32 pt-[0.42cqw]">
            <h3
                style={DISPLAY_FONT_STYLE}
                className="
                    mb-[0.38cqw]
                    text-center
                    text-[1.12cqw]
                    leading-none
                    uppercase
                    text-[#f4c542]
                "
            >
                BEERS

                <span className="mx-[0.34cqw] text-white/45">
                    |
                </span>

                CERVEZAS
            </h3>

            <div
                className="grid gap-[0.85cqw]"
                style={{
                    gridTemplateColumns:
                        `repeat(${visibleItems.length}, minmax(0, 1fr))`
                }}
            >
                {visibleItems.map((item) => (
                    <div
                        key={item.id}
                        className="
                            flex
                            items-baseline
                            justify-center
                            gap-[0.34cqw]
                            whitespace-nowrap
                        "
                    >
                        <span className="text-[0.65cqw] font-black uppercase text-white">
                            {item.label}

                            {item.label && item.labelEs
                                ? ' / '
                                : ''}

                            {item.labelEs}
                        </span>

                        <span className="text-[0.92cqw] font-black text-[#f4c542]">
                            {formatPrice(
                                item.priceCents
                            )}
                        </span>
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

function PricingGroup({ pricingGroup }) {
    if (!pricingGroup) {
        return null;
    }

    const prices = (
        pricingGroup.priceOptions || []
    ).filter(
        (priceOption) =>
            priceOption.enabled !== false
    );

    return (
        <section className="rounded-[0.55cqw] border border-[#f4c542]/45 bg-[#f4c542]/8 px-[0.72cqw] py-[0.42cqw]">
            <div className="flex items-center justify-center gap-[0.4cqw] text-center">
                <h2
                    style={DISPLAY_FONT_STYLE}
                    className="text-[0.86cqw] leading-none uppercase tracking-[0.025em] text-[#f4c542]"
                >
                    {pricingGroup.title}
                </h2>

                {pricingGroup.titleEs && (
                    <>
                        <span className="text-[0.75cqw] text-white/38">
                            |
                        </span>

                        <h2
                            style={DISPLAY_FONT_STYLE}
                            className="text-[0.86cqw] leading-none uppercase tracking-[0.025em] text-[#f4c542]"
                        >
                            {pricingGroup.titleEs}
                        </h2>
                    </>
                )}
            </div>

            <div
                className="mt-[0.36cqw] grid gap-[0.35cqw]"
                style={{
                    gridTemplateColumns:
                        `repeat(${Math.max(prices.length, 1)}, minmax(0, 1fr))`
                }}
            >
                {prices.map((priceOption) => (
                    <div
                        key={priceOption.id}
                        className="text-center leading-none"
                    >
                        <p className="text-[0.56cqw] font-bold uppercase tracking-[0.04em] text-white/68">
                            {priceOption.label}
                            {priceOption.label
                                && priceOption.labelEs
                                ? ' | '
                                : ''}
                            {priceOption.labelEs}
                        </p>

                        <p className="mt-[0.16cqw] text-[0.92cqw] font-black text-white">
                            {formatPrice(
                                priceOption.priceCents
                            )}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function MenuSection({
    section,
    menu,
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
        items.length >= 7
            ? 'space-y-[0.72cqw]'
            : items.length >= 5
                ? 'space-y-[0.86cqw]'
                : 'space-y-[1cqw]';

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
            <header className="mb-[0.58cqw] text-center">
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

            {section.id === 'bbq_sauces' && (
                <div className="mb-[0.58cqw]">
                    <PricingGroup
                        pricingGroup={pricingGroup}
                    />
                </div>
            )}

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
        </section>
    );
}

function DietaryLegend() {
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
                            {' / '}
                            {badge.labelEs}
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
    const columns = getVisibleSections(menu);

    const sidesPricing = getPricingGroup(
        menu,
        'sides_and_desserts'
    );

    const fountainFlavorSettings =
        menu?.fountainFlavors || {};

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
                                        menu={menu}
                                        beforeItemsContent={
                                            section.id === 'drinks'
                                                ? (
                                                    <FountainFlavorGrid
                                                        enabled={
                                                            fountainFlavorSettings
                                                                .enabled
                                                            !== false
                                                        }
                                                        showTitle={false}
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
                    <DietaryLegend />
                    <AllergenNotice menu={menu} />
                </footer>
            </div>
        </div>
    );
}
