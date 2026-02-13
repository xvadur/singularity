import React from 'react';
import { TaskFeedItem } from './TaskFeedItem';

export const ChronologicalTaskFeed = () => {
    return (
        <div className="p-4 max-w-3xl mx-auto pb-32">
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-4 tracking-wider">
                Today
            </div>
            <TaskFeedItem title="Finalize NextUI Discovery Documentation" project="Singularity" priority="high" />
            <TaskFeedItem title="Scaffold initial component architecture" project="Singularity" status="in-progress" />
            <TaskFeedItem title="Review PR #42 for legacy cleanup" project="Codex" />

            <div className="text-xs font-semibold text-muted-foreground uppercase mt-8 mb-4 tracking-wider">
                Yesterday
            </div>
            <TaskFeedItem title="Research Morning Brief API integration" project="Singularity" status="done" />
        </div>
    );
};
