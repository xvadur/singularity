import React from 'react';

export const MorningBrief = () => {
    return (
        <div className="bg-card text-card-foreground rounded-xl p-6 shadow-sm border mb-6">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl font-bold">Morning Brief</h2>
                    <p className="text-muted-foreground">Focus for today</p>
                </div>
                <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    High Energy
                </div>
            </div>
            <div className="space-y-4">
                <p className="text-lg">"Today is about locking the NextUI contract."</p>
                <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>🎯 Topic: Discovery</span>
                    <span>⚡ Difficulty: Hard</span>
                </div>
            </div>
        </div>
    );
};
