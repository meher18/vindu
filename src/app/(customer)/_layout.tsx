import { Tabs } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function CustomerLayout() {
  const { signOut } = useAuthStore();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: 'tomato' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarLabel: 'Calendar',
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarLabel: 'Wallet',
        }}
      />
    </Tabs>
  );
}

