import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { getUserTaskProgress, Task, useTodoStore } from '@/components/TodoStore';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { theme } from '@/constants/Colors';
import { useAppTheme } from '@/components/useAppTheme';
import { useThemedStyles } from '@/components/useThemedStyles';

const getLocalIsoDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function OverviewRecordScreen() {
  const theme = useAppTheme();
  const styles = useThemedStyles(baseStyles);
  const { tasks: allTasks, users, activeUserId, notes, jobApplications } = useTodoStore();
  const activeUserName = users.find((user) => user.id === activeUserId)?.name ?? 'User';
  const userNotes = useMemo(
    () => notes.filter((note) => note.createdByUserId === activeUserId),
    [activeUserId, notes]
  );
  const userApplications = useMemo(
    () => jobApplications.filter((application) => application.createdByUserId === activeUserId),
    [activeUserId, jobApplications]
  );
  const applicationStatusCounts = useMemo(
    () => ({
      applied: userApplications.filter((application) => application.status === 'Applied').length,
      screening: userApplications.filter((application) => application.status === 'Screening').length,
      interview: userApplications.filter((application) => application.status === 'Interview').length,
      offer: userApplications.filter((application) => application.status === 'Offer').length,
      rejected: userApplications.filter((application) => application.status === 'Rejected').length,
      cancelled: userApplications.filter((application) => application.status === 'Cancelled').length,
    }),
    [userApplications]
  );
  const applicationTrend = useMemo(() => {
    const monthlyCounts: Record<string, number> = {};
    userApplications.forEach((application) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(application.appliedDate)) return;
      const month = application.appliedDate.slice(0, 7);
      monthlyCounts[month] = (monthlyCounts[month] ?? 0) + 1;
    });
    const today = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      return {
        key,
        label: monthDate.toLocaleDateString(undefined, { month: 'short' }),
        count: monthlyCounts[key] ?? 0,
      };
    });
  }, [userApplications]);
  const applicationStatusData = [
    { label: 'Applied', count: applicationStatusCounts.applied, color: theme.colors.primary },
    { label: 'Screening', count: applicationStatusCounts.screening, color: '#73A7C0' },
    { label: 'Interview', count: applicationStatusCounts.interview, color: theme.colors.warning },
    { label: 'Offer', count: applicationStatusCounts.offer, color: theme.colors.success },
    { label: 'Rejected', count: applicationStatusCounts.rejected, color: theme.colors.accent },
    { label: 'Cancelled', count: applicationStatusCounts.cancelled, color: theme.colors.textMuted },
  ] as const;
  const maxApplicationStatusCount = Math.max(...applicationStatusData.map(({ count }) => count), 1);
  const tasks = useMemo(
    () => allTasks.filter(
      (task) =>
        task.assignedUserIds.includes(activeUserId) ||
        (task.assignedUserIds.length === 0 && task.createdByUserId === activeUserId)
    ),
    [activeUserId, allTasks]
  );
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

  const allSubtasks = useMemo(
    () => tasks.flatMap((task) => {
      const progress = getUserTaskProgress(task, activeUserId);
      return task.subtasks.map((subtask) => ({
        ...subtask,
        completed: progress.subtasks[subtask.id] === true,
      }));
    }),
    [activeUserId, tasks]
  );
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
      const weekday = date.getDay() || 7;
      date.setDate(date.getDate() + 4 - weekday);
      const weekYear = date.getFullYear();
      const firstThursday = new Date(weekYear, 0, 4);
      const firstWeekday = firstThursday.getDay() || 7;
      firstThursday.setDate(firstThursday.getDate() + 4 - firstWeekday);
      const week = Math.round((date.getTime() - firstThursday.getTime()) / 604800000) + 1;
      return `${weekYear}-W${String(week).padStart(2, '0')}`;
    }
    return `${year}-${month}`;
  };

  const subtasksByPeriod = useMemo(() => {
    const grouped: Record<string, { done: number; ongoing: number; label: string }> = {};
    tasks.forEach((task) => {
      const key = getDateKey(task.startDate || getLocalIsoDate(), subtaskViewMode);
      const progress = getUserTaskProgress(task, activeUserId);
      task.subtasks.forEach((subtask) => {
        grouped[key] ??= { done: 0, ongoing: 0, label: key };
        if (progress.subtasks[subtask.id]) grouped[key].done += 1;
        else grouped[key].ongoing += 1;
      });
    });
    return Object.entries(grouped)
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-12)
      .map(([, stats]) => stats);
  }, [activeUserId, tasks, subtaskViewMode]);

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
      completedTasks: tasks.filter((task) => getUserTaskProgress(task, activeUserId).completed),
      failedTasks: tasks.filter(
        (task) =>
          !getUserTaskProgress(task, activeUserId).completed &&
          Boolean(task.endDate) &&
          task.endDate < today
      ),
    };
  }, [activeUserId, tasks]);

  const ongoingTasks = useMemo(() => {
    const failedIds = new Set(failedTasks.map((task) => task.id));
    return tasks.filter(
      (task) => !getUserTaskProgress(task, activeUserId).completed && !failedIds.has(task.id)
    );
  }, [activeUserId, failedTasks, tasks]);

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
  const chartLeft = 32;
  const chartRight = 340;
  const chartTop = 18;
  const chartBottom = 140;
  const subtaskChartMax = Math.max(
    1,
    ...subtasksByPeriod.flatMap((period) => [period.done, period.ongoing])
  );
  const applicationChartMax = Math.max(1, ...applicationTrend.map((month) => month.count));
  const applicationLinePoints = applicationTrend.map((month, index) => ({
    x: chartLeft + (index * (chartRight - chartLeft)) / (applicationTrend.length - 1),
    y: chartBottom - (month.count / applicationChartMax) * (chartBottom - chartTop),
  }));
  const getSubtaskLinePoints = (key: 'done' | 'ongoing') => subtasksByPeriod.map((period, index) => ({
    x: subtasksByPeriod.length === 1
      ? (chartLeft + chartRight) / 2
      : chartLeft + (index * (chartRight - chartLeft)) / (subtasksByPeriod.length - 1),
    y: chartBottom - (period[key] / subtaskChartMax) * (chartBottom - chartTop) * displayRatio,
  }));
  const doneLinePoints = getSubtaskLinePoints('done');
  const ongoingLinePoints = getSubtaskLinePoints('ongoing');
  const getLinePath = (points: { x: number; y: number }[]) =>
    points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

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
        <Text style={styles.title}>{activeUserName}&apos;s Overview</Text>
        <Text style={styles.subtitle}>See your activity across tasks, notes, and job applications.</Text>

        <Text style={styles.chartTitle}>Application activity</Text>
        <View style={styles.diagramCard}>
          {applicationTrend.some((month) => month.count > 0) ? (
            <View style={styles.lineChartContainer}>
              <Svg width="100%" height={200} viewBox="0 0 360 200">
                {[0, 1, 2, 3].map((step) => {
                  const y = chartTop + ((chartBottom - chartTop) * step) / 3;
                  const value = Math.round((applicationChartMax * (3 - step)) / 3);
                  return (
                    <G key={step}>
                      <Line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke={theme.colors.border} strokeDasharray="4 4" />
                      <SvgText x={24} y={y + 3} textAnchor="end" fontSize={9} fill={theme.colors.textSecondary}>{value}</SvgText>
                    </G>
                  );
                })}
                <Path d={getLinePath(applicationLinePoints)} fill="none" stroke={theme.colors.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                {applicationLinePoints.map((point, index) => (
                  <Circle key={applicationTrend[index].key} cx={point.x} cy={point.y} r={4} fill={theme.colors.primary} />
                ))}
                {applicationTrend.map((month, index) => (
                  <SvgText key={month.key} x={applicationLinePoints[index].x} y={166} textAnchor="middle" fontSize={9} fill={theme.colors.textSecondary}>
                    {month.label}
                  </SvgText>
                ))}
              </Svg>
            </View>
          ) : (
            <Text style={styles.applicationSummaryEmpty}>No application dates to chart yet.</Text>
          )}
          <Text style={styles.lineLegendText}>Applications per month</Text>
        </View>

        <Text style={styles.chartTitle}>Your activity</Text>
        <View style={styles.activityGrid}>
          <View style={styles.activityCard}>
            <Text style={styles.activityValue}>{tasks.length}</Text>
            <Text style={styles.activityLabel}>Tasks</Text>
            <Text style={styles.activityDetail}>{completedTasks.length} completed</Text>
          </View>
          <View style={styles.activityCard}>
            <Text style={styles.activityValue}>{allSubtasks.length}</Text>
            <Text style={styles.activityLabel}>Subtasks</Text>
            <Text style={styles.activityDetail}>
              {subtaskStats.completed.length} completed
            </Text>
          </View>
          <View style={styles.activityCard}>
            <Text style={styles.activityValue}>{userNotes.length}</Text>
            <Text style={styles.activityLabel}>Notes created</Text>
            <Text style={styles.activityDetail}>Saved notes</Text>
          </View>
          <View style={styles.activityCard}>
            <Text style={styles.activityValue}>{userApplications.length}</Text>
            <Text style={styles.activityLabel}>Applications</Text>
            <Text style={styles.activityDetail}>
              {applicationStatusCounts.applied} applied · {applicationStatusCounts.cancelled} cancelled
            </Text>
          </View>
          <View style={styles.activityCard}>
            <Text style={styles.activityValue}>{users.length}</Text>
            <Text style={styles.activityLabel}>Profiles</Text>
            <Text style={styles.activityDetail}>In this planner</Text>
          </View>
        </View>

        <View style={styles.applicationSummaryCard}>
          <Text style={styles.sectionTitle}>Job tracker overview</Text>
          {applicationStatusData.map(({ label, count, color }) => (
            <View key={label} style={styles.applicationStatusRow}>
              <View style={styles.applicationStatusLabelWrap}>
                <View style={[styles.applicationStatusDot, { backgroundColor: color }]} />
                <Text style={styles.applicationStatusLabel}>{label}</Text>
                <Text style={styles.applicationStatusCount}>{count}</Text>
              </View>
              <View style={styles.applicationStatusBarTrack}>
                <View
                  style={[
                    styles.applicationStatusBar,
                    { width: `${(count / maxApplicationStatusCount) * 100}%`, backgroundColor: color },
                  ]}
                />
              </View>
            </View>
          ))}
          {userApplications.length === 0 ? (
            <Text style={styles.applicationSummaryEmpty}>No job applications recorded yet.</Text>
          ) : null}
        </View>

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
          <View style={styles.lineChartWrap}>
            <View style={styles.lineChartHeader}>
              <Text style={styles.lineChartTitle}>{allSubtasksCount} Subtasks</Text>
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
              <View style={styles.lineChartContainer}>
                <Svg width="100%" height={200} viewBox="0 0 360 200">
                  {[0, 1, 2, 3].map((step) => {
                    const y = chartTop + ((chartBottom - chartTop) * step) / 3;
                    const value = Math.round((subtaskChartMax * (3 - step)) / 3);
                    return (
                      <G key={step}>
                        <Line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke={theme.colors.border} strokeDasharray="4 4" />
                        <SvgText x={24} y={y + 3} textAnchor="end" fontSize={9} fill={theme.colors.textSecondary}>{value}</SvgText>
                      </G>
                    );
                  })}
                  {doneLinePoints.length > 0 ? (
                    <>
                      <Path d={getLinePath(doneLinePoints)} fill="none" stroke={theme.colors.success} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                      {doneLinePoints.map((point, index) => <Circle key={`done-${index}`} cx={point.x} cy={point.y} r={4} fill={theme.colors.success} />)}
                    </>
                  ) : null}
                  {ongoingLinePoints.length > 0 ? (
                    <>
                      <Path d={getLinePath(ongoingLinePoints)} fill="none" stroke={theme.colors.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                      {ongoingLinePoints.map((point, index) => <Circle key={`ongoing-${index}`} cx={point.x} cy={point.y} r={4} fill={theme.colors.primary} />)}
                    </>
                  ) : null}
                  {subtasksByPeriod.map((period, index) => {
                    const x = subtasksByPeriod.length === 1
                      ? (chartLeft + chartRight) / 2
                      : chartLeft + (index * (chartRight - chartLeft)) / (subtasksByPeriod.length - 1);
                    const label = period.label === 'unknown' ? 'N/A' : period.label.slice(5);
                    return (
                      <SvgText key={period.label} x={x} y={166} textAnchor="middle" fontSize={9} fill={theme.colors.textSecondary}>
                        {label}
                      </SvgText>
                    );
                  })}
                </Svg>
              </View>
            )}
            <View style={styles.lineLegendRow}>
              <View style={styles.lineLegendItem}><View style={[styles.lineLegendDot, { backgroundColor: theme.colors.success }]} /><Text style={styles.lineLegendText}>Done {displaySubtaskDone}</Text></View>
              <View style={styles.lineLegendItem}><View style={[styles.lineLegendDot, { backgroundColor: theme.colors.primary }]} /><Text style={styles.lineLegendText}>Ongoing {displaySubtaskOngoing}</Text></View>
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

const baseStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, paddingBottom: 42 },
  title: { marginTop: 8, color: theme.colors.textPrimary, fontSize: 26, fontFamily: 'Nunito_800ExtraBold' },
  subtitle: { marginTop: 6, color: theme.colors.textSecondary, fontSize: 15, fontFamily: 'Nunito_500Medium' },
  chartTitle: { marginTop: 20, color: theme.colors.buttonDark, fontSize: 19, fontFamily: 'Nunito_800ExtraBold' },
  activityGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  activityCard: {
    width: '48%',
    minHeight: 105,
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activityValue: {
    color: theme.colors.textPrimary,
    fontSize: 25,
    fontFamily: 'Nunito_800ExtraBold',
  },
  activityLabel: {
    marginTop: 2,
    color: theme.colors.buttonDark,
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
  activityDetail: {
    marginTop: 3,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
  },
  applicationSummaryCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  applicationStatusRow: {
    minHeight: 52,
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  applicationStatusLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  applicationStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  applicationStatusLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
  },
  applicationStatusCount: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontFamily: 'Nunito_800ExtraBold',
  },
  applicationStatusBarTrack: {
    height: 7,
    marginTop: 7,
    overflow: 'hidden',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.border,
  },
  applicationStatusBar: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
  },
  applicationSummaryEmpty: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
  },
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
  centerCount: { color: theme.colors.textPrimary, fontSize: 30, fontFamily: 'Nunito_800ExtraBold' },
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
  lineChartWrap: { gap: 12 },
  lineChartHeader: { gap: 8 },
  lineChartContainer: { height: 200, borderRadius: 16, backgroundColor: '#F7FBFC', borderWidth: 1, borderColor: theme.colors.border, padding: 8 },
  viewModeTabs: { flexDirection: 'row', gap: 6 },
  viewModeTab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: theme.borderRadius.full, backgroundColor: '#F7FBFC', borderWidth: 1, borderColor: theme.colors.border },
  viewModeTabActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  viewModeTabText: { color: theme.colors.buttonDark, fontFamily: 'Nunito_700Bold', fontSize: 12 },
  viewModeTabTextActive: { color: theme.colors.textPrimary },
  lineChartTitle: { color: theme.colors.buttonDark, fontFamily: 'Nunito_800ExtraBold', fontSize: 15 },
  lineLegendRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  lineLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lineLegendDot: { width: 8, height: 8, borderRadius: 4 },
  lineLegendText: { color: theme.colors.textSecondary, fontFamily: 'Nunito_700Bold', fontSize: 12 },
});
