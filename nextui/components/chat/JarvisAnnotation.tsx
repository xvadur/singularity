import React from 'react';

interface JarvisAnnotationProps {
    content: string;
    type?: 'insight' | 'action' | 'question';
}

export const JarvisAnnotation = ({ content, type = 'insight' }: JarvisAnnotationProps) => {
    const borderClass =
        type === 'action' ? 'border-l-green-500' :
            type === 'question' ? 'border-l-yellow-500' :
                'border-l-primary';

    return (
        <div className={`ml-4 pl-4 border-l-2 ${borderClass} py-2 my-2 bg-muted/30 rounded-r-lg`}>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Jarvis Identity</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed italic">
                {content}
            </p>
        </div>
    );
};
