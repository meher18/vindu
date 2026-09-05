const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/plans.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '<Text style={styles.price}>₹{plan.price_per_day}<Text style={styles.perDay}>/day</Text></Text>',
  '<Text style={styles.price}>₹{plan.vendor_fee}<Text style={styles.perDay}>/payout</Text></Text>'
);

fs.writeFileSync(path, code);
