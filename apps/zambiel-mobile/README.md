# Zambiel mobile app

## Normal daily start (Android emulator)

Open two PowerShell terminals.

```powershell
# Terminal 1 — from D:\zambiel
npm.cmd run dev
```

```powershell
# Terminal 2 — from D:\zambiel\apps\zambiel-mobile
npm.cmd start
```

Start your Android emulator, then open the installed **Zambiel** development app. Metro will refresh the app when you save a JavaScript/TypeScript change.

The mobile `.env` must contain an Android-emulator-safe backend address. Copy `.env.example` if needed:

```powershell
Copy-Item .env.example .env
```

For the Android emulator, use `http://10.0.2.2:3000` for `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WEB_URL`. Do not use `localhost`: on Android it means the emulator itself.

## Useful commands

Run these from `D:\zambiel\apps\zambiel-mobile`:

```powershell
npm.cmd install          # first setup or after dependency changes
npm.cmd start            # normal development with the installed dev client
npm.cmd run typecheck
npm.cmd test
npm.cmd run export       # JavaScript Android export check
npm.cmd run android      # full native Gradle build/install; only after native changes
```

From the repository root, the equivalent shortcuts are:

```powershell
npm.cmd run mobile:start
npm.cmd run mobile:typecheck
npm.cmd run mobile:test
npm.cmd run mobile:export
```

## Payments (only when testing Stripe)

Keep these running in separate terminals from the repository root:

```powershell
npm.cmd run dev
npm.cmd run stripe:listen
```

Add the listener's `whsec_...` value to the ignored root `.env` as `STRIPE_WEBHOOK_SECRET`, then restart the backend. The Stripe browser return is not payment confirmation; the webhook is.

## Build an Android file

Use an Expo/EAS account and the required release credentials/configuration. From this folder:

```powershell
npx.cmd eas-cli login
npx.cmd eas-cli build --platform android --profile preview
```

`preview` produces an internal APK. `production` produces an Android App Bundle (AAB):

```powershell
npx.cmd eas-cli build --platform android --profile production
```

Before a production build, use a real HTTPS API URL and configure the required Google, Firebase/Expo push, Stripe, legal, and signing settings. Never put secrets or Firebase files in Git.

## Physical phone

Replace the emulator URLs in `.env` with a backend address reachable from the phone (LAN address or HTTPS URL), restart Metro, and ensure the phone can open that URL. `10.0.2.2` only works in the Android emulator.
