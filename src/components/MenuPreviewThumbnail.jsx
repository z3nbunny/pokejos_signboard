const DESIGN_WIDTH = 1920;
const THUMBNAIL_WIDTH = 256;

const THUMBNAIL_SCALE =
    THUMBNAIL_WIDTH / DESIGN_WIDTH;

export default function MenuPreviewThumbnail({
    children,
    label = 'Menu preview thumbnail'
}) {
    return (
        <div
            role="img"
            aria-label={label}
            className="relative w-64 h-36 shrink-0 overflow-hidden rounded-2xl border border-border bg-black shadow-sm"
        >
            <div
                aria-hidden="true"
                className="absolute left-0 top-0 w-[1920px] h-[1080px] origin-top-left pointer-events-none select-none"
                style={{
                    transform:
                        `scale(${THUMBNAIL_SCALE})`
                }}
            >
                {children}
            </div>
        </div>
    );
}