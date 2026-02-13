import React from 'react';

export const TasksInboxFrame = () => {
    return (
        <div className="bg-background border-b sticky top-0 z-10 p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Inbox</h1>
                <div className="flex gap-2">
                    <button className="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm">
                        + New Task
                    </button>
                </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-6 text-sm font-medium text-muted-foreground border-b">
                <div className="pb-2 border-b-2 border-primary text-foreground cursor-pointer">
                    All Active (8)
                </div>
                <div className="pb-2 border-b-2 border-transparent hover:text-foreground cursor-pointer">
                    Today (3)
                </div>
                <div className="pb-2 border-b-2 border-transparent hover:text-foreground cursor-pointer">
                    Backlog (24)
                </div>
            </div>
        </div>
    );
};
