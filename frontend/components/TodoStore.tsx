import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type Subtask = {
  id: string;
  title: string;
  completed: boolean;
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
};

export type UserAccount = {
  id: string;
  name: string;
};

type TodoStoreValue = {
  tasks: Task[];
  users: UserAccount[];
  activeUserId: string;
  addUser: (name: string) => void;
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
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  removeSubtask: (taskId: string, subtaskId: string) => void;
};

type PersistedAppState = {
  users: UserAccount[];
  activeUserId: string;
  tasks: Task[];
};

const TodoStoreContext = createContext<TodoStoreValue | null>(null);

const buildId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const defaultUser: UserAccount = { id: 'default-user', name: 'Default user' };
const initialUsers: UserAccount[] = [defaultUser];

const initialTasks: Task[] = [];
const STORAGE_KEY = 'todo-app-state-v1';
const SYNC_INTERVAL_MS = 2500;
const REMINDER_DATA_KEY = 'todoAppReminder';

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

export function TodoStoreProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [activeUserId, setActiveUserId] = useState(initialUsers[0].id);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isHydrated, setIsHydrated] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localSnapshotRef = useRef('');
  const suppressNextRemoteSaveRef = useRef(false);
  const notificationPermissionRequestedRef = useRef(false);
  const notificationSyncQueueRef = useRef<Promise<void>>(Promise.resolve());

  const normalizeState = (payload: Partial<PersistedAppState>): PersistedAppState => {
    const nextUsers = Array.isArray(payload.users) && payload.users.length > 0 ? payload.users : initialUsers;
    const today = getTodayIsoDate();
    const nextTasks = Array.isArray(payload.tasks)
      ? payload.tasks.map((task) => {
          const isDaily = task.isDaily === true;
          const completedOn = typeof task.completedOn === 'string' ? task.completedOn : '';
          const completionExpired = isDaily && task.completed && completedOn !== today;
          return {
            ...task,
            completed: completionExpired ? false : task.completed,
            completedOn: completionExpired ? '' : completedOn,
            isDaily,
            dailyTime: typeof task.dailyTime === 'string' ? task.dailyTime : '09:00',
            appName: typeof task.appName === 'string' ? task.appName : '',
            appPackageName: typeof task.appPackageName === 'string' ? task.appPackageName : '',
          };
        })
      : initialTasks;
    const nextActiveUserId =
      typeof payload.activeUserId === 'string' && nextUsers.some((user) => user.id === payload.activeUserId)
        ? payload.activeUserId
        : nextUsers[0].id;

    return {
      users: nextUsers,
      tasks: nextTasks,
      activeUserId: nextActiveUserId,
    };
  };

  const applyState = (nextState: PersistedAppState, suppressRemoteSave = false) => {
    if (suppressRemoteSave) {
      suppressNextRemoteSaveRef.current = true;
    }

    setUsers(nextState.users);
    setTasks(nextState.tasks);
    setActiveUserId(nextState.activeUserId);
    localSnapshotRef.current = JSON.stringify(nextState);
  };

  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedState) {
          const localPayload = JSON.parse(savedState) as Partial<PersistedAppState>;
          applyState(normalizeState(localPayload));
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
        const normalized = normalizeState(serverPayload);
        const serverSnapshot = JSON.stringify(normalized);

        if (serverSnapshot !== localSnapshotRef.current) {
          applyState(normalized, true);
          await AsyncStorage.setItem(STORAGE_KEY, serverSnapshot);
        }
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
      };
      const snapshot = JSON.stringify(payload);
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

      try {
        await fetch(`${apiBaseUrl}/state`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: snapshot,
        });
      } catch (error) {
        console.error('Failed to save server app state:', error);
      }
    }, 450);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [activeUserId, isHydrated, tasks, users]);

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
          if (!task.isDaily || !task.completed || task.completedOn === today) return task;
          changed = true;
          return {
            ...task,
            completed: false,
            completedOn: '',
            subtasks: task.subtasks.map((subtask) => ({ ...subtask, completed: false })),
          };
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
        const normalized = normalizeState(serverPayload);
        const serverSnapshot = JSON.stringify(normalized);

        if (serverSnapshot === localSnapshotRef.current) return;

        applyState(normalized, true);
        await AsyncStorage.setItem(STORAGE_KEY, serverSnapshot);
      } catch {
        // Keep app usable offline; next successful poll will sync state.
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

      const nextUser = { id: buildId(), name: cleaned };
      setActiveUserId(nextUser.id);
      return [nextUser, ...prev];
    });
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
      },
      ...prev,
    ]);
  };

  const removeTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const nextCompleted = task.isDaily
          ? !(task.completed && task.completedOn === getTodayIsoDate())
          : !task.completed;

     
        const syncedSubtasks = task.subtasks.map((subtask) => ({
          ...subtask,
          completed: nextCompleted,
        }));

        return {
          ...task,
          completed: nextCompleted,
          completedOn: task.isDaily && nextCompleted ? getTodayIsoDate() : '',
          subtasks: syncedSubtasks,
        };
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
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed: false,
              completedOn: '',
              participantUserIds: includeUser(task.participantUserIds, activeUserId),
              subtasks: [
                ...task.subtasks,
                {
                  id: buildId(),
                  title: cleaned,
                  completed: false,
                },
              ],
            }
          : task
      )
    );
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        const nextSubtasks = task.subtasks.map((subtask) =>
          subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
        );

        const allDone = nextSubtasks.length > 0 && nextSubtasks.every((subtask) => subtask.completed);

        return {
          ...task,
          subtasks: nextSubtasks,
          completed: allDone,
          completedOn: task.isDaily && allDone ? getTodayIsoDate() : '',
          participantUserIds: includeUser(task.participantUserIds, activeUserId),
        };
      })
    );
  };

  const removeSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;

        const nextSubtasks = task.subtasks.filter((subtask) => subtask.id !== subtaskId);
        const allDone = nextSubtasks.length > 0 && nextSubtasks.every((subtask) => subtask.completed);

        return {
          ...task,
          subtasks: nextSubtasks,
          completed: allDone,
          completedOn: task.isDaily && allDone ? getTodayIsoDate() : '',
        };
      })
    );
  };

  const value = useMemo(
    () => ({
      tasks,
      users,
      activeUserId,
      addUser,
      setActiveUserId,
      addTask,
      removeTask,
      toggleTask,
      updateTaskMilestone,
      addSubtask,
      toggleSubtask,
      removeSubtask,
    }),
    [activeUserId, tasks, users]
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
