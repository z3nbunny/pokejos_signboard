import {
    useEffect,
    useRef,
    useState
} from 'react';

export default function MenuEditorCard({
    children,
    className = '',
    showAccent = false,
    revealKey = '',
    highlightDuration = 2600
}) {
    const cardRef = useRef(null);

    const [
        isHighlighted,
        setIsHighlighted
    ] = useState(false);

    useEffect(() => {
        if (!revealKey) {
            return undefined;
        }

        const animationFrame =
            window.requestAnimationFrame(() => {
                setIsHighlighted(true);

                cardRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                });
            });

        const highlightTimer =
            window.setTimeout(() => {
                setIsHighlighted(false);
            }, highlightDuration);

        return () => {
            window.cancelAnimationFrame(
                animationFrame
            );

            window.clearTimeout(
                highlightTimer
            );
        };
    }, [
        revealKey,
        highlightDuration
    ]);

    return (
        <div
            ref={cardRef}
            className={`
                relative
                scroll-mt-24
                transition-[box-shadow,background-color,border-color]
                duration-300
                ${showAccent
                    ? 'pl-4'
                    : ''}
                ${isHighlighted
                    ? 'ring-2 ring-blue-500 bg-blue-500/10'
                    : ''}
                ${className}
            `}
        >
            {showAccent && (
                <span
                    aria-hidden="true"
                    className="absolute bottom-2 left-0 top-2 w-1.5 rounded-full bg-blue-500"
                />
            )}

            {children}
        </div>
    );
}