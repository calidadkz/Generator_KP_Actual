import React, { useState } from 'react';
import { Sparkles, Trash2, Loader, AlertCircle } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { extractStyleDNA } from '../../services/dialogueProcessor';
import { resolveDialogueTexts } from '../../lib/dialogueStorage';

export const StyleDNAPanel: React.FC = () => {
  const { styleDNA, setStyleDNA, clearStyleDNA, dialogues } = useSalesStore();
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanedDialogues = dialogues.filter((d) => d.cleanStatus === 'ready' && d.textRef);

  const handleExtractStyleDNA = async () => {
    if (cleanedDialogues.length < 3) {
      setError('Нужно минимум 3 очищенных диалога');
      return;
    }

    setExtracting(true);
    setError(null);
    try {
      const texts: string[] = [];
      for (const d of cleanedDialogues.slice(0, 20)) {
        if (d.textRef) {
          const resolved = await resolveDialogueTexts(d.textRef);
          if (resolved?.cleanedText) texts.push(resolved.cleanedText);
        }
      }

      if (texts.length === 0) {
        setError('Не удалось загрузить тексты диалогов');
        return;
      }

      const result = await extractStyleDNA(texts);
      setStyleDNA({
        id: 'dna-' + Date.now().toString(36),
        generatedAt: new Date().toISOString(),
        dialogueCount: texts.length,
        frequentPhrases: result.frequentPhrases,
        avgSentenceLength: result.avgSentenceLength,
        tone: result.tone,
        thoughtStructure: result.thoughtStructure,
        additionalNotes: result.additionalNotes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  };

  if (!styleDNA) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            StyleDNA — это профиль уникального стиля менеджера, используется для написания статей в его голосе.
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Требуется минимум 3 очищенных диалога. Есть: {cleanedDialogues.length}
          </p>
          <button
            onClick={handleExtractStyleDNA}
            disabled={extracting || cleanedDialogues.length < 3}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-calidad-blue text-white rounded-lg text-sm font-bold hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {extracting ? (
              <>
                <Loader size={14} className="animate-spin" /> Извлечение...
              </>
            ) : (
              <>
                <Sparkles size={14} /> Извлечь StyleDNA
              </>
            )}
          </button>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-600 flex items-start gap-2">
                <AlertCircle size={12} className="flex-shrink-0 mt-0.5" /> {error}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-indigo-50">
        <div>
          <h3 className="text-sm font-bold text-indigo-800">StyleDNA</h3>
          <p className="text-xs text-indigo-400 mt-0.5">
            {new Date(styleDNA.generatedAt).toLocaleDateString('ru')} · {styleDNA.dialogueCount} диалогов
          </p>
        </div>
        <button
          onClick={() => clearStyleDNA()}
          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
          title="Удалить StyleDNA"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {styleDNA.frequentPhrases.length > 0 && (
          <div className="px-6 py-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Характерные фразы</p>
            <div className="space-y-1">
              {styleDNA.frequentPhrases.map((phrase, i) => (
                <p key={i} className="text-sm text-gray-700">„{phrase}"</p>
              ))}
            </div>
          </div>
        )}

        <div className="px-6 py-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Тон голоса</p>
          <p className="text-sm text-gray-700">{styleDNA.tone || '—'}</p>
        </div>

        <div className="px-6 py-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Средняя длина предложения</p>
          <p className="text-sm text-gray-700">
            {styleDNA.avgSentenceLength === 'short' ? 'Короткие (лаконичные)' : styleDNA.avgSentenceLength === 'long' ? 'Длинные (подробные)' : 'Средние'}
          </p>
        </div>

        <div className="px-6 py-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Структура аргументов</p>
          <p className="text-sm text-gray-700">{styleDNA.thoughtStructure || '—'}</p>
        </div>

        {styleDNA.additionalNotes && (
          <div className="px-6 py-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Дополнительно</p>
            <p className="text-sm text-gray-700">{styleDNA.additionalNotes}</p>
          </div>
        )}

        <div className="px-6 py-4 bg-gray-50">
          <button
            onClick={handleExtractStyleDNA}
            className="flex items-center gap-2 px-3 py-1.5 bg-calidad-blue text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors"
          >
            <Sparkles size={12} /> Обновить StyleDNA
          </button>
        </div>
      </div>
    </div>
  );
};
