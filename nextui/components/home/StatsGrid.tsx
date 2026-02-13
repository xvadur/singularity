import React from 'react';
import { StatCard } from './StatCard';

export const StatsGrid = () => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
                label="Level"
                value="42"
                trend="75% to Lvl 43"
                trendDirection="up"
            />
            <StatCard
                label="XP Today"
                value="1,250"
                trend="+15% vs Yesterday"
                trendDirection="up"
            />
            <StatCard
                label="Words Today"
                value="3,400"
                trend="-5% vs Yesterday"
                trendDirection="down"
            />
            <StatCard
                label="Active Tasks"
                value="8"
                trend="3 High Priority"
                trendDirection="neutral"
            />
        </div>
    );
};
