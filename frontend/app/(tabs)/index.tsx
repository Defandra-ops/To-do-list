import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTodoStore } from '@/components/TodoStore';

type DraftMap = Record<string, string>;

type MilestoneDraftMap = Record<string, { startDate: string; endDate: string }>;

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const getLocalIsoDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const [startDateDraft, setStartDateDraft] = useState('');
  const [endDateDraft, setEndDateDraft] = useState('');
  const [formError, setFormError] = useState('');
  const [subtaskDrafts, setSubtaskDrafts] = useState<DraftMap>({});
  const [milestoneDrafts, setMilestoneDrafts] = useState<MilestoneDraftMap>({});

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
    addTask(taskDraft, startDateDraft, endDateDraft, assigneeIds);
    setTaskDraft('');
    setStartDateDraft('');
    setEndDateDraft('');
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

  const addSubtaskFromDraft = (taskId: string) => {
    const value = subtaskDrafts[taskId] ?? '';
    if (!value.trim()) return;
    addSubtask(taskId, value);
    setSubtaskDraft(taskId, '');
  };

  const getMilestoneDraft = (taskId: string, startDate: string, endDate: string) => {
    return milestoneDrafts[taskId] ?? { startDate, endDate };
  };

  const setMilestoneDraft = (taskId: string, key: 'startDate' | 'endDate', value: string) => {
    setMilestoneDrafts((prev) => {
      const next = prev[taskId] ?? { startDate: '', endDate: '' };
      return {
        ...prev,
        [taskId]: {
          ...next,
          [key]: value,
        },
      };
    });
  };

  const saveMilestone = (taskId: string, startDate: string, endDate: string) => {
    if (startDate && !isIsoDate(startDate)) return;
    if (endDate && !isIsoDate(endDate)) return;
    if (startDate && endDate && startDate > endDate) return;

    updateTaskMilestone(taskId, startDate, endDate);
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

              <View style={styles.milestoneRow}>
                <TextInput
                  style={styles.dateInput}
                  placeholder="Start YYYY-MM-DD"
                  placeholderTextColor="#000000"
                  value={startDateDraft}
                  onChangeText={setStartDateDraft}
                  returnKeyType="next"
                />
                <TextInput
                  style={styles.dateInput}
                  placeholder="Deadline YYYY-MM-DD"
                  placeholderTextColor="#000000"
                  value={endDateDraft}
                  onChangeText={setEndDateDraft}
                  onSubmitEditing={addTaskFromDraft}
                  returnKeyType="done"
                />
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
          const milestone = getMilestoneDraft(item.id, item.startDate, item.endDate);
          const statusLabel = item.completed ? 'Completed' : 'In progress';
          const deadlineLabel = item.endDate ? `Deadline ${item.endDate}` : 'No deadline';
          const isOverdue = Boolean(item.endDate) && !item.completed && item.endDate < getLocalIsoDate();
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
                    <Text style={styles.taskMeta}>Subtasks done: {done}/{total}</Text>
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
                <TextInput
                  style={styles.dateInputTask}
                  placeholder="Start YYYY-MM-DD"
                  placeholderTextColor="#b09a87"
                  value={milestone.startDate}
                  onChangeText={(text) => setMilestoneDraft(item.id, 'startDate', text)}
                />
                <TextInput
                  style={styles.dateInputTask}
                  placeholder="Deadline YYYY-MM-DD"
                  placeholderTextColor="#b09a87"
                  value={milestone.endDate}
                  onChangeText={(text) => setMilestoneDraft(item.id, 'endDate', text)}
                />
                <Pressable
                  style={styles.miniButtonWide}
                  onPress={() => saveMilestone(item.id, milestone.startDate, milestone.endDate)}>
                  <Text style={styles.miniButtonText}>Save</Text>
                </Pressable>
              </View>

              <View style={styles.subtaskComposerRow}>
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
  dateInput: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#f1f1f1',
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#d6d6d6',
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
  dateInputTask: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#f1f1f1',
    borderWidth: 1,
    borderColor: '#d6d6d6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#1f1f1f',
    fontSize: 12,
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
});
