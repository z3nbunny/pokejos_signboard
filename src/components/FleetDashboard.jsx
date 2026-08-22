import { useState, useEffect } from 'react';
import { collection, collectionGroup, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const formatTimeAgo = (totalSeconds) => {
    if (totalSeconds < 60) return `${totalSeconds}s ago`;

    const minutes = Math.floor(totalSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

export default function FleetDashboard({ activeLocation }) {
    const [devices, setDevices] = useState([]);
    const [screenshots, setScreenshots] = useState({});
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const ticker = setInterval(() => setCurrentTime(new Date()), 5000);
        return () => clearInterval(ticker);
    }, []);

    useEffect(() => {
        const devicesQuery = query(
            collectionGroup(db, 'devices'),
            orderBy('lastSeen', 'asc')
        );

        const unsubscribe = onSnapshot(devicesQuery, (snapshot) => {
            const fleetData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    locationId: doc.ref.parent.parent.id,
                    lastSeen: data.lastSeen?.toDate() || new Date(),
                    pendingCommand: data.pendingCommand || 'NONE'
                };
            });
            // Filter to show devices matching the currently selected location tab
            setDevices(fleetData.filter(d => d.locationId === activeLocation));
        });

        return () => unsubscribe();
    }, [activeLocation]);

    // 3. New screenshot listener
    useEffect(() => {
        setScreenshots({});

        const screenshotCollection = collection(
            db,
            'locations',
            activeLocation,
            'deviceScreenshots'
        );

        const unsubscribe = onSnapshot(
            screenshotCollection,
            (snapshot) => {
                const screenshotMap = {};

                snapshot.docs.forEach((document) => {
                    screenshotMap[document.id] =
                        document.data().image || null;
                });

                setScreenshots(screenshotMap);
            },
            (error) => {
                console.error(
                    'Screenshot listener failed:',
                    error
                );
            }
        );

        return () => unsubscribe();
    }, [activeLocation]);

    const handleDeviceCommand = async (locationId, deviceId, command) => {
        if (command === 'CLEAR_CACHE') {
            if (!window.confirm(`Are you sure you want to ${command} on ${deviceId}?`)) return;
        }
        try {
            const deviceRef = doc(db, 'locations', locationId, 'devices', deviceId);
            const payload = { pendingCommand: command };

            await setDoc(deviceRef, payload, { merge: true });
        } catch (error) {
            console.error("Failed to send command to device:", error);
            alert("Failed to send command.");
        }
    };

    const devicesWithScreenshots = devices.map(
        (device) => ({
            ...device,
            latestScreenshot: screenshots[device.id] || null
        })
    );

    return (
        <div className="space-y-8 font-sans">
            <div>
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 border-b border-border pb-3">
                    Fleet Telemetry & Controls
                </h2>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="text-[10px] uppercase text-text-secondary tracking-widest border-b border-border">
                                <th className="pb-3 font-bold w-1/3">Device Status</th>
                                <th className="pb-3 font-bold w-1/6">Last Seen</th>
                                <th className="pb-3 font-bold w-1/2 text-right pr-2">Remote Commands</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {devicesWithScreenshots.map(device => {
                                const secondsAgo = Math.floor((currentTime - device.lastSeen) / 1000);
                                const isOffline = secondsAgo > 90;

                                return (
                                    <tr key={`${device.locationId}-${device.id}`} className={`transition-colors ${isOffline ? 'bg-danger/5' : 'hover:bg-surface/50'}`}>

                                        {/* COLUMN 1: Combined Device Info */}
                                        <td className="py-4 align-top">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-sm font-bold text-text-primary uppercase tracking-wider">
                                                        {device.id}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase ${isOffline ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                                                        {isOffline ? 'Offline' : 'Online'}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">
                                                    Pending: <span className={`${device.pendingCommand !== 'NONE' ? 'text-accent font-bold animate-pulse' : ''}`}>{device.pendingCommand}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* COLUMN 2: Last Seen */}
                                        <td className="py-4 align-top">
                                            <span className={`text-[11px] font-bold uppercase tracking-wider ${isOffline ? 'text-danger' : 'text-text-secondary'}`}>
                                                {formatTimeAgo(secondsAgo)}
                                            </span>
                                        </td>

                                        {/* COLUMN 3: Command Grid */}
                                        <td className="py-4 align-top">
                                            <div className="flex flex-wrap gap-2 justify-end">
                                                <button onClick={() => handleDeviceCommand(device.locationId, device.id, 'RELOAD')} className="bg-surface hover:bg-border border border-border text-text-primary px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors shadow-sm">Reload</button>
                                                <button onClick={() => handleDeviceCommand(device.locationId, device.id, 'SCREEN_ON')} className="bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors shadow-sm">Wake</button>
                                                <button onClick={() => handleDeviceCommand(device.locationId, device.id, 'SCREEN_OFF')} className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors shadow-sm">Sleep</button>
                                                <button onClick={() => handleDeviceCommand(device.locationId, device.id, 'GET_SCREENSHOT')} className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors shadow-sm">Screenshot</button>
                                                <button onClick={() => handleDeviceCommand(device.locationId, device.id, 'CLEAR_CACHE')} className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors shadow-sm">Clear Cache</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Screenshots section */}
            <div className="border-t border-border pt-6">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">
                    Live Screenshots ({activeLocation})
                </h3>

                <div className="flex gap-4 flex-wrap">
                    {devicesWithScreenshots.filter(
                        (device) => device.latestScreenshot
                    ).length === 0 ? (
                        <p className="text-sm text-text-secondary italic">No screenshots requested yet. Click "Screenshot" on a device above to capture its display.</p>
                    ) : (
                        devicesWithScreenshots.filter(d => d.latestScreenshot).map(device => (
                            <div key={device.id} className="bg-surface rounded-2xl p-4 border border-border shadow-sm flex flex-col w-full md:w-auto">
                                <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-3 border-b border-border pb-2">
                                    {device.id} Display
                                </h4>
                                <img
                                    src={device.latestScreenshot.startsWith('data:') ? device.latestScreenshot : `data:image/png;base64,${device.latestScreenshot}`}
                                    alt={`${device.id} screenshot`}
                                    className="max-w-full md:max-w-md max-h-[300px] object-contain rounded-lg border border-border bg-bg"
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}