import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type Subtask = {
  id: string;
  title: string;
  completed: boolean;
};

export type Task = {
  id: string;
  title: string;
  completed: boolean;
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
  addTask: (title: string, startDate?: string, endDate?: string, assignedUserIds?: string[]) => void;
  removeTask: (taskId: string) => void;
  toggleTask: (taskId: string) => void;
  updateTaskMilestone: (taskId: string, startDate: string, endDate: string) => void;
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

  const normalizeState = (payload: Partial<PersistedAppState>): PersistedAppState => {
    const nextUsers = Array.isArray(payload.users) && payload.users.length > 0 ? payload.users : initialUsers;
    const nextTasks = Array.isArray(payload.tasks) ? payload.tasks : initialTasks;
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

  const addTask = (title: string, startDate = '', endDate = '', assignedUserIds: string[] = [activeUserId]) => {
    const cleaned = title.trim();
    if (!cleaned) return;

    const nextAssignedUserIds = assignedUserIds.length > 0 ? Array.from(new Set(assignedUserIds)) : [activeUserId];

    setTasks((prev) => [
      {
        id: buildId(),
        title: cleaned,
        completed: false,
        startDate,
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
        const nextCompleted = !task.completed;

     
        const syncedSubtasks = task.subtasks.map((subtask) => ({
          ...subtask,
          completed: nextCompleted,
        }));

        return {
          ...task,
          completed: nextCompleted,
          subtasks: syncedSubtasks,
        };
      })
    );
  };

  const updateTaskMilestone = (taskId: string, startDate: string, endDate: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              startDate,
              endDate,
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
