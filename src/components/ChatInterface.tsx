import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { geminiService, Message } from '../services/gemini';
import { motion, AnimatePresence } from 'framer-motion';

type Mood = 'very-bad' | 'bad' | 'neutral' | 'good' | 'very-good';

interface ChatInterfaceProps {
  currentMood: Mood | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ currentMood: initialMood }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(initialMood);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const triggerInitialGreeting = async () => {
      if (messages.length === 0 && !isLoading) {
        setIsLoading(true);
        const greeting = await geminiService.chat([], "(System: Begrüße den Nutzer herzlich als Therapeut. Nutze Emojis und biete deine Hilfe an. Halte dich kurz.)");
        setMessages([{ role: 'model', text: greeting || 'Hallo! 👋 Ich bin dein Therapeut. Schön, dass du da bist. Wie kann ich dir heute helfen? ✨' }]);
        setIsLoading(false);
      }
    };
    triggerInitialGreeting();
  }, []);

  const moodLabels: Record<Mood, string> = {
    'very-bad': 'sehr schlecht',
    'bad': 'schlecht',
    'neutral': 'durchwachsen',
    'good': 'gut',
    'very-good': 'sehr gut'
  };

  const handleSend = async (directMessage?: string) => {
    const messageText = directMessage || input.trim();
    if (!messageText || isLoading) return;

    if (!directMessage) setInput('');
    const updatedMessages = [...messages, { role: 'user' as const, text: messageText }];
    setMessages(updatedMessages);
    setIsLoading(true);

    const userMessageCount = messages.filter(m => m.role === 'user').length;
    const contextMessage = userMessageCount === 0 && selectedMood
      ? `(Kontext: Der Nutzer fühlt sich gerade ${moodLabels[selectedMood]}). ${messageText}`
      : messageText;

    const response = await geminiService.chat(messages, contextMessage);
    setMessages(prev => [...prev, { role: 'model', text: response || '' }]);
    setIsLoading(false);
  };

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);
    const moodMessages: Record<Mood, string> = {
      'very-bad': 'Mir geht es gerade sehr schlecht...',
      'bad': 'Mir geht es nicht so gut heute...',
      'neutral': 'Mir geht es so mittelmässig heute.',
      'good': 'Mir geht es heute gut!',
      'very-good': 'Mir geht es heute richtig gut!'
    };
    handleSend(moodMessages[mood]);
  };

  const moodOptions: { type: Mood; emoji: string; label: string }[] = [
    { type: 'very-bad', emoji: '😞', label: 'schlecht' },
    { type: 'neutral', emoji: '😐', label: 'neutral' },
    { type: 'good', emoji: '😊', label: 'gut' }
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0 flex flex-col gap-1.5 px-3 pt-2">
        <div className="bg-amber-50/60 border border-amber-200 p-2 rounded-xl">
          <p className="text-[10px] text-amber-800 leading-relaxed">
            <strong>⚠️ Wichtiger Hinweis:</strong> Dies ist eine KI-gestützte Anwendung und ersetzt keine professionelle ärztliche oder psychotherapeutische Behandlung.
          </p>
        </div>
        <div className="bg-red-50/60 border border-red-200 p-2 rounded-xl">
          <p className="text-[10px] text-red-700 leading-relaxed">
            <strong>🆘 Notfall:</strong> In akuten Krisen wende dich sofort an den <strong>Notruf 112</strong> oder die <strong>Telefonseelsorge 0800 1110111</strong>.
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-200"
      >
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col gap-2.5 p-2">
            <div className="flex flex-col items-center text-center space-y-2 py-2">
              <h2 className="text-lg font-serif italic text-slate-800">Ich bin für dich da. 👋</h2>
              <p className="text-slate-500 max-w-xs font-serif italic text-xs leading-snug">
                Schreib mir einfach, was dich gerade bewegt. Ich höre dir zu. ✨
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                <button onClick={() => handleSend("Ich fühle mich heute sehr allein...")} className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors border border-blue-100 shadow-sm">Ich fühle mich allein 🫂</button>
                <button onClick={() => handleSend("Hast du Tipps gegen akute Angst?")} className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors border border-blue-100 shadow-sm">Brauche Beruhigung 🌿</button>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((m, i) => (
            <motion.div
              key={`group-${i}`}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col w-full"
            >
              <div className={cn("flex w-full", m.role === 'user' ? "justify-end" : "justify-start")}>
                <div className={cn("flex flex-col max-w-[85%]", m.role === 'user' ? "items-end" : "items-start")}>
                  {m.role === 'model' && (
                    <span className="text-[10px] text-slate-400 font-medium px-3 mb-1 uppercase tracking-[0.15em]">Therapeut</span>
                  )}
                  <div className={cn(
                    "p-3 rounded-[20px] text-sm leading-relaxed shadow-sm",
                    m.role === 'user' ? "bg-blue-600 text-white rounded-tr-none shadow-blue-100" : "bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-md"
                  )}>
                    <div className={cn("prose prose-sm max-w-none font-sans", m.role === 'user' ? "prose-invert" : "prose-slate")}>
                      <ReactMarkdown>{m.text}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>

              {i === 0 && m.role === 'model' && messages.length === 1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex flex-col gap-2 py-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest px-1 font-medium">Wie geht es dir gerade?</p>
                  <div className="flex gap-2 flex-wrap">
                    {moodOptions.map((opt) => (
                      <button key={opt.type} onClick={() => handleMoodSelect(opt.type)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm transition-all border shadow-sm", selectedMood === opt.type ? "bg-blue-600 text-white border-blue-600 scale-105 shadow-md" : "bg-white text-slate-600 border-slate-100 hover:border-blue-200 hover:bg-blue-50/30")}>
                        <span className="text-base">{opt.emoji}</span>
                        <span className="font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}

          {isLoading && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="flex justify-start">
              <div className="flex flex-col items-start max-w-[85%]">
                <span className="text-[10px] text-slate-400 font-medium px-3 mb-1 uppercase tracking-[0.15em]">Therapeut</span>
                <div className="flex items-center gap-3 bg-white/40 backdrop-blur-sm px-4 py-2.5 rounded-full border border-white/60 shadow-sm">
                  <div className="flex space-x-1 items-center">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-2 bg-white border-t border-slate-100 shrink-0 relative z-20">
        <div className="relative flex items-end gap-2 max-w-4xl mx-auto">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Schreib etwas..."
              rows={1}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all text-slate-800 placeholder:text-slate-400 shadow-inner text-sm min-h-[48px] max-h-24 resize-none leading-normal font-sans"
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none transition-all shadow-lg active:scale-95 shrink-0 flex items-center justify-center min-h-[48px] w-[48px]"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};
