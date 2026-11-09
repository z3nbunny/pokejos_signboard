# Recurring meat-menu specials

The Meat Menu Spotlight library supports selectable ad cards, a dashed Add ad
card, weekly schedules, one-time schedules, and a display duration for each ad.
An empty library starts with a blank, disabled, unsaved ad. Save each ad before
leaving the page; switching between cards preserves unsaved edits in the session.

## Editing and scheduling

- **Use calendar scheduling** is a saved menu-wide switch, on by default. Turning
  it off hides the calendar and date/time controls, and all enabled, correctly
  targeted ads rotate regardless of their saved date or weekly schedules. Turning
  it on restores the calendar and applies the preserved schedules immediately.
  Individual ad Enabled switches and display durations apply in either mode.
  While scheduling is off, saving an ad's content retains its previously saved
  schedule; a new ad is saved without date restrictions.
- Choose **Whenever enabled**, **One date/time range**, or **Repeat weekly**.
- Weekly schedules accept multiple weekdays and optional first/last start dates.
  Empty dates mean indefinite recurrence.
- All schedule inputs and playback comparisons use `America/Chicago`, including
  daylight saving. One-time inputs that are skipped or repeated during a clock
  change are rejected so the administrator can choose an unambiguous time.
- A weekly end time earlier than its start finishes the following day. For
  example, Friday 20:00–02:00 runs into Saturday morning. Weekdays and date limits
  refer to the occurrence's start day. Equal daily start/end times are rejected.
- The calendar displays saved schedules, including disabled entries. Select an
  entry to edit that ad. **Use this date for the selected ad** fills an unsaved
  one-time 11:00–15:00 range; it does not write immediately.
- Overlapping enabled specials are allowed. Store targeting still applies.
- **Seconds on screen for this ad** accepts whole numbers from 5 through 300.
  Existing ads without a duration use 12 seconds.

## Playback

The published meat display and Item Availability live preview rotate through
all eligible global and local specials. Each shuffled cycle includes every
eligible ad once, with no immediate repeat at cycle boundaries. Longer durations
increase dwell time without increasing how often that ad is selected. One ad
stays still. No eligible ads returns the existing Super Spud fallback.

The 90-degree flip affects only the Spotlight panel. The menu remains readable.
Reduced-motion preference removes the flip. Preview mode continues to bypass
schedules while enforcing enabled status and location targeting.

This adds optional `recurrence` and `displayDurationSeconds` fields to existing
Spotlight documents. Existing one-time timestamp schedules continue to work.
The switch is stored in `/globalMenuSpotlightSettings/{menuId}` with public display
read access and super-admin-only validated writes. Publish the updated rules
before testing the switch. Missing settings default to scheduling on; settings
read failures also keep schedule checks on. Each display adds one settings listener.
Shuffling and schedule
checks run on the display; rotation does not write to Firestore or add a listener
for each ad. The existing UI is still the super-admin global meat Spotlight
library with location targeting; this change does not add a separate local-ad
editor or a sides-menu Spotlight area.

## Validation and rollout

Run `npm run test:spotlights`, `npm run lint`, and `npm run build`.

On a test screen, create two overlapping active specials, assign different dwell
times, and verify the flip and readable image framing. Confirm a weekly window
enters/exits, an overnight window continues after midnight, a different store's
ad stays excluded, and disabling/removing every eligible ad returns the potato
fallback. Verify the same behavior in Item Availability.

Deploy/reload both the dashboard and the TV player before enabling weekly ads.
Older player builds do not evaluate the new recurrence field. If rolling back
to an older build, first disable recurring specials. Keep production on the
published URL, without `preview=1`.
