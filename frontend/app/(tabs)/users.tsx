import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTodoStore, type UserAccount } from '@/components/TodoStore';
import { LocalizedText as Text, LocalizedTextInput as TextInput } from '@/components/LocalizedText';
import { theme } from '@/constants/Colors';
import { useAppTheme } from '@/components/useAppTheme';
import { useThemedStyles } from '@/components/useThemedStyles';

type ProfileDraft = {
  name: string;
  age: string;
  dailyFocus: string;
  photoUri: string;
};

const createDraft = (user: UserAccount): ProfileDraft => ({
  name: user.name,
  age: user.age === null ? '' : String(user.age),
  dailyFocus: user.dailyFocus,
  photoUri: user.photoUri,
});

export default function UsersScreen() {
  const theme = useAppTheme();
  const styles = useThemedStyles(baseStyles);
  const { users, activeUserId, addUser, setActiveUserId, updateUserProfile } = useTodoStore();
  const [nameDraft, setNameDraft] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft | null>(null);
  const [formError, setFormError] = useState('');

  const handleCreateOrLogin = () => {
    if (!nameDraft.trim()) return;
    addUser(nameDraft);
    setNameDraft('');
  };

  const beginEditing = (user: UserAccount) => {
    setEditingUserId(user.id);
    setProfileDraft(createDraft(user));
    setFormError('');
  };

  const updateDraft = (field: keyof ProfileDraft, value: string) => {
    setProfileDraft((previous) => previous ? { ...previous, [field]: value } : previous);
    setFormError('');
  };

  const chooseProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0] || !profileDraft || !editingUserId) return;

      const asset = result.assets[0];
      if (!FileSystem.documentDirectory) {
        throw new Error('App storage is unavailable for saving the profile photo.');
      }
      const extension = asset.uri.split('.').pop()?.split('?')[0]?.toLowerCase();
      const safeExtension = extension && /^[a-z0-9]{2,5}$/.test(extension) ? extension : 'jpg';
      const photoUri = `${FileSystem.documentDirectory}profile-${editingUserId}.${safeExtension}`;
      await FileSystem.copyAsync({ from: asset.uri, to: photoUri });
      updateDraft('photoUri', photoUri);
    } catch (error) {
      console.error('Failed to select profile photo:', error);
      setFormError('Could not select or save the photo. Please try another image.');
    }
  };

  const saveProfile = () => {
    if (!editingUserId || !profileDraft) return;
    const name = profileDraft.name.trim();
    const ageText = profileDraft.age.trim();
    const age = ageText ? Number(ageText) : null;

    if (!name) {
      setFormError('Name is required.');
      return;
    }
    if (ageText && (age === null || !Number.isInteger(age) || age < 1 || age > 120)) {
      setFormError('Enter an age between 1 and 120, or leave it blank.');
      return;
    }

    updateUserProfile(editingUserId, {
      name,
      age,
      dailyFocus: profileDraft.dailyFocus.trim(),
      photoUri: profileDraft.photoUri,
    });
    setEditingUserId(null);
    setProfileDraft(null);
    setFormError('');
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setProfileDraft(null);
    setFormError('');
  };

  const activeUserName = users.find((user) => user.id === activeUserId)?.name ?? 'No user';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        <Text style={styles.title}>People</Text>
        <Text style={styles.subtitle}>Manage profiles and keep task progress separate for each person.</Text>

        <View style={[styles.panel, styles.heroPanel]}>
          <Text style={styles.panelTitle}>Current User</Text>
          <View style={styles.currentUserRow}>
            <ProfileAvatar name={activeUserName} photoUri={users.find((user) => user.id === activeUserId)?.photoUri ?? ''} size={48} />
            <View style={styles.currentUserInfo}>
              <Text style={styles.currentUserName}>{activeUserName}</Text>
              <Text style={styles.panelBody}>Progress is saved for this profile.</Text>
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Create a profile</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={theme.colors.textSecondary}
              value={nameDraft}
              onChangeText={setNameDraft}
              onSubmitEditing={handleCreateOrLogin}
              returnKeyType="done"
              maxLength={50}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create profile"
              style={styles.addButton}
              onPress={handleCreateOrLogin}>
              <Ionicons name="add" size={22} color={theme.colors.actionForeground} />
            </Pressable>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Profiles</Text>
          {users.map((user) => {
            const isActive = user.id === activeUserId;
            const isEditing = user.id === editingUserId && profileDraft !== null;

            return (
              <View key={user.id} style={[styles.userCard, isActive && styles.userCardActive]}>
                <View style={styles.userRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Switch to ${user.name}`}
                    style={styles.userIdentity}
                    onPress={() => setActiveUserId(user.id)}>
                    <ProfileAvatar name={user.name} photoUri={user.photoUri} size={44} />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userMeta}>
                        {user.age ? `${user.age} years old` : 'Age not set'}{isActive ? ' · Active' : ''}
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${user.name} profile`}
                    style={styles.editButton}
                    onPress={() => isEditing ? cancelEditing() : beginEditing(user)}>
                    <Ionicons name={isEditing ? 'close' : 'create-outline'} size={19} color={theme.colors.buttonDark} />
                  </Pressable>
                </View>

                {user.dailyFocus ? (
                  <View style={styles.focusRow}>
                    <Ionicons name="sparkles-outline" size={16} color={theme.colors.buttonDark} />
                    <Text style={styles.focusText}>{user.dailyFocus}</Text>
                  </View>
                ) : null}

                {isEditing && profileDraft ? (
                  <View style={styles.editForm}>
                    <Pressable
                      accessibilityRole="button"
                      style={styles.photoPicker}
                      onPress={() => void chooseProfilePhoto()}>
                      {profileDraft.photoUri ? (
                        <Image source={{ uri: profileDraft.photoUri }} style={styles.photoPreview} />
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Ionicons name="camera-outline" size={23} color={theme.colors.buttonDark} />
                        </View>
                      )}
                      <View style={styles.photoPickerTextWrap}>
                        <Text style={styles.photoPickerTitle}>
                          {profileDraft.photoUri ? 'Change profile photo' : 'Add profile photo'}
                        </Text>
                        <Text style={styles.photoPickerHint}>Choose a picture from your gallery</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={17} color={theme.colors.textSecondary} />
                    </Pressable>

                    <Text style={styles.fieldLabel}>Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Name"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={profileDraft.name}
                      onChangeText={(value) => updateDraft('name', value)}
                      maxLength={50}
                    />

                    <Text style={styles.fieldLabel}>Age</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Age (optional)"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={profileDraft.age}
                      onChangeText={(value) => updateDraft('age', value.replace(/[^0-9]/g, '').slice(0, 3))}
                      keyboardType="number-pad"
                      maxLength={3}
                    />

                    <Text style={styles.fieldLabel}>Hobbies or daily routines</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      placeholder="e.g. Reading, jogging, studying English"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={profileDraft.dailyFocus}
                      onChangeText={(value) => updateDraft('dailyFocus', value)}
                      multiline
                      maxLength={240}
                    />

                    {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
                    <View style={styles.formActions}>
                      <Pressable style={styles.cancelButton} onPress={cancelEditing}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </Pressable>
                      <Pressable style={styles.saveButton} onPress={saveProfile}>
                        <Ionicons name="checkmark" size={17} color={theme.colors.actionForeground} />
                        <Text style={styles.saveButtonText}>Save profile</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
          {users.length === 0 ? <Text style={styles.panelBody}>No profiles yet.</Text> : null}
        </View>
      </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function ProfileAvatar({ name, photoUri, size }: { name: string; photoUri: string; size: number }) {
  const theme = useAppTheme();
  const styles = useThemedStyles(baseStyles);
  if (photoUri) {
    return <Image source={{ uri: photoUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  return (
    <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarInitial, { fontSize: Math.round(size * 0.4) }]}>
        {name.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
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
    fontSize: 14,
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
    backgroundColor: '#E8F7FB',
    borderColor: '#CDECF4',
    shadowOpacity: 0.08,
    elevation: 4,
  },
  panelTitle: {
    fontSize: 18,
    color: theme.colors.textPrimary,
    marginBottom: 10,
    fontFamily: 'Nunito_800ExtraBold',
  },
  currentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentUserInfo: {
    flex: 1,
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
    minHeight: 44,
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#F7FBFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
  },
  multilineInput: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  addButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.buttonDark,
    borderRadius: theme.borderRadius.full,
  },
  userCard: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
  },
  userCardActive: {
    backgroundColor: '#F5FBFC',
    borderColor: '#CDECF4',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  userIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: theme.colors.textPrimary,
    fontFamily: 'Nunito_800ExtraBold',
  },
  userMeta: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Nunito_500Medium',
  },
  editButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  avatarInitial: {
    color: theme.colors.buttonDark,
    fontFamily: 'Nunito_800ExtraBold',
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 9,
    padding: 9,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 12,
  },
  focusText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Nunito_500Medium',
  },
  editForm: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  photoPicker: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#F7FBFC',
    borderRadius: 14,
  },
  photoPreview: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  photoPlaceholder: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 23,
  },
  photoPickerTextWrap: {
    flex: 1,
  },
  photoPickerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  photoPickerHint: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontFamily: 'Nunito_500Medium',
  },
  fieldLabel: {
    marginTop: 8,
    marginBottom: 5,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
  errorText: {
    marginTop: 8,
    color: theme.colors.accent,
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  cancelButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    backgroundColor: '#F3F8FA',
    borderRadius: theme.borderRadius.full,
  },
  cancelButtonText: {
    color: theme.colors.buttonDark,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  saveButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 15,
    backgroundColor: theme.colors.buttonDark,
    borderRadius: theme.borderRadius.full,
  },
  saveButtonText: {
    color: theme.colors.cardBackground,
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  panelBody: {
    color: theme.colors.textSecondary,
    lineHeight: 21,
    fontSize: 12,
    fontFamily: 'Nunito_500Medium',
  },
});
