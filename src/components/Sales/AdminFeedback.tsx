import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Trash2, XCircle } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { FeedbackNote } from '../../types';

const STATUS_LABELS: Record<FeedbackNote['status'], string> = {
  new:              '🆕 Новая',
  agent_reviewed:   '🤖 Агент обработал',
  supervisor_review:'👁 На проверке',
  resolved:         '✅ Решена',
  rejected:         '❌ Отклонена',
};

const STATUS_COLORS: Record<FeedbackNote['status'], string> = {
  new:              'bg-amber-100 text-amber-700',
  agent_reviewed:   'bg-blue-100 text-blue-700',
  supervisor_review:'bg-purple-100 text-purple-700',
  resolved:         'bg-green-100 text-green-700',
  rejected:         'bg-gray-100 text-gray-500',
};

export const AdminFeedback: React.FC = () => {
  const { feedbackNotes, updateFeedbackNote, deleteFeedbackNote } = useSalesStore();
  const [filterStatus, setFilterStatus] = useState<FeedbackNote['status'] | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = feedbackNotes.filter(
    (n) => filterStatus === 'all' || n.status === filterStatus
  );

  const newCount = feedbackNotes.filter((n) => n.status === 'new').length;

  const handleResolve = (id: string) => {
    updateFeedbackNote(id, { status: 'resolved', resolvedAt: new Date().toISOString() });
  };

  const handleReject = (id: string) => {
    updateFeedbackNote(id, { status: 'rejected' });
  };

  const handleComment = (id: string, comment: string) => {
    updateFeedbackNote(id, { supervisorComment: comment });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Обратная связь ⚙️</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {feedbackNotes.length} заметок
            {newCount > 0 && <span className="ml-2 text-amber-600 font-semibold">· {newCount} новых</span>}
          </p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(['all', 'new', 'agent_reviewed', 'supervisor_review', 'resolved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
              filterStatus === s
                ? 'bg-calidad-blue text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? 'Все' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Нет заметок</p>
          <p className="text-xs mt-1">Менеджеры создают их кнопкой ⚙️ в Кокпите</p>
        </div>
      )}

      {filtered.map((note) => {
        const isExpanded = expandedId === note.id;

        return (
          <div
            key={note.id}
            className={`bg-white rounded-xl border overflow-hidden ${
              note.status === 'new' ? 'border-amber-300' : 'border-gray-200'
            }`}
          >
            <div
              className="p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedId(isExpanded ? null : note.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[note.status]}`}>
                      {STATUS_LABELS[note.status]}
                    </span>
                    {note.isUrgent && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                        <AlertTriangle size={10} /> Срочно
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {new Date(note.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 leading-snug">{note.text}</p>
                  {note.autoContext.stageName && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      📍 {note.autoContext.stageName}
                      {note.autoContext.machineTypeId && ` · ${note.autoContext.machineTypeId}`}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {note.status === 'new' && (
                    <>
                      <button
                        onClick={() => handleResolve(note.id)}
                        className="p-1.5 text-green-400 hover:text-green-600 transition-colors"
                        title="Отметить решённой"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() => handleReject(note.id)}
                        className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                        title="Отклонить"
                      >
                        <XCircle size={16} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => deleteFeedbackNote(note.id)}
                    className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100 space-y-3 pt-3">
                {/* Agent proposal if any */}
                {note.agentProposal?.devPrompt && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-blue-600 mb-1">🤖 Промт для разработки</p>
                    <p className="text-xs text-blue-800 whitespace-pre-wrap">{note.agentProposal.devPrompt}</p>
                  </div>
                )}

                {/* Supervisor comment */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Комментарий руководителя
                  </label>
                  <textarea
                    className="w-full text-sm border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:border-calidad-blue"
                    rows={2}
                    value={note.supervisorComment ?? ''}
                    onChange={(e) => handleComment(note.id, e.target.value)}
                    onBlur={(e) => updateFeedbackNote(note.id, { supervisorComment: e.target.value })}
                    placeholder="Ответ менеджеру, пояснение..."
                  />
                </div>

                {/* Status change */}
                {note.status !== 'resolved' && note.status !== 'rejected' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolve(note.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <CheckCircle size={12} /> Решена
                    </button>
                    <button
                      onClick={() => handleReject(note.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <XCircle size={12} /> Отклонить
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
