import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, Button, Alert, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import { parseISO, isAfter, isBefore } from 'date-fns';

export default function ProductDashboardScreen() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [sortBy, setSortBy] = useState('expiry');
  const [editingId, setEditingId] = useState(null);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [products, filterType, searchQuery, startDate, endDate, sortBy]);

  const fetchProducts = async () => {
    try {
      const ref = collection(db, `users/${auth.currentUser?.uid}/products`);
      const snapshot = await getDocs(ref);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const applyFilters = () => {
    let result = [...products];

    if (filterType === 'soon') {
      result = result.filter(p => p.daysLeft <= 7 && p.daysLeft >= 0);
    } else if (filterType === 'expired') {
      result = result.filter(p => p.daysLeft < 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.productName || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      );
    }

    if (startDate || endDate) {
      result = result.filter(p => {
        const expiry = parseISO(p.expiryDate);
        const afterStart = startDate ? isAfter(expiry, startDate) || expiry.toDateString() === startDate.toDateString() : true;
        const beforeEnd = endDate ? isBefore(expiry, endDate) || expiry.toDateString() === endDate.toDateString() : true;
        return afterStart && beforeEnd;
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'name') return (a.productName || '').localeCompare(b.productName || '');
      if (sortBy === 'barcode') return (a.barcode || '').localeCompare(b.barcode || '');
      return new Date(a.expiryDate) - new Date(b.expiryDate);
    });

    setFiltered(result);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setStartDate(null);
    setEndDate(null);
    setSortBy('expiry');
  };

  const getStatusColor = (daysLeft) => {
    if (daysLeft < 0) return '#ff4d4d';
    if (daysLeft <= 7) return '#ffcc00';
    return '#66cc66';
  };

  const exportToCSV = async () => {
    if (filtered.length === 0) {
      Alert.alert('No data', 'There are no products in the selected range.');
      return;
    }

    const header = 'Product Name,Barcode,Expiry Date,Days Left\n';
    const rows = filtered.map(p =>
      `"${p.productName || ''}","${p.barcode}","${p.expiryDate}","${p.daysLeft}"`
    );
    const csv = header + rows.join('\n');

    const fileUri = FileSystem.documentDirectory + 'filtered_expiry_data.csv';
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

    try {
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      console.error('Sharing failed:', error);
      Alert.alert('Error', 'Could not share the file.');
    }
  };

  const handleSaveName = async (item) => {
    try {
      const ref = doc(db, `users/${auth.currentUser?.uid}/products/${item.id}`);
      await updateDoc(ref, { productName: editedName });
      setEditingId(null);
      fetchProducts();
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  const handleDelete = async (item) => {
    Alert.alert('Confirm Delete', `Delete ${item.productName || 'this product'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const ref = doc(db, `users/${auth.currentUser?.uid}/products/${item.id}`);
            await deleteDoc(ref);
            fetchProducts();
          } catch (error) {
            console.error('Error deleting product:', error);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { borderLeftColor: getStatusColor(item.daysLeft) }]}>
      {editingId === item.id ? (
        <>
          <TextInput
            value={editedName}
            onChangeText={setEditedName}
            style={styles.input}
            placeholder="Enter product name"
          />
          <Button title="Save" onPress={() => handleSaveName(item)} />
        </>
      ) : (
        <>
          <Text style={styles.name} onPress={() => {
            setEditingId(item.id);
            setEditedName(item.productName || '');
          }}>
            {item.productName || 'Unnamed Product'} (tap to edit)
          </Text>
          <Text>Barcode: {item.barcode}</Text>
          <Text>Expiry Date: {item.expiryDate}</Text>
          <Text>Days Left: {item.daysLeft}</Text>
          <Button title="Delete" color="#cc0000" onPress={() => handleDelete(item)} />
        </>
      )}
    </View>
  );

  const total = filtered.length;
  const expired = filtered.filter(p => p.daysLeft < 0).length;
  const soon = filtered.filter(p => p.daysLeft >= 0 && p.daysLeft <= 7).length;
  const active = filtered.filter(p => p.daysLeft > 7).length;
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tracked Products</Text>

      <TextInput
        placeholder="Search by name or barcode"
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.search}
      />

      <View style={styles.filterRow}>
        <Button title="All" onPress={() => setFilterType('all')} />
        <Button title="Expiring Soon" onPress={() => setFilterType('soon')} />
        <Button title="Expired" onPress={() => setFilterType('expired')} />
      </View>

      <View style={styles.dateRow}>
        <Button
          title={`Start: ${startDate ? startDate.toDateString() : 'Select'}`}
          onPress={() => setShowStartPicker(true)}
        />
        <Button
          title={`End: ${endDate ? endDate.toDateString() : 'Select'}`}
          onPress={() => setShowEndPicker(true)}
        />
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(e, date) => {
            setShowStartPicker(false);
            if (date) setStartDate(date);
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={(e, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(date);
          }}
        />
      )}

      <View style={styles.sortRow}>
        <Text style={styles.label}>Sort by:</Text>
        <Picker
          selectedValue={sortBy}
          style={styles.picker}
          onValueChange={(value) => setSortBy(value)}
        >
          <Picker.Item label="Expiry Date" value="expiry" />
          <Picker.Item label="Product Name" value="name" />
          <Picker.Item label="Barcode" value="barcode" />
        </Picker>
      </View>

      <Button title="Reset Filters" onPress={resetFilters} />
      <Button title="Export Filtered to CSV" onPress={exportToCSV} />

      <View style={styles.stats}>
        <Text>Total: {total}</Text>
        <Text>Expired: {expired}</Text>
        <Text>Expiring Soon: {soon}</Text>
        <Text>Active: {active}</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  search: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginBottom: 10,
    borderRadius: 6,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: { marginRight: 10 },
  picker: { flex: 1, height: 40 },
  stats: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#eef',
    borderRadius: 6,
  },
  card: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 8,
    marginBottom: 8,
    borderRadius: 6,
  },
});
