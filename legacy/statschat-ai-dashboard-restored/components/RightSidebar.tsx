import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Message, Role, DashboardView } from '../types';
import { Activity, Clock } from 'lucide-react';
import HeatmapView from './HeatmapView';
import { generateMockActivityData } from '../data/mockActivityData';

interface RightSidebarProps {
  messages: Message[];
  todaysStats: {
    wordsSent: number;
    promptsSent: number;
    hourlyActivity: { hour: number; words: number }[];
  };
  currentPromptWordCount: number;
  currentThreadPromptCount: number;
  activeGraphView?: DashboardView;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  messages,
  todaysStats,
  currentPromptWordCount,
  currentThreadPromptCount,
  activeGraphView = 'default'
}) => {

  // Get timeline items (last user messages)
  const timelineItems = messages
    .filter(m => m.role === Role.USER)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15);

  // Mock data for heatmap
  const activityData = useMemo(() => generateMockActivityData(), []);

  // If Heatmap View is active, show the Heatmap Component instead of default view
  if (activeGraphView === 'heatmap') {
    return (
      <aside className="w-80 h-full border-l-2 border-panel-border p-4 flex flex-col gap-4 bg-dashboard-bg/50 overflow-y-auto custom-scrollbar">
        <div className="flex-1 border-2 border-stat-green rounded-xl p-4 bg-green-900/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <HeatmapView data={activityData} />
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 h-full border-l-2 border-panel-border p-4 flex flex-col gap-4 bg-dashboard-bg/50 overflow-y-auto custom-scrollbar">
      
      {/* GREEN SECTION: Stats */}
      <div className="border-2 border-stat-green rounded-xl p-4 bg-green-900/10 relative overflow-hidden flex flex-col gap-3 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
        <h3 className="text-stat-green font-bold text-sm flex items-center gap-2 uppercase tracking-wider mb-1">
          <Activity size={16} /> Activity Monitor
        </h3>
        
        <div className="flex flex-col gap-3 z-10 relative">
          {/* Current Prompt Stats */}
          <div className="bg-green-950/50 rounded-lg p-3 border border-stat-green/30">
            <div className="text-[10px] text-stat-green uppercase font-bold tracking-wider mb-1">Current Prompt Words</div>
            <div className="text-3xl font-mono text-white font-bold tracking-tighter">{currentPromptWordCount}</div>
          </div>

          <div className="bg-green-950/50 rounded-lg p-3 border border-stat-green/30">
             <div className="text-[10px] text-stat-green uppercase font-bold tracking-wider mb-1">Current Thread Prompts</div>
             <div className="text-2xl font-mono text-white font-bold tracking-tighter">{currentThreadPromptCount}</div>
          </div>

          {/* Daily Stats Grid */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="bg-green-900/20 p-2 rounded border border-stat-green/20">
               <div className="text-[9px] text-green-300/70 uppercase">24H Words</div>
               <div className="text-lg font-mono text-green-100 font-semibold">{todaysStats.wordsSent}</div>
            </div>
            <div className="bg-green-900/20 p-2 rounded border border-stat-green/20">
               <div className="text-[9px] text-green-300/70 uppercase">24H Prompts</div>
               <div className="text-lg font-mono text-green-100 font-semibold">{todaysStats.promptsSent}</div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="h-36 w-full mt-2 pt-2 border-t border-stat-green/20">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={todaysStats.hourlyActivity} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#10B981" strokeOpacity={0.1} />
              <XAxis 
                dataKey="hour" 
                tick={{fill: '#10B981', fontSize: 8, opacity: 0.6}}
                axisLine={{stroke: '#10B981', opacity: 0.3}}
                tickLine={false}
                interval={3}
              />
              <Tooltip 
                cursor={{fill: '#10B981', opacity: 0.1}}
                contentStyle={{ backgroundColor: '#064E3B', border: '1px solid #10B981', borderRadius: '4px', fontSize: '10px', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
                labelFormatter={(label) => `${label}:00`}
              />
              <Bar dataKey="words" radius={[2, 2, 0, 0]}>
                {todaysStats.hourlyActivity.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#10B981" fillOpacity={entry.words > 0 ? 0.9 : 0.15} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
           <div className="text-[9px] text-center text-stat-green/50 mt-1 uppercase tracking-widest font-mono">Hourly Activity (Words)</div>
        </div>
      </div>

      {/* RED SECTION: Timeline */}
      <div className="flex-1 border-2 border-timeline-red rounded-xl p-4 bg-red-900/10 relative overflow-hidden flex flex-col min-h-[200px] shadow-[0_0_15px_rgba(239,68,68,0.1)]">
         <h3 className="text-timeline-red font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-wider border-b border-timeline-red/30 pb-2">
          <Clock size={16} /> Recent Prompts
        </h3>

        <div className="flex-1 overflow-y-auto pr-2 relative custom-scrollbar">
          {/* Vertical Line */}
          <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-timeline-red/20"></div>
          
          <div className="space-y-5 pl-6 relative py-1">
            {timelineItems.length === 0 ? (
              <div className="text-red-300/40 text-xs italic pl-2">No activity recorded yet...</div>
            ) : (
              timelineItems.map((msg) => (
                <div key={msg.id} className="relative group">
                  {/* Dot on timeline */}
                  <div className="absolute -left-[20px] top-2 w-2.5 h-2.5 rounded-full bg-dashboard-bg border-2 border-timeline-red group-hover:bg-timeline-red group-hover:scale-110 transition-all z-10"></div>
                  
                  {/* Content */}
                  <div className="flex flex-col">
                    <div className="text-[10px] text-red-400/70 font-mono mb-1 flex items-center gap-2">
                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div className="text-xs text-white font-medium bg-gradient-to-r from-red-950/60 to-transparent p-2 rounded-md border-l-2 border-timeline-red/40 group-hover:border-timeline-red transition-colors truncate">
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </aside>
  );
};

export default RightSidebar;
