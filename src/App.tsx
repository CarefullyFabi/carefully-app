import React from 'react';
import { ChatInterface } from './components/ChatInterface';

export default function App() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-hidden flex flex-col">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#E3F2FD] blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#FFF3E0] blur-[140px] opacity-70" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[40%] rounded-full bg-[#E0F2F1] blur-[100px] opacity-50" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto w-full px-3 md:px-10 pt-4 md:pt-8 flex flex-col h-[100dvh] overflow-hidden">
        <header className="flex flex-col items-center mb-2 md:mb-4 shrink-0">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-medium text-slate-800 tracking-tight italic font-serif leading-tight">Carefully</h1>
            <p className="text-[9px] md:text-[10px] text-blue-600 font-medium uppercase tracking-[0.15em] mt-0.5 leading-tight">Dein persönlicher Begleiter bei Ängsten, Depressionen, Psychosen</p>
          </div>
          <a href="tel:112" className="mt-2 bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-red-100 transition-colors flex items-center gap-2 shadow-sm shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Notruf 112
          </a>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          <ChatInterface currentMood={null} />
        </main>

        <footer className="shrink-0 flex justify-center items-center py-2 border-t border-slate-200/50">
          <p className="text-[10px] text-slate-400 font-medium tracking-wider">
            © ❤️ mit Liebe gemacht von Fabian Matthey
          </p>
        </footer>
      </div>
    </div>
  );
}
