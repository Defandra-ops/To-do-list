import { useMemo } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { useTodoStore } from '@/components/TodoStore';

export default function OverviewScreen() {
  const { tasks } = useTodoStore();

  const summary = useMemo(() => {
    const inProgress = tasks.filter((task) => !task.completed && task.subtasks.some((subtask) => subtask.completed)).length;
    const readyToStart = tasks.filter((task) => task.subtasks.every((subtask) => !subtask.completed)).length;
    const finished = tasks.filter((task) => task.completed).length;
    return { inProgress, readyToStart, finished };
  }, [tasks]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bubbleOne} />
      <View style={styles.bubbleTwo} />

      <Text style={styles.title}>Progress Overview</Text>
      <Text style={styles.subtitle}>Keep momentum by moving one subtask at a time.</Text>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Task Flow</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Ready to start</Text>
          <Text style={styles.rowValue}>{summary.readyToStart}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>In progress</Text>
          <Text style={styles.rowValue}>{summary.inProgress}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Completed</Text>
          <Text style={styles.rowValue}>{summary.finished}</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Next Move</Text>
        <Text style={styles.panelBody}>
          Pick one big task and add 2-3 micro-subtasks. Completing tiny steps quickly keeps this board moving.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff8f1',
    padding: 16,
  },
  bubbleOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#ffe4cd',
    top: -70,
    left: -40,
  },
  bubbleTwo: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#ffeec8',
    bottom: -50,
    right: -40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#3f2d1b',
    marginTop: 8,
  },
  subtitle: {
    marginTop: 6,
    color: '#71533b',
    fontSize: 14,
  },
  panel: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: '#fffdf9',
    borderWidth: 1,
    borderColor: '#ffd8b5',
    padding: 14,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#3f2d1b',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5e6d8',
  },
  rowLabel: {
    color: '#6f543c',
    fontWeight: '600',
  },
  rowValue: {
    color: '#3f2d1b',
    fontWeight: '800',
  },
  panelBody: {
    color: '#6d5139',
    lineHeight: 21,
    fontWeight: '500',
  },
});
