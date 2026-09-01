import '@fontsource/rye/400.css';
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css';

const DISPLAY_FONT_STYLE = {
    fontFamily: "'Rye', sans-serif"
};

const BODY_FONT_STYLE = {
    fontFamily:
        "'Atkinson Hyperlegible Next Variable', sans-serif"
};

const MENU_TYPE_CLASSES = {
    sectionTitle:
        'whitespace-nowrap '
        + 'text-[clamp(18px,1.28cqw,48px)] '
        + 'font-normal uppercase '
        + 'tracking-[0.035em] leading-[1.05] '
        + 'text-[#f4c542]',

    sectionSubtitle:
        'whitespace-pre-line '
        + 'text-[clamp(11px,0.7cqw,26px)] '
        + 'font-semibold tracking-[0.02em] '
        + 'leading-[1.2]',

    itemName:
        'text-[clamp(13px,1.04cqw,39px)] '
        + 'font-bold uppercase '
        + 'tracking-[0.005em] leading-[1.08]',

    price:
        'text-[clamp(13px,1.04cqw,39px)] '
        + 'font-extrabold text-[#f4c542] '
        + 'tabular-nums leading-none',

    supporting:
        'text-[clamp(11px,0.78cqw,29px)] '
        + 'font-medium leading-[1.22] '
        + 'text-white/95',

    detail:
        'text-[clamp(11px,0.76cqw,28px)] '
        + 'font-medium leading-[1.2] '
        + 'text-white/95',

    optionLabel:
        'text-[clamp(10px,0.7cqw,26px)] '
        + 'font-semibold tracking-[0.015em] '
        + 'leading-[1.15] text-white/90',

    modifierLabel:
        'text-[clamp(11px,0.84cqw,31px)] '
        + 'font-bold uppercase '
        + 'tracking-[0.01em] leading-[1.1] '
        + 'text-[#f4c542]',

    modifierDescription:
        'text-[clamp(11px,0.76cqw,28px)] '
        + 'font-medium leading-[1.2] '
        + 'text-white/95',

    disclosure:
        'text-[clamp(10px,0.66cqw,24px)] '
        + 'font-medium leading-[1.2] '
        + 'text-white/85'
};

const DEFAULT_DISPLAY_NOTICES = {
    platesAndSandwichesBrisketUpchargeCents: 200,
    specialtyBrisketUpchargeCents: 100,
    glutenDisclaimer:
        'Products are prepared in a shared kitchen. Cross-contact with gluten and other allergens is possible. Please tell our team about any allergies.',
    glutenDisclaimerEs:
        'Los productos se preparan en una cocina compartida. Puede haber contacto cruzado con gluten y otros alérgenos. Informe a nuestro personal sobre cualquier alergia.'
};

const SECTION_COLUMNS = [
    [
        'bbq_plates',
        'bbq_sandwiches'
    ],
    [
        'family_packs',
        'kids_meals'
    ],
    [
        'meat_by_pound',
        'more_great_eating'
    ]
];

const SECTION_SIZE_CLASSES = {
    bbq_plates: 'shrink-0',
    bbq_sandwiches: 'shrink-0',
    family_packs: 'flex-[1.2]',
    kids_meals: 'flex-[0.8]',
    meat_by_pound: 'flex-[1.1]',
    more_great_eating: 'flex-[0.9]'
};

const DENSE_SECTIONS = new Set([
    'family_packs',
    'meat_by_pound',
    'kids_meals'
]);

const sortByOrder = (records) =>
    [...(records || [])].sort(
        (firstRecord, secondRecord) =>
            Number(firstRecord.order || 0)
            - Number(secondRecord.order || 0)
    );

const formatPrice = (priceCents) => {
    const numericPrice = Number(priceCents);

    if (!Number.isFinite(numericPrice)) {
        return '';
    }

    const dollarValue =
        (numericPrice / 100).toFixed(2);

    return `$${dollarValue.replace(/\.00$/, '')}`;
};

const getDisplayedDetails = (item) =>
    (item.details || [])
        .map((detail) =>
            String(detail || '').trim()
        )
        .filter(Boolean);

const getDisplayedDescription = (item) =>
    String(item.description || '').trim();

const getDisplayedPriceLabel = (priceOption) =>
    String(priceOption.label || '').trim();

const buildSectionColumns = (sections) => {
    const visibleSections = sortByOrder(
        sections
    ).filter(
        (section) =>
            section.enabled !== false
    );

    const sectionsById = new Map(
        visibleSections.map(
            (section) => [
                section.id,
                section
            ]
        )
    );

    const assignedSectionIds = new Set();

    const columns = SECTION_COLUMNS.map(
        (sectionIds) =>
            sectionIds
                .map((sectionId) => {
                    const section =
                        sectionsById.get(sectionId);

                    if (section) {
                        assignedSectionIds.add(
                            sectionId
                        );
                    }

                    return section;
                })
                .filter(Boolean)
    );

    const additionalSections =
        visibleSections.filter(
            (section) =>
                !assignedSectionIds.has(
                    section.id
                )
        );

    additionalSections.forEach(
        (section, index) => {
            columns[index % columns.length].push(
                section
            );
        }
    );

    return columns;
};

function MenuItem({
    item,
    dense,
    sectionId
}) {
    const priceOptions = sortByOrder(
        item.priceOptions
    );

    const singlePrice =
        priceOptions.length === 1
            ? priceOptions[0]
            : null;

    const displayedDescription =
        getDisplayedDescription(item);

    const displayedDetails =
        getDisplayedDetails(item);

    const isChickenRow =
        sectionId === 'meat_by_pound'
        && /chicken/i.test(item.name)
        && priceOptions.length > 1;

    const shouldStackName = Boolean(
        item.nameEs
        && (
            item.name.length
            + item.nameEs.length
        ) > 34
    );

    if (isChickenRow) {
        return (
            <article className="flex items-baseline justify-between gap-[0.7cqw]">
                <h3 className={
                    MENU_TYPE_CLASSES.itemName
                    + ' min-w-0 flex flex-wrap '
                    + 'items-baseline gap-x-[0.25cqw]'
                }>
                    <span>{item.name}</span>

                    <span className="whitespace-nowrap">
                        <span
                            aria-hidden="true"
                            className="mr-[0.25cqw] text-white/50"
                        >
                            |
                        </span>

                        <span lang="es">
                            {item.nameEs || 'Pollo'}
                        </span>
                    </span>
                </h3>

                <div className="shrink-0 flex items-baseline gap-[0.7cqw]">
                    {priceOptions.some(
                        (priceOption) =>
                            getDisplayedPriceLabel(priceOption)
                    ) && (
                            <span className="text-[clamp(9px,0.67cqw,25px)] font-semibold tracking-wide text-white/90">
                                {priceOptions
                                    .map(getDisplayedPriceLabel)
                                    .filter(Boolean)
                                    .join(' · ')}
                            </span>
                        )}

                    <span className="text-[clamp(12px,0.92cqw,34px)] font-extrabold text-[#f4c542] tabular-nums">
                        {priceOptions.map(
                            (priceOption) =>
                                formatPrice(
                                    priceOption.priceCents
                                )
                        ).join(' · ')}
                    </span>
                </div>
            </article>
        );
    }

    return (
        <article
            className={
                dense
                    ? 'space-y-[0.15cqw]'
                    : 'space-y-[0.24cqw]'
            }
        >
            <div className="flex items-baseline justify-between gap-[0.65cqw]">
                <h3
                    className={
                        'min-w-0 text-[clamp(13px,1.08cqw,40px)] '
                        + 'font-extrabold uppercase tracking-[-0.01em] '
                        + (
                            shouldStackName
                                ? 'flex flex-col items-start gap-y-[0.08cqw] leading-[1.02]'
                                : 'flex flex-wrap items-baseline gap-x-[0.25cqw] leading-[1.02]'
                        )
                    }
                >
                    <span>{item.name}</span>

                    {item.nameEs && (
                        <span
                            className={
                                shouldStackName
                                    ? 'text-[0.92em] whitespace-nowrap'
                                    : 'whitespace-nowrap'
                            }
                        >
                            {!shouldStackName && (
                                <span
                                    aria-hidden="true"
                                    className="mr-[0.25cqw] text-white/50"
                                >
                                    |
                                </span>
                            )}

                            <span lang="es">
                                {item.nameEs}
                            </span>
                        </span>
                    )}
                </h3>

                {singlePrice && (
                    <div className="shrink-0 flex items-baseline gap-[0.32cqw]">
                        {singlePrice.label
                            && sectionId
                            !== 'meat_by_pound' && (
                                <span className={MENU_TYPE_CLASSES.optionLabel}>
                                    {singlePrice.label}
                                </span>
                            )}

                        <span className={MENU_TYPE_CLASSES.price}>
                            {formatPrice(
                                singlePrice.priceCents
                            )}
                        </span>
                    </div>
                )}
            </div>

            {displayedDescription && (
                <p className={MENU_TYPE_CLASSES.supporting}>
                    {displayedDescription}
                </p>
            )}

            {displayedDetails.length > 0 && (
                <ul
                    className={
                        sectionId === 'family_packs'
                            ? 'grid grid-cols-2 gap-x-[0.75cqw] gap-y-[0.12cqw]'
                            : 'space-y-[0.1cqw]'
                    }
                >
                    {displayedDetails.map(
                        (detail, detailIndex) => (
                            <li
                                key={
                                    `${item.id}-detail-`
                                    + detailIndex
                                }
                                className={
                                    MENU_TYPE_CLASSES.detail
                                    + ' flex gap-[0.32cqw]'
                                }
                            >
                                <span
                                    aria-hidden="true"
                                    className="text-[#f4c542]"
                                >
                                    •
                                </span>

                                <span>{detail}</span>
                            </li>
                        )
                    )}
                </ul>
            )}

            {priceOptions.length > 1 && (
                <div className="space-y-[0.1cqw] pt-[0.05cqw]">
                    {priceOptions.map(
                        (priceOption) => (
                            <div
                                key={priceOption.id}
                                className="flex items-baseline justify-between gap-[0.5cqw]"
                            >
                                <span className={MENU_TYPE_CLASSES.optionLabel}>
                                    {getDisplayedPriceLabel(
                                        priceOption
                                    )}
                                </span>

                                <span className={MENU_TYPE_CLASSES.price}>
                                    {formatPrice(
                                        priceOption
                                            .priceCents
                                    )}
                                </span>
                            </div>
                        )
                    )}
                </div>
            )}
        </article>
    );
}

function SectionHeading({
    section
}) {
    const title =
        String(section.title || '').trim();

    const titleEs =
        String(section.titleEs || '').trim();

    const notes = [
        section.subtitle,
        section.subtitleEs
    ]
        .map((note) =>
            String(note || '').trim()
        )
        .filter(Boolean);

    return (
        <header className="mb-[0.62cqw] text-center">
            <h2
                style={DISPLAY_FONT_STYLE}
                className={MENU_TYPE_CLASSES.sectionTitle}
            >
                <span>{title}</span>

                {titleEs && (
                    <>
                        <span
                            aria-hidden="true"
                            className="mx-[0.38cqw] text-white/40"
                        >
                            |
                        </span>

                        <span lang="es">
                            {titleEs}
                        </span>
                    </>
                )}
            </h2>

            {notes.length > 0 && (
                <div className="mt-[0.34cqw] space-y-[0.08cqw]">
                    {notes.map((note, index) => (
                        <p
                            key={`${index}-${note}`}
                            lang={
                                index === 1
                                    ? 'es'
                                    : undefined
                            }
                            className={
                                MENU_TYPE_CLASSES.sectionSubtitle
                                + (
                                    index === 0
                                        ? ' text-white/95'
                                        : ' text-white/90'
                                )
                            }
                        >
                            {note}
                        </p>
                    ))}
                </div>
            )}
        </header>
    );
}

function MenuModifier({
    modifier
}) {
    const label =
        String(modifier.label || '').trim();

    const labelEs =
        String(modifier.labelEs || '').trim();

    const description =
        String(
            modifier.description || ''
        ).trim();

    const descriptionEs =
        String(
            modifier.descriptionEs || ''
        ).trim();

    const numericPrice =
        Number(modifier.priceCents);

    const hasPrice =
        Number.isFinite(numericPrice)
        && numericPrice > 0;

    return (
        <div className="flex items-baseline justify-between gap-[0.5cqw]">
            <div className="min-w-0">
                <p className={MENU_TYPE_CLASSES.modifierLabel}>
                    <span>{label}</span>

                    {labelEs && (
                        <>
                            <span
                                aria-hidden="true"
                                className="mx-[0.25cqw] text-white/45"
                            >
                                |
                            </span>

                            <span lang="es">
                                {labelEs}
                            </span>
                        </>
                    )}
                </p>

                {description && (
                    <p
                        className={
                            MENU_TYPE_CLASSES
                                .modifierDescription
                        }
                    >
                        {description}
                    </p>
                )}

                {descriptionEs && (
                    <p
                        lang="es"
                        className={
                            MENU_TYPE_CLASSES
                                .modifierDescription
                            + ' mt-[0.08cqw]'
                        }
                    >
                        {descriptionEs}
                    </p>
                )}
            </div>

            {hasPrice && (
                <span
                    className={
                        MENU_TYPE_CLASSES.price
                        + ' shrink-0'
                    }
                >
                    +
                    {formatPrice(numericPrice)}
                </span>
            )}
        </div>
    );
}

function MenuModifierList({
    modifiers,
    className = ''
}) {
    if (modifiers.length === 0) {
        return null;
    }

    return (
        <div
            className={
                'space-y-[0.26cqw] '
                + className
            }
        >
            {modifiers.map((modifier) => (
                <MenuModifier
                    key={modifier.id}
                    modifier={modifier}
                />
            ))}
        </div>
    );
}

function MenuSection({
    section
}) {
    const visibleItems = sortByOrder(
        section.items
    ).filter(
        (item) =>
            item.enabled !== false
    );

    const visibleModifiers = sortByOrder(
        section.modifiers
    ).filter(
        (modifier) =>
            modifier.enabled !== false
    );

    const visibleItemIds = new Set(
        visibleItems.map((item) => item.id)
    );

    const startModifiers =
        visibleModifiers.filter(
            (modifier) =>
                modifier.placement === 'start'
        );

    const afterItemModifiers =
        visibleModifiers.filter(
            (modifier) =>
                modifier.placement === 'after_item'
                && visibleItemIds.has(
                    modifier.afterItemId
                )
        );

    /*
     * Existing modifiers and modifiers whose target item is
     * unavailable fall back to the section end.
     */
    const endModifiers =
        visibleModifiers.filter((modifier) => {
            if (modifier.placement === 'start') {
                return false;
            }

            if (
                modifier.placement === 'after_item'
                && visibleItemIds.has(
                    modifier.afterItemId
                )
            ) {
                return false;
            }

            return true;
        });

    const modifiersByItemId = new Map();

    afterItemModifiers.forEach((modifier) => {
        const currentModifiers =
            modifiersByItemId.get(
                modifier.afterItemId
            ) || [];

        modifiersByItemId.set(
            modifier.afterItemId,
            [
                ...currentModifiers,
                modifier
            ]
        );
    });

    const dense =
        DENSE_SECTIONS.has(section.id);

    const itemSpacingClass =
        section.id === 'meat_by_pound'
            ? 'space-y-[0.14cqw]'
            : dense
                ? 'space-y-[0.38cqw]'
                : 'space-y-[0.56cqw]';

    const sizeClass =
        SECTION_SIZE_CLASSES[section.id]
        || 'flex-1';

    return (
        <section
            className={`${sizeClass} min-h-0 overflow-hidden px-[0.12cqw] py-[0.15cqw]`}
        >
            <SectionHeading section={section} />

            <MenuModifierList
                modifiers={startModifiers}
                className={
                    'mb-[0.5cqw] border-y '
                    + 'border-[#f4c542]/35 '
                    + 'py-[0.34cqw]'
                }
            />

            {visibleItems.length > 0 ? (
                <div className={itemSpacingClass}>
                    {visibleItems.map((item) => {
                        const itemModifiers =
                            modifiersByItemId.get(
                                item.id
                            ) || [];

                        return (
                            <div
                                key={item.id}
                                className="space-y-[0.28cqw]"
                            >
                                <MenuItem
                                    item={item}
                                    dense={dense}
                                    sectionId={
                                        section.id
                                    }
                                />

                                <MenuModifierList
                                    modifiers={
                                        itemModifiers
                                    }
                                    className={
                                        'border-t '
                                        + 'border-[#f4c542]/25 '
                                        + 'pt-[0.3cqw]'
                                    }
                                />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className={MENU_TYPE_CLASSES.supporting}>
                    No items currently available.
                </p>
            )}

            <MenuModifierList
                modifiers={endModifiers}
                className={
                    'mt-[0.6cqw] border-t '
                    + 'border-[#f4c542]/35 '
                    + 'pt-[0.42cqw]'
                }
            />
        </section>
    );
}

function PreviewSpotlight({
    menu,
    spotlight
}) {
    const superSpud =
        (menu?.sections || [])
            .flatMap(
                (section) =>
                    section.items || []
            )
            .find(
                (item) =>
                    item.id === 'super_spud'
                    || /super spud/i.test(
                        item.name
                    )
            );

    if (!spotlight && !superSpud) {
        return null;
    }

    const fallbackPrice = superSpud
        ? sortByOrder(
            superSpud.priceOptions
        )[0]
        : null;

    const displayedSpotlight = spotlight || {
        label: 'Featured',
        labelEs: 'Destacado',
        title: superSpud.name,
        titleEs: superSpud.nameEs || '',
        description:
            'Baked potato with butter, bacon, cheese and sour cream, plus your choice of BBQ meat.',
        descriptionEs:
            'Papa al horno con mantequilla, tocino, queso y crema agria, más carne BBQ a elegir.',
        priceCents:
            fallbackPrice?.priceCents
    };

    return (
        <section className="flex-1 min-h-0 overflow-hidden rounded-[0.5cqw] bg-[#f4c542] px-[0.9cqw] py-[0.7cqw] text-[#0d0d0c]">
            <header className="text-center">
                <p
                    style={DISPLAY_FONT_STYLE}
                    className="text-[clamp(10px,0.76cqw,28px)] uppercase tracking-[0.025em] leading-none"
                >
                    {displayedSpotlight.label}
                </p>

                {displayedSpotlight.labelEs && (
                    <p
                        lang="es"
                        className="mt-[0.13cqw] text-[clamp(9px,0.62cqw,23px)] font-extrabold uppercase tracking-[0.04em] leading-none text-black/75"
                    >
                        {displayedSpotlight.labelEs}
                    </p>
                )}
            </header>

            <div className="mt-[0.55cqw] flex items-start justify-between gap-[0.65cqw]">
                <div className="min-w-0">
                    <h3 className="text-[clamp(13px,1.08cqw,40px)] font-extrabold uppercase tracking-[-0.01em] leading-none">
                        {displayedSpotlight.title}
                    </h3>

                    {displayedSpotlight.titleEs && (
                        <p
                            lang="es"
                            className="mt-[0.14cqw] text-[clamp(11px,0.82cqw,30px)] font-extrabold uppercase leading-none"
                        >
                            {displayedSpotlight.titleEs}
                        </p>
                    )}

                    {displayedSpotlight.description && (
                        <p className="mt-[0.28cqw] text-[clamp(10px,0.7cqw,26px)] font-semibold leading-[1.12]">
                            {displayedSpotlight.description}
                        </p>
                    )}

                    {displayedSpotlight.descriptionEs && (
                        <p
                            lang="es"
                            className="mt-[0.22cqw] text-[clamp(9px,0.62cqw,23px)] font-semibold leading-[1.12] text-black/80"
                        >
                            {displayedSpotlight.descriptionEs}
                        </p>
                    )}
                </div>

                {Number.isFinite(
                    Number(
                        displayedSpotlight.priceCents
                    )
                ) && (
                        <span className="shrink-0 text-[clamp(15px,1.2cqw,45px)] font-extrabold tabular-nums leading-none">
                            {formatPrice(
                                displayedSpotlight.priceCents
                            )}
                        </span>
                    )}
            </div>
        </section>
    );
}

function MenuNotices({ menu }) {
    const notices = {
        ...DEFAULT_DISPLAY_NOTICES,
        ...(menu?.displayNotices || {})
    };

    return (
        <>
            <div className="shrink-0 grid grid-cols-2 gap-[1.5cqw] border-y border-[#f4c542]/30 py-[0.22cqw] text-[clamp(9px,0.58cqw,22px)] font-extrabold uppercase tracking-[0.025em] leading-[1.1] text-[#f4c542]">
                <p>
                    Brisket: Plates &amp; Sandwiches +
                    {formatPrice(
                        notices
                            .platesAndSandwichesBrisketUpchargeCents
                    )}
                    {' · '}Pok-E-To, Spuds &amp; Salads +
                    {formatPrice(
                        notices
                            .specialtyBrisketUpchargeCents
                    )}
                </p>

                <p lang="es" className="text-right">
                    Brisket: Platos y Sándwiches +
                    {formatPrice(
                        notices
                            .platesAndSandwichesBrisketUpchargeCents
                    )}
                    {' · '}Pok-E-To, Papas y Ensaladas +
                    {formatPrice(
                        notices
                            .specialtyBrisketUpchargeCents
                    )}
                </p>
            </div>

            <footer
                className={
                    MENU_TYPE_CLASSES.disclosure
                    + ' shrink-0 grid grid-cols-2 '
                    + 'gap-[1.5cqw] pt-[0.28cqw]'
                }
            >
                <p>{notices.glutenDisclaimer}</p>

                <p lang="es" className="text-right">
                    {notices.glutenDisclaimerEs}
                </p>
            </footer>
        </>
    );
}

export default function MeatMenuPreview({
    menu,
    spotlight = null
}) {
    const columns = buildSectionColumns(
        menu?.sections || []
    );

    const visibleSectionCount =
        columns.reduce(
            (total, column) =>
                total + column.length,
            0
        );

    return (
        <div
            style={BODY_FONT_STYLE}
            className="relative w-full h-full overflow-hidden bg-[#0d0d0c] text-white [container-type:inline-size]"
        >
            <div className="absolute inset-[1.35%] flex flex-col">
                {visibleSectionCount > 0 ? (
                    <main className="flex-1 min-h-0 grid grid-cols-[1fr_1.06fr_1.04fr] gap-[1.7cqw] pt-[0.15cqw]">
                        {columns.map(
                            (column, columnIndex) => (
                                <div
                                    key={
                                        `menu-column-`
                                        + columnIndex
                                    }
                                    className="min-h-0 flex flex-col gap-[0.75cqw]"
                                >
                                    {column.map(
                                        (section) => (
                                            <MenuSection
                                                key={
                                                    section.id
                                                }
                                                section={
                                                    section
                                                }
                                            />
                                        )
                                    )}

                                    {columnIndex === 0 && (
                                        <PreviewSpotlight
                                            menu={menu}
                                            spotlight={spotlight}
                                        />
                                    )}
                                </div>
                            )
                        )}
                    </main>
                ) : (
                    <main className="flex-1 flex items-center justify-center">
                        <p className="text-[clamp(12px,1.4cqw,50px)] uppercase tracking-widest text-white/45">
                            No visible menu sections
                        </p>
                    </main>
                )}

                <MenuNotices menu={menu} />
            </div>
        </div>
    );
}
