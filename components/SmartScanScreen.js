import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Image } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { addMonths, differenceInDays, parseISO } from 'date-fns';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { signOut } from 'firebase/auth';

export default function SmartScanScreen() {
  const [scanned, setScanned] = useState(false);
  const [barcodeData, setBarcodeData] = useState(null);
  const [expiryInfo, setExpiryInfo] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    registerForPushNotificationsAsync();
    checkDailyReminders(); // 🔔 Daily reminder check
  }, []);

  const handleScan = ({ data }) => {
    setScanned(true);
    setBarcodeData(data);
    const gs1 = parseGS1(data);
    if (gs1?.expiryDate) {
      const daysLeft = differenceInDays(new Date(gs1.expiryDate), new Date());
      const info = { type: 'GS1', expiryDate: gs1.expiryDate, daysLeft };
      setExpiryInfo(info);
      saveProduct(auth.currentUser?.uid, { barcode: data, ...info });
      notifyIfExpiringSoon(info);
    } else {
      pickImageForOCR();
    }
  };

  const parseGS1 = (data) => {
    const match = data.match(/\(17\)(\d{6})/);
    if (match) {
      const raw = match[1];
      const expiryDate = `20${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4, 6)}`;
      return { expiryDate };
    }
    return null;
  };

  const pickImageForOCR = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true });
    if (!result.cancelled) {
      setImageUri(result.uri);
      const ocrText = await runOCR(result.uri);
      const parsed = parseOCRText(ocrText);
      setExpiryInfo(parsed);
      if (parsed.expiryDate) {
        saveProduct(auth.currentUser?.uid, { barcode: barcodeData, ...parsed });
        notifyIfExpiringSoon(parsed);
      }
    }
  };

  const runOCR = async (imageUri) => {
    try {
      const result = await TextRecognition.recognize(imageUri);
      return result.text;
    } catch (error) {
      console.error('OCR error:', error);
      return '';
    }
  };

  const parseOCRText = (text) => {
    const mfgMatch = text.match(/MFG[:\s]*(\d{2}\/\d{2}\/\d{4})/);
    const durationMatch = text.match(/Best before (\d+)\s*months/);
    if (mfgMatch && durationMatch) {
      const mfgDate = parseISO(mfgMatch[1].split('/').reverse().join('-'));
      const expiryDate = addMonths(mfgDate, parseInt(durationMatch[1]));
      const daysLeft = differenceInDays(expiryDate, new Date());
      return { type: 'Calculated', expiryDate: expiryDate.toISOString(), daysLeft };
    }
    return { type: 'Manual', message: 'Please enter expiry manually' };
  };

  const saveProduct = async (userId, productData) => {
    if (!userId) return;
    try {
      const ref = doc(db, `users/${userId}/products/${productData.barcode}`);
      await setDoc(ref, {
        ...productData,
        addedAt: new Date().toISOString(),
        notified: false,
      });
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const notifyIfExpiringSoon = async (product) => {
    if (product.daysLeft <= 7) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Expiry Alert',
          body: `${product.productName || 'Item'} expires in ${product.daysLeft} days!`,
        },
        trigger: null,
      });
    }
  };

  const checkDailyReminders = async () => {
    try {
      const ref = collection(db, `users/${auth.currentUser?.uid}/products`);
      const snapshot = await getDocs(ref);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const expiringSoon = items.filter(p => p.daysLeft <= 7);
      if (expiringSoon.length > 0) {
        const next = expiringSoon.sort((a, b) => a.daysLeft - b.daysLeft)[0];
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Daily Reminder',
            body: `${next.productName || 'Item'} expires in ${next.daysLeft} days.`,
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error('Reminder check failed:', error);
    }
  };

  const registerForPushNotificationsAsync = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission for notifications not granted');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Product Barcode</Text>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleScan}
        style={styles.scanner}
      />
      {barcodeData && <Text style={styles.result}>Scanned: {barcodeData}</Text>}
      {expiryInfo && (
        <View style={styles.resultBox}>
          <Text>Expiry Type: {expiryInfo.type}</Text>
          <Text>Expiry Date: {expiryInfo.expiryDate}</Text>
          <Text>Days Left: {expiryInfo.daysLeft}</Text>
        </View>
      )}
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
      {scanned && <Button title="Scan Again" onPress={() => setScanned(false)} />}
      <Button title="View Dashboard" onPress={() => navigation.navigate('Dashboard')} />
      <Button title="View Reminders" onPress={() => navigation.navigate('Reminders')} />
      <Button title="Add Manually" onPress={() => navigation.navigate('ManualEntry')} />
      <Button title="Logout" onPress={() => {
        signOut(auth);
        navigation.replace('Login');
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, marginBottom: 10 },
  scanner: { height: 300, width: '100%' },
  result: { marginTop: 20, fontSize: 16 },
  resultBox: { marginTop: 20 },
  image: { marginTop: 10, height: 100, width: 100, borderRadius: 8 },
});
