import { Navigate, Route, Routes } from "react-router-dom";
import Login from "@/pages/auth/Login";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import CheckEmail from "@/pages/auth/CheckEmail";
import ResetPassword from "@/pages/auth/ResetPassword";
import ResetSuccess from "@/pages/auth/ResetSuccess";
import ClerkDashboard from "@/pages/dashboards/ClerkDashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/check-email" element={<CheckEmail />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/reset-success" element={<ResetSuccess />} />

      <Route path="/dashboard" element={<div>Employee dashboard</div>} />
      <Route path="/operations/dashboard" element={<ClerkDashboard />} />
      <Route path="/manager/dashboard" element={<div>Manager dashboard</div>} />


    </Routes>
  );
}

export default App;
