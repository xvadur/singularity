import React from 'react';
import { WritingTimeline } from './WritingTimeline';

export const MetricsPanel = () => {
    return (
        <div className="h-full flex flex-col bg-sidebar border-l p-4 w-80 fixed right-0 top-0 bottom-16 overflow-y-auto hidden xl:flex">
            {/* LOTR Benchmark */}
            <div className="mb-8">
                <h3 className="text-sm font-semibold mb-2">The Lord of the Rings</h3>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mb-1">
                    <div className="bg-primary h-full w-[35%]" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>156k / 455k words</span>
                    <span>35%</span>
                </div>
            </div>

            {/* 12h Velocity Chart Placeholder */}
            <div className="mb-8 p-4 bg-muted/20 rounded-lg border h-40 flex items-center justify-center text-sm text-muted-foreground">
                [12h Velocity Chart]
            </div>

            {/* Timeline */}
            <WritingTimeline />
        </div>
    );
};
