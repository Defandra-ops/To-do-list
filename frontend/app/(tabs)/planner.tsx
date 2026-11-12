import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getUserTaskProgress, useTodoStore, type Task } from '@/components/TodoStore';
import { LocalizedText as Text, LocalizedTextInput as TextInput } from '@/components/LocalizedText';
import { useAppSettings } from '@/components/AppSettings';
import { useAppTheme } from '@/components/useAppTheme';
import { useThemedStyles } from '@/components/useThemedStyles';
import { getInstalledApps, type InstalledApp } from '@/modules/installed-app-picker';
import { theme } from '@/constants/Colors';

type DraftMap = Record<string, string>;

type MilestoneDraft = {
  startDate: string;
  endDate: string;
  isDaily: boolean;
  dailyTime: string;
  appName: string;
  appPackageName: string;
};
type MilestoneDraftMap = Record<string, MilestoneDraft>;

type DatePickerTarget = {
  scope: 'new' | 'milestone';
  field: 'startDate' | 'endDate';
  taskId?: string;
};

type TimePickerTarget = {
  scope: 'new' | 'milestone';
  taskId?: string;
};

type AppPickerTarget = {
  scope: 'new' | 'milestone';
  taskId?: string;
};

type TaskTextEditor =
  | { kind: 'task' }
  | { kind: 'subtask'; taskId: string }
  | { kind: 'editSubtask'; taskId: string; subtaskId: string };

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalIsoDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const taskOccupiesDate = (task: { startDate: string; endDate: string; isDaily: boolean }, date: string) => {
  if (task.isDaily) return (!task.startDate || task.startDate <= date) && (!task.endDate || date <= task.endDate);
  if (task.startDate && task.endDate) return task.startDate <= date && date <= task.endDate;
  if (task.startDate) return task.startDate <= date;
  if (task.endDate) return task.endDate === date;
  return false;
};

const formatReadableDate = (date: string, language: 'en' | 'id') =>
  new Date(`${date}T00:00:00`).toLocaleDateString(language === 'id' ? 'id-ID' : 'en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

const formatTime = (time: string, language: 'en' | 'id', format: '12h' | '24h') => {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en', {
    hour: format === '24h' ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: format === '12h',
  });
};

const parseTime = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour || 0, minute || 0, 0, 0);
  return date;
};

const toTimeValue = (date: Date) => `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;

export default function PlannerScreen() {
  const theme = useAppTheme();
  const styles = useThemedStyles(baseStyles);
  const { language, preferences } = useAppSettings();
  const {
    tasks,
    users,
    activeUserId,
    addTask,
    updateTaskDetails,
    removeTask,
    toggleTask,
    updateTaskMilestone,
    addSubtask,
    updateSubtask,
    toggleSubtask,
    removeSubtask,
  } = useTodoStore();

  const router = useRouter();
  const activeUserName = users.find((user) => user.id === activeUserId)?.name ?? 'Default user';
  const isTaskCompletedForActiveUser = (task: (typeof tasks)[number]) => {
    const progress = getUserTaskProgress(task, activeUserId);
    return task.isDaily
      ? progress.completed && progress.completedOn === getLocalIsoDate()
      : progress.completed;
  };
  const [showHistory, setShowHistory] = useState(false);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [taskDraft, setTaskDraft] = useState('');
  const [taskPeriod, setTaskPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [dailyTimeDraft, setDailyTimeDraft] = useState(preferences.defaultDueTime);
  const [appNameDraft, setAppNameDraft] = useState('');
  const [appPackageNameDraft, setAppPackageNameDraft] = useState('');
  const [startDateDraft, setStartDateDraft] = useState('');
  const [endDateDraft, setEndDateDraft] = useState('');
  const [formError, setFormError] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskTitleDraft, setTaskTitleDraft] = useState('');
  const [taskAssigneeDraft, setTaskAssigneeDraft] = useState<string[]>([]);
  const [taskEditError, setTaskEditError] = useState('');
  const [subtaskDrafts, setSubtaskDrafts] = useState<DraftMap>({});
  const [textEditor, setTextEditor] = useState<TaskTextEditor | null>(null);
  const [textEditorDraft, setTextEditorDraft] = useState('');
  const [milestoneDrafts, setMilestoneDrafts] = useState<MilestoneDraftMap>({});
  const [activeDatePicker, setActiveDatePicker] = useState<DatePickerTarget | null>(null);
  const [activeTimePicker, setActiveTimePicker] = useState<TimePickerTarget | null>(null);
  const [activeAppPicker, setActiveAppPicker] = useState<AppPickerTarget | null>(null);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [appSearchDraft, setAppSearchDraft] = useState('');
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [appPickerError, setAppPickerError] = useState('');
  const [timePickerValue, setTimePickerValue] = useState(() => parseTime('09:00'));
  const [pickerPreviewDate, setPickerPreviewDate] = useState(getLocalIsoDate());
  const [pickerMonth, setPickerMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const taskListRef = useRef<FlatList<Task>>(null);
  const focusedInputTag = useRef<number | null>(null);
  const keyboardTopY = useRef<number | null>(null);
  const taskListScrollOffset = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const scrollFocusedInputAboveKeyboard = (topY: number) => {
    const inputTag = focusedInputTag.current;
    if (inputTag === null) return;

    UIManager.measureInWindow(inputTag, (_x, y, _width, height) => {
      const overlap = y + height + 16 - topY;
      if (overlap > 0) {
        taskListRef.current?.scrollToOffset({
          offset: taskListScrollOffset.current + overlap,
          animated: true,
        });
      }
    });
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      const topY = event.endCoordinates.screenY;
      keyboardTopY.current = topY;
      setKeyboardHeight(event.endCoordinates.height);
      requestAnimationFrame(() => scrollFocusedInputAboveKeyboard(topY));
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      focusedInputTag.current = null;
      keyboardTopY.current = null;
      setKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const pickerMonthDays = useMemo(() => {
    const weekday = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1).getDay();
    const firstWeekday = preferences.weekStartsOn === 'monday' ? (weekday + 6) % 7 : weekday;
    const daysInMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstWeekday + 1;
      if (day < 1 || day > daysInMonth) return '';
      const date = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), day);
      return formatIsoDate(date);
    });
  }, [pickerMonth, preferences.weekStartsOn]);

  const pickerOccupiedTasks = useMemo(
    () => tasks.filter(
      (task) =>
        (task.assignedUserIds.includes(activeUserId) ||
          (task.assignedUserIds.length === 0 && task.createdByUserId === activeUserId)) &&
        taskOccupiesDate(task, pickerPreviewDate)
    ),
    [activeUserId, pickerPreviewDate, tasks]
  );

  const filteredInstalledApps = useMemo(() => {
    const query = appSearchDraft.trim().toLowerCase();
    if (!query) return installedApps;
    return installedApps.filter((app) =>
      `${app.name} ${app.packageName}`.toLowerCase().includes(query)
    );
  }, [appSearchDraft, installedApps]);

  const userById = useMemo(() => {
    return users.reduce<Record<string, string>>((accumulator, user) => {
      accumulator[user.id] = user.name;
      return accumulator;
    }, {});
  }, [users]);
  const visibleTasks = useMemo(
    () => {
      const today = getLocalIsoDate();
      return tasks.filter((task) => {
        const belongsToUser = task.assignedUserIds.includes(activeUserId) ||
          (task.assignedUserIds.length === 0 && task.createdByUserId === activeUserId);
        if (!belongsToUser) return false;

        const completed = isTaskCompletedForActiveUser(task);
        const deadlinePassed = Boolean(task.endDate) && task.endDate < today;
        const archived = deadlinePassed || completed;
        return showHistory ? archived : !archived;
      });
    },
    [activeUserId, showHistory, tasks]
  );

  const focusPlannerInput = (inputTag: number) => {
    focusedInputTag.current = inputTag;
    const topY = keyboardTopY.current;
    if (Keyboard.isVisible() && topY !== null) {
      requestAnimationFrame(() => scrollFocusedInputAboveKeyboard(topY));
    }
  };

  const stats = useMemo(() => {
    const userTasks = tasks.filter(
      (task) =>
        task.assignedUserIds.includes(activeUserId) ||
        (task.assignedUserIds.length === 0 && task.createdByUserId === activeUserId)
    );
    const totalTasks = userTasks.length;
    const doneTasks = userTasks.filter((task) => getUserTaskProgress(task, activeUserId).completed).length;
    const allSubtasks = userTasks.flatMap((task) =>
      task.subtasks.map((subtask) => ({
        ...subtask,
        completed: getUserTaskProgress(task, activeUserId).subtasks[subtask.id] === true,
      }))
    );
    const doneSubtasks = allSubtasks.filter((subtask) => subtask.completed).length;
    const withDeadlines = userTasks.filter((task) => task.endDate).length;
    return {
      totalTasks,
      doneTasks,
      allSubtasks: allSubtasks.length,
      doneSubtasks,
      withDeadlines,
    };
  }, [activeUserId, tasks]);

  const addTaskFromDraft = (draft = taskDraft) => {
    if (!draft.trim()) return false;

    if (startDateDraft && !isIsoDate(startDateDraft)) {
      setFormError('Start date must use YYYY-MM-DD');
      return false;
    }

    if (endDateDraft && !isIsoDate(endDateDraft)) {
      setFormError('Deadline must use YYYY-MM-DD');
      return false;
    }

    if (startDateDraft && endDateDraft && startDateDraft > endDateDraft) {
      setFormError('Start date must be before deadline');
      return false;
    }

    const assigneeIds = selectedAssigneeIds.length > 0 ? selectedAssigneeIds : [];
    addTask(
      draft,
      startDateDraft,
      endDateDraft,
      assigneeIds,
      taskPeriod === 'daily',
      dailyTimeDraft,
      appNameDraft,
      appPackageNameDraft
    );
    setTaskDraft('');
    setStartDateDraft('');
    setEndDateDraft('');
    setTaskPeriod('monthly');
    setDailyTimeDraft(preferences.defaultDueTime);
    setAppNameDraft('');
    setAppPackageNameDraft('');
    setSelectedAssigneeIds([]);
    setFormError('');
    return true;
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const setSubtaskDraft = (taskId: string, value: string) => {
    setSubtaskDrafts((prev) => ({ ...prev, [taskId]: value }));
  };

  const toggleTaskWithFeedback = (taskId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggleTask(taskId);
    if (preferences.completionFeedback && preferences.vibrationEnabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        .catch((error) => console.error('Task completion haptic failed:', error));
    }
  };

  const toggleSubtaskWithFeedback = (taskId: string, subtaskId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggleSubtask(taskId, subtaskId);
    if (preferences.completionFeedback && preferences.vibrationEnabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        .catch((error) => console.error('Subtask completion haptic failed:', error));
    }
  };

  const confirmRemoveTask = (taskId: string, title: string) => {
    if (!preferences.confirmBeforeDelete) {
      removeTask(taskId);
      return;
    }
    if (Platform.OS === 'web') {
      if (window.confirm(`“${title}” will be permanently removed.`)) removeTask(taskId);
      return;
    }
    Alert.alert('Delete task?', `“${title}” will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeTask(taskId) },
    ]);
  };

  const openDatePicker = (target: DatePickerTarget) => {
    setFormError('');
    const currentDate = getDraftDate(target) || getLocalIsoDate();
    setPickerPreviewDate(currentDate);
    setPickerMonth(new Date(`${currentDate}T00:00:00`));
    setPickerMonth((currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
    setActiveDatePicker(target);
  };

  const getDraftDate = (target: DatePickerTarget) => {
    if (target.scope === 'new') {
      return target.field === 'startDate' ? startDateDraft : endDateDraft;
    }

    if (!target.taskId) {
      return '';
    }

    return milestoneDrafts[target.taskId]?.[target.field] ?? '';
  };

  const applyPickerSelection = () => {
    if (!activeDatePicker) {
      return;
    }

    if (activeDatePicker.scope === 'new') {
      if (activeDatePicker.field === 'startDate') {
        setStartDateDraft(pickerPreviewDate);
      } else {
        setEndDateDraft(pickerPreviewDate);
      }
      setActiveDatePicker(null);
      return;
    }

    if (activeDatePicker.taskId) {
      setMilestoneDraft(activeDatePicker.taskId, activeDatePicker.field, pickerPreviewDate);
    }
    setActiveDatePicker(null);
  };

  const movePickerMonth = (amount: number) => {
    setPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const getMilestoneDraft = (
    taskId: string,
    startDate: string,
    endDate: string,
    isDaily: boolean,
    dailyTime: string,
    appName: string,
    appPackageName: string
  ): MilestoneDraft => milestoneDrafts[taskId] ?? { startDate, endDate, isDaily, dailyTime, appName, appPackageName };

  const setMilestoneDraft = (taskId: string, key: keyof MilestoneDraft, value: string | boolean) => {
    setMilestoneDrafts((prev) => {
      const task = tasks.find((item) => item.id === taskId);
      const next = prev[taskId] ?? {
        startDate: task?.startDate ?? '',
        endDate: task?.endDate ?? '',
        isDaily: task?.isDaily ?? false,
        dailyTime: task?.dailyTime ?? '09:00',
        appName: task?.appName ?? '',
        appPackageName: task?.appPackageName ?? '',
      };
      return { ...prev, [taskId]: { ...next, [key]: value } };
    });
  };

  const getDraftTime = (target: TimePickerTarget) => {
    if (target.scope === 'new') return dailyTimeDraft;
    if (!target.taskId) return '09:00';
    return milestoneDrafts[target.taskId]?.dailyTime ?? tasks.find((task) => task.id === target.taskId)?.dailyTime ?? '09:00';
  };

  const openTimePicker = (target: TimePickerTarget) => {
    setTimePickerValue(parseTime(getDraftTime(target)));
    setActiveTimePicker(target);
  };

  const applyTimePickerValue = (date: Date) => {
    if (!activeTimePicker) return;
    const nextTime = toTimeValue(date);
    if (activeTimePicker.scope === 'new') {
      setDailyTimeDraft(nextTime);
    } else if (activeTimePicker.taskId) {
      setMilestoneDraft(activeTimePicker.taskId, 'dailyTime', nextTime);
    }
    setActiveTimePicker(null);
  };

  const handleTimePickerChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (event.type === 'dismissed') {
      setActiveTimePicker(null);
      return;
    }
    if (!selectedTime) return;
    setTimePickerValue(selectedTime);
    if (Platform.OS === 'android') applyTimePickerValue(selectedTime);
  };

  const addSubtaskFromDraft = (taskId: string, value = subtaskDrafts[taskId] ?? '') => {
    if (!value.trim()) return false;
    addSubtask(taskId, value);
    setSubtaskDraft(taskId, '');
    return true;
  };

  const beginTaskEditing = (task: (typeof tasks)[number]) => {
    setEditingTaskId(task.id);
    setTaskTitleDraft(task.title);
    setTaskAssigneeDraft(
      task.assignedUserIds.length > 0 ? [...task.assignedUserIds] : [task.createdByUserId]
    );
    setTaskEditError('');
  };

  const saveTaskDetails = () => {
    if (!editingTaskId || !taskTitleDraft.trim()) {
      setTaskEditError('Task title is required.');
      return;
    }
    updateTaskDetails(editingTaskId, taskTitleDraft, taskAssigneeDraft);
    setEditingTaskId(null);
    setTaskEditError('');
  };

  const toggleTaskAssignee = (userId: string) => {
    setTaskAssigneeDraft((previous) =>
      previous.includes(userId)
        ? previous.filter((id) => id !== userId)
        : [...previous, userId]
    );
  };

  const beginSubtaskEditing = (subtaskId: string, title: string) => {
    const task = tasks.find((item) => item.subtasks.some((subtask) => subtask.id === subtaskId));
    if (!task) return;
    setTextEditor({ kind: 'editSubtask', taskId: task.id, subtaskId });
    setTextEditorDraft(title);
  };

  const openTextEditor = (target: TaskTextEditor, initialValue: string) => {
    setTextEditor(target);
    setTextEditorDraft(initialValue);
  };

  const saveTextEditor = () => {
    if (!textEditor) return;
    let saved = false;
    if (textEditor.kind === 'task') {
      saved = addTaskFromDraft(textEditorDraft);
    } else if (textEditor.kind === 'subtask') {
      saved = addSubtaskFromDraft(textEditor.taskId, textEditorDraft);
    } else if (textEditorDraft.trim()) {
      updateSubtask(textEditor.taskId, textEditor.subtaskId, textEditorDraft);
      saved = true;
    }
    if (saved) setTextEditor(null);
  };

  const saveMilestone = (taskId: string, draft: MilestoneDraft) => {
    const { startDate, endDate, isDaily, dailyTime, appName, appPackageName } = draft;
    if (startDate && !isIsoDate(startDate)) return;
    if (endDate && !isIsoDate(endDate)) return;
    if (startDate && endDate && startDate > endDate) return;

    updateTaskMilestone(taskId, startDate, endDate, isDaily, dailyTime, appName, appPackageName);
  };

  const openAppPicker = async (target: AppPickerTarget) => {
    setActiveAppPicker(target);
    setAppSearchDraft('');
    setAppPickerError('');
    if (Platform.OS !== 'android') {
      setInstalledApps([]);
      setAppPickerError('Installed app selection is available in the Android app.');
      return;
    }

    setIsLoadingApps(true);
    try {
      setInstalledApps(await getInstalledApps());
    } catch {
      setAppPickerError('Could not load installed apps. Rebuild the Android development app and try again.');
      setInstalledApps([]);
    } finally {
      setIsLoadingApps(false);
    }
  };

  const selectInstalledApp = (app: InstalledApp | null) => {
    if (!activeAppPicker) return;
    if (activeAppPicker.scope === 'new') {
      setAppNameDraft(app?.name ?? '');
      setAppPackageNameDraft(app?.packageName ?? '');
    } else if (activeAppPicker.taskId) {
      setMilestoneDraft(activeAppPicker.taskId, 'appName', app?.name ?? '');
      setMilestoneDraft(activeAppPicker.taskId, 'appPackageName', app?.packageName ?? '');
    }
    setActiveAppPicker(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={taskListRef}
        data={visibleTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingBottom: 48 + keyboardHeight }]}
        onScroll={(event) => {
          taskListScrollOffset.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.heroCard}>
              <View style={styles.headerTopRow}>
                <View>
                  <Text style={styles.eyebrow}>YOUR TASK PLANNER</Text>
                  <Text style={styles.title}>Big Tasks</Text>
                </View>
                <Pressable style={styles.userIconButton} onPress={() => router.push('/(tabs)/users' as never)}>
                  <Ionicons name="person-circle-outline" size={30} color={theme.colors.buttonDark} />
                </Pressable>
              </View>
              <Text style={styles.subtitle}>Make room for what matters, one step at a time.</Text>

              <View style={styles.statsRow}>
                <View style={[styles.statCard, styles.statCardTotal]}>
                  <Text style={styles.statNumber}>{stats.totalTasks}</Text>
                  <Text style={styles.statLabel}>Big Tasks</Text>
                </View>
                <View style={[styles.statCard, styles.statCardCompleted]}>
                  <Text style={styles.statNumber}>{stats.doneTasks}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={[styles.statCard, styles.statCardDeadline]}>
                  <Text style={styles.statNumber}>{stats.withDeadlines}</Text>
                  <Text style={styles.statLabel}>With Deadline</Text>
                </View>
              </View>
            </View>

            <View style={styles.taskViewTabs}>
              {([false, true] as const).map((history) => (
                <Pressable
                  key={String(history)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: showHistory === history }}
                  style={[styles.taskViewTab, showHistory === history && styles.taskViewTabActive]}
                  onPress={() => setShowHistory(history)}>
                  <Text style={[styles.taskViewTabText, showHistory === history && styles.taskViewTabTextActive]}>
                    {history ? 'History' : 'Tasks'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {!showHistory && (
              <View style={styles.composerCard}>
              <Pressable
                accessibilityRole="button"
                style={styles.taskInput}
                onPress={() => openTextEditor({ kind: 'task' }, taskDraft)}>
                <Text style={taskDraft ? styles.taskInputText : styles.taskInputPlaceholder}>
                  {taskDraft || 'Add a task...'}
                </Text>
              </Pressable>

              <View style={styles.periodRow}>
                <Text style={styles.periodLabel}>Task Period:</Text>
                <Pressable
                  style={[
                    styles.periodButton,
                    taskPeriod === 'weekly' && styles.periodButtonActive,
                  ]}
                  onPress={() => setTaskPeriod('weekly')}>
                  <Text
                    style={[
                      styles.periodButtonText,
                      taskPeriod === 'weekly' && styles.periodButtonTextActive,
                    ]}>
                    Weekly
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.periodButton,
                    taskPeriod === 'monthly' && styles.periodButtonActive,
                  ]}
                  onPress={() => setTaskPeriod('monthly')}>
                  <Text
                    style={[
                      styles.periodButtonText,
                      taskPeriod === 'monthly' && styles.periodButtonTextActive,
                    ]}>
                    Monthly
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.periodButton, taskPeriod === 'daily' && styles.periodButtonActive]}
                  onPress={() => setTaskPeriod(taskPeriod === 'daily' ? 'monthly' : 'daily')}>
                  <Text style={[styles.periodButtonText, taskPeriod === 'daily' && styles.periodButtonTextActive]}>
                    Daily
                  </Text>
                </Pressable>
              </View>

              {taskPeriod === 'daily' ? (
                <>
                  <Pressable
                    style={styles.dailyAppInputRow}
                    onPress={() => void openAppPicker({ scope: 'new' })}>
                    <Ionicons name="apps-outline" size={18} color={theme.colors.buttonDark} />
                    <View style={styles.dailyAppPickerTextWrap}>
                      <Text style={styles.dailyAppPickerTitle}>
                        {appNameDraft || 'Choose installed app'}
                      </Text>
                      <Text style={styles.dailyAppPickerSubtitle}>
                        {appPackageNameDraft || 'Optional · habit without an app'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                  </Pressable>
                  <Pressable style={styles.dailyTimeButton} onPress={() => openTimePicker({ scope: 'new' })}>
                    <Ionicons name="time-outline" size={18} color={theme.colors.buttonDark} />
                    <Text style={styles.dailyTimeButtonText}>Every day at {formatTime(dailyTimeDraft, language, preferences.timeFormat)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                  </Pressable>
                </>
              ) : null}

              <View style={styles.milestoneRow}>
                  <Pressable
                    style={[styles.datePickerButton, !startDateDraft && styles.datePickerButtonEmpty]}
                    onPress={() => openDatePicker({ scope: 'new', field: 'startDate' })}>
                    <Ionicons name="calendar-outline" size={16} color={theme.colors.buttonDark} />
                    <Text style={[styles.datePickerText, !startDateDraft && styles.datePickerPlaceholderText]}>
                      {startDateDraft || 'Pick start date'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.datePickerButton, !endDateDraft && styles.datePickerButtonEmpty]}
                    onPress={() => openDatePicker({ scope: 'new', field: 'endDate' })}>
                    <Ionicons name="calendar-outline" size={16} color={theme.colors.buttonDark} />
                    <Text style={[styles.datePickerText, !endDateDraft && styles.datePickerPlaceholderText]}>
                      {endDateDraft || 'Pick deadline'}
                    </Text>
                  </Pressable>
              </View>

              <Text style={styles.assignTitle}>Who must do it?</Text>
              <View style={styles.assignChipRow}>
                {users.map((user) => {
                  const isSelected = selectedAssigneeIds.includes(user.id);
                  return (
                    <Pressable
                      key={user.id}
                      style={[styles.assignChip, isSelected && styles.assignChipSelected]}
                      onPress={() => toggleAssignee(user.id)}>
                      <Text style={[styles.assignChipText, isSelected && styles.assignChipTextSelected]}>
                        {user.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <LinearGradient
                colors={[theme.colors.actionBackground, theme.colors.actionBackground]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}>
                <Pressable style={styles.primaryButton} onPress={() => addTaskFromDraft()}>
                  <Ionicons name="add" size={20} color={theme.colors.actionForeground} />
                  <Text style={styles.primaryButtonText}>Create Task</Text>
                </Pressable>
              </LinearGradient>
            </View>
            )}
          </View>
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onScrollToIndexFailed={({ index, averageItemLength }) => {
          taskListRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: true });
        }}
        renderItem={({ item, index }) => {
          const taskProgress = getUserTaskProgress(item, activeUserId);
          const isCompleted = isTaskCompletedForActiveUser(item);
          const total = item.subtasks.length;
          const done = item.subtasks.filter((subtask) => taskProgress.subtasks[subtask.id] === true).length;
          const progress = total === 0 ? 0 : Math.round((done / total) * 100);
          const milestone = getMilestoneDraft(
            item.id,
            item.startDate,
            item.endDate,
            item.isDaily,
            item.dailyTime,
            item.appName,
            item.appPackageName
          );
          const deadlineLabel = item.endDate ? `Deadline ${item.endDate}` : 'No deadline';
          const isOverdue = Boolean(item.endDate) && !isCompleted && item.endDate < getLocalIsoDate();
          const statusLabel = isCompleted ? 'Completed' : isOverdue ? 'Failed' : item.isDaily ? 'Daily' : 'In progress';
          const creatorName = userById[item.createdByUserId] ?? 'Unknown user';
          const deadlineByName = userById[item.deadlineByUserId] ?? creatorName;
          const includedUsers = item.participantUserIds
            .map((userId) => userById[userId])
            .filter((name): name is string => Boolean(name));
          const assignedUsers = item.assignedUserIds
            .map((userId) => userById[userId])
            .filter((name): name is string => Boolean(name));

          return (
            <View style={[
              styles.taskCard,
              showHistory && isCompleted && {
                backgroundColor: theme.isDark ? '#1E4939' : '#DDF5E8',
                borderColor: theme.isDark ? '#3F8C68' : '#65B98A',
              },
              showHistory && isOverdue && {
                backgroundColor: theme.isDark ? '#552F36' : '#FCE4E4',
                borderColor: theme.isDark ? '#A64B55' : '#E57373',
              },
            ]}>
              <View style={styles.taskTopRow}>
                <Pressable style={styles.taskTitleRow} onPress={() => toggleTaskWithFeedback(item.id)}>
                  <Ionicons
                    name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={isCompleted ? theme.colors.success : isOverdue ? theme.colors.accent : theme.colors.buttonDark}
                  />
                  <View style={styles.taskTextWrap}>
                    <Text style={[styles.taskTitle, isCompleted && styles.completedText]}>{item.title}</Text>
                    <Text style={styles.taskMeta}>
                      {item.isDaily ? `Daily at ${formatTime(item.dailyTime, language, preferences.timeFormat)} · ` : ''}Subtasks done: {done}/{total}
                    </Text>
                    {item.appName ? <Text style={styles.taskOwnerText}>App: {item.appName}</Text> : null}
                    <Text style={styles.taskOwnerText}>Created by {creatorName}</Text>
                    <Text style={styles.taskOwnerText}>Deadline by {deadlineByName}</Text>
                    <Text style={styles.taskOwnerText}>
                      Must do it: {assignedUsers.length > 0 ? assignedUsers.join(', ') : creatorName}
                    </Text>
                    <Text style={styles.taskOwnerText}>
                      Users in task: {includedUsers.length > 0 ? includedUsers.join(', ') : creatorName}
                    </Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.badge, isCompleted ? styles.badgeComplete : styles.badgeNeutral]}>
                        <Text style={styles.badgeText}>{statusLabel}</Text>
                      </View>
                      <View style={[styles.badge, styles.badgeDeadline]}>
                        <Text style={styles.badgeText}>{deadlineLabel}</Text>
                      </View>
                      {isOverdue ? (
                        <View style={[styles.badge, styles.badgeOverdue]}>
                          <Text style={[styles.badgeText, styles.badgeTextOverdue]}>Failed</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>

                <View style={styles.taskActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${item.title}`}
                    style={styles.iconButton}
                    onPress={() => beginTaskEditing(item)}>
                    <Ionicons name="create-outline" size={18} color={theme.colors.buttonDark} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.title}`}
                    style={styles.iconButton}
                    onPress={() => confirmRemoveTask(item.id, item.title)}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.accent} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>

              <View style={styles.milestoneRowTask}>
                <Pressable
                  style={[styles.datePickerButtonTask, !milestone.startDate && styles.datePickerButtonEmpty]}
                  onPress={() =>
                    openDatePicker({
                      scope: 'milestone',
                      taskId: item.id,
                      field: 'startDate',
                    })
                  }>
                  <Ionicons name="calendar-outline" size={15} color={theme.colors.buttonDark} />
                  <Text style={[styles.datePickerTextTask, !milestone.startDate && styles.datePickerPlaceholderTextTask]}>
                    {milestone.startDate || 'Start date'}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.datePickerButtonTask, !milestone.endDate && styles.datePickerButtonEmpty]}
                  onPress={() =>
                    openDatePicker({
                      scope: 'milestone',
                      taskId: item.id,
                      field: 'endDate',
                    })
                  }>
                  <Ionicons name="calendar-outline" size={15} color={theme.colors.buttonDark} />
                  <Text style={[styles.datePickerTextTask, !milestone.endDate && styles.datePickerPlaceholderTextTask]}>
                    {milestone.endDate || 'Deadline'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.miniButtonWide}
                  onPress={() => saveMilestone(item.id, milestone)}>
                  <Text style={styles.miniButtonText}>Save</Text>
                </Pressable>
              </View>

              <View style={styles.dailyScheduleRow}>
                <View style={styles.dailyScheduleLabelWrap}>
                    <Ionicons name="repeat-outline" size={17} color={theme.colors.buttonDark} />
                  <Text style={styles.dailyScheduleLabel}>Repeat daily</Text>
                </View>
                <Switch
                  value={milestone.isDaily}
                  onValueChange={(value) => setMilestoneDraft(item.id, 'isDaily', value)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor={milestone.isDaily ? theme.colors.buttonDark : theme.colors.cardBackground}
                />
              </View>
              {milestone.isDaily ? (
                <>
                  <Pressable
                    style={styles.dailyAppInputRow}
                    onPress={() => void openAppPicker({ scope: 'milestone', taskId: item.id })}>
                    <Ionicons name="apps-outline" size={17} color={theme.colors.buttonDark} />
                    <View style={styles.dailyAppPickerTextWrap}>
                      <Text style={styles.dailyAppPickerTitle}>
                        {milestone.appName || 'Choose installed app'}
                      </Text>
                      <Text style={styles.dailyAppPickerSubtitle}>
                        {milestone.appPackageName || 'Optional · habit without an app'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                  </Pressable>
                  <Pressable style={styles.dailyTimeButtonTask} onPress={() => openTimePicker({ scope: 'milestone', taskId: item.id })}>
                    <Ionicons name="time-outline" size={16} color={theme.colors.buttonDark} />
                    <Text style={styles.dailyTimeButtonText}>Every day at {formatTime(milestone.dailyTime, language, preferences.timeFormat)}</Text>
                    <Ionicons name="chevron-forward" size={15} color={theme.colors.textSecondary} />
                  </Pressable>
                </>
              ) : null}

              <View style={styles.subtaskComposerRow}>
                <View style={styles.subtaskPeriodBadge}>
                  <Text style={styles.subtaskPeriodBadgeText}>Steps</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add a subtask to ${item.title}`}
                  style={styles.subtaskInput}
                  onPress={() => openTextEditor({ kind: 'subtask', taskId: item.id }, subtaskDrafts[item.id] ?? '')}>
                  <Text style={subtaskDrafts[item.id] ? styles.taskInputText : styles.taskInputPlaceholder}>
                    {subtaskDrafts[item.id] || 'Add subtask...'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add subtask to ${item.title}`}
                  style={styles.miniButton}
                  onPress={() => openTextEditor({ kind: 'subtask', taskId: item.id }, subtaskDrafts[item.id] ?? '')}>
                  <Ionicons name="add" size={16} color={theme.colors.buttonDark} />
                </Pressable>
              </View>

              {item.subtasks.map((subtask) => (
                <View key={subtask.id} style={styles.subtaskRow}>
                  <>
                      <Pressable style={styles.subtaskLeft} onPress={() => toggleSubtaskWithFeedback(item.id, subtask.id)}>
                        <Ionicons
                          name={taskProgress.subtasks[subtask.id] ? 'checkbox' : 'square-outline'}
                          size={18}
                          color={taskProgress.subtasks[subtask.id] ? theme.colors.success : theme.colors.textSecondary}
                        />
                        <Text style={[styles.subtaskText, taskProgress.subtasks[subtask.id] && styles.completedText]}>{subtask.title}</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${subtask.title}`}
                        style={styles.subtaskRemove}
                        onPress={() => beginSubtaskEditing(subtask.id, subtask.title)}>
                        <Ionicons name="create-outline" size={15} color={theme.colors.buttonDark} />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${subtask.title}`}
                        style={styles.subtaskRemove}
                        onPress={() => removeSubtask(item.id, subtask.id)}>
                        <Ionicons name="close" size={16} color={theme.colors.accent} />
                      </Pressable>
                  </>
                </View>
              ))}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyState}>
            {showHistory ? 'No tasks in history yet.' : 'No tasks yet. Start with one big goal above.'}
          </Text>
        }
      />

      <Modal
        transparent
        animationType="fade"
        visible={textEditor !== null}
        onRequestClose={() => setTextEditor(null)}
        statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.textEditorBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable
            accessibilityLabel="Close text editor"
            style={StyleSheet.absoluteFill}
            onPress={() => setTextEditor(null)}
          />
          <View style={styles.textEditorPanel}>
            <Text style={styles.taskEditTitle}>
              {textEditor?.kind === 'task' ? 'New task' : textEditor?.kind === 'subtask' ? 'New subtask' : 'Edit subtask'}
            </Text>
            <TextInput
              accessibilityLabel={textEditor?.kind === 'task' ? 'Task title' : 'Subtask title'}
              style={styles.taskEditInput}
              value={textEditorDraft}
              onChangeText={(value) => {
                setTextEditorDraft(value);
                if (textEditor?.kind === 'task') {
                  setTaskDraft(value);
                  setFormError('');
                } else if (textEditor?.kind === 'subtask') {
                  setSubtaskDraft(textEditor.taskId, value);
                }
              }}
              placeholder={textEditor?.kind === 'task' ? 'Task title' : 'Subtask title'}
              placeholderTextColor={theme.colors.textSecondary}
              returnKeyType="done"
              onSubmitEditing={saveTextEditor}
              autoFocus
            />
            {textEditor?.kind === 'task' && formError ? <Text style={styles.errorText}>{formError}</Text> : null}
            <View style={styles.taskEditActions}>
              <Pressable style={styles.taskEditCancel} onPress={() => setTextEditor(null)}>
                <Text style={styles.taskEditCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.taskEditSave} onPress={saveTextEditor}>
                <Text style={styles.taskEditSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={editingTaskId !== null}
        onRequestClose={() => setEditingTaskId(null)}>
        <KeyboardAvoidingView
          style={styles.taskEditBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable
            accessibilityLabel="Close task editor"
            style={StyleSheet.absoluteFill}
            onPress={() => setEditingTaskId(null)}
          />
          <ScrollView
            style={styles.taskEditScroll}
            contentContainerStyle={styles.taskEditPanel}
            keyboardShouldPersistTaps="handled">
            <Text style={styles.taskEditTitle}>Edit task</Text>
            <Text style={styles.taskEditLabel}>Task title</Text>
            <TextInput
              accessibilityLabel="Task title"
              style={styles.taskEditInput}
              value={taskTitleDraft}
              onChangeText={(value) => {
                setTaskTitleDraft(value);
                setTaskEditError('');
              }}
              maxLength={120}
              autoFocus
            />
            <Text style={styles.taskEditLabel}>Who must do it?</Text>
            <View style={styles.assignChipRow}>
              {users.map((user) => {
                const isSelected = taskAssigneeDraft.includes(user.id);
                return (
                  <Pressable
                    key={user.id}
                    style={[styles.assignChip, isSelected && styles.assignChipSelected]}
                    onPress={() => toggleTaskAssignee(user.id)}>
                    <Text style={[styles.assignChipText, isSelected && styles.assignChipTextSelected]}>
                      {user.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.taskEditHint}>Dates, schedule, and app settings can be edited on the task card.</Text>
            {taskEditError ? <Text style={styles.errorText}>{taskEditError}</Text> : null}
            <View style={styles.taskEditActions}>
              <Pressable style={styles.taskEditCancel} onPress={() => setEditingTaskId(null)}>
                <Text style={styles.taskEditCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.taskEditSave} onPress={saveTaskDetails}>
                <Text style={styles.taskEditSaveText}>Save changes</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {Platform.OS === 'android' && activeTimePicker ? (
        <DateTimePicker
          value={timePickerValue}
          mode="time"
          display="clock"
          onChange={handleTimePickerChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          transparent
          animationType="fade"
          visible={activeTimePicker !== null}
          onRequestClose={() => setActiveTimePicker(null)}>
          <View style={styles.dateModalBackdrop}>
            <Pressable
              accessibilityLabel="Close time picker"
              style={StyleSheet.absoluteFill}
              onPress={() => setActiveTimePicker(null)}
            />
            <View style={styles.timeModalPanel}>
              <View style={styles.dateModalHeader}>
                <View style={styles.dateModalTitleWrap}>
                  <Text style={styles.dateModalEyebrow}>DAILY TASK</Text>
                  <Text style={styles.dateModalTitle}>Choose a time</Text>
                </View>
                <Pressable style={styles.dateModalClose} onPress={() => setActiveTimePicker(null)}>
                  <Ionicons name="close" size={20} color={theme.colors.buttonDark} />
                </Pressable>
              </View>
              <DateTimePicker
                value={timePickerValue}
                mode="time"
                display="spinner"
                onChange={handleTimePickerChange}
              />
              <View style={styles.dateModalActions}>
                <Pressable style={styles.dateModalCancel} onPress={() => setActiveTimePicker(null)}>
                  <Text style={styles.dateModalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.dateModalConfirm}
                  onPress={() => applyTimePickerValue(timePickerValue)}>
                  <Text style={styles.dateModalConfirmText}>Use time</Text>
                  <Ionicons name="arrow-forward" size={16} color={theme.colors.textPrimary} />
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      <Modal
        transparent
        animationType="fade"
        visible={activeDatePicker !== null}
        onRequestClose={() => setActiveDatePicker(null)}>
        <View style={styles.dateModalBackdrop}>
          <Pressable
            accessibilityLabel="Close date picker"
            style={StyleSheet.absoluteFill}
            onPress={() => setActiveDatePicker(null)}
          />
          <View style={styles.dateModalPanel}>
            <View style={styles.dateModalHeader}>
              <View style={styles.dateModalTitleWrap}>
                <Text style={styles.dateModalEyebrow}>TASK SCHEDULE</Text>
                <Text style={styles.dateModalTitle}>
                  Select {activeDatePicker?.field === 'startDate' ? 'start date' : 'deadline'}
                </Text>
              </View>
              <Pressable style={styles.dateModalClose} onPress={() => setActiveDatePicker(null)}>
                <Ionicons name="close" size={20} color={theme.colors.buttonDark} />
              </Pressable>
            </View>

            <View style={styles.dateModalMonthRow}>
              <Text style={styles.dateModalMonthTitle}>
                {pickerMonth.toLocaleDateString(language === 'id' ? 'id-ID' : 'en', { month: 'long', year: 'numeric' })}
              </Text>
              <View style={styles.dateModalMonthControls}>
                <Pressable accessibilityLabel="Previous month" style={styles.dateModalMonthButton} onPress={() => movePickerMonth(-1)}>
                  <Ionicons name="chevron-back" size={18} color={theme.colors.buttonDark} />
                </Pressable>
                <Pressable accessibilityLabel="Next month" style={styles.dateModalMonthButton} onPress={() => movePickerMonth(1)}>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.buttonDark} />
                </Pressable>
              </View>
            </View>

            <View style={styles.datePickerWeekdays}>
              {(language === 'id' ? ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'])
                .slice(preferences.weekStartsOn === 'monday' ? 1 : 0)
                .concat(preferences.weekStartsOn === 'monday'
                  ? (language === 'id' ? ['Min'] : ['S'])
                  : [])
                .map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.datePickerWeekday}>{day}</Text>
              ))}
            </View>
            <View style={styles.datePickerGrid}>
              {pickerMonthDays.map((date, index) => {
                const occupiedTasks = date ? tasks.filter((task) => taskOccupiesDate(task, date)) : [];
                const isSelected = date === pickerPreviewDate;
                const isToday = date === getLocalIsoDate();
                return (
                  <Pressable
                    key={`${date || 'blank'}-${index}`}
                    disabled={!date}
                    accessibilityRole="button"
                    accessibilityLabel={date ? `${formatReadableDate(date, language)}${occupiedTasks.length ? `, occupied by ${occupiedTasks.map((task) => task.title).join(', ')}` : ', no tasks scheduled'}` : undefined}
                    style={[styles.datePickerDay, isSelected && styles.datePickerDaySelected]}
                    onPress={() => setPickerPreviewDate(date)}>
                    {date ? (
                      <>
                        <Text style={[styles.datePickerDayNumber, isToday && styles.datePickerDayToday, isSelected && styles.datePickerDayNumberSelected]}>
                          {Number(date.slice(-2))}
                        </Text>
                        <View style={styles.datePickerDots}>
                          {occupiedTasks.slice(0, 3).map((task) => (
                            <View key={task.id} style={[styles.datePickerDot, { backgroundColor: isTaskCompletedForActiveUser(task) ? theme.colors.success : theme.colors.accent }]} />
                          ))}
                        </View>
                      </>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.occupiedHint}>
              <View style={styles.occupiedHintHeader}>
                <Ionicons name="information-circle-outline" size={18} color={theme.colors.buttonDark} />
                <Text style={styles.occupiedHintTitle}>{formatReadableDate(pickerPreviewDate, language)}</Text>
              </View>
              <Text style={styles.occupiedHintLabel}>
                {pickerOccupiedTasks.length > 0 ? 'Already occupied by:' : 'No tasks currently occupy this date.'}
              </Text>
              {pickerOccupiedTasks.length > 0 ? (
                <ScrollView style={styles.occupiedTaskList} nestedScrollEnabled>
                  {pickerOccupiedTasks.map((task) => (
                    <View key={task.id} style={styles.occupiedTaskRow}>
                      <View style={[styles.occupiedTaskDot, { backgroundColor: isTaskCompletedForActiveUser(task) ? theme.colors.success : theme.colors.accent }]} />
                      <View style={styles.occupiedTaskTextWrap}>
                        <Text style={styles.occupiedTaskTitle}>{task.title}</Text>
                        <Text style={styles.occupiedTaskDates}>
                          {task.startDate && task.endDate
                            ? `${task.startDate} to ${task.endDate}`
                            : task.startDate
                              ? `From ${task.startDate} onward`
                              : `Deadline ${task.endDate}`}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </View>

            <View style={styles.dateModalActions}>
              <Pressable style={styles.dateModalCancel} onPress={() => setActiveDatePicker(null)}>
                <Text style={styles.dateModalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.dateModalConfirm} onPress={applyPickerSelection}>
                <Text style={styles.dateModalConfirmText}>Use date</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={activeAppPicker !== null}
        onRequestClose={() => setActiveAppPicker(null)}>
        <KeyboardAvoidingView
          style={styles.appModalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable
            accessibilityLabel="Close installed app picker"
            style={StyleSheet.absoluteFill}
            onPress={() => setActiveAppPicker(null)}
          />
          <View style={styles.appModalPanel}>
            <View style={styles.appModalHeader}>
              <View style={styles.appModalTitleWrap}>
                <Text style={styles.dateModalEyebrow}>DAILY TASK</Text>
                <Text style={styles.appModalTitle}>Choose an installed app</Text>
              </View>
              <Pressable style={styles.dateModalClose} onPress={() => setActiveAppPicker(null)}>
                <Ionicons name="close" size={20} color={theme.colors.buttonDark} />
              </Pressable>
            </View>

            <View style={styles.appSearchRow}>
              <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.appSearchInput}
                placeholder="Search installed apps"
                placeholderTextColor={theme.colors.textSecondary}
                value={appSearchDraft}
                onChangeText={setAppSearchDraft}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Pressable style={styles.noAppOption} onPress={() => selectInstalledApp(null)}>
              <Ionicons name="walk-outline" size={20} color={theme.colors.buttonDark} />
              <View style={styles.installedAppTextWrap}>
                <Text style={styles.installedAppTitle}>Habit without an app</Text>
                <Text style={styles.installedAppPackage}>For jogging, reading, and similar routines</Text>
              </View>
            </Pressable>

            {isLoadingApps ? (
              <View style={styles.appPickerState}>
                <ActivityIndicator color={theme.colors.buttonDark} />
                <Text style={styles.appPickerStateText}>Loading apps on this device...</Text>
              </View>
            ) : appPickerError ? (
              <Text style={styles.appPickerError}>{appPickerError}</Text>
            ) : filteredInstalledApps.length > 0 ? (
              <ScrollView style={styles.installedAppsList} keyboardShouldPersistTaps="handled">
                {filteredInstalledApps.map((app) => (
                  <Pressable
                    key={app.packageName}
                    style={styles.installedAppRow}
                    onPress={() => selectInstalledApp(app)}>
                    <View style={styles.installedAppIcon}>
                      <Ionicons name="phone-portrait-outline" size={18} color={theme.colors.buttonDark} />
                    </View>
                    <View style={styles.installedAppTextWrap}>
                      <Text style={styles.installedAppTitle}>{app.name}</Text>
                      <Text style={styles.installedAppPackage}>{app.packageName}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.appPickerStateText}>No matching launchable apps found.</Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  headerWrap: {
    paddingTop: 16,
    paddingBottom: 10,
  },
  heroCard: {
    padding: 20,
    backgroundColor: theme.colors.primary,
    borderRadius: 28,
    shadowColor: theme.colors.canvas,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  activeUserPill: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EAF7FA',
    borderRadius: theme.borderRadius.full,
  },
  avatarMark: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.full,
  },
  avatarInitial: {
    color: theme.colors.buttonDark,
    fontSize: 14,
    fontFamily: 'Nunito_800ExtraBold',
  },
  activeUserTextWrap: {
    flex: 1,
  },
  activeUserLabel: {
    color: theme.colors.textSecondary,
    fontSize: 9,
    fontFamily: 'Nunito_800ExtraBold',
  },
  activeUserName: {
    marginTop: 1,
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  profileButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
  },
  profileButtonText: {
    color: theme.colors.buttonDark,
    fontSize: 11,
    fontFamily: 'Nunito_800ExtraBold',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segmentedControl: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    backgroundColor: theme.colors.buttonDark,
    borderRadius: theme.borderRadius.full,
  },
  segmentButton: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: theme.borderRadius.full,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.cardBackground,
  },
  segmentText: {
    color: theme.colors.cardBackground,
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
  segmentTextActive: {
    color: theme.colors.buttonDark,
  },
  scheduledToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
    marginBottom: 8,
  },
  scheduledTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontFamily: 'Nunito_800ExtraBold',
  },
  scheduledCount: {
    marginTop: 1,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
  },
  addTaskButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  addTaskButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  userIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  eyebrow: {
    color: theme.colors.buttonDark,
    fontSize: 11,
    fontFamily: 'Nunito_800ExtraBold',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Nunito_800ExtraBold',
    color: theme.colors.textPrimary,
    marginTop: 4,
  },
  subtitle: {
    marginTop: 6,
    color: theme.colors.buttonDark,
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
  },
  assignTitle: {
    marginTop: 2,
    color: theme.colors.buttonDark,
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  assignChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assignChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F8FA',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  assignChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  assignChipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  assignChipTextSelected: {
    color: theme.colors.textPrimary,
  },
  taskEditBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    backgroundColor: 'rgba(57, 83, 91, 0.48)',
  },
  textEditorBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(57, 83, 91, 0.48)',
  },
  textEditorPanel: {
    gap: 12,
    padding: 18,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  taskEditScroll: {
    flexGrow: 0,
    maxHeight: '90%',
    borderRadius: theme.borderRadius.lg,
  },
  taskEditPanel: {
    gap: 12,
    padding: 20,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  taskEditTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontFamily: 'Nunito_800ExtraBold',
  },
  taskEditLabel: {
    color: theme.colors.buttonDark,
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  taskEditInput: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    color: theme.colors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
  },
  taskEditHint: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
  },
  taskEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  taskEditCancel: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
  },
  taskEditCancelText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  taskEditSave: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.colors.buttonDark,
  },
  taskEditSaveText: {
    color: theme.colors.cardBackground,
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  statsRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  statCardTotal: {
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  statCardCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  statCardDeadline: {
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Nunito_800ExtraBold',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
    color: theme.colors.textSecondary,
  },
  overdueCard: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
    padding: 12,
    gap: 10,
  },
  overdueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  overdueDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
    backgroundColor: '#dc2626',
  },
  overdueTextWrap: {
    flex: 1,
  },
  overdueTitle: {
    color: '#991b1b',
    fontSize: 15,
    fontWeight: '800',
  },
  overdueSubtitle: {
    marginTop: 2,
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
  overdueChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  overdueChip: {
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(220, 38, 38, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.32)',
  },
  overdueChipText: {
    color: '#991b1b',
    fontSize: 11,
    fontWeight: '700',
  },
  composerCard: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 10,
    shadowColor: theme.colors.canvas,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  taskInput: {
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#F7FBFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
  },
  taskInputText: {
    color: theme.colors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
  },
  taskInputPlaceholder: {
    color: theme.colors.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  milestoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  datePickerButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: '#F7FBFC',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePickerButtonEmpty: {
    backgroundColor: theme.colors.cardBackground,
  },
  datePickerText: {
    color: theme.colors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
    flex: 1,
  },
  datePickerPlaceholderText: {
    color: theme.colors.textSecondary,
    fontFamily: 'Nunito_500Medium',
  },
  datePickerButtonTask: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#F7FBFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePickerTextTask: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    flex: 1,
  },
  datePickerPlaceholderTextTask: {
    color: theme.colors.textSecondary,
    fontFamily: 'Nunito_500Medium',
  },
  dateModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(57, 83, 91, 0.48)',
  },
  dateModalPanel: {
    maxHeight: '90%',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  timeModalPanel: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  dateModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  dateModalTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  dateModalEyebrow: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontFamily: 'Nunito_800ExtraBold',
    letterSpacing: 1,
  },
  dateModalTitle: {
    marginTop: 4,
    color: theme.colors.textPrimary,
    fontSize: 19,
    fontFamily: 'Nunito_800ExtraBold',
    textTransform: 'capitalize',
  },
  dateModalClose: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F8FA',
    borderRadius: theme.borderRadius.full,
  },
  dateModalMonthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateModalMonthTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontFamily: 'Nunito_800ExtraBold',
  },
  dateModalMonthControls: {
    flexDirection: 'row',
    gap: 6,
  },
  dateModalMonthButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F8FA',
    borderRadius: theme.borderRadius.full,
  },
  datePickerWeekdays: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  datePickerWeekday: {
    width: `${100 / 7}%`,
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontFamily: 'Nunito_800ExtraBold',
    textAlign: 'center',
  },
  datePickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  datePickerDay: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  datePickerDaySelected: {
    backgroundColor: theme.colors.primary,
  },
  datePickerDayNumber: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
  },
  datePickerDayToday: {
    color: theme.colors.buttonDark,
    fontFamily: 'Nunito_800ExtraBold',
  },
  datePickerDayNumberSelected: {
    color: theme.colors.textPrimary,
  },
  datePickerDots: {
    height: 5,
    flexDirection: 'row',
    gap: 3,
    marginTop: 1,
  },
  datePickerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  occupiedHint: {
    marginTop: 11,
    padding: 10,
    backgroundColor: '#F7FBFC',
    borderRadius: 16,
  },
  occupiedHintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  occupiedHintTitle: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  occupiedHintLabel: {
    marginTop: 5,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
  },
  occupiedTaskList: {
    maxHeight: 88,
    marginTop: 5,
  },
  occupiedTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 4,
  },
  occupiedTaskDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  occupiedTaskTextWrap: {
    flex: 1,
  },
  occupiedTaskTitle: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
  occupiedTaskDates: {
    marginTop: 1,
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontFamily: 'Nunito_500Medium',
  },
  dateModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
    marginTop: 13,
  },
  dateModalCancel: {
    minWidth: 80,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F8FA',
    borderRadius: theme.borderRadius.full,
  },
  dateModalCancelText: {
    color: theme.colors.buttonDark,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  dateModalConfirm: {
    minWidth: 108,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  dateModalConfirmText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  errorText: {
    color: theme.colors.accent,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
  },
  primaryButtonGradient: {
    borderRadius: theme.borderRadius.full,
  },
  primaryButton: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: theme.colors.cardBackground,
    fontSize: 16,
    fontFamily: 'Nunito_800ExtraBold',
  },
  taskCard: {
    marginTop: 14,
    borderRadius: 24,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    shadowColor: theme.colors.canvas,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 1,
  },
  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  taskTitleRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingRight: 10,
  },
  taskTextWrap: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 17,
    fontFamily: 'Nunito_800ExtraBold',
    color: theme.colors.textPrimary,
  },
  taskMeta: {
    marginTop: 3,
    color: theme.colors.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
  },
  taskOwnerText: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
  },
  dailyAppInputRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    backgroundColor: '#F7FBFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
  },
  dailyAppPickerTextWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  dailyAppPickerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
  },
  dailyAppPickerSubtitle: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontFamily: 'Nunito_500Medium',
  },
  appModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(57, 83, 91, 0.48)',
  },
  appModalPanel: {
    maxHeight: '85%',
    padding: 16,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  appModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  appModalTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  appModalTitle: {
    marginTop: 4,
    color: theme.colors.textPrimary,
    fontSize: 19,
    fontFamily: 'Nunito_800ExtraBold',
  },
  appSearchRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    backgroundColor: '#F7FBFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
  },
  appSearchInput: {
    flex: 1,
    paddingVertical: 8,
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontFamily: 'Nunito_500Medium',
  },
  noAppOption: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 10,
    backgroundColor: '#EAF7FA',
    borderRadius: 16,
  },
  installedAppsList: {
    flexGrow: 0,
    marginTop: 9,
  },
  installedAppRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  installedAppIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF7FA',
    borderRadius: 12,
  },
  installedAppTextWrap: {
    flex: 1,
  },
  installedAppTitle: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
  installedAppPackage: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontFamily: 'Nunito_500Medium',
  },
  appPickerState: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appPickerStateText: {
    paddingVertical: 16,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
  },
  appPickerError: {
    paddingVertical: 16,
    color: theme.colors.accent,
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
  },
  dailyTimeButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    backgroundColor: '#F7FBFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
  },
  dailyTimeButtonTask: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
    paddingHorizontal: 10,
    backgroundColor: '#F7FBFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
  },
  dailyTimeButtonText: {
    flex: 1,
    color: theme.colors.buttonDark,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  dailyScheduleRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F7FBFC',
    borderRadius: 16,
  },
  dailyScheduleLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dailyScheduleLabel: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  badgeNeutral: {
    backgroundColor: '#F3F8FA',
    borderColor: theme.colors.border,
  },
  badgeComplete: {
    backgroundColor: '#EFF8F4',
    borderColor: '#CDE8DA',
  },
  badgeDeadline: {
    backgroundColor: '#EAF7FA',
    borderColor: '#CDECF4',
  },
  badgeOverdue: {
    backgroundColor: '#FFF2F0',
    borderColor: '#F3D0CA',
  },
  badgeText: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
  badgeTextOverdue: {
    color: theme.colors.accent,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F8FA',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 6,
  },
  progressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.success,
  },
  milestoneRowTask: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  miniButtonWide: {
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EAF7FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
  },
  miniButtonText: {
    color: theme.colors.buttonDark,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  subtaskComposerRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  subtaskInput: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: theme.colors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
  },
  subtaskEditInput: {
    flex: 1,
    minHeight: 34,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
  },
  miniButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF7FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  subtaskRow: {
    marginTop: 8,
    minHeight: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F7FBFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  subtaskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  subtaskText: {
    color: theme.colors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
    flexShrink: 1,
  },
  subtaskRemove: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F8FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  emptyState: {
    marginTop: 16,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontFamily: 'Nunito_600SemiBold',
  },
  taskViewTabs: {
    flexDirection: 'row',
    marginTop: 14,
    padding: 4,
    gap: 4,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.border,
  },
  taskViewTab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  taskViewTabActive: {
    backgroundColor: theme.colors.cardBackground,
  },
  taskViewTabText: {
    color: theme.colors.textSecondary,
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
  },
  taskViewTabTextActive: {
    color: theme.colors.buttonDark,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodLabel: {
    color: theme.colors.buttonDark,
    fontSize: 12,
    fontWeight: '800',
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F7FBFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  periodButtonText: {
    color: theme.colors.buttonDark,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  periodButtonTextActive: {
    color: theme.colors.textPrimary,
  },
  subtaskPeriodBadge: {
    backgroundColor: '#F8F1E6',
    borderWidth: 1,
    borderColor: '#E8D8BA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  subtaskPeriodBadgeText: {
    color: theme.colors.buttonDark,
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
});
