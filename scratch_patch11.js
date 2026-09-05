const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/index.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add phone
code = code.replace(
  `const [name, setName] = useState('');`,
  `const [name, setName] = useState('');\n  const [phone, setPhone] = useState('');`
);

// 2. Fix todayDay -> todayShort
code = code.replace(
  `today: calc(todayStr, todayDay),`,
  `today: calc(todayStr, todayShort),`
);
code = code.replace(
  `tomorrow: calc(tomorrowStr, tomorrowDay)`,
  `tomorrow: calc(tomorrowStr, tomorrowShort)`
);

fs.writeFileSync(path, code);
