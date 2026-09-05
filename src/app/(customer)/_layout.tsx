import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarLabel: 'Discover', tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} /> }} />
      <Tabs.Screen name="subscriptions" options={{ title: 'My Plans', tabBarLabel: 'My Plans', tabBarIcon: ({ color }) => <TabIcon emoji="📦" color={color} /> }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarLabel: 'Calendar', tabBarIcon: ({ color }) => <TabIcon emoji="📅" color={color} /> }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet', tabBarLabel: 'Wallet', tabBarIcon: ({ color }) => <TabIcon emoji="💰" color={color} /> }} />
      <Tabs.Screen name="ratings" options={{ title: 'Rate', tabBarLabel: 'Rate', tabBarIcon: ({ color }) => <TabIcon emoji="⭐" color={color} /> }} />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 22, opacity: color === '#FF6B35' ? 1 : 0.5 }}>{emoji}</Text>;
}

