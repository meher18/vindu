const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu-partners/src/app/(vendor)/ledger.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  `import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';`,
  `import { View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';`
);

const modalOld = `<Modal visible={upiModal} animationType="slide" presentationStyle="formSheet">
        <View style={{ flex: 1, backgroundColor: '#FFF', padding: 24, paddingTop: 40 }}>`;
const modalNew = `<Modal visible={upiModal} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: '#FFF', padding: 24, paddingTop: 40 }}>`;
code = code.replace(modalOld, modalNew);

const modalEndOld = `          </TouchableOpacity>
        </View>
      </Modal>`;
const modalEndNew = `          </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>`;
code = code.replace(modalEndOld, modalEndNew);

fs.writeFileSync(path, code);
