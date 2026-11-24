
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
 * Legacy records retain their original styling.
 * Version 2 renders the scaled image at its actual
 * calculated dimensions for accurate bounded panning.
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

        const next = {
            src,
            viewportWidth: frame.clientWidth,
            viewportHeight: frame.clientHeight,
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

    const metrics =
        dimensions?.src === src
            ? getImagePanMetrics({
                ...dimensions,
                framing: safeFraming,
                objectFit
            })
            : null;

    // IMAGE_FRAMING_V2_RENDER
    return (
        <div
            className={`${className} overflow-hidden`}
            style={style}
        >
            <div
                ref={frameRef}
                data-image-framing-viewport
                className="relative w-full h-full overflow-hidden"
            >
                <img
                    ref={imageRef}
                    src={src}
                    alt={alt}
                    draggable={false}
                    onLoad={measure}
                    className="absolute block max-w-none max-h-none select-none pointer-events-none"
                    style={metrics
                        ? {
                            left: '50%',
                            top: '50%',
                            width: metrics.displayedWidth,
                            height: metrics.displayedHeight,
                            transform: `translate(
                                calc(-50% + ${metrics.offsetX}px),
                                calc(-50% + ${metrics.offsetY}px)
                            )`
                        }
                        : {
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit
                        }}
                />
            </div>
        </div>
    );
}
