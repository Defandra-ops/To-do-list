# Product Requirements Document (PRD)

## Todo Planner

**Status:** Draft based on current implementation  
**Last reviewed:** 2026-11-04
**Platforms:** Android (primary), web (partial); iOS project support is present but some features are Android-only.

## 1. Product Summary

Todo Planner is a task and routine tracking app for individuals or small groups. Users can create tasks with date ranges, assign people, add subtasks, track progress, and receive local reminders. Daily tasks can be associated with an installed Android app, such as Duolingo, or with an offline habit, such as jogging. Task state is saved on-device and can optionally synchronize through a Docker-hosted backend and PostgreSQL.

## 2. Problem and Goals

Users need a lightweight place to plan larger tasks, break them into smaller actions, see progress, and remember recurring routines or approaching deadlines.

### Goals

- Create, update, complete, and remove tasks from the mobile app.
- Schedule task start dates and deadlines, and see existing task occupancy while choosing dates.
- Support daily routines with an optional installed-app association and reminders.
- Track task progress independently for each assigned user in Planner and Overview.
- Support editable user profiles with name, age, photo, and hobbies/daily routines.
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

### App launch and home menu

1. Show the welcome screen whenever the app is opened from a cold start.
2. Tapping anywhere on the welcome screen opens the Home menu.
3. Home provides navigation to Tasks, Calendar, Progress, and People, plus a small task summary.
4. Open Tasks to create or manage tasks; do not show the task-creation form immediately after welcome.

### Create a task

1. From Home, choose My tasks and enter a task title.
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

- Display a full-screen welcome screen on every cold app launch.
- Any screen tap starts the app.
- Do not persist a completed-welcome flag; returning to the app from a cold start shows the welcome screen again.
- Keep user/task persistence independent from the welcome-screen behavior.

### FR-09: Home menu

- After the welcome screen, open a Home dashboard rather than the task-creation form.
- Provide clear menu entries for My tasks, Calendar, Progress, and People.
- Show total, completed, and overdue task counts on Home.
- Selecting a menu entry opens the corresponding existing feature.

### FR-02: User profiles

- Create, activate, and edit a local profile with a name, optional age, optional gallery photo, and optional hobbies/daily routine description.
- Save profile changes in local app storage and include profile fields in the existing app-state synchronization payload.
- Selecting an existing profile changes the active user and updates the Planner, Calendar, Home, and Overview to that user's assigned tasks and progress.
- Store creator, deadline editor, assignees, and task participants as user IDs.
- Profile photos are selected from the device gallery and stored in app-private device storage; the photo URI and image file are excluded from backend synchronization.
- Do not represent this feature as secure authentication.

### FR-03: Task creation and management

- A task includes a required title, completion state, optional start date/deadline, creator, deadline editor, assignees, participants, and subtasks.
- Users can create and delete tasks, toggle task completion, edit date milestones, and add, toggle, or remove subtasks.
- Each assigned user has independent task and subtask completion state.
- Toggling a task synchronizes that user's subtasks to the same completion state without changing other assignees' progress.
- A task's shared completed status is true only when every assignee has completed it.
- Daily task completion and subtask progress reset independently per user each local day.
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

- Persist user profiles, active user ID, tasks, per-user task/subtask progress, app associations, and subtasks on-device in AsyncStorage.
- When the backend is reachable, fetch and save the complete app state through `/state`.
- Poll the backend for state changes approximately every 2.5 seconds and save local changes after a short debounce.
- If the backend is unavailable, retain the local state and keep the app usable offline.
- The backend stores the current app state as one JSONB payload in the singleton `app_state` row. This is shared state, not per-device or per-user isolated server storage.

### FR-10: Per-user task progress

- Store completion and completion date separately for each user on a task, with individual completion values for every subtask.
- Show only tasks assigned to the active profile in that profile's Planner, Calendar, Home summary, and Overview; older tasks without assignees remain visible to their creator.
- Preserve per-user progress when switching profiles, restarting offline, or synchronizing app state.
- Migrate existing shared completion status to each existing assignee when older task data is loaded.
- Recalculate the task's shared completion status from all assignees; do not overwrite other users' individual progress when one user checks off a task.

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

- `id`, `name`, optional `age`, `photoUri`, `dailyFocus`
- The profile photo URI points to an image copied into app-private device storage; photo bytes are not part of the backend JSON state.

### Per-user task progress

- `Task.progressByUserId[userId]`: `completed`, `completedOn`, and `subtasks[subtaskId]`.
- `Task.completed` and each `Subtask.completed` remain aggregate compatibility fields, derived from all assignees' progress.

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

- Every cold app launch shows the welcome screen; tapping it opens Home.
- Home opens with feature navigation and task counts, without displaying the task-creation form.
- My tasks opens the existing task planner; Calendar, Progress, and People menu entries open their respective features.
- A user can create a regular task, assign dates/users, add subtasks, complete it, and find its record in Overview.
- A user can create a Daily task and associate a launcher-visible installed Android app, or select a habit without an app.
- The selected app label and package ID persist after app restart and appear in the task card.
- A daily reminder is scheduled one hour before the configured daily time and includes the app label when selected.
- The Planner date picker marks occupied days and previews the tasks occupying the selected date.
- Task state persists locally when offline and synchronizes through `app_state` when the backend is reachable.
- The app can be built as a standalone Android APK and run without Expo Go.
- A user can edit profile name, age, gallery photo, and hobby/daily routine text; changes survive app restart.
- Switching profiles shows only that profile's assigned tasks and independent task/subtask progress.
- Completing a task or subtask for one assignee does not change another assignee's progress.
- Legacy task completion migrates to the existing assignees without resetting saved progress.

## 10. Current Implementation Gaps

- Weekly and Monthly appear as task-period choices, but only `isDaily` is stored as a recurrence rule. Weekly/monthly recurrence is not implemented.
- The installed-app picker uses a generic device icon; it does not load the app's actual launcher icon.
- User profiles are names stored in shared app state, not authenticated accounts or isolated workspaces.
- PostgreSQL synchronization stores one whole state payload. Concurrent edits from multiple devices can overwrite each other; there is no record-level merge/conflict resolution.
- The backend uses permissive CORS and default credentials in local Docker configuration; production security and secrets management are not configured.
- Release APK signing uses the debug keystore and is not suitable for Play Store publishing.

## 11. Recommended Improvements

These are proposed follow-up items, not part of the current implementation.

### P1 — Complete existing task workflows

- Make task-period choices truthful: implement weekly/monthly recurrence or remove those choices until supported.
- Add task search, status filters (ongoing, completed, overdue), and sorting by deadline.
- Add a task detail/edit screen so long task lists remain readable and edits do not depend on inline controls.

### P2 — Improve reliability and personal data handling

- Add export/import for a local backup of tasks and profiles.
- Add notification settings and an in-app explanation when Android notification permission is denied.
- Load actual installed-app icons in the daily routine picker.
- Add visible sync status and conflict-safe synchronization before supporting concurrent devices.

### P3 — Prepare for wider release

- Add Indonesian and English localization and verify layouts with larger accessibility font sizes.
- Add onboarding help for recurring routines, assignments, and reminders.
- Configure a private production signing key, app identity, privacy notice, and Play Store release workflow.

## 12. Current Profile and Progress Feature

- The People screen creates and edits local profiles, including optional age, gallery photo, and daily-focus text.
- Gallery photos are copied to app-private storage so the profile picture remains available after the picker cache is cleared.
- Tasks and subtasks retain independent completion state for each assignee. Planner, Calendar, Home counts, and Overview are scoped to the active profile.
- Profile metadata and per-user progress are persisted in the existing app-state record. Gallery image files remain device-local and are not synchronized as image uploads.
