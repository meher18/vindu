const fs = require('fs');

const protectScreen = (filePath) => {
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Find where the main return statement starts
  const returnIndex = code.indexOf('return (\\n    <SafeAreaView');
  if (returnIndex === -1) {
    const backupIndex = code.indexOf('return (\\n    <View');
    if (backupIndex === -1) return;
  }
  
  const injectShield = `
  if (!kitchen) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🏪</Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 }}>Kitchen Required</Text>
        <Text style={{ fontSize: 15, color: '#6B7280', textAlign: 'center', paddingHorizontal: 40 }}>
          Please complete your kitchen setup on the Home dashboard before accessing this screen.
        </Text>
      </SafeAreaView>
    );
  }

  return (`;
  
  code = code.replace(/return \(\s*<SafeAreaView/g, injectShield.replace('return (', 'return (<SafeAreaView'));
  
  fs.writeFileSync(filePath, code);
};

protectScreen('/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/menu.tsx');
protectScreen('/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/plans.tsx');
protectScreen('/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/dispatch.tsx');
protectScreen('/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/ledger.tsx');
