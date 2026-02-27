import React, { forwardRef } from 'react';
import { motion } from 'motion/react';
import { Prompt, Generation } from '../types';
import { MoreVertical, Zap, Folder, Trash2, Star } from 'lucide-react';

interface PromptCardProps {
  prompt: Prompt;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onToggleFavorite: (id: number, isFavorite: boolean) => void;
  generations: Generation[];
  isSelected?: boolean;
  style?: React.CSSProperties;
}

const PromptCard = forwardRef<HTMLDivElement, PromptCardProps>(({ prompt, onClick, onEdit, onDelete, onToggleFavorite, generations, isSelected, style }, ref) => {
  const promptGens = generations.filter(g => g.prompt_id === prompt.id).slice(0, 4);

  return (
    <motion.div
      ref={ref}
      style={style}
      onClick={onClick}
      className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-lg transition-all duration-500 border ${
        isSelected 
          ? 'border-indigo-500 ring-4 ring-indigo-500/20 shadow-indigo-500/40' 
          : 'border-white/5 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10'
      }`}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Background */}
      <div 
        className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
        style={{ backgroundColor: prompt.image_path ? 'transparent' : (prompt.bg_color || '#18181b') }}
      >
        {prompt.image_path && (
          <img 
            src={prompt.image_path} 
            className="w-full h-full object-cover" 
            alt={prompt.title}
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      {/* Glow Effect on Hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

      {/* Content */}
      <div className="absolute inset-0 p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="flex gap-1">
            {prompt.is_fast_prompt && (
              <div className="bg-amber-500/20 text-amber-400 p-1 rounded-md backdrop-blur-md border border-amber-500/30">
                <Zap size={12} fill="currentColor" />
              </div>
            )}
            {prompt.folder_id && (
              <div className="bg-white/10 text-white/70 p-1 rounded-md backdrop-blur-md border border-white/10">
                <Folder size={12} />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                onToggleFavorite(prompt.id, !prompt.is_favorite); 
              }}
              className={`p-1.5 rounded-md transition-all ${prompt.is_favorite ? 'text-amber-400 bg-amber-500/20' : 'text-zinc-400 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white'}`}
              title={prompt.is_favorite ? "Убрать из избранного" : "Добавить в избранное"}
            >
              <Star size={14} fill={prompt.is_favorite ? 'currentColor' : 'none'} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(e); }}
              className="p-1.5 bg-zinc-900/50 hover:bg-zinc-800 rounded-md transition-all text-zinc-300 hover:text-white"
              title="Редактировать"
            >
              <MoreVertical size={14} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(e); }}
              className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/20 hover:bg-red-500/40 rounded-md transition-all text-red-400 hover:text-red-300"
              title="Удалить"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-display font-bold text-white leading-tight drop-shadow-md">
            {prompt.overlay_text || prompt.title}
          </h3>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {prompt.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[9px] font-bold uppercase tracking-wider text-white/50 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                {tag}
              </span>
            ))}
            {prompt.tags.length > 2 && (
              <span className="text-[9px] font-bold text-white/30">+{prompt.tags.length - 2}</span>
            )}
          </div>

          {/* Mini History */}
          {promptGens.length > 0 && (
            <div className="flex gap-1 pt-1">
              {promptGens.map(gen => (
                <div key={gen.id} className="w-6 h-6 rounded-sm overflow-hidden border border-white/10">
                  <img src={gen.image_path} className="w-full h-full object-cover" alt="Gen" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export default React.memo(PromptCard);
