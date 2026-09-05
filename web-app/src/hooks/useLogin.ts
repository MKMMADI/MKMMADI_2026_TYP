import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, login } from "@/lib/auth";

export function useLogin(remember: boolean) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(email: string, password: string) {
    setError(null);
    setSubmitting(true);

    try {
      const tokens = await login(email.trim(), password);
      const storage = remember ? localStorage : sessionStorage;

      storage.setItem("accessToken", tokens.accessToken);
      storage.setItem("refreshToken", tokens.refreshToken);

      const user = await getCurrentUser(tokens.accessToken);
      const destination =
        user.role === "MANAGER"
          ? "/manager/dashboard"
          : user.role === "CLERK"
            ? "/operations"
            : "/dashboard";

      navigate(destination, { replace: true });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "We couldn't sign you in. Check your details and try again.";
      setError(message);
      throw caughtError;
    } finally {
      setSubmitting(false);
    }
  }

  return { signIn, submitting, error, setError };
}