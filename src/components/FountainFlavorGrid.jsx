import {
    DEFAULT_FOUNTAIN_DRINK_BRAND_IDS,
    getFountainDrinkBrands
} from '../data/fountainDrinkBrands';

function BrandTile({
    brand,
    variant,
    soldOut = false,
    showSpanish = true
}) {
    const isBadge = variant === 'badge';

    const soldOutLabel = soldOut && (
        <span className="inline-flex items-center rounded-[0.2cqw] border border-white bg-white px-[0.15cqw] py-[0.03cqw] text-center text-[0.4cqw] font-black uppercase leading-tight text-black whitespace-nowrap">
            SOLD OUT
            {showSpanish && ' · AGOTADO'}
        </span>
    );

    return (
        <div
            className={`
                relative
                flex
                min-w-0
                items-center
                justify-center
                rounded-[0.28cqw]
                bg-transparent
                px-[0.22cqw]
                ${isBadge
                    ? 'h-[3cqw] w-full flex-col overflow-visible border border-transparent py-[0.14cqw]'
                    : 'h-[1.55cqw] w-full flex-col overflow-visible border-0 py-0'
                }
            `}
            title={
                soldOut
                    ? `${brand.name}: Sold Out`
                    : brand.name
            }
        >
            <div
                className={`
                    relative
                    flex
                    shrink-0
                    items-center
                    justify-center
                    ${isBadge
                        ? 'h-[2.1cqw] w-[3.75cqw] max-w-full'
                        : 'h-[1.03cqw] w-full'
                    }
                `}
            >
                <img
                    src={brand.logo}
                    alt={brand.name}
                    draggable="false"
                    className={`
                        object-contain
                        ${soldOut
                            ? 'opacity-60'
                            : 'opacity-100'
                        }
                        ${isBadge
                            ? 'max-h-[2cqw] max-w-[88%]'
                            : 'max-h-[1.02cqw] max-w-[86%]'
                        }
                    `}
                    style={{
                        transform: `scale(${brand.scale || 1})`,
                        filter:
                            brand.monochromeFilter
                            || 'brightness(0) invert(1)',
                        mixBlendMode:
                            brand.monochromeBlendMode
                            || 'normal'
                    }}
                />

                {soldOut && (
                    <span
                        aria-hidden="true"
                        className={`
                            pointer-events-none
                            absolute
                            top-1/2
                            z-10
                            h-[0.07cqw]
                            -translate-y-1/2
                            -rotate-[12deg]
                            bg-white/70
                            ${isBadge
                                ? 'left-0 w-full'
                                : 'left-[10%] w-[80%]'
                            }
                        `}
                    />
                )}
            </div>

            <div className="pointer-events-none flex h-[0.52cqw] w-full shrink-0 items-center justify-center">
                {soldOutLabel}
            </div>
        </div>
    );
}

function FountainFlavorGrid({
    enabled = true,
    showTitle = true,
    title = 'FOUNTAIN FLAVORS',
    titleEs = 'SABORES DE FUENTE',
    brandIds = DEFAULT_FOUNTAIN_DRINK_BRAND_IDS,
    soldOutBrandIds = [],
    showSpanish = true
}) {
    const brands = getFountainDrinkBrands(brandIds);

    const badgeBrands = brands.filter(
        (brand) => brand.tileVariant === 'badge'
    );

    const wordmarkBrands = brands.filter(
        (brand) => brand.tileVariant !== 'badge'
    );

    if (!enabled || brands.length === 0) {
        return null;
    }

    return (
        <section
            className={`
                ${showTitle
                    ? 'border-t border-[#f4c542]/35 pt-[0.45cqw]'
                    : 'mt-[0.2cqw] mb-[0.42cqw]'
                }
            `}
        >
            {showTitle && (title || titleEs) && (
                <h3
                    className="
                    mb-[0.42cqw]
                    text-center
                    text-[0.82cqw]
                    leading-none
                    text-[#f4c542]
                "
                    style={{
                        fontFamily: '"Rye", serif'
                    }}
                >
                    {title}

                    {titleEs && (
                        <>
                            <span className="mx-[0.35cqw] text-white/45">
                                |
                            </span>

                            {titleEs}
                        </>
                    )}
                </h3>
            )}

            {badgeBrands.length > 0 && (
                <div className="grid grid-cols-4 gap-[0.48cqw] px-[2.75cqw]">
                    {badgeBrands.map((brand) => (
                        <BrandTile
                            key={brand.id}
                            brand={brand}
                            variant="badge"
                            soldOut={
                                soldOutBrandIds.includes(brand.id)
                            }
                            showSpanish={showSpanish}
                        />
                    ))}
                </div>
            )}

            {wordmarkBrands.length > 0 && (
                <div
                    className={`
                        grid
                        grid-cols-4
                        gap-[0.3cqw]
                        px-[1.3cqw]
                        ${badgeBrands.length > 0
                            ? 'mt-[0.28cqw]'
                            : ''
                        }
                    `}
                >
                    {wordmarkBrands.map((brand) => (
                        <BrandTile
                            key={brand.id}
                            brand={brand}
                            variant="wordmark"
                            soldOut={
                                soldOutBrandIds.includes(brand.id)
                            }
                            showSpanish={showSpanish}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

export default FountainFlavorGrid;