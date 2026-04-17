import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';

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

  const progressAnim = useRef(new Animated.Value(0)).current;
  const [displayRatio, setDisplayRatio] = useState(0);

  useEffect(() => {
    progressAnim.setValue(0);

    const listener = progressAnim.addListener(({ value }) => {
      setDisplayRatio(value);
    });

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      progressAnim.removeListener(listener);
    };
  }, [progressAnim, tasks]);

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

  const ongoingTasks = useMemo(() => {
    const failedIds = new Set(failedTasks.map((task) => task.id));
    return tasks.filter((task) => !task.completed && !failedIds.has(task.id));
  }, [failedTasks, tasks]);

  const totalTasks = tasks.length;
  const safeTotal = Math.max(totalTasks, 1);
  const doneRatio = completedTasks.length / safeTotal;
  const failedRatio = failedTasks.length / safeTotal;
  const ongoingRatio = ongoingTasks.length / safeTotal;

  const ringRadius = 68;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const segmentGap = 8;

  const segmentRatios = [doneRatio, failedRatio, ongoingRatio];
  const nonZeroSegments = segmentRatios.filter((ratio) => ratio > 0).length;
  const totalGapLength = nonZeroSegments > 0 ? segmentGap * nonZeroSegments : 0;
  const drawableLength = Math.max(ringCircumference - totalGapLength, 0);

  const doneLength = drawableLength * doneRatio;
  const failedLength = drawableLength * failedRatio;
  const ongoingLength = drawableLength * ongoingRatio;

  const doneOffset = 0;
  const failedOffset = -(doneLength + (doneLength > 0 ? segmentGap : 0));
  const ongoingOffset = -(doneLength + failedLength + (doneLength > 0 ? segmentGap : 0) + (failedLength > 0 ? segmentGap : 0));

  const displayDone = Math.round(completedTasks.length * displayRatio);
  const displayFailed = Math.round(failedTasks.length * displayRatio);
  const displayOngoing = Math.round(ongoingTasks.length * displayRatio);

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

        <Animated.View
          style={[
            styles.diagramCard,
            {
              opacity: progressAnim,
              transform: [
                {
                  scale: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1],
                  }),
                },
              ],
            },
          ]}>
          <View style={styles.diagramWrap}>
            <Svg width={200} height={200}>
              <G rotation={-90} origin="100, 100">
                <Circle
                  cx={100}
                  cy={100}
                  r={ringRadius}
                  stroke="rgba(15, 79, 168, 0.14)"
                  strokeWidth={20}
                  fill="none"
                />
                {doneLength > 0 ? (
                  <Circle
                    cx={100}
                    cy={100}
                    r={ringRadius}
                    stroke="#10b981"
                    strokeWidth={20}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${doneLength * displayRatio} ${ringCircumference}`}
                    strokeDashoffset={doneOffset}
                  />
                ) : null}
                {failedLength > 0 ? (
                  <Circle
                    cx={100}
                    cy={100}
                    r={ringRadius}
                    stroke="#ef4444"
                    strokeWidth={20}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${failedLength * displayRatio} ${ringCircumference}`}
                    strokeDashoffset={failedOffset}
                  />
                ) : null}
                {ongoingLength > 0 ? (
                  <Circle
                    cx={100}
                    cy={100}
                    r={ringRadius}
                    stroke="#3b82f6"
                    strokeWidth={20}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={`${ongoingLength * displayRatio} ${ringCircumference}`}
                    strokeDashoffset={ongoingOffset}
                  />
                ) : null}
              </G>
            </Svg>

            <View style={styles.centerLabel}>
              <Text style={styles.centerCount}>{totalTasks}</Text>
              <Text style={styles.centerText}>Total Tasks</Text>
            </View>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.legendText}>Done {displayDone}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.legendText}>Failed {displayFailed}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.legendText}>Ongoing {displayOngoing}</Text>
            </View>
          </View>
        </Animated.View>

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
  diagramCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: '#fcfeff',
    borderWidth: 1,
    borderColor: '#cbdef3',
    padding: 12,
  },
  diagramWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCount: {
    fontSize: 30,
    fontWeight: '900',
    color: '#143f7d',
  },
  centerText: {
    fontSize: 12,
    color: '#4a678d',
    fontWeight: '700',
  },
  legendRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#234568',
    fontWeight: '700',
    fontSize: 12,
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
