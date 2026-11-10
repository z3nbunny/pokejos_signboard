import { useId } from 'react';
import { WEEKDAYS } from '../utils/menuSpotlightSchedule';

const inputClass = 'w-full rounded-xl border border-border bg-surface p-3';

const DAY_NAMES = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday'
];

export default function SpotlightScheduleEditor({ draft, onChange, calendarEnabled = true }) {
    const id = useId();
    const changeRule = (field, value) => onChange('recurrence', {
        ...draft.recurrence, [field]: value
    });
    return (
        <section className="space-y-4 rounded-2xl border border-border p-4">
            <h4 className="font-bold">Timing & schedule</h4>
            <p className="text-sm text-text-secondary">
                {calendarEnabled
                    ? 'All schedules use Central time and follow daylight saving automatically. Overlapping specials rotate together.'
                    : 'Calendar scheduling is off. Daily Specials still follow their selected weekday. Other enabled ads rotate regardless of their date schedules.'}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
                <label
                    htmlFor={`${id}-daily-special`}
                    className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3"
                >
                    <input
                        id={`${id}-daily-special`}
                        type="checkbox"
                        checked={draft.scheduleType === 'daily'}
                        onChange={(event) =>
                            onChange(
                                'scheduleType',
                                event.target.checked ? 'daily' : 'always'
                            )
                        }
                        className="mt-1 h-4 w-4 accent-accent"
                    />

                    <span>
                        <span className="block text-sm font-bold">
                            Daily Special
                        </span>

                        <span className="block text-xs text-text-secondary">
                            Join the rotation every week on one selected day.
                        </span>
                    </span>
                </label>
                <label htmlFor={`${id}-duration`} className="space-y-2 text-sm font-bold">
                    <span className="block">Seconds on screen for this ad</span>
                    <input id={`${id}-duration`} type="number" min="5" max="300" step="1"
                        value={draft.displayDurationSeconds}
                        onChange={(event) => onChange('displayDurationSeconds', event.target.value)}
                        className={inputClass} />
                    <span className="block text-xs font-normal text-text-secondary">5–300 seconds. One ad stays visible continuously.</span>
                </label>
                {calendarEnabled && draft.scheduleType !== 'daily' && <label htmlFor={`${id}-type`} className="space-y-2 text-sm font-bold">
                    <span className="block">When should this ad run?</span>
                    <select id={`${id}-type`} value={draft.scheduleType}
                        onChange={(event) => onChange('scheduleType', event.target.value)}
                        className={inputClass}>
                        <option value="always">Whenever enabled</option>
                        <option value="window">One date/time range</option>
                        <option value="weekly">Repeat weekly</option>
                    </select>
                </label>}
            </div>
            {draft.scheduleType === 'daily' && (
                <label
                    htmlFor={`${id}-special-day`}
                    className="block space-y-2 text-sm font-bold"
                >
                    <span className="block">Special runs every</span>

                    <select
                        id={`${id}-special-day`}
                        value={draft.recurrence.days[0] ?? ''}
                        onChange={(event) =>
                            changeRule('days', [Number(event.target.value)])
                        }
                        className={inputClass}
                    >
                        <option value="" disabled>
                            Select a weekday
                        </option>

                        {DAY_NAMES.map((day, index) => (
                            <option key={day} value={index}>
                                {day}
                            </option>
                        ))}
                    </select>

                    <span className="block text-xs font-normal text-text-secondary">
                        Runs all day in Central Time, every week.
                        No start or end date needed.
                    </span>
                </label>
            )}
            {calendarEnabled && draft.scheduleType === 'window' && (
                <div className="grid gap-4 md:grid-cols-2">
                    <label htmlFor={`${id}-starts`} className="space-y-2 text-sm font-bold">
                        <span className="block">Starts — Central time</span>
                        <input id={`${id}-starts`} type="datetime-local" value={draft.startsAtInput}
                            onChange={(event) => onChange('startsAtInput', event.target.value)} className={inputClass} />
                    </label>
                    <label htmlFor={`${id}-ends`} className="space-y-2 text-sm font-bold">
                        <span className="block">Ends — Central time</span>
                        <input id={`${id}-ends`} type="datetime-local" value={draft.endsAtInput}
                            onChange={(event) => onChange('endsAtInput', event.target.value)} className={inputClass} />
                    </label>
                </div>
            )}
            {calendarEnabled && draft.scheduleType === 'weekly' && (
                <div className="space-y-4">
                    <fieldset className="space-y-2">
                        <legend className="text-sm font-bold">Repeat on</legend>
                        <div className="flex flex-wrap gap-3">
                            {WEEKDAYS.map((day, index) => (
                                <label key={day} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                                    <input type="checkbox" checked={draft.recurrence.days.includes(index)}
                                        onChange={(event) => changeRule('days', event.target.checked
                                            ? [...draft.recurrence.days, index].sort()
                                            : draft.recurrence.days.filter((value) => value !== index))} />
                                    {day}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <div className="grid gap-4 md:grid-cols-2">
                        <label htmlFor={`${id}-start-time`} className="space-y-2 text-sm font-bold">
                            <span className="block">Daily start — Central time</span>
                            <input id={`${id}-start-time`} type="time" value={draft.recurrence.startTime}
                                onChange={(event) => changeRule('startTime', event.target.value)} className={inputClass} />
                        </label>
                        <label htmlFor={`${id}-end-time`} className="space-y-2 text-sm font-bold">
                            <span className="block">Daily end — Central time</span>
                            <input id={`${id}-end-time`} type="time" value={draft.recurrence.endTime}
                                onChange={(event) => changeRule('endTime', event.target.value)} className={inputClass} />
                        </label>
                        <label htmlFor={`${id}-first-date`} className="space-y-2 text-sm font-bold">
                            <span className="block">First start date (optional)</span>
                            <input id={`${id}-first-date`} type="date" value={draft.recurrence.startDate}
                                onChange={(event) => changeRule('startDate', event.target.value)} className={inputClass} />
                        </label>
                        <label htmlFor={`${id}-last-date`} className="space-y-2 text-sm font-bold">
                            <span className="block">Last start date (optional)</span>
                            <input id={`${id}-last-date`} type="date" value={draft.recurrence.endDate}
                                onChange={(event) => changeRule('endDate', event.target.value)} className={inputClass} />
                        </label>
                    </div>
                    <p className="text-xs text-text-secondary">
                        An end time earlier than the start finishes the next day. Selected days
                        and date limits refer to the day the special starts. Leave dates empty to repeat indefinitely.
                    </p>
                </div>
            )}
        </section>
    );
}
