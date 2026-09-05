import { useRouter } from 'expo-router';
import { BookingHistoryScreen } from '../../src/screens/BookingHistoryScreen';
import { MOCK_BOOKINGS } from '../../src/constants/mockData';

export default function HistoryRoute() {
  const router = useRouter();
  return <BookingHistoryScreen bookings={MOCK_BOOKINGS} onBack={() => router.back()} />;
}
