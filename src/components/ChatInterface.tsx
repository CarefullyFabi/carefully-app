import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { geminiService, type Message as GeminiMessage } from '../services/gemini';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type Mood = 'very-bad' | 'neutral' | 'good';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  currentMood: string | null;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hallo, schön dass du da bist. Ich bin hier, um dir zuzuhören und dich zu begleiten. Was beschäftigt dich gerade?',
  timestamp: new Date(),
};

const moodOptions: { type: Mood; emoji: string; label: string }[] = [
  { type: 'very-bad', emoji: '😞', label: 'schlecht' },
  { type: 'neutral', emoji: '😐', label: 'neutral' },
  { type: 'good', emoji: '😊', label: 'gut' },
];

const moodMessages: Record<Mood, string> = {
  'very-bad': 'Mir geht es gerade sehr schlecht...',
  'neutral': 'Mir geht es so mittelmässig heute.',
  'good': 'Mir geht es heute gut!',
};

export function ChatInterface({ currentMood }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = async (directMessage?: string) => {
    const trimmed = directMessage || input.trim();
    if (!trimmed || isTyping) return;

    if (!directMessage) setInput('');

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const history: GeminiMessage[] = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.content,
        }));

      const replyText = await geminiService.chat(history, trimmed);

      const reply: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
    } catch {
      const errorMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Entschuldige, ich habe gerade Schwierigkeiten. Bitte versuche es nochmal.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood);
    handleSend(moodMessages[mood]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showMoodButtons = messages.length === 1 && messages[0].id === 'welcome' && !isTyping;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 flex flex-col gap-1.5 px-3 pt-2 chat-notices">
        <div className="bg-amber-50/60 border border-amber-200 p-2 rounded-xl">
          <p className="text-[0.625rem] text-amber-800 leading-relaxed">
            <strong>Wichtiger Hinweis:</strong> Dies ist eine KI-gestützte Anwendung und ersetzt keine professionelle ärztliche oder psychotherapeutische Behandlung.
          </p>
        </div>
        <div className="bg-red-50/60 border border-red-200 p-2 rounded-xl">
          <p className="text-[0.625rem] text-red-700 leading-relaxed">
            <strong>Notfall:</strong> In akuten Krisen wende dich sofort an den <strong>Notruf 112</strong> oder die <strong>Telefonseelsorge 0800 1110111</strong>.
          </p>
        </div>
        <p className="text-[0.5625rem] text-gray-400 text-left leading-relaxed px-2 privacy-notice">
          Die Chats sind privat. Sie werden weder mitgelesen noch gespeichert. Beim schließen des Chatfensters werden sämtliche Daten gelöscht.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1 scroll-smooth overscroll-contain"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent', WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex flex-col gap-3 py-2 px-1 min-h-full justify-end">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col w-full"
              >
                <div
                  className={cn(
                    'flex w-full',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] sm:max-w-[80%] md:max-w-[75%] lg:max-w-[65%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md shadow-sm shadow-blue-200/50'
                        : 'bg-white/80 text-slate-700 rounded-bl-md shadow-sm border border-slate-100/80 backdrop-blur-sm'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-slate max-w-none [&_p]:m-0 [&_p+p]:mt-2">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>

                {i === 0 && msg.id === 'welcome' && showMoodButtons && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-col gap-2 py-3 px-1"
                  >
                    <p className="text-[0.625rem] text-slate-400 uppercase tracking-widest font-medium">Wie geht es dir gerade?</p>
                    <div className="flex gap-2 flex-wrap">
                      {moodOptions.map((opt) => (
                        <button
                          key={opt.type}
                          onClick={() => handleMoodSelect(opt.type)}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm transition-all border shadow-sm',
                            selectedMood === opt.type
                              ? 'bg-blue-600 text-white border-blue-600 scale-105 shadow-md'
                              : 'bg-white text-slate-600 border-slate-100 hover:border-blue-200 hover:bg-blue-50/30'
                          )}
                        >
                          <span className="text-base">{opt.emoji}</span>
                          <span className="font-medium">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="flex justify-start"
              >
                <div className="bg-white/80 border border-slate-100/80 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="block w-1.5 h-1.5 rounded-full bg-slate-300"
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: i * 0.2,
                          ease: 'easeInOut',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="shrink-0 pt-3 pb-[env(safe-area-inset-bottom)] chat-input-area">
        <div className="flex items-end gap-2 bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl px-3 py-2 shadow-sm transition-shadow focus-within:shadow-md focus-within:border-blue-200/60">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Schreib mir, was dich bewegt..."
            rows={1}
            className="flex-1 bg-transparent text-base md:text-sm text-slate-700 placeholder:text-slate-400 resize-none outline-none py-1.5 leading-relaxed max-h-[7.5rem]"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className={cn(
              'shrink-0 flex items-center justify-center w-9 h-9 rounded-xl transition-colors',
              input.trim()
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200/50 hover:bg-blue-700'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            )}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
