
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import CommandCenter from './pages/CommandCenter';
import IncidentForm from './pages/IncidentForm';
import UserManagement from './pages/UserManagement';
import AuditLogs from './pages/AuditLogs';
import ResourceTracking from './pages/ResourceTracking';
import ResourceForm from './pages/ResourceForm';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode, requiredRole?: 'supervisor' }> = ({ children, requiredRole }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
      return <div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
      return <Navigate to="/" replace />; // Unauthorized redirect to dashboard
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
    const { user } = useAuth();
    
    // Independent Login Route
    if (!user) {
        return (
             <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/login" />} />
             </Routes>
        );
    }

    return (
        <div className="min-h-screen text-gray-800 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
            <Sidebar />
            {/* 
                Responsive Layout:
                - Mobile: pb-24 (Space for Bottom Nav), pl-0
                - Tablet (md): pb-8, pl-20 (Space for Slim Sidebar)
                - Desktop (lg): pl-64 (Space for Full Sidebar)
            */}
            <main className="pb-24 md:pb-8 md:pl-20 lg:pl-64 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <Routes>
                <Route path="/" element={<ProtectedRoute><CommandCenter /></ProtectedRoute>} />
                <Route path="/report" element={<ProtectedRoute><IncidentForm /></ProtectedRoute>} />
                <Route path="/resources" element={<ProtectedRoute><ResourceTracking /></ProtectedRoute>} />
                <Route path="/resources/new" element={<ProtectedRoute><ResourceForm /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute requiredRole="supervisor"><UserManagement /></ProtectedRoute>} />
                <Route path="/audit-logs" element={<ProtectedRoute requiredRole="supervisor"><AuditLogs /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute requiredRole="supervisor"><Settings /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </div>
            </main>
        </div>
    );
}

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
            <Router>
                <AppContent />
            </Router>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  );
};

export default App;
