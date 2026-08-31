# Zambiel Staff Android

React Native staff companion for retail order handling. It uses authenticated HTTPS `/api/v1/staff` services and never connects to MariaDB.

Debug uses `http://10.0.2.2:3000`. The release URL is intentionally the non-routable `https://zambiel.example.invalid` until the approved domain is supplied in `src/config.ts`; do not publish a release build before changing and testing it.

Run `npm test`, `npm run typecheck`, and `android\gradlew.bat assembleDebug`. Receipt formatting supports 58 mm and 80 mm, but printing requires physical terminal/printer verification.

The existing Java package, React Native component/module names, signing environment keys, npm package name, and AsyncStorage keys remain as compatibility identifiers. Changing them is a separate native migration and is not required for customer-visible Zambiel branding.
