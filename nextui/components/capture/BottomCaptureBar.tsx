'use client';

import React, { useState, useEffect } from 'react';
import { useCaptureTheme, CaptureCategory } from '../../hooks/useCaptureTheme';

// Placeholder for full implementation
export const BottomCaptureBar = () => {
    const { activeCategory, setActiveCategory, themeClass } = useCaptureTheme();
    const [inputValue, setInputValue] = useState('');

    // Mock handler for shortcuts - to be expanded
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'c') setActiveCategory('capture');
            if ((e.metaKey || e.ctrlKey) && e.key === 'l') setActiveCategory('log');
            if ((e.metaKey || e.ctrlKey) && e.key === 'd') setActiveCategory('daily');
            if ((e.metaKey || e.ctrlKey) && e.key === 't') setActiveCategory('tasks');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setActiveCategory]);

    return (
        <div className={`fixed bottom-0 left-0 right-0 p-4 border-t ${themeClass}`}>
            <div className="max-w-4xl mx-auto">
                <div className="flex gap-2 mb-2">
                    {/* Category Indicators */}
                    <span className={activeCategory === 'capture' ? 'underline font-bold' : ''}>Capture</span>
                    <span className={activeCategory === 'log' ? 'underline font-bold' : ''}>Log</span>
                    <span className={activeCategory === 'daily' ? 'underline font-bold' : ''}>Daily</span>
                    <span className={activeCategory === 'tasks' ? 'underline font-bold' : ''}>Tasks</span>
                </div>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={`Type to ${activeCategory}...`}
                    className="w-full p-4 text-lg bg-transparent border rounded shadow-sm focus:outline-none"
                />
            </div>
        </div>
    );
};
