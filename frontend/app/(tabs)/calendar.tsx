import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Task, useTodoStore } from '@/components/TodoStore';

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

const addDays = (date: string, days: number) => {
  const [year, month, day] = date.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + days));
  return `${nextDate.getUTCFullYear()}-${`${nextDate.getUTCMonth() + 1}`.padStart(2, '0')}-${`${nextDate.getUTCDate()}`.padStart(2, '0')}`;
};

const getTaskStatus = (task: Task, today: string) => {
  if (task.completed) return 'Completed';
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
  if (status === 'Overdue') return '#c24135';
  if (status === 'Due soon') return '#c07813';
  if (status === 'Completed') return '#25805a';
  if (status === 'Upcoming') return '#65748b';
  return '#2470b5';
};

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en', {
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

const getOccupiedDayCount = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.floor((end - start) / 86400000) + 1;
};

export default function CalendarScreen({ embedded = false }: { embedded?: boolean }) {
  const { tasks } = useTodoStore();
  const today = toIsoDate(new Date());
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
    () => tasks.filter((task) => !task.completed && task.endDate >= today && task.endDate <= addDays(today, 3)),
    [tasks, today]
  );
  const overdueTasks = useMemo(
    () => tasks.filter((task) => !task.completed && task.endDate && task.endDate < today),
    [tasks, today]
  );
  const ongoingTasks = useMemo(
    () => tasks.filter((task) => !task.completed && (!task.startDate || task.startDate <= today) && (!task.endDate || task.endDate >= today)),
    [tasks, today]
  );
  const selectedTasks = useMemo(
    () => tasks.filter((task) => occursOnDate(task, selectedDate)),
    [selectedDate, tasks]
  );

  const changeMonth = (amount: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const renderTask = (task: Task) => {
    const status = getTaskStatus(task, today);
    return (
      <Pressable key={task.id} style={styles.taskRow} onPress={() => setModalTask(task)}>
        <View style={[styles.taskAccent, { backgroundColor: statusColor(status) }]} />
        <View style={styles.taskDetails}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskMeta}>
              {task.isDaily
                ? `Daily at ${formatTime(task.dailyTime)}${task.endDate ? ` · until ${task.endDate}` : ''}`
                : task.endDate ? `Deadline ${task.endDate}` : task.startDate ? `Started ${task.startDate}` : 'No dates set'}
          </Text>
            {task.appName ? <Text style={styles.taskMeta}>{task.appName}</Text> : null}
        </View>
        <Text style={[styles.statusText, { color: statusColor(status) }]}>{status}</Text>
        <Ionicons name="chevron-forward" size={16} color="#8293a1" />
      </Pressable>
    );
  };

  const readableSelectedDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en', {
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
            <Ionicons name="notifications-outline" size={17} color="#2368a7" />
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
            <Text style={styles.monthTitle}>{month.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</Text>
            <View style={styles.monthControls}>
              <Pressable accessibilityLabel="Previous month" style={styles.monthButton} onPress={() => changeMonth(-1)}>
                <Ionicons name="chevron-back" size={19} color="#344861" />
              </Pressable>
              <Pressable accessibilityLabel="Next month" style={styles.monthButton} onPress={() => changeMonth(1)}>
                <Ionicons name="chevron-forward" size={19} color="#344861" />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekdays}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
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
                  accessibilityLabel={date ? `${formatDate(date)}, ${dayTasks.length} tasks` : undefined}
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
                            style={[styles.dayDot, { backgroundColor: task.completed ? '#25805a' : task.endDate === date ? '#d66c3d' : '#3984bd' }]}
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
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#3984bd' }]} /><Text style={styles.legendText}>In progress</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#d66c3d' }]} /><Text style={styles.legendText}>Deadline</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#25805a' }]} /><Text style={styles.legendText}>Completed</Text></View>
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
                  {modalTask ? modalTask.title : formatDate(selectedDate)}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Close"
                style={styles.modalCloseButton}
                onPress={() => {
                  setIsDateModalVisible(false);
                  setModalTask(null);
                }}>
                <Ionicons name="close" size={21} color="#34495b" />
              </Pressable>
            </View>

            {modalTask ? (
              <View style={styles.detailBody}>
                <View style={styles.detailLine}>
                  <Ionicons name="time-outline" size={18} color="#2368a7" />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>
                      {modalTask.isDaily ? `Every day at ${formatTime(modalTask.dailyTime)}` : 'All day'}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailLine}>
                  <Ionicons name="calendar-outline" size={18} color="#2368a7" />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Occupies these dates</Text>
                    <Text style={styles.detailValue}>
                      {modalTask.isDaily
                        ? `Daily from ${formatDate(modalTask.startDate)}${modalTask.endDate ? ` to ${formatDate(modalTask.endDate)}` : ' onward'}`
                        : modalTask.startDate && modalTask.endDate
                        ? `${formatDate(modalTask.startDate)}${modalTask.startDate === modalTask.endDate ? '' : ` to ${formatDate(modalTask.endDate)}`}`
                        : modalTask.startDate
                          ? `${formatDate(modalTask.startDate)} onward`
                          : modalTask.endDate
                            ? formatDate(modalTask.endDate)
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
                  <Ionicons name="flag-outline" size={18} color={statusColor(getTaskStatus(modalTask, today))} />
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={[styles.detailValue, { color: statusColor(getTaskStatus(modalTask, today)) }]}>
                      {getTaskStatus(modalTask, today)}
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
  container: { flex: 1, backgroundColor: '#f1f6fa' },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 36 },
  embeddedContainer: { flex: 0, backgroundColor: 'transparent' },
  embeddedContent: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  pickerHint: { marginTop: -9, marginBottom: 12, color: '#687a89', fontSize: 11, lineHeight: 16 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  eyebrow: { color: '#53718c', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { marginTop: 3, color: '#18344e', fontSize: 29, fontWeight: '800' },
  todayMark: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#e3eff8', borderRadius: 8 },
  todayMarkText: { color: '#2368a7', fontSize: 12, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  summaryItem: { flex: 1, minHeight: 68, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1 },
  summaryDue: { backgroundColor: '#fff4e4', borderColor: '#f0d2a1' },
  summaryOngoing: { backgroundColor: '#e6f1f8', borderColor: '#c1dbea' },
  summaryOverdue: { backgroundColor: '#fbeae7', borderColor: '#eac4bd' },
  summaryNumber: { color: '#20394f', fontSize: 20, fontWeight: '800' },
  summaryLabel: { marginTop: 1, color: '#526577', fontSize: 11, fontWeight: '700' },
  calendarPanel: { padding: 14, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dce6ed', borderRadius: 8 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthTitle: { color: '#20394f', fontSize: 17, fontWeight: '800' },
  monthControls: { flexDirection: 'row', gap: 6 },
  monthButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff4f7', borderRadius: 7 },
  weekdays: { flexDirection: 'row', marginBottom: 4 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: '#8392a0', fontSize: 11, fontWeight: '800' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  dayCellSelected: { backgroundColor: '#dcecf7' },
  dayNumber: { color: '#34495b', fontSize: 13, fontWeight: '600' },
  dayNumberToday: { color: '#176ba8', fontWeight: '900' },
  dayNumberSelected: { color: '#135a91' },
  dayDots: { height: 5, flexDirection: 'row', gap: 3, marginTop: 2 },
  dayDot: { width: 4, height: 4, borderRadius: 2 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { color: '#687a89', fontSize: 10, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },
  sectionTitle: { color: '#20394f', fontSize: 16, fontWeight: '800' },
  sectionCount: { color: '#788b9b', fontSize: 11, fontWeight: '700' },
  taskRow: { flexDirection: 'row', alignItems: 'center', minHeight: 62, paddingHorizontal: 11, marginBottom: 7, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dce6ed', borderRadius: 8 },
  taskAccent: { width: 4, height: 34, borderRadius: 2, marginRight: 10 },
  taskDetails: { flex: 1, paddingVertical: 9 },
  taskTitle: { color: '#20394f', fontSize: 13, fontWeight: '700' },
  taskMeta: { marginTop: 3, color: '#778897', fontSize: 11 },
  statusText: { marginLeft: 8, fontSize: 10, fontWeight: '800' },
  emptyText: { paddingVertical: 12, color: '#788b9b', fontSize: 12 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(18, 38, 54, 0.45)' },
  modalPanel: { maxHeight: '78%', padding: 18, backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#d5e1e9' },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  modalHeadingWrap: { flex: 1, paddingRight: 12 },
  modalEyebrow: { color: '#688094', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  modalTitle: { marginTop: 4, color: '#20394f', fontSize: 19, fontWeight: '800' },
  modalCloseButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff4f7', borderRadius: 7 },
  modalTaskList: { flexGrow: 0 },
  modalEmptyText: { paddingVertical: 14, color: '#788b9b', fontSize: 13 },
  detailBody: { gap: 18, paddingTop: 2, paddingBottom: 4 },
  detailLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  detailTextWrap: { flex: 1 },
  detailLabel: { color: '#788b9b', fontSize: 11, fontWeight: '700' },
  detailValue: { marginTop: 3, color: '#20394f', fontSize: 14, fontWeight: '700' },
  detailHint: { marginTop: 3, color: '#788b9b', fontSize: 11 },
});