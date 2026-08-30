import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  SafeAreaView, Image, ScrollView
} from 'react-native';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    if (isSignUp) {
      const { data: { session }, error } = await supabase.auth.signUp({ email, password });
      if (error) Alert.alert('Sign Up Failed', error.message);
      else if (!session) Alert.alert('Verify Email', 'Check your inbox to confirm your account.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) Alert.alert('Login Failed', error.message);
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Hero Section */}
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <Text style={styles.logoEmoji}>🍱</Text>
            </View>
            <Text style={styles.logoText}>vindu</Text>
            <Text style={styles.tagline}>Home-cooked meals,{'\n'}delivered daily to your door.</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
            <Text style={styles.cardSub}>{isSignUp ? 'Start your tiffin journey today.' : 'Sign in to manage your subscriptions.'}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleAuth}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchWrap} onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.switchText}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={styles.switchLink}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF7F0' },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },

  hero: { alignItems: 'center', marginBottom: 40 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#FF6B35', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, shadowColor: '#FF6B35', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8
  },
  logoEmoji: { fontSize: 40 },
  logoText: { fontSize: 36, fontWeight: '900', color: '#1A1A2E', letterSpacing: -1 },
  tagline: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 24 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 28, padding: 28,
    shadowColor: '#1A1A2E', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 5
  },
  cardTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', marginBottom: 6 },
  cardSub: { fontSize: 15, color: '#6B7280', marginBottom: 28, lineHeight: 22 },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, letterSpacing: 0.3 },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#1A1A2E'
  },

  primaryBtn: {
    backgroundColor: '#FF6B35', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#FF6B35', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4
  },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.65 },

  switchWrap: { marginTop: 20, alignItems: 'center' },
  switchText: { fontSize: 14, color: '#6B7280' },
  switchLink: { color: '#FF6B35', fontWeight: '700' },

  footer: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 28, lineHeight: 18 },
});
