const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/plans.tsx';
let code = fs.readFileSync(path, 'utf8');

// Update fallback defaults in createPlan mutation
code = code.replace(/config\?\.vendor_split_pct \|\| 0\.7/g, 'config?.vendor_split_pct || 0.79');
code = code.replace(/config\?\.driver_split_pct \|\| 0\.2/g, 'config?.driver_split_pct || 0.20');

// Also ensure the UI string explicitly renders correctly
code = code.replace(/Platform Deduction \(\{/g, 'Platform Deduction ({');

fs.writeFileSync(path, code);
