
import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { UserProfile } from './types';
import CommandCenter from './pages/CommandCenter';
import IncidentForm from './pages/IncidentForm';
import UserManagement from './pages/UserManagement';
import AuditLogs from './pages/AuditLogs';
import ResourceTracking from './pages/ResourceTracking';
import ResourceForm from './pages/ResourceForm';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ResolvedCases from './pages/ResolvedCases';
import RestrictedPersons from './pages/RestrictedPersons';
import CCTVRequestForm from './pages/CCTVRequestForm';
import SystemGuidelines from './pages/SystemGuidelines';
import DownloadForms from './pages/DownloadForms';
import LandingPage from './pages/LandingPage';
import PendingApproval from './pages/PendingApproval';
import PublicServiceRequest from './pages/PublicServiceRequest';
import PublicReportsQueue from './pages/PublicReportsQueue';
import ResidentDirectory from './pages/ResidentDirectory';
import Applications from './pages/Applications';
import DashboardLayout from './components/DashboardLayout';
import PublicLayout from './components/PublicLayout';
import UpdatePassword from './pages/UpdatePassword';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { authService } from './services/authService';
import { supabase } from './lib/supabaseClient';
import { Lock, Save } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode, check?: (user: UserProfile) => boolean }> = ({ children, check }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div></div>;
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (user.status === 'pending') {
        return <Navigate to="/pending" replace />;
    }

    if (check && !check(user)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

// Legacy inline component removed. Using standalone UpdatePassword component.

// DashboardLayout wraps all authenticated routes

const AppContent: React.FC = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
        );
    }

    return (
        <Routes>
            {/* Public Routes wrapped in PublicLayout */}
            <Route path="/" element={
                Capacitor.isNativePlatform() ? <Navigate to="/login" replace /> : <PublicLayout><LandingPage /></PublicLayout>
            } />
            <Route path="/login" element={
                user ? (
                    user.status === 'pending' ? <Navigate to="/pending" replace /> :
                    user.role === 'resident' ? <Navigate to="/public-request" replace /> : <Navigate to="/dashboard" replace />
                ) : (
                    <PublicLayout><Login /></PublicLayout>
                )
            } />
            <Route path="/pending" element={
                user && user.status === 'pending' ? <PendingApproval /> : <Navigate to="/" replace />
            } />
            <Route path="/update-password" element={<PublicLayout><UpdatePassword /></PublicLayout>} />
            
            {/* Protected Routes encapsulated in DashboardLayout */}
            <Route path="/*" element={
                <ProtectedRoute>
                    <DashboardLayout>
                        <Routes>
                             <Route path="/dashboard" element={
                                <ProtectedRoute check={u => u.role !== 'resident' && u.role !== 'guest'}>
                                    <CommandCenter />
                                </ProtectedRoute>
                            } />
                            <Route path="/public-request" element={<ProtectedRoute check={u => u.role === 'resident'}><PublicServiceRequest /></ProtectedRoute>} />
                            <Route path="/public-reports" element={<ProtectedRoute check={u => ['barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor', 'bantay_bayan', 'developer'].includes(u.role)}><PublicReportsQueue /></ProtectedRoute>} />
                            <Route path="/report" element={<ProtectedRoute check={u => !['guest', 'resident'].includes(u.role)}><IncidentForm /></ProtectedRoute>} />
                            <Route path="/cctv-request" element={<ProtectedRoute check={u => !['guest', 'resident'].includes(u.role)}><CCTVRequestForm /></ProtectedRoute>} />
                            <Route path="/resources" element={<ProtectedRoute check={u => !['guest', 'resident'].includes(u.role)}><ResourceTracking /></ProtectedRoute>} />
                            <Route path="/resources/new" element={<ProtectedRoute check={u => !['guest', 'resident'].includes(u.role)}><ResourceForm /></ProtectedRoute>} />
                            <Route path="/archives" element={<ProtectedRoute check={u => ['barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor', 'bantay_bayan', 'developer'].includes(u.role)}><ResolvedCases /></ProtectedRoute>} />
                            <Route path="/restricted" element={<RestrictedPersons />} />
                            <Route path="/users" element={<ProtectedRoute check={u => ['barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor', 'bantay_bayan', 'developer'].includes(u.role)}><UserManagement /></ProtectedRoute>} />
                            <Route path="/residents" element={<ProtectedRoute check={u => ['barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor', 'bantay_bayan', 'developer'].includes(u.role)}><ResidentDirectory /></ProtectedRoute>} />
                            <Route path="/applications" element={<ProtectedRoute check={u => ['barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'supervisor', 'developer'].includes(u.role)}><Applications /></ProtectedRoute>} />
                            <Route path="/audit-logs" element={<ProtectedRoute check={u => ['barangay_captain', 'barangay_secretary', 'barangay_kagawad', 'developer'].includes(u.role)}><AuditLogs /></ProtectedRoute>} />
                            <Route path="/guidelines" element={<SystemGuidelines />} />
                            <Route path="/download-forms" element={<DownloadForms />} />
                            <Route path="/settings" element={<ProtectedRoute check={u => u.role !== 'guest'}><Settings /></ProtectedRoute>} />
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </DashboardLayout>
                </ProtectedRoute>
            } />
        </Routes>
    );
}

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <ToastProvider>
                    <AuthProvider>
                        <Router>
                            <AppContent />
                        </Router>
                    </AuthProvider>
                </ToastProvider>
            </LanguageProvider>
        </ThemeProvider>
    );
};

export default App;
