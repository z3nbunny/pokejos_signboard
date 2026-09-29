export const shouldShowSpanish = (menu) =>
    menu?.showSpanish !== false;

const hideSpanishPriceOptions = (priceOptions) =>
    Array.isArray(priceOptions)
        ? priceOptions.map((priceOption) => ({
            ...priceOption,
            labelEs: ''
        }))
        : priceOptions;

const hideInlineSpanish = (value) =>
    typeof value === 'string'
        ? value
            .replace(
                /\s*\|\s*Rinde\b.*$/i,
                ''
            )
            .trim()
        : value;

const hideSpanishItems = (items) =>
    Array.isArray(items)
        ? items.map((item) => ({
            ...item,
            nameEs: '',
            description:
                hideInlineSpanish(
                    item.description
                ),
            descriptionEs: '',
            detailsEs: [],
            priceOptions: hideSpanishPriceOptions(
                item.priceOptions
            )
        }))
        : items;

const hideSpanishModifiers = (modifiers) =>
    Array.isArray(modifiers)
        ? modifiers.map((modifier) => ({
            ...modifier,
            labelEs: '',
            descriptionEs: ''
        }))
        : modifiers;

export const createMenuDisplayModel = (menu) => {
    if (!menu || shouldShowSpanish(menu)) {
        return menu;
    }

    return {
        ...menu,
        titleEs: '',
        subtitleEs: '',
        displayNotices: menu.displayNotices
            ? {
                ...menu.displayNotices,
                allergenDisclaimerEs: '',
                glutenDisclaimerEs: ''
            }
            : menu.displayNotices,
        pricingGroups: Array.isArray(menu.pricingGroups)
            ? menu.pricingGroups.map((pricingGroup) => ({
                ...pricingGroup,
                titleEs: '',
                priceOptions: hideSpanishPriceOptions(
                    pricingGroup.priceOptions
                )
            }))
            : menu.pricingGroups,
        sections: Array.isArray(menu.sections)
            ? menu.sections.map((section) => ({
                ...section,
                titleEs: '',
                subtitleEs: '',
                items: hideSpanishItems(
                    section.items
                ),
                modifiers: hideSpanishModifiers(
                    section.modifiers
                )
            }))
            : menu.sections
    };
};