export default function MenuLanguageToggle({
    showSpanish = true,
    onChange,
    disabled = false
}) {
    return (
        <button
            type="button"
            aria-pressed={showSpanish}
            onClick={() =>
                onChange(!showSpanish)
            }
            disabled={disabled}
            title={
                showSpanish
                    ? 'Hide Spanish from the menu display'
                    : 'Show Spanish on the menu display'
            }
            className={`
                inline-flex
                min-w-[9.5rem]
                items-center
                gap-2.5
                rounded-full
                border
                px-4
                py-2.5
                text-xs
                font-black
                uppercase
                tracking-wider
                transition-colors
                disabled:opacity-40
                ${showSpanish
                    ? 'border-emerald-500/50 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'border-border bg-surface text-text-secondary hover:bg-border'
                }
            `}
        >
            <span
                aria-hidden="true"
                className={`
                    relative
                    h-5
                    w-9
                    shrink-0
                    rounded-full
                    transition-colors
                    ${showSpanish
                        ? 'bg-emerald-500'
                        : 'bg-zinc-400'
                    }
                `}
            >
                <span
                    className={`
                        absolute
                        left-0
                        top-0.5
                        h-4
                        w-4
                        rounded-full
                        bg-white
                        shadow-sm
                        transition-transform
                        ${showSpanish
                            ? 'translate-x-[1.125rem]'
                            : 'translate-x-0.5'
                        }
                    `}
                />
            </span>

            Spanish {showSpanish ? 'On' : 'Off'}
        </button>
    );
}