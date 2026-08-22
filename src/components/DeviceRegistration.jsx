import { useEffect, useState } from 'react';
import {
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc
} from 'firebase/firestore';

import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import DeviceTelemetry from './DeviceTelemetry';

const VALID_LOCATIONS = [
    'brodie',
    'parmer',
    'round_rock'
];

function createPairingCode(uid) {
    const CODE_LIMIT = 1000000;
    let hash = 0;

    for (let index = 0; index < uid.length; index += 1) {
        hash = ((hash * 31) + uid.charCodeAt(index)) >>> 0;
    }

    return String(hash % CODE_LIMIT).padStart(6, '0');
}

export default function DeviceRegistration({
    activeLocation,
    deviceId
}) {
    const { currentUser, isDeviceUser } = useAuth();

    const [pairingStatus, setPairingStatus] =
        useState('registering');

    const [pairingError, setPairingError] =
        useState('');

    useEffect(() => {
        if (!currentUser || !isDeviceUser) {
            return;
        }

        if (!VALID_LOCATIONS.includes(activeLocation)) {
            setPairingStatus('error');
            setPairingError(
                `Invalid location: ${activeLocation}`
            );
            return;
        }

        if (
            !deviceId
            || deviceId === 'unassigned'
            || !/^[a-z0-9_-]{1,40}$/.test(deviceId)
        ) {
            setPairingStatus('error');
            setPairingError(
                'This TV needs a valid device ID in its URL.'
            );
            return;
        }

        const pairingCode = createPairingCode(
            currentUser.uid
        );

        const pairingRef = doc(
            db,
            'devicePairingRequests',
            currentUser.uid
        );

        let creationAttempted = false;

        const unsubscribe = onSnapshot(
            pairingRef,
            async (snapshot) => {
                if (!snapshot.exists()) {
                    if (creationAttempted) {
                        return;
                    }

                    creationAttempted = true;

                    try {
                        await setDoc(pairingRef, {
                            authUid: currentUser.uid,
                            locationId: activeLocation,
                            deviceId,
                            pairingCode,
                            status: 'pending',
                            createdAt: serverTimestamp()
                        });
                    } catch (error) {
                        console.error(
                            'Unable to create pairing request:',
                            error
                        );

                        setPairingStatus('error');
                        setPairingError(
                            'Unable to contact the pairing service.'
                        );
                    }

                    return;
                }

                const pairingData = snapshot.data();

                // Reject stale registrations if someone changes the
                // location or device parameters in the TV URL.
                if (
                    pairingData.locationId !== activeLocation
                    || pairingData.deviceId !== deviceId
                ) {
                    setPairingStatus('error');
                    setPairingError(
                        'This TV identity is registered to a different URL.'
                    );
                    return;
                }

                setPairingStatus(
                    pairingData.status || 'pending'
                );
                setPairingError('');
            },
            (error) => {
                console.error(
                    'Pairing listener failed:',
                    error
                );

                setPairingStatus('error');
                setPairingError(
                    'Unable to read this TV pairing request.'
                );
            }
        );

        return () => unsubscribe();
    }, [
        activeLocation,
        currentUser,
        deviceId,
        isDeviceUser
    ]);

    if (pairingStatus === 'approved') {
        return (
            <DeviceTelemetry
                activeLocation={activeLocation}
                deviceId={deviceId}
            />
        );
    }

    const pairingCode = currentUser
        ? createPairingCode(currentUser.uid)
        : '------';

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950 text-white flex items-center justify-center font-sans">
            <div className="max-w-2xl text-center px-10">
                {pairingStatus === 'error' ? (
                    <>
                        <h1 className="text-4xl font-black uppercase tracking-widest text-red-400 mb-6">
                            TV Registration Error
                        </h1>

                        <p className="text-xl text-slate-300">
                            {pairingError}
                        </p>
                    </>
                ) : pairingStatus === 'rejected' ? (
                    <>
                        <h1 className="text-4xl font-black uppercase tracking-widest text-red-400 mb-6">
                            Pairing Rejected
                        </h1>

                        <p className="text-xl text-slate-300">
                            Check this TV’s location and device URL,
                            then contact an administrator.
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className="text-4xl font-black uppercase tracking-widest mb-6">
                            Approve This TV
                        </h1>

                        <p className="text-xl text-slate-300 mb-8">
                            Open the admin dashboard and approve
                            the following pairing code:
                        </p>

                        <div className="text-8xl font-black tracking-[0.2em] text-amber-400 mb-8">
                            {pairingCode}
                        </div>

                        <div className="text-lg text-slate-400 uppercase tracking-widest">
                            {activeLocation.replace('_', ' ')}
                            {' — '}
                            {deviceId.replace('_', ' ')}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}