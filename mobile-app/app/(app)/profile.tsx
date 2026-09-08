import { useRouter } from 'expo-router';
import { EmployeeProfileScreen } from '../../src/screens/EmployeeProfileScreen';
import { useAuth } from '../../src/auth/AuthProvider';

export default function ProfileRoute() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <EmployeeProfileScreen
      user={user}
      onBack={() => router.back()}
      onOpenHistory={() => router.push('/history')}
      onLogout={async () => {
        await signOut();
        router.replace('/login');
      }}
    />
  );
}
