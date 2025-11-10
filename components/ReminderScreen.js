import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export default function ReminderScreen() {
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    fetchExpiringProducts();
  }, []);

  const fetchExpiringProducts = async () => {
    try {
      const ref = collection(db, `users/${auth.currentUser?.uid}/products`);
      const snapshot = await getDocs(ref);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const expiringSoon = items.filter(p => p.daysLeft <= 7);
      const sorted = expiringSoon.sort((a, b) => a.daysLeft - b.daysLeft);
      setReminders(sorted);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const getStatusColor = (daysLeft) => {
    if (daysLeft < 0) return '#ff4d4d';
    if (daysLeft <= 3) return '#ff9900';
    return '#ffcc00';
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, { borderLeftColor: getStatusColor(item.daysLeft) }]}>
      <Text style={styles.name}>{item.productName || 'Unnamed Product'}</Text>
      <Text>Barcode: {item.barcode}</Text>
      <Text>Expiry Date: {item.expiryDate}</Text>
      <Text>Days Left: {item.daysLeft}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upcoming Expiry Reminders</Text>
      {reminders.length === 0 ? (
        <Text style={styles.empty}>No items expiring soon 🎉</Text>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={item => item.id}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  empty: { fontSize: 16, textAlign: 'center', marginTop: 20 },
  card: {
    padding: 15,
    backgroundColor: '#fffbe6',
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 8,
  },
  name: { fontSize: 18, fontWeight: '600' },
});
