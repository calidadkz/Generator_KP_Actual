import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { StyleDNAPanel } from './StyleDNAPanel';
import { FewShotExamplesManager } from './FewShotExamplesManager';
import { CleaningConfigEditor } from './CleaningConfigEditor';
import { ArticleGenerationWizard } from './ArticleGenerationWizard';
import { WordPressPublisher } from './WordPressPublisher';

type AdminArticlesTab = 'articles' | 'style-dna' | 'examples' | 'settings';

const TABS: { id: AdminArticlesTab; label: string }[] = [
  { id: 'articles', label: 'Статьи' },
  { id: 'style-dna', label: 'StyleDNA' },
  { id: 'examples', label: 'Примеры' },
  { id: 'settings', label: 'Настройки' },
];

export const AdminArticles: React.FC = () => {
  const { articles, deleteArticle } = useSalesStore();
  const [activeTab, setActiveTab] = useState<AdminArticlesTab>('articles');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [wizardOpen, setWizardOpen] = useState<boolean>(false);

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const renderContent = () => {
    switch (activeTab) {
      case 'articles':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Статьи</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {articles.length} статей
                  {articles.length > 0 && ` · ${articles.filter((a) => a.status === 'published').length} опубликовано`}
                </p>
              </div>
              <button
                onClick={() => setWizardOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-calidad-blue text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={14} /> Новая статья
              </button>
            </div>

            {articles.map((article) => (
              <div key={article.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggle(article.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={14} className="text-gray-400 flex-shrink-0" />
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          article.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {article.status === 'published' ? 'Опубликовано' : 'Черновик'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{article.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(article.createdAt).toLocaleDateString('ru')}
                      {article.wordpressPostId && ` · WP ID: ${article.wordpressPostId}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteArticle(article.id);
                      }}
                      className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                    {expanded[article.id] ? (
                      <ChevronUp size={14} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={14} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {expanded[article.id] && (
                  <div className="px-4 pb-4 border-t border-gray-100 space-y-4">
                    {article.tags.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Теги</p>
                        <div className="flex flex-wrap gap-1">
                          {article.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Превью</p>
                      <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto border border-gray-100">
                        <div className="text-xs text-gray-600 line-clamp-5" dangerouslySetInnerHTML={{ __html: article.content }} />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <WordPressPublisher article={article} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {articles.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">Нет статей. Статьи появятся после генерации через мастер.</p>
              </div>
            )}
          </div>
        );

      case 'style-dna':
        return <StyleDNAPanel />;

      case 'examples':
        return <FewShotExamplesManager />;

      case 'settings':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Промпты для очистки текста</h3>
              <CleaningConfigEditor />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-gray-200 bg-white rounded-t-xl px-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-calidad-blue text-calidad-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 p-6">
          {renderContent()}
        </div>
      </div>

      <ArticleGenerationWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} />
    </>
  );
};
