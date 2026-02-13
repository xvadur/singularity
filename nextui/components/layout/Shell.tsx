import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomCaptureBar } from '../capture/BottomCaptureBar';
import { MetricsPanel } from '../analytics/MetricsPanel';

export const Shell = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Left Navigation */}
            <Sidebar />

            {/* Main Content Area */}
            <main className="flex-1 ml-16 md:ml-64 mr-0 xl:mr-80 pb-32 pt-4 px-4 md:px-8">
                {children}
            </main>

            {/* Right Analytics Sidebar (Desktop Only) */}
            <MetricsPanel />

            {/* Bottom Capture Bar (Global) */}
            <BottomCaptureBar />
        </div>
    );
};
