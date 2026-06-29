import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import CourseList from './pages/CourseList';
import Quiz from './pages/Quiz';
import Analytics from './pages/Analytics';
import QuizTracker from './pages/QuizTracker';
import GlobalHistory from './pages/GlobalHistory';
import SessionTimeout from './components/SessionTimeout';

// Admin Panel Imports
import AdminDashboard from './pages/admin/AdminDashboard';
import AcademicStructure from './pages/admin/AcademicStructure';
import AdminStudents from './pages/admin/AdminStudents';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSettings from './pages/admin/AdminSettings';
import AdminUserControl from './pages/admin/AdminUserControl';

// Protected Route Component
const ProtectedRoute = ({ children, requireProfile = false }: { children: React.ReactNode, requireProfile?: boolean }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-gray-500">Loading NeuroPlan...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Flexible Onboarding Guard 
  if (requireProfile) {
    if (user.onboarding_stage !== 'COMPLETE') {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
};

// Admin Route Component (Role Guarded)
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-gray-500">Loading NeuroPlan...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <SessionTimeout>
          <div className="min-h-screen bg-gray-50 flex flex-col font-sans transition-colors duration-300">
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />


            <Route path="/" element={<Landing />} />
            {/* We will add these routes later */}
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute requireProfile><CourseList /></ProtectedRoute>} />
            <Route path="/quiz/:courseId" element={<ProtectedRoute requireProfile><Quiz /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute requireProfile><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/tracker" element={<ProtectedRoute requireProfile><QuizTracker /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute requireProfile><Analytics /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute requireProfile><GlobalHistory /></ProtectedRoute>} />

            {/* Admin Panel Routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/structure" element={<AdminRoute><AcademicStructure /></AdminRoute>} />
            <Route path="/admin/students" element={<AdminRoute><AdminStudents /></AdminRoute>} />
            <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUserControl /></AdminRoute>} />

            {/* Catch All */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
        </SessionTimeout>
      </Router>
    </AuthProvider>
  );
}

export default App;
