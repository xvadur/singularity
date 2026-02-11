import React, { useState, useEffect, useMemo } from 'react';
import { ChatThread, Message, Role, CalendarEvent, DashboardView } from './types';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import ChatArea from './components/ChatArea';
import { captureMessageToJarvis, sendMessageToGemini } from './services/geminiService';
import { AGENTS } from './constants';

const App: React.FC = () => {
  // --- State ---
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeGraphView, setActiveGraphView] = useState<DashboardView>('default');
  
  // Initialize with a note for today to demonstrate the red dot feature
  const todayISO = new Date().toISOString().split('T')[0];
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([
    { 
      id: '1', 
      date: todayISO, 
      text: 'Review quarterly goals\n- Check Q3 Metrics\n- Sync with Design Team' 
    },
    { 
      id: '2', 
      date: '2023-10-15', // Example past date
      text: 'Project Kickoff notes' 
    }
  ]);

  // Initialize a chat if none exists
  useEffect(() => {
    if (threads.length === 0) {
      createNewThread();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Actions ---

  const createNewThread = () => {
    const newThread: ChatThread = {
      id: Date.now().toString(),
      title: 'New Conversation',
      updatedAt: new Date(),
      messages: []
    };
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setCurrentInput('');
  };

  const activeThread = threads.find(t => t.id === activeThreadId);

  const handleSendMessage = async (text: string, agentId: string, triggerJarvisNow: boolean) => {
    if (!activeThreadId) return;

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: text,
      timestamp: new Date(),
      wordCount: wordCount
    };

    // Optimistic update
    updateThreadMessages(activeThreadId, newUserMessage);
    setCurrentInput('');
    setIsTyping(triggerJarvisNow);

    // Get Agent Instructions
    const agent = AGENTS.find(a => a.id === agentId) || AGENTS[0];
    const captureStatusText = await captureMessageToJarvis(text, activeThreadId, agentId);

    let responseText = captureStatusText;
    if (triggerJarvisNow) {
      const jarvisReply = await sendMessageToGemini(
        activeThread?.messages || [],
        text,
        agent.systemInstruction,
        activeThreadId
      );
      responseText = captureStatusText.startsWith('Error:')
        ? `${captureStatusText}\n\nJarvis: ${jarvisReply}`
        : jarvisReply;
    }

    const newBotMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: Role.MODEL,
      text: responseText,
      timestamp: new Date(),
      wordCount: responseText.trim().split(/\s+/).filter(Boolean).length
    };

    updateThreadMessages(activeThreadId, newBotMessage);
    setIsTyping(false);
  };

  const updateThreadMessages = (threadId: string, message: Message) => {
    setThreads(prev => prev.map(t => {
      if (t.id === threadId) {
        // Update title if it's the first user message
        const newTitle = t.messages.length === 0 && message.role === Role.USER 
          ? (message.text.slice(0, 25) + (message.text.length > 25 ? '...' : ''))
          : t.title;

        return {
          ...t,
          title: newTitle,
          updatedAt: new Date(),
          messages: [...t.messages, message]
        };
      }
      return t;
    }));
  };

  // --- Statistics Calculation ---

  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    // Get all messages from all threads to calculate stats properly? 
    // Usually stats are global or per active thread. Let's do global as implied by "my activity".
    
    let wordsSent24h = 0;
    let promptsSent24h = 0;
    const hourlyActivityMap = new Array(24).fill(0);

    threads.forEach(thread => {
      thread.messages.forEach(msg => {
        if (msg.role === Role.USER) {
          const msgTime = new Date(msg.timestamp).getTime();
          if (msgTime >= startOfDay) {
            wordsSent24h += msg.wordCount;
            promptsSent24h += 1;
            
            const hour = new Date(msg.timestamp).getHours();
            hourlyActivityMap[hour] += msg.wordCount;
          }
        }
      });
    });

    const hourlyActivity = hourlyActivityMap.map((words, hour) => ({ hour, words }));

    return {
      wordsSent: wordsSent24h,
      promptsSent: promptsSent24h,
      hourlyActivity
    };
  }, [threads]);

  const currentThreadPromptCount = activeThread 
    ? activeThread.messages.filter(m => m.role === Role.USER).length 
    : 0;

  const currentPromptWords = currentInput.trim().split(/\s+/).filter(Boolean).length;

  // Flatten all messages for the global timeline
  const allMessages = useMemo(() => {
    return threads.flatMap(t => t.messages);
  }, [threads]);

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans">
      {/* Left Sidebar */}
      <LeftSidebar 
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={setActiveThreadId}
        onNewThread={createNewThread}
        calendarEvents={calendarEvents}
        onUpdateCalendar={setCalendarEvents}
        onSelectGraphView={setActiveGraphView}
      />

      {/* Main Chat Area */}
      <ChatArea 
        activeThreadId={activeThreadId}
        messages={activeThread?.messages || []}
        onSendMessage={handleSendMessage}
        isTyping={isTyping}
        currentInput={currentInput}
        onInputChange={setCurrentInput}
      />

      {/* Right Sidebar */}
      <RightSidebar 
        messages={allMessages}
        todaysStats={stats}
        currentPromptWordCount={currentPromptWords}
        currentThreadPromptCount={currentThreadPromptCount}
        activeGraphView={activeGraphView}
      />
    </div>
  );
};

export default App;
