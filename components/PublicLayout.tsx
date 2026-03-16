import React from 'react';

interface PublicLayoutProps {
    children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased selection:bg-taguig-blue/20 selection:text-taguig-blue">
            {children}
        </div>
    );
};

export default PublicLayout;
