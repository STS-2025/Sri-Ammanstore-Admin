# Sri Amman Store Scanner

Standalone Expo / React Native app for pairing a phone with the existing Sri Amman Store billing scanner and sending product barcodes to Firestore.

## Features

- Scans the billing page's session QR code inside the app.
- Checks the session ID and security token against the `scannerSessions` Firestore document.
- Uses the native camera for common retail barcodes (EAN, UPC, Code 128/39/93, ITF-14, Codabar) and other Expo Camera formats.
- Shows camera startup/errors and provides a camera retry action if the preview does not start.
- Includes a **Reconnect admin** action to revalidate the current billing session without clearing recent scans.
- Keeps one rear-camera preview and one QR-plus-barcode analyzer mounted while switching between pairing and product scanning.
- Sends scan events in the same Firestore document shape used by the web scanner page.
- Supports the `sriammanstore://scanner?s=<sessionId>&t=<token>` app link.
- Keeps the existing web app and its scanner page unchanged.

## Configure Firebase

1. In the Firebase Console, use the same Firebase project as the admin web app and register a Firebase **Web app** if one is not already registered.
2. Copy `.env.example` to `.env`.
3. Fill in the Firebase web app configuration values:

   ```dotenv
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   EXPO_PUBLIC_FIREBASE_APP_ID=...
   ```

   Use the values for the same project configured in the admin app. Do not commit `.env`.

4. Confirm the project's Firestore security rules allow the scanner app to read the active session, update its connection fields, and create documents in that session's `scanEvents` subcollection. This client app does not bypass Firestore security rules.

## Run on a device

From this folder:

```bash
npm install
npx expo start
```

Open the project in Expo Go on a physical phone. Grant camera permission, point the in-app camera at the QR code displayed on the billing computer, then scan product barcodes. The phone and billing computer must both be online.

## Build an Android APK

Install and sign in to EAS CLI, then run:

```bash
npm install
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

The `preview` profile produces an installable APK. The Firebase values must also be configured as EAS environment variables for cloud builds.

## QR code behavior

The current admin app displays an HTTPS URL containing `s` and `t` query parameters. This app scans that QR inside its own camera screen and pairs directly with the Firestore session; users should open this app before scanning the billing QR. The custom `sriammanstore://` link is also supported. QR payloads using `sessionId`/`token` (including JSON payloads) are accepted as well; all formats are still checked against the Firestore session and security token.
