import { useRouter } from 'expo-router';
import RegisterScreen from '../../src/screens/RegisterScreen';
import { useAuth } from '../../src/auth/AuthProvider';
import { User } from '../../src/types';

export default function RegisterRoute() {
  const router = useRouter();
  const { authenticate } = useAuth();

  return (
    <RegisterScreen
      onRegister={(user) => {
        authenticate(user as User);
        router.replace('/');
      }}
      onNavigateToLogin={() => router.replace('/login')}
    />
  );
}
