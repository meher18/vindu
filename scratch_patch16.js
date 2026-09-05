const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/index.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldQuery = `const { data } = await supabase.from('ratings').select('*').eq('kitchen_id', kitchen?.id).order('created_at', { ascending: false });`;
const newQuery = `const { data } = await supabase.from('ratings').select('*, profiles(full_name)').eq('kitchen_id', kitchen?.id).order('created_at', { ascending: false });`;
code = code.replace(oldQuery, newQuery);

const oldDisplay = `<Text style={styles.reviewAuthor}>Customer {r.customer_id.substring(0, 5)}</Text>`;
const newDisplay = `<Text style={styles.reviewAuthor}>{r.profiles?.full_name || 'Verified Customer'}</Text>`;
code = code.replace(oldDisplay, newDisplay);

fs.writeFileSync(path, code);
