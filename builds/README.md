# FitTracker - Standalone Build & Beta Distribution Package

## Package Information
- **App Name:** FitTracker
- **Version:** 1.0.0
- **Package ID:** `com.fittracker.app`
- **Output Directory:** `/builds`

---

## Contents of `/builds`
1. `bundle/`: Production compiled Hermes Javascript bytecode for Android (`_expo/static/js/android/`) and iOS (`_expo/static/js/ios/`).
2. `FitTracker-v1.0.0.apk`: Compiled Android Package ready for distribution.

---

## Direct Installation Steps for Android Testers (Beta Testers)
1. Share `builds/FitTracker-v1.0.0.apk` via WhatsApp, Telegram, or Google Drive link.
2. On your Android phone, tap the received `.apk` file.
3. If prompted by Android security, grant temporary permission to **"Install from unknown sources"** for your file manager or browser.
4. Tap **Install** and open **FitTracker**.

---

## Re-building or Updating the Standalone APK
If you make code edits in the future and want to generate a new APK:
```bash
# Build APK in Expo Cloud (EAS)
npx eas-cli build -p android --profile preview

# Or build local standalone bundle
npx expo export --output-dir builds/bundle
```
