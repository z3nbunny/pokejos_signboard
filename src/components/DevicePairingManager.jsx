import { useEffect, useState } from 'react';
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';

import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function DevicePairingManager() {
    const { currentUser, isAuthorizedAdmin, userData } =
        useAuth();

    const [requests, setRequests] = useState([]);
    const [workingUid, setWorkingUid] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    const isSuperAdmin =
        isAuthorizedAdmin
        && userData?.role === 'super_admin';

    useEffect(() => {
        if (!isSuperAdmin) {
            return;
        }

        const pairingCollection = collection(
            db,
            'devicePairingRequests'
        );

        const unsubscribe = onSnapshot(
            pairingCollection,
            (snapshot) => {
                const loadedRequests = snapshot.docs
                    .map((requestDocument) => ({
                        id: requestDocument.id,
                        ...requestDocument.data()
                    }))
                    .filter((request) =>
                        request.status === 'pending'
                    )
                    .sort((first, second) => {
                        const firstTime =
                            first.createdAt?.toMillis?.() || 0;

                        const secondTime =
                            second.createdAt?.toMillis?.() || 0;

                        return secondTime - firstTime;
                    });

                setRequests(loadedRequests);
                setErrorMessage('');
            },
            (error) => {
                console.error(
                    'Unable to load pairing requests:',
                    error
                );

                setErrorMessage(
                    'Unable to load pending TV requests.'
                );
            }
        );

        return () => unsubscribe();
    }, [isSuperAdmin]);

    const handleApprove = async (request) => {
        const confirmed = window.confirm(
            `Approve TV ${request.pairingCode} as `
            + `${request.locationId} / ${request.deviceId}?`
        );

        if (!confirmed) {
            return;
        }

        setWorkingUid(request.authUid);
        setErrorMessage('');

        try {
            const deviceRef = doc(
                db,
                'locations',
                request.locationId,
                'devices',
                request.deviceId
            );

            const pairingRef = doc(
                db,
                'devicePairingRequests',
                request.authUid
            );

            const existingDevice = await getDoc(deviceRef);

            if (existingDevice.exists()) {
                const existingData = existingDevice.data();

                if (
                    existingData.authUid
                    && existingData.authUid !== request.authUid
                ) {
                    throw new Error(
                        'That device name is already paired '
                        + 'to a different TV.'
                    );
                }
            }

            const batch = writeBatch(db);

            // Merge so existing telemetry is not erased.
            batch.set(
                deviceRef,
                {
                    authUid: request.authUid,
                    locationId: request.locationId,
                    deviceId: request.deviceId,
                    pairedAt: serverTimestamp(),
                    pairedBy: currentUser.uid,
                    pendingCommand: null
                },
                { merge: true }
            );

            batch.update(pairingRef, {
                status: 'approved',
                reviewedAt: serverTimestamp(),
                reviewedBy: currentUser.uid
            });

            await batch.commit();
        } catch (error) {
            console.error('TV approval failed:', error);

            setErrorMessage(
                error.message
                || 'Unable to approve this TV.'
            );
        } finally {
            setWorkingUid(null);
        }
    };

    const handleReject = async (request) => {
        const confirmed = window.confirm(
            `Reject pairing request ${request.pairingCode}?`
        );

        if (!confirmed) {
            return;
        }

        setWorkingUid(request.authUid);
        setErrorMessage('');

        try {
            const pairingRef = doc(
                db,
                'devicePairingRequests',
                request.authUid
            );

            const batch = writeBatch(db);

            batch.update(pairingRef, {
                status: 'rejected',
                reviewedAt: serverTimestamp(),
                reviewedBy: currentUser.uid
            });

            await batch.commit();
        } catch (error) {
            console.error('TV rejection failed:', error);

            setErrorMessage(
                error.message
                || 'Unable to reject this TV.'
            );
        } finally {
            setWorkingUid(null);
        }
    };

    if (!isSuperAdmin) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                    Pending TV Pairing
                </h2>

                <p className="text-sm text-text-secondary mt-2">
                    Compare the code shown here with the code
                    displayed on the physical TV before approving it.
                </p>
            </div>

            {errorMessage && (
                <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm font-semibold">
                    {errorMessage}
                </div>
            )}

            {requests.length === 0 ? (
                <div className="p-8 rounded-2xl border border-border bg-bg text-center">
                    <p className="text-sm text-text-secondary italic">
                        No TVs are currently waiting for approval.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {requests.map((request) => {
                        const isWorking =
                            workingUid === request.authUid;

                        return (
                            <div
                                key={request.id}
                                className="p-6 rounded-3xl border border-border bg-bg shadow-sm"
                            >
                                <div className="text-center mb-6">
                                    <div className="text-xs uppercase tracking-widest text-text-secondary font-bold mb-2">
                                        Pairing Code
                                    </div>

                                    <div className="text-5xl font-black tracking-[0.15em] text-accent">
                                        {request.pairingCode}
                                    </div>
                                </div>

                                <div className="space-y-3 text-sm border-t border-border pt-5">
                                    <div className="flex justify-between gap-4">
                                        <span className="text-text-secondary">
                                            Location
                                        </span>

                                        <span className="font-bold uppercase">
                                            {request.locationId?.replace(
                                                '_',
                                                ' '
                                            )}
                                        </span>
                                    </div>

                                    <div className="flex justify-between gap-4">
                                        <span className="text-text-secondary">
                                            Device
                                        </span>

                                        <span className="font-bold uppercase">
                                            {request.deviceId?.replace(
                                                '_',
                                                ' '
                                            )}
                                        </span>
                                    </div>

                                    <div className="flex justify-between gap-4">
                                        <span className="text-text-secondary">
                                            Requested
                                        </span>

                                        <span className="font-medium">
                                            {request.createdAt?.toDate
                                                ? request.createdAt
                                                    .toDate()
                                                    .toLocaleString()
                                                : 'Just now'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-6">
                                    <button
                                        type="button"
                                        disabled={isWorking}
                                        onClick={() =>
                                            handleReject(request)
                                        }
                                        className="py-3 rounded-full border border-red-300 text-red-600 font-bold uppercase text-xs hover:bg-red-50 disabled:opacity-50"
                                    >
                                        Reject
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isWorking}
                                        onClick={() =>
                                            handleApprove(request)
                                        }
                                        className="py-3 rounded-full bg-accent text-white font-bold uppercase text-xs hover:bg-accent-hover disabled:opacity-50"
                                    >
                                        {isWorking
                                            ? 'Working...'
                                            : 'Approve'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}