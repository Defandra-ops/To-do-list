# Todo App

Expo + React Native todo app with an optional Bun + PostgreSQL backend.

## What To Run

- Run the mobile app from `frontend/`.
- If you want the database/backend, run Docker in the project root.
- On Android emulator, always start Expo from `frontend/`, not the root folder.

## Prerequisites

Install these first:
- Node.js 18+ and npm
- Docker Desktop
- Android Studio emulator or Expo Go on a real phone
- Bun only if you want to run the backend outside Docker

## Install

From the project root:

```bash
npm install
```

Then install frontend dependencies:

```bash
cd frontend
npm install
```

If you want the backend locally with Bun:

```bash
cd ../backend
bun install
```

## Safe Run Order

### 1. Start the Android emulator first

Make sure the emulator is fully booted before Expo starts.

Check ADB:

```bash
adb devices
```

You should see something like:

```txt
emulator-5554   device
```

If it is offline or missing, restart the emulator before continuing.

### 2. Start the frontend from the correct folder

Use this exact command:

```bash
cd C:\xampp\htdocs\todo-app\frontend
npx expo start --clear --port 8081
```

### One-command Windows launch

If you want the easiest startup on Windows, use the helper script from the project root:

```bash
npm run android:auto
```

What it does:
- starts ADB
- boots the Android emulator if needed
- reverses port 8081
- starts Expo from `frontend/`

This avoids manually running `adb kill`, `adb start-server`, or `adb reverse`.

Important:
- Do not run Expo from the project root.
- Use `--port 8081`, not `--port--8081`.
- If 8081 is busy, stop the other Expo session first.

### 3. Connect Android

If you are using the emulator, run:

```bash
adb reverse tcp:8081 tcp:8081
```

Then press `a` in the Expo terminal to open Android.

### 4. If the emulator gets stuck

Cold boot it again:

```bash
adb kill-server
adb start-server
```

Then restart the emulator and run Expo again.

## Optional Backend + Database

If you want PostgreSQL and the Bun backend:

```bash
docker compose up --build
```

This starts:
- PostgreSQL on `localhost:5432`
- Backend API on `localhost:3000`

Stop it with:

```bash
docker compose down
```

### Realtime Sync Between Expo Go And Web

To keep data matched between Expo Go and web, both clients must point to the same backend server.

1. Start backend/database:

```bash
docker compose up --build
```

2. Set API URL before starting Expo.

For Android emulator:

```bash
set EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

For real phone on same Wi-Fi (replace with your PC LAN IP):

```bash
set EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

3. Start frontend:

```bash
cd frontend
npx expo start --clear
```

Notes:
- Web and phone will auto-sync state through backend polling.
- If one device is offline, it keeps local data and syncs when backend becomes reachable.

## Local Backend Without Docker

If PostgreSQL is already installed locally:

1. Update `DATABASE_URL` if needed.
2. Run:

```bash
cd backend
bun run dev
```

## Useful Commands

Frontend:

```bash
cd frontend
npm run start
npm run web
npm run android
```

Backend:

```bash
cd backend
bun run dev
bun run start
```

## Notes

- Task data is saved on the device with AsyncStorage in the frontend.
- If Expo Go shows "Failed to download remote update", close Expo Go, restart the emulator, and start Expo again from `frontend/`.

## Build Android App

There are two ways to make an Android app from this project:

### 1. Local development build

Use this if you want to run the app on your emulator or phone while developing:

```bash
cd frontend
npx expo run:android
```

This builds and installs the app on the connected Android device or emulator.

### 2. Installable APK/AAB build

Use Expo Application Services if you want a shareable Android build:

```bash
cd frontend
npx eas build:configure
npx eas build -p android
```

Notes:
- `APK` is easier for direct installation.
- `AAB` is usually for Google Play Store submission.
- If you only want a test install on your emulator, `npx expo run:android` is the fastest option.

## Install On A Real Phone Without Expo Go

If you want to install the app directly on your Android phone and not use Expo Go, use one of these:

### Option 1: Development install on USB connected phone

Use this while developing:

1. Enable **Developer Options** on your phone.
2. Turn on **USB debugging**.
3. Connect the phone to your PC with a USB cable.
4. Check that ADB sees the phone:

```bash
adb devices
```

5. Build and install the app:

```bash
cd frontend
npx expo run:android
```

This installs a custom app on your phone without Expo Go.

### Option 2: Release APK install

Use this if you want a normal installable app file:

```bash
cd frontend
npx eas build:configure
npx eas build -p android
```

After the build finishes, download the APK/AAB and install it on your phone.

Notes:
- `expo run:android` is best for testing and development.
- `eas build -p android` is best for sharing or final release.
- You do not need Expo Go for either option.
