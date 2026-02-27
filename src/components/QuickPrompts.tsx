import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ChevronRight, Copy, Check } from 'lucide-react';
import { Prompt } from '../types';

interface QuickPromptsProps {
  prompts: Prompt[];
}

export default function QuickPrompts({ prompts }: QuickPromptsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fastPrompts = prompts.filter(p => p.is_fast_prompt);

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (fastPrompts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="glass w-72 max-h-[60vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl border-white/10"
          >
            <div className="p-4 border-b border-white/10 bg-zinc-900/50 flex items-center gap-2">
              <Zap size={16} className="text-amber-400" fill="currentColor" />
              <span className="text-sm font-bold uppercase tracking-wider">Быстрые промты</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {fastPrompts.map(p => (
                <button
                  key={p.id}
                  onClick={() => copyToClipboard(p.text, p.id)}
                  className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-all group relative"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-zinc-300 truncate pr-6">{p.title}</span>
                    <div className="text-zinc-500 group-hover:text-indigo-400 transition-colors">
                      {copiedId === p.id ? <Check size={14} /> : <Copy size={14} />}
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 line-clamp-2 font-mono leading-relaxed">
                    {p.text}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 rounded-full shadow-2xl transition-all transform hover:scale-110 active:scale-95 flex items-center gap-2 ${
          isOpen ? 'bg-zinc-800 text-white' : 'bg-indigo-600 text-white'
        }`}
      >
        <Zap size={24} fill={isOpen ? 'none' : 'currentColor'} />
        {isOpen && <ChevronRight size={20} />}
        {!isOpen && <span className="text-sm font-bold pr-2">Быстрый доступ</span>}
      </button>
    </div>
  );
}
