import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Save } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { listAvailableModels, listGptModels } from '../../services/dialogueProcessor';

export const CleaningConfigEditor: React.FC = () => {
  const { cleaningConfig, updateCleaningConfig } = useSalesStore();
  const [expanded, setExpanded] = useState(false);
  const [geminiModels, setGeminiModels] = useState<string[]>([]);
  const [gptModels, setGptModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoading(true);
        const gemini = await listAvailableModels();
        const gpt = listGptModels();
        setGeminiModels(gemini);
        setGptModels(gpt);
      } catch (err) {
        console.error('Failed to load models:', err);
      } finally {
        setLoading(false);
      }
    };
    if (expanded) {
      loadModels();
    }
  }, [expanded]);

  const handleSaveGemini = () => {
    updateCleaningConfig({
      geminiPrompt: cleaningConfig.geminiPrompt,
      geminiModel: cleaningConfig.geminiModel,
    });
  };

  const handleSaveOpenAI = () => {
    updateCleaningConfig({
      openaiPrompt: cleaningConfig.openaiPrompt,
      openaiModel: cleaningConfig.openaiModel,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Конфигурация очистки текста
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Настройка промптов и моделей для каждого провайдера</p>
        </div>
        {expanded ? (
          <ChevronUp size={18} className="text-gray-400" />
        ) : (
          <ChevronDown size={18} className="text-gray-400" />
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-6 border-t border-gray-100">
          {/* Gemini Config */}
          <div className="pt-3 space-y-3">
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Gemini</h4>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Системный промпт для очистки
              </label>
              <textarea
                className="w-full h-32 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-calidad-blue font-mono resize-none"
                value={cleaningConfig.geminiPrompt}
                onChange={(e) =>
                  updateCleaningConfig({ geminiPrompt: e.target.value })
                }
                placeholder="Системный промпт для Gemini..."
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Модель (оставить пусто = использовать цепочку fallback)
              </label>
              <select
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-calidad-blue"
                value={cleaningConfig.geminiModel || ''}
                onChange={(e) =>
                  updateCleaningConfig({ geminiModel: e.target.value || undefined })
                }
              >
                <option value="">— Fallback цепочка —</option>
                {loading ? (
                  <option disabled>Загрузка...</option>
                ) : (
                  geminiModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              onClick={handleSaveGemini}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
            >
              <Save size={14} /> Сохранить Gemini конфиг
            </button>
          </div>

          {/* OpenAI Config */}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">OpenAI (GPT)</h4>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Системный промпт для очистки
              </label>
              <textarea
                className="w-full h-32 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-calidad-blue font-mono resize-none"
                value={cleaningConfig.openaiPrompt}
                onChange={(e) =>
                  updateCleaningConfig({ openaiPrompt: e.target.value })
                }
                placeholder="Системный промпт для OpenAI..."
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Модель (оставить пусто = gpt-4o-mini)
              </label>
              <select
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-calidad-blue"
                value={cleaningConfig.openaiModel || ''}
                onChange={(e) =>
                  updateCleaningConfig({ openaiModel: e.target.value || undefined })
                }
              >
                <option value="">— gpt-4o-mini (по умолчанию) —</option>
                {gptModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSaveOpenAI}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
            >
              <Save size={14} /> Сохранить OpenAI конфиг
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
