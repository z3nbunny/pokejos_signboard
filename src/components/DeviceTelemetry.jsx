import { useEffect, useRef } from 'react';
import {
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc,
    updateDoc
} from 'firebase/firestore';

import { db } from '../firebase';

const HEARTBEAT_INTERVAL = 60000;
const MAX_SCREENSHOT_LENGTH = 750000;
const MAX_SCREENSHOT_WIDTH = 960;
const MAX_SCREENSHOT_HEIGHT = 540;
const SCREENSHOT_QUALITIES = [0.7, 0.6, 0.5, 0.4];

const compressScreenshot = (rawScreenshot) =>
    new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => {
            try {
                const scale = Math.min(
                    1,
                    MAX_SCREENSHOT_WIDTH / image.width,
                    MAX_SCREENSHOT_HEIGHT / image.height
                );

                const canvas =
                    document.createElement('canvas');

                canvas.width = Math.max(
                    1,
                    Math.round(image.width * scale)
                );

                canvas.height = Math.max(
                    1,
                    Math.round(image.height * scale)
                );

                const context = canvas.getContext('2d');

                if (!context) {
                    reject(
                        new Error(
                            'Unable to create screenshot canvas.'
                        )
                    );
                    return;
                }

                context.drawImage(
                    image,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                let compressedScreenshot = '';

                for (
                    const quality of SCREENSHOT_QUALITIES
                ) {
                    compressedScreenshot =
                        canvas.toDataURL(
                            'image/jpeg',
                            quality
                        );

                    if (
                        compressedScreenshot.length
                        <= MAX_SCREENSHOT_LENGTH
                    ) {
                        resolve(compressedScreenshot);
                        return;
                    }
                }

                reject(
                    new Error(
                        'Compressed screenshot still exceeded '
                        + 'the safe Firestore size limit.'
                    )
                );
            } catch (error) {
                reject(error);
            }
        };

        image.onerror = () => {
            reject(
                new Error(
                    'Fully returned an invalid screenshot.'
                )
            );
        };

        image.src = rawScreenshot.startsWith('data:')
            ? rawScreenshot
            : `data:image/png;base64,${rawScreenshot}`;
    });

export default function DeviceTelemetry({
    activeLocation,
    deviceId
}) {
    const processingCommand = useRef(false);

    useEffect(() => {
        if (
            !activeLocation
            || !deviceId
            || deviceId === 'unassigned'
        ) {
            return;
        }

        const deviceRef = doc(
            db,
            'locations',
            activeLocation,
            'devices',
            deviceId
        );

        const screenshotRef = doc(
            db,
            'locations',
            activeLocation,
            'deviceScreenshots',
            deviceId
        );

        // The device document already exists because pairing approval
        // creates it. Booting must never erase a pending command.
        updateDoc(deviceRef, {
            lastSeen: serverTimestamp(),
            currentUrl: window.location.href
        }).catch((error) => {
            console.error(
                'Unable to initialize TV telemetry:',
                error
            );
        });

        const heartbeatInterval = setInterval(() => {
            updateDoc(deviceRef, {
                lastSeen: serverTimestamp()
            }).catch((error) => {
                console.error(
                    'TV heartbeat failed:',
                    error
                );
            });
        }, HEARTBEAT_INTERVAL);

        const unsubscribe = onSnapshot(
            deviceRef,
            async (snapshot) => {
                if (
                    !snapshot.exists()
                    || processingCommand.current
                ) {
                    return;
                }

                const deviceData = snapshot.data();
                const command = deviceData.pendingCommand;

                if (
                    !command
                    || command === 'NONE'
                ) {
                    return;
                }

                processingCommand.current = true;

                try {
                    /*
                     * Clear the command before execution.
                     *
                     * This is essential for RELOAD and CLEAR_CACHE because
                     * those actions may terminate JavaScript before a later
                     * acknowledgment could run.
                     */
                    await updateDoc(deviceRef, {
                        pendingCommand: null
                    });

                    const fullyApi = window.fully;

                    switch (command) {
                        case 'RELOAD':
                            window.location.reload();
                            break;

                        case 'SCREEN_OFF':
                            if (fullyApi) {
                                fullyApi.startScreensaver();
                            } else {
                                console.log(
                                    '[Development] SCREEN_OFF received.'
                                );
                            }
                            break;

                        case 'SCREEN_ON':
                            if (fullyApi) {
                                fullyApi.stopScreensaver();

                                if (
                                    typeof fullyApi.turnScreenOn
                                    === 'function'
                                ) {
                                    fullyApi.turnScreenOn();
                                }
                            } else {
                                console.log(
                                    '[Development] SCREEN_ON received.'
                                );
                            }
                            break;

                        case 'GET_SCREENSHOT': {
                            if (!fullyApi) {
                                console.log(
                                    '[Development] GET_SCREENSHOT received.'
                                );

                                await updateDoc(deviceRef, {
                                    latestScreenshot: null
                                });

                                break;
                            }

                            const rawScreenshot =
                                fullyApi.getScreenshotPngBase64();

                            if (!rawScreenshot) {
                                throw new Error(
                                    'Fully returned an empty screenshot.'
                                );
                            }

                            const compressedScreenshot =
                                await compressScreenshot(rawScreenshot);

                            await setDoc(screenshotRef, {
                                image: compressedScreenshot,
                                capturedAt: serverTimestamp()
                            });

                            break;
                        }

                        case 'CLEAR_CACHE': {
                            /*
                             * Clear browser response caches without
                             * deleting Firebase Authentication storage.
                             */
                            if ('caches' in window) {
                                const cacheNames =
                                    await caches.keys();

                                await Promise.all(
                                    cacheNames.map((cacheName) =>
                                        caches.delete(cacheName)
                                    )
                                );
                            }

                            /*
                             * Fully's clearCache clears its web cache.
                             * We intentionally do not clear localStorage,
                             * sessionStorage or IndexedDB because doing so
                             * could destroy the paired TV identity.
                             */
                            if (fullyApi) {
                                fullyApi.clearCache();
                            }

                            window.location.reload();
                            break;
                        }

                        default:
                            console.warn(
                                'Unknown TV command:',
                                command
                            );
                    }
                } catch (error) {
                    console.error(
                        `TV command ${command} failed:`,
                        error
                    );
                } finally {
                    processingCommand.current = false;
                }
            },
            (error) => {
                console.error(
                    'TV command listener failed:',
                    error
                );
            }
        );

        return () => {
            clearInterval(heartbeatInterval);
            unsubscribe();
        };
    }, [activeLocation, deviceId]);

    return null;
}