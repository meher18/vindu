import { Tabs } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function VendorLayout() {
  const { signOut } = useAuthStore();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: 'orange' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Fulfillment',
          tabBarLabel: 'Fulfillment',
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: 'Ledger & Payouts',
          tabBarLabel: 'Ledger',
        }}
      />
    </Tabs>
  );
}

