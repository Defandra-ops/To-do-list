import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTodoStore } from '@/components/TodoStore';
import { LocalizedText as Text, LocalizedTextInput as TextInput } from '@/components/LocalizedText';
import { theme } from '@/constants/Colors';

export default function NotesScreen() {
  const { notes, users, addNote, updateNote, removeNote } = useTodoStore();
  const [titleDraft, setTitleDraft] = useState('');
  const [contentDraft, setContentDraft] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const userById = Object.fromEntries(users.map((user) => [user.id, user.name]));

  const resetForm = () => {
    setTitleDraft('');
    setContentDraft('');
    setEditingNoteId(null);
    setFormError('');
  };

  const beginEditing = (noteId: string) => {
    const note = notes.find((item) => item.id === noteId);
    if (!note) return;
    setTitleDraft(note.title);
    setContentDraft(note.content);
    setEditingNoteId(note.id);
    setFormError('');
  };

  const saveNote = () => {
    const title = titleDraft.trim();
    const content = contentDraft.trim();
    if (!title || !content) {
      setFormError('Title and note are required.');
      return;
    }

    if (editingNoteId) {
      updateNote(editingNoteId, title, content);
    } else {
      addNote(title, content);
    }
    resetForm();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>YOUR THOUGHTS</Text>
          <Text style={styles.title}>Notes</Text>
          <Text style={styles.subtitle}>Keep ideas and details close to your tasks.</Text>
        </View>

        <View style={styles.editor}>
          <Text style={styles.editorTitle}>{editingNoteId ? 'Edit note' : 'New note'}</Text>
          <TextInput
            accessibilityLabel="Note title"
            style={styles.titleInput}
            placeholder="Title"
            placeholderTextColor={theme.colors.textSecondary}
            value={titleDraft}
            onChangeText={(value) => {
              setTitleDraft(value);
              setFormError('');
            }}
            maxLength={120}
            returnKeyType="next"
          />
          <TextInput
            accessibilityLabel="Note content"
            style={styles.contentInput}
            placeholder="Write your note..."
            placeholderTextColor={theme.colors.textSecondary}
            value={contentDraft}
            onChangeText={(value) => {
              setContentDraft(value);
              setFormError('');
            }}
            multiline
            textAlignVertical="top"
            maxLength={4000}
          />
          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          <View style={styles.editorActions}>
            {editingNoteId ? (
              <Pressable accessibilityRole="button" style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" style={styles.saveButton} onPress={saveNote}>
              <Ionicons name={editingNoteId ? 'checkmark' : 'add'} size={19} color={theme.colors.cardBackground} />
              <Text style={styles.saveButtonText}>{editingNoteId ? 'Save changes' : 'Add note'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>All notes</Text>
          <Text style={styles.count}>{notes.length}</Text>
        </View>

        {notes.map((note) => (
          <View key={note.id} style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <View style={styles.noteTitleWrap}>
                <Text style={styles.noteTitle}>{note.title}</Text>
                <Text style={styles.noteMeta}>
                  {userById[note.createdByUserId] ?? 'Unknown user'}
                  {note.updatedAt ? ` · ${new Date(note.updatedAt).toLocaleDateString()}` : ''}
                </Text>
              </View>
              <View style={styles.noteActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${note.title}`}
                  style={styles.iconButton}
                  onPress={() => beginEditing(note.id)}>
                  <Ionicons name="create-outline" size={19} color={theme.colors.buttonDark} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${note.title}`}
                  style={styles.iconButton}
                  onPress={() => {
                    removeNote(note.id);
                    if (editingNoteId === note.id) resetForm();
                  }}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.accent} />
                </Pressable>
              </View>
            </View>
            <Text style={styles.noteContent}>{note.content}</Text>
          </View>
        ))}

        {notes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={30} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No notes yet</Text>
            <Text style={styles.emptyText}>Add a note above to keep important details in one place.</Text>
          </View>
        ) : null}
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
    padding: 16,
    paddingBottom: 48,
  },
  header: {
    paddingVertical: 12,
  },
  eyebrow: {
    color: theme.colors.buttonDark,
    fontSize: 11,
    fontFamily: 'Nunito_800ExtraBold',
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 4,
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontFamily: 'Nunito_800ExtraBold',
  },
  subtitle: {
    marginTop: 3,
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Nunito_600SemiBold',
  },
  editor: {
    gap: 10,
    padding: 16,
    borderRadius: 22,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editorTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontFamily: 'Nunito_800ExtraBold',
  },
  titleInput: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    color: theme.colors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
  },
  contentInput: {
    minHeight: 130,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    color: theme.colors.textPrimary,
    fontFamily: 'Nunito_600SemiBold',
  },
  errorText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  saveButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.buttonDark,
  },
  saveButtonText: {
    color: theme.colors.cardBackground,
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
  cancelButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 10,
  },
  listTitle: {
    color: theme.colors.textPrimary,
    fontSize: 19,
    fontFamily: 'Nunito_800ExtraBold',
  },
  count: {
    minWidth: 23,
    textAlign: 'center',
    overflow: 'hidden',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    color: theme.colors.buttonDark,
    backgroundColor: '#EAF7FA',
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  noteCard: {
    marginTop: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  noteTitleWrap: {
    flex: 1,
  },
  noteTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Nunito_800ExtraBold',
  },
  noteMeta: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontFamily: 'Nunito_600SemiBold',
  },
  noteActions: {
    flexDirection: 'row',
    gap: 5,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  noteContent: {
    marginTop: 12,
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Nunito_600SemiBold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 18,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    marginTop: 8,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Nunito_800ExtraBold',
  },
  emptyText: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Nunito_600SemiBold',
  },
});
