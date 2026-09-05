import { useRouter } from 'expo-router';
import { HomeScreen } from '../../src/screens/HomeScreen';
import { Room } from '../../src/types';

export default function HomeRoute() {
  const router = useRouter();

  return (
    <HomeScreen
      onOpenRoom={(room: Room) => router.push({ pathname: '/room/[room]', params: { room: JSON.stringify(room) } })}
      onOpenProfile={() => router.push('/profile')}
      onOpenHistory={() => router.push('/history')}
    />
  );
}
