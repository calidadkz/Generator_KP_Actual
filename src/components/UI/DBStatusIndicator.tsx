import React from 'react';
import { Database } from 'lucide-react';
import { DBStatus } from '../../hooks/useDBStatus';

interface DBStatusIndicatorProps {
  status: DBStatus;
}

export const DBStatusIndicator: React.FC<DBStatusIndicatorProps> = ({ status }) => {
  const config = {
    checking: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      dot: 'bg-gray-400 animate-pulse',
      label: 'Подключение...',
    },
    connected: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      dot: 'bg-green-500',
      label: 'DB Connected',
    },
    error: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      dot: 'bg-red-500',
      label: 'DB Error',
    },
  };

  const c = config[status];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${c.bg} border ${c.text.replace('text', 'border')}`}>
      <Database size={14} className={c.text} />
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${c.dot}`} />
        <span className={`text-xs font-bold ${c.text}`}>{c.label}</span>
      </div>
    </div>
  );
};
