import React from 'react';

interface PublicLayoutProps {
    children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans antialiased selection:bg-taguig-gold/30 selection:text-taguig-navy flex flex-col">
            <main className="flex-1 flex flex-col">
                {children}
            </main>
        </div>
    );
};

export default PublicLayout;
