import pokejosLogoWhite from '../assets/pokejos-logo-white.png';
import '@fontsource/bowlby-one-sc';
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css';

const DISPLAY_FONT_STYLE = {
    fontFamily: "'Bowlby One SC', sans-serif"
};

const BODY_FONT_STYLE = {
    fontFamily:
        "'Atkinson Hyperlegible Next Variable', sans-serif"
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

const SECTION_PRESENTATION = {
    bbq_plates: {
        title: 'PLATES',
        titleEs: 'PLATOS',
        notes: [
            '2 SIDES · TEXAS TOAST · BBQ SAUCE',
            '2 GUARNICIONES · PAN TOSTADO · SALSA BBQ'
        ]
    },
    bbq_sandwiches: {
        title: 'SANDWICHES',
        titleEs: 'SÁNDWICHES',
        notes: [
            'CHOOSE YOUR SMOKED MEAT · EXCEPT RIBS',
            'ELIGE TU CARNE AHUMADA · EXCEPTO COSTILLAS'
        ]
    },
    family_packs: {
        title: 'FAMILY PACKS',
        titleEs: 'PAQUETES FAMILIARES',
        notes: [
            'WHITE OR WHEAT BREAD · PICKLES · ONIONS · JALAPEÑOS',
            'PAN BLANCO O INTEGRAL · PEPINILLOS · CEBOLLA · JALAPEÑOS'
        ]
    },
    kids_meals: {
        title: 'KIDS',
        titleEs: 'NIÑOS'
    },
    meat_by_pound: {
        title: 'BY THE POUND',
        titleEs: 'POR LIBRA',
        notes: []
    },
    more_great_eating: {
        title: 'MORE FAVORITES',
        titleEs: 'MÁS FAVORITOS'
    }
};

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

const formatFamilyDetail = (detail) =>
    String(detail || '')
        .replace(
            /sliced meat or chicken/gi,
            'MEAT / CARNE'
        )
        .replace(
            /\bof sides\b/gi,
            'SIDES / GUARNICIONES'
        )
        .replace(
            /\bBBQ sauce\b/gi,
            'SAUCE / SALSA'
        )
        .replace(/\blb\./gi, 'LB')
        .replace(/\bpints?\b/gi, 'PT')
        .replace(/\bquarts?\b/gi, 'QT');

const getDisplayedDetails = (
    item,
    sectionId
) => {
    const details = item.details || [];

    if (sectionId !== 'family_packs') {
        return details;
    }

    return details
        .filter(
            (detail) =>
                !/bread|pickle|onion|jalape/i.test(
                    detail
                )
        )
        .map(formatFamilyDetail);
};

const getDisplayedDescription = (
    item,
    sectionId
) => {
    const description =
        String(item.description || '');

    if (sectionId === 'family_packs') {
        const servingRange = description.match(
            /\d+\s*[-–—]\s*\d+/
        );

        if (servingRange) {
            return (
                'SERVES / RINDE '
                + servingRange[0].replace(
                    /\s*[-–—]\s*/,
                    '–'
                )
            );
        }

        return description;
    }

    if (
        sectionId === 'bbq_plates'
        && /^choose (one|two|three) smoked meats?$/i
            .test(description)
    ) {
        return '';
    }

    return description;
};

const getChickenSizeLabel = (label) => {
    const normalizedLabel =
        String(label || '').toLowerCase();

    if (normalizedLabel.includes('¼')) {
        return '¼';
    }

    if (normalizedLabel.includes('½')) {
        return '½';
    }

    if (normalizedLabel.includes('whole')) {
        return 'WHOLE';
    }

    return String(label || 'OPTION').toUpperCase();
};

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
        getDisplayedDescription(
            item,
            sectionId
        );

    const displayedDetails =
        getDisplayedDetails(
            item,
            sectionId
        );

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
                <h3 className="min-w-0 flex flex-wrap items-baseline gap-x-[0.25cqw] text-[clamp(13px,1.08cqw,40px)] font-extrabold uppercase tracking-[-0.025em] leading-none">
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
                    <span className="text-[clamp(9px,0.67cqw,25px)] font-bold uppercase tracking-wide text-white/90">
                        {priceOptions.map(
                            (priceOption) =>
                                getChickenSizeLabel(
                                    priceOption.label
                                )
                        ).join(' · ')}
                    </span>

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
                                <span className="text-[clamp(9px,0.66cqw,24px)] text-white/90 uppercase tracking-wide">
                                    {singlePrice.label}
                                </span>
                            )}

                        <span className="text-[clamp(13px,1.08cqw,40px)] font-extrabold text-[#f4c542] tabular-nums">
                            {formatPrice(
                                singlePrice.priceCents
                            )}
                        </span>
                    </div>
                )}
            </div>

            {displayedDescription && (
                <p className="text-[clamp(11px,0.78cqw,29px)] leading-[1.18] text-white/95">
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
                                className="flex gap-[0.32cqw] text-[clamp(11px,0.76cqw,28px)] leading-[1.14] text-white/95"
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
                                <span className="text-[clamp(10px,0.72cqw,27px)] uppercase tracking-wide text-white/90">
                                    {priceOption.label
                                        || 'Option'}
                                </span>

                                <span className="text-[clamp(12px,0.9cqw,34px)] font-extrabold text-[#f4c542] tabular-nums">
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
    const presentation =
        SECTION_PRESENTATION[section.id];

    const title =
        presentation?.title
        || section.title;

    const titleEs =
        presentation?.titleEs;

    const notes =
        presentation?.notes
        || (
            section.subtitle
                ? [section.subtitle]
                : []
        );

    return (
        <header className="mb-[0.62cqw] text-center">
            <h2
                style={DISPLAY_FONT_STYLE}
                className="whitespace-nowrap text-[clamp(14px,1.08cqw,41px)] font-normal uppercase tracking-[0.025em] leading-none text-[#f4c542]"
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

                        <span>{titleEs}</span>
                    </>
                )}
            </h2>

            {notes.length > 0 && (
                <div className="mt-[0.34cqw] space-y-[0.08cqw]">
                    {notes.map((note, index) => (
                        <p
                            key={note}
                            className={
                                'text-[clamp(10px,0.66cqw,24px)] '
                                + 'font-bold uppercase '
                                + 'tracking-[0.08em] '
                                + (
                                    index === 0
                                        ? 'text-white/95'
                                        : 'text-white/90'
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

function SandwichSummary({ section }) {
    const sandwichItem = sortByOrder(
        section.items
    ).find(
        (item) => item.enabled !== false
    );

    const basePrice = sandwichItem
        ? sortByOrder(
            sandwichItem.priceOptions
        )[0]
        : null;

    const comboModifier = sortByOrder(
        section.modifiers
    ).find(
        (modifier) =>
            modifier.enabled !== false
            && /side|drink|combo/i.test(
                modifier.label || ''
            )
    );

    if (!basePrice) {
        return null;
    }

    return (
        <div className="space-y-[0.48cqw]">
            <div className="flex items-baseline justify-between gap-[0.75cqw]">
                <p className="text-[clamp(11px,0.78cqw,29px)] font-extrabold uppercase tracking-[0.03em] text-white">
                    Base Price
                    <span className="mx-[0.28cqw] text-white/45">
                        |
                    </span>
                    <span lang="es">
                        Precio Base
                    </span>
                </p>

                <span className="shrink-0 text-[clamp(14px,1.1cqw,41px)] font-extrabold text-[#f4c542]">
                    {formatPrice(
                        basePrice.priceCents
                    )}
                </span>
            </div>

            {comboModifier && (
                <div className="border-t border-[#f4c542]/35 pt-[0.4cqw] flex items-start justify-between gap-[0.75cqw]">
                    <div>
                        <p className="text-[clamp(10px,0.72cqw,27px)] font-extrabold uppercase text-[#f4c542]">
                            Add a Side &amp; Drink,
                            or 2 Sides
                        </p>

                        <p
                            lang="es"
                            className="mt-[0.08cqw] text-[clamp(9px,0.62cqw,23px)] font-bold uppercase leading-[1.12] text-white/90"
                        >
                            Agrega una guarnición y bebida,
                            o 2 guarniciones
                        </p>
                    </div>

                    <span className="shrink-0 text-[clamp(12px,0.88cqw,33px)] font-extrabold text-[#f4c542]">
                        +
                        {formatPrice(
                            comboModifier.priceCents
                        )}
                    </span>
                </div>
            )}
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
            && !/brisket/i.test(
                modifier.label || ''
            )
    );

    const dense =
        DENSE_SECTIONS.has(section.id);

    const sizeClass =
        SECTION_SIZE_CLASSES[section.id]
        || 'flex-1';

    return (
        <section
            className={`${sizeClass} min-h-0 overflow-hidden px-[0.12cqw] py-[0.15cqw]`}
        >
            <SectionHeading section={section} />

            {section.id === 'bbq_sandwiches' ? (
                <SandwichSummary section={section} />
            ) : visibleItems.length > 0 ? (
                <div
                    className={
                        dense
                            ? 'space-y-[0.38cqw]'
                            : 'space-y-[0.56cqw]'
                    }
                >
                    {visibleItems.map((item) => (
                        <MenuItem
                            key={item.id}
                            item={item}
                            dense={dense}
                            sectionId={section.id}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-[clamp(10px,0.72cqw,27px)] italic text-white/85">
                    No items currently available.
                </p>
            )}

            {section.id !== 'bbq_sandwiches'
                && visibleModifiers.length > 0 && (
                    <div className="mt-[0.6cqw] border-t border-[#f4c542]/35 pt-[0.42cqw] space-y-[0.2cqw]">
                        {visibleModifiers.map(
                            (modifier) => (
                                <div
                                    key={modifier.id}
                                    className="flex items-baseline justify-between gap-[0.5cqw]"
                                >
                                    <div>
                                        <p className="text-[clamp(10px,0.72cqw,27px)] font-extrabold uppercase text-[#f4c542]">
                                            {modifier.label}
                                        </p>

                                        {modifier.description && (
                                            <p className="text-[clamp(9px,0.66cqw,24px)] leading-[1.15] text-white/90">
                                                {
                                                    modifier
                                                        .description
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <span className="shrink-0 text-[clamp(12px,0.88cqw,33px)] font-extrabold text-[#f4c542]">
                                        +
                                        {formatPrice(
                                            modifier.priceCents
                                        )}
                                    </span>
                                </div>
                            )
                        )}
                    </div>
                )}
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

            <footer className="shrink-0 grid grid-cols-2 gap-[1.5cqw] pt-[0.2cqw] text-[clamp(8px,0.49cqw,18px)] font-semibold leading-[1.12] text-white/75">
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
                <header className="shrink-0 grid grid-cols-[1fr_1.15fr_1fr] items-center gap-[1.35cqw] min-h-[4.1cqw]">
                    <p
                        style={DISPLAY_FONT_STYLE}
                        className="text-[clamp(14px,1.22cqw,46px)] font-normal uppercase tracking-[0.025em] leading-none text-[#f4c542]"
                    >
                        Meats

                        <span
                            aria-hidden="true"
                            className="mx-[0.38cqw] text-white/40"
                        >
                            |
                        </span>

                        Carnes
                    </p>

                    <div className="flex items-center justify-center">
                        <img
                            src={pokejosLogoWhite}
                            alt="Pok-E-Jo's Smokehouse"
                            className="w-[17cqw] h-[4.6cqw] object-contain"
                        />
                    </div>

                    <p
                        style={DISPLAY_FONT_STYLE}
                        className="text-right text-[clamp(10px,0.86cqw,32px)] font-normal uppercase tracking-[0.08em] leading-none text-white/95"
                    >
                        True Texas BBQ
                    </p>
                </header>

                {visibleSectionCount > 0 ? (
                    <main className="flex-1 min-h-0 grid grid-cols-[0.96fr_1.08fr_1.12fr] gap-[1.7cqw] pt-[0.55cqw]">
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
