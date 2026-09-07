import {
    useState
} from 'react';

const DEFAULT_FRAMING = {
    zoom: 1,
    x: 50,
    y: 50
};

const MAX_IMAGE_CHARACTERS = 650000;
const MAX_IMAGE_WIDTH = 1600;
const MAX_IMAGE_HEIGHT = 1200;

const clampNumber = (
    value,
    fallback,
    minimum,
    maximum
) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return fallback;
    }

    return Math.min(
        maximum,
        Math.max(minimum, numericValue)
    );
};

const normalizeImageFraming = (
    framing
) => ({
    zoom: clampNumber(
        framing?.zoom,
        DEFAULT_FRAMING.zoom,
        1,
        3
    ),
    x: clampNumber(
        framing?.x,
        DEFAULT_FRAMING.x,
        0,
        100
    ),
    y: clampNumber(
        framing?.y,
        DEFAULT_FRAMING.y,
        0,
        100
    )
});

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
    disabled = false,
    onImageChange,
    onFramingChange
}) {
    const [processing, setProcessing] =
        useState(false);

    const [error, setError] = useState('');

    const safeFraming =
        normalizeImageFraming(framing);

    const isStoredUpload =
        imageUrl.startsWith('data:image/');

    const updatePointerPosition = (event) => {
        if (disabled || processing) {
            return;
        }

        const bounds =
            event.currentTarget.getBoundingClientRect();

        const x = (
            (event.clientX - bounds.left)
            / bounds.width
        ) * 100;

        const y = (
            (event.clientY - bounds.top)
            / bounds.height
        ) * 100;

        onFramingChange({
            ...safeFraming,
            x: clampNumber(x, 50, 0, 100),
            y: clampNumber(y, 50, 0, 100)
        });
    };

    const handlePointerDown = (event) => {
        event.currentTarget.setPointerCapture(
            event.pointerId
        );

        updatePointerPosition(event);
    };

    const handlePointerMove = (event) => {
        if (
            event.currentTarget.hasPointerCapture(
                event.pointerId
            )
        ) {
            updatePointerPosition(event);
        }
    };

    const releasePointer = (event) => {
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
            onFramingChange(DEFAULT_FRAMING);
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
                        Upload an image or paste an image URL. Click or drag over the preview to set its focal point.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
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

                    <button
                        type="button"
                        disabled={disabled || processing}
                        onClick={() =>
                            onFramingChange(DEFAULT_FRAMING)
                        }
                        className="px-3 py-1.5 rounded-full border border-border bg-bg text-[10px] font-bold uppercase text-text-secondary hover:bg-border disabled:opacity-50"
                    >
                        Reset Framing
                    </button>

                    {imageUrl && (
                        <button
                            type="button"
                            disabled={disabled || processing}
                            onClick={() => {
                                onImageChange('');
                                onFramingChange(
                                    DEFAULT_FRAMING
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

            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={releasePointer}
                onPointerCancel={releasePointer}
                className="relative w-full overflow-hidden rounded-xl bg-black border border-border cursor-crosshair touch-none select-none"
                style={{ aspectRatio }}
            >
                {imageUrl ? (
                    <>
                        <img
                            src={imageUrl}
                            alt={
                                imageAlt
                                || `${label} preview`
                            }
                            draggable={false}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                            style={{
                                objectPosition:
                                    `${safeFraming.x}% ${safeFraming.y}%`,
                                transform:
                                    `scale(${safeFraming.zoom})`,
                                transformOrigin:
                                    `${safeFraming.x}% ${safeFraming.y}%`
                            }}
                        />

                        <div
                            className="absolute w-6 h-6 rounded-full border-2 border-white bg-black/20 shadow-[0_0_0_2px_rgba(0,0,0,0.45)] pointer-events-none"
                            style={{
                                left: `${safeFraming.x}%`,
                                top: `${safeFraming.y}%`,
                                transform:
                                    'translate(-50%, -50%)'
                            }}
                        >
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/80 -translate-x-1/2" />
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/80 -translate-y-1/2" />
                        </div>
                    </>
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
                                ...safeFraming,
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
                        <span>Horizontal</span>
                        <span>
                            {Math.round(safeFraming.x)}%
                        </span>
                    </span>

                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={safeFraming.x}
                        disabled={disabled || processing}
                        onChange={(event) =>
                            onFramingChange({
                                ...safeFraming,
                                x: Number(
                                    event.target.value
                                )
                            })
                        }
                        className="w-full cursor-pointer disabled:opacity-50"
                    />
                </label>

                <label className="block">
                    <span className="flex justify-between text-[11px] font-bold uppercase text-text-secondary mb-1">
                        <span>Vertical</span>
                        <span>
                            {Math.round(safeFraming.y)}%
                        </span>
                    </span>

                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={safeFraming.y}
                        disabled={disabled || processing}
                        onChange={(event) =>
                            onFramingChange({
                                ...safeFraming,
                                y: Number(
                                    event.target.value
                                )
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
