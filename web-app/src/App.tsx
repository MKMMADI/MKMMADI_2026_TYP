import { Navigate, Route, Routes } from "react-router-dom";
import Login from "@/pages/auth/Login";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import CheckEmail from "@/pages/auth/CheckEmail";
import ResetPassword from "@/pages/auth/ResetPassword";
import ResetSuccess from "@/pages/auth/ResetSuccess";
import ClerkQueue from "@/pages/clerk/ClerkQueue";
import ClerkStock from "@/pages/clerk/ClerkStock";
import ClerkProfile from "@/pages/clerk/ClerkProfile";
import EmployeeHome from "@/pages/employee/EmployeeHome";
import EmployeeBookings from "@/pages/employee/EmployeeBookings";
import EmployeeProfile from "@/pages/employee/EmployeeProfile";
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

      {/* Employee — same field-app shell as clerk */}
      <Route path="/dashboard" element={<EmployeeHome />} />
      <Route path="/dashboard/bookings" element={<EmployeeBookings />} />
      <Route path="/dashboard/profile" element={<EmployeeProfile />} />

      {/* Clerk / operations — mobile-first */}
      <Route path="/operations" element={<ClerkQueue />} />
      <Route path="/operations/queue" element={<Navigate to="/operations" replace />} />
      <Route path="/operations/dashboard" element={<Navigate to="/operations" replace />} />
      <Route path="/operations/stock" element={<ClerkStock />} />
      <Route path="/operations/profile" element={<ClerkProfile />} />

      {/* Manager — desktop web */}
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
