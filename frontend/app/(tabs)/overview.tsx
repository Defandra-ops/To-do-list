import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Task, useTodoStore } from '@/components/TodoStore';

const getLocalIsoDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function OverviewRecordScreen() {
  const { tasks, users } = useTodoStore();

  const userById = useMemo(() => {
    return users.reduce<Record<string, string>>((acc, user) => {
      acc[user.id] = user.name;
      return acc;
    }, {});
  }, [users]);

  const { completedTasks, failedTasks } = useMemo(() => {
    const today = getLocalIsoDate();
    const completed = tasks.filter((task) => task.completed);
    const failed = tasks.filter((task) => !task.completed && Boolean(task.endDate) && task.endDate < today);
    return { completedTasks: completed, failedTasks: failed };
  }, [tasks]);

  const getUserNames = (ids: string[]) => {
    const names = ids.map((id) => userById[id]).filter((name): name is string => Boolean(name));
    return names.length > 0 ? names.join(', ') : 'Unknown user';
  };

  const renderRecord = (task: Task, type: 'done' | 'failed') => {
    const creator = userById[task.createdByUserId] ?? 'Unknown user';
    const mustDo = getUserNames(task.assignedUserIds);

    return (
      <View
        key={task.id}
        style={[styles.recordCard, type === 'done' ? styles.recordCardDone : styles.recordCardFailed]}>
        <View style={styles.recordTopRow}>
          <Text style={styles.recordTitle}>{task.title}</Text>
          <View style={[styles.recordBadge, type === 'done' ? styles.badgeDone : styles.badgeFailed]}>
            <Text style={styles.recordBadgeText}>{type === 'done' ? 'Done' : 'Failed'}</Text>
          </View>
        </View>

        <Text style={styles.recordMeta}>Created by: {creator}</Text>
        <Text style={styles.recordMeta}>Must do: {mustDo}</Text>
        <Text style={styles.recordMeta}>Deadline: {task.endDate || 'No deadline'}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bubbleOne} />
      <View style={styles.bubbleTwo} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Overview Records</Text>
        <Text style={styles.subtitle}>Track everything that is done and failed by deadline.</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statDone]}>
            <Ionicons name="checkmark-circle" size={18} color="#0f7a44" />
            <Text style={styles.statNumber}>{completedTasks.length}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={[styles.statCard, styles.statFailed]}>
            <Ionicons name="alert-circle" size={18} color="#b42318" />
            <Text style={styles.statNumber}>{failedTasks.length}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>

        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Done Tasks</Text>
          {completedTasks.length === 0 ? (
            <Text style={styles.emptyText}>No completed tasks yet.</Text>
          ) : (
            completedTasks.map((task) => renderRecord(task, 'done'))
          )}
        </View>

        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Failed Tasks</Text>
          {failedTasks.length === 0 ? (
            <Text style={styles.emptyText}>No failed tasks right now.</Text>
          ) : (
            failedTasks.map((task) => renderRecord(task, 'failed'))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f7ff',
  },
  bubbleOne: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#deecff',
    top: -70,
    left: -45,
  },
  bubbleTwo: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#d5e8ff',
    right: -40,
    bottom: -50,
  },
  content: {
    padding: 16,
    paddingBottom: 42,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f4fa8',
    marginTop: 8,
  },
  subtitle: {
    marginTop: 6,
    color: '#3e5f88',
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
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  statDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  statFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#143f7d',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38557a',
  },
  sectionWrap: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: '#fcfeff',
    borderWidth: 1,
    borderColor: '#cbdef3',
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#143f7d',
  },
  emptyText: {
    color: '#566b89',
    fontWeight: '600',
    fontSize: 13,
  },
  recordCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  recordCardDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.11)',
    borderColor: 'rgba(16, 185, 129, 0.28)',
  },
  recordCardFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.28)',
  },
  recordTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  recordTitle: {
    flex: 1,
    color: '#162b47',
    fontWeight: '800',
    fontSize: 14,
  },
  recordBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  badgeFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  recordBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1b365c',
  },
  recordMeta: {
    color: '#3f5a7c',
    fontWeight: '600',
    fontSize: 12,
  },
});