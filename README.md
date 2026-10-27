# Pok-E-Jo's Digital Signboard

Digital signage and restaurant menus for Pok-E-Jo's, built with React, Vite, Tailwind CSS, and Firebase.

The system supports lobby displays, dedicated meat and sides menus, scheduled campaigns, menu spotlights, and location-specific sold-out updates. TVs use Fire TV Sticks running Fully Kiosk Browser.

## Documentation

Start with the [documentation index](docs/README.md).

- [Fire TV setup and pairing](docs/fire-tv-setup.md)

## Locations and screens

Supported location IDs: `brodie`, `parmer`, and `round_rock`.

| Screen | Device ID convention | Screen parameter |
| --- | --- | --- |
| Meat menu | `meat_menu` | `screen=meat` |
| Sides menu | `sides_menu` | `screen=sides` |
| Lobby | Keep the existing device ID | `screen=lobby` (default) |

Location and device identity are supplied in the display URL. Pairing approves the physical device for that identity. Device IDs must be unique within a location.

## Local development

Install Node.js compatible with the project's Vite version and npm. Configure access to the intended Firebase project before testing writes.

```sh
npm ci
npm run dev
```

Use an authorized Google account for the admin dashboard by opening the app with `#admin`. Google sign-in alone does not grant access; an approved administrator profile is required.

## Checks and deployment

```sh
npm run lint
npm run build
npm run preview
```

`preview` serves the production build locally.

`npm run deploy` runs the production build through `predeploy`, then publishes `dist/` using `gh-pages`. The Vite base path is currently `/pokejos_signboard/`.

Frontend deployment does not publish Firestore security rules. Review backend configuration and rules separately when changing access or data structures.

## Project layout

- `src/`: application components, services, hooks, and styles.
- `public/`: static assets.
- `docs/`: operational and maintenance documentation.

## Access and device operation

- Administrators sign in with Google and require an authorized profile.
- TVs authenticate anonymously and require pairing approval.
- Super administrators manage global settings and menus; location administrators have location-scoped access.
- Device monitoring includes heartbeats and screenshots, with remote commands supported through Fully Kiosk.

Do not commit credentials, kiosk PINs, remote administration passwords, or service-account keys.
