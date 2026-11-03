# Product Requirements Document (PRD)

## Todo Planner

**Status:** Draft based on current implementation  
**Last reviewed:** 2026-11-03  
**Platforms:** Android (primary), web (partial); iOS project support is present but some features are Android-only.

## 1. Product Summary

Todo Planner is a task and routine tracking app for individuals or small groups. Users can create tasks with date ranges, assign people, add subtasks, track progress, and receive local reminders. Daily tasks can be associated with an installed Android app, such as Duolingo, or with an offline habit, such as jogging. Task state is saved on-device and can optionally synchronize through a Docker-hosted backend and PostgreSQL.

## 2. Problem and Goals

Users need a lightweight place to plan larger tasks, break them into smaller actions, see progress, and remember recurring routines or approaching deadlines.

### Goals

- Create, update, complete, and remove tasks from the mobile app.
- Schedule task start dates and deadlines, and see existing task occupancy while choosing dates.
- Support daily routines with an optional installed-app association and reminders.
- Track task progress and completion in an Overview screen.
- Keep task data available offline on each device.
- Optionally synchronize app state through the backend and PostgreSQL.
- Build an Android APK that runs without Expo Go.

### Out of Scope

- User accounts with passwords, email verification, or server-side authorization.
- A public social network, invitations, or multi-user collaboration with conflict resolution.
- Automatic launching of an associated app when a reminder is tapped.
- Calendar-provider integration (Google Calendar, Outlook, or Android Calendar).
- Production release signing and Play Store publication setup.

## 3. Users and Roles

- **Personal user:** creates and manages tasks and recurring habits on one device.
- **Named in-app user:** a local profile name used to identify task creator, assignees, and participants. This is not an authenticated account.
- **Backend operator:** starts Docker Compose and can inspect PostgreSQL through TablePlus or another SQL client.

## 4. Navigation and Main Flows

### First launch

1. Show a welcome screen once per app installation/device storage.
2. Tapping anywhere on the welcome screen marks it complete and opens the app tabs.
3. Later launches go directly to the tabs.

### Create a task

1. Open Planner and enter a task title.
2. Choose Daily, Weekly, or Monthly in the task-period control.
3. For Daily tasks, optionally choose an installed Android launcher app and choose a daily time.
4. Optionally select start date, deadline, and assignees.
5. Create the task, then add subtasks or edit its dates and daily settings on its task card.

### Review dates

1. Open Planner and tap the start-date or deadline control.
2. Browse the custom month grid and tap a date.
3. Review the tasks already occupying that date.
4. Confirm with “Use date” to apply it to the selected field.

The separate Calendar route remains in the project for notification navigation but is hidden from the tab bar. The Overview page does not contain a calendar.

### Complete a routine

1. Mark a daily task or its subtasks complete.
2. The task remains completed for the current local day.
3. On the next local day, the routine and its subtasks become incomplete again.

## 5. Functional Requirements

### FR-01: Welcome screen

- Display a full-screen welcome screen on first launch.
- Any screen tap starts the app.
- Persist completion using AsyncStorage so it is not shown again unless app data is cleared or the app is reinstalled.

### FR-02: User profiles

- Create or activate a profile by entering a name.
- Selecting an existing profile changes the active user.
- Store creator, deadline editor, assignees, and task participants as user IDs.
- Do not represent this feature as secure authentication.

### FR-03: Task creation and management

- A task includes a required title, completion state, optional start date/deadline, creator, deadline editor, assignees, participants, and subtasks.
- Users can create and delete tasks, toggle task completion, edit date milestones, and add, toggle, or remove subtasks.
- Toggling a parent task synchronizes its subtasks to the same completion state.
- A task with a deadline in the past and incomplete status is marked overdue/failed in relevant screens.

### FR-04: Daily routines and app association

- Daily tasks store a recurrence flag, daily time, optional app label/package ID, start date, and optional end date.
- If a daily task has no start date, the app uses the current local date as its start date.
- A daily task is considered scheduled on every date from its start date through its optional end date.
- Android users can search and select apps exposed as launcher activities on the device. Store the app label and Android package name with the task.
- Selecting “Habit without an app” leaves the app label and package ID empty.
- The selected app is an association/label only; tapping the task does not launch the associated app.
- Legacy task records without recurrence/app fields are normalized to non-daily tasks with an empty app association.

### FR-05: Date picker and occupied-date notes

- The Planner date picker displays a month grid with tappable dates.
- Dates occupied by scheduled tasks show markers.
- Tapping a date previews the tasks that overlap it and their date spans.
- The selected date is applied only after the user confirms.
- The Overview screen does not display a calendar.

### FR-06: Local notifications

- Request notification permission when reminder-capable tasks are present.
- On Android, use a high-importance task-reminder notification channel.
- For an active daily task, schedule a repeating local reminder one hour before its configured daily time; include the task title and app label when present.
- For an incomplete non-daily task with a future deadline, schedule reminders at 09:00 local time on the day before and the deadline day when those times are still in the future.
- When incomplete non-daily tasks exist, schedule a daily 09:00 reminder summarizing how many remain.
- Rebuild the native Android development/release app after changing native notification or installed-app modules. Expo Go does not provide the required Android remote-push support; local/native reminder testing uses the development build.

### FR-07: Overview and progress

- Show total, completed, failed/overdue, and ongoing task counts in an animated task progress ring.
- Show a subtask progress chart with Daily, Weekly, and Monthly view controls.
- Show separate records for completed and failed tasks, including creator, assignees, and deadline.
- Do not embed the calendar in Overview.

### FR-08: Local persistence and synchronization

- Persist users, active user ID, tasks, app associations, and subtasks on-device in AsyncStorage.
- When the backend is reachable, fetch and save the complete app state through `/state`.
- Poll the backend for state changes approximately every 2.5 seconds and save local changes after a short debounce.
- If the backend is unavailable, retain the local state and keep the app usable offline.
- The backend stores the current app state as one JSONB payload in the singleton `app_state` row. This is shared state, not per-device or per-user isolated server storage.

## 6. Data Model

### Task

- `id`, `title`
- `completed`, `completedOn`
- `isDaily`, `dailyTime`
- `appName`, `appPackageName`
- `startDate`, `endDate`
- `createdByUserId`, `deadlineByUserId`
- `participantUserIds`, `assignedUserIds`
- `subtasks[]` with `id`, `title`, and `completed`

### User

- `id`, `name`

### PostgreSQL tables

- `app_state`: singleton `id = 1`, JSONB `payload`, and `updated_at`; this is the frontend's current synchronization path.
- `todos`: legacy/standalone CRUD table exposed by `/todos`; the current Planner does not use this table for its task state.

## 7. Interfaces and Deployment

- **Frontend:** Expo SDK 54, React Native 0.81, Expo Router.
- **Android package:** `com.anonymous.frontend`.
- **Native app selection:** local Expo module using Android PackageManager launcher queries; available in a rebuilt Android development/release app, not in web or Expo Go.
- **Backend:** Bun server using PostgreSQL (`pg`) and Docker Compose.
- **API:** `/` health response, `/state` GET/PUT, and `/todos` CRUD endpoints.
- **Database:** PostgreSQL 16, database `todolist`, default local credentials configured in `docker-compose.yml`.
- **APK:** build from the Android Gradle project root with `frontend/android/gradlew.bat assembleRelease`; release currently uses the debug signing config for local sideloading.

## 8. Non-Functional Requirements

- **Offline behavior:** local task operations remain usable when the backend cannot be reached.
- **Persistence:** app state survives normal app restarts through AsyncStorage.
- **Platform safety:** installed-app discovery is restricted to Android launcher-visible apps and must not request broad access to all installed packages.
- **Notification behavior:** permissions may be denied; the app must continue to work, with visual task/deadline status still available.
- **Distribution:** a sideloaded APK needs no Expo Go or Metro at runtime. A new APK is required after native module changes.

## 9. Acceptance Criteria

- A fresh install shows the welcome screen; tapping it opens Planner, and subsequent launches skip it.
- A user can create a regular task, assign dates/users, add subtasks, complete it, and find its record in Overview.
- A user can create a Daily task and associate a launcher-visible installed Android app, or select a habit without an app.
- The selected app label and package ID persist after app restart and appear in the task card.
- A daily reminder is scheduled one hour before the configured daily time and includes the app label when selected.
- The Planner date picker marks occupied days and previews the tasks occupying the selected date.
- Task state persists locally when offline and synchronizes through `app_state` when the backend is reachable.
- The app can be built as a standalone Android APK and run without Expo Go.

## 10. Current Implementation Gaps

- The daily-time button calls time-picker state handlers, but the Planner currently does not render a `DateTimePicker` for that state. New daily tasks therefore use the default `09:00` time unless this UI is completed.
- Weekly and Monthly appear as task-period choices, but only `isDaily` is stored as a recurrence rule. Weekly/monthly recurrence is not implemented.
- The installed-app picker uses a generic device icon; it does not load the app's actual launcher icon.
- User profiles are names stored in shared app state, not authenticated accounts or isolated workspaces.
- PostgreSQL synchronization stores one whole state payload. Concurrent edits from multiple devices can overwrite each other; there is no record-level merge/conflict resolution.
- The backend uses permissive CORS and default credentials in local Docker configuration; production security and secrets management are not configured.
- Release APK signing uses the debug keystore and is not suitable for Play Store publishing.
