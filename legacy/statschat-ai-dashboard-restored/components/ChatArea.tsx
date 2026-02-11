import React, { useRef, useEffect, useState } from 'react';
import { Message, Role } from '../types';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { AGENTS } from '../constants';

interface ChatAreaProps {
  activeThreadId: string | null;
  messages: Message[];
  onSendMessage: (text: string, agentId: string, triggerJarvisNow: boolean) => Promise<void> | void;
  isTyping: boolean;
  onInputChange: (text: string) => void;
  currentInput: string;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  activeThreadId,
  messages,
  onSendMessage,
  isTyping,
  onInputChange,
  currentInput
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(AGENTS[0].id);
  const [jarvisArmed, setJarvisArmed] = useState(false);

  const selectedAgent = AGENTS.find(a => a.id === selectedAgentId) || AGENTS[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (currentInput.trim() && !isTyping) {
      const triggerNow = jarvisArmed;
      if (triggerNow) setJarvisArmed(false); // one-shot toggle
      await onSendMessage(currentInput, selectedAgentId, triggerNow);
    }
  };

  if (!activeThreadId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-blue-300 opacity-50 bg-dashboard-bg">
        <Bot size={64} strokeWidth={1} />
        <p className="mt-4 text-xl">Select or start a new chat</p>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col h-full relative bg-dashboard-bg">
      {/* Agent Toggler / Header */}
      <div className="h-16 border-b border-panel-border flex items-center justify-between px-6 bg-dashboard-bg z-20">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${selectedAgent.color} shadow-lg shadow-purple-900/20`}>
            <Sparkles size={16} className="text-white" />
          </div>
          <span className="font-bold text-white tracking-wide text-lg">StatsChat AI</span>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-800/60 py-1.5 px-3 rounded-lg border border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Agent:</span>
            <select 
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="bg-transparent text-sm text-white font-semibold focus:outline-none cursor-pointer min-w-[120px]"
            >
              {AGENTS.map(agent => (
                <option key={agent.id} value={agent.id} className="bg-slate-800 text-white">
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-6 bg-slate-600/70" />

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Jarvis</span>
            <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${jarvisArmed ? 'bg-emerald-500/80' : 'bg-slate-600'}`}>
              <input
                type="checkbox"
                checked={jarvisArmed}
                onChange={(e) => setJarvisArmed(e.target.checked)}
                className="sr-only"
              />
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${jarvisArmed ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </span>
            <span className={`text-[11px] font-semibold ${jarvisArmed ? 'text-emerald-300' : 'text-slate-400'}`}>
              {jarvisArmed ? 'ON (next)' : 'OFF'}
            </span>
          </label>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
             <div className="w-24 h-24 border-2 border-dashed border-slate-700 rounded-full flex items-center justify-center bg-slate-800/30">
               <Bot size={32} />
             </div>
             <p className="font-medium">Start writing to track your stats...</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 max-w-3xl ${msg.role === Role.USER ? 'ml-auto flex-row-reverse' : ''}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
              msg.role === Role.USER ? 'bg-indigo-600' : selectedAgent.color
            }`}>
              {msg.role === Role.USER ? <User size={20} className="text-white" /> : <Bot size={20} className="text-white" />}
            </div>
            
            <div className={`flex flex-col ${msg.role === Role.USER ? 'items-end' : 'items-start'}`}>
              <div className={`px-5 py-3.5 rounded-2xl shadow-lg text-sm leading-relaxed whitespace-pre-wrap max-w-full ${
                msg.role === Role.USER 
                  ? 'bg-indigo-600 text-white rounded-tr-sm' 
                  : 'bg-slate-700/60 text-slate-100 rounded-tl-sm border border-slate-600/50 backdrop-blur-sm'
              }`}>
                {msg.text}
              </div>
              {msg.role === Role.USER && (
                <span className="text-[10px] text-slate-500 mt-1.5 font-mono">
                  {msg.wordCount} words • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex gap-4 max-w-3xl">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selectedAgent.color} animate-pulse`}>
                 <Bot size={20} className="text-white" />
              </div>
              <div className="bg-slate-700/40 px-6 py-4 rounded-2xl rounded-tl-sm text-slate-400 text-sm flex items-center gap-1.5 border border-slate-700/50">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area (Gray Box from sketch) */}
      <div className="p-6 pt-2 bg-dashboard-bg">
        <div className="bg-[#9ca3af] p-2 rounded-xl shadow-2xl relative">
          
          {/* Toolbar/Header of Input */}
          <div className="flex justify-between items-center px-1 mb-2">
             <div className="bg-gray-800 text-gray-200 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Input Prompt</div>
             <div className="text-[10px] font-mono font-bold text-gray-800 bg-white/30 px-2 py-0.5 rounded border border-white/20">
               WORD COUNT: {currentInput.trim().split(/\s+/).filter(Boolean).length}
             </div>
          </div>

          <textarea
            value={currentInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your prompt here..."
            className="w-full h-32 bg-[#d1d5db] text-gray-900 placeholder-gray-600 p-3 rounded-lg resize-none focus:outline-none focus:bg-[#e5e7eb] transition-colors text-sm font-medium border-2 border-transparent focus:border-gray-400"
          />
          
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSend}
              disabled={!currentInput.trim() || isTyping}
              className="bg-[#9f1239] hover:bg-[#be123c] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-5 rounded-lg shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 border border-white/10"
            >
               <span className="font-bold text-xs tracking-wide">{jarvisArmed ? 'SEND + JARVIS' : 'SEND'}</span>
               <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ChatArea;
