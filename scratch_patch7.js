const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/index.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldAlertBlock = `  // Check for missing menus for tomorrow
  let missingMenusAlert = false;
  let missingPlanNames: string[] = [];
  if (plans && menus && prepForecast?.tomorrow) {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    const tmrwStr = \`\${tmrw.getFullYear()}-\${String(tmrw.getMonth() + 1).padStart(2, '0')}-\${String(tmrw.getDate()).padStart(2, '0')}\`;
    
    plans.forEach(plan => {
      const planKey = \`\${plan.diet_type.toUpperCase()} \${plan.slot_name.toUpperCase()}\`;
      // ONLY alert if there are actual customers expecting to eat this meal tomorrow!
      const customersTomorrow = prepForecast.tomorrow.breakdown[planKey] || 0;
      if (customersTomorrow === 0) return;
      
      const hasMenu = menus.some(m => m.subscription_id === plan.id && m.effective_date === tmrwStr);
      if (!hasMenu) {
        missingMenusAlert = true;
        missingPlanNames.push(planKey);
      }
    });
  }`;

const newAlertBlock = `  // Check for missing menus for today and tomorrow
  let missingMenusAlert = false;
  let missingPlanNames: string[] = [];
  let alertDayText = 'Tomorrow';
  
  if (plans && menus && prepForecast) {
    const todayStr = getLocalToday();
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    const tmrwStr = \`\${tmrw.getFullYear()}-\${String(tmrw.getMonth() + 1).padStart(2, '0')}-\${String(tmrw.getDate()).padStart(2, '0')}\`;
    
    const checkDay = (dateStr: string, dayKey: 'today' | 'tomorrow') => {
      let missingInDay = false;
      plans.forEach(plan => {
        const planKey = \`\${plan.diet_type.toUpperCase()} \${plan.slot_name.toUpperCase()}\`;
        const customers = prepForecast[dayKey].breakdown[planKey] || 0;
        if (customers === 0) return;
        
        const hasMenu = menus.some(m => m.subscription_id === plan.id && m.effective_date === dateStr);
        if (!hasMenu) {
          missingMenusAlert = true;
          missingInDay = true;
          if (!missingPlanNames.includes(planKey)) missingPlanNames.push(planKey);
        }
      });
      return missingInDay;
    };

    // Prioritize alerting for TODAY if they are actively missing a menu for today's prep
    const missingToday = checkDay(todayStr, 'today');
    if (missingToday) {
      alertDayText = 'Today';
    } else {
      checkDay(tmrwStr, 'tomorrow');
    }
  }`;

code = code.replace(oldAlertBlock, newAlertBlock);

const oldUIBanner = `            <View style={{ flex: 1 }}>
              <Text style={styles.missingMenuTitle}>Action Required for Tomorrow!</Text>
              <Text style={styles.missingMenuText}>You have not published a menu for tomorrow for: {missingPlanNames.join(', ')}</Text>
            </View>`;

const newUIBanner = `            <View style={{ flex: 1 }}>
              <Text style={styles.missingMenuTitle}>Action Required for {alertDayText}!</Text>
              <Text style={styles.missingMenuText}>You have not published a menu for {alertDayText.toLowerCase()} for: {missingPlanNames.join(', ')}</Text>
            </View>`;
            
code = code.replace(oldUIBanner, newUIBanner);

fs.writeFileSync(path, code);
