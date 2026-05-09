import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Heart, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

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

export function ChatInterface({ currentMood }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const reply: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: getReply(trimmed),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1 scroll-smooth"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
      >
        <div className="flex flex-col gap-3 py-2">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
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

      <div className="shrink-0 pt-3">
        <div className="flex items-end gap-2 bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl px-3 py-2 shadow-sm transition-shadow focus-within:shadow-md focus-within:border-blue-200/60">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Schreib mir, was dich bewegt..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 resize-none outline-none py-1.5 leading-relaxed max-h-[120px]"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleSend}
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

function getReply(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  if (lower.match(/traurig|weinen|schlecht|down|einsam|allein/)) {
    return 'Es tut mir leid, dass du dich so fühlst. Es ist völlig in Ordnung, traurig zu sein — das zeigt, dass dir etwas wichtig ist. Magst du mir mehr darüber erzählen?';
  }
  if (lower.match(/angst|sorge|panik|stress|überfordert|nervös/)) {
    return 'Das klingt belastend. Lass uns zusammen einen Moment innehalten. Versuch einmal, tief ein- und auszuatmen. Was genau macht dir gerade am meisten Sorgen?';
  }
  if (lower.match(/gut|super|toll|freude|glücklich|happy|froh/)) {
    return 'Das freut mich sehr zu hören! Was hat dir heute besonders gutgetan? Manchmal hilft es, sich die schönen Momente bewusst zu machen.';
  }
  if (lower.match(/danke|dankbar/)) {
    return 'Gerne. Ich bin immer hier, wenn du mich brauchst. Gibt es noch etwas, worüber du reden möchtest?';
  }
  if (lower.match(/hallo|hi|hey|moin|servus|grüß/)) {
    return 'Schön, von dir zu hören. Wie geht es dir gerade? Nimm dir ruhig Zeit, es gibt hier keinen Druck.';
  }
  return 'Danke, dass du das mit mir teilst. Magst du mir noch etwas mehr darüber erzählen? Ich höre dir gerne zu.';
}
