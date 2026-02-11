import React, { useState, useEffect } from 'react';
import { ChatThread, CalendarEvent, DashboardView } from '../types';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  MessageSquare,
  BarChart2,
  Brain,
  Type,
  Tags,
  Settings,
  FileText
} from 'lucide-react';

interface LeftSidebarProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
  calendarEvents: CalendarEvent[];
  onUpdateCalendar: (events: CalendarEvent[]) => void;
  onSelectGraphView: (view: DashboardView) => void;
}

type ViewMode = 'chats' | 'graphs';

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  calendarEvents,
  onUpdateCalendar,
  onSelectGraphView
}) => {
  // Navigation State
  const [viewMode, setViewMode] = useState<ViewMode>('chats');

  // Calendar State
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');

  // Sync note content when selected date changes
  useEffect(() => {
    if (selectedDate) {
      const event = calendarEvents.find(e => e.date === selectedDate);
      setNoteContent(event ? event.text : '');
    }
  }, [selectedDate, calendarEvents]);

  // Helper to categorize threads
  const categorizeThreads = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const lastWeek = today - 86400000 * 7;

    const groups = {
      last24h: [] as ChatThread[],
      yesterday: [] as ChatThread[],
      older: [] as ChatThread[],
    };

    threads.forEach(thread => {
      const tTime = new Date(thread.updatedAt).getTime();
      if (tTime >= today) {
        groups.last24h.push(thread);
      } else if (tTime >= yesterday) {
        groups.yesterday.push(thread);
      } else {
        groups.older.push(thread);
      }
    });

    const sorter = (a: ChatThread, b: ChatThread) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    groups.last24h.sort(sorter);
    groups.yesterday.sort(sorter);
    groups.older.sort(sorter);

    return groups;
  };

  const groupedThreads = categorizeThreads();

  // --- Calendar Logic ---

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  const handleNoteSave = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setNoteContent(newText);
    
    if (selectedDate) {
      const otherEvents = calendarEvents.filter(evt => evt.date !== selectedDate);
      if (newText.trim()) {
        onUpdateCalendar([...otherEvents, { id: Date.now().toString(), date: selectedDate, text: newText }]);
      } else {
        onUpdateCalendar(otherEvents);
      }
    }
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const days = [];

    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-6 w-6"></div>);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasEvent = calendarEvents.some(e => e.date === dateStr && e.text.trim().length > 0);
      
      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          className="h-7 w-full flex flex-col items-center justify-center text-xs text-amber-100 hover:bg-amber-800/50 rounded relative group transition-colors"
        >
          <span className="z-10">{day}</span>
          {hasEvent && (
            <div className="absolute bottom-1 w-1 h-1 bg-red-500 rounded-full shadow-[0_0_4px_rgba(239,68,68,0.8)]"></div>
          )}
        </button>
      );
    }

    return days;
  };

  const renderThreadList = (label: string, list: ChatThread[]) => {
    if (list.length === 0) return null;
    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-blue-200 mb-2 border-b border-blue-800 pb-1">{label}</h3>
        <div className="flex flex-col gap-2">
          {list.map(thread => (
            <button
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm truncate transition-colors ${
                activeThreadId === thread.id
                  ? 'bg-sidebar-purple text-white font-medium shadow-lg'
                  : 'bg-indigo-900/40 text-blue-200 hover:bg-indigo-800/50'
              }`}
            >
              {thread.title || 'New Chat'}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderGraphMenu = () => {
    const menuItems = [
      { 
        id: 'heatmap', 
        label: 'Heatmapa', 
        icon: <BarChart2 size={18} className="text-pink-400" />,
        desc: 'Activity visualization'
      },
      { 
        id: 'cognitive', 
        label: 'Cognitive Analysis', 
        icon: <Brain size={18} className="text-cyan-400" />,
        desc: 'Logic & reasoning depth'
      },
      { 
        id: 'linguistic', 
        label: 'Linguistic Stats', 
        icon: <Type size={18} className="text-yellow-400" />,
        desc: 'Vocab, syntax (spaCy sk)'
      },
      { 
        id: 'indexing', 
        label: 'Tagging & Index', 
        icon: <Tags size={18} className="text-emerald-400" />,
        desc: 'LlamaIndex parser categories'
      }
    ];

    return (
      <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
        {menuItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => onSelectGraphView(item.id as DashboardView)}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/80 hover:border-slate-600 transition-all group text-left"
          >
            <div className="p-2 rounded-lg bg-slate-900 group-hover:scale-110 transition-transform">
              {item.icon}
            </div>
            <div className="flex flex-col">
               <span className="text-sm font-bold text-slate-100">{item.label}</span>
               <span className="text-[10px] text-slate-400">{item.desc}</span>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const handleTabChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === 'chats') {
      onSelectGraphView('default');
    }
  };

  return (
    <aside className="w-72 h-full border-r-2 border-panel-border p-4 flex flex-col bg-dashboard-bg/50">
      {/* Header / Navigation */}
      <div className="mb-6">
        <div className="bg-teal-700/80 h-12 rounded-md mb-4 flex items-center justify-center shadow-md border border-teal-500/50">
           <span className="font-bold text-teal-100 text-lg tracking-wider">CHAT DASH</span>
        </div>
        
        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-2 mb-4">
           <button 
             onClick={() => handleTabChange('chats')}
             className={`h-8 rounded flex items-center justify-center transition-all border ${viewMode === 'chats' ? 'bg-teal-600 border-teal-400 text-white shadow-lg' : 'bg-teal-900/40 border-teal-500/30 text-teal-500 hover:bg-teal-800/50'}`}
           >
             <MessageSquare size={16} />
           </button>
           <button 
             onClick={() => handleTabChange('graphs')}
             className={`h-8 rounded flex items-center justify-center transition-all border ${viewMode === 'graphs' ? 'bg-teal-600 border-teal-400 text-white shadow-lg' : 'bg-teal-900/40 border-teal-500/30 text-teal-500 hover:bg-teal-800/50'}`}
           >
             <BarChart2 size={16} />
           </button>
           <button className="h-8 rounded flex items-center justify-center bg-teal-900/40 border border-teal-500/30 text-teal-500 hover:bg-teal-800/50 transition-all">
             <FileText size={16} />
           </button>
           <button className="h-8 rounded flex items-center justify-center bg-teal-900/40 border border-teal-500/30 text-teal-500 hover:bg-teal-800/50 transition-all">
             <Settings size={16} />
           </button>
        </div>

        {viewMode === 'chats' && (
          <button
            onClick={onNewThread}
            className="w-full flex items-center justify-center gap-2 bg-sidebar-purple hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-all shadow-lg shadow-purple-900/20"
          >
            <Plus size={18} />
            <span>New Thread</span>
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-1 mb-4 custom-scrollbar">
        {viewMode === 'chats' ? (
          <>
            {renderThreadList('Last 24 Hours', groupedThreads.last24h)}
            {renderThreadList('Yesterday', groupedThreads.yesterday)}
            {renderThreadList('Last Week', groupedThreads.older)}
          </>
        ) : (
          renderGraphMenu()
        )}
      </div>

      {/* Calendar / Notes Section */}
      <div className="h-64 rounded-xl border-2 border-amber-700/60 bg-amber-900/20 p-3 flex flex-col relative overflow-hidden shadow-inner">
        <div className="absolute -left-4 -top-4 text-amber-800/20 pointer-events-none">
           <span className="text-[150px] font-handwriting leading-none select-none">K</span>
        </div>
        
        <div className="flex items-center justify-between text-amber-500 mb-2 z-10">
          <span className="font-bold flex items-center gap-1"><CalendarIcon size={14}/> NOTES / CAL</span>
        </div>
        
        <div className="flex-1 z-10 flex flex-col relative">
          {!selectedDate ? (
            <>
              {/* Month Nav */}
              <div className="flex items-center justify-between text-amber-200 mb-2 px-1">
                <button onClick={handlePrevMonth} className="hover:text-white"><ChevronLeft size={16}/></button>
                <span className="text-xs font-bold uppercase tracking-wide">
                  {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={handleNextMonth} className="hover:text-white"><ChevronRight size={16}/></button>
              </div>
              
              {/* Week Headers */}
              <div className="grid grid-cols-7 mb-1 text-center">
                {['S','M','T','W','T','F','S'].map(d => (
                  <span key={d} className="text-[10px] text-amber-500/70 font-bold">{d}</span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-y-1">
                {renderCalendarGrid()}
              </div>
            </>
          ) : (
            <div className="flex flex-col h-full animate-in fade-in duration-200">
              <div className="flex items-center gap-2 mb-2 border-b border-amber-700/30 pb-1">
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="text-amber-500 hover:text-amber-300 p-1 -ml-1"
                >
                  <ArrowLeft size={14} />
                </button>
                <span className="text-xs text-amber-100 font-medium">
                  {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <textarea
                value={noteContent}
                onChange={handleNoteSave}
                placeholder="Write your daily note here..."
                className="flex-1 w-full bg-transparent resize-none text-xs text-amber-100 placeholder-amber-700/50 focus:outline-none scrollbar-thin scrollbar-thumb-amber-800 scrollbar-track-transparent"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default LeftSidebar;
