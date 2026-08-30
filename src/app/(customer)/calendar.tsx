import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

export default function CalendarScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Delivery Calendar</Text>
        <Text style={styles.subtitle}>Manage your upcoming deliveries</Text>
        <View style={styles.comingSoon}>
          <Text style={styles.comingEmoji}>📅</Text>
          <Text style={styles.comingTitle}>Coming Soon</Text>
          <Text style={styles.comingSub}>
            You will be able to skip deliveries, view your schedule, and manage pauses from here.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7F0' },
  scroll: { padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 40 },
  comingSoon: { backgroundColor: '#FFF', borderRadius: 28, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  comingEmoji: { fontSize: 56, marginBottom: 20 },
  comingTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A2E', marginBottom: 12 },
  comingSub: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 24 },
});
