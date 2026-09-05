const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/index.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add phone state
const oldState = `  const [radius, setRadius] = useState('');`;
const newState = `  const [radius, setRadius] = useState('');
  const [phone, setPhone] = useState('');`;
code = code.replace(oldState, newState);

// 2. Update mutation
const oldMut = `    mutationFn: async () => {
      if (!name || !address || !fssai || !radius) throw new Error("Please fill all fields");
      const radiusInt = parseInt(radius);
      if (isNaN(radiusInt) || radiusInt <= 0) throw new Error("Delivery radius must be a positive number");
      
      const { data, error } = await supabase.from('kitchens').insert([{ 
        vendor_id: user?.id, name, address, fssai_number: fssai, delivery_radius_km: radiusInt 
      }]).select().single();
      if (error) throw error;
      return data;
    },`;

const newMut = `    mutationFn: async () => {
      if (!name || !address || !fssai || !radius || !phone) throw new Error("Please fill all fields");
      const radiusInt = parseInt(radius);
      if (isNaN(radiusInt) || radiusInt <= 0) throw new Error("Delivery radius must be a positive number");
      if (phone.length < 10) throw new Error("Please enter a valid 10-digit phone number");
      
      // Update the vendor's profile with their dispatch contact number
      const { error: pErr } = await supabase.from('profiles').update({ phone }).eq('id', user?.id);
      if (pErr) throw pErr;

      const { data, error } = await supabase.from('kitchens').insert([{ 
        vendor_id: user?.id, name, address, fssai_number: fssai, delivery_radius_km: radiusInt 
      }]).select().single();
      if (error) throw error;
      return data;
    },`;
code = code.replace(oldMut, newMut);

// 3. Update UI
const oldUI = `            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kitchen Name</Text>`;

const newUI = `            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dispatch Phone Number</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="10-digit mobile number" placeholderTextColor="#98A2B3" keyboardType="phone-pad" maxLength={15} />
              <Text style={styles.helpText}>Drivers will call this number if they cannot find your kitchen.</Text>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kitchen Name</Text>`;
code = code.replace(oldUI, newUI);

fs.writeFileSync(path, code);
