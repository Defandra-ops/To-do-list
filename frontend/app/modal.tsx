import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

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
    backgroundColor: '#f7f7f7',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    backgroundColor: '#ffffff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f1f1f',
    marginBottom: 10,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  tipBullet: {
    fontWeight: '800',
    color: '#1f1f1f',
  },
  tipText: {
    flex: 1,
    color: '#666666',
    lineHeight: 21,
    fontWeight: '600',
  },
});
