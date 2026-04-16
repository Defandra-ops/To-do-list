import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTodoStore } from '@/components/TodoStore';

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
      <View style={styles.bubbleOne} />
      <View style={styles.bubbleTwo} />

      <Text style={styles.title}>User Login</Text>
      <Text style={styles.subtitle}>Create a user or tap one below to log in.</Text>

      <LinearGradient
        colors={['#2a8cff', '#4fa1ff', '#73b6ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.panel, styles.heroPanel]}>
        <Text style={styles.panelTitle}>Current User</Text>
        <View style={styles.currentUserRow}>
          <Ionicons name="person-circle" size={24} color="#ffffff" />
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
    backgroundColor: '#f2f7ff',
    padding: 16,
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
    bottom: -50,
    right: -40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f4fa8',
    marginTop: 8,
  },
  subtitle: {
    marginTop: 6,
    color: '#355f96',
    fontSize: 14,
  },
  panel: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: '#fcfeff',
    borderWidth: 1,
    borderColor: '#cfe0f3',
    padding: 14,
    shadowColor: '#2e6fb8',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  heroPanel: {
    borderColor: 'rgba(255,255,255,0.38)',
    shadowColor: '#1f66b8',
    shadowOpacity: 0.2,
    elevation: 4,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#143f7d',
    marginBottom: 8,
  },
  currentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentUserName: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#f4f9ff',
    borderWidth: 1,
    borderColor: '#aac7ea',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#1f1f1f',
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2c89f7',
    backgroundColor: '#3f97ff',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e8eef5',
  },
  userRowActive: {
    backgroundColor: 'rgba(29, 125, 255, 0.16)',
    borderBottomColor: 'transparent',
  },
  userName: {
    color: '#1e2e43',
    fontWeight: '700',
  },
  userNameActive: {
    color: '#0f4fa8',
  },
  userStatus: {
    color: '#4a6281',
    fontWeight: '700',
    fontSize: 12,
  },
  userStatusActive: {
    color: '#0a4a9b',
    backgroundColor: 'rgba(29, 125, 255, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  panelBody: {
    color: '#4f627d',
    lineHeight: 21,
    fontWeight: '500',
  },
});
