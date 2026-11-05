import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type Subtask = {
  id: string;
  title: string;
  completed: boolean;
};

export type UserTaskProgress = {
  completed: boolean;
  completedOn: string;
  subtasks: Record<string, boolean>;
};

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  completedOn: string;
  isDaily: boolean;
  dailyTime: string;
  appName: string;
  appPackageName: string;
  startDate: string;
  endDate: string;
  createdByUserId: string;
  deadlineByUserId: string;
  participantUserIds: string[];
  assignedUserIds: string[];
  subtasks: Subtask[];
  progressByUserId?: Record<string, UserTaskProgress>;
};

export type UserAccount = {
  id: string;
  name: string;
  age: number | null;
  photoUri: string;
  dailyFocus: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type JobApplicationStatus =
  | 'Applied'
  | 'Screening'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Cancelled';

export type JobApplication = {
  id: string;
  company: string;
  role: string;
  status: JobApplicationStatus;
  appliedDate: string;
  jobUrl: string;
  notes: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

type TodoStoreValue = {
  tasks: Task[];
  notes: Note[];
  jobApplications: JobApplication[];
  users: UserAccount[];
  activeUserId: string;
  addUser: (name: string) => void;
  updateUserProfile: (
    userId: string,
    updates: Partial<Pick<UserAccount, 'name' | 'age' | 'photoUri' | 'dailyFocus'>>
  ) => void;
  setActiveUserId: (userId: string) => void;
  addTask: (
    title: string,
    startDate?: string,
    endDate?: string,
    assignedUserIds?: string[],
    isDaily?: boolean,
    dailyTime?: string,
    appName?: string,
    appPackageName?: string
  ) => void;
  updateTaskDetails: (taskId: string, title: string, assignedUserIds: string[]) => void;
  removeTask: (taskId: string) => void;
  toggleTask: (taskId: string) => void;
  updateTaskMilestone: (
    taskId: string,
    startDate: string,
    endDate: string,
    isDaily?: boolean,
    dailyTime?: string,
    appName?: string,
    appPackageName?: string
  ) => void;
  addSubtask: (taskId: string, title: string) => void;
  updateSubtask: (taskId: string, subtaskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  removeSubtask: (taskId: string, subtaskId: string) => void;
  addNote: (title: string, content: string) => void;
  updateNote: (noteId: string, title: string, content: string) => void;
  removeNote: (noteId: string) => void;
  addJobApplication: (
    application: Pick<JobApplication, 'company' | 'role' | 'status' | 'appliedDate' | 'jobUrl' | 'notes'>
  ) => void;
  updateJobApplication: (
    applicationId: string,
    updates: Pick<JobApplication, 'company' | 'role' | 'status' | 'appliedDate' | 'jobUrl' | 'notes'>
  ) => void;
  removeJobApplication: (applicationId: string) => void;
};

type PersistedAppState = {
  users: UserAccount[];
  activeUserId: string;
  tasks: Task[];
  notes: Note[];
  jobApplications: JobApplication[];
};

const TodoStoreContext = createContext<TodoStoreValue | null>(null);

const buildId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const defaultUser: UserAccount = {
  id: 'default-user',
  name: 'Default user',
  age: null,
  photoUri: '',
  dailyFocus: '',
};
const initialUsers: UserAccount[] = [defaultUser];

const initialTasks: Task[] = [];
const initialNotes: Note[] = [];
const initialJobApplications: JobApplication[] = [];
const STORAGE_KEY = 'todo-app-state-v1';
const SYNC_INTERVAL_MS = 2500;
const REMINDER_DATA_KEY = 'todoAppReminder';

export const getUserTaskProgress = (task: Task, userId: string): UserTaskProgress => {
  const savedProgress = task.progressByUserId?.[userId];
  if (savedProgress) return savedProgress;

  return {
    completed: task.completed,
    completedOn: task.completedOn,
    subtasks: task.subtasks.reduce<Record<string, boolean>>((result, subtask) => {
      result[subtask.id] = subtask.completed;
      return result;
    }, {}),
  };
};

const getTaskAssigneeIds = (task: Pick<Task, 'assignedUserIds' | 'createdByUserId'>) =>
  task.assignedUserIds.length > 0 ? task.assignedUserIds : [task.createdByUserId];

const updateTaskAggregate = (
  task: Task,
  progressByUserId: Record<string, UserTaskProgress>,
  subtasks: Subtask[] = task.subtasks
): Task => {
  const assigneeIds = getTaskAssigneeIds(task);
  const assigneeProgress = assigneeIds.map(
    (userId) => progressByUserId[userId] ?? getUserTaskProgress(task, userId)
  );
  const completed = assigneeProgress.length > 0 && assigneeProgress.every((progress) => progress.completed);

  return {
    ...task,
    completed,
    completedOn: completed && task.isDaily ? getTodayIsoDate() : '',
    progressByUserId,
    subtasks: subtasks.map((subtask) => ({
      ...subtask,
      completed: assigneeProgress.length > 0 && assigneeProgress.every((progress) => progress.subtasks[subtask.id] === true),
    })),
  };
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const getLocalDateAt = (date: string, hour: number) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, hour, 0, 0, 0);
};

const getTodayIsoDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`;
};

async function syncTaskNotifications(tasks: Task[], requestPermission: boolean) {
  if (Platform.OS === 'web') return;

  const today = getTodayIsoDate();
  const activeTasks = tasks.filter((task) =>
    task.isDaily
      ? (!task.startDate || task.startDate <= today) && (!task.endDate || task.endDate >= today)
      : !task.completed && (!task.startDate || task.startDate <= today)
  );
  const permissions = await Notifications.getPermissionsAsync();
  const granted = permissions.granted || (requestPermission && (await Notifications.requestPermissionsAsync()).granted);
  if (!granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('task-reminders', {
      name: 'Task reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.content.data[REMINDER_DATA_KEY] === true)
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier))
  );

  const now = new Date();
  const scheduleReminder = (
    content: Notifications.NotificationContentInput,
    trigger: Notifications.NotificationTriggerInput
  ) =>
    Notifications.scheduleNotificationAsync({
      content: {
        ...content,
        data: { ...content.data, [REMINDER_DATA_KEY]: true },
        ...(Platform.OS === 'android' ? { channelId: 'task-reminders' } : {}),
      },
      trigger,
    });

  const dailyReminders = activeTasks
    .filter((task) => task.isDaily)
    .map((task) => {
      const [taskHour, taskMinute] = task.dailyTime.split(':').map(Number);
      const reminderMinutes = (taskHour * 60 + taskMinute - 60 + 1440) % 1440;
      return scheduleReminder(
        {
          title: 'Daily task in one hour',
          body: `${task.appName ? `${task.title} in ${task.appName}` : task.title} is scheduled for ${task.dailyTime}.`,
          data: { taskId: task.id, route: '/(tabs)/calendar' },
        },
        {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: Math.floor(reminderMinutes / 60),
          minute: reminderMinutes % 60,
        }
      );
    });

  const deadlineReminders = activeTasks.filter((task) => !task.isDaily).flatMap((task) => {
    if (!task.endDate || task.endDate < getTodayIsoDate()) return [];

    const reminders: Array<{ date: Date; body: string }> = [];
    const dayBefore = new Date(`${task.endDate}T00:00:00`);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayBeforeIso = `${dayBefore.getFullYear()}-${`${dayBefore.getMonth() + 1}`.padStart(2, '0')}-${`${dayBefore.getDate()}`.padStart(2, '0')}`;
    const nearDeadline = getLocalDateAt(dayBeforeIso, 9);
    if (nearDeadline > now) {
      reminders.push({ date: nearDeadline, body: `Due tomorrow: ${task.title}` });
    }

    const deadline = getLocalDateAt(task.endDate, 9);
    if (deadline > now) {
      reminders.push({ date: deadline, body: `Due today: ${task.title}` });
    }

    return reminders.map(({ date, body }) =>
      scheduleReminder(
        { title: 'Task deadline', body, data: { taskId: task.id, route: '/(tabs)/calendar' } },
        { type: Notifications.SchedulableTriggerInputTypes.DATE, date }
      )
    );
  });

  const ongoingTasks = activeTasks.filter((task) => !task.isDaily);
  const ongoingReminder = ongoingTasks.length > 0
    ? scheduleReminder(
        {
          title: 'Tasks still in progress',
          body: `You have ${ongoingTasks.length} unfinished task${ongoingTasks.length === 1 ? '' : 's'} to keep moving.`,
          data: { route: '/(tabs)/calendar' },
        },
        { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0 }
      )
    : Promise.resolve();

  await Promise.all([...dailyReminders, ...deadlineReminders, ongoingReminder]);
}

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  Platform.select({
    android: 'http://10.0.2.2:3000',
    ios: 'http://localhost:3000',
    default: 'http://localhost:3000',
  });

const serializeRemoteState = (state: PersistedAppState) =>
  JSON.stringify({
    ...state,
    users: state.users.map((user) => ({ ...user, photoUri: '' })),
  });

export function TodoStoreProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [activeUserId, setActiveUserId] = useState(initialUsers[0].id);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [jobApplications, setJobApplications] = useState<JobApplication[]>(initialJobApplications);
  const [isHydrated, setIsHydrated] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localSnapshotRef = useRef('');
  const remoteSnapshotRef = useRef('');
  const localPhotoUrisRef = useRef<Record<string, string>>({});
  const notesRef = useRef<Note[]>(initialNotes);
  const jobApplicationsRef = useRef<JobApplication[]>(initialJobApplications);
  const suppressNextRemoteSaveRef = useRef(false);
  const notificationPermissionRequestedRef = useRef(false);
  const notificationSyncQueueRef = useRef<Promise<void>>(Promise.resolve());

  const normalizeState = (
    payload: Partial<PersistedAppState>,
    preserveLocalPhotos = false
  ): PersistedAppState => {
    const nextUsers = Array.isArray(payload.users) && payload.users.length > 0
      ? payload.users.map((user) => ({
          ...user,
          age: typeof user.age === 'number' && Number.isInteger(user.age) && user.age > 0 ? user.age : null,
          photoUri: preserveLocalPhotos
            ? localPhotoUrisRef.current[user.id] ?? ''
            : typeof user.photoUri === 'string' ? user.photoUri : '',
          dailyFocus: typeof user.dailyFocus === 'string' ? user.dailyFocus : '',
        }))
      : initialUsers;
    const today = getTodayIsoDate();
    const nextTasks = Array.isArray(payload.tasks)
      ? payload.tasks.map((task) => {
          const isDaily = task.isDaily === true;
          const legacyCompletedOn = typeof task.completedOn === 'string' ? task.completedOn : '';
          const subtasks = Array.isArray(task.subtasks)
            ? task.subtasks.map((subtask) => ({ ...subtask, completed: subtask.completed === true }))
            : [];
          const assignedUserIds = Array.isArray(task.assignedUserIds)
            ? task.assignedUserIds.filter((userId): userId is string => typeof userId === 'string')
            : [];
          const createdByUserId = typeof task.createdByUserId === 'string' ? task.createdByUserId : nextUsers[0].id;
          const taskWithNormalizedUsers = {
            ...task,
            createdByUserId,
            assignedUserIds,
            isDaily,
            dailyTime: typeof task.dailyTime === 'string' ? task.dailyTime : '09:00',
            appName: typeof task.appName === 'string' ? task.appName : '',
            appPackageName: typeof task.appPackageName === 'string' ? task.appPackageName : '',
            subtasks,
          };
          const legacyCompleted = task.completed === true && (!isDaily || legacyCompletedOn === today);
          const legacySubtasks = new Map(subtasks.map((subtask) => [subtask.id, subtask.completed]));
          const savedProgress = task.progressByUserId && typeof task.progressByUserId === 'object'
            ? task.progressByUserId
            : {};
          const userIds = new Set([
            ...getTaskAssigneeIds(taskWithNormalizedUsers),
            ...Object.keys(savedProgress),
          ]);
          const progressByUserId = Array.from(userIds).reduce<Record<string, UserTaskProgress>>((result, userId) => {
            const previous = savedProgress[userId];
            const previousSubtasks = previous?.subtasks && typeof previous.subtasks === 'object'
              ? previous.subtasks
              : {};
            const completedOn = typeof previous?.completedOn === 'string' ? previous.completedOn : legacyCompletedOn;
            const completed = typeof previous?.completed === 'boolean' ? previous.completed : legacyCompleted;
            const completionExpired = isDaily && completed && completedOn !== today;
            result[userId] = {
              completed: completionExpired ? false : completed,
              completedOn: completionExpired ? '' : completedOn,
              subtasks: subtasks.reduce<Record<string, boolean>>((subtaskProgress, subtask) => {
                const savedValue = previousSubtasks[subtask.id];
                const legacyValue = legacySubtasks.get(subtask.id) ?? false;
                subtaskProgress[subtask.id] =
                  completionExpired ? false : typeof savedValue === 'boolean' ? savedValue : legacyValue;
                return subtaskProgress;
              }, {}),
            };
            return result;
          }, {});

          return updateTaskAggregate(
            taskWithNormalizedUsers as Task,
            progressByUserId,
            subtasks
          );
        })
      : initialTasks;
    const nextNotes = Array.isArray(payload.notes)
      ? payload.notes.reduce<Note[]>((result, note) => {
          if (!note || typeof note.id !== 'string') return result;
          result.push({
            id: note.id,
            title: typeof note.title === 'string' ? note.title : '',
            content: typeof note.content === 'string' ? note.content : '',
            createdByUserId: typeof note.createdByUserId === 'string' ? note.createdByUserId : nextUsers[0].id,
            createdAt: typeof note.createdAt === 'string' ? note.createdAt : '',
            updatedAt: typeof note.updatedAt === 'string' ? note.updatedAt : '',
          });
          return result;
        }, [])
      : notesRef.current;
    const validStatuses: JobApplicationStatus[] = [
      'Applied',
      'Screening',
      'Interview',
      'Offer',
      'Rejected',
      'Cancelled',
    ];
    const nextJobApplications = Array.isArray(payload.jobApplications)
      ? payload.jobApplications.reduce<JobApplication[]>((result, application) => {
          if (!application || typeof application.id !== 'string') return result;
          result.push({
            id: application.id,
            company: typeof application.company === 'string' ? application.company : '',
            role: typeof application.role === 'string' ? application.role : '',
            status: validStatuses.includes(application.status) ? application.status : 'Applied',
            appliedDate: typeof application.appliedDate === 'string' ? application.appliedDate : '',
            jobUrl: typeof application.jobUrl === 'string' ? application.jobUrl : '',
            notes: typeof application.notes === 'string' ? application.notes : '',
            createdByUserId: typeof application.createdByUserId === 'string'
              ? application.createdByUserId
              : nextUsers[0].id,
            createdAt: typeof application.createdAt === 'string' ? application.createdAt : '',
            updatedAt: typeof application.updatedAt === 'string' ? application.updatedAt : '',
          });
          return result;
        }, [])
      : jobApplicationsRef.current;
    const nextActiveUserId =
      typeof payload.activeUserId === 'string' && nextUsers.some((user) => user.id === payload.activeUserId)
        ? payload.activeUserId
        : nextUsers[0].id;

    return {
      users: nextUsers,
      tasks: nextTasks,
      notes: nextNotes,
      jobApplications: nextJobApplications,
      activeUserId: nextActiveUserId,
    };
  };

  const applyState = (nextState: PersistedAppState, suppressRemoteSave = false) => {
    if (suppressRemoteSave) {
      suppressNextRemoteSaveRef.current = true;
    }

    setUsers(nextState.users);
    setTasks(nextState.tasks);
    notesRef.current = nextState.notes;
    setNotes(nextState.notes);
    jobApplicationsRef.current = nextState.jobApplications;
    setJobApplications(nextState.jobApplications);
    setActiveUserId(nextState.activeUserId);
    localSnapshotRef.current = JSON.stringify(nextState);
  };

  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedState) {
          const localPayload = JSON.parse(savedState) as Partial<PersistedAppState>;
          const normalized = normalizeState(localPayload);
          localPhotoUrisRef.current = Object.fromEntries(
            normalized.users.filter((user) => user.photoUri).map((user) => [user.id, user.photoUri])
          );
          applyState(normalized);
          remoteSnapshotRef.current = serializeRemoteState(normalized);
        }
      } catch (error) {
        console.error('Failed to load local app state:', error);
      } finally {
        setIsHydrated(true);
      }

      if (!apiBaseUrl) return;

      try {
        const response = await fetch(`${apiBaseUrl}/state`);
        if (!response.ok) return;

        const serverPayload = (await response.json()) as Partial<PersistedAppState>;
        const normalized = normalizeState(serverPayload, true);
        const serverSnapshot = serializeRemoteState(normalized);

        if (serverSnapshot !== remoteSnapshotRef.current) {
          applyState(normalized, true);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        }
        remoteSnapshotRef.current = serverSnapshot;
      } catch (error) {
        console.error('Failed to load server app state:', error);
      }
    };

    loadState();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      const payload: PersistedAppState = {
        users,
        activeUserId,
        tasks,
        notes,
        jobApplications,
      };
      const snapshot = JSON.stringify(payload);
      const remoteSnapshot = serializeRemoteState(payload);
      localSnapshotRef.current = snapshot;

      try {
        await AsyncStorage.setItem(STORAGE_KEY, snapshot);
      } catch (error) {
        console.error('Failed to save local app state:', error);
      }

      if (!apiBaseUrl) return;

      if (suppressNextRemoteSaveRef.current) {
        suppressNextRemoteSaveRef.current = false;
        return;
      }

      if (remoteSnapshot === remoteSnapshotRef.current) return;

      try {
        const response = await fetch(`${apiBaseUrl}/state`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: remoteSnapshot,
        });
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        remoteSnapshotRef.current = remoteSnapshot;
      } catch (error) {
        console.error('Failed to save server app state:', error);
      }
    }, 450);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [activeUserId, isHydrated, jobApplications, notes, tasks, users]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    jobApplicationsRef.current = jobApplications;
  }, [jobApplications]);

  useEffect(() => {
    if (!isHydrated || Platform.OS === 'web') return;

    let isCurrent = true;
    const hasRemindableTasks = tasks.some((task) => !task.completed);
    const requestPermission = hasRemindableTasks && !notificationPermissionRequestedRef.current;
    if (requestPermission) notificationPermissionRequestedRef.current = true;

    notificationSyncQueueRef.current = notificationSyncQueueRef.current
      .then(() => syncTaskNotifications(tasks, requestPermission))
      .catch((error) => {
        if (isCurrent) console.error('Failed to sync task reminders:', error);
      });

    return () => {
      isCurrent = false;
    };
  }, [isHydrated, tasks]);

  useEffect(() => {
    if (!isHydrated) return;

    const resetDailyTasks = () => {
      const today = getTodayIsoDate();
      setTasks((currentTasks) => {
        let changed = false;
        const nextTasks = currentTasks.map((task) => {
          if (!task.isDaily) return task;
          let taskChanged = false;
          const progressByUserId = { ...task.progressByUserId };
          Object.entries(progressByUserId).forEach(([userId, progress]) => {
            const hasCompletedSubtasks = Object.values(progress.subtasks).some(Boolean);
            if (
              progress.completedOn === today ||
              (!progress.completed && !hasCompletedSubtasks)
            ) return;
            taskChanged = true;
            progressByUserId[userId] = {
              completed: false,
              completedOn: '',
              subtasks: Object.fromEntries(Object.keys(progress.subtasks).map((subtaskId) => [subtaskId, false])),
            };
          });
          if (!taskChanged) return task;
          changed = true;
          return updateTaskAggregate(task, progressByUserId);
        });
        return changed ? nextTasks : currentTasks;
      });
    };

    resetDailyTasks();
    const interval = setInterval(resetDailyTasks, 60_000);
    return () => clearInterval(interval);
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated || !apiBaseUrl) return;

    const timer = setInterval(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/state`);
        if (!response.ok) return;

        const serverPayload = (await response.json()) as Partial<PersistedAppState>;
        const normalized = normalizeState(serverPayload, true);
        const serverSnapshot = serializeRemoteState(normalized);

        if (serverSnapshot === remoteSnapshotRef.current) return;

        applyState(normalized, true);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        remoteSnapshotRef.current = serverSnapshot;
      } catch (error) {
        console.error('Failed to sync server app state:', error);
      }
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isHydrated]);

  const includeUser = (list: string[], userId: string) => {
    if (list.includes(userId)) return list;
    return [...list, userId];
  };

  const addUser = (name: string) => {
    const cleaned = name.trim();
    if (!cleaned) return;

    setUsers((prev) => {
      const existing = prev.find((user) => user.name.toLowerCase() === cleaned.toLowerCase());
      if (existing) {
        setActiveUserId(existing.id);
        return prev;
      }

      const nextUser: UserAccount = { id: buildId(), name: cleaned, age: null, photoUri: '', dailyFocus: '' };
      setActiveUserId(nextUser.id);
      return [nextUser, ...prev];
    });
  };

  const updateUserProfile: TodoStoreValue['updateUserProfile'] = (userId, updates) => {
    if (typeof updates.photoUri === 'string') {
      localPhotoUrisRef.current[userId] = updates.photoUri;
    }
    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, ...updates } : user)));
  };

  const addTask = (
    title: string,
    startDate = '',
    endDate = '',
    assignedUserIds: string[] = [activeUserId],
    isDaily = false,
    dailyTime = '09:00',
    appName = '',
    appPackageName = ''
  ) => {
    const cleaned = title.trim();
    if (!cleaned) return;

    const nextAssignedUserIds = assignedUserIds.length > 0 ? Array.from(new Set(assignedUserIds)) : [activeUserId];
    const nextStartDate = isDaily && !startDate ? getTodayIsoDate() : startDate;
    const progressByUserId = Array.from(new Set([...nextAssignedUserIds, activeUserId])).reduce<
      Record<string, UserTaskProgress>
    >((result, userId) => {
      result[userId] = { completed: false, completedOn: '', subtasks: {} };
      return result;
    }, {});

    setTasks((prev) => [
      {
        id: buildId(),
        title: cleaned,
        completed: false,
        completedOn: '',
        isDaily,
        dailyTime,
        appName: appName.trim(),
        appPackageName: appPackageName.trim(),
        startDate: nextStartDate,
        endDate,
        createdByUserId: activeUserId,
        deadlineByUserId: activeUserId,
        participantUserIds: [activeUserId],
        assignedUserIds: nextAssignedUserIds,
        subtasks: [],
        progressByUserId,
      },
      ...prev,
    ]);
  };

  const removeTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const updateTaskDetails = (taskId: string, title: string, assignedUserIds: string[]) => {
    const cleaned = title.trim();
    if (!cleaned) return;

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const nextAssignedUserIds = Array.from(new Set(assignedUserIds));
        const progressByUserId = { ...task.progressByUserId };
        nextAssignedUserIds.forEach((userId) => {
          if (!progressByUserId[userId]) {
            progressByUserId[userId] = { completed: false, completedOn: '', subtasks: {} };
          }
        });

        return updateTaskAggregate(
          {
            ...task,
            title: cleaned,
            assignedUserIds: nextAssignedUserIds.length > 0 ? nextAssignedUserIds : [task.createdByUserId],
          },
          progressByUserId
        );
      })
    );
  };

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const progress = getUserTaskProgress(task, activeUserId);
        const nextCompleted = task.isDaily
          ? !(progress.completed && progress.completedOn === getTodayIsoDate())
          : !progress.completed;
        const nextProgress: UserTaskProgress = {
          completed: nextCompleted,
          completedOn: task.isDaily && nextCompleted ? getTodayIsoDate() : '',
          subtasks: task.subtasks.reduce<Record<string, boolean>>((result, subtask) => {
            result[subtask.id] = nextCompleted;
            return result;
          }, {}),
        };
        return updateTaskAggregate(task, {
          ...task.progressByUserId,
          [activeUserId]: nextProgress,
        });
      })
    );
  };

  const updateTaskMilestone = (
    taskId: string,
    startDate: string,
    endDate: string,
    isDaily?: boolean,
    dailyTime?: string,
    appName?: string,
    appPackageName?: string
  ) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              startDate,
              endDate,
              isDaily: isDaily ?? task.isDaily,
              dailyTime: dailyTime ?? task.dailyTime,
              appName: appName?.trim() ?? task.appName,
              appPackageName: appPackageName?.trim() ?? task.appPackageName,
              deadlineByUserId: activeUserId,
              participantUserIds: includeUser(task.participantUserIds, activeUserId),
            }
          : task
      )
    );
  };

  const addSubtask = (taskId: string, title: string) => {
    const cleaned = title.trim();
    if (!cleaned) return;

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const nextSubtask = { id: buildId(), title: cleaned, completed: false };
        const subtasks = [...task.subtasks, nextSubtask];
        const userIds = new Set([
          ...Object.keys(task.progressByUserId ?? {}),
          ...getTaskAssigneeIds(task),
          activeUserId,
        ]);
        const progressByUserId = Array.from(userIds).reduce<Record<string, UserTaskProgress>>((result, userId) => {
          const previous = getUserTaskProgress(task, userId);
          result[userId] = {
            completed: false,
            completedOn: '',
            subtasks: { ...previous.subtasks, [nextSubtask.id]: false },
          };
          return result;
        }, {});
        return updateTaskAggregate(
          {
            ...task,
            participantUserIds: includeUser(task.participantUserIds, activeUserId),
          },
          progressByUserId,
          subtasks
        );
      })
    );
  };

  const updateSubtask = (taskId: string, subtaskId: string, title: string) => {
    const cleaned = title.trim();
    if (!cleaned) return;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((subtask) =>
                subtask.id === subtaskId ? { ...subtask, title: cleaned } : subtask
              ),
            }
          : task
      )
    );
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        const progress = getUserTaskProgress(task, activeUserId);
        const nextProgress = {
          ...progress,
          subtasks: {
            ...progress.subtasks,
            [subtaskId]: !progress.subtasks[subtaskId],
          },
        };
        const allDone = task.subtasks.length > 0 && task.subtasks.every(
          (subtask) => nextProgress.subtasks[subtask.id] === true
        );
        nextProgress.completed = allDone;
        nextProgress.completedOn = task.isDaily && allDone ? getTodayIsoDate() : '';

        return updateTaskAggregate(
          {
            ...task,
            participantUserIds: includeUser(task.participantUserIds, activeUserId),
          },
          {
            ...task.progressByUserId,
            [activeUserId]: nextProgress,
          }
        );
      })
    );
  };

  const removeSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        const nextSubtasks = task.subtasks.filter((subtask) => subtask.id !== subtaskId);
        const userIds = new Set([
          ...Object.keys(task.progressByUserId ?? {}),
          ...getTaskAssigneeIds(task),
        ]);
        const progressByUserId = Array.from(userIds).reduce<Record<string, UserTaskProgress>>((result, userId) => {
          const previous = getUserTaskProgress(task, userId);
          const subtasks = { ...previous.subtasks };
          delete subtasks[subtaskId];
          const allDone = nextSubtasks.length > 0 && nextSubtasks.every(
            (subtask) => subtasks[subtask.id] === true
          );
          result[userId] = {
            completed: allDone,
            completedOn: task.isDaily && allDone ? getTodayIsoDate() : '',
            subtasks,
          };
          return result;
        }, {});
        return updateTaskAggregate(task, progressByUserId, nextSubtasks);
      })
    );
  };

  const addNote = (title: string, content: string) => {
    const cleanedTitle = title.trim();
    const cleanedContent = content.trim();
    if (!cleanedTitle || !cleanedContent) return;

    const now = new Date().toISOString();
    setNotes((prev) => [
      {
        id: buildId(),
        title: cleanedTitle,
        content: cleanedContent,
        createdByUserId: activeUserId,
        createdAt: now,
        updatedAt: now,
      },
      ...prev,
    ]);
  };

  const updateNote = (noteId: string, title: string, content: string) => {
    const cleanedTitle = title.trim();
    const cleanedContent = content.trim();
    if (!cleanedTitle || !cleanedContent) return;

    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? { ...note, title: cleanedTitle, content: cleanedContent, updatedAt: new Date().toISOString() }
          : note
      )
    );
  };

  const removeNote = (noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
  };

  const addJobApplication: TodoStoreValue['addJobApplication'] = (application) => {
    const company = application.company.trim();
    const role = application.role.trim();
    if (!company || !role) return;
    const now = new Date().toISOString();
    setJobApplications((prev) => [
      {
        ...application,
        id: buildId(),
        company,
        role,
        jobUrl: application.jobUrl.trim(),
        notes: application.notes.trim(),
        createdByUserId: activeUserId,
        createdAt: now,
        updatedAt: now,
      },
      ...prev,
    ]);
  };

  const updateJobApplication: TodoStoreValue['updateJobApplication'] = (applicationId, updates) => {
    const company = updates.company.trim();
    const role = updates.role.trim();
    if (!company || !role) return;
    setJobApplications((prev) =>
      prev.map((application) =>
        application.id === applicationId
          ? {
              ...application,
              ...updates,
              company,
              role,
              jobUrl: updates.jobUrl.trim(),
              notes: updates.notes.trim(),
              updatedAt: new Date().toISOString(),
            }
          : application
      )
    );
  };

  const removeJobApplication = (applicationId: string) => {
    setJobApplications((prev) => prev.filter((application) => application.id !== applicationId));
  };

  const value = useMemo(
    () => ({
      tasks,
      notes,
      jobApplications,
      users,
      activeUserId,
      addUser,
      updateUserProfile,
      setActiveUserId,
      addTask,
      updateTaskDetails,
      removeTask,
      toggleTask,
      updateTaskMilestone,
      addSubtask,
      updateSubtask,
      toggleSubtask,
      removeSubtask,
      addNote,
      updateNote,
      removeNote,
      addJobApplication,
      updateJobApplication,
      removeJobApplication,
    }),
    [activeUserId, jobApplications, notes, tasks, users]
  );

  return <TodoStoreContext.Provider value={value}>{children}</TodoStoreContext.Provider>;
}

export function useTodoStore() {
  const context = useContext(TodoStoreContext);
  if (!context) {
    throw new Error('useTodoStore must be used within TodoStoreProvider');
  }
  return context;
}
