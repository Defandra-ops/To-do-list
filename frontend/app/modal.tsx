import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/Colors';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Playful Workflow Tips</Text>

        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>1.</Text>
          <Text style={styles.tipText}>Create one big task with a clear outcome.</Text>
        </View>

        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>2.</Text>
          <Text style={styles.tipText}>Break it into tiny subtasks you can finish in 5-15 minutes.</Text>
        </View>

        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>3.</Text>
          <Text style={styles.tipText}>Use the Overview tab to rebalance when too many tasks are waiting.</Text>
        </View>
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    backgroundColor: theme.colors.background,
  },
  card: {
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardBackground,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 10,
    fontFamily: 'Nunito_800ExtraBold',
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  tipBullet: {
    fontWeight: '800',
    color: theme.colors.buttonDark,
    fontFamily: 'Nunito_700Bold',
  },
  tipText: {
    flex: 1,
    color: theme.colors.textSecondary,
    lineHeight: 21,
    fontFamily: 'Nunito_600SemiBold',
  },
});
