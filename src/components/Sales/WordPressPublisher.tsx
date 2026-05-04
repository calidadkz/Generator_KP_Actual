import React, { useState } from 'react';
import { Send, Loader, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { Article } from '../../types';

interface WordPressPublisherProps {
  article: Article;
}

export const WordPressPublisher: React.FC<WordPressPublisherProps> = ({ article }) => {
  const { updateArticle } = useSalesStore();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handlePublish = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Получаем конфиг WordPress из localStorage
      const wpConfigStr = localStorage.getItem('calidad_wp_config');
      if (!wpConfigStr) {
        setError('Настройки WordPress не найдены. Заполните конфиг в Settings.');
        setLoading(false);
        return;
      }

      const wpConfig = JSON.parse(wpConfigStr);
      if (!wpConfig.siteUrl || !wpConfig.username || !wpConfig.appPassword) {
        setError('Неполные настройки WordPress');
        setLoading(false);
        return;
      }

      // Используем прокси маршрут для избежания CORS проблем
      const endpoint = article.wordpressPostId
        ? `/api/wp-update/${article.wordpressPostId}`
        : '/api/wp-publish';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl: wpConfig.siteUrl,
          username: wpConfig.username,
          appPassword: wpConfig.appPassword,
          title: article.title,
          content: article.content,
          tags: article.tags,
          postId: article.wordpressPostId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json() as { postId?: number; url?: string };

      // Обновляем статью в хранилище
      updateArticle(article.id, {
        status: 'published',
        wordpressPostId: data.postId,
        wordpressUrl: data.url,
        updatedAt: new Date().toISOString(),
      });

      setSuccess(
        article.wordpressPostId
          ? 'Статья обновлена в WordPress'
          : `Статья опубликована! ID: ${data.postId}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка публикации');
    } finally {
      setLoading(false);
    }
  };

  const isPublished = article.status === 'published';

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-700">{success}</p>
        </div>
      )}

      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Статус в WordPress
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                isPublished
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {isPublished ? (
                <>
                  <CheckCircle size={12} />
                  Опубликовано
                </>
              ) : (
                'Черновик'
              )}
            </span>
            {article.wordpressPostId && (
              <span className="text-[10px] text-gray-500">
                WP ID: {article.wordpressPostId}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handlePublish}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-calidad-blue text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader size={14} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
          {isPublished ? 'Обновить' : 'Опубликовать'}
        </button>
      </div>

      {isPublished && article.wordpressUrl && (
        <a
          href={article.wordpressUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-calidad-blue hover:text-blue-700 transition-colors"
        >
          Открыть в WordPress
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
};
