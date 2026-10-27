# Sri Amman Store — Mobile Barcode Scanner (React Native Android App)

This is the standalone **React Native + Expo** Android mobile app for **Sri Amman Store Grocery POS System**.

It turns any Android mobile phone into a high-speed wireless barcode scanner that connects directly to the Billing PC via Firebase Firestore Realtime.

---

## 📱 Features

1. **Deep Link Launch:** Scanning the connection QR code automatically launches `sriammanstore://scanner?s=<sessionId>&t=<token>`.
2. **Native Camera Barcode Reader:** Uses `expo-camera` supporting EAN-13, EAN-8, UPC-A, UPC-E, Code 128, and Code 39 barcodes.
3. **Audio & Haptic Feedback:** Plays crisp audio beep and triggers device vibration (`expo-haptics`) upon barcode detection.
4. **Debounced Throttled Dispatch:** 800ms cooldown prevents rapid multi-scans of the same physical item.
5. **Realtime Firestore Bridge:** Sends raw string barcodes directly to `scannerSessions/{sessionId}/scanEvents` in Firestore.

---

## 🚀 How to Build `SriAmmanStoreScanner.apk`

### Option A: Build APK using Expo EAS (Recommended for standalone APK file)

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure Build:**
   ```bash
   eas build:configure
   ```

4. **Build APK File:**
   ```bash
   eas build -p android --profile preview
   ```
   *Expo EAS will compile the standalone `.apk` file and provide a download link.*

5. Copy the generated `SriAmmanStoreScanner.apk` into your web server `/public/downloads/SriAmmanStoreScanner.apk` path so mobile users can download it directly when scanning the QR code!

---

### Option B: Local Android Build using Expo Prebuild

1. **Generate Android Project:**
   ```bash
   npx expo prebuild
   ```

2. **Build Release APK:**
   ```bash
   cd android && ./gradlew assembleRelease
   ```
   *The built APK will be located at `android/app/build/outputs/apk/release/app-release.apk`.*

---

## 🌐 Dual Mode Support

* **Web Mode:** Mobile users can scan the QR code and use the instant Web Camera Scanner in their mobile browser without downloading anything.
* **Native APK App Mode:** Mobile users can download `SriAmmanStoreScanner.apk` for maximum performance, hardware vibration, and offline camera capabilities.
