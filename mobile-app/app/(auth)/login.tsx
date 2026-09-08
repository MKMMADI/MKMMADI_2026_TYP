import { useRouter } from 'expo-router';
import LoginScreen from '../../src/screens/LoginScreen';
import { useAuth } from '../../src/auth/AuthProvider';
import { User } from '../../src/types';

export default function LoginRoute() {
  const router = useRouter();
  const { authenticate } = useAuth();

  return (
    <LoginScreen
      onLogin={(user) => {
        authenticate(user as User);
        router.replace('/');
      }}
      onNavigateToRegister={() => router.push('/register')}
    />
  );
}
