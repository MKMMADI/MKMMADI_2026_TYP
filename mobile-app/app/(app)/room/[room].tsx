import { useLocalSearchParams, useRouter } from 'expo-router';
import { RoomDetailScreen } from '../../../src/screens/RoomDetailScreen';
import { Room } from '../../../src/types';

export default function RoomRoute() {
  const { room: roomParam } = useLocalSearchParams<{ room: string }>();
  const router = useRouter();
  const rawRoom = Array.isArray(roomParam) ? roomParam[0] : roomParam;
  if (!rawRoom) return null;
  const room = JSON.parse(rawRoom) as Room;

  return (
    <RoomDetailScreen
      room={room}
      onBack={() => router.back()}
      onBook={() => router.push({ pathname: '/booking/[room]', params: { room: JSON.stringify(room) } })}
    />
  );
}
