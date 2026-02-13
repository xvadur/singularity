import React from 'react';
import { JarvisAnnotation } from './JarvisAnnotation';

export const DailyJournalStream = () => {
    return (
        <div className="max-w-3xl mx-auto p-4 space-y-8 pb-32">
            {/* Date Header */}
            <div className="text-center py-8">
                <h1 className="text-3xl font-serif font-bold text-foreground">Thursday, February 13</h1>
                <p className="text-muted-foreground mt-2">Daily Journal • Week 7</p>
            </div>

            {/* Entry 1 */}
            <div className="group">
                <div className="text-xs text-muted-foreground mb-2 font-mono">09:15 AM</div>
                <p className="text-lg leading-relaxed text-foreground">
                    Starting the day with a focus on locking the NextUI discovery. I feel like we are close to a breakthrough on the UX side.
                    The "Perfect Capture" concept is really resonating.
                </p>
                <JarvisAnnotation
                    content="I've analyzed your recent capture patterns. You are prioritizing speed over depth. The 'Perfect Capture' UI should minimize friction to maintain this velocity."
                />
            </div>

            {/* Entry 2 */}
            <div>
                <div className="text-xs text-muted-foreground mb-2 font-mono">10:42 AM</div>
                <p className="text-lg leading-relaxed text-foreground">
                    Meeting went well. We decided to go with Option C for the interaction model.
                </p>
            </div>
        </div>
    );
};
