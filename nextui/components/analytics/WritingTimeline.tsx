import React from 'react';

export const WritingTimeline = () => {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-4">Recent Activity</h3>

            {/* Simulation of timeline nodes */}
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-3 relative group">
                    {/* Vertical Line */}
                    <div className="absolute left-[5px] top-6 bottom-[-16px] w-[2px] bg-border group-last:hidden" />

                    {/* Node */}
                    <div className="w-3 h-3 rounded-full bg-primary mt-1.5 shrink-0 z-10 ring-4 ring-background" />

                    {/* Content */}
                    <div className="pb-4">
                        <div className="text-xs text-muted-foreground mb-0.5">10:4{i} AM</div>
                        <div className="text-sm font-medium line-clamp-1">
                            "Refining the discovery process for NextUI..."
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                            +45 words • 12 XP
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
