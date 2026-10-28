import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTodoStore } from '@/components/TodoStore';
import { getInstalledApps, type InstalledApp } from '@/modules/installed-app-picker';

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

const formatReadableDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

const formatTime = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
};

const parseTime = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour || 0, minute || 0, 0, 0);
  return date;
};

const toTimeValue = (date: Date) => `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;

export default function PlannerScreen() {
  const {
    tasks,
    users,
    addTask,
    removeTask,
    toggleTask,
    updateTaskMilestone,
    addSubtask,
    toggleSubtask,
    removeSubtask,
  } = useTodoStore();

  const router = useRouter();
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [taskDraft, setTaskDraft] = useState('');
  const [taskPeriod, setTaskPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [dailyTimeDraft, setDailyTimeDraft] = useState('09:00');
  const [appNameDraft, setAppNameDraft] = useState('');
  const [appPackageNameDraft, setAppPackageNameDraft] = useState('');
  const [startDateDraft, setStartDateDraft] = useState('');
  const [endDateDraft, setEndDateDraft] = useState('');
  const [formError, setFormError] = useState('');
  const [subtaskDrafts, setSubtaskDrafts] = useState<DraftMap>({});
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

  const pickerMonthDays = useMemo(() => {
    const firstWeekday = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1).getDay();
    const daysInMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstWeekday + 1;
      if (day < 1 || day > daysInMonth) return '';
      const date = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), day);
      return formatIsoDate(date);
    });
  }, [pickerMonth]);

  const pickerOccupiedTasks = useMemo(
    () => tasks.filter((task) => taskOccupiesDate(task, pickerPreviewDate)),
    [pickerPreviewDate, tasks]
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

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((task) => task.completed).length;
    const allSubtasks = tasks.flatMap((task) => task.subtasks);
    const doneSubtasks = allSubtasks.filter((subtask) => subtask.completed).length;
    const withDeadlines = tasks.filter((task) => task.endDate).length;
    const today = getLocalIsoDate();
    const overdueTasks = tasks.filter(
      (task) => Boolean(task.endDate) && !task.completed && task.endDate < today
    );

    return {
      totalTasks,
      doneTasks,
      allSubtasks: allSubtasks.length,
      doneSubtasks,
      withDeadlines,
      overdueTasks,
    };
  }, [tasks]);

  const addTaskFromDraft = () => {
    if (!taskDraft.trim()) return;

    if (startDateDraft && !isIsoDate(startDateDraft)) {
      setFormError('Start date must use YYYY-MM-DD');
      return;
    }

    if (endDateDraft && !isIsoDate(endDateDraft)) {
      setFormError('Deadline must use YYYY-MM-DD');
      return;
    }

    if (startDateDraft && endDateDraft && startDateDraft > endDateDraft) {
      setFormError('Start date must be before deadline');
      return;
    }

    const assigneeIds = selectedAssigneeIds.length > 0 ? selectedAssigneeIds : [];
    addTask(
      taskDraft,
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
    setDailyTimeDraft('09:00');
    setAppNameDraft('');
    setAppPackageNameDraft('');
    setSelectedAssigneeIds([]);
    setFormError('');
  };

  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const setSubtaskDraft = (taskId: string, value: string) => {
    setSubtaskDrafts((prev) => ({ ...prev, [taskId]: value }));
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

  const addSubtaskFromDraft = (taskId: string) => {
    const value = subtaskDrafts[taskId] ?? '';
    if (!value.trim()) return;
    addSubtask(taskId, value);
    setSubtaskDraft(taskId, '');
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
    <SafeAreaView style={styles.container}>
      <View style={styles.backdropBubbleOne} />
      <View style={styles.backdropBubbleTwo} />

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.headerTopRow}>
              <View>
                <Text style={styles.eyebrow}>Planner</Text>
                <Text style={styles.title}>Big Tasks</Text>
              </View>
              <Pressable style={styles.userIconButton} onPress={() => router.push('/(tabs)/two')}>
                <Ionicons name="person-circle-outline" size={30} color="#0f4fa8" />
              </Pressable>
            </View>
            <Text style={styles.subtitle}>Set from-date, deadline, and then break the work into subtasks.</Text>

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

            {stats.overdueTasks.length > 0 ? (
              <View style={styles.overdueCard}>
                <View style={styles.overdueHeader}>
                  <View style={styles.overdueDot} />
                  <View style={styles.overdueTextWrap}>
                    <Text style={styles.overdueTitle}>Overdue tasks</Text>
                    <Text style={styles.overdueSubtitle}>
                      {stats.overdueTasks.length} task{stats.overdueTasks.length === 1 ? '' : 's'} missed the deadline
                    </Text>
                  </View>
                </View>

                <View style={styles.overdueChipRow}>
                  {stats.overdueTasks.map((task) => (
                    <View key={task.id} style={styles.overdueChip}>
                      <Text style={styles.overdueChipText}>
                        {task.title} · {userById[task.createdByUserId] ?? 'Unknown user'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.composerCard}>
              <TextInput
                style={styles.taskInput}
                placeholder="Add a task..."
                placeholderTextColor="#000000"
                value={taskDraft}
                onChangeText={setTaskDraft}
                returnKeyType="next"
              />

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
                    <Ionicons name="apps-outline" size={18} color="#0f4fa8" />
                    <View style={styles.dailyAppPickerTextWrap}>
                      <Text style={styles.dailyAppPickerTitle}>
                        {appNameDraft || 'Choose installed app'}
                      </Text>
                      <Text style={styles.dailyAppPickerSubtitle}>
                        {appPackageNameDraft || 'Optional · habit without an app'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#66839e" />
                  </Pressable>
                  <Pressable style={styles.dailyTimeButton} onPress={() => openTimePicker({ scope: 'new' })}>
                    <Ionicons name="time-outline" size={18} color="#0f4fa8" />
                    <Text style={styles.dailyTimeButtonText}>Every day at {formatTime(dailyTimeDraft)}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#66839e" />
                  </Pressable>
                </>
              ) : null}

              <View style={styles.milestoneRow}>
                  <Pressable
                    style={[styles.datePickerButton, !startDateDraft && styles.datePickerButtonEmpty]}
                    onPress={() => openDatePicker({ scope: 'new', field: 'startDate' })}>
                    <Ionicons name="calendar-outline" size={16} color="#0f4fa8" />
                    <Text style={[styles.datePickerText, !startDateDraft && styles.datePickerPlaceholderText]}>
                      {startDateDraft || 'Pick start date'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.datePickerButton, !endDateDraft && styles.datePickerButtonEmpty]}
                    onPress={() => openDatePicker({ scope: 'new', field: 'endDate' })}>
                    <Ionicons name="calendar-outline" size={16} color="#0f4fa8" />
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
                colors={['#f3faff', '#84ccff', '#4dacff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}>
                <Pressable style={styles.primaryButton} onPress={addTaskFromDraft}>
                  <Ionicons name="add" size={18} color="#1b3d5a" />
                  <Text style={styles.primaryButtonText}>Create Task</Text>
                </Pressable>
              </LinearGradient>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const total = item.subtasks.length;
          const done = item.subtasks.filter((subtask) => subtask.completed).length;
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
          const statusLabel = item.completed ? 'Completed' : item.isDaily ? 'Daily' : 'In progress';
          const deadlineLabel = item.endDate ? `Deadline ${item.endDate}` : 'No deadline';
          const isOverdue = !item.isDaily && Boolean(item.endDate) && !item.completed && item.endDate < getLocalIsoDate();
          const creatorName = userById[item.createdByUserId] ?? 'Unknown user';
          const deadlineByName = userById[item.deadlineByUserId] ?? creatorName;
          const includedUsers = item.participantUserIds
            .map((userId) => userById[userId])
            .filter((name): name is string => Boolean(name));
          const assignedUsers = item.assignedUserIds
            .map((userId) => userById[userId])
            .filter((name): name is string => Boolean(name));

          return (
            <View style={[styles.taskCard, isOverdue && styles.taskCardOverdue]}>
              <View style={styles.taskTopRow}>
                <Pressable style={styles.taskTitleRow} onPress={() => toggleTask(item.id)}>
                  <Ionicons
                    name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={item.completed ? '#2f8f5b' : isOverdue ? '#c0392b' : '#6a5441'}
                  />
                  <View style={styles.taskTextWrap}>
                    <Text style={[styles.taskTitle, item.completed && styles.completedText]}>{item.title}</Text>
                    <Text style={styles.taskMeta}>
                      {item.isDaily ? `Daily at ${formatTime(item.dailyTime)} · ` : ''}Subtasks done: {done}/{total}
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
                      <View style={[styles.badge, item.completed ? styles.badgeComplete : styles.badgeNeutral]}>
                        <Text style={styles.badgeText}>{statusLabel}</Text>
                      </View>
                      <View style={[styles.badge, styles.badgeDeadline]}>
                        <Text style={styles.badgeText}>{deadlineLabel}</Text>
                      </View>
                      {isOverdue ? (
                        <View style={[styles.badge, styles.badgeOverdue]}>
                          <Text style={[styles.badgeText, styles.badgeTextOverdue]}>Overdue</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>

                <Pressable style={styles.iconButton} onPress={() => removeTask(item.id)}>
                  <Ionicons name="trash-outline" size={18} color="#8e4a45" />
                </Pressable>
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
                  <Ionicons name="calendar-outline" size={15} color="#8b7a68" />
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
                  <Ionicons name="calendar-outline" size={15} color="#8b7a68" />
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
                  <Ionicons name="repeat-outline" size={17} color="#0f4fa8" />
                  <Text style={styles.dailyScheduleLabel}>Repeat daily</Text>
                </View>
                <Switch
                  value={milestone.isDaily}
                  onValueChange={(value) => setMilestoneDraft(item.id, 'isDaily', value)}
                  trackColor={{ false: '#cbd5df', true: '#88b9e3' }}
                  thumbColor={milestone.isDaily ? '#2368a7' : '#f4f3f4'}
                />
              </View>
              {milestone.isDaily ? (
                <>
                  <Pressable
                    style={styles.dailyAppInputRow}
                    onPress={() => void openAppPicker({ scope: 'milestone', taskId: item.id })}>
                    <Ionicons name="apps-outline" size={17} color="#0f4fa8" />
                    <View style={styles.dailyAppPickerTextWrap}>
                      <Text style={styles.dailyAppPickerTitle}>
                        {milestone.appName || 'Choose installed app'}
                      </Text>
                      <Text style={styles.dailyAppPickerSubtitle}>
                        {milestone.appPackageName || 'Optional · habit without an app'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#66839e" />
                  </Pressable>
                  <Pressable style={styles.dailyTimeButtonTask} onPress={() => openTimePicker({ scope: 'milestone', taskId: item.id })}>
                    <Ionicons name="time-outline" size={16} color="#0f4fa8" />
                    <Text style={styles.dailyTimeButtonText}>Every day at {formatTime(milestone.dailyTime)}</Text>
                    <Ionicons name="chevron-forward" size={15} color="#66839e" />
                  </Pressable>
                </>
              ) : null}

              <View style={styles.subtaskComposerRow}>
                <View style={styles.subtaskPeriodBadge}>
                  <Text style={styles.subtaskPeriodBadgeText}>Daily</Text>
                </View>
                <TextInput
                  style={styles.subtaskInput}
                  placeholder="Add subtask..."
                  placeholderTextColor="#b09a87"
                  value={subtaskDrafts[item.id] ?? ''}
                  onChangeText={(text) => setSubtaskDraft(item.id, text)}
                  onSubmitEditing={() => addSubtaskFromDraft(item.id)}
                  returnKeyType="done"
                />
                <Pressable style={styles.miniButton} onPress={() => addSubtaskFromDraft(item.id)}>
                  <Ionicons name="add" size={16} color="#3f2f1d" />
                </Pressable>
              </View>

              {item.subtasks.map((subtask) => (
                <View key={subtask.id} style={styles.subtaskRow}>
                  <Pressable style={styles.subtaskLeft} onPress={() => toggleSubtask(item.id, subtask.id)}>
                    <Ionicons
                      name={subtask.completed ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={subtask.completed ? '#2f8f5b' : '#8b7a68'}
                    />
                    <Text style={[styles.subtaskText, subtask.completed && styles.completedText]}>{subtask.title}</Text>
                  </Pressable>
                  <Pressable style={styles.subtaskRemove} onPress={() => removeSubtask(item.id, subtask.id)}>
                    <Ionicons name="close" size={16} color="#8e4a45" />
                  </Pressable>
                </View>
              ))}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyState}>No tasks yet. Start with one big goal above.</Text>}
      />

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
                <Ionicons name="close" size={20} color="#344861" />
              </Pressable>
            </View>

            <View style={styles.dateModalMonthRow}>
              <Text style={styles.dateModalMonthTitle}>
                {pickerMonth.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
              </Text>
              <View style={styles.dateModalMonthControls}>
                <Pressable accessibilityLabel="Previous month" style={styles.dateModalMonthButton} onPress={() => movePickerMonth(-1)}>
                  <Ionicons name="chevron-back" size={18} color="#344861" />
                </Pressable>
                <Pressable accessibilityLabel="Next month" style={styles.dateModalMonthButton} onPress={() => movePickerMonth(1)}>
                  <Ionicons name="chevron-forward" size={18} color="#344861" />
                </Pressable>
              </View>
            </View>

            <View style={styles.datePickerWeekdays}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
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
                    accessibilityLabel={date ? `${formatReadableDate(date)}${occupiedTasks.length ? `, occupied by ${occupiedTasks.map((task) => task.title).join(', ')}` : ', no tasks scheduled'}` : undefined}
                    style={[styles.datePickerDay, isSelected && styles.datePickerDaySelected]}
                    onPress={() => setPickerPreviewDate(date)}>
                    {date ? (
                      <>
                        <Text style={[styles.datePickerDayNumber, isToday && styles.datePickerDayToday, isSelected && styles.datePickerDayNumberSelected]}>
                          {Number(date.slice(-2))}
                        </Text>
                        <View style={styles.datePickerDots}>
                          {occupiedTasks.slice(0, 3).map((task) => (
                            <View key={task.id} style={[styles.datePickerDot, { backgroundColor: task.completed ? '#25805a' : '#d66c3d' }]} />
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
                <Ionicons name="information-circle-outline" size={18} color="#2368a7" />
                <Text style={styles.occupiedHintTitle}>{formatReadableDate(pickerPreviewDate)}</Text>
              </View>
              <Text style={styles.occupiedHintLabel}>
                {pickerOccupiedTasks.length > 0 ? 'Already occupied by:' : 'No tasks currently occupy this date.'}
              </Text>
              {pickerOccupiedTasks.length > 0 ? (
                <ScrollView style={styles.occupiedTaskList} nestedScrollEnabled>
                  {pickerOccupiedTasks.map((task) => (
                    <View key={task.id} style={styles.occupiedTaskRow}>
                      <View style={[styles.occupiedTaskDot, { backgroundColor: task.completed ? '#25805a' : '#d66c3d' }]} />
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
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
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
        <View style={styles.appModalBackdrop}>
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
                <Ionicons name="close" size={20} color="#344861" />
              </Pressable>
            </View>

            <View style={styles.appSearchRow}>
              <Ionicons name="search-outline" size={18} color="#688094" />
              <TextInput
                style={styles.appSearchInput}
                placeholder="Search installed apps"
                placeholderTextColor="#8293a1"
                value={appSearchDraft}
                onChangeText={setAppSearchDraft}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Pressable style={styles.noAppOption} onPress={() => selectInstalledApp(null)}>
              <Ionicons name="walk-outline" size={20} color="#2368a7" />
              <View style={styles.installedAppTextWrap}>
                <Text style={styles.installedAppTitle}>Habit without an app</Text>
                <Text style={styles.installedAppPackage}>For jogging, reading, and similar routines</Text>
              </View>
            </Pressable>

            {isLoadingApps ? (
              <View style={styles.appPickerState}>
                <ActivityIndicator color="#2368a7" />
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
                      <Ionicons name="phone-portrait-outline" size={18} color="#2368a7" />
                    </View>
                    <View style={styles.installedAppTextWrap}>
                      <Text style={styles.installedAppTitle}>{app.name}</Text>
                      <Text style={styles.installedAppPackage}>{app.packageName}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#8293a1" />
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.appPickerStateText}>No matching launchable apps found.</Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f7ff',
  },
  backdropBubbleOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#deecff',
    top: -60,
    right: -70,
  },
  backdropBubbleTwo: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#d5e8ff',
    bottom: 40,
    left: -60,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  headerWrap: {
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 79, 168, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(15, 79, 168, 0.2)',
  },
  eyebrow: {
    color: '#6f6f6f',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1f1f1f',
    marginTop: 4,
  },
  subtitle: {
    marginTop: 6,
    color: '#666666',
    fontSize: 14,
  },
  assignTitle: {
    marginTop: 2,
    color: '#0f4fa8',
    fontSize: 12,
    fontWeight: '800',
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
    backgroundColor: '#eef6ff',
    borderWidth: 1,
    borderColor: '#c8def3',
  },
  assignChipSelected: {
    backgroundColor: 'rgba(15, 79, 168, 0.16)',
    borderColor: 'rgba(15, 79, 168, 0.42)',
  },
  assignChipText: {
    color: '#0f4fa8',
    fontSize: 12,
    fontWeight: '700',
  },
  assignChipTextSelected: {
    color: '#08306b',
  },
  statsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(46, 148, 255, 0.14)',
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46, 148, 255, 0.28)',
  },
  statCardTotal: {
    backgroundColor: 'rgba(27, 125, 255, 0.20)',
    borderColor: 'rgba(27, 125, 255, 0.42)',
  },
  statCardCompleted: {
    backgroundColor: 'rgba(66, 164, 255, 0.18)',
    borderColor: 'rgba(66, 164, 255, 0.34)',
  },
  statCardDeadline: {
    backgroundColor: 'rgba(20, 138, 255, 0.22)',
    borderColor: 'rgba(20, 138, 255, 0.46)',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f4fa8',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#13539f',
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
    borderRadius: 999,
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
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: '#f7fbff',
    borderWidth: 1,
    borderColor: '#d5e4f2',
    padding: 12,
    gap: 8,
  },
  taskInput: {
    borderRadius: 12,
    backgroundColor: '#f1f1f1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#1f1f1f',
    fontWeight: '600',
  },
  milestoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  datePickerButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#f1f1f1',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#d6d6d6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePickerButtonEmpty: {
    backgroundColor: '#f6f8fb',
  },
  datePickerText: {
    color: '#1f1f1f',
    fontWeight: '600',
    flex: 1,
  },
  datePickerPlaceholderText: {
    color: '#7c7c7c',
    fontWeight: '500',
  },
  datePickerButtonTask: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: '#f1f1f1',
    borderWidth: 1,
    borderColor: '#d6d6d6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePickerTextTask: {
    color: '#1f1f1f',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  datePickerPlaceholderTextTask: {
    color: '#7c7c7c',
    fontWeight: '500',
  },
  dateModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(18, 38, 54, 0.48)',
  },
  dateModalPanel: {
    maxHeight: '90%',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d5e1e9',
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
    color: '#688094',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  dateModalTitle: {
    marginTop: 4,
    color: '#20394f',
    fontSize: 19,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  dateModalClose: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff4f7',
    borderRadius: 7,
  },
  dateModalMonthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateModalMonthTitle: {
    color: '#20394f',
    fontSize: 15,
    fontWeight: '800',
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
    backgroundColor: '#eff4f7',
    borderRadius: 7,
  },
  datePickerWeekdays: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  datePickerWeekday: {
    width: `${100 / 7}%`,
    color: '#8392a0',
    fontSize: 10,
    fontWeight: '800',
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
    backgroundColor: '#dcecf7',
  },
  datePickerDayNumber: {
    color: '#34495b',
    fontSize: 12,
    fontWeight: '600',
  },
  datePickerDayToday: {
    color: '#176ba8',
    fontWeight: '900',
  },
  datePickerDayNumberSelected: {
    color: '#135a91',
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
    backgroundColor: '#f1f6fa',
    borderRadius: 8,
  },
  occupiedHintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  occupiedHintTitle: {
    flex: 1,
    color: '#20394f',
    fontSize: 12,
    fontWeight: '800',
  },
  occupiedHintLabel: {
    marginTop: 5,
    color: '#687d8e',
    fontSize: 11,
    fontWeight: '600',
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
    color: '#34495b',
    fontSize: 11,
    fontWeight: '700',
  },
  occupiedTaskDates: {
    marginTop: 1,
    color: '#788b9b',
    fontSize: 10,
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
    backgroundColor: '#eff4f7',
    borderRadius: 7,
  },
  dateModalCancelText: {
    color: '#526577',
    fontSize: 12,
    fontWeight: '700',
  },
  dateModalConfirm: {
    minWidth: 108,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    backgroundColor: '#2368a7',
    borderRadius: 7,
  },
  dateModalConfirmText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  errorText: {
    color: '#9a4b3b',
    fontWeight: '600',
    fontSize: 12,
  },
  primaryButtonGradient: {
    borderRadius: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  primaryButtonText: {
    color: '#1b3d5a',
    fontWeight: '800',
  },
  taskCard: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: '#f7fbff',
    borderWidth: 1,
    borderColor: '#d5e4f2',
    padding: 12,
  },
  taskCardOverdue: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderColor: 'rgba(220, 38, 38, 0.28)',
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
    fontWeight: '800',
    color: '#1f1f1f',
  },
  taskMeta: {
    marginTop: 3,
    color: '#666666',
    fontWeight: '600',
    fontSize: 12,
  },
  taskOwnerText: {
    marginTop: 2,
    color: '#3f6ea8',
    fontWeight: '700',
    fontSize: 11,
  },
  dailyAppInputRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    backgroundColor: '#f3f8fc',
    borderWidth: 1,
    borderColor: '#d3e2ee',
    borderRadius: 9,
  },
  dailyAppPickerTextWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  dailyAppPickerTitle: {
    color: '#20394f',
    fontSize: 13,
    fontWeight: '600',
  },
  dailyAppPickerSubtitle: {
    marginTop: 2,
    color: '#71849a',
    fontSize: 10,
  },
  appModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(18, 38, 54, 0.48)',
  },
  appModalPanel: {
    maxHeight: '85%',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d5e1e9',
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
    color: '#20394f',
    fontSize: 19,
    fontWeight: '800',
  },
  appSearchRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    backgroundColor: '#f1f6fa',
    borderWidth: 1,
    borderColor: '#dce6ed',
    borderRadius: 8,
  },
  appSearchInput: {
    flex: 1,
    paddingVertical: 8,
    color: '#20394f',
    fontSize: 13,
  },
  noAppOption: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 10,
    backgroundColor: '#edf5fb',
    borderRadius: 8,
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
    borderBottomColor: '#dce6ed',
  },
  installedAppIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3eff8',
    borderRadius: 8,
  },
  installedAppTextWrap: {
    flex: 1,
  },
  installedAppTitle: {
    color: '#20394f',
    fontSize: 13,
    fontWeight: '700',
  },
  installedAppPackage: {
    marginTop: 2,
    color: '#788b9b',
    fontSize: 10,
  },
  appPickerState: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appPickerStateText: {
    paddingVertical: 16,
    color: '#788b9b',
    fontSize: 12,
    textAlign: 'center',
  },
  appPickerError: {
    paddingVertical: 16,
    color: '#9a4b3b',
    fontSize: 12,
    textAlign: 'center',
  },
  dailyTimeButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    backgroundColor: '#eef6ff',
    borderWidth: 1,
    borderColor: '#c8def3',
    borderRadius: 9,
  },
  dailyTimeButtonTask: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
    paddingHorizontal: 10,
    backgroundColor: '#eef6ff',
    borderWidth: 1,
    borderColor: '#c8def3',
    borderRadius: 9,
  },
  dailyTimeButtonText: {
    flex: 1,
    color: '#0f4fa8',
    fontSize: 12,
    fontWeight: '700',
  },
  dailyScheduleRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f3f8fc',
    borderRadius: 8,
  },
  dailyScheduleLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dailyScheduleLabel: {
    color: '#34495b',
    fontSize: 12,
    fontWeight: '700',
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
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeNeutral: {
    backgroundColor: '#f3f3f3',
    borderColor: '#d6d6d6',
  },
  badgeComplete: {
    backgroundColor: '#efefef',
    borderColor: '#bdbdbd',
  },
  badgeDeadline: {
    backgroundColor: '#f6f6f6',
    borderColor: '#dcdcdc',
  },
  badgeOverdue: {
    backgroundColor: 'rgba(220, 38, 38, 0.14)',
    borderColor: 'rgba(220, 38, 38, 0.34)',
  },
  badgeText: {
    color: '#1f1f1f',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextOverdue: {
    color: '#991b1b',
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf6ff',
  },
  progressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#e6e6e6',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2f8f5b',
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
    backgroundColor: '#eaf4ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c6dbef',
    paddingHorizontal: 10,
  },
  miniButtonText: {
    color: '#1f1f1f',
    fontWeight: '700',
    fontSize: 12,
  },
  subtaskComposerRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  subtaskInput: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#f1f1f1',
    borderWidth: 1,
    borderColor: '#d6d6d6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#1f1f1f',
  },
  miniButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eaf4ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c6dbef',
  },
  subtaskRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f5f9ff',
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
    color: '#2a2a2a',
    fontWeight: '600',
    flexShrink: 1,
  },
  subtaskRemove: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#edf6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#8a8a8a',
  },
  emptyState: {
    marginTop: 16,
    textAlign: 'center',
    color: '#777777',
    fontWeight: '600',
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodLabel: {
    color: '#0f4fa8',
    fontSize: 12,
    fontWeight: '800',
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#eef6ff',
    borderWidth: 1,
    borderColor: '#c8def3',
  },
  periodButtonActive: {
    backgroundColor: '#0f4fa8',
    borderColor: '#0f4fa8',
  },
  periodButtonText: {
    color: '#0f4fa8',
    fontWeight: '700',
    fontSize: 12,
  },
  periodButtonTextActive: {
    color: '#ffffff',
  },
  subtaskPeriodBadge: {
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffd700',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  subtaskPeriodBadgeText: {
    color: '#856404',
    fontWeight: '700',
    fontSize: 11,
  },
});
