# Product Requirements Document (PRD)

## Todo Planner

**Status:** Draft based on current implementation  
**Last reviewed:** 2026-11-10
**Platforms:** Android (primary), web (partial); iOS project support is present but some features are Android-only.

## 1. Product Summary

Todo Planner is a personal planning app for task and routine management, notes, and job-application tracking. Users can create and edit tasks with date ranges, assign people, add and edit subtasks, track progress, and receive configurable local reminders. Settings cover appearance, task behavior, backups, synchronization, and device App Lock. A three-step animated welcome guide appears at each cold launch before opening the user's configured default page. App state is saved on-device and can optionally synchronize through a Docker-hosted backend and PostgreSQL.

## 2. Problem and Goals

Users need a lightweight place to plan larger tasks, break them into smaller actions, see progress, and remember recurring routines or approaching deadlines.

### Goals

- Create, update, complete, and remove tasks from the mobile app.
- Schedule task start dates and deadlines, and see existing task occupancy while choosing dates.
- Support daily routines with an optional installed-app association and reminders.
- Track task progress independently for each assigned user in Planner and Overview.
- Keep personal notes and manage job applications through their full lifecycle.
- Support editable user profiles with name, age, photo, and hobbies/daily routines.
- Keep task data available offline on each device.
- Optionally synchronize app state through the backend and PostgreSQL.
- Customize appearance, reminders, task behavior, launch destination, and calendar conventions.
- Export and restore a versioned JSON backup of planner data.
- Protect the app on supported mobile devices with a device PIN or biometrics.
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

1. Show a three-step animated welcome guide whenever the app is opened from a cold start.
2. The user moves through the guide with Back and Continue; Get started opens the configured default page.
3. Default destination options are Home, Tasks, Calendar, and Progress. Home is the initial default.
4. Home provides navigation to Tasks, Calendar, Progress, and People, a task summary, Notes access beneath the summary, and a job-application tracker.
5. If App Lock is enabled, require device PIN or biometric verification before showing app content.

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

### Manage notes and job applications

1. Open Notes from the Home dashboard beneath the Progress summary to create, edit, or delete notes.
2. Use the job-application tracker on Home to add a company, role, status, application date, optional job link, and notes.
3. Edit an application as its status changes, or remove it when it is no longer being tracked.
4. Notes and applications persist/synchronize with the rest of app state. Notes show their creating profile; applications are scoped to the active profile.

## 5. Functional Requirements

### FR-01: Welcome screen

- Display a full-screen, animated, three-step welcome guide on every cold app launch.
- Provide Back and Continue controls and a Get started action on the final step.
- Route Get started to the configured default destination (Home, Tasks, Calendar, or Progress).
- Keep user/task persistence independent from the welcome-screen behavior.

### FR-09: Home dashboard

- Use Home as the default destination; after the welcome guide, open the destination selected in Settings rather than always showing the task-creation form.
- Provide clear menu entries for My tasks, Calendar, Progress, and People.
- Show total, completed, and overdue task counts on Home.
- Show a Notes entry below the Progress summary and People navigation; Notes must not occupy a bottom tab.
- Show the active profile's job-application tracker below the Notes entry, including application count, interview count, and application cards.
- Selecting a menu entry opens the corresponding existing feature.

### FR-02: User profiles

- Create, activate, and edit a local profile with a name, optional email, optional age, optional gallery photo, and optional hobbies/daily routine description.
- Save profile changes in local app storage and include profile fields in the existing app-state synchronization payload.
- Selecting an existing profile changes the active user and updates the Planner, Calendar, Home, and Overview to that user's assigned tasks and progress.
- Store creator, deadline editor, assignees, and task participants as user IDs.
- Profile photos are selected from the device gallery and stored in app-private device storage; the photo URI and image file are excluded from backend synchronization.
- Do not represent this feature as secure authentication.
- The optional email is profile metadata only; it is not used to sign in or verify identity.

### FR-03: Task creation and management

- A task includes a required title, completion state, optional start date/deadline, creator, deadline editor, assignees, participants, and subtasks.
- Users can create and delete tasks; edit task titles and assignees; toggle task completion; edit dates, daily recurrence, time, and app association; and add, edit, toggle, or remove subtasks.
- Each assigned user has independent task and subtask completion state.
- Toggling a task synchronizes that user's subtasks to the same completion state without changing other assignees' progress.
- A task's shared completed status is true only when every assignee has completed it.
- Daily task completion and subtask progress reset independently per user each local day.
- A task with a deadline in the past and incomplete status is marked overdue/failed in relevant screens.
- Keep completed non-daily tasks and tasks past their deadline out of the active task list and show them in the task History view; daily routines remain active until their schedule ends.

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
- Use the configured default reminder time for deadline-day reminders.
- When enabled, schedule a configurable daily digest summarizing unfinished tasks at the selected local time.
- Respect the master notification switch, notification sound, and vibration settings. Android notification-channel behavior remains subject to device-level notification settings.
- Rebuild the native Android development/release app after changing native notification or installed-app modules. Expo Go does not provide the required Android remote-push support; local/native reminder testing uses the development build.

### FR-07: Overview and progress

- Provide a cross-feature activity summary for the active local profile, including assigned tasks, subtasks, notes created, tracked applications, and profile count.
- Summarize the active profile's current job-application statuses, including Applied, Screening, Interview, Offer, Rejected, and Cancelled.
- Derive counts from persisted current records; removing a note or application removes it from the corresponding count. This is not an immutable event/audit history.
- Show total, completed, failed/overdue, and ongoing task counts in an animated task progress ring.
- Show a subtask progress chart with Daily, Weekly, and Monthly view controls.
- Show a line chart of monthly job applications for the active profile over the latest six months, based on application dates.
- Show separate records for completed and failed tasks, including creator, assignees, and deadline.
- Do not embed the calendar in Overview.

### FR-08: Local persistence and synchronization

- Persist user profiles, active user ID, tasks, per-user task/subtask progress, app associations, and subtasks on-device in AsyncStorage.
- When the backend is reachable, fetch and save the complete app state through `/state`.
- Include notes and job applications in the complete local and synchronized app state.
- Keep Settings preferences in local app storage. Store a configured App Lock PIN only in device secure storage; do not include it in backups or backend synchronization.
- Poll the backend for state changes approximately every 2.5 seconds and save local changes after a short debounce.
- If the backend is unavailable, retain the local state and keep the app usable offline.
- The backend stores the current app state as one JSONB payload in the singleton `app_state` row. This is shared state, not per-device or per-user isolated server storage.

### FR-13: Preferences and task behavior

- Support System, Light, and Dark appearance, plus selectable blue, purple, green, or orange accent colors.
- Let users choose the cold-launch destination (Home, Tasks, Calendar, or Progress), 12/24-hour time display, and Sunday/Monday calendar week start.
- Provide a master reminder switch, configurable default reminder time, daily digest enable/time, default notification sound, and vibration toggle.
- Let users choose whether newly created tasks appear at the top or bottom, hide completed tasks in Planner and Calendar, enable completion haptics, and require confirmation before deleting tasks.
- Persist settings locally and apply each setting to its relevant screen or notification behavior.

### FR-14: Backup, restore, and synchronization controls

- Export a versioned JSON backup containing profiles (excluding device-local photo URIs), tasks, progress, notes, and job applications.
- Restore only recognized backup versions and validate the backup envelope before replacing current app data; ask for explicit confirmation.
- Show synchronization state and offer a manual Sync Now action.
- Clearly disclose that the current backend contains one shared app state; manual sync and clearing data can affect other connected devices.
- Clear planner app data only after explicit confirmation. This does not clear unrelated app preferences or the device-secure App Lock PIN.

### FR-15: App Lock and support information

- On supported Android/iOS builds, allow App Lock using a 4–6 digit PIN stored in device secure storage or enrolled device biometrics.
- Lock at cold start and when returning from the background; keep protected content behind the lock screen until successfully verified.
- App Lock protects this device only and is not server-side authentication or account isolation. Do not expose the PIN in backup, logs, or synchronized state.
- Show app version and in-app privacy/terms information, and allow users to compose and share feedback or bug reports using an available device share target.
- The app does not claim to delete an authenticated account because authenticated accounts do not exist.

### FR-10: Per-user task progress

- Store completion and completion date separately for each user on a task, with individual completion values for every subtask.
- Show only tasks assigned to the active profile in that profile's Planner, Calendar, Home summary, and Overview; older tasks without assignees remain visible to their creator.
- Preserve per-user progress when switching profiles, restarting offline, or synchronizing app state.
- Migrate existing shared completion status to each existing assignee when older task data is loaded.
- Recalculate the task's shared completion status from all assignees; do not overwrite other users' individual progress when one user checks off a task.

### FR-11: Notes

- Users can create, view, edit, and delete notes with a required title and body.
- Record the creating local profile and created/updated timestamps for each note.
- Show all saved notes in the Notes screen opened from Home.
- Persist notes in AsyncStorage and include them in the existing `/state` synchronization payload.
- Normalize older app-state payloads that do not contain notes without breaking existing tasks or profiles.

### FR-12: Job-application tracker

- Show a job-application tracker on Home, scoped to the active local profile.
- A job application has required company and role fields; status (`Applied`, `Screening`, `Interview`, `Offer`, `Rejected`, or `Cancelled`); optional application date, job-posting URL, and notes.
- Allow users to create, view, edit (including status changes), and delete applications.
- Default new application status to `Applied` and date to the current local date.
- Show the number of tracked applications and interviews, plus each application's status and available details.
- Allow users to set an application status to `Cancelled`, distinct from `Rejected`.
- Allow exporting the active profile's job applications as a UTF-8 CSV spreadsheet that opens in Excel, through browser download on web and the system share sheet on native platforms.
- Persist application records in AsyncStorage and include them in the existing `/state` synchronization payload.
- Normalize older app-state payloads that do not contain job applications without breaking existing records.

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

- `id`, `name`, optional `email`, optional `age`, `photoUri`, `dailyFocus`
- The profile photo URI points to an image copied into app-private device storage; photo bytes are not part of the backend JSON state.
- The email is local profile metadata (included in the existing shared app-state synchronization payload), not an authentication identifier.

### App preferences

- Locally stored preferences include theme mode, accent color, default view, time format, week start, reminder/digest configuration, task list behavior, completion feedback, deletion confirmation, and App Lock method/state.
- App Lock PIN is stored separately in the platform secure store and is excluded from app backups and server synchronization.

### Per-user task progress

- `Task.progressByUserId[userId]`: `completed`, `completedOn`, and `subtasks[subtaskId]`.
- `Task.completed` and each `Subtask.completed` remain aggregate compatibility fields, derived from all assignees' progress.

### Note

- `id`, `title`, `content`, `createdByUserId`, `createdAt`, `updatedAt`

### Job application

- `id`, `company`, `role`, `status`, `appliedDate`, `jobUrl`, `notes`
- `createdByUserId`, `createdAt`, `updatedAt`
- `status` is one of `Applied`, `Screening`, `Interview`, `Offer`, or `Rejected`.

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
- **Backup safety:** import must recognize the supported format/version and confirm before replacing data; never import the App Lock PIN or device-local photo paths.
- **App Lock:** use device secure storage and device biometric APIs; never present local profiles or App Lock as account authentication.
- **Distribution:** a sideloaded APK needs no Expo Go or Metro at runtime. A new APK is required after native module changes.

## 9. Acceptance Criteria

- Every cold app launch shows the animated three-step guide; Get started opens the selected default page.
- If App Lock is enabled, app content remains covered until PIN or biometric verification succeeds at cold start and after returning from the background.
- Settings persist theme mode, accent color, default view, time format, and week-start choices and apply them to the UI.
- Reminder settings control the master notification switch, default reminder time, daily digest, sound, and vibration on supported mobile platforms.
- Task behavior settings control new-task position, completed-task visibility, completion haptics, and task-delete confirmation.
- Users can export and restore a versioned JSON backup, see sync status, trigger Sync Now, and clear planner data after a warning/confirmation.
- Settings shows the app version, privacy/terms information, a feedback share action, and a disclosure that profiles/email are not authenticated accounts.
- Home opens with feature navigation and task counts, without displaying the task-creation form.
- My tasks opens the existing task planner; Calendar, Progress, and People menu entries open their respective features.
- Notes is accessible from Home below the Progress summary and People menu entry and is absent from the bottom tab bar.
- Users can create, edit, and delete notes; changes persist through app restart and state synchronization.
- Users can edit task titles and assignees, change date and daily-task settings, and add, edit, complete, or delete subtasks.
- Home's job tracker shows only the active profile's applications and supports adding, editing, changing status, and deleting records.
- Users can export the active profile's job tracker to an Excel-compatible CSV file.
- Overview summarizes active-profile task/subtask, notes, and job-application totals, including counts for each application status and Cancelled.
- Job-application details and statuses persist through app restart and state synchronization.
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
- The backend is a shared singleton state, so Sync Now and Clear app data can affect other connected devices; it is not safe for unrelated users without server-side account isolation.
- Feedback is shared through the device share sheet; the app has no configured support endpoint or developer email address.
- Privacy and terms are in-app informational text and have not undergone legal review.
- The backend uses permissive CORS and default credentials in local Docker configuration; production security and secrets management are not configured.
- Release APK signing uses the debug keystore and is not suitable for Play Store publishing.

## 11. Recommended Improvements

These are proposed follow-up items, not part of the current implementation.

### P1 — Complete existing task workflows

- Make task-period choices truthful: implement weekly/monthly recurrence or remove those choices until supported.
- Add task search, status filters (ongoing, completed, overdue), and sorting by deadline.
- Add a task detail/edit screen so long task lists remain readable and edits do not depend on inline controls.

### P2 — Improve reliability and personal data handling

- Add conflict-safe per-account synchronization before supporting concurrent devices or unrelated users.
- Add a real support endpoint and legally reviewed privacy/terms pages before public distribution.
- Load actual installed-app icons in the daily routine picker.

### P3 — Prepare for wider release

- Add Indonesian and English localization and verify layouts with larger accessibility font sizes.
- Configure a private production signing key, app identity, privacy notice, and Play Store release workflow.

## 12. Current Profile and Progress Feature

- The People screen creates and edits local profiles, including optional email (not sign-in), age, gallery photo, and daily-focus text.
- Gallery photos are copied to app-private storage so the profile picture remains available after the picker cache is cleared.
- Tasks and subtasks retain independent completion state for each assignee. Planner, Calendar, Home counts, and Overview are scoped to the active profile.
- Profile metadata and per-user progress are persisted in the existing app-state record. Gallery image files remain device-local and are not synchronized as image uploads.

## 13. Notes and Job-Application Tracker

- Notes are managed on the Notes screen opened from the Home dashboard; Notes is not a bottom tab.
- Each local profile sees and manages its own job applications in the Home tracker.
- Job applications support company, role, application status, application date, job-posting URL, and free-form notes, with create, edit, and delete operations.
- Notes are available across local profiles and identify their creating profile; job applications are scoped to the active profile.
- Notes and job applications share the app's AsyncStorage and `/state` persistence/synchronization path.
