import { useState } from 'react';
import {
    centralParts, dateOffset, formatCentralInput, spotlightOccursOnDate, WEEKDAYS
} from '../utils/menuSpotlightSchedule';

function scheduleLabel(ad) {
    if (ad.recurrence) {
        return `${ad.recurrence.days.map((day) => WEEKDAYS[day]).join(', ')} · ${ad.recurrence.startTime}–${ad.recurrence.endTime} Central`;
    }
    if (!ad.startsAt && !ad.endsAt) return 'Whenever enabled';
    return `${formatCentralInput(ad.startsAt).replace('T', ' ') || 'No start limit'} → ${formatCentralInput(ad.endsAt).replace('T', ' ') || 'No end limit'} Central`;
}

export default function SpotlightCalendar({ ads, onSelect, onUseDate, disabled = false }) {
    const today = centralParts().date;
    const [month, setMonth] = useState(() => today.slice(0, 7));
    const [selectedDate, setSelectedDate] = useState(today);
    const [location, setLocation] = useState('all');
    const first = new Date(`${month}-01T12:00:00Z`);
    const firstWeekday = first.getUTCDay();
    const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const moveMonth = (delta) => {
        const date = new Date(first);
        date.setUTCMonth(date.getUTCMonth() + delta);
        setMonth(date.toISOString().slice(0, 7));
        setSelectedDate(date.toISOString().slice(0, 10));
    };
    const scopedAds = ads.filter((ad) => location === 'all'
        || !ad.targetLocationIds?.length || ad.targetLocationIds.includes(location));
    const adsOnDate = (date) => scopedAds.filter((ad) => spotlightOccursOnDate(ad, date));
    const selectedAds = adsOnDate(selectedDate);
    return (
        <section aria-label="Specials calendar" className="grid gap-5 rounded-2xl border border-border bg-bg p-4 lg:grid-cols-2">
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="font-bold">Specials calendar</h4>
                    <label className="text-xs font-bold">
                        Location{' '}
                        <select aria-label="Calendar location" className="rounded-lg border border-border bg-surface p-2" value={location}
                            onChange={(event) => setLocation(event.target.value)}>
                            <option value="all">All locations</option>
                            <option value="brodie">Brodie</option>
                            <option value="parmer">Parmer</option>
                            <option value="round_rock">Round Rock</option>
                        </select>
                    </label>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3">
                    <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)} className="px-3 py-1">← Prev</button>
                    <h5 className="font-bold">{first.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</h5>
                    <button type="button" aria-label="Next month" onClick={() => moveMonth(1)} className="px-3 py-1">Next →</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                    {WEEKDAYS.map((day) => <span key={day} className="py-1 text-xs font-bold text-text-secondary">{day}</span>)}
                    {Array.from({ length: firstWeekday }, (_, i) => <span key={`blank-${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                        const date = dateOffset(`${month}-01`, i);
                        const count = adsOnDate(date).length;
                        const selected = selectedDate === date;
                        return (
                            <button key={date} type="button" aria-pressed={selected}
                                aria-label={`${date}: ${count} scheduled specials`}
                                onClick={() => setSelectedDate(date)}
                                className={`flex aspect-square min-w-0 flex-col items-center justify-center rounded-lg border text-sm ${selected ? 'border-blue-500 bg-blue-500 text-white' : 'border-border bg-surface hover:border-blue-400'}`}>
                                <span>{i + 1}</span>
                                {count > 0 && <span className="text-[10px]">{count} {count === 1 ? 'ad' : 'ads'}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
                <h5 className="font-bold">{new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
                })}</h5>
                <p className="text-xs text-text-secondary">Saved schedules in Central time. Disabled ads are listed but do not play. Overlapping enabled ads share the rotation.</p>
                {selectedAds.length ? selectedAds.map((ad) => (
                    <button key={ad.id} type="button" disabled={disabled} onClick={() => onSelect(ad.id)}
                        className="block w-full rounded-lg border border-border p-3 text-left hover:border-blue-500 disabled:opacity-50">
                        <span className="block text-sm font-bold">{ad.title || 'Untitled ad'}{ad.enabled === false ? ' · Disabled' : ''}</span>
                        <span className="block text-xs text-text-secondary">{scheduleLabel(ad)}</span>
                    </button>
                )) : <p className="text-sm text-text-secondary">No specials scheduled for this date.</p>}
                <button type="button" disabled={disabled} onClick={() => onUseDate(selectedDate)}
                    className="rounded-full border border-blue-500 px-4 py-2 text-xs font-bold text-blue-500 disabled:opacity-50">
                    Use this date for the selected ad
                </button>
                <p className="text-xs text-text-secondary">This fills a one-time range in the editor. Save the ad to apply it.</p>
            </div>
        </section>
    );
}
