import {
    DEFAULT_FOUNTAIN_DRINK_BRAND_IDS,
    getFountainDrinkBrands
} from '../data/fountainDrinkBrands';

function BrandTile({ brand, variant }) {
    const isBadge = variant === 'badge';

    return (
        <div
            className={`
                flex
                min-w-0
                items-center
                justify-center
                overflow-hidden
                rounded-[0.28cqw]
                border
                border-[#f4c542]/30
                bg-white
                px-[0.22cqw]
                py-[0.14cqw]
                ${isBadge
                    ? 'h-[3cqw] w-[3.75cqw] justify-self-center'
                    : 'h-[1.55cqw]'
                }
            `}
            title={brand.name}
        >
            <img
                src={brand.logo}
                alt={brand.name}
                draggable="false"
                className={`
                    object-contain
                    ${isBadge
                        ? 'max-h-[2cqw] max-w-[88%]'
                        : 'max-h-[1.02cqw] max-w-[86%]'
                    }
                `}
                style={{
                    transform: `scale(${brand.scale || 1})`
                }}
            />
        </div>
    );
}

function FountainFlavorGrid({
    enabled = true,
    showTitle = true,
    title = 'FOUNTAIN FLAVORS',
    titleEs = 'SABORES DE FUENTE',
    brandIds = DEFAULT_FOUNTAIN_DRINK_BRAND_IDS
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
                        px-[1.3cqw]]
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
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

export default FountainFlavorGrid;