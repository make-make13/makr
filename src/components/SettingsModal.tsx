import React, { useState, useEffect } from 'react';
import { X, Save, Download, Upload, Trash2, Key, Database, LogIn } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(process.env.GEMINI_API_KEY || '');

  const handleExport = async () => {
    const res = await fetch('/api/prompts');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prompt-vault-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      if (!res.ok) {
        const err = await res.json();
        alert(`Ошибка: ${err.error || 'Не удалось получить URL авторизации'}`);
        return;
      }
      const { url } = await res.json();
      const authWindow = window.open(url, 'google_oauth', 'width=600,height=700');
      
      if (!authWindow) {
        alert('Пожалуйста, разрешите всплывающие окна для авторизации.');
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          console.log('Google Auth Success:', event.data.tokens);
          alert('Авторизация через Google успешна!');
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error('OAuth error:', error);
      alert('Ошибка при попытке авторизации через Google. Проверьте конфигурацию в .env');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-display font-bold">Настройки</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Key size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Конфигурация API</span>
            </div>
            
            <button 
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold transition-all shadow-xl"
            >
              <LogIn size={20} />
              Войти через Google
            </button>

            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Gemini API Key</label>
              <div className="relative">
                <input
                  type="password"
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Введите ваш API ключ..."
                />
              </div>
              <p className="mt-1.5 text-[10px] text-zinc-500">
                Ключ берется из окружения. Обновите в AI Studio Secrets при необходимости.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Database size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Управление данными</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleExport}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-all"
              >
                <Download size={16} />
                Экспорт JSON
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-all opacity-50 cursor-not-allowed">
                <Upload size={16} />
                Импорт JSON
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg transition-all"
            >
              Сохранить и закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
