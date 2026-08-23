import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, getDoc, setDoc, collection, addDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/useAuth';
import FleetDashboard from './FleetDashboard';
import MenuManager from './MenuManager';
import DevicePairingManager from './DevicePairingManager';

const omitDocumentId = (record) => {
    const cleanRecord = {
        ...record
    };

    delete cleanRecord.id;

    return cleanRecord;
};

const normalizeFramingValue = (
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

const createInfoForm = (card = {}) => {
    const imageFraming = card.imageFraming || {};
    const standard = imageFraming.standard || {};
    const feature = imageFraming.feature || {};

    return {
        title: card.title || '',
        subtitle: card.subtitle || '',
        description: card.description || '',
        imageUrl: card.imageUrl || '',
        imageFraming: {
            standard: {
                zoom: normalizeFramingValue(
                    standard.zoom,
                    1,
                    1,
                    3
                ),
                x: normalizeFramingValue(
                    standard.x,
                    50,
                    0,
                    100
                ),
                y: normalizeFramingValue(
                    standard.y,
                    50,
                    0,
                    100
                )
            },
            feature: {
                zoom: normalizeFramingValue(
                    feature.zoom,
                    1,
                    1,
                    3
                ),
                x: normalizeFramingValue(
                    feature.x,
                    50,
                    0,
                    100
                ),
                y: normalizeFramingValue(
                    feature.y,
                    50,
                    0,
                    100
                )
            }
        }
    };
};

function InfoCardFramingEditor({
    mode,
    label,
    imageUrl,
    framing,
    onChange
}) {
    const safeFraming = {
        zoom: normalizeFramingValue(
            framing?.zoom,
            1,
            1,
            3
        ),
        x: normalizeFramingValue(
            framing?.x,
            50,
            0,
            100
        ),
        y: normalizeFramingValue(
            framing?.y,
            50,
            0,
            100
        )
    };

    const updatePointerPosition = (event) => {
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

        onChange({
            ...safeFraming,
            x: normalizeFramingValue(
                x,
                50,
                0,
                100
            ),
            y: normalizeFramingValue(
                y,
                50,
                0,
                100
            )
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

    const previewAspectRatio =
        mode === 'feature'
            ? '5 / 1'
            : '2.3 / 1';

    return (
        <section className="bg-bg border border-border rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        {label}
                    </h4>

                    <p className="text-[11px] text-text-secondary mt-1">
                        Click or drag over the image to position its focal point.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        onChange({
                            zoom: 1,
                            x: 50,
                            y: 50
                        })
                    }
                    className="shrink-0 px-3 py-1.5 rounded-full border border-border bg-surface text-[10px] font-bold uppercase text-text-secondary hover:bg-border"
                >
                    Reset
                </button>
            </div>

            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={releasePointer}
                onPointerCancel={releasePointer}
                className="relative w-full overflow-hidden rounded-xl bg-black border border-border cursor-crosshair touch-none select-none"
                style={{
                    aspectRatio: previewAspectRatio
                }}
            >
                {imageUrl ? (
                    <>
                        <img
                            src={imageUrl}
                            alt={`${label} preview`}
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
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-white/60">
                        Enter an image URL to begin framing.
                    </div>
                )}
            </div>

            <div className="space-y-3">
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
                        onChange={(event) =>
                            onChange({
                                ...safeFraming,
                                zoom: Number(
                                    event.target.value
                                )
                            })
                        }
                        className="w-full cursor-pointer"
                    />
                </label>

                <label className="block">
                    <span className="flex justify-between text-[11px] font-bold uppercase text-text-secondary mb-1">
                        <span>Horizontal position</span>
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
                        onChange={(event) =>
                            onChange({
                                ...safeFraming,
                                x: Number(
                                    event.target.value
                                )
                            })
                        }
                        className="w-full cursor-pointer"
                    />
                </label>

                <label className="block">
                    <span className="flex justify-between text-[11px] font-bold uppercase text-text-secondary mb-1">
                        <span>Vertical position</span>
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
                        onChange={(event) =>
                            onChange({
                                ...safeFraming,
                                y: Number(
                                    event.target.value
                                )
                            })
                        }
                        className="w-full cursor-pointer"
                    />
                </label>
            </div>
        </section>
    );
}

function InfoCardLibraryPreview({
    mode,
    label,
    imageUrl,
    framing
}) {
    const safeFraming = {
        zoom: normalizeFramingValue(
            framing?.zoom,
            1,
            1,
            3
        ),
        x: normalizeFramingValue(
            framing?.x,
            50,
            0,
            100
        ),
        y: normalizeFramingValue(
            framing?.y,
            50,
            0,
            100
        )
    };

    const previewAspectRatio =
        mode === 'feature'
            ? '5 / 1'
            : '2.3 / 1';

    return (
        <div className="space-y-1.5 min-w-0">
            <div className="flex justify-between gap-2 text-[9px] font-bold uppercase tracking-wider text-text-secondary">
                <span>{label}</span>

                <span>
                    {safeFraming.zoom.toFixed(2)}×
                </span>
            </div>

            <div
                className="relative w-full overflow-hidden rounded-lg bg-black border border-border"
                style={{
                    aspectRatio: previewAspectRatio
                }}
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={`${label} preview`}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{
                            objectPosition:
                                `${safeFraming.x}% ${safeFraming.y}%`,
                            transform:
                                `scale(${safeFraming.zoom})`,
                            transformOrigin:
                                `${safeFraming.x}% ${safeFraming.y}%`
                        }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white/50">
                        No image
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Admin() {
    const { userData } = useAuth();

    // Create a state to track which location the Super Admin is currently looking at.
    const [activeLocation, setActiveLocation] = useState(
        userData?.role === 'location_admin' ? userData.locationId : 'brodie'
    );

    // --- NEW THEME STATE ---
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    // --- CORE LOGIC STATES ---
    const [layoutMode, setLayoutMode] = useState('DEFAULT');
    const [status, setStatus] = useState('Connecting...');
    const [schedules, setSchedules] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [merchItems, setMerchItems] = useState([]);
    const [infoCards, setInfoCards] = useState([]);
    const [globalSettings, setGlobalSettings] = useState({ qrText: "Scan to\nBrowse\nMerch", qrImageUrl: "" });

    const [activeTab, setActiveTab] = useState('calendar');
    const [activeOverride, setActiveOverride] = useState(null);
    const [defaultCampaignIds, setDefaultCampaignIds] = useState({ feature: null, event: null });

    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localISOTime = new Date(today.getTime() - tzOffset).toISOString().slice(0, 10);

    const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [selectedDate, setSelectedDate] = useState(localISOTime);
    const [newSchedCampaignId, setNewSchedCampaignId] = useState('');
    const [newSchedStartTime, setNewSchedStartTime] = useState('11:00');
    const [newSchedEndTime, setNewSchedEndTime] = useState('14:00');
    const [newSchedStartDate, setNewSchedStartDate] = useState(localISOTime);
    const [newSchedEndDate, setNewSchedEndDate] = useState(localISOTime);

    const [merchForm, setMerchForm] = useState({ title: '', subtitle: '', imageUrl: '' });
    const [infoForm, setInfoForm] = useState(
        () => createInfoForm()
    ); const defaultCampaign = { campaignName: '', targetMode: 'FEATURE_BOARD', title: '', subtitle: '', description: '', imageUrl: '', slides: [] };
    const [campaignForm, setCampaignForm] = useState(defaultCampaign);
    const [editingId, setEditingId] = useState({ merch: null, info: null, campaign: null, schedule: null });

    const [devices, setDevices] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Tick the clock every 5 seconds for accurate online/offline calculation
    useEffect(() => {
        const ticker = setInterval(() => setCurrentTime(new Date()), 5000);
        return () => clearInterval(ticker);
    }, []);

    useEffect(() => {
        if (!editingId.schedule) {
            setNewSchedStartDate(selectedDate);
            setNewSchedEndDate(selectedDate);
        }
    }, [selectedDate, editingId.schedule]);

    useEffect(() => {
        // Point directly to the activeLocation's settings document
        const settingsRef = doc(db, 'locations', activeLocation, 'settings', 'display');
        const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setLayoutMode(data.layoutMode || 'DEFAULT');
                setGlobalSettings({ qrText: data.qrText || "Scan to\nBrowse\nMerch", qrImageUrl: data.qrImageUrl || "" });
                setDefaultCampaignIds({ feature: data.defaultFeatureId || null, event: data.defaultEventId || null });
                setStatus(`Synced to ${activeLocation.toUpperCase()}`);
            } else {
                setLayoutMode('DEFAULT');
                setStatus('No config found.');
            }
        });

        // Update all collection paths to use the new multi-tenant structure
        const unsubSchedules = onSnapshot(collection(db, 'locations', activeLocation, 'schedules'), (snap) => {
            const loaded = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            loaded.sort((a, b) => {
                const aTime = typeof a.startTime === 'number' ? a.startTime : new Date(a.startTime).getTime();
                const bTime = typeof b.startTime === 'number' ? b.startTime : new Date(b.startTime).getTime();
                return aTime - bTime;
            });
            setSchedules(loaded);
        });

        const unsubCampaigns = onSnapshot(collection(db, 'locations', activeLocation, 'campaigns'), (snap) => setCampaigns(snap.docs.map(d => ({ ...d.data(), id: d.id, }))));
        const unsubMerch = onSnapshot(collection(db, 'locations', activeLocation, 'merchSlides'), (snap) => setMerchItems(snap.docs.map(d => ({ ...d.data(), id: d.id, }))));
        const unsubInfo = onSnapshot(collection(db, 'locations', activeLocation, 'infoCards'), (snap) => setInfoCards(snap.docs.map(d => ({ ...d.data(), id: d.id, }))));
        const unsubDevices = onSnapshot(collection(db, 'locations', activeLocation, 'devices'), (snap) => setDevices(snap.docs.map(d => ({ ...d.data(), id: d.id, }))));

        return () => { unsubSettings(); unsubSchedules(); unsubCampaigns(); unsubMerch(); unsubInfo(); unsubDevices(); };
    }, [activeLocation]);

    useEffect(() => {
        const checkAutomation = () => {
            const now = Date.now();

            // 1. Get ALL campaigns that are currently active
            const activeSchedules = schedules.filter(s => {
                const start = typeof s.startTime === 'number' ? s.startTime : new Date(s.startTime).getTime();
                const end = typeof s.endTime === 'number' ? s.endTime : new Date(s.endTime).getTime();
                return now >= start && now <= end;
            });

            if (activeSchedules.length > 0) {
                // 2. Sort descending by start time (most recent start time wins)
                activeSchedules.sort((a, b) => {
                    const aStart = typeof a.startTime === 'number' ? a.startTime : new Date(a.startTime).getTime();
                    const bStart = typeof b.startTime === 'number' ? b.startTime : new Date(b.startTime).getTime();
                    return bStart - aStart;
                });
                // 3. Set the winner
                setActiveOverride(activeSchedules[0]);
            } else {
                setActiveOverride(null);
            }
        };
        checkAutomation();
        const interval = setInterval(checkAutomation, 1000);
        return () => clearInterval(interval);
    }, [schedules]);

    // --- SUPER ADMIN TEMPLATE DEPLOYMENT ---
    const handlePushCampaignToStores = async (campaign) => {
        const campaignData =
            omitDocumentId(campaign);

        const target = window.prompt(
            `Deploy "${campaign.campaignName}" to:\nType "all", "brodie", "parmer", or "round_rock"`
        );

        if (!target) return;

        const validLocations = ['brodie', 'parmer', 'round_rock'];
        let destinations;

        if (target.toLowerCase() === 'all') {
            destinations = validLocations;
        } else if (validLocations.includes(target.toLowerCase())) {
            destinations = [target.toLowerCase()];
        } else {
            return alert("Invalid location specified.");
        }

        setStatus(`Deploying template to ${destinations.join(', ')}...`);

        try {
            for (const loc of destinations) {
                await addDoc(collection(db, 'locations', loc, 'campaigns'), {
                    ...campaignData,
                    deployedFromGlobalAt: Date.now()
                });
            }
            setStatus('Template Deployment Successful!');
            setTimeout(() => setStatus(`Live on ${activeLocation.toUpperCase()}`), 2500);
        } catch (err) {
            console.error(err);
            setStatus('Deployment Failed!');
        }
    };

    const handleLayoutChange = async (newMode) => {
        setStatus(`Updating layout for ${activeLocation}...`);
        await setDoc(doc(db, 'locations', activeLocation, 'settings', 'display'), { layoutMode: newMode }, { merge: true });
        setTimeout(() => setStatus(`Live on ${activeLocation.toUpperCase()}`), 1500);
    };

    const handleSaveGlobal = async (e) => {
        e.preventDefault();
        setStatus('Saving Display Settings...');
        await setDoc(
            doc(db, 'locations', activeLocation, 'settings', 'display'),
            { qrText: globalSettings.qrText, qrImageUrl: globalSettings.qrImageUrl },
            { merge: true }
        );
        setTimeout(() => setStatus(`Live on ${activeLocation.toUpperCase()}`), 1500);
    };

    const handleSaveCampaign = async (e) => {
        e.preventDefault();

        // 1. Strip the local 'id' out of the form data
        const cleanData =
            omitDocumentId(campaignForm);

        try {
            if (editingId.campaign) {
                // 2. Pass 'cleanData' into the update function
                await setDoc(doc(db, 'locations', activeLocation, 'campaigns', editingId.campaign), cleanData, { merge: true });
                setEditingId({ ...editingId, campaign: null });
            } else {
                // 3. Pass 'cleanData' into the add function
                await addDoc(collection(db, 'locations', activeLocation, 'campaigns'), cleanData);
            }
            // Reset the form
            setCampaignForm(defaultCampaign);
        } catch (error) {
            console.error("Firebase write error:", error);
            alert("Could not save campaign changes. Check console for details.");
        }
    };

    const handleDuplicateCampaign = async (campaign) => {
        const campaignData =
            omitDocumentId(campaign);
        campaignData.campaignName = `${campaign.campaignName} (Copy)`;
        await addDoc(collection(db, 'locations', activeLocation, 'campaigns'), campaignData);
    };

    const handleSaveSchedule = async (e) => {
        e.preventDefault();
        if (!newSchedCampaignId) return alert("Please select a campaign first.");
        const startTimestamp = new Date(`${newSchedStartDate}T${newSchedStartTime}:00`).getTime();
        const endTimestamp = new Date(`${newSchedEndDate}T${newSchedEndTime}:00`).getTime();
        if (endTimestamp <= startTimestamp) return alert("Error: End time must be after start time.");

        // --- OVERLAP VALIDATION ---
        const hasOverlap = schedules.some(s => {
            // If we are editing, don't compare the schedule against itself
            if (editingId.schedule === s.id) return false;

            const sStart = typeof s.startTime === 'number' ? s.startTime : new Date(s.startTime).getTime();
            const sEnd = typeof s.endTime === 'number' ? s.endTime : new Date(s.endTime).getTime();

            // The Overlap Formula: New Start is before Existing End AND New End is after Existing Start
            return (startTimestamp < sEnd) && (endTimestamp > sStart);
        });

        if (hasOverlap) {
            return alert("Schedule Conflict: This time slot overlaps with an existing campaign. Please choose a different time.");
        }
        // --- END OVERLAP VALIDATION ---

        const payload = { campaignId: newSchedCampaignId, startTime: startTimestamp, endTime: endTimestamp };
        if (editingId.schedule) {
            await setDoc(doc(db, 'locations', activeLocation, 'schedules', editingId.schedule), payload, { merge: true });
            setEditingId({ ...editingId, schedule: null });
        } else {
            await addDoc(collection(db, 'locations', activeLocation, 'schedules'), payload);
        }
        setNewSchedCampaignId('');
    };

    const handleDeleteDoc = async (colName, id) => {
        if (!window.confirm("Are you sure you want to delete this item?")) return;
        await deleteDoc(doc(db, 'locations', activeLocation, colName, id));
    };

    const handleSaveMerch = async (e) => {
        e.preventDefault();
        if (editingId.merch) {
            await setDoc(doc(db, 'locations', activeLocation, 'merchSlides', editingId.merch), merchForm, { merge: true });
            setEditingId({ ...editingId, merch: null });
        } else {
            await addDoc(collection(db, 'locations', activeLocation, 'merchSlides'), merchForm);
        }
        setMerchForm({ title: '', subtitle: '', imageUrl: '' });
    };

    const handleSaveInfo = async (e) => {
        e.preventDefault();

        const cleanInfoForm = createInfoForm(infoForm);

        if (editingId.info) {
            await setDoc(
                doc(
                    db,
                    'locations',
                    activeLocation,
                    'infoCards',
                    editingId.info
                ),
                cleanInfoForm,
                { merge: true }
            );

            setEditingId({
                ...editingId,
                info: null
            });
        } else {
            await addDoc(
                collection(
                    db,
                    'locations',
                    activeLocation,
                    'infoCards'
                ),
                cleanInfoForm
            );
        }

        setInfoForm(createInfoForm());
    };

    const handleInfoFramingChange = (mode, nextFraming) => {
        setInfoForm((currentForm) => ({
            ...currentForm,
            imageFraming: {
                ...currentForm.imageFraming,
                [mode]: nextFraming
            }
        }));
    };

    const handleAddSlide = () => setCampaignForm({ ...campaignForm, slides: [...(campaignForm.slides || []), { title: '', subtitle: '', description: '', imageUrl: '' }] });
    const handleUpdateSlide = (index, field, value) => {
        const newSlides = [...campaignForm.slides];
        newSlides[index][field] = value;
        setCampaignForm({ ...campaignForm, slides: newSlides });
    };
    const handleRemoveSlide = (index) => setCampaignForm({ ...campaignForm, slides: campaignForm.slides.filter((_, i) => i !== index) });

    const handleEditSchedule = (s) => {
        setEditingId({ ...editingId, schedule: s.id });
        setNewSchedCampaignId(s.campaignId);
        setNewSchedStartDate(extractDateStr(s.startTime));
        setNewSchedStartTime(extractTimeStr(s.startTime));
        setNewSchedEndDate(extractDateStr(s.endTime));
        setNewSchedEndTime(extractTimeStr(s.endTime));
    };

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    const formatDateTime = (timeData) => {
        const date = new Date(typeof timeData === 'number' ? timeData : timeData);
        return `${date.toLocaleDateString('en-US')} ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    };
    const extractDateStr = (timestamp) => {
        const d = new Date(typeof timestamp === 'number' ? timestamp : timestamp);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const extractTimeStr = (timestamp) => {
        const d = new Date(typeof timestamp === 'number' ? timestamp : timestamp);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const handleSetDefault = async (campaignId, mode) => {
        const field = mode === 'FEATURE_BOARD' ? 'defaultFeatureId' : 'defaultEventId';
        await setDoc(doc(db, 'locations', activeLocation, 'settings', 'display'), { [field]: campaignId }, { merge: true });
    };

    const copySingleAsset = async (
        sourceLoc,
        targetLoc,
        targetDev,
        contentType,
        docId
    ) => {
        try {
            if (sourceLoc === targetLoc) {
                alert(
                    'Please select a different destination location.'
                );
                return;
            }

            const sourceRef = doc(
                db,
                'locations',
                sourceLoc,
                contentType,
                docId
            );

            const sourceSnap = await getDoc(sourceRef);

            if (!sourceSnap.exists()) {
                console.error('Asset not found!');
                alert('The source asset could not be found.');
                return;
            }

            /*
             * addDoc creates a new Firestore document ID, ensuring
             * deployment adds the asset instead of overwriting an
             * existing asset with the source document ID.
             */
            await addDoc(
                collection(
                    db,
                    'locations',
                    targetLoc,
                    contentType
                ),
                sourceSnap.data()
            );

            alert(
                `Added successfully to ${targetLoc
                    .replace('_', ' ')
                    .toUpperCase()}!`
            );
        } catch (error) {
            console.error('Deploy error:', error);
            alert('Deployment failed. Check console.');
        }
    };

    // --- CALCULATE HARDWARE TELEMETRY FOR HEADER ---
    const totalScreens = devices.length;
    const onlineScreens = devices.filter(device => {
        // Safely handle Firebase timestamps vs standard Dates
        const lastSeenTime = device.lastSeen?.toDate ? device.lastSeen.toDate() : (device.lastSeen || new Date(0));
        const secondsAgo = Math.floor((currentTime - lastSeenTime) / 1000);
        return secondsAgo <= 90;
    }).length;

    let screenDotColor = "bg-slate-400";
    if (totalScreens > 0) {
        if (onlineScreens === totalScreens) screenDotColor = "bg-green-500";
        else if (onlineScreens === 0) screenDotColor = "bg-red-500";
        else screenDotColor = "bg-amber-500";
    }

    return (
        <div className="min-h-screen bg-bg text-text-primary p-4 md:p-8 font-sans selection:bg-accent selection:text-white transition-colors duration-300">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* --- HEADER --- */}
                <header className="border-b border-border pb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary">Admin Dashboard</h1>
                        {/* NEW DUAL-STATUS HEADER */}
                        <div className="flex items-center text-[15px] mt-2 font-medium tracking-wide">
                            {/* Part 1: Core Database Status */}
                            <div className="flex items-center gap-2 text-text-secondary">
                                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${status.includes('Synced') ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-accent'}`}></div>
                                <span>Cloud: {status}</span>
                            </div>

                            {/* The Pipe Separator */}
                            <span className="mx-3 text-border">|</span>

                            {/* Part 2: Physical Hardware Status */}
                            <div className="flex items-center gap-2 text-text-secondary">
                                <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${screenDotColor} ${onlineScreens === 0 && totalScreens > 0 ? 'animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]' : ''
                                    }`}></div>
                                <span className={onlineScreens === 0 && totalScreens > 0 ? "text-danger font-bold" : ""}>
                                    {onlineScreens}/{totalScreens} Screens Online
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        {userData?.role === 'super_admin' ? (
                            <select
                                value={activeLocation}
                                onChange={(e) => setActiveLocation(e.target.value)}
                                className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-bold text-text-primary focus:ring-2 focus:ring-accent outline-none shadow-sm cursor-pointer"
                            >
                                <option value="brodie">Brodie Oaks (Home Store)</option>
                                <option value="parmer">Parmer</option>
                                <option value="round_rock">Round Rock</option>
                            </select>
                        ) : (
                            <div className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-bold text-text-primary shadow-sm uppercase tracking-wider">
                                {userData?.locationId?.replace('_', ' ')} Location
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => window.location.hash = ''} className="px-5 py-2.5 bg-surface hover:bg-border text-text-primary rounded-full text-xs font-semibold tracking-wide border border-border transition-colors shadow-sm">
                                View Live Display
                            </button>
                            <button onClick={() => setIsDarkMode(!isDarkMode)} className="px-5 py-2.5 bg-surface hover:bg-border text-text-primary rounded-full text-xs font-semibold tracking-wide border border-border transition-colors shadow-sm">
                                {isDarkMode ? '☀️ Light' : '🌙 Dark'}
                            </button>
                        </div>
                    </div>
                </header>

                {/* --- OVERRIDE SETTINGS --- */}
                <section className={`p-6 rounded-3xl border shadow-sm transition-colors ${activeOverride ? 'bg-accent-light border-accent' : 'bg-surface border-border'} space-y-6`}>
                    <div className="flex justify-between items-center">
                        <h2 className={`text-sm font-bold uppercase tracking-wider ${activeOverride ? 'text-accent animate-pulse' : 'text-text-secondary'}`}>
                            {activeOverride ? 'Automated Campaign Currently Running' : 'Manual Base Layout'}
                        </h2>
                        {activeOverride && (
                            <button onClick={() => handleDeleteDoc('schedules', activeOverride.id)} className="bg-danger hover:opacity-90 text-white text-xs font-bold uppercase tracking-widest px-5 py-2 rounded-full transition-colors shadow-sm">
                                Kill Active Automation
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button disabled={!!activeOverride} onClick={() => handleLayoutChange('DEFAULT')} className={`p-5 rounded-2xl border-2 flex flex-col text-left transition-all ${layoutMode === 'DEFAULT' && !activeOverride ? 'border-accent bg-accent-light text-text-primary font-bold shadow-sm' : 'border-border bg-bg text-text-secondary disabled:opacity-50 hover:border-text-secondary'}`}>
                            <span className="text-base font-semibold">Standard Grid</span>
                        </button>
                        <button disabled={!!activeOverride} onClick={() => handleLayoutChange('FEATURE_BOARD')} className={`p-5 rounded-2xl border-2 flex flex-col text-left transition-all ${layoutMode === 'FEATURE_BOARD' && !activeOverride ? 'border-accent bg-accent-light text-text-primary font-bold shadow-sm' : 'border-border bg-bg text-text-secondary disabled:opacity-50 hover:border-text-secondary'}`}>
                            <span className="text-base font-semibold">Feature Focus</span>
                        </button>
                        <button disabled={!!activeOverride} onClick={() => handleLayoutChange('EVENT_MODE')} className={`p-5 rounded-2xl border-2 flex flex-col text-left transition-all ${layoutMode === 'EVENT_MODE' && !activeOverride ? 'border-accent bg-accent-light text-text-primary font-bold shadow-sm' : 'border-border bg-bg text-text-secondary disabled:opacity-50 hover:border-text-secondary'}`}>
                            <span className="text-base font-semibold">Event Takeover</span>
                        </button>
                    </div>
                </section>

                {/* --- MAIN DASHBOARD TABS & CONTENT --- */}
                <main className="bg-surface rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[60vh]">
                    <nav className="w-full md:w-64 bg-bg p-4 flex flex-row md:flex-col gap-2 border-b md:border-b-0 md:border-r border-border overflow-x-auto shrink-0">
                        {[
                            { id: 'calendar', label: 'Content Calendar' },
                            { id: 'campaigns', label: 'Campaign Library' },
                            { id: 'merch', label: 'Merch Slides' },
                            { id: 'info', label: 'Bottom Info Cards' },
                            { id: 'global', label: 'Global Settings' },
                            ...(userData?.role === 'super_admin'
                                ? [
                                    {
                                        id: 'menus',
                                        label: 'Restaurant Menus'
                                    },
                                    {
                                        id: 'pairing',
                                        label: 'Pair New TV'
                                    },
                                    {
                                        id: 'telemetry',
                                        label: 'TV Connections (Telemetry)'
                                    }
                                ]
                                : [])].map((tab) => (
                                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full text-left px-5 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:bg-border/50 hover:text-text-primary'}`}>
                                        {tab.label}
                                    </button>
                                ))}
                    </nav>

                    <div className="flex-1 p-6 md:p-8 overflow-y-auto">

                        {/* TAB: CONTENT CALENDAR */}
                        {activeTab === 'calendar' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left Side: The Calendar */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-bg p-4 rounded-2xl border border-border">
                                        <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="text-text-secondary hover:text-text-primary font-bold px-2">&larr; Prev</button>
                                        <h3 className="text-base font-bold uppercase tracking-wider">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                                        <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="text-text-secondary hover:text-text-primary font-bold px-2">Next &rarr;</button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-2 text-center">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                            <div key={day} className="text-xs font-semibold text-text-secondary uppercase py-2">{day}</div>
                                        ))}
                                        {blanks.map(b => <div key={`blank-${b}`} className="p-4" />)}
                                        {monthDays.map(day => {
                                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                            const isSelected = selectedDate === dateStr;
                                            const daySchedules = schedules.filter(s => {
                                                const dayStart = new Date(`${dateStr}T00:00:00`).getTime();
                                                const dayEnd = new Date(`${dateStr}T23:59:59`).getTime();
                                                return s.startTime <= dayEnd && s.endTime >= dayStart;
                                            });
                                            return (
                                                <button key={day} onClick={() => setSelectedDate(dateStr)} className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all border ${isSelected ? 'bg-accent border-accent text-white shadow-sm' : 'bg-bg border-border text-text-secondary hover:border-text-secondary'}`}>
                                                    <span className="text-sm font-semibold">{day}</span>
                                                    {daySchedules.length > 0 && (
                                                        <div className="flex gap-1 mt-1">
                                                            {daySchedules.map((_, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-accent'}`}></span>)}
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right Side: Daily Inspector & Scheduler */}
                                <div className="bg-bg p-6 rounded-3xl border border-border flex flex-col h-full">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-4 border-b border-border pb-3">
                                        Schedule for {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </h3>
                                    <div className="flex-1 space-y-3 mb-6 overflow-y-auto max-h-[350px] p-1 pr-2">
                                        {schedules.filter(s => {
                                            const dayStart = new Date(`${selectedDate}T00:00:00`).getTime();
                                            const dayEnd = new Date(`${selectedDate}T23:59:59`).getTime();
                                            return s.startTime <= dayEnd && s.endTime >= dayStart;
                                        }).length === 0 ? (
                                            <p className="text-sm text-text-secondary italic">No campaigns scheduled for this date.</p>
                                        ) : (
                                            schedules.filter(s => {
                                                const dayStart = new Date(`${selectedDate}T00:00:00`).getTime();
                                                const dayEnd = new Date(`${selectedDate}T23:59:59`).getTime();
                                                return s.startTime <= dayEnd && s.endTime >= dayStart;
                                            }).map(s => {
                                                const linkedCampaign = campaigns.find(c => c.id === s.campaignId);
                                                return (
                                                    <div key={s.id} className={`bg-surface p-4 rounded-2xl border flex flex-col gap-3 shadow-sm ${activeOverride?.id === s.id ? 'border-accent ring-2 ring-accent ring-opacity-20' : 'border-border'}`}>
                                                        <div>
                                                            <div className="text-[11px] text-text-secondary font-semibold mb-1 tracking-wider uppercase">
                                                                {formatDateTime(s.startTime)} &mdash; {formatDateTime(s.endTime)}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {linkedCampaign && (
                                                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-border text-text-secondary bg-bg">
                                                                        {linkedCampaign.targetMode === 'EVENT_MODE' ? 'Event' : 'Feature'}
                                                                    </span>
                                                                )}
                                                                <div className="text-sm font-bold text-text-primary">{linkedCampaign ? linkedCampaign.campaignName : 'Unknown Campaign'}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end gap-3 mt-1 border-t border-border pt-3">
                                                            <button onClick={() => handleEditSchedule(s)} className="text-accent hover:text-accent-hover font-bold text-xs uppercase tracking-wider">Edit</button>
                                                            <button onClick={() => handleDeleteDoc('schedules', s.id)} className="text-danger hover:opacity-80 font-bold text-xs uppercase tracking-wider">Delete</button>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>

                                    {/* Add/Edit to Calendar Form */}
                                    <form onSubmit={handleSaveSchedule} className={`bg-surface p-5 rounded-2xl border space-y-4 mt-auto transition-colors shadow-sm ${editingId.schedule ? 'border-accent ring-2 ring-accent ring-opacity-20' : 'border-border'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs uppercase text-text-primary tracking-wider font-bold block">
                                                {editingId.schedule ? 'Edit Scheduled Campaign' : 'Queue New Campaign'}
                                            </label>
                                            {editingId.schedule && (
                                                <button type="button" onClick={() => { setEditingId({ ...editingId, schedule: null }); setNewSchedCampaignId(''); setNewSchedStartDate(selectedDate); setNewSchedEndDate(selectedDate); setNewSchedStartTime('11:00'); setNewSchedEndTime('14:00'); }} className="text-[10px] bg-bg text-text-secondary border border-border px-3 py-1 rounded-full font-bold uppercase tracking-wider hover:bg-border">
                                                    Cancel Edit
                                                </button>
                                            )}
                                        </div>
                                        <select value={newSchedCampaignId} onChange={(e) => setNewSchedCampaignId(e.target.value)} className="w-full bg-bg border border-border rounded-xl p-3 text-sm text-text-primary focus:ring-2 focus:ring-accent focus:outline-none">
                                            <option value="" disabled>-- Select a Template from Library --</option>
                                            {campaigns.map(c => <option key={c.id} value={c.id}>{c.campaignName} ({c.targetMode.replace('_', ' ')})</option>)}
                                        </select>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[11px] text-text-secondary uppercase block mb-1 font-medium">Start Date</label>
                                                <input type="date" value={newSchedStartDate} onChange={(e) => setNewSchedStartDate(e.target.value)} className="w-full bg-bg border border-border rounded-xl p-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent focus:outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-text-secondary uppercase block mb-1 font-medium">Start Time</label>
                                                <input type="time" value={newSchedStartTime} onChange={(e) => setNewSchedStartTime(e.target.value)} className="w-full bg-bg border border-border rounded-xl p-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent focus:outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-text-secondary uppercase block mb-1 font-medium">End Date</label>
                                                <input type="date" value={newSchedEndDate} onChange={(e) => setNewSchedEndDate(e.target.value)} className="w-full bg-bg border border-border rounded-xl p-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent focus:outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-[11px] text-text-secondary uppercase block mb-1 font-medium">End Time</label>
                                                <input type="time" value={newSchedEndTime} onChange={(e) => setNewSchedEndTime(e.target.value)} className="w-full bg-bg border border-border rounded-xl p-2.5 text-sm text-text-primary focus:ring-2 focus:ring-accent focus:outline-none" />
                                            </div>
                                        </div>
                                        <button type="submit" className="w-full text-white bg-accent hover:bg-accent-hover font-bold uppercase text-sm py-3 rounded-full tracking-wider mt-2 transition-colors shadow-sm">
                                            {editingId.schedule ? 'Update Schedule' : 'Add to Calendar'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* TAB: CAMPAIGN LIBRARY */}
                        {activeTab === 'campaigns' && (
                            <div className="space-y-8">
                                <form onSubmit={handleSaveCampaign} className="bg-bg p-6 rounded-3xl border border-border shadow-sm space-y-6">
                                    <div className="flex justify-between items-center border-b border-border pb-4">
                                        <h3 className="text-lg font-bold uppercase tracking-wider text-text-primary">
                                            {editingId.campaign ? 'Edit Campaign Template' : 'Create New Campaign'}
                                        </h3>
                                        {editingId.campaign && (
                                            <button type="button" onClick={() => { setEditingId({ ...editingId, campaign: null }); setCampaignForm(defaultCampaign); }} className="text-xs bg-surface border border-border px-4 py-2 rounded-full text-text-secondary font-bold hover:bg-border">Cancel Edit</button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs uppercase text-text-secondary block mb-2 font-medium">Campaign Name (Internal)</label>
                                            <input type="text" value={campaignForm.campaignName} onChange={(e) => setCampaignForm({ ...campaignForm, campaignName: e.target.value })} placeholder="e.g. Songwriters Night" className="w-full bg-surface border border-border text-sm rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase text-text-secondary block mb-2 font-medium">Display Format</label>
                                            <select value={campaignForm.targetMode} onChange={(e) => setCampaignForm({ ...campaignForm, targetMode: e.target.value })} className="w-full bg-surface border border-border text-sm rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none">
                                                <option value="FEATURE_BOARD">Feature Board (Split Screen, Single Asset)</option>
                                                <option value="EVENT_MODE">Event Takeover (Full Screen Slideshow)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-surface p-5 rounded-2xl border border-border">
                                        {campaignForm.targetMode === 'FEATURE_BOARD' ? (
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-bold uppercase text-text-secondary border-b border-border pb-2">Single Asset Details</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div><label className="text-[11px] uppercase text-text-secondary block mb-1">Subtitle</label><input type="text" value={campaignForm.subtitle} onChange={(e) => setCampaignForm({ ...campaignForm, subtitle: e.target.value })} className="w-full bg-bg border border-border text-sm rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-accent" /></div>
                                                    <div><label className="text-[11px] uppercase text-text-secondary block mb-1">Title</label><input type="text" value={campaignForm.title} onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })} className="w-full bg-bg border border-border text-sm rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-accent" /></div>
                                                    <div><label className="text-[11px] uppercase text-text-secondary block mb-1">Image URL</label><input type="url" value={campaignForm.imageUrl} onChange={(e) => setCampaignForm({ ...campaignForm, imageUrl: e.target.value })} className="w-full bg-bg border border-border text-sm rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-accent" /></div>
                                                </div>
                                                <div><label className="text-[11px] uppercase text-text-secondary block mb-1">Description</label><textarea value={campaignForm.description} onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })} rows="2" className="w-full bg-bg border border-border text-sm rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-accent resize-none"></textarea></div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center border-b border-border pb-3">
                                                    <h4 className="text-xs font-bold uppercase text-text-primary">Slideshow Playlist</h4>
                                                    <button type="button" onClick={handleAddSlide} className="text-[11px] bg-accent hover:bg-accent-hover px-4 py-1.5 rounded-full font-bold uppercase tracking-wider text-white shadow-sm">+ Add Slide</button>
                                                </div>
                                                {(!campaignForm.slides || campaignForm.slides.length === 0) ? (
                                                    <p className="text-sm text-text-secondary text-center py-6">No slides added yet. Click "+ Add Slide" to begin building.</p>
                                                ) : (
                                                    campaignForm.slides.map((slide, index) => (
                                                        <div key={index} className="bg-bg p-5 rounded-2xl border border-border relative space-y-4">
                                                            <button type="button" onClick={() => handleRemoveSlide(index)} className="absolute top-4 right-4 text-danger font-bold hover:opacity-80 text-xs">Remove</button>
                                                            <span className="text-[11px] font-bold text-text-secondary block uppercase tracking-widest">SLIDE {index + 1}</span>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                <input type="text" placeholder="Subtitle" value={slide.subtitle} onChange={(e) => handleUpdateSlide(index, 'subtitle', e.target.value)} className="w-full bg-surface border border-border text-sm rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-accent" />
                                                                <input type="text" placeholder="Title" value={slide.title} onChange={(e) => handleUpdateSlide(index, 'title', e.target.value)} className="w-full bg-surface border border-border text-sm rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-accent" />
                                                                <input type="url" placeholder="Image URL" value={slide.imageUrl} onChange={(e) => handleUpdateSlide(index, 'imageUrl', e.target.value)} className="w-full bg-surface border border-border text-sm rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-accent" />
                                                            </div>
                                                            <input type="text" placeholder="Description (Optional)" value={slide.description} onChange={(e) => handleUpdateSlide(index, 'description', e.target.value)} className="w-full bg-surface border border-border text-sm rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-accent" />
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <button type="submit" className="w-full text-white bg-accent hover:bg-accent-hover font-bold uppercase text-sm py-3.5 rounded-full tracking-wider transition-colors shadow-sm">
                                        {editingId.campaign ? 'Save Template Changes' : 'Save to Library'}
                                    </button>
                                </form>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                    {campaigns.map(camp => (
                                        <div key={camp.id} className="bg-bg rounded-3xl border border-border p-6 flex flex-col justify-between space-y-5 shadow-sm">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full border border-border text-text-secondary bg-surface">
                                                    {camp.targetMode.replace('_', ' ')}
                                                </span>
                                                <h3 className="text-xl font-bold text-text-primary mt-3">{camp.campaignName}</h3>
                                            </div>
                                            <button onClick={() => handleSetDefault(camp.id, camp.targetMode)} className={`w-full py-2.5 text-xs uppercase tracking-wider font-bold transition-colors rounded-full border ${defaultCampaignIds.feature === camp.id || defaultCampaignIds.event === camp.id ? 'bg-accent-light text-accent border-accent' : 'bg-surface text-text-secondary border-border hover:text-text-primary hover:border-text-secondary'}`}>
                                                {defaultCampaignIds.feature === camp.id || defaultCampaignIds.event === camp.id ? '★ Active Fallback' : 'Set as Fallback'}
                                            </button>

                                            {/* --- DEPLOY & ACTION BUTTONS --- */}
                                            <div className="flex flex-col gap-3">
                                                {userData?.role === 'super_admin' && (
                                                    <button
                                                        onClick={() => handlePushCampaignToStores(camp)}
                                                        className="w-full bg-accent hover:bg-accent-hover text-white py-2.5 text-xs uppercase tracking-wider font-bold transition-colors rounded-full shadow-sm flex items-center justify-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                                        Deploy to Store
                                                    </button>
                                                )}
                                                <div className="flex gap-3">
                                                    <button onClick={() => handleDuplicateCampaign(camp)} className="flex-1 bg-surface hover:bg-border text-text-primary py-2.5 text-xs uppercase tracking-wider font-bold transition-colors rounded-full border border-border">Duplicate</button>
                                                    <button onClick={() => { setCampaignForm(camp); setEditingId({ ...editingId, campaign: camp.id }); }} className="flex-1 bg-surface hover:bg-border text-text-primary py-2.5 text-xs uppercase tracking-wider font-bold transition-colors rounded-full border border-border">Edit</button>
                                                    <button onClick={() => handleDeleteDoc('campaigns', camp.id)} className="bg-surface hover:bg-danger hover:text-white text-danger px-5 py-2.5 text-xs uppercase tracking-wider font-bold transition-colors rounded-full border border-border">X</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB: MERCH */}
                        {activeTab === 'merch' && (
                            <div className="space-y-6">
                                <form onSubmit={handleSaveMerch} className={`bg-surface p-6 rounded-3xl border space-y-5 transition-colors shadow-sm ${editingId.merch ? 'border-accent ring-2 ring-accent ring-opacity-20' : 'border-border'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className={`text-sm font-bold uppercase tracking-wider ${editingId.merch ? 'text-accent' : 'text-text-primary'}`}>
                                            {editingId.merch ? 'Editing Merch Slide' : 'Add New Merch Slide'}
                                        </h3>
                                        {editingId.merch && (
                                            <button type="button" onClick={() => { setEditingId({ ...editingId, merch: null }); setMerchForm({ title: '', subtitle: '', imageUrl: '' }); }} className="text-[10px] bg-bg text-text-secondary border border-border px-3 py-1 rounded-full font-bold uppercase tracking-wider hover:bg-border">
                                                Cancel Edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
                                        <div><label className="text-[11px] uppercase text-text-secondary font-medium block mb-2">Tee Label</label><input type="text" value={merchForm.subtitle} onChange={(e) => setMerchForm({ ...merchForm, subtitle: e.target.value })} className="w-full bg-bg border border-border text-sm rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none" /></div>
                                        <div><label className="text-[11px] uppercase text-text-secondary font-medium block mb-2">Tee Name</label><input type="text" value={merchForm.title} onChange={(e) => setMerchForm({ ...merchForm, title: e.target.value })} className="w-full bg-bg border border-border text-sm rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none" /></div>
                                        <div className="flex gap-3">
                                            <div className="flex-1"><label className="text-[11px] uppercase text-text-secondary font-medium block mb-2">Image URL</label><input type="url" value={merchForm.imageUrl} onChange={(e) => setMerchForm({ ...merchForm, imageUrl: e.target.value })} className="w-full bg-bg border border-border text-sm rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none" /></div>
                                            <button type="submit" className="text-white bg-accent hover:bg-accent-hover text-xs font-bold uppercase px-6 h-[46px] rounded-full tracking-wider transition-colors mt-auto shadow-sm">{editingId.merch ? 'Save' : 'Add'}</button>
                                        </div>
                                    </div>
                                </form>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {merchItems.map(item => (
                                        <div key={item.id} className="bg-surface rounded-3xl border border-border overflow-hidden flex flex-col justify-between shadow-sm">
                                            <div className="p-5 flex gap-4 items-center">
                                                <img src={item.imageUrl || item.image} alt="" className="w-16 h-16 rounded-xl object-contain bg-white p-1 shrink-0 border border-border" />
                                                <div className="truncate">
                                                    <h4 className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1">{item.subtitle}</h4>
                                                    <h3 className="text-sm font-bold truncate text-text-primary">{item.title}</h3>
                                                </div>
                                            </div>
                                            {/* Only show cross-store deploy options to Super Admins */}
                                            {userData?.role === 'super_admin' && (
                                                <div className="px-5 pb-4 flex gap-2">
                                                    <select id={`target-location-${item.id}`} className="flex-1 bg-bg border border-border text-[10px] uppercase font-bold text-text-secondary rounded-lg p-2">
                                                        <option value="parmer">Parmer</option>
                                                        <option value="brodie">Brodie</option>
                                                        <option value="round_rock">Round Rock</option>
                                                    </select>

                                                    <select id={`target-device-${item.id}`} className="flex-1 bg-bg border border-border text-[10px] uppercase font-bold text-text-secondary rounded-lg p-2">
                                                        <option value="lobby">Lobby</option>
                                                        <option value="drivethru">Drive Thru</option>
                                                    </select>

                                                    <button onClick={() => {
                                                        const targetLoc = document.getElementById(`target-location-${item.id}`).value;
                                                        const targetDev = document.getElementById(`target-device-${item.id}`).value;
                                                        copySingleAsset(activeLocation, targetLoc, targetDev, 'merchSlides', item.id);
                                                    }} className="bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors shadow-sm">
                                                        Deploy
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex border-t border-border">
                                                <button onClick={() => { setMerchForm(item); setEditingId({ ...editingId, merch: item.id }); }} className="flex-1 bg-bg hover:bg-border text-text-secondary hover:text-text-primary py-3 text-xs uppercase tracking-wider font-bold transition-colors border-r border-border">Edit</button>
                                                <button onClick={() => handleDeleteDoc('merchSlides', item.id)} className="flex-1 bg-bg hover:bg-danger hover:text-white text-text-secondary py-3 text-xs uppercase tracking-wider font-bold transition-colors">Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB: INFO CARDS */}
                        {activeTab === 'info' && (
                            <div className="space-y-6">
                                <form onSubmit={handleSaveInfo} className={`bg-surface p-6 rounded-3xl border space-y-5 transition-colors shadow-sm ${editingId.info ? 'border-accent ring-2 ring-accent ring-opacity-20' : 'border-border'}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className={`text-sm font-bold uppercase tracking-wider ${editingId.info ? 'text-accent' : 'text-text-primary'}`}>
                                            {editingId.info ? 'Editing Info Card' : 'Create New Info Card'}
                                        </h3>
                                        {editingId.info && (
                                            <button type="button" onClick={() => { setEditingId({ ...editingId, info: null }); setInfoForm(createInfoForm()); }} className="text-[10px] bg-bg text-text-secondary border border-border px-3 py-1 rounded-full font-bold uppercase tracking-wider hover:bg-border">
                                                Cancel Edit
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div><label className="text-[11px] uppercase text-text-secondary font-medium block mb-2">Sub-Header</label><input type="text" value={infoForm.subtitle} onChange={(e) => setInfoForm({ ...infoForm, subtitle: e.target.value })} className="w-full bg-bg border border-border text-sm rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none" /></div>
                                        <div><label className="text-[11px] uppercase text-text-secondary font-medium block mb-2">Title</label><input type="text" value={infoForm.title} onChange={(e) => setInfoForm({ ...infoForm, title: e.target.value })} className="w-full bg-bg border border-border text-sm rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none" /></div>
                                        <div><label className="text-[11px] uppercase text-text-secondary font-medium block mb-2">Image URL</label><input type="url" value={infoForm.imageUrl} onChange={(e) => setInfoForm({ ...infoForm, imageUrl: e.target.value })} className="w-full bg-bg border border-border text-sm rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none" /></div>
                                    </div>
                                    <div><label className="text-[11px] uppercase text-text-secondary font-medium block mb-2">Description</label><textarea value={infoForm.description} onChange={(e) => setInfoForm({ ...infoForm, description: e.target.value })} rows="2" className="w-full bg-bg border border-border text-sm rounded-xl p-3 focus:ring-2 focus:ring-accent focus:outline-none resize-none"></textarea></div>
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                        <InfoCardFramingEditor
                                            mode="standard"
                                            label="Standard Grid Preview"
                                            imageUrl={infoForm.imageUrl}
                                            framing={
                                                infoForm.imageFraming.standard
                                            }
                                            onChange={(nextFraming) =>
                                                handleInfoFramingChange(
                                                    'standard',
                                                    nextFraming
                                                )
                                            }
                                        />

                                        <InfoCardFramingEditor
                                            mode="feature"
                                            label="Feature Mode Preview"
                                            imageUrl={infoForm.imageUrl}
                                            framing={
                                                infoForm.imageFraming.feature
                                            }
                                            onChange={(nextFraming) =>
                                                handleInfoFramingChange(
                                                    'feature',
                                                    nextFraming
                                                )
                                            }
                                        />
                                    </div>
                                    <button type="submit" className="w-full md:w-auto text-white bg-accent hover:bg-accent-hover font-bold uppercase text-sm px-8 py-3 rounded-full tracking-wider shadow-sm transition-colors">{editingId.info ? 'Save Changes' : 'Add'}</button>
                                </form>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                    {infoCards.map(card => (
                                        <div key={card.id} className="bg-surface rounded-3xl border border-border overflow-hidden flex flex-col justify-between shadow-sm">
                                            <div className="p-5 space-y-4">
                                                <div className="min-w-0">
                                                    <span className="text-[10px] font-bold uppercase text-text-secondary tracking-wider block mb-1">
                                                        {card.subtitle}
                                                    </span>

                                                    <h3 className="text-base font-bold text-text-primary truncate">
                                                        {card.title}
                                                    </h3>

                                                    <p className="text-xs text-text-secondary mt-2 line-clamp-2 leading-relaxed">
                                                        {card.description}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <InfoCardLibraryPreview
                                                        mode="standard"
                                                        label="Standard"
                                                        imageUrl={card.imageUrl}
                                                        framing={
                                                            card.imageFraming?.standard
                                                        }
                                                    />

                                                    <InfoCardLibraryPreview
                                                        mode="feature"
                                                        label="Feature"
                                                        imageUrl={card.imageUrl}
                                                        framing={
                                                            card.imageFraming?.feature
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            {/* Only show cross-store deploy options to Super Admins */}
                                            {userData?.role === 'super_admin' && (
                                                <div className="px-5 pb-4 flex gap-2">
                                                    <select id={`target-location-${card.id}`} className="flex-1 bg-bg border border-border text-[10px] uppercase font-bold text-text-secondary rounded-lg p-2">
                                                        <option value="parmer">Parmer</option>
                                                        <option value="brodie">Brodie</option>
                                                        <option value="round_rock">Round Rock</option>
                                                    </select>

                                                    <select id={`target-device-${card.id}`} className="flex-1 bg-bg border border-border text-[10px] uppercase font-bold text-text-secondary rounded-lg p-2">
                                                        <option value="lobby">Lobby</option>
                                                        <option value="drivethru">Drive Thru</option>
                                                    </select>

                                                    <button onClick={() => {
                                                        const targetLoc = document.getElementById(`target-location-${card.id}`).value;
                                                        const targetDev = document.getElementById(`target-device-${card.id}`).value;
                                                        copySingleAsset(activeLocation, targetLoc, targetDev, 'infoCards', card.id);
                                                    }} className="bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors shadow-sm">
                                                        Deploy
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex border-t border-border">
                                                <button onClick={() => { setInfoForm(createInfoForm(card)); setEditingId({ ...editingId, info: card.id }); }} className="flex-1 bg-bg hover:bg-border text-text-secondary hover:text-text-primary py-3 text-xs uppercase tracking-wider font-bold transition-colors border-r border-border">Edit</button>
                                                <button onClick={() => handleDeleteDoc('infoCards', card.id)} className="flex-1 bg-bg hover:bg-danger hover:text-white text-text-secondary py-3 text-xs uppercase tracking-wider font-bold transition-colors">Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB: GLOBAL SETTINGS */}
                        {activeTab === 'global' && (
                            <form onSubmit={handleSaveGlobal} className="bg-bg p-8 rounded-3xl border border-border space-y-6 max-w-2xl shadow-sm">
                                <div>
                                    <label className="text-xs uppercase text-text-secondary font-bold block mb-2 tracking-wider">QR Code CTA Text (Use Enter to create line breaks)</label>
                                    <textarea value={globalSettings.qrText} onChange={(e) => setGlobalSettings({ ...globalSettings, qrText: e.target.value })} rows="4" className="w-full bg-surface border border-border text-sm text-text-primary rounded-xl p-4 focus:ring-2 focus:ring-accent focus:outline-none resize-none leading-relaxed" placeholder="Scan to&#10;Browse&#10;Merch"></textarea>
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-text-secondary font-bold block mb-2 tracking-wider">QR Code Image URL</label>
                                    <input type="url" value={globalSettings.qrImageUrl} onChange={(e) => setGlobalSettings({ ...globalSettings, qrImageUrl: e.target.value })} className="w-full bg-surface border border-border text-sm text-text-primary rounded-xl p-4 focus:ring-2 focus:ring-accent focus:outline-none" />
                                </div>
                                <button type="submit" className="w-full py-3.5 bg-accent hover:bg-accent-hover text-white font-bold uppercase text-sm rounded-full tracking-wider transition-colors shadow-sm">Save Global Settings</button>
                            </form>
                        )}

                        {/* TAB: RESTAURANT MENUS */}
                        {activeTab === 'menus' && (
                            <MenuManager />
                        )}

                        {/* TAB: TV PAIRING */}
                        {activeTab === 'pairing' && (
                            <div className="bg-bg p-6 rounded-3xl border border-border shadow-sm">
                                <DevicePairingManager />
                            </div>
                        )}

                        {/* TAB: FLEET TELEMETRY & HARDWARE CONTROLS */}
                        {activeTab === 'telemetry' && (
                            <div className="space-y-8">

                                {/* Fleet Telemetry Panel */}
                                <div className="bg-bg p-6 rounded-3xl border border-border shadow-sm">
                                    <FleetDashboard activeLocation={activeLocation} />
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}