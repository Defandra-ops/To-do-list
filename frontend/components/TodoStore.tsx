import React, { createContext, useContext, useMemo, useState } from 'react';

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

const TodoStoreContext = createContext<TodoStoreValue | null>(null);

const buildId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const initialUsers: UserAccount[] = [{ id: buildId(), name: 'Default user' }];

const initialTasks: Task[] = [];

export function TodoStoreProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<UserAccount[]>(initialUsers);
  const [activeUserId, setActiveUserId] = useState(initialUsers[0].id);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

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
