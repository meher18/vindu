const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/plans.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add slotTargetTime state
const oldState = `  const [slotName, setSlotName] = useState<SlotType>('lunch');`;
const newState = `  const [slotName, setSlotName] = useState<SlotType>('lunch');
  const [slotTargetTime, setSlotTargetTime] = useState<string>('13:00:00');`;
code = code.replace(oldState, newState);

// 2. Add dynamic time options map
const timeMapCode = `
const TIME_OPTIONS: Record<SlotType, { label: string, value: string }[]> = {
  breakfast: [
    { label: '8:00 AM', value: '08:00:00' },
    { label: '8:30 AM', value: '08:30:00' },
    { label: '9:00 AM', value: '09:00:00' },
    { label: '9:30 AM', value: '09:30:00' }
  ],
  lunch: [
    { label: '12:00 PM', value: '12:00:00' },
    { label: '12:30 PM', value: '12:30:00' },
    { label: '1:00 PM', value: '13:00:00' },
    { label: '1:30 PM', value: '13:30:00' }
  ],
  dinner: [
    { label: '7:30 PM', value: '19:30:00' },
    { label: '8:00 PM', value: '20:00:00' },
    { label: '8:30 PM', value: '20:30:00' },
    { label: '9:00 PM', value: '21:00:00' }
  ]
};
`;

code = code.replace('const SLOT_OPTIONS', timeMapCode + '\nconst SLOT_OPTIONS');

// 3. Update the mutation to use slotTargetTime
const oldMut = `        slot_target_time: slotObj.defaultTime,`;
const newMut = `        slot_target_time: slotTargetTime,`;
code = code.replace(oldMut, newMut);

// 4. Update the UI to render the Time Picker
const oldUI = `          <View style={styles.chipRow}>
            {SLOT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={[styles.chip, slotName === opt.value && styles.chipActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSlotName(opt.value); }}>
                <Text>{opt.emoji}</Text>
                <Text style={[styles.chipText, slotName === opt.value && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>`;

const newUI = `          <View style={styles.chipRow}>
            {SLOT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.value} style={[styles.chip, slotName === opt.value && styles.chipActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSlotName(opt.value); setSlotTargetTime(TIME_OPTIONS[opt.value][1].value); }}>
                <Text>{opt.emoji}</Text>
                <Text style={[styles.chipText, slotName === opt.value && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Target Delivery Time</Text>
          <View style={styles.chipRow}>
            {TIME_OPTIONS[slotName].map(opt => (
              <TouchableOpacity key={opt.value} style={[styles.chip, slotTargetTime === opt.value && styles.chipActive]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSlotTargetTime(opt.value); }}>
                <Text style={[styles.chipText, slotTargetTime === opt.value && styles.chipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>`;

code = code.replace(oldUI, newUI);
fs.writeFileSync(path, code);
