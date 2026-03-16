import React, { useState } from 'react';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased selection:bg-taguig-navy/20 selection:text-taguig-navy">
            {/* Desktop Sidebar (Fixed) */}
            <div className="hidden md:flex flex-col w-64 fixed inset-y-0 border-r border-slate-200 dark:border-white/10 z-[60]">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <div className="md:pl-64 flex flex-col min-h-screen">
                <main className="flex-1 p-4 md:p-8 lg:p-10 transition-all duration-300">
                    <div className="max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
