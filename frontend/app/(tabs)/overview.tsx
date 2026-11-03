import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Rect } from 'react-native-svg';

import { Task, useTodoStore } from '@/components/TodoStore';
import { theme } from '@/constants/Colors';

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
  const [subtaskViewMode, setSubtaskViewMode] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    progressAnim.setValue(0);
    const listener = progressAnim.addListener(({ value }) => setDisplayRatio(value));
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => progressAnim.removeListener(listener);
  }, [progressAnim, tasks]);

  const allSubtasks = useMemo(() => tasks.flatMap((task) => task.subtasks), [tasks]);
  const subtaskStats = useMemo(() => ({
    completed: allSubtasks.filter((subtask) => subtask.completed),
    failed: [] as typeof allSubtasks,
    ongoing: allSubtasks.filter((subtask) => !subtask.completed),
  }), [allSubtasks]);

  const getDateKey = (dateStr: string, mode: 'daily' | 'weekly' | 'monthly') => {
    if (!dateStr || dateStr.length < 10) return 'unknown';
    const [year, month, day] = dateStr.split('-');
    if (mode === 'daily') return `${year}-${month}-${day}`;
    if (mode === 'weekly') {
      const date = new Date(`${year}-${month}-${day}T00:00:00`);
      const week = Math.ceil((date.getDate() - date.getDay() + 1) / 7);
      return `${year}-W${String(week).padStart(2, '0')}`;
    }
    return `${year}-${month}`;
  };

  const subtasksByPeriod = useMemo(() => {
    const grouped: Record<string, { done: number; ongoing: number; label: string }> = {};
    tasks.forEach((task) => {
      const key = getDateKey(task.startDate || getLocalIsoDate(), subtaskViewMode);
      task.subtasks.forEach((subtask) => {
        grouped[key] ??= { done: 0, ongoing: 0, label: key };
        if (subtask.completed) grouped[key].done += 1;
        else grouped[key].ongoing += 1;
      });
    });
    return Object.entries(grouped)
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-12)
      .map(([, stats]) => stats);
  }, [tasks, subtaskViewMode]);

  const userById = useMemo(
    () => users.reduce<Record<string, string>>((result, user) => {
      result[user.id] = user.name;
      return result;
    }, {}),
    [users]
  );

  const { completedTasks, failedTasks } = useMemo(() => {
    const today = getLocalIsoDate();
    return {
      completedTasks: tasks.filter((task) => task.completed),
      failedTasks: tasks.filter((task) => !task.completed && Boolean(task.endDate) && task.endDate < today),
    };
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
  const allSubtasksCount = allSubtasks.length;
  const safeSubtaskTotal = Math.max(allSubtasksCount, 1);
  const ringRadius = 68;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const segmentGap = 8;
  const segmentRatios = [doneRatio, failedRatio, ongoingRatio];
  const nonZeroSegments = segmentRatios.filter((ratio) => ratio > 0).length;
  const drawableLength = Math.max(ringCircumference - segmentGap * nonZeroSegments, 0);
  const doneLength = drawableLength * doneRatio;
  const failedLength = drawableLength * failedRatio;
  const ongoingLength = drawableLength * ongoingRatio;
  const doneOffset = 0;
  const failedOffset = -(doneLength + (doneLength > 0 ? segmentGap : 0));
  const ongoingOffset = -(doneLength + failedLength + (doneLength > 0 ? segmentGap : 0) + (failedLength > 0 ? segmentGap : 0));
  const displayDone = Math.round(completedTasks.length * displayRatio);
  const displayFailed = Math.round(failedTasks.length * displayRatio);
  const displayOngoing = Math.round(ongoingTasks.length * displayRatio);
  const displaySubtaskDone = Math.round(subtaskStats.completed.length * displayRatio);
  const displaySubtaskOngoing = Math.round(subtaskStats.ongoing.length * displayRatio);

  const getUserNames = (ids: string[]) => {
    const names = ids.map((id) => userById[id]).filter((name): name is string => Boolean(name));
    return names.length > 0 ? names.join(', ') : 'Unknown user';
  };

  const renderRecord = (task: Task, type: 'done' | 'failed') => (
    <View key={task.id} style={[styles.recordCard, type === 'done' ? styles.recordCardDone : styles.recordCardFailed]}>
      <View style={styles.recordTopRow}>
        <Text style={styles.recordTitle}>{task.title}</Text>
        <View style={[styles.recordBadge, type === 'done' ? styles.badgeDone : styles.badgeFailed]}>
          <Text style={styles.recordBadgeText}>{type === 'done' ? 'Done' : 'Failed'}</Text>
        </View>
      </View>
      <Text style={styles.recordMeta}>Created by: {userById[task.createdByUserId] ?? 'Unknown user'}</Text>
      <Text style={styles.recordMeta}>Must do: {getUserNames(task.assignedUserIds)}</Text>
      <Text style={styles.recordMeta}>Deadline: {task.endDate || 'No deadline'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Overview Records</Text>
        <Text style={styles.subtitle}>Track completed, ongoing, and overdue tasks.</Text>

        <Text style={styles.chartTitle}>Big Tasks</Text>
        <Animated.View style={[styles.diagramCard, { opacity: progressAnim }]}>
          <View style={styles.diagramWrap}>
            <Svg width={200} height={200}>
              <G rotation={-90} origin="100, 100">
                <Circle cx={100} cy={100} r={ringRadius} stroke={theme.colors.border} strokeWidth={20} fill="none" />
                {doneLength > 0 ? <Circle cx={100} cy={100} r={ringRadius} stroke={theme.colors.success} strokeWidth={20} strokeLinecap="round" fill="none" strokeDasharray={`${doneLength * displayRatio} ${ringCircumference}`} strokeDashoffset={doneOffset} /> : null}
                {failedLength > 0 ? <Circle cx={100} cy={100} r={ringRadius} stroke={theme.colors.accent} strokeWidth={20} strokeLinecap="round" fill="none" strokeDasharray={`${failedLength * displayRatio} ${ringCircumference}`} strokeDashoffset={failedOffset} /> : null}
                {ongoingLength > 0 ? <Circle cx={100} cy={100} r={ringRadius} stroke={theme.colors.primary} strokeWidth={20} strokeLinecap="round" fill="none" strokeDasharray={`${ongoingLength * displayRatio} ${ringCircumference}`} strokeDashoffset={ongoingOffset} /> : null}
              </G>
            </Svg>
            <View style={styles.centerLabel}>
              <Text style={styles.centerCount}>{totalTasks}</Text>
              <Text style={styles.centerText}>Total Tasks</Text>
            </View>
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} /><Text style={styles.legendText}>Done {displayDone}</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: theme.colors.accent }]} /><Text style={styles.legendText}>Failed {displayFailed}</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} /><Text style={styles.legendText}>Ongoing {displayOngoing}</Text></View>
          </View>
        </Animated.View>

        <Text style={styles.chartTitle}>Subtasks</Text>
        <Animated.View style={[styles.diagramCard, { opacity: progressAnim }]}>
          <View style={styles.verticalChartWrap}>
            <View style={styles.verticalChartHeader}>
              <Text style={styles.barChartTitle}>{allSubtasksCount} Subtasks</Text>
              <View style={styles.viewModeTabs}>
                {(['daily', 'weekly', 'monthly'] as const).map((mode) => (
                  <Pressable key={mode} style={[styles.viewModeTab, subtaskViewMode === mode && styles.viewModeTabActive]} onPress={() => setSubtaskViewMode(mode)}>
                    <Text style={[styles.viewModeTabText, subtaskViewMode === mode && styles.viewModeTabTextActive]}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {subtasksByPeriod.length === 0 ? (
              <Text style={styles.emptyText}>No subtasks yet.</Text>
            ) : (
              <View style={styles.verticalChartContainer}>
                <Svg width="100%" height={200} viewBox="0 0 360 200">
                  {subtasksByPeriod.map((period, index) => {
                    const total = period.done + period.ongoing;
                    const maxHeight = 140;
                    const barWidth = 24;
                    const spacing = 360 / subtasksByPeriod.length;
                    const x = index * spacing + spacing / 2 - barWidth / 2;
                    const doneHeight = (period.done / Math.max(total, 1)) * maxHeight * displayRatio;
                    const ongoingHeight = (period.ongoing / Math.max(total, 1)) * maxHeight * displayRatio;
                    return (
                      <G key={period.label}>
                        <Rect x={x} y={maxHeight - doneHeight} width={barWidth} height={doneHeight} fill={theme.colors.success} rx={2} />
                        <Rect x={x} y={maxHeight - doneHeight - ongoingHeight} width={barWidth} height={ongoingHeight} fill={theme.colors.primary} rx={2} />
                      </G>
                    );
                  })}
                </Svg>
              </View>
            )}
            <View style={styles.barLegendRow}>
              <View style={styles.barLegendItem}><View style={[styles.barLegendDot, { backgroundColor: theme.colors.success }]} /><Text style={styles.barLegendText}>Done {displaySubtaskDone}</Text></View>
              <View style={styles.barLegendItem}><View style={[styles.barLegendDot, { backgroundColor: theme.colors.primary }]} /><Text style={styles.barLegendText}>Ongoing {displaySubtaskOngoing}</Text></View>
            </View>
          </View>
        </Animated.View>

        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Done Tasks</Text>
          {completedTasks.length === 0 ? <Text style={styles.emptyText}>No completed tasks yet.</Text> : completedTasks.map((task) => renderRecord(task, 'done'))}
        </View>
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Failed Tasks</Text>
          {failedTasks.length === 0 ? <Text style={styles.emptyText}>No failed tasks right now.</Text> : failedTasks.map((task) => renderRecord(task, 'failed'))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 42 },
  title: { marginTop: 8, color: theme.colors.textPrimary, fontSize: 26, fontFamily: 'Nunito_800ExtraBold' },
  subtitle: { marginTop: 6, color: theme.colors.textSecondary, fontSize: 15, fontFamily: 'Nunito_500Medium' },
  chartTitle: { marginTop: 20, color: theme.colors.buttonDark, fontSize: 19, fontFamily: 'Nunito_800ExtraBold' },
  diagramCard: {
    marginTop: 12,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  diagramWrap: { alignItems: 'center', justifyContent: 'center' },
  centerLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  centerCount: { color: theme.colors.textPrimary, fontSize: 30, fontFamily: 'Nunito_900Black' },
  centerText: { color: theme.colors.textSecondary, fontSize: 12, fontFamily: 'Nunito_700Bold' },
  legendRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: theme.colors.buttonDark, fontSize: 12, fontFamily: 'Nunito_700Bold' },
  sectionWrap: { marginTop: 20, padding: 0, gap: 10 },
  sectionTitle: { color: theme.colors.textPrimary, fontSize: 19, fontFamily: 'Nunito_800ExtraBold' },
  emptyText: { color: theme.colors.textSecondary, fontSize: 14, fontFamily: 'Nunito_600SemiBold' },
  recordCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 5,
    backgroundColor: theme.colors.cardBackground,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  recordCardDone: { backgroundColor: '#EFF8F4', borderColor: '#CDE8DA' },
  recordCardFailed: { backgroundColor: '#FFF2F0', borderColor: '#F3D0CA' },
  recordTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  recordTitle: { flex: 1, color: theme.colors.textPrimary, fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },
  recordBadge: { borderRadius: theme.borderRadius.full, paddingHorizontal: 10, paddingVertical: 5 },
  badgeDone: { backgroundColor: '#DDEFE6' },
  badgeFailed: { backgroundColor: '#F8DDD8' },
  recordBadgeText: { color: theme.colors.buttonDark, fontSize: 11, fontFamily: 'Nunito_800ExtraBold' },
  recordMeta: { color: theme.colors.textSecondary, fontSize: 13, fontFamily: 'Nunito_600SemiBold' },
  verticalChartWrap: { gap: 12 },
  verticalChartHeader: { gap: 8 },
  verticalChartContainer: { height: 200, borderRadius: 16, backgroundColor: '#F7FBFC', borderWidth: 1, borderColor: theme.colors.border, padding: 12 },
  viewModeTabs: { flexDirection: 'row', gap: 6 },
  viewModeTab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: theme.borderRadius.full, backgroundColor: '#F7FBFC', borderWidth: 1, borderColor: theme.colors.border },
  viewModeTabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  viewModeTabText: { color: theme.colors.buttonDark, fontFamily: 'Nunito_700Bold', fontSize: 12 },
  viewModeTabTextActive: { color: theme.colors.textPrimary },
  barChartTitle: { color: theme.colors.buttonDark, fontFamily: 'Nunito_800ExtraBold', fontSize: 15 },
  barLegendRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  barLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLegendDot: { width: 8, height: 8, borderRadius: 4 },
  barLegendText: { color: theme.colors.textSecondary, fontFamily: 'Nunito_700Bold', fontSize: 12 },
});
