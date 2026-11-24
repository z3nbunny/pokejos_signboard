
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    DEFAULT_IMAGE_FRAMING,
    getImagePanMetrics,
    panFramingByPixels,
    getLegacyFramingStyle
} from '../src/utils/imageFraming.js';

test('zoomed images calculate correct pan limits', () => {
    const metrics = getImagePanMetrics({
        viewportWidth: 300,
        viewportHeight: 200,
        imageWidth: 600,
        imageHeight: 400,
        framing: {
            ...DEFAULT_IMAGE_FRAMING,
            zoom: 2
        }
    });

    assert.equal(metrics.maxPanX, 150);
    assert.equal(metrics.maxPanY, 100);
});

test('drag movement uses the available pan range', () => {
    const framing = {
        ...DEFAULT_IMAGE_FRAMING,
        zoom: 2
    };

    const metrics = getImagePanMetrics({
        viewportWidth: 300,
        viewportHeight: 200,
        imageWidth: 600,
        imageHeight: 400,
        framing
    });

    const result = panFramingByPixels(
        framing,
        75,
        -50,
        metrics
    );

    assert.equal(result.panX, 0.5);
    assert.equal(result.panY, -0.5);
});

test('dragging is bounded at the edges', () => {
    const framing = {
        ...DEFAULT_IMAGE_FRAMING,
        zoom: 2
    };

    const metrics = getImagePanMetrics({
        viewportWidth: 300,
        viewportHeight: 200,
        imageWidth: 600,
        imageHeight: 400,
        framing
    });

    const result = panFramingByPixels(
        framing,
        1000,
        -1000,
        metrics
    );

    assert.equal(result.panX, 1);
    assert.equal(result.panY, -1);
});

test('legacy framing remains unchanged', () => {
    const style = getLegacyFramingStyle({
        zoom: 1.5,
        x: 60,
        y: 40
    });

    assert.equal(style.objectPosition, '60% 40%');
    assert.equal(style.transform, 'scale(1.5)');
    assert.equal(style.transformOrigin, '60% 40%');
});

test('unzoomed contained image has no excess pan', () => {
    const framing = {
        ...DEFAULT_IMAGE_FRAMING
    };

    const metrics = getImagePanMetrics({
        viewportWidth: 300,
        viewportHeight: 200,
        imageWidth: 600,
        imageHeight: 400,
        framing
    });

    assert.equal(metrics.maxPanX, 0);
    assert.equal(metrics.maxPanY, 0);
});
