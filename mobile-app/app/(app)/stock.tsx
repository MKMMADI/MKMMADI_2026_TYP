import { useRouter } from 'expo-router';
import { ClerkStockScreen } from '../../src/screens/ClerkStockScreen';

export default function StockRoute() {
  const router = useRouter();
  return <ClerkStockScreen onBack={() => router.back()} />;
}
