import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookingScreen } from '../../../src/screens/BookingScreen';
import api from '../../../src/api';
import { Room } from '../../../src/types';

export default function BookingRoute() {
  const { room: roomParam } = useLocalSearchParams<{ room: string }>();
  const router = useRouter();
  const rawRoom = Array.isArray(roomParam) ? roomParam[0] : roomParam;
  if (!rawRoom) return null;
  const room = JSON.parse(rawRoom) as Room;

  return (
    <BookingScreen
      room={room}
      onBack={() => router.back()}
      onConfirm={async (payload) => {
        const booking = await api.createBooking(payload);
        router.push({ pathname: '/confirmation', params: { booking: JSON.stringify(booking) } });
      }}
    />
  );
}
