import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getUserTaskProgress, Task, useTodoStore } from '@/components/TodoStore';
import { LocalizedText as Text } from '@/components/LocalizedText';
import { useAppSettings } from '@/components/AppSettings';
import { theme } from '@/constants/Colors';

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

const addDays = (date: string, days: number) => {
  const [year, month, day] = date.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + days));
  return `${nextDate.getUTCFullYear()}-${`${nextDate.getUTCMonth() + 1}`.padStart(2, '0')}-${`${nextDate.getUTCDate()}`.padStart(2, '0')}`;
};

const getTaskStatus = (task: Task, today: string, isCompleted: boolean) => {
  if (isCompleted) return 'Completed';
  if (task.endDate && task.endDate < today) return 'Overdue';
  if (task.endDate && task.endDate <= addDays(today, 3)) return 'Due soon';
  if (task.startDate && task.startDate > today) return 'Upcoming';
  return 'Ongoing';
};

const occursOnDate = (task: Task, date: string) => {
  if (task.isDaily) return (!task.startDate || task.startDate <= date) && (!task.endDate || date <= task.endDate);
  if (task.startDate && task.endDate) return task.startDate <= date && date <= task.endDate;
  if (task.startDate) return task.startDate <= date;
  if (task.endDate) return task.endDate === date;
  return false;
};

const statusColor = (status: string) => {
  if (status === 'Overdue') return theme.colors.accent;
  if (status === 'Due soon') return theme.colors.warning;
  if (status === 'Completed') return theme.colors.success;
  if (status === 'Upcoming') return theme.colors.textSecondary;
  return theme.colors.buttonDark;
};

const formatDate = (date: string, language: 'en' | 'id') =>
  new Date(`${date}T00:00:00`).toLocaleDateString(language === 'id' ? 'id-ID' : 'en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

const formatTime = (time: string, language: 'en' | 'id') => {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en', { hour: 'numeric', minute: '2-digit' });
};

const getOccupiedDayCount = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.floor((end - start) / 86400000) + 1;
};

export default function CalendarScreen({ embedded = false }: { embedded?: boolean }) {
  const { language } = useAppSettings();
  const { tasks: allTasks, activeUserId } = useTodoStore();
  const tasks = useMemo(
    () => allTasks.filter(
      (task) =>
        task.assignedUserIds.includes(activeUserId) ||
        (task.assignedUserIds.length === 0 && task.createdByUserId === activeUserId)
    ),
    [activeUserId, allTasks]
  );
  const today = toIsoDate(new Date());
  const isCompletedForActiveUser = useCallback((task: Task) => {
    const progress = getUserTaskProgress(task, activeUserId);
    return task.isDaily ? progress.completed && progress.completedOn === today : progress.completed;
  }, [activeUserId, today]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [isDateModalVisible, setIsDateModalVisible] = useState(false);
  const [modalTask, setModalTask] = useState<Task | null>(null);

  const monthDays = useMemo(() => {
    const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstWeekday + 1;
      return day > 0 && day <= dayCount
        ? toIsoDate(new Date(month.getFullYear(), month.getMonth(), day))
        : '';
    });
  }, [month]);

  const dueSoonTasks = useMemo(
    () => tasks.filter((task) => !isCompletedForActiveUser(task) && task.endDate >= today && task.endDate <= addDays(today, 3)),
    [isCompletedForActiveUser, tasks, today]
  );
  const overdueTasks = useMemo(
    () => tasks.filter((task) => !isCompletedForActiveUser(task) && task.endDate && task.endDate < today),
    [isCompletedForActiveUser, tasks, today]
  );
  const ongoingTasks = useMemo(
    () => tasks.filter((task) => !isCompletedForActiveUser(task) && (!task.startDate || task.startDate <= today) && (!task.endDate || task.endDate >= today)),
    [isCompletedForActiveUser, tasks, today]
  );
  const selectedTasks = useMemo(
    () => tasks.filter((task) => occursOnDate(task, selectedDate)),
    [selectedDate, tasks]
  );

  const changeMonth = (amount: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const renderTask = (task: Task) => {
    const status = getTaskStatus(task, today, isCompletedForActiveUser(task));
    return (
      <Pressable key={task.id} style={styles.taskRow} onPress={() => setModalTask(task)}>
        <View style={[styles.taskAccent, { backgroundColor: statusColor(status) }]} />
        <View style={styles.taskDetails}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskMeta}>
              {task.isDaily
                ? `Daily at ${formatTime(task.dailyTime, language)}${task.endDate ? ` · until ${task.endDate}` : ''}`
                : task.endDate ? `Deadline ${task.endDate}` : task.startDate ? `Started ${task.startDate}` : 'No dates set'}
          </Text>
            {task.appName ? <Text style={styles.taskMeta}>{task.appName}</Text> : null}
        </View>
        <Text style={[styles.statusText, { color: statusColor(status) }]}>{status}</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      </Pressable>
    );
  };

  const readableSelectedDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(language === 'id' ? 'id-ID' : 'en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={[styles.container, embedded && styles.embeddedContainer]}>
      <ScrollView
        scrollEnabled={!embedded}
        contentContainerStyle={[styles.content, embedded && styles.embeddedContent]}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.eyebrow}>{embedded ? 'TASK SCHEDULE' : 'PLAN AHEAD'}</Text>
            <Text style={styles.title}>{embedded ? 'Date picker' : 'Calendar'}</Text>
          </View>
          {!embedded ? <View style={styles.todayMark}>
            <Ionicons name="notifications-outline" size={17} color={theme.colors.buttonDark} />
            <Text style={styles.todayMarkText}>{dueSoonTasks.length + overdueTasks.length} alerts</Text>
          </View> : null}
        </View>

        {!embedded ? <View style={styles.summaryRow}>
          <View style={[styles.summaryItem, styles.summaryDue]}>
            <Text style={styles.summaryNumber}>{dueSoonTasks.length}</Text>
            <Text style={styles.summaryLabel}>Due soon</Text>
          </View>
          <View style={[styles.summaryItem, styles.summaryOngoing]}>
            <Text style={styles.summaryNumber}>{ongoingTasks.length}</Text>
            <Text style={styles.summaryLabel}>Ongoing</Text>
          </View>
          <View style={[styles.summaryItem, styles.summaryOverdue]}>
            <Text style={styles.summaryNumber}>{overdueTasks.length}</Text>
            <Text style={styles.summaryLabel}>Overdue</Text>
          </View>
        </View> : null}

        {embedded ? (
          <Text style={styles.pickerHint}>Dates with task markers are already occupied. Select a date to see its tasks.</Text>
        ) : null}

        <View style={styles.calendarPanel}>
          <View style={styles.monthHeader}>
            <Text style={styles.monthTitle}>{month.toLocaleDateString(language === 'id' ? 'id-ID' : 'en', { month: 'long', year: 'numeric' })}</Text>
            <View style={styles.monthControls}>
              <Pressable accessibilityLabel="Previous month" style={styles.monthButton} onPress={() => changeMonth(-1)}>
                <Ionicons name="chevron-back" size={19} color={theme.colors.buttonDark} />
              </Pressable>
              <Pressable accessibilityLabel="Next month" style={styles.monthButton} onPress={() => changeMonth(1)}>
                <Ionicons name="chevron-forward" size={19} color={theme.colors.buttonDark} />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekdays}>
            {(language === 'id' ? ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {monthDays.map((date, index) => {
              const dayTasks = date ? tasks.filter((task) => occursOnDate(task, date)) : [];
              const isSelected = date === selectedDate;
              const isToday = date === today;
              return (
                <Pressable
                  key={`${date || 'empty'}-${index}`}
                  disabled={!date}
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={date ? `${formatDate(date, language)}, ${dayTasks.length} tasks` : undefined}
                  onPress={() => {
                    setSelectedDate(date);
                    if (!embedded) setIsDateModalVisible(true);
                  }}>
                  {date ? (
                    <>
                      <Text style={[styles.dayNumber, isToday && styles.dayNumberToday, isSelected && styles.dayNumberSelected]}>
                        {Number(date.slice(-2))}
                      </Text>
                      <View style={styles.dayDots}>
                        {dayTasks.slice(0, 3).map((task) => (
                          <View
                            key={task.id}
                            style={[styles.dayDot, { backgroundColor: isCompletedForActiveUser(task) ? theme.colors.success : task.endDate === date ? theme.colors.accent : theme.colors.primary }]}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} /><Text style={styles.legendText}>In progress</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: theme.colors.accent }]} /><Text style={styles.legendText}>Deadline</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} /><Text style={styles.legendText}>Completed</Text></View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{embedded ? 'Tasks occupying this date' : readableSelectedDate}</Text>
          <Text style={styles.sectionCount}>{selectedTasks.length} tasks</Text>
        </View>
        {selectedTasks.length > 0 ? selectedTasks.map(renderTask) : (
          <Text style={styles.emptyText}>{embedded ? `No tasks occupy ${readableSelectedDate}.` : 'No scheduled tasks for this day.'}</Text>
        )}

        {!embedded && dueSoonTasks.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Coming up</Text>
              <Text style={styles.sectionCount}>Next 3 days</Text>
            </View>
            {dueSoonTasks.map(renderTask)}
          </>
        ) : null}

        {!embedded && overdueTasks.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Needs attention</Text>
              <Text style={styles.sectionCount}>Past deadline</Text>
            </View>
            {overdueTasks.map(renderTask)}
          </>
        ) : null}
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={isDateModalVisible || Boolean(modalTask)}
        onRequestClose={() => {
          setIsDateModalVisible(false);
          setModalTask(null);
        }}>
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel="Close date details"
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setIsDateModalVisible(false);
              setModalTask(null);
            }}
          />
          <View style={styles.modalPanel}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeadingWrap}>
                <Text style={styles.modalEyebrow}>{modalTask ? 'TASK SCHEDULE' : 'DATE SCHEDULE'}</Text>
                <Text style={styles.modalTitle}>
                  {modalTask ? modalTask.title : formatDate(selectedDate, language)}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close"
                style={styles.modalCloseButton}
                onPress={() => {
                  setIsDateModalVisible(false);
                  setModalTask(null);
                }}>
                <Ionicons name="close" size={21} color={theme.colors.buttonDark} />
              </Pressable>
            </View>

            {modalTask ? (
              <View style={styles.detailBody}>
                <View style={styles.detailLine}>
                  <Ionicons name="time-outline" size={18} color={theme.colors.buttonDark} />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>
                      {modalTask.isDaily ? `Every day at ${formatTime(modalTask.dailyTime, language)}` : 'All day'}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailLine}>
                  <Ionicons name="calendar-outline" size={18} color={theme.colors.buttonDark} />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Occupies these dates</Text>
                    <Text style={styles.detailValue}>
                      {modalTask.isDaily
                        ? `Daily from ${formatDate(modalTask.startDate, language)}${modalTask.endDate ? ` to ${formatDate(modalTask.endDate, language)}` : ' onward'}`
                        : modalTask.startDate && modalTask.endDate
                        ? `${formatDate(modalTask.startDate, language)}${modalTask.startDate === modalTask.endDate ? '' : ` to ${formatDate(modalTask.endDate, language)}`}`
                        : modalTask.startDate
                          ? `${formatDate(modalTask.startDate, language)} onward`
                          : modalTask.endDate
                            ? formatDate(modalTask.endDate, language)
                            : 'No dates assigned'}
                    </Text>
                    {modalTask.startDate && modalTask.endDate ? (
                      <Text style={styles.detailHint}>
                        {getOccupiedDayCount(modalTask.startDate, modalTask.endDate)} calendar day{getOccupiedDayCount(modalTask.startDate, modalTask.endDate) === 1 ? '' : 's'}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {modalTask.appName ? (
                  <View style={styles.detailLine}>
                    <Ionicons name="apps-outline" size={18} color="#2368a7" />
                    <View style={styles.detailTextWrap}>
                      <Text style={styles.detailLabel}>App or habit</Text>
                      <Text style={styles.detailValue}>{modalTask.appName}</Text>
                    </View>
                  </View>
                ) : null}
                <View style={styles.detailLine}>
                  <Ionicons name="flag-outline" size={18} color={statusColor(getTaskStatus(modalTask, today, isCompletedForActiveUser(modalTask)))} />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={[styles.detailValue, { color: statusColor(getTaskStatus(modalTask, today, isCompletedForActiveUser(modalTask))) }]}>
                      {getTaskStatus(modalTask, today, isCompletedForActiveUser(modalTask))}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <ScrollView style={styles.modalTaskList}>
                {selectedTasks.length > 0 ? selectedTasks.map(renderTask) : (
                  <Text style={styles.modalEmptyText}>No tasks occupy this date.</Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 36 },
  embeddedContainer: { flex: 0, backgroundColor: 'transparent' },
  embeddedContent: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  pickerHint: { marginTop: -9, marginBottom: 12, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, fontFamily: 'Nunito_500Medium' },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  eyebrow: { color: theme.colors.buttonDark, fontSize: 11, fontWeight: '800', fontFamily: 'Nunito_800ExtraBold' },
  title: { marginTop: 3, color: theme.colors.textPrimary, fontSize: 26, fontWeight: '800', fontFamily: 'Nunito_800ExtraBold' },
  todayMark: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#EAF7FA', borderRadius: theme.borderRadius.full },
  todayMarkText: { color: theme.colors.buttonDark, fontSize: 12, fontWeight: '700', fontFamily: 'Nunito_700Bold' },
  summaryRow: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  summaryItem: { flex: 1, minHeight: 68, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1 },
  summaryDue: { backgroundColor: '#EAF7FA', borderColor: '#CDECF4' },
  summaryOngoing: { backgroundColor: '#F1F5F7', borderColor: theme.colors.border },
  summaryOverdue: { backgroundColor: '#FFF2F0', borderColor: '#F3D0CA' },
  summaryNumber: { color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800', fontFamily: 'Nunito_800ExtraBold' },
  summaryLabel: { marginTop: 1, color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', fontFamily: 'Nunito_700Bold' },
  calendarPanel: { padding: 16, backgroundColor: theme.colors.cardBackground, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.lg, shadowColor: '#000000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800', fontFamily: 'Nunito_800ExtraBold' },
  monthControls: { flexDirection: 'row', gap: 6 },
  monthButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F8FA', borderRadius: theme.borderRadius.full },
  weekdays: { flexDirection: 'row', marginBottom: 4 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: theme.colors.textSecondary, fontSize: 11, fontWeight: '800', fontFamily: 'Nunito_800ExtraBold' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  dayCellSelected: { backgroundColor: theme.colors.primary },
  dayNumber: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600', fontFamily: 'Nunito_600SemiBold' },
  dayNumberToday: { color: theme.colors.buttonDark, fontWeight: '900' },
  dayNumberSelected: { color: theme.colors.textPrimary },
  dayDots: { height: 5, flexDirection: 'row', gap: 3, marginTop: 2 },
  dayDot: { width: 4, height: 4, borderRadius: 2 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '600', fontFamily: 'Nunito_600SemiBold' },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },
  sectionTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800', fontFamily: 'Nunito_800ExtraBold' },
  sectionCount: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', fontFamily: 'Nunito_700Bold' },
  taskRow: { flexDirection: 'row', alignItems: 'center', minHeight: 66, paddingHorizontal: 12, marginBottom: 8, backgroundColor: theme.colors.cardBackground, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16 },
  taskAccent: { width: 4, height: 34, borderRadius: 2, marginRight: 10 },
  taskDetails: { flex: 1, paddingVertical: 9 },
  taskTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700', fontFamily: 'Nunito_700Bold' },
  taskMeta: { marginTop: 3, color: theme.colors.textSecondary, fontSize: 12, fontFamily: 'Nunito_500Medium' },
  statusText: { marginLeft: 8, fontSize: 10, fontWeight: '800' },
  emptyText: { paddingVertical: 12, color: theme.colors.textSecondary, fontSize: 13, fontFamily: 'Nunito_500Medium' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(18, 38, 54, 0.45)' },
  modalPanel: { maxHeight: '78%', padding: 20, backgroundColor: theme.colors.cardBackground, borderRadius: theme.borderRadius.lg, borderWidth: 1, borderColor: theme.colors.border, shadowColor: '#000000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  modalHeadingWrap: { flex: 1, paddingRight: 12 },
  modalEyebrow: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '800', fontFamily: 'Nunito_800ExtraBold' },
  modalTitle: { marginTop: 4, color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800', fontFamily: 'Nunito_800ExtraBold' },
  modalCloseButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F8FA', borderRadius: theme.borderRadius.full },
  modalTaskList: { flexGrow: 0 },
  modalEmptyText: { paddingVertical: 14, color: '#788b9b', fontSize: 13 },
  detailBody: { gap: 18, paddingTop: 2, paddingBottom: 4 },
  detailLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  detailTextWrap: { flex: 1 },
  detailLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', fontFamily: 'Nunito_700Bold' },
  detailValue: { marginTop: 3, color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700', fontFamily: 'Nunito_700Bold' },
  detailHint: { marginTop: 3, color: theme.colors.textSecondary, fontSize: 12, fontFamily: 'Nunito_500Medium' },
});