export default function MenuAvailabilityPreview({
    menu,
    menuLabel,
    locationLabel,
    soldOutItems,
    currentTime,
    PreviewComponent
}) {
    return (
        <details className="rounded-3xl border border-border bg-bg p-5 shadow-sm">
            <summary className="cursor-pointer text-sm font-bold text-text-primary">
                Live {menuLabel} Preview — {locationLabel}
            </summary>

            <p className="mt-3 text-xs text-text-secondary">
                Published menu for this location.
                Sold-out changes appear automatically
                when supported by the display.
            </p>

            <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border border-border">
                <div className="absolute inset-0">
                    <PreviewComponent
                        menu={menu}
                        soldOutItems={soldOutItems}
                        currentTime={currentTime}
                    />
                </div>
            </div>
        </details>
    );
}