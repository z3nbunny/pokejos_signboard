import barqsLogo from '../assets/drinks/barqs.webp';
import cocaColaLogo from '../assets/drinks/coca-cola.webp';
import dietCokeLogo from '../assets/drinks/diet-coke.webp';
import dietDrPepperLogo from '../assets/drinks/diet-dr-pepper.svg';
import drPepperLogo from '../assets/drinks/dr-pepper.svg';
import poweradeLogo from '../assets/drinks/powerade.webp';
import redFlashLogo from '../assets/drinks/red-flash.webp';
import spriteLogo from '../assets/drinks/sprite.webp';

export const FOUNTAIN_DRINK_BRANDS = {
    dr_pepper: {
        id: 'dr_pepper',
        name: 'Dr Pepper',
        logo: drPepperLogo,
        scale: 1.15,
        tileVariant: 'badge'
    },

    diet_dr_pepper: {
        id: 'diet_dr_pepper',
        name: 'Diet Dr Pepper',
        logo: dietDrPepperLogo,
        scale: 1.25,
        tileVariant: 'badge'
    },

    barqs: {
        id: 'barqs',
        name: "Barq's Root Beer",
        logo: barqsLogo,
        scale: 1.25,
        tileVariant: 'badge'
    },

    red_flash: {
        id: 'red_flash',
        name: 'Red Flash',
        logo: redFlashLogo,
        scale: 1.55,
        tileVariant: 'badge'
    },

    powerade: {
        id: 'powerade',
        name: 'Powerade',
        logo: poweradeLogo,
        scale: 1,
        tileVariant: 'wordmark'
    },

    sprite: {
        id: 'sprite',
        name: 'Sprite',
        logo: spriteLogo,
        scale: 1,
        tileVariant: 'wordmark'
    },

    diet_coke: {
        id: 'diet_coke',
        name: 'Diet Coke',
        logo: dietCokeLogo,
        scale: 1,
        tileVariant: 'wordmark'
    },

    coca_cola: {
        id: 'coca_cola',
        name: 'Coca-Cola',
        logo: cocaColaLogo,
        scale: 1,
        tileVariant: 'wordmark'
    }
};

export const DEFAULT_FOUNTAIN_DRINK_BRAND_IDS = [
    'dr_pepper',
    'diet_dr_pepper',
    'barqs',
    'red_flash',
    'powerade',
    'sprite',
    'diet_coke',
    'coca_cola'
];

export const getFountainDrinkBrands = (
    brandIds = DEFAULT_FOUNTAIN_DRINK_BRAND_IDS
) =>
    brandIds
        .map((brandId) => FOUNTAIN_DRINK_BRANDS[brandId])
        .filter(Boolean);