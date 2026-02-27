import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Grid, List as ListIcon, History as HistoryIcon, FolderPlus, Tag as TagIcon, ArrowRight, Trash2, Download, PanelLeftClose, PanelLeftOpen, Star } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Sidebar from './components/Sidebar';
import PromptCard from './components/PromptCard';
import CreatePromptModal from './components/CreatePromptModal';
import ExpandedPromptView from './components/ExpandedPromptView';
import QuickPrompts from './components/QuickPrompts';
import SettingsModal from './components/SettingsModal';
import { Folder, Prompt, Generation } from './types';
import { api } from './services/api';

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortablePromptCard(props: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.prompt.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return <PromptCard ref={setNodeRef} style={style} {...attributes} {...listeners} {...props} />;
}

export default function App() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [activeFolder, setActiveFolder] = useState<number | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'history'>('grid');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  const [user, setUser] = useState<{ email: string; name: string } | null>(null);

  useEffect(() => {
    loadData();
    const savedUser = localStorage.getItem('google_user');
    if (savedUser) setUser(JSON.parse(savedUser));

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { tokens } = event.data;
        localStorage.setItem('google_tokens', JSON.stringify(tokens));
        // Fetch user info with access token
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        })
        .then(res => res.json())
        .then(userData => {
          const userObj = { email: userData.email, name: userData.name };
          setUser(userObj);
          localStorage.setItem('google_user', JSON.stringify(userObj));
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogin = async () => {
    const res = await fetch('/api/auth/google/url');
    const { url } = await res.json();
    window.open(url, 'google_login', 'width=500,height=600');
  };

  const handleLogout = () => {
    localStorage.removeItem('google_tokens');
    localStorage.removeItem('google_user');
    setUser(null);
  };

  const loadData = async () => {
    const [f, p, g] = await Promise.all([
      api.getFolders(),
      api.getPrompts(),
      api.getGenerations()
    ]);
    setFolders(f);
    const sortedPrompts = p.sort((a, b) => a.sort_order - b.sort_order);
    setPrompts(sortedPrompts);
    setGenerations(g);
  };

  const handleCreateFolder = async (name: string, parentId: number | null) => {
    await api.createFolder(name, parentId);
    loadData();
  };

  const handleDeleteFolder = async (id: number) => {
    if (confirm('Are you sure you want to delete this folder? Prompts will be moved to "All Prompts".')) {
      await api.deleteFolder(id);
      loadData();
    }
  };

  const handleCreatePrompt = async (formData: FormData) => {
    await api.createPrompt(formData);
    setIsCreateModalOpen(false);
    loadData();
  };

  const handleDeletePrompt = async (id: number) => {
    if (confirm('Delete this prompt?')) {
      await api.deletePrompt(id);
      loadData();
    }
  };

  const handleDeleteGeneration = async (id: number) => {
    if (confirm('Удалить это изображение?')) {
      await api.deleteGeneration(id);
      loadData();
    }
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const overId = over.id;
      setPrompts((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === overId);
        if (oldIndex === -1 || newIndex === -1) return items;
        const newOrder = arrayMove(items, oldIndex, newIndex);
        api.reorderPrompts(newOrder.map((p: Prompt) => p.id));
        return newOrder;
      });
    }
  };

  const toggleFavorite = async (promptId: number, isFavorite: boolean) => {
    await api.toggleFavorite(promptId, isFavorite);
    setPrompts(prompts.map(p => p.id === promptId ? { ...p, is_favorite: isFavorite } : p));
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    prompts.forEach(p => p.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    return prompts.filter(p => {
      if (p.is_fast_prompt) return false; // Fast Prompts are not shown in main grid
      if (activeFilter === 'favorites' && !p.is_favorite) return false;
      const matchesFolder = activeFolder === null || p.folder_id === activeFolder;
      const matchesTag = activeTag === null || p.tags.includes(activeTag);
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.text.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFolder && matchesTag && matchesSearch;
    });
  }, [prompts, activeFolder, activeTag, searchQuery]);

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden text-zinc-100">
      <motion.div
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 256 : 0,
          opacity: isSidebarOpen ? 1 : 0,
          x: isSidebarOpen ? 0 : -20
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="h-full overflow-hidden"
      >
        <Sidebar 
          folders={folders}
          activeFolder={activeFolder}
          onSelectFolder={setActiveFolder}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
          onSelectTag={setActiveTag}
          activeTag={activeTag}
          allTags={allTags}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </motion.div>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Bar */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-zinc-950/50 backdrop-blur-md z-20">
          <div className="flex items-center gap-6 flex-1 max-w-2xl">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
              title={isSidebarOpen ? "Скрыть панель" : "Показать панель"}
            >
              {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700'}`}
              >
                Все
              </button>
              <button 
                onClick={() => setActiveFilter('favorites')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${activeFilter === 'favorites' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700'}`}
              >
                <Star size={12} /> Избранное
              </button>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                className="w-full bg-zinc-900/50 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500/50 transition-all"
                placeholder="Поиск промтов, тегов или контента..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex bg-zinc-900 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Grid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('history')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'history' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <HistoryIcon size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-white">{user.name}</p>
                  <button onClick={handleLogout} className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors">Выйти</button>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
                  {user.name[0]}
                </div>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="text-xs font-bold text-zinc-400 hover:text-white transition-colors"
              >
                Войти через Google
              </button>
            )}
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg shadow-indigo-600/20 transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={18} />
              Новый промт
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div 
                key="grid"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
              >
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={filteredPrompts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    {filteredPrompts.map(prompt => (
                      <SortablePromptCard 
                        key={prompt.id}
                        prompt={prompt}
                        generations={generations}
                        isSelected={selectedPrompt?.id === prompt.id}
                        onClick={() => setSelectedPrompt(prompt)}
                        onEdit={() => setEditingPrompt(prompt)}
                        onDelete={() => handleDeletePrompt(prompt.id)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                
                {filteredPrompts.length === 0 && (
                  <div className="col-span-full py-40 text-center">
                    <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search size={32} className="text-zinc-700" />
                    </div>
                    <h3 className="text-xl font-display font-bold text-zinc-400">Промты не найдены</h3>
                    <p className="text-zinc-600 mt-2">Попробуйте изменить параметры поиска или фильтры</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <h2 className="text-2xl font-display font-bold">Глобальная история генераций</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {generations.map(gen => (
                    <div key={gen.id} className="group relative aspect-square rounded-xl overflow-hidden border border-white/5 shadow-lg">
                      <img src={gen.image_path} className="w-full h-full object-cover" alt="Gen" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center p-4 transition-opacity text-center">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase mb-2">
                          {new Date(gen.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => {
                              const p = prompts.find(pr => pr.id === gen.prompt_id);
                              if (p) setSelectedPrompt(p);
                            }}
                            className="text-xs text-white hover:underline flex items-center justify-center gap-1"
                          >
                            Посмотреть промт <ArrowRight size={10} />
                          </button>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const response = await fetch(gen.image_path);
                                const blob = await response.blob();
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `gen-${gen.id}.png`;
                                link.click();
                                URL.revokeObjectURL(url);
                              } catch (err) {
                                console.error("Download failed:", err);
                              }
                            }}
                            className="text-xs text-indigo-300 hover:text-indigo-100 flex items-center justify-center gap-1"
                          >
                            Скачать <Download size={10} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGeneration(gen.id);
                            }}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center justify-center gap-1"
                          >
                            Удалить <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Prompts Overlay */}
        <QuickPrompts prompts={prompts} />
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <CreatePromptModal 
            folders={folders}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreatePrompt}
          />
        )}
        {editingPrompt && (
          <CreatePromptModal 
            folders={folders}
            initialData={editingPrompt}
            onClose={() => setEditingPrompt(null)}
            onSubmit={async (formData) => {
              await api.updatePrompt(editingPrompt.id, formData);
              setEditingPrompt(null);
              loadData();
            }}
          />
        )}
        {selectedPrompt && (
          <ExpandedPromptView 
            prompt={selectedPrompt}
            generations={generations}
            allPrompts={prompts}
            onClose={() => setSelectedPrompt(null)}
            onNewGeneration={(gen) => setGenerations([gen, ...generations])}
            onDeleteGeneration={handleDeleteGeneration}
          />
        )}
        {isSettingsOpen && (
          <SettingsModal onClose={() => setIsSettingsOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
