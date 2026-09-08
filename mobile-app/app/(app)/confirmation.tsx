import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookingConfirmationScreen } from '../../src/screens/BookingConfirmationScreen';

export default function ConfirmationRoute() {
  const { booking: bookingParam } = useLocalSearchParams<{ booking: string }>();
  const router = useRouter();
  const rawBooking = Array.isArray(bookingParam) ? bookingParam[0] : bookingParam;
  if (!rawBooking) return null;

  return (
    <BookingConfirmationScreen
      booking={JSON.parse(rawBooking)}
      onBackHome={() => router.replace('/')}
    />
  );
}
