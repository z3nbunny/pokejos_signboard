import useMenuSpotlight from '../hooks/useMenuSpotlight';

export default function MenuAvailabilityPreview({
    menu,
    menuLabel,
    locationId,
    locationLabel,
    menuId,
    soldOutItems,
    currentTime,
    PreviewComponent
}) {
    const activeSpotlight = useMenuSpotlight({
        locationId,
        menuId,
        currentTime,
        includeScheduledSpotlights: false
    });

    return (
        <details className="rounded-3xl border border-border bg-bg p-5 shadow-sm">
            <summary className="cursor-pointer text-sm font-bold text-text-primary">
                Live {menuLabel} Preview — {locationLabel}
            </summary>

            <p className="mt-3 text-xs text-text-secondary">
                Published menu, currently active Spotlight,
                and availability for this location.
            </p>

            <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border border-border">
                <div className="absolute inset-0">
                    <PreviewComponent
                        menu={menu}
                        spotlight={activeSpotlight}
                        soldOutItems={soldOutItems}
                        currentTime={currentTime}
                    />
                </div>
            </div>
        </details>
    );
}