import { View, Text, StyleSheet } from 'react-native';

export default function CalendarScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Delivery Calendar</Text>
      <Text style={styles.subtitle}>Select a date to Pause/Skip upcoming meals.</Text>
      
      {/* Placeholder for Calendar UI */}
      <View style={styles.content}>
        <Text>Interactive Calendar Component Goes Here</Text>
        <Text style={styles.note}>Note: Cut-off time for tomorrow is 8:00 PM.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  note: {
    marginTop: 20,
    fontSize: 12,
    color: '#d32f2f',
  }
});

