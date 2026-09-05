import { Navigate, Route, Routes } from "react-router-dom";
import Login from "@/pages/auth/Login";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import CheckEmail from "@/pages/auth/CheckEmail";
import ResetPassword from "@/pages/auth/ResetPassword";
import ResetSuccess from "@/pages/auth/ResetSuccess";
import ClerkDashboard from "@/pages/dashboards/ClerkDashboard";
import ManagerDashboard from "@/pages/dashboards/ManagerDashboard";
import ManagerBookings from "@/pages/manager/ManagerBookings";
import ManagerQueue from "@/pages/manager/ManagerQueue";
import ManagerSpaces from "@/pages/manager/ManagerSpaces";
import ManagerSpaceCreate from "@/pages/manager/ManagerSpaceCreate";
import ManagerAmenities from "@/pages/manager/ManagerAmenities";
import ManagerInventory from "@/pages/manager/ManagerInventory";
import ManagerReports from "@/pages/manager/ManagerReports";
import ManagerProfile from "@/pages/manager/ManagerProfile";

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
      <Route path="/manager/dashboard" element={<ManagerDashboard />} />
      <Route path="/manager/bookings" element={<ManagerBookings />} />
      <Route path="/manager/queue" element={<ManagerQueue />} />
      <Route path="/manager/spaces" element={<ManagerSpaces />} />
      <Route path="/manager/spaces/create" element={<ManagerSpaceCreate />} />
      <Route path="/manager/amenities" element={<ManagerAmenities />} />
      <Route path="/manager/inventory" element={<ManagerInventory />} />
      <Route path="/manager/reports" element={<ManagerReports />} />
      <Route path="/manager/profile" element={<ManagerProfile />} />
    </Routes>
  );
}

export default App;
