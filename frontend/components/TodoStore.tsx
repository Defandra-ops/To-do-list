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
  subtasks: Subtask[];
};

type TodoStoreValue = {
  tasks: Task[];
  addTask: (title: string, startDate?: string, endDate?: string) => void;
  removeTask: (taskId: string) => void;
  toggleTask: (taskId: string) => void;
  updateTaskMilestone: (taskId: string, startDate: string, endDate: string) => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  removeSubtask: (taskId: string, subtaskId: string) => void;
};

const TodoStoreContext = createContext<TodoStoreValue | null>(null);

const buildId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const initialTasks: Task[] = [
  {
    id: buildId(),
    title: 'Plan launch week',
    completed: false,
    startDate: '2026-04-14',
    endDate: '2026-04-25',
    subtasks: [
      { id: buildId(), title: 'Draft content calendar', completed: true },
      { id: buildId(), title: 'Coordinate visuals', completed: false },
    ],
  },
  {
    id: buildId(),
    title: 'Prepare onboarding flow',
    completed: false,
    startDate: '2026-04-15',
    endDate: '2026-05-02',
    subtasks: [
      { id: buildId(), title: 'Write welcome copy', completed: false },
      { id: buildId(), title: 'Add empty-state illustration', completed: false },
    ],
  },
];

export function TodoStoreProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const addTask = (title: string, startDate = '', endDate = '') => {
    const cleaned = title.trim();
    if (!cleaned) return;

    setTasks((prev) => [
      {
        id: buildId(),
        title: cleaned,
        completed: false,
        startDate,
        endDate,
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

        // Keep subtasks in sync when the big task is toggled.
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
      addTask,
      removeTask,
      toggleTask,
      updateTaskMilestone,
      addSubtask,
      toggleSubtask,
      removeSubtask,
    }),
    [tasks]
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
