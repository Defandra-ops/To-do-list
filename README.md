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

### 2. Build and start the Android development app

For local notifications, install and run the native development build instead of Expo Go:

```bash
cd C:\xampp\htdocs\todo-app\frontend
npx expo run:android
```

### One-command Windows launch

If you want the easiest startup on Windows, use the helper script from the project root:

```bash
npm run android:auto
```

What it does:
- starts ADB
- boots `Todo_Phone_12GB_API_36` if no Android emulator is running
- builds and installs the Android development app
- starts Metro and opens the app from `frontend/`

This avoids manually running `adb kill`, `adb start-server`, or `adb reverse`.

Important:
- Do not run Expo from the project root.
- Use `--port 8081`, not `--port--8081`.
- If 8081 is busy, stop the other Expo session first.

### 3. Start Metro after the development app is installed

For later sessions, start Metro in development-client mode:

```bash
cd frontend
npx expo start --dev-client --clear --port 8081
```

Open the installed development app on the emulator. Expo Go does not support Android remote push notifications; use the development app for native notification features.

### 4. If the emulator gets stuck

Cold boot it again:

```bash
adb kill-server
adb start-server
```

Then restart the emulator and run Expo again.

## Optional Backend + Database

If you want PostgreSQL and the Bun backend:

```powershell
docker compose up -d --build
```

This starts:
- PostgreSQL on `localhost:5432`
- Backend API on `localhost:3000`

Stop it with:

```powershell
docker compose down
```

### Connect TablePlus

After starting Docker Compose, create a PostgreSQL connection in TablePlus with:

| Setting | Value |
| --- | --- |
| Host | `127.0.0.1` |
| Port | `5432` |
| User | `user` |
| Password | `password` |
| Database | `todolist` |
| SSL | Disabled for local Docker |

These are local development credentials from `docker-compose.yml`; do not expose this database or reuse these credentials in production. The PostgreSQL data is kept in the `postgres_data` Docker volume.

The backend creates the schema and query views when it starts. In TablePlus, refresh the `public` schema to see:

- `app_tasks` — task records and their nested subtasks/progress.
- `app_notes` — notes.
- `app_job_applications` — job applications.
- `app_users` — profiles.
- `app_state` — the original complete JSONB app state.
- `todos` — a legacy table; the current Planner does not store its tasks here.

The views make the records inside `app_state` easier to query. For example:

```sql
SELECT id, title, completed, start_date, end_date, assigned_user_ids
FROM app_tasks
ORDER BY title;
```

```sql
SELECT company, role, status, applied_date, job_url
FROM app_job_applications
ORDER BY applied_date DESC;
```

```sql
SELECT status, COUNT(*) AS application_count
FROM app_job_applications
GROUP BY status
ORDER BY status;
```

These are read-only views: changes made to records in the app appear in them after synchronization, but edit app data in the app rather than editing the views in TablePlus.

### Realtime Sync Between Expo Go And Web

To keep data matched between Expo Go and web, both clients must point to the same backend server.

1. Start backend/database:

```bash
docker compose up --build
```

2. Set API URL before starting Expo.

For Android emulator:

```powershell
$env:EXPO_PUBLIC_API_URL = "http://10.0.2.2:3000"
```

For real phone on same Wi-Fi (replace with your PC LAN IP):

```powershell
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.100:3000"
```

3. Start frontend:

```powershell
cd frontend
npx expo start --clear
```

Notes:
- Web and phone will auto-sync state through backend polling.
- If one device is offline, it keeps local data and syncs when backend becomes reachable.
- On the first connection to a database, the app loads the server's state. Back up any device-only data before connecting if the database is empty or contains different data.

### Document Tools (Android)

Open **Document tools** from Home to:

- Capture multiple document pages with the camera and combine them into one PDF.
- Export scanned pages individually as PNG or JPG.
- Select an image from the gallery and convert it to PDF, PNG, or JPG.
- Share the resulting file to save it elsewhere on the device or send it to another app.

Camera permission is requested when scanning. Image processing and PDF creation happen locally in the app. This first version does not convert Office documents or render existing PDFs into images.

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

### 2. Installable release APK

From the repository root, build a release APK with:

```bash
npm run build:android
```

The APK is written to `frontend/android/app/build/outputs/apk/release/app-release.apk`.
The command runs the Android Gradle release build locally. For a Google Play AAB or cloud build, use Expo Application Services.

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
npm run build:android
```

After the build finishes, copy `frontend/android/app/build/outputs/apk/release/app-release.apk` to your phone and install it.

Notes:
- `expo run:android` is best for testing and development.
- `npm run build:android` creates the local release APK.
- Expo Application Services can be used when you need a cloud build or Play Store AAB.
- You do not need Expo Go for either option.
