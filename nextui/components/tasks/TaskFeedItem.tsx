import React from 'react';

interface TaskFeedItemProps {
    title: string;
    project?: string;
    status?: 'todo' | 'in-progress' | 'done';
    priority?: 'high' | 'medium' | 'low';
}

export const TaskFeedItem = ({ title, project, status = 'todo', priority = 'medium' }: TaskFeedItemProps) => {
    return (
        <div className="bg-card p-4 rounded-lg border shadow-sm mb-3 hover:border-primary/50 transition-colors cursor-pointer group">
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                    {/* Checkbox placeholder */}
                    <div className="mt-1 w-5 h-5 rounded border border-muted-foreground/30 hover:border-primary cursor-pointer" />

                    <div>
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {title}
                        </h4>
                        <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                            {project && <span className="bg-secondary px-1.5 py-0.5 rounded">{project}</span>}
                            <span>#task</span>
                        </div>
                    </div>
                </div>

                {/* Metadata / Rewards */}
                <div className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                    +150 EEU
                </div>
            </div>
        </div>
    );
};
