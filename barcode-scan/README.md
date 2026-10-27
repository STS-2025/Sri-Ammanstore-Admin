# Sri Amman Store Barcode Scanner

The Android scanner pairs with a billing screen through its `scannerSessions` QR
code. Scanned barcodes are sent to that session's `scanEvents` subcollection;
the open billing screen resolves the product and adds it to the current cart.
The scanner requires three matching detections and an exact inventory barcode
match before creating an event. Unmatched reads are shown on the phone but are
not sent to the billing screen.

## Build the Android APK

1. Configure the web app's Firebase values in the repository-root `.env.local`
   (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_PROJECT_ID`, and
   optionally `VITE_FIREBASE_STORAGE_BUCKET`).
2. In Firebase Console, enable **Authentication > Sign-in method > Anonymous**.
   The native scanner uses an anonymous Firebase account; Firestore rules still
   require the QR session token before it can connect or submit scan events.
3. From PowerShell at the repository root, run:

   ```powershell
   .\barcode-scan\build_android_apk.ps1
   ```

   The script builds the release APK with the same Firebase project as the web
   app and places it at `public/downloads/SriAmmanStoreScanner.apk`. Vite serves
   that file at `/downloads/SriAmmanStoreScanner.apk`, which is the download
   target used by the mobile connection page. Deploy the web app after building
   to publish the updated APK.

On the phone, open the billing QR page, download and install the APK, open
**Sri Amman Store Scanner**, choose **Connect Admin**, and scan the billing QR
code. Then use **Scan Barcode**; recognized products are added to the active
billing cart.
