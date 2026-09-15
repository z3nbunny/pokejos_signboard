export default function MenuEditorItemList({
    children,
    itemCount = 0,
    onAddItem,
    disabled = false,
    title = 'Menu Items',
    description =
    'Edit copy, pricing, badges, visibility and order.',
    className = ''
}) {
    const countLabel =
        itemCount === 1
            ? '1 item'
            : `${itemCount} items`;

    return (
        <div
            className={`
                space-y-4
                ${className}
            `}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-text-primary">
                            {title}
                        </h4>

                        <span className="rounded-full border border-border bg-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                            {countLabel}
                        </span>
                    </div>

                    <p className="mt-1 text-sm text-text-secondary">
                        {description}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onAddItem}
                    disabled={disabled}
                    className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                    + Add Item
                </button>
            </div>

            {itemCount > 0 ? (
                <div className="space-y-4">
                    {children}
                </div>
            ) : (
                <p className="rounded-2xl border-2 border-dashed border-border p-6 text-center text-sm text-text-secondary">
                    This section does not have any menu items yet.
                </p>
            )}

            <button
                type="button"
                onClick={onAddItem}
                disabled={disabled}
                className="w-full rounded-2xl border-2 border-dashed border-accent bg-accent-light py-3 text-sm font-bold uppercase tracking-wider text-accent transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
                + Add Menu Item
            </button>
        </div>
    );
}