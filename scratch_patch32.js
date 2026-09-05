const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/index.tsx';
let code = fs.readFileSync(path, 'utf8');

// Import KeyboardAvoidingView and Platform
code = code.replace(
  `import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Modal, Alert } from 'react-native';`,
  `import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';`
);

// Wrap Onboarding Form
const obOld = `<SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>`;
const obNew = `<SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container}>`;
code = code.replace(obOld, obNew);

const obEndOld = `        </ScrollView>
      </SafeAreaView>
    );
  }`;
const obEndNew = `          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }`;
code = code.replace(obEndOld, obEndNew);

// Wrap Holiday Modal
const hModalOld = `<Modal visible={holidayModal} animationType="slide" presentationStyle="formSheet">
        <View style={{ flex: 1, backgroundColor: '#FFF', padding: 24, paddingTop: 40 }}>`;
const hModalNew = `<Modal visible={holidayModal} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: '#FFF', padding: 24, paddingTop: 40 }}>`;
code = code.replace(hModalOld, hModalNew);

const hModalEndOld = `          </TouchableOpacity>
        </View>
      </Modal>`;
const hModalEndNew = `          </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>`;
code = code.replace(hModalEndOld, hModalEndNew);

fs.writeFileSync(path, code);
