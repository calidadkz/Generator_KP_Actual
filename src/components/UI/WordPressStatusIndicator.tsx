import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

type WordPressStatus = 'unconfigured' | 'checking' | 'connected' | 'error';

export const WordPressStatusIndicator: React.FC = () => {
  const { wpConfig } = useSettings();
  const [status, setStatus] = useState<WordPressStatus>('unconfigured');

  useEffect(() => {
    if (!wpConfig?.siteUrl || !wpConfig?.username || !wpConfig?.appPassword) {
      setStatus('unconfigured');
      return;
    }

    const checkConnection = async () => {
      setStatus('checking');
      try {
        const auth = btoa(`${wpConfig.username}:${wpConfig.appPassword}`);
        const response = await fetch(
          `${wpConfig.siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/users/me`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${auth}`,
            },
          },
          // Таймаут 5 секунд
        );

        if (response.ok) {
          setStatus('connected');
        } else {
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
      }
    };

    // Проверяем при монтировании и каждые 30 секунд
    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, [wpConfig]);

  const config = {
    unconfigured: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      dot: 'bg-gray-400',
      label: 'WP Not Set',
    },
    checking: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      dot: 'bg-yellow-400 animate-pulse',
      label: 'WP Checking...',
    },
    connected: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      dot: 'bg-green-500',
      label: 'WP Connected',
    },
    error: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      dot: 'bg-red-500',
      label: 'WP Error',
    },
  };

  const c = config[status];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${c.bg} border ${c.text.replace('text', 'border')}`}>
      <Globe size={14} className={c.text} />
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${c.dot}`} />
        <span className={`text-xs font-bold ${c.text}`}>{c.label}</span>
      </div>
    </div>
  );
};
