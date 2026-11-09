import test from 'node:test';
import assert from 'node:assert/strict';
import {
    centralParts, formatCentralInput, parseCentralInput, isSpotlightInSchedule,
    isSpotlightEligible, spotlightOccursOnDate, validateRecurrence,
    getSpotlightSeconds, shuffleSpotlights, nextSpotlight
} from '../src/utils/menuSpotlightSchedule.js';

const weekly = (overrides = {}) => ({ type: 'weekly', days: [5], startTime: '11:00',
    endTime: '15:00', startDate: '', endDate: '', timeZone: 'America/Chicago', ...overrides });
const ms = (value) => Date.parse(value);

test('Friday weekly window respects inclusive start and exclusive end in Central time', () => {
    const ad = { recurrence: weekly() };
    assert.equal(isSpotlightInSchedule(ad, ms('2026-11-13T16:59:59Z')), false);
    assert.equal(isSpotlightInSchedule(ad, ms('2026-11-13T17:00:00Z')), true);
    assert.equal(isSpotlightInSchedule(ad, ms('2026-11-13T21:00:00Z')), false);
    assert.equal(isSpotlightInSchedule(ad, ms('2026-11-14T18:00:00Z')), false);
});

test('weekly windows follow daylight saving rather than fixed UTC offsets', () => {
    const ad = { recurrence: weekly({ days: [0] }) };
    assert.equal(isSpotlightInSchedule(ad, ms('2026-03-01T17:00:00Z')), true);
    assert.equal(isSpotlightInSchedule(ad, ms('2026-03-08T16:00:00Z')), true);
    assert.equal(isSpotlightInSchedule(ad, ms('2026-03-08T15:59:00Z')), false);
});

test('overnight occurrences and date limits belong to the day the special starts', () => {
    const ad = { recurrence: weekly({ startTime: '20:00', endTime: '02:00',
        startDate: '2026-11-13', endDate: '2026-11-13' }) };
    assert.equal(isSpotlightInSchedule(ad, ms('2026-11-14T07:30:00Z')), true);
    assert.equal(isSpotlightInSchedule(ad, ms('2026-11-14T08:00:00Z')), false);
    assert.equal(isSpotlightInSchedule(ad, ms('2026-11-21T07:00:00Z')), false);
    assert.equal(spotlightOccursOnDate(ad, '2026-11-13'), true);
    assert.equal(spotlightOccursOnDate(ad, '2026-11-14'), true);
    assert.equal(spotlightOccursOnDate(ad, '2026-11-20'), false);
});

test('overnight schedules cross months, years, and the Sunday boundary', () => {
    const ad = { recurrence: weekly({ days: [4], startTime: '23:00', endTime: '01:00' }) };
    assert.equal(isSpotlightInSchedule(ad, ms('2027-01-01T06:30:00Z')), true);
    const saturday = { recurrence: weekly({ days: [6], startTime: '23:00', endTime: '02:00' }) };
    assert.equal(isSpotlightInSchedule(saturday, ms('2026-11-15T07:00:00Z')), true);
});

test('both occurrences of a repeated weekly wall time qualify at fall-back', () => {
    const ad = { recurrence: weekly({ days: [0], startTime: '01:00', endTime: '02:00' }) };
    assert.equal(isSpotlightInSchedule(ad, ms('2026-11-01T06:30:00Z')), true);
    assert.equal(isSpotlightInSchedule(ad, ms('2026-11-01T07:30:00Z')), true);
});

test('one-off date inputs round-trip in Central time regardless of host timezone', () => {
    assert.equal(parseCentralInput('2026-11-13T11:00'), ms('2026-11-13T17:00:00Z'));
    assert.equal(parseCentralInput('2026-07-10T11:00'), ms('2026-07-10T16:00:00Z'));
    assert.equal(formatCentralInput(ms('2026-11-13T17:00:00Z')), '2026-11-13T11:00');
    assert.equal(centralParts(ms('2026-11-14T01:00:00Z')).date, '2026-11-13');
});

test('one-off inputs reject ambiguous, skipped, and impossible times', () => {
    assert.throws(() => parseCentralInput('2026-11-01T01:30'), /occurs twice/);
    assert.throws(() => parseCentralInput('2026-03-08T02:30'), /skipped/);
    assert.throws(() => parseCentralInput('2026-02-30T12:00'), /valid/);
    assert.throws(() => parseCentralInput('2026-11-13T24:00'), /valid/);
});

test('existing timestamp schedules and unbounded ads keep their behavior', () => {
    assert.equal(isSpotlightInSchedule({}, 0), true);
    const ad = { startsAt: { toMillis: () => 1000 }, endsAt: { toMillis: () => 2000 } };
    assert.equal(isSpotlightInSchedule(ad, 1000), true);
    assert.equal(isSpotlightInSchedule(ad, 2000), false);
    assert.equal(isSpotlightInSchedule({ startsAt: 0, endsAt: 1 }, 0), true);
    assert.equal(isSpotlightInSchedule({ endsAt: 'invalid' }, 1000), false);
});

test('preview bypasses schedule but never disabled status or location targeting', () => {
    const ad = { enabled: true, targetLocationIds: ['brodie'], endsAt: 1 };
    assert.equal(isSpotlightEligible(ad, 'brodie', 2, false), false);
    assert.equal(isSpotlightEligible(ad, 'brodie', 2, true), true);
    assert.equal(isSpotlightEligible(ad, 'parmer', 2, true), false);
    assert.equal(isSpotlightEligible({ ...ad, enabled: false }, 'brodie', 2, true), false);
});

test('calendar treats an exclusive midnight end correctly', () => {
    const ad = { startsAt: ms('2026-11-13T17:00:00Z'), endsAt: ms('2026-11-14T06:00:00Z') };
    assert.equal(spotlightOccursOnDate(ad, '2026-11-13'), true);
    assert.equal(spotlightOccursOnDate(ad, '2026-11-14'), false);
    assert.equal(spotlightOccursOnDate({}, '2026-02-30'), false);
});

test('calendar switch bypasses dates and recurrence while keeping enabled/location restrictions', () => {
    const ad = { enabled: true, targetLocationIds: ['brodie'], endsAt: 1 };
    assert.equal(isSpotlightEligible(ad, 'brodie', 2, false, false), true);
    assert.equal(isSpotlightEligible(ad, 'parmer', 2, false, false), false);
    assert.equal(isSpotlightEligible({ ...ad, enabled: false }, 'brodie', 2, false, false), false);
    const recurring = { ...ad, recurrence: weekly({ days: [5] }) };
    const monday = ms('2026-11-09T18:00:00Z');
    assert.equal(isSpotlightEligible(recurring, 'brodie', monday, false, false), true);
    assert.equal(isSpotlightEligible(recurring, 'brodie', monday, false, true), false);
});

test('scheduling defaults to enabled and switching does not mutate the saved schedule', () => {
    const ad = { enabled: true, startsAt: 1000, endsAt: 2000, recurrence: null };
    const original = structuredClone(ad);
    assert.equal(isSpotlightEligible(ad, 'brodie', 3000), false);
    assert.equal(isSpotlightEligible(ad, 'brodie', 3000, false, false), true);
    assert.equal(isSpotlightEligible(ad, 'brodie', 3000, false, true), false);
    assert.deepEqual(ad, original);
});

test('invalid recurring rules fail validation and cannot play', () => {
    for (const rule of [weekly({ days: [] }), weekly({ days: [7] }),
        weekly({ startTime: '11:00', endTime: '11:00' }),
        weekly({ startDate: '2026-12-01', endDate: '2026-11-01' })]) {
        assert.ok(validateRecurrence(rule));
        assert.equal(isSpotlightInSchedule({ recurrence: rule }, Date.now()), false);
    }
});

test('indefinite recurrence and always-on ads appear in future calendar months', () => {
    assert.equal(spotlightOccursOnDate({ recurrence: weekly() }, '2027-01-01'), true);
    assert.equal(spotlightOccursOnDate({}, '2028-02-29'), true);
});

test('display durations support longer individual ads and safe legacy defaults', () => {
    assert.equal(getSpotlightSeconds(45), 45);
    assert.equal(getSpotlightSeconds('90'), 90);
    for (const value of [undefined, null, 0, -1, 4, 301, 12.5, 'abc']) {
        assert.equal(getSpotlightSeconds(value), 12);
    }
});

test('shuffled cycles show each eligible ad once and avoid immediate repeats', () => {
    const keys = ['a', 'b', 'c'];
    const bag = shuffleSpotlights(keys, 'a', () => 0.99);
    assert.notEqual(bag[0], 'a');
    assert.deepEqual([...bag].sort(), keys);
    let state = { key: bag[0], queue: bag.slice(1) };
    const seen = [state.key];
    for (let i = 0; i < 20; i += 1) {
        const next = nextSpotlight(keys, state.queue, state.key, () => 0.4);
        assert.notEqual(next.key, state.key);
        state = next;
        seen.push(state.key);
    }
    for (let i = 0; i + 3 <= seen.length; i += 3) {
        assert.deepEqual(seen.slice(i, i + 3).sort(), keys);
    }
});

test('rotation drops removed ads and admits new ads on the next shuffled cycle', () => {
    const next = nextSpotlight(['a', 'c'], ['deleted', 'c'], 'a', () => 0);
    assert.equal(next.key, 'c');
    assert.equal(nextSpotlight(['a', 'c', 'new'], [], 'c', () => 0.99).queue.includes('new'), true);
});
