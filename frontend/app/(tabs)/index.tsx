import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getUserTaskProgress,
  useTodoStore,
  type JobApplication,
  type JobApplicationStatus,
} from '@/components/TodoStore';
import { LocalizedText as Text, LocalizedTextInput as TextInput } from '@/components/LocalizedText';
import { theme } from '@/constants/Colors';
import { useAppTheme } from '@/components/useAppTheme';
import { useThemedStyles } from '@/components/useThemedStyles';
import { didCompleteWelcome } from '@/components/LaunchFlow';

type ApplicationDraft = Pick<JobApplication, 'company' | 'role' | 'status' | 'appliedDate' | 'jobUrl' | 'notes'>;

const applicationStatuses: JobApplicationStatus[] = [
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
  'Cancelled',
];

const applicationStatusColors: Record<JobApplicationStatus, { background: string; text: string }> = {
  Applied: { background: '#E8F4F7', text: '#28627A' },
  Screening: { background: '#F1ECFA', text: '#684A98' },
  Interview: { background: '#FFF6E7', text: '#8B641B' },
  Offer: { background: '#EAF5EF', text: '#34734E' },
  Rejected: { background: '#FFF1EC', text: '#A64B3C' },
  Cancelled: { background: '#EEF0F2', text: '#5D6670' },
};

const darkApplicationStatusColors: Record<JobApplicationStatus, { background: string; text: string }> = {
  Applied: { background: '#294653', text: '#9AD7EB' },
  Screening: { background: '#39324D', text: '#C7A9F2' },
  Interview: { background: '#4A3E28', text: '#F2CC78' },
  Offer: { background: '#2B4639', text: '#9AD7B3' },
  Rejected: { background: '#4A302D', text: '#FF9A8B' },
  Cancelled: { background: '#343D45', text: '#BAC4CD' },
};

const menuItems = [
  {
    title: 'My tasks',
    description: 'Create tasks and manage your routines',
    icon: 'checkbox-outline',
    route: '/(tabs)/planner',
    iconBackground: '#3975E8',
    iconColor: '#FFFFFF',
  },
  {
    title: 'Calendar',
    description: 'See deadlines and scheduled tasks',
    icon: 'calendar-outline',
    route: '/(tabs)/calendar',
    iconBackground: '#22A79C',
    iconColor: '#FFFFFF',
  },
  {
    title: 'Progress',
    description: 'Review completed and ongoing work',
    icon: 'stats-chart-outline',
    route: '/(tabs)/overview',
    iconBackground: '#F2B84B',
    iconColor: '#263447',
  },
  {
    title: 'People',
    description: 'Manage your local profiles',
    icon: 'people-outline',
    route: '/(tabs)/users',
    iconBackground: '#E87979',
    iconColor: '#FFFFFF',
  },
] as const;

const getLocalIsoDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const escapeCsvCell = (value: string) => {
  const safeValue = /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
};

export default function HomeScreen() {
  const theme = useAppTheme();
  const styles = useThemedStyles(baseStyles);
  const router = useRouter();
  const isWelcomeComplete = didCompleteWelcome();
  const {
    tasks,
    users,
    activeUserId,
    jobApplications,
    addJobApplication,
    updateJobApplication,
    removeJobApplication,
  } = useTodoStore();
  const [isApplicationTrackerVisible, setIsApplicationTrackerVisible] = useState(false);
  const [isApplicationFormVisible, setIsApplicationFormVisible] = useState(false);
  const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null);
  const [isExportingApplications, setIsExportingApplications] = useState(false);
  const [applicationExportError, setApplicationExportError] = useState('');
  const [applicationSearch, setApplicationSearch] = useState('');
  const [applicationDraft, setApplicationDraft] = useState<ApplicationDraft>({
    company: '',
    role: '',
    status: 'Applied',
    appliedDate: getLocalIsoDate(),
    jobUrl: '',
    notes: '',
  });
  const [applicationError, setApplicationError] = useState('');
  useEffect(() => {
    if (!isWelcomeComplete) router.replace('/welcome');
  }, [isWelcomeComplete, router]);
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
  const userApplications = jobApplications.filter((application) => application.createdByUserId === activeUserId);
  const normalizedApplicationSearch = applicationSearch.trim().toLocaleLowerCase();
  const visibleApplications = userApplications
    .filter((application) =>
      [
        application.company,
        application.role,
        application.status,
        application.appliedDate,
        application.jobUrl,
        application.notes,
      ].some((value) => value.toLocaleLowerCase().includes(normalizedApplicationSearch))
    )
    .sort((first, second) => applicationStatuses.indexOf(first.status) - applicationStatuses.indexOf(second.status));
  const interviewCount = userApplications.filter((application) => application.status === 'Interview').length;

  const openMenuItem = (route: (typeof menuItems)[number]['route']) => {
    router.push(route as never);
  };

  if (!isWelcomeComplete) return null;

  const openNewApplicationForm = () => {
    setIsApplicationTrackerVisible(false);
    setEditingApplicationId(null);
    setIsApplicationFormVisible(true);
    setApplicationDraft({
      company: '',
      role: '',
      status: 'Applied',
      appliedDate: getLocalIsoDate(),
      jobUrl: '',
      notes: '',
    });
    setApplicationError('');
  };

  const openEditApplicationForm = (application: JobApplication) => {
    setIsApplicationTrackerVisible(false);
    setEditingApplicationId(application.id);
    setIsApplicationFormVisible(true);
    setApplicationDraft({
      company: application.company,
      role: application.role,
      status: application.status,
      appliedDate: application.appliedDate,
      jobUrl: application.jobUrl,
      notes: application.notes,
    });
    setApplicationError('');
  };

  const closeApplicationForm = () => {
    setIsApplicationFormVisible(false);
    setEditingApplicationId(null);
    setApplicationError('');
  };

  const openApplicationTracker = () => {
    setIsApplicationTrackerVisible(true);
  };

  const closeApplicationTracker = () => {
    setIsApplicationTrackerVisible(false);
    setApplicationExportError('');
  };

  const exportApplications = async () => {
    if (userApplications.length === 0) {
      setApplicationExportError('Add a job application before exporting.');
      return;
    }

    setIsExportingApplications(true);
    setApplicationExportError('');
    try {
      const rows = [
        ['Company', 'Role', 'Status', 'Applied Date', 'Job URL', 'Notes'],
        ...userApplications.map((application) => [
          application.company,
          application.role,
          application.status,
          application.appliedDate,
          application.jobUrl,
          application.notes,
        ]),
      ];
      const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}`;
      const filename = `job-applications-${getLocalIsoDate()}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }

      if (!FileSystem.documentDirectory) {
        throw new Error('App storage is unavailable for exporting the job tracker.');
      }
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing files is not available on this device.');
      }

      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export job tracker',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (error) {
      console.error('Failed to export job applications:', error);
      setApplicationExportError('Could not export the job tracker. Please try again.');
    } finally {
      setIsExportingApplications(false);
    }
  };

  const saveApplication = () => {
    if (!applicationDraft.company.trim() || !applicationDraft.role.trim()) {
      setApplicationError('Company and role are required.');
      return;
    }
    if (applicationDraft.appliedDate && !/^\d{4}-\d{2}-\d{2}$/.test(applicationDraft.appliedDate)) {
      setApplicationError('Application date must use YYYY-MM-DD.');
      return;
    }

    if (editingApplicationId) {
      updateJobApplication(editingApplicationId, applicationDraft);
    } else {
      addJobApplication(applicationDraft);
    }
    closeApplicationForm();
  };

  const updateApplicationDraft = (field: keyof ApplicationDraft, value: string) => {
    setApplicationDraft((previous) => ({
      ...previous,
      [field]: value,
    }));
    setApplicationError('');
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
              style={({ pressed }) => [
                styles.menuCard,
                pressed && styles.menuCardPressed,
              ]}
              onPress={() => openMenuItem(item.route)}>
              <View style={[styles.menuIcon, { backgroundColor: item.iconBackground }]}>
                <Ionicons
                  name={item.icon}
                  size={23}
                  color={item.iconColor}
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

        <LinearGradient
          colors={[theme.colors.primarySoft, theme.colors.primaryGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.progressCard}>
          <View style={styles.progressHeading}>
            <View>
              <Text style={[styles.progressEyebrow, { color: theme.colors.primarySoftForeground }]}>YOUR PROGRESS</Text>
              <Text style={[styles.progressTitle, { color: theme.colors.primarySoftForeground }]}>Keep it going</Text>
            </View>
            <Ionicons name="trending-up-outline" size={24} color={theme.colors.primarySoftForeground} />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.primarySoftForeground }]}>{userTasks.length}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.primarySoftForeground }]}>Total tasks</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: theme.colors.primarySoftForeground }]}>{completedTasks}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.primarySoftForeground }]}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: overdueTasks > 0 ? theme.colors.accent : theme.colors.primarySoftForeground }]}>
                {overdueTasks}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.primarySoftForeground }]}>Overdue</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.featureCards}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Notes"
            style={({ pressed }) => [styles.featureCard, pressed && styles.menuCardPressed]}
            onPress={() => router.push('/(tabs)/notes' as never)}>
            <View style={styles.featureCardTop}>
              <View style={[styles.menuIcon, { backgroundColor: '#8065D8' }]}>
                <Ionicons name="document-text-outline" size={22} color="#FFFFFF" />
              </View>
              <Ionicons name="arrow-forward" size={17} color={theme.colors.buttonDark} />
            </View>
            <Text style={styles.featureCardTitle}>Notes</Text>
            <Text style={styles.featureCardDescription}>Save ideas and details for later.</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add or view job applications"
            style={({ pressed }) => [styles.featureCard, pressed && styles.menuCardPressed]}
            onPress={openApplicationTracker}>
            <View style={styles.featureCardTop}>
              <View style={[styles.menuIcon, { backgroundColor: '#E38A45' }]}>
                <Ionicons name="briefcase-outline" size={22} color="#263447" />
              </View>
              <Ionicons name="arrow-forward" size={17} color={theme.colors.buttonDark} />
            </View>
            <Text style={styles.featureCardTitle}>Job tracker</Text>
            <Text style={styles.featureCardDescription}>
              {userApplications.length} application{userApplications.length === 1 ? '' : 's'} · {interviewCount} interview{interviewCount === 1 ? '' : 's'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open document tools"
            style={({ pressed }) => [styles.featureCard, pressed && styles.menuCardPressed]}
            onPress={() => router.push('/(tabs)/documents' as never)}>
            <View style={styles.featureCardTop}>
              <View style={[styles.menuIcon, { backgroundColor: '#50A6BB' }]}>
                <Ionicons name="scan-outline" size={22} color="#18323D" />
              </View>
              <Ionicons name="arrow-forward" size={17} color={theme.colors.buttonDark} />
            </View>
            <Text style={styles.featureCardTitle}>Document tools</Text>
            <Text style={styles.featureCardDescription}>Scan pages and convert images to PDF, PNG, or JPG.</Text>
          </Pressable>
        </View>

      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={isApplicationTrackerVisible}
        onRequestClose={closeApplicationTracker}>
        <KeyboardAvoidingView
          style={styles.applicationModalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable
            accessibilityLabel="Close job tracker"
            style={StyleSheet.absoluteFill}
            onPress={closeApplicationTracker}
          />
          <View style={styles.applicationTrackerPanel}>
            <View style={styles.applicationsHeading}>
              <View style={styles.applicationsHeadingCopy}>
                <Text style={styles.progressEyebrow}>CAREER TRACKER</Text>
                <Text style={styles.applicationsTitle}>Job tracker</Text>
              </View>
              <View style={styles.trackerHeaderActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Export job applications to Excel-compatible CSV"
                  style={[styles.exportApplicationButton, isExportingApplications && styles.disabledAction]}
                  disabled={isExportingApplications}
                  onPress={() => void exportApplications()}>
                  <Ionicons
                    name={isExportingApplications ? 'hourglass-outline' : 'download-outline'}
                    size={17}
                    color={theme.colors.buttonDark}
                  />
                  <Text style={styles.exportApplicationButtonText}>
                    {isExportingApplications ? 'Exporting' : 'Excel'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add job application"
                  style={styles.addApplicationButton}
                  onPress={openNewApplicationForm}>
                  <Ionicons name="add" size={21} color={theme.colors.actionForeground} />
                </Pressable>
              </View>
            </View>
            {applicationExportError ? (
              <Text style={styles.applicationError}>{applicationExportError}</Text>
            ) : null}
            <View style={styles.applicationSearch}>
              <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
              <TextInput
                accessibilityLabel="Search job applications"
                style={styles.applicationSearchInput}
                value={applicationSearch}
                onChangeText={setApplicationSearch}
                placeholder="Search company, role, or status"
                placeholderTextColor={theme.colors.textMuted}
                returnKeyType="search"
              />
              {applicationSearch ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear job application search"
                  onPress={() => setApplicationSearch('')}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
            <ScrollView
              style={styles.applicationTrackerList}
              contentContainerStyle={styles.applicationTrackerListContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
              {visibleApplications.map((application) => {
                const statusColors = theme.isDark ? darkApplicationStatusColors : applicationStatusColors;
                return (
                <View key={application.id} style={styles.applicationCard}>
                  <View style={styles.applicationCardHeader}>
                    <View style={styles.applicationIdentity}>
                      <Text style={styles.applicationRole}>{application.role}</Text>
                      <Text style={styles.applicationCompany}>{application.company}</Text>
                    </View>
                    <View style={[
                      styles.applicationStatusBadge,
                      { backgroundColor: statusColors[application.status].background },
                    ]}>
                      <Text
                        style={[
                          styles.applicationStatusText,
                          { color: statusColors[application.status].text },
                        ]}>
                        {application.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.applicationDate}>
                    {application.appliedDate ? `Applied ${application.appliedDate}` : 'Application date not set'}
                  </Text>
                  {application.jobUrl ? (
                    <Text style={styles.applicationUrl} numberOfLines={1}>{application.jobUrl}</Text>
                  ) : null}
                  {application.notes ? (
                    <Text style={styles.applicationNotes} numberOfLines={3}>{application.notes}</Text>
                  ) : null}
                  <View style={styles.applicationActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${application.role} application`}
                      style={styles.applicationAction}
                      onPress={() => openEditApplicationForm(application)}>
                      <Ionicons name="create-outline" size={16} color={theme.colors.buttonDark} />
                      <Text style={styles.applicationActionText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${application.role} application`}
                      style={styles.applicationAction}
                      onPress={() => removeJobApplication(application.id)}>
                      <Ionicons name="trash-outline" size={16} color={theme.colors.accent} />
                      <Text style={[styles.applicationActionText, styles.deleteActionText]}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
                );
              })}
              {userApplications.length === 0 ? (
                <View style={styles.applicationsEmpty}>
                  <Ionicons name="briefcase-outline" size={25} color={theme.colors.textMuted} />
                  <Text style={styles.applicationsEmptyText}>No applications yet. Tap + to add one.</Text>
                </View>
              ) : visibleApplications.length === 0 ? (
                <View style={styles.applicationsEmpty}>
                  <Ionicons name="search-outline" size={25} color={theme.colors.textMuted} />
                  <Text style={styles.applicationsEmptyText}>No applications match your search.</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={isApplicationFormVisible}
        onRequestClose={closeApplicationForm}>
        <KeyboardAvoidingView
          style={styles.applicationModalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable accessibilityLabel="Close application editor" style={StyleSheet.absoluteFill} onPress={closeApplicationForm} />
          <ScrollView
            style={styles.applicationModalScroll}
            contentContainerStyle={styles.applicationModalPanel}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
            <Text style={styles.applicationModalTitle}>
              {editingApplicationId ? 'Edit application' : 'Track a job application'}
            </Text>
            <TextInput
              accessibilityLabel="Company"
              style={styles.applicationInput}
              placeholder="Company"
              placeholderTextColor={theme.colors.textSecondary}
              value={applicationDraft.company}
              onChangeText={(value) => updateApplicationDraft('company', value)}
              maxLength={100}
            />
            <TextInput
              accessibilityLabel="Role"
              style={styles.applicationInput}
              placeholder="Role or job title"
              placeholderTextColor={theme.colors.textSecondary}
              value={applicationDraft.role}
              onChangeText={(value) => updateApplicationDraft('role', value)}
              maxLength={120}
            />
            <Text style={styles.applicationFieldLabel}>Status</Text>
            <View style={styles.applicationStatusOptions}>
              {applicationStatuses.map((status) => (
                <Pressable
                  key={status}
                  style={[
                    styles.applicationStatusOption,
                    applicationDraft.status === status && styles.applicationStatusOptionSelected,
                  ]}
                  onPress={() => updateApplicationDraft('status', status)}>
                  <Text
                    style={[
                      styles.applicationStatusOptionText,
                      applicationDraft.status === status && styles.applicationStatusOptionTextSelected,
                    ]}>
                    {status}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              accessibilityLabel="Application date"
              style={styles.applicationInput}
              placeholder="Application date (YYYY-MM-DD)"
              placeholderTextColor={theme.colors.textSecondary}
              value={applicationDraft.appliedDate}
              onChangeText={(value) => updateApplicationDraft('appliedDate', value)}
            />
            <TextInput
              accessibilityLabel="Job posting link"
              style={styles.applicationInput}
              placeholder="Job posting link (optional)"
              placeholderTextColor={theme.colors.textSecondary}
              value={applicationDraft.jobUrl}
              onChangeText={(value) => updateApplicationDraft('jobUrl', value)}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TextInput
              accessibilityLabel="Application notes"
              style={[styles.applicationInput, styles.applicationNotesInput]}
              placeholder="Notes (optional)"
              placeholderTextColor={theme.colors.textSecondary}
              value={applicationDraft.notes}
              onChangeText={(value) => updateApplicationDraft('notes', value)}
              multiline
              textAlignVertical="top"
              maxLength={2000}
            />
            {applicationError ? <Text style={styles.applicationError}>{applicationError}</Text> : null}
            <View style={styles.applicationModalActions}>
              <Pressable style={styles.applicationCancelButton} onPress={closeApplicationForm}>
                <Text style={styles.applicationCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.applicationSaveButton} onPress={saveApplication}>
                <Text style={styles.applicationSaveText}>
                  {editingApplicationId ? 'Save changes' : 'Add application'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
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
  featureCards: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    minWidth: '46%',
    minHeight: 145,
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
  featureCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  featureCardTitle: {
    marginTop: 12,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontFamily: 'Nunito_800ExtraBold',
  },
  featureCardDescription: {
    marginTop: 3,
    color: theme.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Nunito_500Medium',
  },
  applicationTrackerPanel: {
    maxHeight: '85%',
    padding: 16,
    borderRadius: 22,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  applicationTrackerList: {
    marginTop: 2,
  },
  applicationTrackerListContent: {
    paddingBottom: 2,
  },
  applicationsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  applicationsHeadingCopy: {
    flex: 1,
  },
  trackerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  applicationsTitle: {
    marginTop: 2,
    color: theme.colors.textPrimary,
    fontSize: 19,
    fontFamily: 'Nunito_800ExtraBold',
  },
  addApplicationButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: theme.colors.buttonDark,
  },
  exportApplicationButton: {
    minHeight: 36,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 18,
    backgroundColor: '#E8F4F7',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  exportApplicationButtonText: {
    color: theme.colors.buttonDark,
    fontSize: 11,
    fontFamily: 'Nunito_800ExtraBold',
  },
  disabledAction: {
    opacity: 0.6,
  },
  applicationSearch: {
    minHeight: 42,
    marginTop: 10,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: '#F7FBFC',
  },
  applicationSearchInput: {
    flex: 1,
    paddingVertical: 8,
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
  },
  applicationCard: {
    marginTop: 9,
    padding: 13,
    borderRadius: 16,
    backgroundColor: '#F7FBFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  applicationCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  applicationIdentity: {
    flex: 1,
  },
  applicationRole: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontFamily: 'Nunito_800ExtraBold',
  },
  applicationCompany: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  applicationStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  applicationStatusText: {
    fontSize: 10,
    fontFamily: 'Nunito_800ExtraBold',
  },
  applicationDate: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
  },
  applicationUrl: {
    marginTop: 4,
    color: theme.colors.buttonDark,
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
  },
  applicationNotes: {
    marginTop: 6,
    color: theme.colors.textPrimary,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Nunito_500Medium',
  },
  applicationActions: {
    marginTop: 9,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
  },
  applicationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
  },
  applicationActionText: {
    color: theme.colors.buttonDark,
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
  deleteActionText: {
    color: theme.colors.accent,
  },
  applicationsEmpty: {
    marginTop: 8,
    padding: 18,
    alignItems: 'center',
    gap: 7,
    borderRadius: 14,
    backgroundColor: '#F7FBFC',
  },
  applicationsEmptyText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
  },
  applicationModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(57, 83, 91, 0.48)',
  },
  applicationModalScroll: {
    maxHeight: '90%',
    borderRadius: 22,
    backgroundColor: theme.colors.cardBackground,
  },
  applicationModalPanel: {
    gap: 10,
    padding: 18,
  },
  applicationModalTitle: {
    marginBottom: 2,
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontFamily: 'Nunito_800ExtraBold',
  },
  applicationInput: {
    minHeight: 44,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 11,
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
  },
  applicationNotesInput: {
    minHeight: 86,
    paddingTop: 10,
  },
  applicationFieldLabel: {
    marginTop: 2,
    color: theme.colors.buttonDark,
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  applicationStatusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  applicationStatusOption: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#F3F8FA',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  applicationStatusOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  applicationStatusOptionText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
  applicationStatusOptionTextSelected: {
    color: theme.colors.textPrimary,
  },
  applicationError: {
    color: theme.colors.accent,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  applicationModalActions: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  applicationCancelButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
  },
  applicationCancelText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  applicationSaveButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: theme.colors.buttonDark,
  },
  applicationSaveText: {
    color: theme.colors.cardBackground,
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
});
