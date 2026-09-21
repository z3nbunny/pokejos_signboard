/*
 * Bootstrap template for the shared Sides Menu.
 *
 * Shared pricing groups prevent the same portion prices from
 * being duplicated across every side and dessert. Item IDs stay
 * stable so location availability and future sold-out controls
 * can safely reference them.
 */

const createSideAndDessertPrices = () => [
    {
        id: 'side_order',
        label: 'Side order',
        labelEs: 'Porción',
        priceCents: 400
    },
    {
        id: 'pint',
        label: 'Pint',
        labelEs: 'Pinta',
        priceCents: 800
    },
    {
        id: 'quart',
        label: 'Quart',
        labelEs: 'Cuarto de galón',
        priceCents: 1400
    },
    {
        id: 'half_gallon',
        label: 'Half gallon',
        labelEs: 'Medio galón',
        priceCents: 2400
    },
    {
        id: 'gallon',
        label: 'Gallon',
        labelEs: 'Galón',
        priceCents: 4000
    }
];

const createSaucePrices = () => [
    {
        id: 'pint',
        label: 'Pint',
        labelEs: 'Pinta',
        priceCents: 400
    },
    {
        id: 'quart',
        label: 'Quart',
        labelEs: 'Cuarto de galón',
        priceCents: 800
    },
    {
        id: 'half_gallon',
        label: 'Half gallon',
        labelEs: 'Medio galón',
        priceCents: 1400
    },
    {
        id: 'gallon',
        label: 'Gallon',
        labelEs: 'Galón',
        priceCents: 2400
    }
];

const createItem = ({
    id,
    name,
    nameEs,
    description = '',
    descriptionEs = '',
    details = [],
    detailsEs = [],
    dietaryFlags = [],
    pricingGroupId = '',
    priceOptions = [],
    order
}) => ({
    id,
    name,
    nameEs,
    description,
    descriptionEs,
    details,
    detailsEs,
    dietaryFlags,
    pricingGroupId,
    priceOptions,
    bulkPriceEligible: true,
    enabled: true,
    order
});

const SIDES_AND_DESSERTS_PRICING =
    'sides_and_desserts';

const BULK_SAUCES_PRICING = 'bulk_sauces';

export const SIDES_MENU_SEED = {
    schemaVersion: 1,
    menuId: 'sides',
    title: 'SIDES, SWEETS & DRINKS',
    titleEs: 'GUARNICIONES, POSTRES Y BEBIDAS',
    subtitle: '',
    subtitleEs: '',

    displayNotices: {
        allergenDisclaimer:
            'Products are prepared in a shared kitchen. Cross-contact with gluten and other allergens is possible. Please tell our team about any allergies.',
        allergenDisclaimerEs:
            'Los productos se preparan en una cocina compartida. Puede haber contacto cruzado con gluten y otros alérgenos. Informe a nuestro personal sobre cualquier alergia.'
    },

    pricingGroups: [
        {
            id: SIDES_AND_DESSERTS_PRICING,
            title: 'SIDES & DESSERTS',
            titleEs: 'GUARNICIONES Y POSTRES',
            priceOptions:
                createSideAndDessertPrices(),
            enabled: true,
            order: 10
        },
        {
            id: BULK_SAUCES_PRICING,
            title: 'BULK BBQ SAUCE',
            titleEs: 'SALSA BBQ A GRANEL',
            priceOptions: createSaucePrices(),
            enabled: true,
            order: 20
        }
    ],

    sections: [
        {
            id: 'hot_sides',
            title: 'HOT SIDES',
            titleEs: 'GUARNICIONES CALIENTES',
            subtitle: '',
            subtitleEs: '',
            order: 10,
            enabled: true,
            modifiers: [],
            items: [
                createItem({
                    id: 'pinto_beans',
                    name: 'Pinto Beans',
                    nameEs: 'Frijoles Pintos',
                    dietaryFlags: ['gluten_free'],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 10
                }),
                createItem({
                    id: 'fried_okra',
                    name: 'Fried Okra',
                    nameEs: 'Okra Frita',
                    dietaryFlags: ['vegetarian'],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 20
                }),
                createItem({
                    id: 'mac_and_cheese',
                    name: 'Mac and Cheese',
                    nameEs: 'Macarrones con Queso',
                    dietaryFlags: [],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 30
                }),
                createItem({
                    id: 'texas_fries',
                    name: 'Texas Fries',
                    nameEs: 'Papas Fritas',
                    dietaryFlags: [
                        'gluten_free',
                        'vegetarian',
                        'vegan'
                    ],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 40
                }),
                createItem({
                    id: 'baked_potato_casserole',
                    name: 'Baked Potato Casserole',
                    nameEs: 'Cazuela de Papa al Horno',
                    dietaryFlags: [
                        'gluten_free',
                        'vegetarian'
                    ],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 50
                }),
                createItem({
                    id: 'jalapeno_cornbread_casserole',
                    name: 'Jalapeño Cornbread Casserole',
                    nameEs:
                        'Cazuela de Pan de Maíz con Jalapeño',
                    dietaryFlags: ['vegetarian'],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 60
                }),
                createItem({
                    id: 'buttered_corn',
                    name: 'Buttered Corn',
                    nameEs: 'Maíz con Mantequilla',
                    dietaryFlags: [
                        'gluten_free',
                        'vegetarian'
                    ],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 70
                }),
                createItem({
                    id: 'green_bean_casserole',
                    name: 'Green Bean Casserole',
                    nameEs: 'Cazuela de Ejotes',
                    dietaryFlags: ['vegetarian'],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 80
                })
            ]
        },

        {
            id: 'cold_sides',
            title: 'COLD SIDES',
            titleEs: 'GUARNICIONES FRÍAS',
            subtitle: '',
            subtitleEs: '',
            order: 20,
            enabled: true,
            modifiers: [],
            items: [
                createItem({
                    id: 'potato_salad',
                    name: 'Potato Salad',
                    nameEs: 'Ensalada de Papa',
                    description:
                        'Made with eggs, no onions',
                    descriptionEs:
                        'Preparada con huevo, sin cebolla',
                    dietaryFlags: [
                        'gluten_free',
                        'vegetarian'
                    ],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 10
                }),
                createItem({
                    id: 'coleslaw',
                    name: 'Coleslaw',
                    nameEs: 'Ensalada de Repollo',
                    dietaryFlags: [
                        'gluten_free',
                        'vegetarian'
                    ],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 20
                }),
                createItem({
                    id: 'garden_salad',
                    name: 'Garden Salad',
                    nameEs: 'Ensalada Verde',
                    dietaryFlags: [
                        'gluten_free',
                        'vegetarian',
                        'vegan'
                    ],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 30
                }),
                createItem({
                    id: 'broccoli_salad',
                    name: 'Broccoli Salad',
                    nameEs: 'Ensalada de Brócoli',
                    dietaryFlags: [
                        'gluten_free',
                        'vegetarian',
                        'vegan'
                    ],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 40
                }),
                createItem({
                    id: 'cucumber_salad',
                    name: 'Cucumber Salad',
                    nameEs: 'Ensalada de Pepino',
                    dietaryFlags: [
                        'gluten_free',
                        'vegetarian',
                        'vegan'
                    ],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 50
                })
            ]
        },

        {
            id: 'bbq_sauces',
            title: 'BBQ SAUCES',
            titleEs: 'SALSAS BBQ',
            subtitle: 'AVAILABLE IN BULK',
            subtitleEs: 'DISPONIBLES A GRANEL',
            order: 30,
            enabled: true,
            modifiers: [],
            items: [
                createItem({
                    id: 'original_sauce',
                    name: 'Original Sauce',
                    nameEs: 'Salsa Original',
                    dietaryFlags: [
                        'gluten_free',
                        'dairy_free',
                        'vegetarian',
                        'vegan'
                    ],
                    pricingGroupId:
                        BULK_SAUCES_PRICING,
                    order: 10
                }),
                createItem({
                    id: 'smoky_spicy_chipotle',
                    name: 'Smoky Spicy Chipotle',
                    nameEs: 'Chipotle Ahumado y Picante',
                    dietaryFlags: [
                        'gluten_free',
                        'dairy_free',
                        'vegetarian',
                        'vegan'
                    ],
                    pricingGroupId:
                        BULK_SAUCES_PRICING,
                    order: 20
                }),
                createItem({
                    id: 'sweet_spicy_peach_habanero',
                    name: 'Sweet & Spicy Peach Habanero',
                    nameEs:
                        'Durazno y Habanero Dulce y Picante',
                    dietaryFlags: [
                        'gluten_free',
                        'dairy_free',
                        'vegetarian',
                        'vegan'
                    ],
                    pricingGroupId:
                        BULK_SAUCES_PRICING,
                    order: 30
                })
            ]
        },

        {
            id: 'desserts',
            title: 'DESSERTS',
            titleEs: 'POSTRES',
            subtitle: '',
            subtitleEs: '',
            order: 40,
            enabled: true,
            modifiers: [],
            items: [
                createItem({
                    id: 'peach_cobbler',
                    name: 'Peach Cobbler',
                    nameEs: 'Cobbler de Durazno',
                    dietaryFlags: [],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 10
                }),
                createItem({
                    id: 'cherry_cobbler',
                    name: 'Cherry Cobbler',
                    nameEs: 'Cobbler de Cereza',
                    dietaryFlags: [],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 20
                }),
                createItem({
                    id: 'banana_pudding',
                    name: 'Banana Pudding',
                    nameEs: 'Pudín de Plátano',
                    dietaryFlags: [],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 30
                }),
                createItem({
                    id: 'fruit_salad',
                    name: 'Fruit Salad',
                    nameEs: 'Ensalada de Frutas',
                    dietaryFlags: [
                        'gluten_free',
                        'vegetarian',
                        'vegan'
                    ],
                    pricingGroupId:
                        SIDES_AND_DESSERTS_PRICING,
                    order: 40
                })
            ]
        },

        {
            id: 'drinks',
            title: 'DRINKS',
            titleEs: 'BEBIDAS',
            subtitle: '',
            subtitleEs: '',
            order: 50,
            enabled: true,
            modifiers: [],
            items: [
                createItem({
                    id: 'fountain_drinks_and_tea',
                    name: 'Soda & Iced Tea',
                    nameEs: 'Refrescos y Té Helado',
                    description:
                        '16/32 oz · Free refills',
                    descriptionEs:
                        '16/32 oz · Rellenos gratis',
                    details: [
                        'Sweet or unsweet tea',
                        '8 oz with kids meals'
                    ],
                    detailsEs: [
                        'Té dulce o sin azúcar',
                        '8 oz con comidas infantiles'
                    ],
                    translationLayout: 'inline',
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            labelEs: '',
                            priceCents: 300
                        }
                    ],
                    order: 10
                }),
                createItem({
                    id: 'milk',
                    name: 'Milk',
                    nameEs: 'Leche',
                    description: '16 oz',
                    descriptionEs: '16 oz',
                    translationLayout: 'inline',
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            labelEs: '',
                            priceCents: 300
                        }
                    ],
                    order: 30
                }),

                createItem({
                    id: 'lemonade',
                    name: 'Lemonade',
                    nameEs: 'Limonada',
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            labelEs: '',
                            priceCents: 300
                        }
                    ],
                    order: 20
                }),
                createItem({
                    id: 'domestic_beer',
                    name: 'Domestic Beer',
                    nameEs: 'Cerveza Nacional',
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            labelEs: '',
                            priceCents: 375
                        }
                    ],
                    order: 40
                }),
                createItem({
                    id: 'imported_beer',
                    name: 'Imported Beer',
                    nameEs: 'Cerveza Importada',
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            labelEs: '',
                            priceCents: 425
                        }
                    ],
                    order: 50
                })
            ]
        }
    ]
};
