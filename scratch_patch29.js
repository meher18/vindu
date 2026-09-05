const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/_layout.tsx';
let code = fs.readFileSync(path, 'utf8');

const importSearch = `import { useAuthStore } from '@/store/authStore';`;
const importReplace = `import { useAuthStore } from '@/store/authStore';\nimport { Feather } from '@expo/vector-icons';`;
code = code.replace(importSearch, importReplace);

code = code.replace(
  `          tabBarLabel: 'Home',`,
  `          tabBarLabel: 'Home',\n          tabBarIcon: ({ color, size }) => <Feather name="activity" color={color} size={size} />,\n          headerShown: false,` // Actually wait, if I set headerShown to false, the logout button disappears!
);

// Better way to do it:
code = fs.readFileSync(path, 'utf8');
code = code.replace(importSearch, importReplace);

// Home
code = code.replace(`          tabBarLabel: 'Home',`, `          tabBarLabel: 'Home',\n          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} />,`);
// Menu
code = code.replace(`          tabBarLabel: 'Menu',`, `          tabBarLabel: 'Menu',\n          tabBarIcon: ({ color, size }) => <Feather name="calendar" color={color} size={size} />,`);
// Plans
code = code.replace(`          tabBarLabel: 'Plans',`, `          tabBarLabel: 'Plans',\n          tabBarIcon: ({ color, size }) => <Feather name="tag" color={color} size={size} />,`);
// Dispatch
code = code.replace(`          tabBarLabel: 'Dispatch',`, `          tabBarLabel: 'Dispatch',\n          tabBarIcon: ({ color, size }) => <Feather name="truck" color={color} size={size} />,`);
// Ledger
code = code.replace(`          tabBarLabel: 'Ledger',`, `          tabBarLabel: 'Ledger',\n          tabBarIcon: ({ color, size }) => <Feather name="dollar-sign" color={color} size={size} />,`);

fs.writeFileSync(path, code);
