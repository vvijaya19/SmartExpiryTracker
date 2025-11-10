import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './components/LoginScreen';
import SignupScreen from './components/SignupScreen';
import SmartScanScreen from './components/SmartScanScreen';
import ProductDashboardScreen from './components/ProductDashboardScreen';
import ManualEntryScreen from './components/ManualEntryScreen';
import ReminderScreen from './components/ReminderScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Scan" component={SmartScanScreen} />
        <Stack.Screen name="Dashboard" component={ProductDashboardScreen} />
        <Stack.Screen name="ManualEntry" component={ManualEntryScreen} />
        <Stack.Screen name="Reminders" component={ReminderScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

