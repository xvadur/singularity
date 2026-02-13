import React from 'react';
import Link from 'next/link';

export const Sidebar = () => {
    return (
        <aside className="w-16 md:w-64 bg-sidebar border-r flex flex-col justify-between h-screen fixed left-0 top-0 z-20">
            <div className="p-4">
                {/* Logo */}
                <div className="font-bold text-xl mb-8 flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg" />
                    <span className="hidden md:inline">Jarvis</span>
                </div>

                {/* Navigation */}
                <nav className="space-y-2">
                    <Link href="/" className="block px-3 py-2 rounded hover:bg-muted font-medium">Home</Link>
                    <Link href="/tasks" className="block px-3 py-2 rounded hover:bg-muted font-medium">Tasks</Link>
                    <Link href="/chat" className="block px-3 py-2 rounded hover:bg-muted font-medium">Chat</Link>
                </nav>
            </div>

            {/* Footer / User */}
            <div className="p-4 border-t">
                <div className="w-8 h-8 bg-secondary rounded-full" />
            </div>
        </aside>
    );
};
