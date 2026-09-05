const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/index.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add currentTime state and useEffect
const oldStateBlock = `  const [holidayModal, setHolidayModal] = useState(false);`;
const newStateBlock = `  const [holidayModal, setHolidayModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);`;
code = code.replace(oldStateBlock, newStateBlock);

// 2. Compute the nearest deadline
const oldHeader = `        <View style={styles.dashboardHeader}>`;
const newHeader = `        {(() => {
          if (!plans || plans.length === 0) return null;
          
          const todayStr = getLocalToday();
          const days = ['sun','mon','tue','wed','thu','fri','sat'];
          const todayShort = days[currentTime.getDay()];
          
          // Check if today is a holiday
          const isHolidayToday = holidays?.some(h => h.holiday_date === todayStr);
          if (isHolidayToday) return null;
          
          let nearestPlan = null;
          let minDiffMs = Infinity;
          
          plans.forEach(plan => {
            if (plan.operating_days && !plan.operating_days.includes(todayShort)) return;
            if (!plan.slot_target_time) return;
            
            const [h, m, s] = plan.slot_target_time.split(':').map(Number);
            const targetTime = new Date(currentTime);
            targetTime.setHours(h, m, s, 0);
            
            const diffMs = targetTime.getTime() - currentTime.getTime();
            
            // If the deadline is in the future, but within 12 hours
            if (diffMs > 0 && diffMs < 12 * 60 * 60 * 1000) {
              if (diffMs < minDiffMs) {
                minDiffMs = diffMs;
                nearestPlan = { ...plan, diffMs, targetTime };
              }
            }
          });
          
          if (!nearestPlan) return null;
          
          const hoursLeft = Math.floor(nearestPlan.diffMs / (1000 * 60 * 60));
          const minsLeft = Math.floor((nearestPlan.diffMs % (1000 * 60 * 60)) / (1000 * 60));
          
          const isUrgent = hoursLeft < 2;
          
          return (
            <View style={{ backgroundColor: isUrgent ? '#FEF2F2' : '#F0FDF4', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: isUrgent ? '#FCA5A5' : '#86EFAC', flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 28, marginRight: 12 }}>{isUrgent ? '🔥' : '⏱️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: isUrgent ? '#DC2626' : '#16A34A', textTransform: 'uppercase' }}>Next Dispatch: {nearestPlan.diet_type} {nearestPlan.slot_name}</Text>
                <Text style={{ fontSize: 20, fontWeight: '900', color: isUrgent ? '#991B1B' : '#14532D', marginTop: 2 }}>
                  {hoursLeft > 0 ? \`\${hoursLeft}h \` : ''}{minsLeft}m remaining
                </Text>
                <Text style={{ fontSize: 13, color: isUrgent ? '#B91C1C' : '#15803D', marginTop: 2 }}>Target: {nearestPlan.targetTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
              </View>
            </View>
          );
        })()}
        
        <View style={styles.dashboardHeader}>`;
code = code.replace(oldHeader, newHeader);

fs.writeFileSync(path, code);
