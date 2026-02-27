import React, { useState, useEffect } from 'react';
import { Folder as FolderIcon, Plus, Trash2, ChevronRight, ChevronDown, Tag, Search, Settings as SettingsIcon, Zap } from 'lucide-react';
import { Folder } from '../types';

interface SidebarProps {
  folders: Folder[];
  activeFolder: number | null;
  onSelectFolder: (id: number | null) => void;
  onCreateFolder: (name: string, parentId: number | null) => void;
  onDeleteFolder: (id: number) => void;
  onSelectTag: (tag: string | null) => void;
  activeTag: string | null;
  allTags: string[];
  onOpenSettings: () => void;
}

export default function Sidebar({
  folders,
  activeFolder,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onSelectTag,
  activeTag,
  allTags,
  onOpenSettings
}: SidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName, null);
      setNewFolderName('');
      setIsCreating(false);
    }
  };

  const filteredTags = allTags.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="w-64 h-full glass border-r border-white/10 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-display font-bold bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
          Prompt Vault
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-6">
        {/* Folders Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Папки</span>
            <button 
              onClick={() => setIsCreating(true)}
              className="p-1 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {isCreating && (
            <form onSubmit={handleCreate} className="px-2 mb-2">
              <input
                autoFocus
                className="w-full bg-zinc-900 border border-indigo-500/50 rounded px-2 py-1 text-sm focus:outline-none"
                placeholder="Название папки..."
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onBlur={() => !newFolderName && setIsCreating(false)}
              />
            </form>
          )}

          <div className="space-y-1">
            <button
              onClick={() => { onSelectFolder(null); onSelectTag(null); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                activeFolder === null && activeTag === null ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <FolderIcon size={16} />
              <span>Все промты</span>
            </button>
            
            {folders.map(folder => (
              <div key={folder.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors relative">
                <button
                  onClick={() => { onSelectFolder(folder.id); onSelectTag(null); }}
                  className={`flex-1 flex items-center gap-2 text-left ${
                    activeFolder === folder.id ? 'text-indigo-300' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <FolderIcon size={16} />
                  <span className="truncate">{folder.name}</span>
                </button>
                <button 
                  onClick={() => onDeleteFolder(folder.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tags Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Теги</span>
            <Search size={12} className="text-zinc-500" />
          </div>
          
          <div className="px-2 mb-2">
            <input
              className="w-full bg-zinc-900/50 border border-white/5 rounded px-2 py-1 text-xs focus:outline-none focus:border-white/20"
              placeholder="Поиск тегов..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-1 px-2">
            {filteredTags.map(tag => (
              <button
                key={tag}
                onClick={() => { onSelectTag(tag); onSelectFolder(null); }}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                  activeTag === tag 
                    ? 'bg-indigo-500 text-white' 
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-white/10 space-y-2">
        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <SettingsIcon size={16} />
          <span>Настройки</span>
        </button>
      </div>
    </div>
  );
}
