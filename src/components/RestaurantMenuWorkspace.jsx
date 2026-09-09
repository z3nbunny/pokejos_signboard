import {
    useCallback,
    useState
} from 'react';

import MenuManager from './MenuManager';
import SidesMenuManager from './SidesMenuManager';

const MENU_OPTIONS = [
    {
        id: 'meat',
        label: 'Meat Menu',
        description: 'Meats, plates, family packs and favorites'
    },
    {
        id: 'sides',
        label: 'Sides Menu',
        description: 'Sides, sauces, desserts and drinks'
    }
];

export default function RestaurantMenuWorkspace() {
    const [activeMenuId, setActiveMenuId] =
        useState('meat');

    const [unsavedMenus, setUnsavedMenus] =
        useState({
            meat: false,
            sides: false
        });

    const handleMeatUnsavedChanges =
        useCallback((hasUnsavedChanges) => {
            setUnsavedMenus(
                (currentMenus) => {
                    if (
                        currentMenus.meat
                        === hasUnsavedChanges
                    ) {
                        return currentMenus;
                    }

                    return {
                        ...currentMenus,
                        meat: hasUnsavedChanges
                    };
                }
            );
        }, []);

    const handleSidesUnsavedChanges =
        useCallback((hasUnsavedChanges) => {
            setUnsavedMenus(
                (currentMenus) => {
                    if (
                        currentMenus.sides
                        === hasUnsavedChanges
                    ) {
                        return currentMenus;
                    }

                    return {
                        ...currentMenus,
                        sides: hasUnsavedChanges
                    };
                }
            );
        }, []);

    const handleMenuChange = (nextMenuId) => {
        if (nextMenuId === activeMenuId) {
            return;
        }

        if (unsavedMenus[activeMenuId]) {
            const activeMenuLabel =
                MENU_OPTIONS.find(
                    (menuOption) =>
                        menuOption.id === activeMenuId
                )?.label || 'menu';

            const confirmed = window.confirm(
                `The ${activeMenuLabel} has unsaved changes. `
                + 'Switching menus will discard those changes. '
                + 'Continue?'
            );

            if (!confirmed) {
                return;
            }

            setUnsavedMenus(
                (currentMenus) => ({
                    ...currentMenus,
                    [activeMenuId]: false
                })
            );
        }

        setActiveMenuId(nextMenuId);
    };

    return (
        <div className="space-y-6">
            <section className="rounded-3xl border border-border bg-bg p-5 shadow-sm">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                            Restaurant Menus
                        </p>

                        <h2 className="mt-1 text-2xl font-bold text-text-primary">
                            Choose a Menu Workspace
                        </h2>

                        <p className="mt-2 text-sm text-text-secondary">
                            Edit and preview each restaurant display
                            independently.
                        </p>
                    </div>

                    <div
                        role="tablist"
                        aria-label="Restaurant menu workspace"
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                        {MENU_OPTIONS.map((menuOption) => {
                            const isActive =
                                activeMenuId === menuOption.id;

                            const hasUnsavedChanges =
                                unsavedMenus[menuOption.id];

                            return (
                                <button
                                    key={menuOption.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() =>
                                        handleMenuChange(
                                            menuOption.id
                                        )
                                    }
                                    className={`min-w-0 rounded-2xl border px-5 py-4 text-left transition-colors ${isActive
                                        ? 'border-accent bg-accent-light text-text-primary shadow-sm'
                                        : 'border-border bg-surface text-text-secondary hover:bg-border/40 hover:text-text-primary'
                                        }`}
                                >
                                    <span className="flex items-center justify-between gap-3">
                                        <span className="font-bold">
                                            {menuOption.label}
                                        </span>

                                        {hasUnsavedChanges && (
                                            <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-800">
                                                Unsaved
                                            </span>
                                        )}
                                    </span>

                                    <span className="mt-1 block text-xs leading-relaxed">
                                        {menuOption.description}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {activeMenuId === 'meat' ? (
                <MenuManager
                    onUnsavedChangesChange={
                        handleMeatUnsavedChanges
                    }
                />
            ) : (
                <SidesMenuManager
                    onUnsavedChangesChange={
                        handleSidesUnsavedChanges
                    }
                />
            )}
        </div>
    );
}
