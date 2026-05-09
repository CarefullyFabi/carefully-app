import React from 'react';
import { ChatInterface } from './components/ChatInterface';

export default function App() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-hidden flex flex-col">
      {/* Hintergrund-Effekte */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#E3F2FD] blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#FFF3E0] blur-[140px] opacity-70" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto w-full px-4 md:px-10 pt-10 flex flex-col h-[100dvh] overflow-hidden">
        <header className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
          <div>
            <h1 className="text-xl font-medium text-slate-800 italic font-serif">Carefully</h1>
            <p className="text-[10px] text-blue-600 font-medium uppercase tracking-[0.2em]">Fabi Begleitung</p>
          </div>
          <a href="tel:112" className="bg-red-50 text-red-600 border border-red-100 px-4 py-2 rounded-full text-[10px] font-bold uppercase flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Notruf 112
          </a>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatInterface currentMood={null} />
        </main>

        <footer className="shrink-0 flex justify-center py-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">© by Fabian Matthey</p>
        </footer>
      </div>
    </div>
  );
}
