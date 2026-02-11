import React, { useMemo } from 'react';
import { DailyActivityStat } from '../types';
import { Activity } from 'lucide-react';

interface HeatmapViewProps {
  data: DailyActivityStat[];
}

const HeatmapView: React.FC<HeatmapViewProps> = ({ data }) => {
  
  const weeksToDisplay = 14; 
  const daysToDisplay = weeksToDisplay * 7;
  
  // Process data into a grid structure (Column = Week, Row = Day)
  const gridData = useMemo(() => {
    const dataMap = new Map(data.map(d => [d.date, d]));
    const today = new Date();
    const columns = [];
    
    // Find the Sunday of the current week to align the grid
    const currentWeekSunday = new Date(today);
    currentWeekSunday.setDate(today.getDate() - today.getDay());
    
    // Start date of the grid
    const startDate = new Date(currentWeekSunday);
    startDate.setDate(startDate.getDate() - (weeksToDisplay - 1) * 7);
    
    let iterDate = new Date(startDate);
    
    for (let w = 0; w < weeksToDisplay; w++) {
      const weekData = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = iterDate.toISOString().split('T')[0];
        
        // Check if future date
        if (iterDate > today) {
           weekData.push({ date: dateStr, stat: undefined, isFuture: true });
        } else {
           weekData.push({ date: dateStr, stat: dataMap.get(dateStr), isFuture: false });
        }
        iterDate.setDate(iterDate.getDate() + 1);
      }
      columns.push(weekData);
    }
    
    return columns;
  }, [data, weeksToDisplay]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-slate-800/50 border-slate-700/30';
    if (count < 500) return 'bg-[#0e4429] border-[#0e4429]'; 
    if (count < 1000) return 'bg-[#006d32] border-[#006d32]'; 
    if (count < 2000) return 'bg-[#26a641] border-[#26a641]'; 
    return 'bg-[#39d353] border-[#39d353]'; 
  };

  return (
    <div className="h-full flex flex-col bg-dashboard-bg/30">
       {/* Header */}
       <div className="border-b border-panel-border/50 pb-4 mb-4">
         <h3 className="text-stat-green font-bold text-lg flex items-center gap-2 uppercase tracking-wider">
           <Activity size={20} /> Activity Heatmap
         </h3>
         <p className="text-xs text-slate-400 mt-1">Writing frequency over the last {weeksToDisplay} weeks</p>
       </div>

       {/* Heatmap Grid */}
       <div className="flex-1 flex flex-col items-center justify-center">
         <div className="flex gap-[3px]">
            {gridData.map((week, wIndex) => (
              <div key={wIndex} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <div 
                    key={day.date}
                    className={`w-3 h-3 rounded-[2px] border ${!day.isFuture ? getColor(day.stat?.wordCount || 0) : 'opacity-0'} group relative transition-all hover:border-white/50`}
                  >
                     {!day.isFuture && (
                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 whitespace-nowrap bg-slate-900 text-white text-[10px] px-2 py-1 rounded border border-slate-700 shadow-xl pointer-events-none">
                         <div className="font-bold text-slate-300">{day.date}</div>
                         <div>{day.stat?.wordCount || 0} words</div>
                         <div>{day.stat?.promptCount || 0} prompts</div>
                       </div>
                     )}
                  </div>
                ))}
              </div>
            ))}
         </div>
         
         {/* Legend */}
         <div className="mt-6 flex items-center gap-2 text-[10px] text-slate-400">
            <span>Less</span>
            <div className="w-3 h-3 rounded-[2px] bg-slate-800/50 border border-slate-700/30"></div>
            <div className="w-3 h-3 rounded-[2px] bg-[#0e4429]"></div>
            <div className="w-3 h-3 rounded-[2px] bg-[#006d32]"></div>
            <div className="w-3 h-3 rounded-[2px] bg-[#26a641]"></div>
            <div className="w-3 h-3 rounded-[2px] bg-[#39d353]"></div>
            <span>More</span>
         </div>
       </div>
       
       {/* Summary Stats */}
       <div className="grid grid-cols-3 gap-4 mt-6 border-t border-panel-border/50 pt-4">
          <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
             <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total Words</div>
             <div className="text-xl font-mono text-white">
               {data.reduce((acc, curr) => acc + curr.wordCount, 0).toLocaleString()}
             </div>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
             <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Active Days</div>
             <div className="text-xl font-mono text-white">
               {data.filter(d => d.wordCount > 0).length}
             </div>
          </div>
          <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
             <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Max Streak</div>
             <div className="text-xl font-mono text-white">
               {(() => {
                 let max = 0;
                 let current = 0;
                 data.forEach(d => {
                   if (d.wordCount > 0) current++;
                   else {
                     if (current > max) max = current;
                     current = 0;
                   }
                 });
                 return Math.max(max, current);
               })()}
             </div>
          </div>
       </div>
    </div>
  );
};

export default HeatmapView;
