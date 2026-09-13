import { useRouter } from 'expo-router';
import { EmployeeProfileScreen } from '../../src/screens/EmployeeProfileScreen';
import { useAuth } from '../../src/auth/AuthProvider';

export default function ProfileRoute() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  if (!user) return null;

  const isClerk = user.role === 'CLERK';

  return (
    <EmployeeProfileScreen
      user={user}
      onBack={() => router.back()}
      onOpenHistory={() => {
        if (isClerk) router.push('/');
        else router.push('/history');
      }}
      onLogout={async () => {
        await signOut();
        router.replace('/login');
      }}
    />
  );
}
