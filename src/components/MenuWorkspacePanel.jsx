import {
    useEffect,
    useId,
    useState
} from 'react';

const STORAGE_PREFIX =
    'restaurant-menu-workspace-panel:';

export default function MenuWorkspacePanel({
    panelKey,
    title,
    description = '',
    summary = null,
    defaultOpen = false,
    children
}) {
    const generatedId = useId();

    const contentId =
        `menu-workspace-panel-${generatedId}`;

    const [isOpen, setIsOpen] = useState(() => {
        try {
            const storedValue =
                window.sessionStorage.getItem(
                    `${STORAGE_PREFIX}${panelKey}`
                );

            if (storedValue === null) {
                return defaultOpen;
            }

            return storedValue === 'open';
        } catch {
            return defaultOpen;
        }
    });

    useEffect(() => {
        try {
            window.sessionStorage.setItem(
                `${STORAGE_PREFIX}${panelKey}`,
                isOpen ? 'open' : 'closed'
            );
        } catch {
            /* The panel still works if storage is unavailable. */
        }
    }, [isOpen, panelKey]);

    return (
        <section className="overflow-hidden rounded-3xl border border-border bg-bg shadow-sm">
            <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={contentId}
                onClick={() =>
                    setIsOpen(
                        (currentValue) =>
                            !currentValue
                    )
                }
                className="w-full flex items-center justify-between gap-5 p-5 text-left hover:bg-border/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent transition-colors"
            >
                <div className="min-w-0">
                    <h3 className="text-lg font-bold text-text-primary">
                        {title}
                    </h3>

                    {description && (
                        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                            {description}
                        </p>
                    )}
                </div>

                <span className="shrink-0 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    {isOpen ? 'Collapse' : 'Expand'}

                    <span
                        aria-hidden="true"
                        className={`text-base leading-none transition-transform ${isOpen
                            ? 'rotate-180'
                            : ''
                            }`}
                    >
                        ↓
                    </span>
                </span>
            </button>

            {summary && (
                <div className="border-t border-border bg-surface/55 p-4">
                    {summary}
                </div>
            )}

            {isOpen && (
                <div
                    id={contentId}
                    className="border-t border-border p-5"
                >
                    {children}
                </div>
            )}
        </section>
    );
}
