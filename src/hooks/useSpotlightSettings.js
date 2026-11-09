import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function useSpotlightSettings(menuId) {
    const [state, setState] = useState(null);
    useEffect(() => {
        if (!menuId) return undefined;
        return onSnapshot(doc(db, 'globalMenuSpotlightSettings', menuId), (snapshot) => {
            setState({ menuId, calendarEnabled: snapshot.data()?.calendarEnabled !== false, error: '' });
        }, (error) => {
            console.error('Unable to load Spotlight scheduling settings:', error);
            // A failed settings read must never silently bypass schedules.
            setState({ menuId, calendarEnabled: true,
                error: 'Unable to load scheduling settings. Check that the latest Firestore rules are published.' });
        });
    }, [menuId]);
    return state?.menuId === menuId
        ? { calendarEnabled: state.calendarEnabled, ready: !state.error, error: state.error }
        : { calendarEnabled: true, ready: false, error: '' };
}
