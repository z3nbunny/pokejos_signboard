export const SPOTLIGHT_TIME_ZONE = 'America/Chicago';
export const DEFAULT_SPOTLIGHT_SECONDS = 12;
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const clock = new Intl.DateTimeFormat('en-US', {
    timeZone: SPOTLIGHT_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
const pad = (value) => String(value).padStart(2, '0');

export function toSpotlightMillis(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    return new Date(value).getTime();
}

export function centralParts(value = Date.now()) {
    const parts = Object.fromEntries(clock.formatToParts(new Date(value))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]));
    return {
        ...parts,
        date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
        time: `${pad(parts.hour)}:${pad(parts.minute)}`,
        minutes: parts.hour * 60 + parts.minute
    };
}

export function dateOffset(date, offset = 0) {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
}

export function isValidDateKey(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function timeToMinutes(value) {
    const match = /^(\d{2}):(\d{2})$/.exec(value || '');
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return NaN;
    return Number(match[1]) * 60 + Number(match[2]);
}

export function formatCentralInput(value) {
    const ms = toSpotlightMillis(value);
    if (!Number.isFinite(ms)) return '';
    const parts = centralParts(ms);
    return `${parts.date}T${parts.time}`;
}

// Resolve a wall-clock input independently of the administrator computer's zone.
// Ambiguous or skipped one-off times are rejected instead of silently shifted.
export function parseCentralInput(value) {
    if (!value) return null;
    const [date, time] = String(value).split('T');
    if (!isValidDateKey(date) || !Number.isFinite(timeToMinutes(time))) {
        throw new Error('Choose a valid Central date and time.');
    }
    const wall = Date.parse(`${date}T${time}:00Z`);
    let candidate = wall;
    for (let attempt = 0; attempt < 4; attempt += 1) {
        const shown = centralParts(candidate);
        candidate += wall - Date.parse(`${shown.date}T${shown.time}:00Z`);
    }
    if (formatCentralInput(candidate) !== value) {
        throw new Error('That Central time is skipped by daylight saving. Choose another time.');
    }
    if ([-3600000, 3600000].some((delta) => formatCentralInput(candidate + delta) === value)) {
        throw new Error('That Central time occurs twice during daylight saving. Choose another time.');
    }
    return candidate;
}

export function validateRecurrence(rule) {
    if (!rule || rule.type !== 'weekly') return 'Choose a valid weekly schedule.';
    if (!Array.isArray(rule.days) || !rule.days.length
        || rule.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
        return 'Select at least one day of the week.';
    }
    const start = timeToMinutes(rule.startTime);
    const end = timeToMinutes(rule.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) {
        return 'Choose different start and end times. Earlier end times finish the next day.';
    }
    if ((rule.startDate && !isValidDateKey(rule.startDate))
        || (rule.endDate && !isValidDateKey(rule.endDate))) return 'Choose valid schedule dates.';
    if (rule.startDate && rule.endDate && rule.endDate < rule.startDate) {
        return 'The last date cannot be before the first date.';
    }
    if (rule.timeZone && rule.timeZone !== SPOTLIGHT_TIME_ZONE) return 'Schedules use Central time.';
    return '';
}

function ruleStartsOnDate(rule, date) {
    return (!rule.startDate || date >= rule.startDate)
        && (!rule.endDate || date <= rule.endDate)
        && rule.days.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
}

export function isSpotlightInSchedule(spotlight, now) {
    if (!Number.isFinite(now)) return false;
    if (spotlight.recurrence) {
        const rule = spotlight.recurrence;
        if (validateRecurrence(rule)) return false;
        const local = centralParts(now);
        const start = timeToMinutes(rule.startTime);
        const end = timeToMinutes(rule.endTime);
        if (end > start) {
            return ruleStartsOnDate(rule, local.date)
                && local.minutes >= start && local.minutes < end;
        }
        // After midnight, an overnight special still belongs to its start day.
        return (local.minutes >= start && ruleStartsOnDate(rule, local.date))
            || (local.minutes < end && ruleStartsOnDate(rule, dateOffset(local.date, -1)));
    }
    const start = toSpotlightMillis(spotlight.startsAt);
    const end = toSpotlightMillis(spotlight.endsAt);
    return (start === null || (Number.isFinite(start) && now >= start))
        && (end === null || (Number.isFinite(end) && now < end));
}

export function isSpotlightEligible(spotlight, locationId, now, preview = false, calendarEnabled = true) {
    if (spotlight.enabled === false) return false;
    const targets = Array.isArray(spotlight.targetLocationIds) ? spotlight.targetLocationIds : [];
    return (!targets.length || targets.includes(locationId))
        && (preview || !calendarEnabled || isSpotlightInSchedule(spotlight, now));
}

export function spotlightOccursOnDate(spotlight, date) {
    if (!isValidDateKey(date)) return false;
    if (spotlight.recurrence) {
        const rule = spotlight.recurrence;
        if (validateRecurrence(rule)) return false;
        return ruleStartsOnDate(rule, date)
            || (timeToMinutes(rule.endTime) < timeToMinutes(rule.startTime)
                && timeToMinutes(rule.endTime) > 0
                && ruleStartsOnDate(rule, dateOffset(date, -1)));
    }
    const start = toSpotlightMillis(spotlight.startsAt);
    const end = toSpotlightMillis(spotlight.endsAt);
    if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end))) return false;
    if (start !== null && end !== null && end <= start) return false;
    return (start === null || centralParts(start).date <= date)
        && (end === null || centralParts(end - 1).date >= date);
}

export function getSpotlightSeconds(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 5 && number <= 300
        ? number : DEFAULT_SPOTLIGHT_SECONDS;
}

export function shuffleSpotlights(keys, previous = null, random = Math.random) {
    const shuffled = [...keys];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (shuffled.length > 1 && shuffled[0] === previous) {
        [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
    return shuffled;
}

export function nextSpotlight(keys, queue, previous, random = Math.random) {
    const remaining = queue.filter((key) => keys.includes(key) && key !== previous);
    const bag = remaining.length ? remaining : shuffleSpotlights(keys, previous, random);
    return { key: bag[0], queue: bag.slice(1) };
}
