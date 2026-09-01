import { useState, useEffect } from 'react';
import Admin from './components/Admin';
import Weather from './components/Weather';
import MerchCarousel from './components/MerchCarousel';
import BottomCards from './components/BottomCards';
import EventMode from './components/EventMode';
import MeatMenuDisplay from './components/MeatMenuDisplay';
import { db } from './firebase';
import { doc, collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from './contexts/useAuth';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  signOut,
  GoogleAuthProvider
} from 'firebase/auth';
import { app } from './firebase';

import DeviceRegistration from './components/DeviceRegistration';

let anonymousSignInPromise = null;

export default function App() {
  const {
    currentUser,
    isDeviceUser,
    isAuthorizedAdmin
  } = useAuth();

  const [currentView, setCurrentView] = useState(
    () => window.location.hash === '#admin' ? 'ADMIN' : 'TV'
  );

  // --- 1. EXTRACT LOCATION FROM URL ---
  const queryParams = new URLSearchParams(window.location.search);
  const activeLocation = queryParams.get('location') || 'brodie';
  const deviceId = queryParams.get('device') || 'unassigned';
  const requestedScreen = String(
    queryParams.get('screen') || 'lobby'
  ).toLowerCase();

  const isMeatMenuScreen =
    requestedScreen === 'meat';

  const isMenuPreview =
    queryParams.get('preview') === '1';

  const [manualLayout, setManualLayout] = useState('DEFAULT');
  const [activeLayout, setActiveLayout] = useState('DEFAULT');

  // New Architecture States
  const [scheduleQueue, setScheduleQueue] = useState([]);
  const [campaignLibrary, setCampaignLibrary] = useState([]);
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [defaultCampaignIds, setDefaultCampaignIds] = useState({ feature: null, event: null });

  const [globalSettings, setGlobalSettings] = useState({
    qrText: "Scan to\nBrowse\nMerch",
    qrImageUrl: `${import.meta.env.BASE_URL}qr-code.png`
  });

  useEffect(() => {
    const checkHash = () => setCurrentView(window.location.hash === '#admin' ? 'ADMIN' : 'TV');
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // --- AUTHENTICATE PHYSICAL TV DISPLAYS ---
  useEffect(() => {
    if (currentView !== 'TV' || currentUser) {
      return;
    }

    const auth = getAuth(app);

    if (auth.currentUser) {
      return;
    }

    if (!anonymousSignInPromise) {
      anonymousSignInPromise = signInAnonymously(auth)
        .catch((error) => {
          console.error('TV authentication failed:', error);
        })
        .finally(() => {
          anonymousSignInPromise = null;
        });
    }
  }, [currentView, currentUser]);

  // --- 2. MULTI-TENANT DATA FETCHING (SOLO LISTENER) ---
  useEffect(() => {
    if (
      currentView === 'TV'
      && !isMeatMenuScreen
    ) {
      const unsubSettings = onSnapshot(doc(db, 'locations', activeLocation, 'settings', 'display'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setManualLayout(data.layoutMode || 'DEFAULT');
          setGlobalSettings({
            qrText: data.qrText || "Scan to\nBrowse\nMerch",
            qrImageUrl: data.qrImageUrl || `${import.meta.env.BASE_URL}qr-code.png`
          });
          setDefaultCampaignIds({
            feature: data.defaultFeatureId || null,
            event: data.defaultEventId || null
          });
        }
      });

      const unsubSchedule = onSnapshot(collection(db, 'locations', activeLocation, 'schedules'), (snapshot) => {
        setScheduleQueue(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      });

      const unsubCampaigns = onSnapshot(collection(db, 'locations', activeLocation, 'campaigns'), (snapshot) => {
        setCampaignLibrary(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      });

      return () => { unsubSettings(); unsubSchedule(); unsubCampaigns(); };
    }
  }, [
    currentView,
    activeLocation,
    isMeatMenuScreen
  ]);

  // --- 2b. FULLY KIOSK REMOTE COMMAND LISTENER (DEVICE LEVEL) ---


  // --- 3. THE TIMEKEEPER ENGINE ---
  useEffect(() => {
    if (
      currentView !== 'TV'
      || isMeatMenuScreen
    ) {
      return;
    }

    const evaluateTimeWindow = () => {
      const now = Date.now();

      const activeSchedule = scheduleQueue.find(schedule => {
        const start = typeof schedule.startTime === 'number' ? schedule.startTime : new Date(schedule.startTime).getTime();
        const end = typeof schedule.endTime === 'number' ? schedule.endTime : new Date(schedule.endTime).getTime();
        return now >= start && now <= end;
      });

      if (activeSchedule) {
        const linkedCampaign = campaignLibrary.find(c => c.id === activeSchedule.campaignId);
        if (linkedCampaign) {
          setActiveLayout(linkedCampaign.targetMode);
          setActiveCampaign(linkedCampaign);
        } else {
          setActiveLayout(manualLayout);

          if (manualLayout === 'FEATURE_BOARD') {
            const fallback = campaignLibrary.find(c => c.id === defaultCampaignIds.feature);
            setActiveCampaign(fallback || null);
          } else if (manualLayout === 'EVENT_MODE') {
            const fallback = campaignLibrary.find(c => c.id === defaultCampaignIds.event);
            setActiveCampaign(fallback || null);
          } else {
            setActiveCampaign(null);
          }
        }
      } else {
        setActiveLayout(manualLayout);

        if (manualLayout === 'FEATURE_BOARD') {
          const fallback = campaignLibrary.find(c => c.id === defaultCampaignIds.feature);
          setActiveCampaign(fallback || null);
        } else if (manualLayout === 'EVENT_MODE') {
          const fallback = campaignLibrary.find(c => c.id === defaultCampaignIds.event);
          setActiveCampaign(fallback || null);
        } else {
          setActiveCampaign(null);
        }
      }
    };

    evaluateTimeWindow();
    const timekeeperTicker = setInterval(evaluateTimeWindow, 1000);
    return () => clearInterval(timekeeperTicker);
  }, [
    scheduleQueue,
    campaignLibrary,
    manualLayout,
    currentView,
    defaultCampaignIds,
    isMeatMenuScreen
  ]);

  // --- 4. AUTOMATED SLEEP / WAKE SCHEDULER ---
  useEffect(() => {
    if (currentView !== 'TV' || typeof window.fully === 'undefined') return;

    const checkStoreHours = () => {
      const now = new Date();
      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

      // Default Store Hours: 10:00 AM (600 mins) to 9:30 PM (1290 mins)
      const wakeTime = 10 * 60;       // 10:00 AM
      const sleepTime = 21 * 60 + 30; // 9:30 PM

      if (currentTimeInMinutes >= wakeTime && currentTimeInMinutes < sleepTime) {
        if (typeof window.fully.getScreenOn === 'function' && !window.fully.getScreenOn()) {
          window.fully.turnScreenOn();
        }
      } else {
        if (typeof window.fully.getScreenOn === 'function' && window.fully.getScreenOn()) {
          window.fully.turnScreenOff();
        }
      }
    };

    checkStoreHours();
    const sleepWakeTicker = setInterval(checkStoreHours, 60000); // Check once per minute
    return () => clearInterval(sleepWakeTicker);
  }, [currentView]);

  if (currentView === 'ADMIN') {
    const handleLogin = async () => {
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();

      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error('Administrator sign-in failed:', error);
        alert('Sign-in failed. Please try again.');
      }
    };

    const handleLogout = async () => {
      try {
        await signOut(getAuth(app));
      } catch (error) {
        console.error('Sign-out failed:', error);
      }
    };

    // Signed-out browsers and anonymous TVs must use Google sign-in.
    if (!currentUser || isDeviceUser) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-100 font-sans">
          <h1 className="text-3xl font-black uppercase tracking-widest text-black mb-6">
            Restricted Access
          </h1>

          <button
            onClick={handleLogin}
            className="px-8 py-4 bg-blue-600 text-white rounded-full font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-lg"
          >
            Sign in with Google
          </button>
        </div>
      );
    }

    // A valid Google login is not enough: the user must also have
    // an approved Firestore administrator profile.
    if (!isAuthorizedAdmin) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-100 font-sans px-6 text-center">
          <h1 className="text-3xl font-black uppercase tracking-widest text-black mb-4">
            Access Denied
          </h1>

          <p className="text-slate-600 mb-6">
            This Google account does not have an authorized administrator profile.
          </p>

          <button
            onClick={handleLogout}
            className="px-8 py-4 bg-slate-800 text-white rounded-full font-bold uppercase tracking-wider hover:bg-slate-900 transition-colors shadow-lg"
          >
            Sign Out
          </button>
        </div>
      );
    }

    return <Admin />;
  }

  const isFeature = activeLayout === 'FEATURE_BOARD';
  const isEvent = activeLayout === 'EVENT_MODE';

  const qrText = String(
    globalSettings.qrText || ''
  ).replace(/<br\s*\/?>/gi, '\n');

  return (
    <>
      {/* Telemetry runs silently in the background */}
      {isDeviceUser && (
        <DeviceRegistration
          activeLocation={activeLocation}
          deviceId={deviceId}
        />
      )}

      {/* Explicit Meat Menu mode leaves existing displays unchanged. */}
      {isMeatMenuScreen ? (
        <MeatMenuDisplay
          activeLocation={activeLocation}
          deviceId={deviceId}
          previewMode={isMenuPreview}
        />
      ) : isEvent ? (
        <div className="w-screen h-screen overflow-hidden bg-black select-none">
          <EventMode
            key={[
              activeLocation,
              activeCampaign?.id || 'none',
              JSON.stringify(
                activeCampaign?.slides || []
              )
            ].join(':')}
            slides={activeCampaign?.slides || []}
          />
        </div>
      ) : (

        <div className={`w-screen h-screen overflow-hidden bg-slate-100 text-black font-sans p-[1vw] grid select-none transition-all duration-700 ${isFeature ? 'grid-cols-[40fr_60fr] gap-[2vw]' : 'grid-rows-[58fr_42fr] gap-[0vh]'}`}>

          {/* SECTION 1 */}
          {isFeature ? (
            <div className="w-full h-full rounded-[1vw] overflow-hidden bg-black border border-black/10 flex flex-col shadow-2xl relative">
              <div className="w-full h-[65%] bg-black relative">
                <img src={activeCampaign?.imageUrl || "https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?q=80&w=1000&auto=format&fit=crop"} alt={activeCampaign?.title || "Feature"} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 flex flex-col items-center justify-center px-[2vw] py-[2vh] bg-black border-t border-white/20">
                <h4 className="text-[1.2vw] tracking-[0.2em] text-white/60 uppercase font-bold text-center">{activeCampaign?.subtitle || "Featured Item"}</h4>
                <div className="w-[6vw] h-[0.5vh] bg-white/50 my-[1.5vh]"></div>
                <h2 className="text-[3vw] font-black text-white uppercase tracking-tight leading-none text-center">{activeCampaign?.title || "Loading..."}</h2>
                <p className="text-[1.4vw] text-white/60 mt-[1.5vh] font-medium leading-tight text-center px-[2vw]">{activeCampaign?.description || "Awaiting Campaign Data..."}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-[1vw] w-full h-full overflow-hidden px-[0.5vw]">
              <div className="shrink-0 w-[12vw] h-[50vh] flex items-center justify-center">
                <Weather />
              </div>
              <div className="flex-1 h-full overflow-hidden flex items-center justify-center">
                <MerchCarousel
                  key={`merch-${activeLocation}`}
                  activeLocation={activeLocation}
                  isFeature={isFeature}
                />
              </div>
              <div className="shrink-0 w-[14vw] flex flex-col items-center justify-center">
                <h2 className="text-[1.8vw] font-black tracking-widest uppercase text-black mb-[1.5vh] text-center leading-tight shrink-0 whitespace-pre-line">
                  {qrText}
                </h2>
                <img src={globalSettings.qrImageUrl} alt="QR Code" className="w-full object-contain rounded-md mix-blend-multiply" />
              </div>
            </div>
          )}

          {/* SECTION 2 */}
          {isFeature ? (
            <div className="flex flex-col gap-[2vh] w-full h-full overflow-hidden">
              <div className="shrink-0 h-[12vh] flex items-center justify-center overflow-hidden">
                <Weather isFeature={isFeature} />
              </div>
              <div className="flex-1 flex gap-[1vw] overflow-hidden">
                <div className="flex-1 h-full bg-transparent overflow-hidden">
                  <MerchCarousel
                    key={`merch-${activeLocation}`}
                    activeLocation={activeLocation}
                    isFeature={isFeature}
                  />
                </div>
                <div className="shrink-0 w-[12vw] flex flex-col items-center justify-center">
                  <h2 className="text-[1.7vw] font-black tracking-widest uppercase text-black mb-[1vh] text-center leading-tight whitespace-pre-line">
                    {qrText}
                  </h2>
                  <img src={globalSettings.qrImageUrl} alt="QR Code" className="w-full object-contain mix-blend-multiply" />
                </div>
              </div>
              <div className="h-[35%] overflow-hidden">
                <BottomCards
                  key={`cards-${activeLocation}`}
                  activeLocation={activeLocation}
                  isFeature={isFeature}
                />
              </div>
            </div>
          ) : (
            <div className="h-full overflow-hidden">
              <BottomCards
                key={`cards-${activeLocation}`}
                activeLocation={activeLocation}
                isFeature={isFeature}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}