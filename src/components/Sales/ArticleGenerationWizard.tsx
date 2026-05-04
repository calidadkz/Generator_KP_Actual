import React, { useState } from 'react';
import { X, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { generateArticleDraft, rewriteArticleInStyle } from '../../services/dialogueProcessor';

type WizardStep = 'topic' | 'draft' | 'style' | 'save';

interface ArticleGenerationWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArticleGenerationWizard: React.FC<ArticleGenerationWizardProps> = ({ isOpen, onClose }) => {
  const { batchInsights, dialogues, styleDNA, fewShotExamples, addArticle } = useSalesStore();

  const [step, setStep] = useState<WizardStep>('topic');
  const [topic, setTopic] = useState<string>('');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);

  const [draft, setDraft] = useState<string>('');
  const [styledContent, setStyledContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [articleTitle, setArticleTitle] = useState<string>('');
  const [articleTags, setArticleTags] = useState<string>('');
  const [useStyleDNA, setUseStyleDNA] = useState<boolean>(!!styleDNA);

  if (!isOpen) return null;

  const getRelevantPatterns = () => {
    const cleanedDialogues = dialogues.filter((d) => d.isClean && d.extractedData);
    if (cleanedDialogues.length === 0) return { articleTopics: [], painPoints: [] };

    const allTopics = new Set<string>();
    const allPainPoints = new Set<string>();

    cleanedDialogues.forEach((d) => {
      d.extractedData?.articleTopics?.forEach((t) => allTopics.add(t));
      d.extractedData?.painPoints?.forEach((p) => allPainPoints.add(p));
    });

    return {
      articleTopics: Array.from(allTopics),
      painPoints: Array.from(allPainPoints),
    };
  };

  const getTopicSuggestions = (): string[] => {
    const suggestions = new Set<string>();

    if (batchInsights.length > 0) {
      batchInsights.forEach((bi) => {
        bi.articleTopicSuggestions?.forEach((t) => suggestions.add(t));
      });
    }

    const patterns = getRelevantPatterns();
    patterns.articleTopics.forEach((t) => suggestions.add(t));

    return Array.from(suggestions);
  };

  const handleGenerateDraft = async () => {
    setLoading(true);
    setError('');
    try {
      const selectedTopic = useCustom ? customTopic : topic;
      if (!selectedTopic) {
        setError('Выберите или введите тему статьи');
        setLoading(false);
        return;
      }

      const patterns = getRelevantPatterns();
      if (patterns.articleTopics.length === 0 && patterns.painPoints.length === 0) {
        setError('Нет извлеченных паттернов из диалогов. Проанализируйте диалоги с опцией "Для статей".');
        setLoading(false);
        return;
      }

      const generatedDraft = await generateArticleDraft(selectedTopic, patterns);
      setDraft(generatedDraft);
      setArticleTitle(selectedTopic);

      if (styleDNA && useStyleDNA) {
        setStep('style');
      } else {
        setStep('save');
        setStyledContent(generatedDraft);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при генерации черновика');
    } finally {
      setLoading(false);
    }
  };

  const handleRewriteInStyle = async () => {
    setLoading(true);
    setError('');
    try {
      if (!styleDNA) {
        setError('StyleDNA не найдена');
        setLoading(false);
        return;
      }

      const selectedFewShots = fewShotExamples.slice(0, 5).map((ex) => ({
        title: ex.title,
        content: ex.content,
      }));

      const rewritten = await rewriteArticleInStyle(
        draft,
        {
          frequentPhrases: styleDNA.frequentPhrases,
          tone: styleDNA.tone,
          thoughtStructure: styleDNA.thoughtStructure,
        },
        selectedFewShots,
      );

      setStyledContent(rewritten);
      setStep('save');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при переписывании статьи');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveArticle = () => {
    if (!articleTitle.trim()) {
      setError('Введите заголовок статьи');
      return;
    }

    const newArticle = {
      id: `article-${Date.now()}`,
      title: articleTitle,
      content: styledContent,
      tags: articleTags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generationMeta: {
        topic: useCustom ? customTopic : topic,
        usedStyleDNA: useStyleDNA,
        fewShotCount: fewShotExamples.length,
      },
    };

    addArticle(newArticle);
    handleClose();
  };

  const handleClose = () => {
    setStep('topic');
    setTopic('');
    setCustomTopic('');
    setUseCustom(false);
    setDraft('');
    setStyledContent('');
    setLoading(false);
    setError('');
    setArticleTitle('');
    setArticleTags('');
    setUseStyleDNA(!!styleDNA);
    onClose();
  };

  const topicSuggestions = getTopicSuggestions();
  const patterns = getRelevantPatterns();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">Генерация статьи</h2>
            <p className="text-xs text-gray-500 mt-1">
              Шаг {step === 'topic' ? 1 : step === 'draft' ? 2 : step === 'style' ? 3 : 4} из 4
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Topic Selection */}
          {step === 'topic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Выберите тему статьи</label>
                {topicSuggestions.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {topicSuggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setTopic(sug);
                          setUseCustom(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          !useCustom && topic === sug
                            ? 'border-calidad-blue bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold text-gray-800">{sug}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mb-4">
                    Нет рекомендаций. Анализируйте диалоги с опцией "Для статей" для получения предложений.
                  </p>
                )}

                <div className="relative">
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={useCustom}
                      onChange={(e) => setUseCustom(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-semibold text-gray-700">Или введите свою тему</span>
                  </label>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="Введите тему статьи..."
                    disabled={!useCustom}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-2">
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Извлеченные паттерны</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 font-bold">Темы</p>
                    <p className="text-lg font-black text-gray-800">{patterns.articleTopics.length}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 font-bold">Боли</p>
                    <p className="text-lg font-black text-gray-800">{patterns.painPoints.length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Draft Generation */}
          {step === 'draft' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Черновик статьи</label>
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{draft}</p>
                </div>
              </div>

              {styleDNA && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useStyleDNA}
                    onChange={(e) => setUseStyleDNA(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    Переписать в стиле автора (StyleDNA)
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Step 3: Style Rewriting */}
          {step === 'style' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Статья в стиле автора</label>
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{styledContent}</p>
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>StyleDNA:</p>
                <p className="italic">
                  Тон: {styleDNA?.tone} · Структура: {styleDNA?.thoughtStructure}
                </p>
                {fewShotExamples.length > 0 && (
                  <p>Использовано {Math.min(fewShotExamples.length, 5)} примеров стиля</p>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Save */}
          {step === 'save' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Заголовок</label>
                <input
                  type="text"
                  value={articleTitle}
                  onChange={(e) => setArticleTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Введите заголовок статьи"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Теги (через запятую)</label>
                <input
                  type="text"
                  value={articleTags}
                  onChange={(e) => setArticleTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="тег1, тег2, тег3"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Содержание</label>
                <textarea
                  value={styledContent}
                  onChange={(e) => setStyledContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-xs max-h-64"
                  rows={10}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => {
              if (step === 'topic') handleClose();
              else if (step === 'draft') setStep('topic');
              else if (step === 'style') setStep('draft');
              else if (step === 'save') setStep(styleDNA && useStyleDNA ? 'style' : 'draft');
            }}
            className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-colors"
          >
            {step === 'topic' ? 'Отмена' : 'Назад'}
          </button>

          <div className="flex gap-2">
            {step === 'topic' && (
              <button
                onClick={handleGenerateDraft}
                disabled={(!useCustom && !topic) || (useCustom && !customTopic) || loading}
                className="flex items-center gap-2 px-4 py-2 bg-calidad-blue text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading && <Loader size={16} className="animate-spin" />}
                Далее
              </button>
            )}

            {step === 'draft' && (
              <button
                onClick={() => (styleDNA && useStyleDNA ? handleRewriteInStyle() : setStep('save'))}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-calidad-blue text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading && <Loader size={16} className="animate-spin" />}
                {styleDNA && useStyleDNA ? 'Переписать' : 'Далее'}
              </button>
            )}

            {step === 'style' && (
              <button
                onClick={() => setStep('save')}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-calidad-blue text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading && <Loader size={16} className="animate-spin" />}
                Далее
              </button>
            )}

            {step === 'save' && (
              <button
                onClick={handleSaveArticle}
                disabled={loading || !articleTitle.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <CheckCircle size={16} />
                Сохранить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
