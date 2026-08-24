import { useEffect, useState } from 'react';
import { View, Text, FlatList, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabaseClient';

// Tell the OS how to handle alerts when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    // 1. Request OS permission for alarms
    async function requestPermissions() {
      if (Platform.OS !== 'web') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          alert('Failed to get notification token for alarms!');
        }
      }
    }
    requestPermissions();

    // 2. Listen to Supabase for new rows
    const subscription = supabase
      .channel('public:predictions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'predictions' },
        (payload) => {
          const newPet = payload.new;
          setPredictions((current) => [newPet, ...current]);
          scheduleDeviceAlarm(newPet.pet_name, newPet.pht_time);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  // 3. Schedule the OS Alarm
  async function scheduleDeviceAlarm(petName, phtTime) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🥚 Pet Prediction Update!",
        body: `${petName} is scheduled for ${phtTime}.`,
        sound: true, 
      },
      // Note: Setting trigger to 'null' fires it immediately for testing.
      trigger: null, 
    });
  }

  return (
    <View style={{ flex: 1, padding: 40, backgroundColor: '#0f172a' }}>
      <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>Active Alarms</Text>
      <FlatList
        data={predictions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#1e293b', padding: 15, marginVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: 'white', fontSize: 18 }}>{item.pet_name}</Text>
            <Text style={{ color: '#94a3b8' }}>{item.pht_time}</Text>
          </View>
        )}
      />
    </View>
  );
}

