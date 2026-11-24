
import { useRef, useState } from 'react';

import FramedImage from './FramedImage';

import {
    DEFAULT_IMAGE_FRAMING,
    getImagePanMetrics,
    normalizeImageFraming,
    panFramingByPixels,
    toVersion2Framing
} from '../utils/imageFraming';

const MAX_IMAGE_CHARACTERS = 650000;
const MAX_IMAGE_WIDTH = 1600;
const MAX_IMAGE_HEIGHT = 1200;

const loadImage = (source) =>
    new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = () => reject(
            new Error('The selected image could not be opened.')
        );
        image.src = source;
    });

const canvasToDataUrl = (
    canvas,
    quality
) =>
    new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(
                        new Error(
                            'The selected image could not be processed.'
                        )
                    );
                    return;
                }

                const reader = new FileReader();

                reader.onload = () => resolve(
                    String(reader.result || '')
                );
                reader.onerror = () => reject(
                    new Error(
                        'The processed image could not be read.'
                    )
                );
                reader.readAsDataURL(blob);
            },
            'image/webp',
            quality
        );
    });

const optimizeImageFile = async (file) => {
    if (!file?.type?.startsWith('image/')) {
        throw new Error('Please choose an image file.');
    }

    const sourceUrl = URL.createObjectURL(file);
    let image;

    try {
        image = await loadImage(sourceUrl);
    } finally {
        URL.revokeObjectURL(sourceUrl);
    }

    const initialScale = Math.min(
        1,
        MAX_IMAGE_WIDTH / image.naturalWidth,
        MAX_IMAGE_HEIGHT / image.naturalHeight
    );

    let width = Math.max(
        1,
        Math.round(image.naturalWidth * initialScale)
    );

    let height = Math.max(
        1,
        Math.round(image.naturalHeight * initialScale)
    );

    let quality = 0.86;

    for (let attempt = 0; attempt < 10; attempt += 1) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error(
                'This browser cannot process the selected image.'
            );
        }

        canvas.width = width;
        canvas.height = height;

        context.drawImage(
            image,
            0,
            0,
            width,
            height
        );

        const dataUrl = await canvasToDataUrl(
            canvas,
            quality
        );

        if (
            dataUrl.length
            <= MAX_IMAGE_CHARACTERS
        ) {
            return dataUrl;
        }

        if (quality > 0.58) {
            quality -= 0.08;
        } else {
            width = Math.max(
                1,
                Math.round(width * 0.82)
            );
            height = Math.max(
                1,
                Math.round(height * 0.82)
            );
        }
    }

    throw new Error(
        'The image is still too large after compression. Please choose a smaller image.'
    );
};

export default function ImageFramingEditor({
    label = 'Image',
    imageUrl = '',
    imageAlt = '',
    framing,
    aspectRatio = '2 / 1',
    objectFit = 'cover',
    disabled = false,
    showImageControls = true,
    onImageChange,
    onFramingChange
}) {
    const [processing, setProcessing] =
        useState(false);

    const [error, setError] = useState('');

    const dragRef = useRef(null);

    const safeFraming = normalizeImageFraming(framing);
    const editableFraming = toVersion2Framing(safeFraming);

    const isStoredUpload =
        imageUrl.startsWith('data:image/');


    // IMAGE_FRAMING_DRAG_START
    const handlePointerDown = (event) => {
        if (disabled || processing || !imageUrl) return;

        if (
            event.pointerType === 'mouse' &&
            event.button !== 0
        ) {
            return;
        }


        const frame = event.currentTarget;
        const viewport =
            frame.querySelector('[data-image-framing-viewport]')
            || frame;

        const image = frame.querySelector('img');


        if (
            !image ||
            !image.naturalWidth ||
            !image.naturalHeight
        ) {
            return;
        }

        const startingFraming =
            toVersion2Framing(safeFraming);

        const metrics = getImagePanMetrics({

            viewportWidth: viewport.clientWidth,
            viewportHeight: viewport.clientHeight,
            imageWidth: image.naturalWidth,
            imageHeight: image.naturalHeight,
            framing: startingFraming,
            objectFit
        });

        if (!metrics) return;

        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startingFraming,
            metrics
        };

        frame.setPointerCapture(event.pointerId);
    };

    // IMAGE_FRAMING_DRAG_MOVE
    const handlePointerMove = (event) => {
        const drag = dragRef.current;

        if (
            !drag ||
            drag.pointerId !== event.pointerId ||
            !event.currentTarget.hasPointerCapture(
                event.pointerId
            )
        ) {
            return;
        }

        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;

        if (
            Math.abs(deltaX) < 1 &&
            Math.abs(deltaY) < 1
        ) {
            return;
        }

        const nextFraming = panFramingByPixels(
            drag.startingFraming,
            deltaX,
            deltaY,
            drag.metrics
        );

        onFramingChange(nextFraming);
    };

    // IMAGE_FRAMING_DRAG_END
    const releasePointer = (event) => {
        if (
            dragRef.current?.pointerId ===
            event.pointerId
        ) {
            dragRef.current = null;
        }

        if (
            event.currentTarget.hasPointerCapture(
                event.pointerId
            )
        ) {
            event.currentTarget.releasePointerCapture(
                event.pointerId
            );
        }
    };

    const handleFileSelection = async (event) => {
        const file = event.target.files?.[0];

        event.target.value = '';

        if (!file) {
            return;
        }

        setProcessing(true);
        setError('');

        try {
            const optimizedImage =
                await optimizeImageFile(file);

            onImageChange(optimizedImage);
            onFramingChange({ ...DEFAULT_IMAGE_FRAMING });
        } catch (selectionError) {
            setError(
                selectionError.message
                || 'The image could not be prepared.'
            );
        } finally {
            setProcessing(false);
        }
    };

    return (
        <section className="bg-surface border border-border rounded-2xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                        {label}
                    </h4>


                    <p className="mt-1 text-[11px] text-text-secondary">
                        {showImageControls
                            ? 'Upload an image or paste an image URL. Zoom in, then drag to reposition it.'
                            : 'Zoom in, then drag the image to reposition it. Use the sliders for precise adjustments.'}
                    </p>

                </div>

                <div className="flex flex-wrap gap-2">
                    {showImageControls && (
                        <label className="px-3 py-1.5 rounded-full bg-accent hover:bg-accent-hover text-white text-[10px] font-bold uppercase cursor-pointer">
                            {processing
                                ? 'Preparing...'
                                : 'Upload Image'}

                            <input
                                type="file"
                                accept="image/*"
                                disabled={disabled || processing}
                                onChange={handleFileSelection}
                                className="sr-only"
                            />
                        </label>
                    )}

                    <button
                        type="button"
                        disabled={disabled || processing}
                        onClick={() =>
                            onFramingChange({ ...DEFAULT_IMAGE_FRAMING })
                        }
                        className="px-3 py-1.5 rounded-full border border-border bg-bg text-[10px] font-bold uppercase text-text-secondary hover:bg-border disabled:opacity-50"
                    >
                        Reset Framing
                    </button>

                    {showImageControls && imageUrl && (
                        <button
                            type="button"
                            disabled={disabled || processing}
                            onClick={() => {
                                onImageChange('');
                                onFramingChange(
                                    { ...DEFAULT_IMAGE_FRAMING }
                                );
                                setError('');
                            }}
                            className="px-3 py-1.5 rounded-full border border-border bg-bg text-[10px] font-bold uppercase text-danger hover:bg-red-50 disabled:opacity-50"
                        >
                            Clear Image
                        </button>
                    )}
                </div>
            </div>

            {showImageControls && (
                <label className="block">
                    <span className="text-[11px] uppercase tracking-wider text-text-secondary font-bold block mb-2">
                        Image URL
                    </span>

                    <input
                        type="url"
                        value={
                            isStoredUpload
                                ? ''
                                : imageUrl
                        }
                        placeholder={
                            isStoredUpload
                                ? 'Uploaded image is currently selected'
                                : 'https://example.com/special.jpg'
                        }
                        disabled={disabled || processing}
                        onChange={(event) => {
                            setError('');
                            onImageChange(
                                event.target.value
                            );
                        }}
                        className="w-full bg-bg border border-border rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none disabled:opacity-50"
                    />
                </label>
            )}
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={releasePointer}
                onPointerCancel={releasePointer}
                onLostPointerCapture={() => {
                    dragRef.current = null;
                }}
                className="relative w-full overflow-hidden rounded-xl bg-black border border-border cursor-grab active:cursor-grabbing touch-none select-none"
                style={{ aspectRatio }}
            >
                {imageUrl ? (
                    <FramedImage
                        src={imageUrl}
                        alt={imageAlt || `${label} preview`}
                        framing={safeFraming}
                        objectFit={objectFit}
                        className={`absolute inset-0 w-full h-full pointer-events-none select-none ${objectFit === 'contain'
                            ? 'object-contain'
                            : 'object-cover'
                            }`}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-white/60">
                        Choose an image to begin framing.
                    </div>
                )}
            </div>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="block">
                    <span className="flex justify-between text-[11px] font-bold uppercase text-text-secondary mb-1">
                        <span>Zoom</span>
                        <span>
                            {safeFraming.zoom.toFixed(2)}×
                        </span>
                    </span>

                    <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.05"
                        value={safeFraming.zoom}
                        disabled={disabled || processing}
                        onChange={(event) =>
                            onFramingChange({
                                ...editableFraming,
                                zoom: Number(
                                    event.target.value
                                )
                            })
                        }
                        className="w-full cursor-pointer disabled:opacity-50"
                    />
                </label>


                <label className="block">
                    <span className="flex justify-between text-[11px] font-bold uppercase text-text-secondary mb-1">
                        <span>Horizontal pan</span>
                        <span>
                            {Math.round(editableFraming.panX * 100)}%
                        </span>
                    </span>

                    <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.01"
                        value={editableFraming.panX}
                        disabled={disabled || processing}
                        onChange={(event) =>
                            onFramingChange({
                                ...editableFraming,
                                panX: Number(event.target.value)
                            })
                        }
                        className="w-full cursor-pointer disabled:opacity-50"
                    />
                </label>

                <label className="block">
                    <span className="flex justify-between text-[11px] font-bold uppercase text-text-secondary mb-1">
                        <span>Vertical pan</span>
                        <span>
                            {Math.round(editableFraming.panY * 100)}%
                        </span>
                    </span>

                    <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.01"
                        value={editableFraming.panY}
                        disabled={disabled || processing}
                        onChange={(event) =>
                            onFramingChange({
                                ...editableFraming,
                                panY: Number(event.target.value)
                            })
                        }
                        className="w-full cursor-pointer disabled:opacity-50"
                    />
                </label>

            </div>

            {error && (
                <p className="text-sm font-bold text-danger">
                    {error}
                </p>
            )}
        </section>
    );
}
