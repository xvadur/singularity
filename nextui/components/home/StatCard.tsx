import React from 'react';

interface StatCardProps {
    label: string;
    value: string | number;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
    icon?: React.ReactNode;
}

export const StatCard = ({ label, value, trend, trendDirection = 'neutral', icon }: StatCardProps) => {
    const trendColor =
        trendDirection === 'up' ? 'text-green-500' :
            trendDirection === 'down' ? 'text-red-500' : 'text-gray-500';

    return (
        <div className="bg-card p-4 rounded-xl border shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
                {icon && <div className="text-muted-foreground">{icon}</div>}
            </div>
            <div>
                <div className="text-2xl font-bold">{value}</div>
                {trend && <div className={`text-xs ${trendColor} mt-1`}>{trend}</div>}
            </div>
        </div>
    );
};
