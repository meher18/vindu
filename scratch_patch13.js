const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/ledger.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  `<Text style={styles.balanceValue}>₹{pendingBalance.toFixed(0)}</Text>`,
  `<Text style={styles.balanceAmountAvailable}>₹{pendingBalance.toFixed(0)}</Text>`
);
code = code.replace(
  `<Text style={styles.balanceValue}>₹{lifetimeEarnings.toFixed(0)}</Text>`,
  `<Text style={styles.balanceAmountPending}>₹{lifetimeEarnings.toFixed(0)}</Text>`
);

fs.writeFileSync(path, code);
