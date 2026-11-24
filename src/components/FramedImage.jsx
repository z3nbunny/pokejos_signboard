
import {
    useCallback,
    useEffect,
    useRef,
    useState
} from 'react';

import {
    getLegacyFramingStyle,
    getImagePanMetrics,
    isLegacyFraming,
    normalizeImageFraming
} from '../utils/imageFraming';

/**
 * FRAMED_IMAGE_COMPONENT
 *
 * Legacy framing uses the original image element
 * and focal-point positioning.
 *
 * Version 2 uses a clipped frame with an image
 * that can be zoomed and panned independently.
 */
export default function FramedImage({
    src,
    alt = '',
    framing,
    objectFit = 'contain',
    className = '',
    style
}) {
    const frameRef = useRef(null);
    const imageRef = useRef(null);

    const [dimensions, setDimensions] = useState(null);

    const safeFraming = normalizeImageFraming(framing);
    const isVersion2 = !isLegacyFraming(safeFraming);

    // IMAGE_FRAMING_MEASURE
    const measure = useCallback(() => {
        const frame = frameRef.current;
        const image = imageRef.current;

        if (
            !frame ||
            !image ||
            !image.naturalWidth ||
            !image.naturalHeight
        ) {
            return;
        }

        const computed = window.getComputedStyle(frame);

        const paddingX =
            parseFloat(computed.paddingLeft) +
            parseFloat(computed.paddingRight);

        const paddingY =
            parseFloat(computed.paddingTop) +
            parseFloat(computed.paddingBottom);

        const next = {
            src,
            viewportWidth: Math.max(
                0,
                frame.clientWidth - paddingX
            ),
            viewportHeight: Math.max(
                0,
                frame.clientHeight - paddingY
            ),
            imageWidth: image.naturalWidth,
            imageHeight: image.naturalHeight
        };

        setDimensions((previous) => {
            if (
                previous &&
                Object.keys(next).every(
                    (key) => previous[key] === next[key]
                )
            ) {
                return previous;
            }

            return next;
        });
    }, [src]);

    // IMAGE_FRAMING_RESIZE
    useEffect(() => {
        if (!isVersion2 || !frameRef.current) {
            return;
        }

        const observer = new ResizeObserver(measure);

        observer.observe(frameRef.current);

        return () => observer.disconnect();
    }, [isVersion2, measure]);

    // Preserve the original rendering behavior.
    if (!isVersion2) {
        return (
            <img
                src={src}
                alt={alt}
                draggable={false}
                className={className}
                style={{
                    ...style,
                    ...getLegacyFramingStyle(framing)
                }}
            />
        );
    }

    // IMAGE_FRAMING_V2_METRICS
    const metrics =
        dimensions?.src === src
            ? getImagePanMetrics({
                ...dimensions,
                framing: safeFraming,
                objectFit
            })
            : null;

    const offsetX = metrics?.offsetX ?? 0;
    const offsetY = metrics?.offsetY ?? 0;

    return (
        <div
            ref={frameRef}
            className={`${className} overflow-hidden`}
            style={style}
        >
            <img
                ref={imageRef}
                src={src}
                alt={alt}
                draggable={false}
                onLoad={measure}
                className="block w-full h-full select-none pointer-events-none"
                style={{
                    objectFit,
                    objectPosition: 'center',
                    transform: `
                        translate3d(
                            ${offsetX}px,
                            ${offsetY}px,
                            0
                        )
                        scale(${safeFraming.zoom})
                    `,
                    transformOrigin: 'center center'
                }}
            />
        </div>
    );
}
