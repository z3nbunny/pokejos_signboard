
/**
 * Shared image-framing definitions.
 *
 * Legacy records use focal-point percentages:
 * { zoom, x, y }
 *
 * Version 2 records use centered pan offsets:
 * { version: 2, zoom, panX, panY }
 *
 * All saved framing must remain backward-compatible.
 */

// IMAGE_FRAMING_DEFAULTS
export const DEFAULT_IMAGE_FRAMING = {
    version: 2,
    zoom: 1,
    panX: 0,
    panY: 0
};

export const LEGACY_IMAGE_FRAMING = {
    zoom: 1,
    x: 50,
    y: 50
};

// IMAGE_FRAMING_CLAMP
export function clampFramingValue(
    value,
    fallback,
    min,
    max
) {
    if (value === null ||
        value === undefined ||
        value === '') {
        return fallback;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, number));
}

// IMAGE_FRAMING_NORMALIZE
export function normalizeImageFraming(framing) {
    if (framing?.version === 2) {
        return {
            version: 2,
            zoom: clampFramingValue(
                framing.zoom, 1, 1, 3
            ),
            panX: clampFramingValue(
                framing.panX, 0, -1, 1
            ),
            panY: clampFramingValue(
                framing.panY, 0, -1, 1
            )
        };
    }

    return {
        zoom: clampFramingValue(
            framing?.zoom, 1, 1, 3
        ),
        x: clampFramingValue(
            framing?.x, 50, 0, 100
        ),
        y: clampFramingValue(
            framing?.y, 50, 0, 100
        )
    };
}

// IMAGE_FRAMING_IS_LEGACY
export function isLegacyFraming(framing) {
    return framing?.version !== 2;
}

// IMAGE_FRAMING_LEGACY_STYLE
export function getLegacyFramingStyle(framing) {
    const safe = normalizeImageFraming(framing);

    if (!isLegacyFraming(safe)) {
        return null;
    }

    return {
        objectPosition: `${safe.x}% ${safe.y}%`,
        transform: `scale(${safe.zoom})`,
        transformOrigin: `${safe.x}% ${safe.y}%`
    };
}

/**
 * IMAGE_FRAMING_PAN_METRICS
 *
 * Calculates the displayed image dimensions and the maximum
 * distance the image can move without exposing additional
 * empty space.
 *
 * Viewport dimensions represent the usable image area,
 * excluding any decorative padding.
 */
export function getImagePanMetrics({
    viewportWidth,
    viewportHeight,
    imageWidth,
    imageHeight,
    framing,
    objectFit = 'contain'
}) {
    const dimensions = [
        viewportWidth,
        viewportHeight,
        imageWidth,
        imageHeight
    ];

    if (
        !dimensions.every(
            (value) => Number.isFinite(value) && value > 0
        )
    ) {
        return null;
    }

    const safe = normalizeImageFraming(framing);

    if (isLegacyFraming(safe)) {
        return null;
    }

    const widthRatio = viewportWidth / imageWidth;
    const heightRatio = viewportHeight / imageHeight;

    const fitScale = objectFit === 'cover'
        ? Math.max(widthRatio, heightRatio)
        : Math.min(widthRatio, heightRatio);

    const displayedWidth = imageWidth * fitScale * safe.zoom;
    const displayedHeight = imageHeight * fitScale * safe.zoom;

    const maxPanX = Math.max(
        0,
        (displayedWidth - viewportWidth) / 2
    );

    const maxPanY = Math.max(
        0,
        (displayedHeight - viewportHeight) / 2
    );

    return {
        displayedWidth,
        displayedHeight,
        maxPanX,
        maxPanY,
        offsetX: safe.panX * maxPanX,
        offsetY: safe.panY * maxPanY
    };
}

/**
 * IMAGE_FRAMING_DRAG
 *
 * Moves the image by a pointer displacement measured in
 * pixels. Positive X moves right; positive Y moves down.
 *
 * startFraming must be the framing captured at the
 * beginning of the drag, not the most recently updated
 * framing.
 */
export function panFramingByPixels(
    startFraming,
    deltaX,
    deltaY,
    metrics
) {
    const safe = normalizeImageFraming(startFraming);

    if (isLegacyFraming(safe)) {
        throw new Error(
            'Drag-to-pan requires version 2 framing.'
        );
    }

    const moveX = Number.isFinite(deltaX) ? deltaX : 0;
    const moveY = Number.isFinite(deltaY) ? deltaY : 0;

    const maxPanX = metrics?.maxPanX || 0;
    const maxPanY = metrics?.maxPanY || 0;

    return {
        ...safe,
        panX: maxPanX > 0
            ? clampFramingValue(
                safe.panX + moveX / maxPanX,
                0,
                -1,
                1
            )
            : 0,
        panY: maxPanY > 0
            ? clampFramingValue(
                safe.panY + moveY / maxPanY,
                0,
                -1,
                1
            )
            : 0
    };
}
