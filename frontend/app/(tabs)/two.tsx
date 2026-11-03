import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTodoStore } from '@/components/TodoStore';
import { theme } from '@/constants/Colors';

export default function UsersScreen() {
  const { users, activeUserId, addUser, setActiveUserId } = useTodoStore();
  const [nameDraft, setNameDraft] = useState('');

  const handleCreateOrLogin = () => {
    if (!nameDraft.trim()) return;
    addUser(nameDraft);
    setNameDraft('');
  };

  const activeUserName = users.find((user) => user.id === activeUserId)?.name ?? 'No user';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>User Login</Text>
      <Text style={styles.subtitle}>Create a user or tap one below to log in.</Text>

      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.panel, styles.heroPanel]}>
        <Text style={styles.panelTitle}>Current User</Text>
        <View style={styles.currentUserRow}>
          <Ionicons name="person-circle" size={24} color={theme.colors.buttonDark} />
          <Text style={styles.currentUserName}>{activeUserName}</Text>
        </View>
      </LinearGradient>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Create Or Log In</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Type user name"
            placeholderTextColor="#6d87a7"
            value={nameDraft}
            onChangeText={setNameDraft}
            onSubmitEditing={handleCreateOrLogin}
            returnKeyType="done"
          />
          <Pressable style={styles.addButton} onPress={handleCreateOrLogin}>
            <Ionicons name="log-in-outline" size={18} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>All Users</Text>
        {users.map((user) => {
          const isActive = user.id === activeUserId;
          return (
            <Pressable
              key={user.id}
              style={[styles.userRow, isActive && styles.userRowActive]}
              onPress={() => setActiveUserId(user.id)}>
              <Text style={[styles.userName, isActive && styles.userNameActive]}>{user.name}</Text>
              <Text style={[styles.userStatus, isActive && styles.userStatusActive]}>
                {isActive ? 'Logged in' : 'Log in'}
              </Text>
            </Pressable>
          );
        })}
        {users.length === 0 ? <Text style={styles.panelBody}>No users yet.</Text> : null}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Usage</Text>
        <Text style={styles.panelBody}>
          Go back to Planner and create tasks. Each task shows who created it, who must do it, and which users are included.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  title: {
    fontSize: 26,
    color: theme.colors.textPrimary,
    marginTop: 8,
    fontFamily: 'Nunito_800ExtraBold',
  },
  subtitle: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontFamily: 'Nunito_500Medium',
  },
  panel: {
    marginTop: 14,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  heroPanel: {
    borderColor: '#CDECF4',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    elevation: 4,
  },
  panelTitle: {
    fontSize: 18,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    fontFamily: 'Nunito_800ExtraBold',
  },
  currentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentUserName: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Nunito_800ExtraBold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.buttonDark,
    backgroundColor: theme.colors.buttonDark,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  userRowActive: {
    backgroundColor: '#EAF7FA',
    borderBottomColor: 'transparent',
  },
  userName: {
    color: theme.colors.textPrimary,
    fontFamily: 'Nunito_700Bold',
  },
  userNameActive: {
    color: theme.colors.buttonDark,
  },
  userStatus: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  userStatusActive: {
    color: theme.colors.buttonDark,
    backgroundColor: '#EAF7FA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  panelBody: {
    color: theme.colors.textSecondary,
    lineHeight: 21,
    fontFamily: 'Nunito_500Medium',
  },
});
