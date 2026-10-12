import {
    useEffect,
    useState
} from 'react';

import {
    doc,
    onSnapshot
} from 'firebase/firestore';

import { db } from '../firebase';

import {
    subscribeToMenuAvailability,
    createMenuAvailabilityDisplayModel
} from '../services/menuAvailability';

import useMenuSpotlight from '../hooks/useMenuSpotlight';

function DisplayMessage({
    heading,
    message,
    tone = 'notice'
}) {
    const headingColor = tone === 'error'
        ? 'text-red-400'
        : 'text-[#f4c542]';

    return (
        <div className="w-screen h-screen bg-[#0d0d0c] text-white flex flex-col items-center justify-center text-center px-8">
            <h1
                className={`text-4xl font-black uppercase tracking-wider ${headingColor}`}
            >
                {heading}
            </h1>

            <p className="mt-4 text-xl text-white/75">
                {message}
            </p>
        </div>
    );
}

export default function MenuDisplayController({
    activeLocation,
    deviceId,
    previewMode = false,
    menuId,
    menuLabel,
    PreviewComponent
}) {
    const [displayedMenu, setDisplayedMenu] =
        useState(null);

    const [menuStatus, setMenuStatus] =
        useState('loading');

    const [currentTime, setCurrentTime] =
        useState(() => Date.now());

    const [availabilityState, setAvailabilityState] =
        useState(null);

    useEffect(() => {
        const menuRef = previewMode
            ? doc(
                db,
                'locations',
                activeLocation,
                'devices',
                deviceId,
                'menuPreviews',
                menuId
            )
            : doc(
                db,
                'globalMenus',
                menuId
            );

        const unsubscribe = onSnapshot(
            menuRef,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setDisplayedMenu(null);
                    setMenuStatus(
                        previewMode
                            ? 'preview-missing'
                            : 'missing'
                    );
                    return;
                }

                const snapshotData = snapshot.data();

                /*
                 * A TV preview stores its menu inside a menu field.
                 * Published documents store the menu directly.
                 */
                const menuData =
                    previewMode && snapshotData.menu
                        ? snapshotData.menu
                        : snapshotData;

                setDisplayedMenu({
                    id: snapshot.id,
                    ...menuData
                });

                setMenuStatus('ready');
            },
            (error) => {
                console.error(
                    previewMode
                        ? `Unable to load ${menuLabel} TV preview:`
                        : `Unable to load published ${menuLabel}:`,
                    error
                );

                setDisplayedMenu(null);
                setMenuStatus('error');
            }
        );

        return () => unsubscribe();
    }, [
        activeLocation,
        deviceId,
        menuId,
        menuLabel,
        previewMode
    ]);

    useEffect(() => {
        if (!activeLocation || !menuId) {
            return undefined;
        }

        return subscribeToMenuAvailability({
            locationId: activeLocation,
            menuId,
            onChange: (soldOutItems) => {
                setAvailabilityState({
                    locationId: activeLocation,
                    menuId,
                    soldOutItems
                });

                setCurrentTime(Date.now());
            },
            onError: (error) => {
                console.error(
                    `Unable to load ${menuLabel} availability:`,
                    error
                );
            }
        });
    }, [
        activeLocation,
        menuId,
        menuLabel
    ]);

    const soldOutItems =
        availabilityState?.locationId === activeLocation
            && availabilityState?.menuId === menuId
            ? availabilityState.soldOutItems
            : {};

    useEffect(() => {
        const clock = window.setInterval(
            () => {
                setCurrentTime(Date.now());
            },
            60000
        );

        return () => {
            window.clearInterval(clock);
        };
    }, []);

    const activeSpotlight = useMenuSpotlight({
        locationId: activeLocation,
        menuId,
        currentTime,
        includeScheduledSpotlights: previewMode
    });

    if (menuStatus === 'loading') {
        return (
            <div className="w-screen h-screen bg-[#0d0d0c] text-white flex items-center justify-center">
                <p className="text-xl font-bold uppercase tracking-widest text-white/70">
                    Loading {menuLabel}...
                </p>
            </div>
        );
    }

    if (menuStatus === 'preview-missing') {
        return (
            <DisplayMessage
                heading="TV Preview Not Sent"
                message={`Select this TV in the administrator dashboard and send the current ${menuLabel} draft.`}
            />
        );
    }

    if (menuStatus === 'missing') {
        return (
            <DisplayMessage
                heading={`${menuLabel} Not Published`}
                message={`Publish the saved ${menuLabel} from the administrator dashboard.`}
            />
        );
    }

    if (
        menuStatus === 'error'
        || !displayedMenu
    ) {
        return (
            <DisplayMessage
                heading={`${menuLabel} Unavailable`}
                message={`The ${previewMode ? 'preview' : 'published'} menu could not be loaded.`}
                tone="error"
            />
        );
    }

    const displaySoldOutItems =
        createMenuAvailabilityDisplayModel(
            displayedMenu,
            soldOutItems
        );

    return (
        <div className="w-screen h-screen overflow-hidden bg-[#0d0d0c] select-none">
            <PreviewComponent
                menu={displayedMenu}
                spotlight={activeSpotlight}
                soldOutItems={displaySoldOutItems}
                currentTime={currentTime}
            />
        </div>
    );
}
