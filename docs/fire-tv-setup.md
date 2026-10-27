# Fire TV setup and pairing

Use this guide for a new lobby or menu TV, or when replacing a Fire Stick.

This setup uses an Android-based Fire OS device, Downloader by AFTVnews, and the regular Fully Kiosk Browser APK. Menu labels and available permissions vary by Fire OS version. Record the device model, Fire OS version, and Fully version when testing.

## 1. Prepare the TV and Fire Stick

- Connect the Fire Stick to the TV's HDMI input.
- Power it with its power adapter from a reliable outlet. Avoid TV USB power that may disappear when the TV turns off.
- Complete Amazon setup, connect to the store network, and verify internet access.
- Check Settings > My Fire TV > About and record the model and software version. This APK procedure is for Fire OS, not Vega OS.
- Have an authorized super administrator available to approve pairing.

## 2. Install Downloader and Fully

### Get Downloader

1. From Fire TV Home, open Find/Search or the Appstore.
2. Search for **Downloader** and select the app by **AFTVnews**. Use the [developer's official Downloader page](https://www.aftvnews.com/downloader/) to identify the app.
3. Select Get/Download and open it after installation. Accept the file-access prompt if requested.

### Allow Downloader to install Fully

1. Open Settings > My Fire TV > Developer Options.
2. If Developer Options is hidden, open My Fire TV > About, highlight the device/model name, and press the remote's Select button seven times. Press Back to find Developer Options.
3. Open Install Unknown Apps and enable it for Downloader. Older Fire OS versions may instead show Apps from Unknown Sources.
4. If Downloader is not listed yet, attempt the APK download/install below, then return to this setting when prompted.

ADB debugging is not needed for this Downloader installation route.

### Quick install with the previously used Downloader code

1. Open **Downloader > Home > URL/Search field**.
2. Enter **`238911`** and select **Go**.
3. Let the redirect finish, then select **Install > Open**.

Checked October 27, 2026: [code 238911](https://go.aftvnews.com/238911) points to the official [Fully Kiosk Browser v1.56.3 APK](https://www.fully-kiosk.com/files/2024/12/Fully-Kiosk-Browser-v1.56.3.apk). This is the installer code used in the previous setup, not a code that tracks the latest release. Check the displayed destination before installing. If you need the current release or the code stops working, use the website route below.

### Download Fully from its official website

1. Open Downloader and enter `https://www.fully-kiosk.com/` in the URL field.
2. Choose **Get APK file** under **Fully Kiosk Browser**, or open the [official downloads page](https://www.fully-kiosk.com/docs/en/getting-started/downloads).
3. Download the **regular edition** APK for Fully Kiosk Browser.
4. Select Install, then Open. If installation is blocked, grant Downloader permission as described above and retry.
5. After installation, the downloaded APK can be deleted without removing the installed app.

Fully's [Fire OS instructions](https://www.fully-kiosk.com/docs/en/faq/fire) specify the regular APK; there is no separate Fire OS APK. Select Fully Kiosk Browser rather than Fully Single App Kiosk, Fully Video Kiosk, or the EMM edition.

## 3. Activate Fully PLUS

Official licensing links:

- [Buy a Fully PLUS single-device license](https://license.fully-kiosk.com/license/single).
- [Buy or top up a volume license](https://license.fully-kiosk.com/license/volume).
- [Move an existing single-device license](https://license.fully-kiosk.com/license/move).
- [Licensing instructions](https://www.fully-kiosk.com/docs/en/legal/fully-plus-license).

To open Fully's menu on the Fire TV remote, **press and hold Back** while Fully is in the foreground; enter the kiosk PIN if prompted. Select **Get a PLUS License** for the single-license purchase flow. Single-device purchases activate against the Fully Device ID with internet access; there is no single-license key to enter. For a volume key, use **Fully menu > Settings > Other Settings > Volume License Key**.

Find the **Fully Device ID** at the bottom of Fully's app menu (also available under **Fully menu > Settings > Other Settings > Device ID**) and use that identifier when ordering or moving a license. It is different from our application device IDs such as `lobby` and `meat_menu`.

Use the company's purchasing details and retain the receipt and license records outside this repository. Verify the app reports PLUS activated after the purchase or transfer. Transfer an existing license only when replacing its licensed device. Test the needed features before buying; current prices and terms are shown on the official pages.

## 4. Choose the location and application device identity

| Store | Location ID |
| --- | --- |
| Brodie | `brodie` |
| Parmer | `parmer` |
| Round Rock | `round_rock` |

| Purpose | Device ID | Screen parameter |
| --- | --- | --- |
| Lobby / non-menu signboard | `lobby` | `screen=lobby` |
| Meat menu | `meat_menu` | `screen=meat` |
| Sides menu | `sides_menu` | `screen=sides` |

These are separate device identities. An ID identifies one device within a location. For an additional physical screen of the same type, assign a distinct ID; do not pair two sticks to one identity.

The application requires a device ID containing 1–40 lowercase letters, numbers, underscores, or hyphens. When servicing an existing device, check its registered identity before changing its URL. Adopt `lobby` for new non-menu installations; renaming an older identity is a separate pairing change.

## 5. Set the Start URL

In Fully, **press and hold the remote's Back button > enter the kiosk PIN if prompted > Settings > Web Content Settings > Start URL**. Set Start URL to the production application address with the location, device, and screen parameters.

Replace `PRODUCTION_APP_URL` below with the actual application address, including its deployment path. These are templates, not production addresses.

```text
PRODUCTION_APP_URL?location=brodie&device=lobby&screen=lobby
PRODUCTION_APP_URL?location=brodie&device=meat_menu&screen=meat
PRODUCTION_APP_URL?location=brodie&device=sides_menu&screen=sides
```

Change the location for the intended store. Use the exact lowercase IDs.

The first query parameter starts with `?`; subsequent parameters use `&`. Append `&screen=meat` or `&screen=sides` after the existing location/device parameters. Replacing the entire query with `?screen=meat` removes the required identity and causes registration to fail.

Do not add `preview=1` to a live TV URL. That flag is for draft testing. Do not use `#admin` on a display.

## 6. Configure Fully and prevent unintended shutdown

### Open Fully settings

With Fully in the foreground, **press and hold Back on the Fire TV remote**, enter the kiosk PIN if prompted, then choose **Settings**. All paths below start from that Fully menu, not the Fire TV Home settings.

The section names follow Fully's published configuration guide. Labels can differ on the older v1.56.3 installer used by code `238911`; where a version uses Allow instead of Disable, set it to the equivalent behavior.

### Fully settings paths

| Purpose | Path from the Fully menu | Setting |
| --- | --- | --- |
| Display URL | Settings > Web Content Settings > Start URL | Use the full location/device/screen URL from section 5. |
| Application commands | Settings > Advanced Web Settings > Enable JavaScript Interface (PLUS) | On. |
| Remote management | Settings > Remote Administration (PLUS) > Enable Remote Administration | On. |
| Remote password | Settings > Remote Administration (PLUS) > Remote Admin Password | Set a private password. |
| Local browser access to Fully | Settings > Remote Administration (PLUS) > Remote Admin from Local Network | On if local remote access is needed. A browser on the same reachable network uses `http://FIRE_STICK_IP:2323`. |
| Screenshot capture | Settings > Remote Administration (PLUS) > Enable Screenshot on Remote Admin | On. |
| Screenshot restriction | Settings > Kiosk Mode (PLUS) > Disable Screenshots, or Allow Screenshots where present | Disable Screenshots off / Allow Screenshots on. This was important on the existing installation; the option may be absent on other versions. |
| Kiosk protection | Settings > Kiosk Mode (PLUS) > Enable Kiosk Mode | On; complete activation/restart prompts. |
| Kiosk PIN | Settings > Kiosk Mode (PLUS) > Kiosk Mode PIN | Set a private PIN and test it. |
| Keep display awake | Settings > Device Management > Keep Screen On | On. |
| Idle screen-off | Settings > Device Management > Screen Off Timer (PLUS) | Disabled; use the disabled/zero value shown by the app. |
| Automatic screensaver | Settings > Screensaver (PLUS) > Screensaver Timer | Disabled; use the disabled/zero value shown by the app. |
| Black screen for dashboard Sleep | Settings > Screensaver (PLUS) > Screensaver Wallpaper URL | `fully://color#000000`. May be labeled Screensaver Wallpaper on older builds. |
| Fully's own scheduled sleep | Settings > Power Settings > Schedule Wakeup and Sleep (PLUS) | Check for unwanted entries; the application has its own hours described below. |
| Hide browser/system bars | Settings > Toolbars and Appearance | Turn off Show Navigation Bar, Show Status Bar, Show Action Bar, Show Address Bar, Show Tabs, and Show Progress Bar where present. |
| Preserve pairing storage | Settings > Web Auto Reload | Keep Delete Webstorage on Auto Reload and Delete Cookies on Auto Reload off. Check any Basic Web Automation rules under Advanced Web Settings for storage/cookie deletion too. |
| Startup option location | Settings > Device Management > Launch on Boot | Reference only; manual launch remains the standard Fire Stick recovery procedure below. |

Dashboard Sleep starts Fully's black screensaver; it does not physically power off the TV. Disabling the automatic screensaver timer does not prevent a manual dashboard Sleep command.

If Fully's links to Android permission settings crash, return to **Fire TV Home > Settings > Applications > Manage Installed Applications > Fully Kiosk Browser > Permissions**, where that entry is available, and grant the listed permissions needed for this setup. Special permissions may not be listed there or available at all on Fire OS; do not assume a missing permission was granted.

Exit and reopen Fully after changes; complete any request to restart in kiosk mode. Confirm the PIN and screenshots actually work.

### TV and Fire TV settings

Use the following paths on the **Fire TV Home screen**, not inside Fully:

| Task | Fire TV path |
| --- | --- |
| Connect or reconnect Wi-Fi | Settings > Network > select the store network. |
| Record model/software | Settings > My Fire TV > About. |
| Find the local IP address | Settings > My Fire TV > About > Network. |
| Allow APK installation | Settings > My Fire TV > Developer Options > Install Unknown Apps > Downloader > On. |
| Adjust Fire TV screensaver | Settings > Display & Sounds > Screensaver > Start Time; choose Never if offered. |
| Check time zone | Settings > Preferences > Time Zone; select the local Central/Austin zone. |
| Restart for testing | Settings > My Fire TV > Restart. |
| Reopen Fully | Settings > Applications > Manage Installed Applications > Fully Kiosk Browser > Launch Application. |

Fire TV labels/options vary by model. Some devices use Device & Software instead of My Fire TV. If a sleep/idle control is unavailable, record that and rely on the unattended test to check actual behavior.

For the **TV panel itself**, use the TV's own remote: **Menu/Settings > System, Power, Timers, or Eco/Energy Saving**, depending on the manufacturer. Find Sleep Timer, Auto Power Off, and no-signal shutdown; disable any timer that interrupts business-hours display. There is no single exact TV-menu path across all models, so record the tested path for that TV during installation.

Fully's Keep Screen On does not configure the TV's own power timers. Check the Fire Stick's local time/time zone. The current application attempts scheduled wake at **10:00 AM** and sleep at **9:30 PM**, using the device's local time. This is separate from Fully's timers, and actual screen-control support varies on Fire TV. Test the intended closing/opening behavior rather than assuming it works.

### Launch on boot: manual opening is the expected workflow

The existing Fire Stick setup has not provided reliable automatic launch into Fully. **Do not treat Fully's Launch on Boot switch as a working startup solution on its own.**

After a reboot or power failure, expect Fire TV Home and have staff open Fully manually. It can be opened from Apps, or from Settings > Applications > Manage Installed Applications > Fully Kiosk Browser > Launch Application.

Fully documents extra ADB permissions that may enable autostart on some Fire TV versions. That is a separate, device-specific procedure, not part of this standard setup. Record and verify any such modification before depending on it.

## 7. Approve pairing

1. Load the configured Start URL.
2. Confirm the TV shows the intended location and device with a six-digit pairing code.
3. On another computer, open the production application address followed by `#admin` and sign in with an authorized super administrator account.
4. In **Admin Dashboard > Pair New TV > Pending TV Pairing**, find the matching code/location/device and select **Approve**.
5. Confirm replacement only when deliberately replacing the previous device with that identity.
6. Confirm the overlay disappears and the intended lobby content or menu loads.

Pairing approves the identity already supplied in the URL; it does not replace the location and device URL parameters.

If the TV reports that its identity is registered to a different URL, check the existing registration. Changing URL identity after pairing can trigger this error.

## 8. Functional checks

- [ ] Correct location, device ID, screen, and Start URL.
- [ ] Fully PLUS license is active.
- [ ] For menus: intended menu is published; prices, Spanish setting, logos, and framing look correct.
- [ ] For lobby: intended campaigns/cards load and rotating content advances normally.
- [ ] Heartbeat updates in the dashboard. The current code sends one approximately every 60 seconds.
- [ ] A newly requested screenshot shows current content.
- [ ] Remote Reload returns to the display and retains pairing.
- [ ] Dashboard Sleep shows the black screensaver; Wake restores the display.
- [ ] For menus: a temporary sold-out change appears and is cleared afterward.
- [ ] Kiosk PIN works.
- [ ] A brief Wi-Fi disconnect/reconnect recovers to current content and resumes heartbeat without re-pairing.

### Where to find the dashboard checks

- **Admin Dashboard > TV Connections (Telemetry)**: select the correct location using the dashboard's location selector, then find the device in **Fleet Telemetry & Controls**.
- On that device's row, use **Screenshot**, **Reload**, **Sleep**, and **Wake**. Captured images appear below under **Live Screenshots**.
- **Admin Dashboard > Item Availability**: make and clear the temporary sold-out change for the correct store/menu.
- **Admin Dashboard > Restaurant Menus**: super administrators can review menu publication. Use a separate admin computer; the TV should remain on its display URL.

Perform connection and power tests before putting the screen into service.

## 9. Extended unattended test

A quick check cannot establish that a TV will remain on for hours. Run this test on the actual TV/Fire Stick combination with its final settings.

1. Start during the intended display hours. Record the start time, versions, location/device ID, and timer settings. Request a baseline screenshot.
2. Leave the TV displaying real content **without touching either remote**. Remote input can hide idle-timeout problems.
3. At roughly 30 minutes, 2 hours, 4 hours, and the end of the run, inspect the physical TV before interacting with it. Confirm the panel is on, the correct HDMI input is selected, and Fully is still showing current content.
4. At each checkpoint, check the dashboard's last-seen time and request a fresh screenshot. A healthy heartbeat alone does not prove that the physical TV panel is on.
5. Run for **at least 6–8 hours**, longer than any configured timeout; a full normal business day is the preferred launch check.
6. Separately observe the intended closing-time sleep and next opening-time recovery. The application currently attempts these at 9:30 PM and 10:00 AM local device time; do not mistake that schedule for an idle timeout.
7. If the screen blanks, sleeps, shows Fire TV Home, freezes, or loses telemetry, record the time and symptom. Correct the cause and repeat the unattended run.

Pass only when the display remains visible and responsive throughout intended display hours, with no manual wake/relaunch needed. This checks the tested configuration; it cannot guarantee future behavior after software or hardware changes.

## 10. Restart and power-restoration checks

- [ ] Restart the Fire Stick and record where it lands.
- [ ] If Fire TV Home appears, open Fully manually and confirm the correct URL, pairing, and content remain.
- [ ] Disconnect and restore power to the TV and Fire Stick, then check TV power/input behavior separately from Fire Stick startup.
- [ ] If the TV itself stays off, document how staff turn it on; Fully cannot solve the TV's power-restoration behavior.
- [ ] Confirm heartbeat, screenshot, and Reload work again.
- [ ] Show staff how to turn on the TV, select the input, and open Fully after an outage.

Prefer Reload for routine recovery. The previous app restart/reboot workflow could return to Fire TV Home.

## Known setup problems

| Symptom | Checks |
| --- | --- |
| Downloader cannot install Fully | Verify Developer Options and Downloader's Install Unknown Apps permission. |
| TV registration error | Check all URL parameters, lowercase IDs, and a valid device ID. |
| Device already paired | Confirm intentional replacement; do not replace a different screen. |
| Screenshot fails | Check JavaScript Interface, screenshot capture, and screenshot permission inside Kiosk Mode; reopen Fully. |
| PIN does not take effect | Complete the kiosk activation/restart prompt and reopen Fully. |
| Wrong or missing content | Check location, screen parameter, publication/schedule, and absence of draft preview mode. |
| TV goes dark after hours | Check the TV's own timers, Fire TV idle settings, Fully timers, and application hours. Record whether heartbeat continues and whether the panel is powered on. |
| Home appears after power restoration | Open Fully manually; automatic launch is not part of the verified standard setup. |

## References and maintenance

Official links checked October 27, 2026. Installation steps follow the Downloader route previously used for this project and current publisher guidance; this documentation update does not represent a new hardware test.

- [Downloader by AFTVnews](https://www.aftvnews.com/downloader/).
- [Amazon staff instructions for exposing Developer Options](https://www.amazonforum.com/s/question/0D56Q0000CYCOxqSQH/i-dont-see-developer-options-under-my-fire-tv?language=en_US).
- [Fully downloads](https://www.fully-kiosk.com/docs/en/getting-started/downloads).
- [Fully Fire OS limitations and permissions](https://www.fully-kiosk.com/docs/en/faq/fire).
- [Fully configuration menu and remote Back-button access](https://www.fully-kiosk.com/docs/en/configuration/).
- [Fully advanced web settings](https://www.fully-kiosk.com/docs/en/configuration/advanced-web).
- [Fully device management](https://www.fully-kiosk.com/docs/en/configuration/device-management).
- [Fully kiosk settings](https://www.fully-kiosk.com/docs/en/configuration/kiosk-mode).
- [Fully remote administration settings](https://www.fully-kiosk.com/docs/en/configuration/remote-administration).
- [Fully screensaver settings](https://www.fully-kiosk.com/docs/en/configuration/screensaver).
- [Fully toolbar settings](https://www.fully-kiosk.com/docs/en/configuration/toolbars-appearance).
- [Fully auto-reload settings](https://www.fully-kiosk.com/docs/en/configuration/web-auto-reload).
- [Fully power settings](https://www.fully-kiosk.com/docs/en/configuration/power).
- [Downloader shortcut 238911](https://go.aftvnews.com/238911), checked against its displayed official v1.56.3 APK destination.
- [Fully PLUS licensing](https://www.fully-kiosk.com/docs/en/legal/fully-plus-license).

Application URL parsing and scheduled hours: `src/App.jsx`. Pairing validation: `src/components/DeviceRegistration.jsx`. Heartbeats and remote Sleep/Wake: `src/components/DeviceTelemetry.jsx`.

Recheck this guide after Fire OS/Fully updates or application changes. Store passwords, PINs, and license details outside the repository.
