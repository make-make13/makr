import React, { useState, useRef } from 'react';
import { X, Plus, Image as ImageIcon, Type, Palette, Check, Trash2 } from 'lucide-react';
import { PRESET_COLORS, PromptVariable, Prompt } from '../types';

interface CreatePromptModalProps {
  onClose: () => void;
  onSubmit: (formData: FormData) => void;
  folders: { id: number, name: string }[];
  initialData?: Prompt;
}

export default function CreatePromptModal({ onClose, onSubmit, folders, initialData }: CreatePromptModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [text, setText] = useState(initialData?.text || '');
  const [variables, setVariables] = useState<PromptVariable[]>(initialData?.variables || []);
  const [bgColor, setBgColor] = useState(initialData?.bg_color || PRESET_COLORS[0]);
  const [overlayText, setOverlayText] = useState(initialData?.overlay_text || '');
  const [folderId, setFolderId] = useState<string>(initialData?.folder_id?.toString() || '');
  const [isFastPrompt, setIsFastPrompt] = useState(initialData?.is_fast_prompt || false);
  const [tags, setTags] = useState(initialData?.tags.join(', ') || '');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_path || null);
  const [selection, setSelection] = useState<{ start: number, end: number, text: string } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleTextSelect = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        const selectedText = text.substring(start, end);
        setSelection({ start, end, text: selectedText });
      } else {
        setSelection(null);
      }
    }
  };

  const addVariable = () => {
    if (selection) {
      if (!variables.find(v => v.start === selection.start && v.end === selection.end)) {
        setVariables([...variables, { start: selection.start, end: selection.end, text: selection.text }]);
      }
      
      // Clear selection in textarea
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(selection.end, selection.end);
        textareaRef.current.focus();
      }
      setSelection(null);
    }
  };

  const removeVariable = (v: PromptVariable) => {
    setVariables(variables.filter(item => item !== v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('text', text);
      formData.append('variables', JSON.stringify(variables));
      formData.append('bg_color', bgColor);
      formData.append('overlay_text', overlayText);
      formData.append('folder_id', folderId || '');
      formData.append('is_fast_prompt', String(isFastPrompt));
      formData.append('tags', JSON.stringify(tags.split(',').map(t => t.trim()).filter(t => t)));
      if (image) formData.append('image', image);

      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting prompt:', error);
      alert('Ошибка при сохранении промта. Пожалуйста, попробуйте еще раз.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl flex flex-col">
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-zinc-950/80 backdrop-blur-md z-10">
          <h2 className="text-xl font-display font-bold">{initialData ? 'Редактировать промт' : 'Создать новый промт'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Заголовок</label>
              <input
                required
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Введите название промта..."
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Текст промта</label>
                  {selection && (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 animate-pulse">
                      Выбрано: "{selection.text}"
                    </span>
                  )}
                </div>
                {selection && (
                  <button
                    type="button"
                    onClick={addVariable}
                    className="text-[10px] bg-indigo-500 hover:bg-indigo-600 text-white px-2 py-0.5 rounded flex items-center gap-1 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
                  >
                    <Plus size={10} /> Сделать вариативным
                  </button>
                )}
              </div>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  required
                  rows={6}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors font-mono text-sm leading-relaxed"
                  placeholder="Введите текст промта. Выделите текст, чтобы сделать его переменной..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onSelect={handleTextSelect}
                />
              </div>
              
              {variables.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold w-full">Переменные:</span>
                  {variables.map((v, i) => (
                    <span key={i} className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-xs border border-indigo-500/30">
                      {v.text}
                      <button type="button" onClick={() => removeVariable(v)} className="hover:text-white">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Папка</label>
                <select
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  value={folderId}
                  onChange={e => setFolderId(e.target.value)}
                >
                  <option value="">Нет</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Теги</label>
                <input
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  placeholder="арт, фото, 3д..."
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isFastPrompt ? 'bg-indigo-500 border-indigo-500' : 'border-white/20 group-hover:border-white/40'}`}>
                {isFastPrompt && <Check size={14} />}
              </div>
              <input type="checkbox" className="hidden" checked={isFastPrompt} onChange={e => setIsFastPrompt(e.target.checked)} />
              <span className="text-sm text-zinc-300">Быстрый промт (Fast Prompt)</span>
            </label>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Карточка превью</label>
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`aspect-square rounded-xl overflow-hidden relative flex items-center justify-center border-2 transition-all shadow-2xl ${
                  isDragging ? 'border-indigo-500 border-dashed bg-indigo-500/10 scale-105' : 'border-white/10'
                }`}
                style={{ backgroundColor: imagePreview ? 'transparent' : bgColor }}
              >
                {imagePreview ? (
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="p-6 text-center">
                    <span className="text-2xl font-display font-bold text-white/90 drop-shadow-lg">
                      {overlayText || title || 'Превью'}
                    </span>
                    {isDragging && (
                      <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/20 backdrop-blur-sm">
                        <span className="text-sm font-bold text-white">Отпустите для загрузки</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-lg p-3 flex items-center justify-center gap-2 transition-all">
                  <ImageIcon size={18} />
                  <span className="text-sm">Загрузить изображение</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
                <button 
                  type="button"
                  onClick={() => { setImage(null); setImagePreview(null); }}
                  className="p-3 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Текст поверх</label>
                <input
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Текст, видимый на карточке..."
                  value={overlayText}
                  onChange={e => setOverlayText(e.target.value)}
                />
              </div>

              {!imagePreview && (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Цвет фона</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setBgColor(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${bgColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <Palette size={16} className="text-zinc-500" />
                    <input
                      type="color"
                      className="bg-transparent border-none w-8 h-8 cursor-pointer"
                      value={bgColor}
                      onChange={e => setBgColor(e.target.value)}
                    />
                    <span className="text-xs font-mono text-zinc-400 uppercase">{bgColor}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-8 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Сохранить промт
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
