# Fire TV setup and pairing

Use this guide when installing a new menu screen or replacing a Fire Stick.

## 1. Prepare the device

- Connect the Fire Stick to the TV and its power adapter.
- Connect to the store network and verify internet access.
- Install Fully Kiosk Browser using the approved installer.
- Activate the device's Fully PLUS license; transfer an existing license only when replacing its licensed device.
- Have an authorized super administrator available to approve pairing.

## 2. Choose the location and device identity

| Store | Location ID |
| --- | --- |
| Brodie | `brodie` |
| Parmer | `parmer` |
| Round Rock | `round_rock` |

| Purpose | Device ID | Screen |
| --- | --- | --- |
| Meat menu | `meat_menu` | `meat` |
| Sides menu | `sides_menu` | `sides` |

These are separate devices from the existing lobby display. A device ID identifies one device within a location. Do not reuse an occupied identity unless intentionally replacing that device.

The current application requires a valid device ID in the URL. IDs must contain 1–40 lowercase letters, numbers, underscores, or hyphens.

## 3. Set the Start URL

In Fully, open Web Content Settings and set Start URL to the production application URL with the location, device, and screen parameters.

Replace `PRODUCTION_APP_URL` below with the actual application address, including its deployment path. These examples are templates, not clickable production addresses.

```text
PRODUCTION_APP_URL?location=brodie&device=meat_menu&screen=meat
PRODUCTION_APP_URL?location=brodie&device=sides_menu&screen=sides
```

Change the location for the intended store. Use the exact lowercase IDs.

The first query parameter starts with `?`; subsequent parameters use `&`. In this setup, `screen` must be appended with `&screen=meat` or `&screen=sides`. Replacing the location/device query with `?screen=meat` removes the required device identity and causes registration to fail.

Do not add `preview=1` to a live TV URL. That flag is for draft testing. Do not use `#admin` on a display.

## 4. Configure Fully

Setting labels may vary by installed version. Verify the resulting behavior on the device.

- Enable JavaScript Interface for application commands.
- Enable Remote Administration and protect it with a password.
- Enable screenshot capture, including screenshot access in Kiosk Mode. Turn Disable Screenshots off where that setting is present.
- Enable Kiosk Mode, set a private PIN, and complete any activation/restart prompt.
- Enable Keep Screen On and disable automatic screen-off and screensaver timers for normal display operation.
- Hide browser navigation, address bars, and other browser controls.
- Enable Launch on Boot, then test it; earlier Fire TV installations still returned to Fire TV Home.
- Avoid automatic clearing of cookies or web storage, which can remove the anonymous authentication session.

After changing kiosk or screenshot permissions, exit and reopen Fully or restart the device if the change has not taken effect.

## 5. Approve pairing

1. Load the configured Start URL.
2. Confirm the TV shows the intended location and device with a six-digit pairing code.
3. Open the admin dashboard on a separate computer and sign in with an authorized super administrator account.
4. Find the matching request and approve it.
5. Confirm replacement only if this is deliberately replacing the previous device with the same identity.
6. Confirm the pairing overlay disappears and the expected menu loads.

Pairing approves the identity already supplied in the URL. It does not replace the location and device URL parameters.

If the TV reports that its identity is registered to a different URL, check for an existing registration before changing anything else. Changing URL identity after pairing can trigger this error.

## 6. Verify before launch

- [ ] Correct location, device ID, and menu screen.
- [ ] Intended menu has been published.
- [ ] Prices, Spanish setting, logos, and framing look correct on the actual TV.
- [ ] Device heartbeat appears in the dashboard.
- [ ] Dashboard screenshot succeeds.
- [ ] Remote Reload returns to the menu and retains pairing.
- [ ] A temporary sold-out change appears on the screen and is cleared afterward.
- [ ] Kiosk PIN works.
- [ ] Full power-cycle behavior has been tested.
- [ ] Staff know how to open Fully if Fire TV boots to Home.

Prefer Reload for routine recovery. The previous app restart/reboot workflow could return to Fire TV Home.

## Known setup problems

| Symptom | Checks |
| --- | --- |
| TV registration error | Verify all URL parameters, lowercase IDs, and a valid device ID. |
| Existing device name already paired | Confirm whether this is an intentional replacement; do not replace the lobby screen accidentally. |
| Screenshot fails | Check JavaScript Interface, screenshot capture, and screenshot permission inside Kiosk Mode; reopen Fully. |
| Kiosk PIN does not take effect | Complete the kiosk activation/restart prompt and reopen Fully. |
| Wrong or missing menu | Check location, screen parameter, publication, and absence of draft preview mode. |
| Fire TV Home appears after power restoration | Open Fully manually; automatic launch was unreliable on previous installations. |
