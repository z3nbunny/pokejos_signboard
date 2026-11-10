import { useId, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/useAuth';

export default function SpotlightSchedulingToggle({ menuId, calendarEnabled, ready, error, disabled }) {
    const id = useId();
    const { currentUser, userData } = useAuth();
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const change = async (enabled) => {
        if (!ready || !currentUser || userData?.role !== 'super_admin') return;
        setSaving(true);
        setSaveError('');
        try {
            await setDoc(doc(db, 'globalMenuSpotlightSettings', menuId), {
                calendarEnabled: enabled,
                updatedAt: serverTimestamp(),
                updatedBy: currentUser.uid
            });
        } catch (failure) {
            console.error('Unable to save Spotlight scheduling settings:', failure);
            setSaveError('Scheduling settings could not be saved. Check permissions and try again.');
        } finally {
            setSaving(false);
        }
    };
    return (
        <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
            <label htmlFor={id} className="flex items-start gap-3">
                <input id={id} type="checkbox" checked={calendarEnabled}
                    aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
                    disabled={disabled || saving || !ready}
                    onChange={(event) => change(event.target.checked)} className="mt-1 h-5 w-5 accent-accent" />
                <span>
                    <span id={`${id}-title`} className="block font-bold">Use calendar scheduling</span>
                    <span id={`${id}-description`} className="mt-1 block text-sm text-text-secondary">
                        {calendarEnabled
                            ? 'On: enabled ads follow their saved schedules. Choose Whenever enabled for ads that need no dates.'
                            : 'Off: standard enabled ads rotate regardless of dates. Daily Specials still follow their selected weekdays. The calendar is hidden and saved schedules are kept.'}
                    </span>
                    <span className="mt-1 block text-xs text-text-secondary">Applies to this menu at every location and saves immediately. Each ad’s Enabled switch still applies.</span>
                </span>
            </label>
            {saving && <p role="status" className="text-xs text-text-secondary">Saving scheduling setting…</p>}
            {(error || saveError) && <p role="alert" className="text-sm text-danger">{error || saveError}</p>}
        </div>
    );
}
