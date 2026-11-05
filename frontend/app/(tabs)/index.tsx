import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getUserTaskProgress, useTodoStore } from '@/components/TodoStore';
import { theme } from '@/constants/Colors';

const menuItems = [
  {
    title: 'My tasks',
    description: 'Create tasks and manage your routines',
    icon: 'checkbox-outline',
    route: '/(tabs)/planner',
    color: theme.colors.primary,
  },
  {
    title: 'Calendar',
    description: 'See deadlines and scheduled tasks',
    icon: 'calendar-outline',
    route: '/(tabs)/calendar',
    color: '#E8F4F7',
  },
  {
    title: 'Progress',
    description: 'Review completed and ongoing work',
    icon: 'stats-chart-outline',
    route: '/(tabs)/overview',
    color: '#EAF5EF',
  },
  {
    title: 'People',
    description: 'Manage your local profiles',
    icon: 'people-outline',
    route: '/(tabs)/users',
    color: '#FFF1EC',
  },
] as const;

const getLocalIsoDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function HomeScreen() {
  const router = useRouter();
  const { tasks, users, activeUserId } = useTodoStore();
  const activeUser = users.find((user) => user.id === activeUserId);
  const activeUserName = activeUser?.name ?? 'Planner';
  const userTasks = tasks.filter(
    (task) =>
      task.assignedUserIds.includes(activeUserId) ||
      (task.assignedUserIds.length === 0 && task.createdByUserId === activeUserId)
  );
  const completedTasks = userTasks.filter((task) => getUserTaskProgress(task, activeUserId).completed).length;
  const today = getLocalIsoDate();
  const overdueTasks = userTasks.filter(
    (task) => !getUserTaskProgress(task, activeUserId).completed && Boolean(task.endDate) && task.endDate < today
  ).length;

  const openMenuItem = (route: (typeof menuItems)[number]['route']) => {
    router.push(route as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <View style={styles.greetingRow}>
            <View style={styles.greetingCopy}>
              <Text style={styles.eyebrow}>YOUR PERSONAL PLANNER</Text>
              <Text style={styles.title}>Hello, {activeUserName}</Text>
            </View>
            {activeUser?.photoUri
              ? <Image source={{ uri: activeUser.photoUri }} style={styles.avatarImage} />
              : (
                <View style={styles.avatar}>
                  <Ionicons name="person-outline" size={22} color={theme.colors.buttonDark} />
                </View>
              )}
          </View>
          <Text style={styles.subtitle}>What would you like to work on today?</Text>
        </View>

        <Text style={styles.sectionTitle}>Explore your planner</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.description}`}
              style={({ pressed }) => [styles.menuCard, pressed && styles.menuCardPressed]}
              onPress={() => openMenuItem(item.route)}>
              <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                <Ionicons
                  name={item.icon}
                  size={23}
                  color={item.title === 'People' ? theme.colors.accent : theme.colors.buttonDark}
                />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDescription}>{item.description}</Text>
              <Ionicons
                name="arrow-forward"
                size={17}
                color={theme.colors.buttonDark}
                style={styles.menuArrow}
              />
            </Pressable>
          ))}
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeading}>
            <View>
              <Text style={styles.progressEyebrow}>YOUR PROGRESS</Text>
              <Text style={styles.progressTitle}>Keep it going</Text>
            </View>
            <Ionicons name="trending-up-outline" size={24} color={theme.colors.buttonDark} />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{userTasks.length}</Text>
              <Text style={styles.statLabel}>Total tasks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{completedTasks}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statNumber, overdueTasks > 0 && styles.overdueNumber]}>
                {overdueTasks}
              </Text>
              <Text style={styles.statLabel}>Overdue</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  heading: {
    marginBottom: 26,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  greetingCopy: {
    flex: 1,
  },
  eyebrow: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: 'Nunito_800ExtraBold',
  },
  title: {
    marginTop: 4,
    color: theme.colors.textPrimary,
    fontSize: 26,
    fontFamily: 'Nunito_800ExtraBold',
  },
  avatar: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: theme.borderRadius.full,
  },
  subtitle: {
    marginTop: 7,
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Nunito_500Medium',
  },
  sectionTitle: {
    marginBottom: 12,
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontFamily: 'Nunito_800ExtraBold',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuCard: {
    width: '48%',
    minHeight: 160,
    padding: 14,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.canvas,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  menuCardPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  menuIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  menuTitle: {
    marginTop: 12,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontFamily: 'Nunito_800ExtraBold',
  },
  menuDescription: {
    marginTop: 3,
    paddingRight: 4,
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Nunito_500Medium',
  },
  menuArrow: {
    position: 'absolute',
    top: 15,
    right: 14,
  },
  progressCard: {
    marginTop: 22,
    padding: 18,
    backgroundColor: theme.colors.primary,
    borderRadius: 24,
  },
  progressHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressEyebrow: {
    color: theme.colors.buttonDark,
    fontSize: 10,
    letterSpacing: 0.8,
    fontFamily: 'Nunito_800ExtraBold',
  },
  progressTitle: {
    marginTop: 2,
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontFamily: 'Nunito_800ExtraBold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: theme.colors.textPrimary,
    fontSize: 21,
    fontFamily: 'Nunito_800ExtraBold',
  },
  overdueNumber: {
    color: theme.colors.accent,
  },
  statLabel: {
    marginTop: 2,
    color: theme.colors.buttonDark,
    fontSize: 10,
    fontFamily: 'Nunito_700Bold',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(77, 98, 115, 0.25)',
  },
});
