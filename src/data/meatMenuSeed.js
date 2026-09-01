/*
 * This file is a bootstrap template, not a mirror of live
 * Firestore data. Its predefined records intentionally use
 * readable, stable IDs. Menu items added later through the
 * dashboard will use generated IDs.
 */

export const MEAT_MENU_SEED = {
    schemaVersion: 2,
    menuId: 'meat',
    title: 'MEATS',
    titleEs: 'CARNES',
    subtitle: 'TRUE TEXAS BBQ',

    sections: [
        {
            id: 'bbq_plates',
            title: 'PLATES',
            titleEs: 'PLATOS',
            subtitle:
                '2 SIDES · TEXAS TOAST · BBQ SAUCE',
            subtitleEs:
                '2 GUARNICIONES · PAN TOSTADO · SALSA BBQ',
            order: 10,
            enabled: true,
            items: [
                {
                    id: 'premium_brisket_plate',
                    name: 'Premium Brisket Plate',
                    description: 'Premium sliced beef brisket',
                    details: [],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: 'With 2 sides',
                            priceCents: 1650
                        }
                    ],
                    dietaryFlags: ['gluten_free_meat'],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 10
                },
                {
                    id: 'one_meat_plate',
                    name: '1 Meat Plate',
                    description:
                        'Choose pork ribs, sausage, pulled pork, chicken, or turkey',
                    details: [],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            priceCents: 1550
                        }
                    ],
                    dietaryFlags: ['gluten_free_meat'],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 20
                },
                {
                    id: 'two_meat_plate',
                    name: '2 Meat Plate',
                    description: 'Choose two smoked meats',
                    details: [],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            priceCents: 1850
                        }
                    ],
                    dietaryFlags: ['gluten_free_meat'],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 30
                },
                {
                    id: 'three_meat_plate',
                    name: '3 Meat Plate',
                    description: 'Choose three smoked meats',
                    details: [],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            priceCents: 2050
                        }
                    ],
                    dietaryFlags: ['gluten_free_meat'],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 40
                },
                {
                    id: 'pok_e_to_plate',
                    name: 'Pok-E-To Plate',
                    description: '¼ lb. meat and two half sides',
                    details: [],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            priceCents: 1250
                        }
                    ],
                    dietaryFlags: [],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 50
                }
            ]
        },

        {
            id: 'bbq_sandwiches',
            title: 'SANDWICHES',
            titleEs: 'SÁNDWICHES',
            subtitle:
                'CHOOSE YOUR SMOKED MEAT · EXCEPT RIBS',
            subtitleEs:
                'ELIGE TU CARNE · EXCEPTO COSTILLAS',
            order: 20,
            enabled: true,
            items: [
                {
                    id: 'premium_brisket_sandwich',
                    name: 'Premium Brisket Sandwich',
                    description: '',
                    details: [],
                    priceOptions: [
                        {
                            id: 'sandwich',
                            label: 'Sandwich',
                            priceCents: 1075
                        },
                        {
                            id: 'combo',
                            label: 'Add a side and drink',
                            priceCents: 500
                        }
                    ],
                    dietaryFlags: [],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 10
                },
                {
                    id: 'classic_bbq_sandwich',
                    name: 'Classic BBQ Sandwich',
                    description:
                        'Chopped beef, sausage, pulled pork, turkey, or chicken',
                    details: [],
                    priceOptions: [
                        {
                            id: 'sandwich',
                            label: 'Sandwich',
                            priceCents: 975
                        },
                        {
                            id: 'combo',
                            label: 'Add a side and drink',
                            priceCents: 500
                        }
                    ],
                    dietaryFlags: [],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 20
                }
            ]
        },

        {
            id: 'family_packs',
            title: 'FAMILY PACKS',
            titleEs: 'PAQUETES FAMILIARES',
            subtitle:
                'WHITE OR WHEAT BREAD · PICKLES · ONIONS · JALAPEÑOS',
            subtitleEs:
                'PAN BLANCO O INTEGRAL · PEPINILLOS · CEBOLLA · JALAPEÑOS',
            order: 30,
            enabled: true,
            items: [
                {
                    id: 'original_family_pack',
                    name: 'Original Family Pack',
                    description: 'Serves 3–4',
                    details: [
                        '1.5 lb. sliced meat or chicken',
                        '3 pints of sides and bread',
                        '½ pint BBQ sauce and condiments'
                    ],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            priceCents: 5900
                        }
                    ],
                    dietaryFlags: [],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 10
                },
                {
                    id: 'five_pack',
                    name: 'Five Pack',
                    description: 'Serves 5–6',
                    details: [
                        '2.5 lb. sliced meat or chicken',
                        '4 pints of sides and bread',
                        '1 pint BBQ sauce and condiments'
                    ],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            priceCents: 8900
                        }
                    ],
                    dietaryFlags: [],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 20
                },
                {
                    id: 'big_deal',
                    name: 'Big Deal',
                    description: 'Serves 10–12',
                    details: [
                        '5 lb. sliced meat or chicken',
                        '4 quarts of sides and bread',
                        '1 quart BBQ sauce and condiments'
                    ],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            priceCents: 16900
                        }
                    ],
                    dietaryFlags: [],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 30
                }
            ]
        },

        {
            id: 'meat_by_pound',
            title: 'BY THE POUND',
            titleEs: 'POR LIBRA',
            subtitle: '',
            subtitleEs: '',
            order: 40,
            enabled: true,
            items: [
                {
                    id: 'premium_beef_brisket',
                    name: 'Premium Beef Brisket',
                    description: '',
                    details: [],
                    priceOptions: [
                        {
                            id: 'pound',
                            label: 'Per lb.',
                            priceCents: 2900
                        }
                    ],
                    dietaryFlags: ['gluten_free'],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 10
                },
                {
                    id: 'chopped_beef',
                    name: 'Chopped Beef',
                    description: '',
                    details: [],
                    priceOptions: [
                        {
                            id: 'pound',
                            label: 'Per lb.',
                            priceCents: 2600
                        }
                    ],
                    dietaryFlags: ['gluten_free'],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 20
                },
                {
                    id: 'pork_ribs',
                    name: 'Pork Ribs',
                    description: '',
                    details: [],
                    priceOptions: [
                        {
                            id: 'pound',
                            label: 'Per lb.',
                            priceCents: 2400
                        }
                    ],
                    dietaryFlags: ['gluten_free'],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 30
                },
                {
                    id: 'sausage',
                    name: 'Sausage',
                    description: '',
                    details: [],
                    priceOptions: [
                        {
                            id: 'pound',
                            label: 'Per lb.',
                            priceCents: 2200
                        }
                    ],
                    dietaryFlags: ['gluten_free'],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 40
                },
                {
                    id: 'texas_pulled_pork',
                    name: 'Texas Pulled Pork',
                    description: '',
                    details: [],
                    priceOptions: [
                        {
                            id: 'pound',
                            label: 'Per lb.',
                            priceCents: 2000
                        }
                    ],
                    dietaryFlags: ['gluten_free'],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 50
                },
                {
                    id: 'turkey_breast',
                    name: 'Turkey Breast',
                    description: '',
                    details: [],
                    priceOptions: [
                        {
                            id: 'pound',
                            label: 'Per lb.',
                            priceCents: 2700
                        }
                    ],
                    dietaryFlags: ['gluten_free'],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 60
                },
                {
                    id: 'smoked_chicken',
                    name: 'Smoked Chicken',
                    description: '',
                    details: [],
                    priceOptions: [
                        {
                            id: 'quarter',
                            label: '¼ chicken',
                            priceCents: 600
                        },
                        {
                            id: 'half',
                            label: '½ chicken',
                            priceCents: 1100
                        },
                        {
                            id: 'whole',
                            label: 'Whole chicken',
                            priceCents: 2000
                        }
                    ],
                    dietaryFlags: ['gluten_free'],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 70
                }
            ]
        },

        {
            id: 'more_great_eating',
            title: 'MORE FAVORITES',
            titleEs: 'MÁS FAVORITOS',
            subtitle: '',
            subtitleEs: '',
            order: 50,
            enabled: true,
            items: [
                {
                    id: 'sausage_wrap',
                    name: 'Sausage Wrap',
                    description: '',
                    details: [],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            priceCents: 800
                        }
                    ],
                    dietaryFlags: [],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 10
                },
                {
                    id: 'super_spud',
                    name: 'Super Spud',
                    description: '',
                    details: [],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            priceCents: 1200
                        }
                    ],
                    dietaryFlags: [],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 20
                },
                {
                    id: 'pej_chef_salad',
                    name: 'PEJ Chef Salad',
                    description: '',
                    details: [],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            priceCents: 1400
                        }
                    ],
                    dietaryFlags: [],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 30
                },
                {
                    id: 'veggie_plate',
                    name: 'Veggie Plate',
                    description: '',
                    details: [],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            priceCents: 1300
                        }
                    ],
                    dietaryFlags: ['vegetarian'],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 40
                }
            ]
        },

        {
            id: 'kids_meals',
            title: 'KIDS',
            titleEs: 'NIÑOS',
            subtitle: '',
            subtitleEs: '',
            order: 60,
            enabled: true,
            items: [
                {
                    id: 'kids_pok_e_to_plate',
                    name: 'Pok-E-To Plate',
                    description: '¼ lb. meat and two half sides',
                    details: [],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            priceCents: 1250
                        }
                    ],
                    dietaryFlags: [],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 10
                },
                {
                    id: 'kids_chopped_beef_sandwich',
                    name: 'Chopped Beef Sandwich',
                    description: "Includes a half side and kid's drink",
                    details: [],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            priceCents: 800
                        }
                    ],
                    dietaryFlags: [],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 20
                },
                {
                    id: 'kids_mac_and_cheese',
                    name: "Mac N' Cheese",
                    description:
                        "Includes a half side, Texas toast, and kid's drink",
                    details: [],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            priceCents: 600
                        }
                    ],
                    dietaryFlags: [],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 30
                },
                {
                    id: 'kids_grilled_cheese',
                    name: 'Grilled Cheese',
                    description: "Includes a half side and kid's drink",
                    details: [],
                    priceOptions: [
                        {
                            id: 'standard',
                            label: '',
                            priceCents: 700
                        }
                    ],
                    dietaryFlags: [],
                    bulkPriceEligible: true,
                    enabled: true,
                    order: 40
                }
            ]
        }
    ]
};