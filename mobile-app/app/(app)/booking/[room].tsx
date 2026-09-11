import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { BookingScreen } from '../../../src/screens/BookingScreen';
import api from '../../../src/api';
import { Room } from '../../../src/types';

export default function BookingRoute() {
  const { room: roomParam } = useLocalSearchParams<{ room: string }>();
  const router = useRouter();
  const rawRoom = Array.isArray(roomParam) ? roomParam[0] : roomParam;
  if (!rawRoom) return null;

  let room: Room;
  try {
    room = JSON.parse(rawRoom) as Room;
  } catch {
    return null;
  }

  return (
    <BookingScreen
      room={room}
      onBack={() => router.back()}
      onConfirm={async (payload) => {
        try {
          const booking = await api.createBooking(payload);
          router.push({
            pathname: '/confirmation',
            params: { booking: JSON.stringify(booking) },
          });
        } catch (err: any) {
          Alert.alert(
            'Booking failed',
            err?.message || 'Could not create booking. Check times and try again.'
          );
          throw err;
        }
      }}
    />
  );
}
