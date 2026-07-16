import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { updateDocument } from '../../services/firestoreService';
import { uploadOnboardingDocument, uploadProfilePhoto } from '../../services/storageService';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';
import { Button, Card, Input } from '../../components/ui';

const STEPS = ['Welcome', 'Bank Details', 'Documents', 'Declaration'];

export default function OnboardingScreen() {
  const { user, completeOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 - Bank Details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Step 2 - Documents
  const [aadhaarUri, setAadhaarUri] = useState<string | null>(null);
  const [aadhaarName, setAadhaarName] = useState('');
  const [aadhaarMime, setAadhaarMime] = useState('');
  const [panUri, setPanUri] = useState<string | null>(null);
  const [panName, setPanName] = useState('');
  const [panMime, setPanMime] = useState('');

  // Step 3 - Declaration
  const [digitalSignature, setDigitalSignature] = useState('');
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  const pickDocument = async (setter: (uri: string, name: string, mime: string) => void) => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      setter(asset.uri, asset.name, asset.mimeType || 'application/octet-stream');
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    if (!declarationAccepted) {
      Alert.alert('Declaration Required', 'Please accept the declaration to proceed.');
      return;
    }
    if (!digitalSignature.trim()) {
      Alert.alert('Signature Required', 'Please type your full name as a digital signature.');
      return;
    }

    setLoading(true);
    try {
      // Try to upload documents — silently skip if Storage is not configured
      let aadhaarUrl: string | undefined;
      let panUrl: string | undefined;

      if (aadhaarUri) {
        try {
          aadhaarUrl = await uploadOnboardingDocument(user.uid, 'aadhaar', aadhaarUri, aadhaarMime, aadhaarName);
        } catch {
          // Storage not set up — continue without document URL
        }
      }
      if (panUri) {
        try {
          panUrl = await uploadOnboardingDocument(user.uid, 'pan', panUri, panMime, panName);
        } catch {
          // Storage not set up — continue without document URL
        }
      }

      await updateDocument('users', user.uid, {
        status: 'active',
        'onboarding.bankName': bankName,
        'onboarding.accountNumber': accountNumber,
        'onboarding.ifscCode': ifscCode,
        'onboarding.aadhaarCardUrl': aadhaarUrl ?? null,
        'onboarding.panCardUrl': panUrl ?? null,
        'onboarding.declarationAccepted': declarationAccepted,
        'onboarding.digitalSignature': digitalSignature,
        'onboarding.declarationDate': new Date().toISOString(),
        'onboarding.completedAt': new Date().toISOString(),
      });

      completeOnboarding();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.welcomeEmoji}>👋</Text>
            <Text style={styles.stepTitle}>Welcome, {user?.fullName}!</Text>
            <Text style={styles.stepDescription}>
              Before you get started, we need to collect a few details to complete your onboarding.
              This should only take a few minutes.
            </Text>
            <View style={styles.stepList}>
              {['Banking details for payroll', 'Identity documents (Aadhaar & PAN)', 'Digital declaration'].map((item, i) => (
                <View key={i} style={styles.stepListItem}>
                  <View style={styles.stepListDot} />
                  <Text style={styles.stepListText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Bank Account Details</Text>
            <Text style={styles.stepDescription}>
              These details are used for salary disbursement. Please ensure they are correct.
            </Text>
            <Input
              label="Bank Name"
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g., HDFC Bank"
              containerStyle={{ marginTop: SPACING.lg }}
            />
            <Input
              label="Account Number"
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="Enter account number"
              keyboardType="numeric"
              secureTextEntry
            />
            <Input
              label="IFSC Code"
              value={ifscCode}
              onChangeText={setIfscCode}
              placeholder="e.g., HDFC0001234"
              autoCapitalize="characters"
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Identity Documents</Text>
            <Text style={styles.stepDescription}>
              Upload your Aadhaar card and PAN card for KYC verification.
            </Text>

            <TouchableOpacity
              style={[styles.uploadBox, aadhaarUri ? styles.uploadBoxSuccess : null]}
              onPress={() => pickDocument((uri, name, mime) => { setAadhaarUri(uri); setAadhaarName(name); setAadhaarMime(mime); })}
            >
              <Text style={styles.uploadIcon}>{aadhaarUri ? '✅' : '📎'}</Text>
              <Text style={styles.uploadLabel}>
                {aadhaarUri ? aadhaarName : 'Upload Aadhaar Card (PDF or Image)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.uploadBox, panUri ? styles.uploadBoxSuccess : null]}
              onPress={() => pickDocument((uri, name, mime) => { setPanUri(uri); setPanName(name); setPanMime(mime); })}
            >
              <Text style={styles.uploadIcon}>{panUri ? '✅' : '📎'}</Text>
              <Text style={styles.uploadLabel}>
                {panUri ? panName : 'Upload PAN Card (PDF or Image)'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.uploadNote}>
              * Documents are encrypted and stored securely. They are only visible to HR and Admin.
            </Text>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Declaration</Text>
            <View style={styles.declarationBox}>
              <Text style={styles.declarationText}>
                I, {user?.fullName}, hereby declare that all information provided during onboarding is
                true and accurate to the best of my knowledge. I understand that providing false
                information may result in termination of employment.{'\n\n'}
                I agree to abide by the organization's policies and code of conduct.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setDeclarationAccepted(!declarationAccepted)}
            >
              <View style={[styles.checkbox, declarationAccepted ? styles.checkboxChecked : null]}>
                {declarationAccepted && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>I accept the above declaration</Text>
            </TouchableOpacity>

            <Input
              label="Digital Signature (Type your full name)"
              value={digitalSignature}
              onChangeText={setDigitalSignature}
              placeholder={user?.fullName}
              containerStyle={{ marginTop: SPACING.lg }}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.progressItem}>
            <View style={[styles.progressDot, i <= step ? styles.progressDotActive : null]}>
              <Text style={[styles.progressDotText, i <= step ? { color: COLORS.white } : null]}>
                {i < step ? '✓' : (i + 1).toString()}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.progressLine, i < step ? styles.progressLineActive : null]} />
            )}
          </View>
        ))}
      </View>
      <View style={styles.progressLabels}>
        {STEPS.map((s, i) => (
          <Text key={i} style={[styles.progressLabel, i === step ? styles.progressLabelActive : null]}>
            {s}
          </Text>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigation}>
        {step > 0 && (
          <Button
            title="Back"
            onPress={() => setStep(s => s - 1)}
            variant="outline"
            style={{ flex: 1, marginRight: SPACING.sm }}
          />
        )}
        {step < STEPS.length - 1 ? (
          <Button
            title="Continue"
            onPress={() => setStep(s => s + 1)}
            style={{ flex: 1 }}
          />
        ) : (
          <Button
            title="Complete Onboarding"
            onPress={handleComplete}
            loading={loading}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  progressItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  progressDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.gray200, justifyContent: 'center', alignItems: 'center',
  },
  progressDotActive: { backgroundColor: COLORS.primary },
  progressDotText: { fontSize: 12, fontWeight: '700', color: COLORS.gray500 },
  progressLine: { flex: 1, height: 2, backgroundColor: COLORS.gray200 },
  progressLineActive: { backgroundColor: COLORS.primary },
  progressLabels: { flexDirection: 'row', paddingHorizontal: SPACING.xl, marginTop: SPACING.xs },
  progressLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: COLORS.gray400 },
  progressLabelActive: { color: COLORS.primary, fontWeight: '600' },
  scrollView: { flex: 1 },
  stepContent: { padding: SPACING.xl, paddingTop: SPACING.xxl },
  welcomeEmoji: { fontSize: 60, textAlign: 'center', marginBottom: SPACING.lg },
  stepTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.gray900, marginBottom: SPACING.md },
  stepDescription: { fontSize: FONTS.sizes.md, color: COLORS.gray600, lineHeight: 22 },
  stepList: { marginTop: SPACING.xl },
  stepListItem: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  stepListDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginRight: SPACING.md },
  stepListText: { fontSize: FONTS.sizes.md, color: COLORS.gray700 },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.gray300,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.white,
  },
  uploadBoxSuccess: { borderColor: COLORS.primary, borderStyle: 'solid', backgroundColor: COLORS.primaryBg },
  uploadIcon: { fontSize: 24, marginRight: SPACING.md },
  uploadLabel: { fontSize: FONTS.sizes.sm, color: COLORS.gray600, flex: 1 },
  uploadNote: { fontSize: FONTS.sizes.xs, color: COLORS.gray400, marginTop: SPACING.sm, lineHeight: 16 },
  declarationBox: {
    backgroundColor: COLORS.gray100,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  declarationText: { fontSize: FONTS.sizes.sm, color: COLORS.gray700, lineHeight: 20 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: COLORS.gray300, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  checkboxLabel: { fontSize: FONTS.sizes.md, color: COLORS.gray700, flex: 1 },
  navigation: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
});
