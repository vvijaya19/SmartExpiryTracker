import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { differenceInDays } from 'date-fns';

export default function ManualEntryScreen() {
  const [productName, setProductName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [expiryDate, setExpiryDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const navigation = useNavigation();

  const handleSave = async () => {
    if (!productName || !barcode || !expiryDate) {
      Alert.alert('Missing Info', 'Please fill in all fields');
      return;
    }

    try {
      const daysLeft = differenceInDays(expiryDate, new Date());
      const ref = doc(db, `users/${auth.currentUser?.uid}/products/${barcode}`);
      await setDoc(ref, {
        productName,
        barcode,
        expiryDate: expiryDate.toISOString(),
        daysLeft,
        type: 'Manual',
        addedAt: new Date().toISOString(),
        notified: false,
      });

      Alert.alert('Saved', 'Product added successfully');
      navigation.navigate('Dashboard');
    } catch (error) {
      console.error('Error saving manual product:', error);
      Alert.alert('Error', 'Could not save product');
    }
  };

  const onChangeDate = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) setExpiryDate(selectedDate);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Product Manually</Text>

      <TextInput
        placeholder="Product Name"
        value={productName}
        onChangeText={setProductName}
        style={styles.input}
      />

      <TextInput
        placeholder="Barcode"
        value={barcode}
        onChangeText={setBarcode}
        style={styles.input}
      />

      <View style={styles.dateRow}>
        <Text style={styles.label}>Expiry Date:</Text>
        <Button title={expiryDate.toDateString()} onPress={() => setShowPicker(true)} />
      </View>

      {showPicker && (
        <DateTimePicker
          value={expiryDate}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}

      <Button title="Save Product" onPress={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    justifyContent: 'space-between',
  },
  label: { fontSize: 16 },
});
