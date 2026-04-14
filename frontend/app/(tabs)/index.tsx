import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTodoStore } from '@/components/TodoStore';

type DraftMap = Record<string, string>;

type MilestoneDraftMap = Record<string, { startDate: string; endDate: string }>;

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export default function PlannerScreen() {
  const {
    tasks,
    addTask,
    removeTask,
    toggleTask,
    updateTaskMilestone,
    addSubtask,
    toggleSubtask,
    removeSubtask,
  } = useTodoStore();

  const [taskDraft, setTaskDraft] = useState('');
  const [startDateDraft, setStartDateDraft] = useState('');
  const [endDateDraft, setEndDateDraft] = useState('');
  const [formError, setFormError] = useState('');
  const [subtaskDrafts, setSubtaskDrafts] = useState<DraftMap>({});
  const [milestoneDrafts, setMilestoneDrafts] = useState<MilestoneDraftMap>({});

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((task) => task.completed).length;
    const allSubtasks = tasks.flatMap((task) => task.subtasks);
    const doneSubtasks = allSubtasks.filter((subtask) => subtask.completed).length;
    const withDeadlines = tasks.filter((task) => task.endDate).length;
    return { totalTasks, doneTasks, allSubtasks: allSubtasks.length, doneSubtasks, withDeadlines };
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

    addTask(taskDraft, startDateDraft, endDateDraft);
    setTaskDraft('');
    setStartDateDraft('');
    setEndDateDraft('');
    setFormError('');
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
            <Text style={styles.eyebrow}>Soft Focus Planner</Text>
            <Text style={styles.title}>Big Tasks + Milestones</Text>
            <Text style={styles.subtitle}>Set from-date, deadline, and then break the work into subtasks.</Text>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.totalTasks}</Text>
                <Text style={styles.statLabel}>Big Tasks</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.doneTasks}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.withDeadlines}</Text>
                <Text style={styles.statLabel}>With Deadline</Text>
              </View>
            </View>

            <View style={styles.composerCard}>
              <TextInput
                style={styles.taskInput}
                placeholder="Add a big task..."
                placeholderTextColor="#ad8f74"
                value={taskDraft}
                onChangeText={setTaskDraft}
                returnKeyType="next"
              />

              <View style={styles.milestoneRow}>
                <TextInput
                  style={styles.dateInput}
                  placeholder="Start YYYY-MM-DD"
                  placeholderTextColor="#ad8f74"
                  value={startDateDraft}
                  onChangeText={setStartDateDraft}
                  returnKeyType="next"
                />
                <TextInput
                  style={styles.dateInput}
                  placeholder="Deadline YYYY-MM-DD"
                  placeholderTextColor="#ad8f74"
                  value={endDateDraft}
                  onChangeText={setEndDateDraft}
                  onSubmitEditing={addTaskFromDraft}
                  returnKeyType="done"
                />
              </View>

              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <Pressable style={styles.primaryButton} onPress={addTaskFromDraft}>
                <Ionicons name="add" size={18} color="#3f2f1d" />
                <Text style={styles.primaryButtonText}>Create Task</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const total = item.subtasks.length;
          const done = item.subtasks.filter((subtask) => subtask.completed).length;
          const progress = total === 0 ? 0 : Math.round((done / total) * 100);
          const milestone = getMilestoneDraft(item.id, item.startDate, item.endDate);

          return (
            <View style={styles.taskCard}>
              <View style={styles.taskTopRow}>
                <Pressable style={styles.taskTitleRow} onPress={() => toggleTask(item.id)}>
                  <Ionicons
                    name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={item.completed ? '#2f8f5b' : '#6a5441'}
                  />
                  <View style={styles.taskTextWrap}>
                    <Text style={[styles.taskTitle, item.completed && styles.completedText]}>{item.title}</Text>
                    <Text style={styles.taskMeta}>Subtasks done: {done}/{total}</Text>
                    <Text style={styles.taskMeta}>
                      {item.startDate || 'No start date'} to {item.endDate || 'No deadline'}
                    </Text>
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
    backgroundColor: '#fff7ef',
  },
  backdropBubbleOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#ffe5cc',
    top: -60,
    right: -70,
  },
  backdropBubbleTwo: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#ffeec8',
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
  eyebrow: {
    color: '#8e6a42',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#412a17',
    marginTop: 4,
  },
  subtitle: {
    marginTop: 6,
    color: '#6d533c',
    fontSize: 14,
  },
  statsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#fff0e0',
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffd7b5',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3e2a18',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#8c6a4d',
  },
  composerCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: '#fffdf9',
    borderWidth: 1,
    borderColor: '#ffd9b7',
    padding: 12,
    gap: 8,
  },
  taskInput: {
    borderRadius: 12,
    backgroundColor: '#fff3e7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#3b2a19',
    fontWeight: '600',
  },
  milestoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#fff3e7',
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: '#3b2a19',
    borderWidth: 1,
    borderColor: '#ffdfc2',
  },
  errorText: {
    color: '#9d3129',
    fontWeight: '600',
    fontSize: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#ffd29f',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#efb572',
  },
  primaryButtonText: {
    color: '#3f2f1d',
    fontWeight: '800',
  },
  taskCard: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: '#fffdf9',
    borderWidth: 1,
    borderColor: '#ffd9b7',
    padding: 12,
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
    color: '#3a2816',
  },
  taskMeta: {
    marginTop: 3,
    color: '#86684f',
    fontWeight: '600',
    fontSize: 12,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffe7dd',
  },
  progressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 8,
    backgroundColor: '#f4e2cf',
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
    backgroundColor: '#fff3e7',
    borderWidth: 1,
    borderColor: '#ffdfc2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#3b2a19',
    fontSize: 12,
  },
  miniButtonWide: {
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffd8ac',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#efb572',
    paddingHorizontal: 10,
  },
  miniButtonText: {
    color: '#3f2f1d',
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
    backgroundColor: '#fff3e7',
    borderWidth: 1,
    borderColor: '#ffdfc2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#3b2a19',
  },
  miniButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffd8ac',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#efb572',
  },
  subtaskRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#fff6ed',
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
    color: '#4d3a28',
    fontWeight: '600',
    flexShrink: 1,
  },
  subtaskRemove: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffe6dc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#8f8a83',
  },
  emptyState: {
    marginTop: 16,
    textAlign: 'center',
    color: '#88684e',
    fontWeight: '600',
  },
});
