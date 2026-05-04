import React, { useState } from 'react';
import { Settings, Trash2, Globe, Loader, AlertCircle } from 'lucide-react';
import { CollapsibleSection } from '../UI/Layout';
import { CompanyDetails, WordPressConfig } from '../../types';
import { useSettings } from '../../context/SettingsContext';

interface SettingsSidebarProps {
  expandedBlocks: Record<string, boolean>;
  toggleBlock: (id: string) => void;
  onResetAll: () => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  expandedBlocks,
  toggleBlock,
  onResetAll
}) => {
  const { supplier, updateSupplierField, wpConfig, setWpConfig, updateWpConfigField } = useSettings();
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState('');
  const [testSuccess, setTestSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-2">
      <CollapsibleSection 
        id="settings_supplier" 
        title="РЕКВИЗИТЫ CALIDAD" 
        icon={Settings} 
        isExpanded={expandedBlocks.settings_supplier} 
        onToggle={() => toggleBlock('settings_supplier')}
      >
        <div className="space-y-4">
          {(Object.keys(supplier) as Array<keyof CompanyDetails>).map(key => (
            key !== 'stampUrl' && (
              <div key={key}>
                <label className="text-[10px] font-bold text-gray-400 uppercase">{key}</label>
                <input 
                  type="text" 
                  value={supplier[key]}
                  onChange={e => updateSupplierField(key, e.target.value)}
                  className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium"
                />
              </div>
            )
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="settings_wordpress"
        title="WORDPRESS ИНТЕГРАЦИЯ"
        icon={Globe}
        isExpanded={expandedBlocks.settings_wordpress}
        onToggle={() => toggleBlock('settings_wordpress')}
      >
        <div className="space-y-4">
          {testError && (
            <div className="flex gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={12} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-700">{testError}</p>
            </div>
          )}
          {testSuccess && (
            <div className="flex gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-[10px] text-green-700">✓ Подключение успешно</p>
            </div>
          )}

          {!wpConfig ? (
            <button
              onClick={() =>
                setWpConfig({
                  siteUrl: '',
                  username: '',
                  appPassword: '',
                })
              }
              className="w-full px-3 py-2 text-xs font-bold bg-calidad-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Добавить настройки WordPress
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">URL сайта</label>
                <input
                  type="url"
                  value={wpConfig.siteUrl}
                  onChange={(e) => updateWpConfigField('siteUrl', e.target.value)}
                  placeholder="https://example.com"
                  className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Логин</label>
                <input
                  type="text"
                  value={wpConfig.username}
                  onChange={(e) => updateWpConfigField('username', e.target.value)}
                  placeholder="wordpress_user"
                  className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium text-sm"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  Application Password (не пароль учетной записи)
                </label>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={wpConfig.appPassword}
                    onChange={(e) => updateWpConfigField('appPassword', e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                    className="flex-1 border-b-2 border-gray-200 focus:border-calidad-blue py-1 outline-none font-medium text-sm"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs font-bold text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
                <p className="text-[9px] text-gray-400 mt-1">
                  Получите Application Password в WordPress: Пользователи → Ваш профиль → Application Passwords
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={async () => {
                    setTestLoading(true);
                    setTestError('');
                    setTestSuccess('');
                    try {
                      const auth = btoa(`${wpConfig.username}:${wpConfig.appPassword}`);
                      const response = await fetch(
                        `${wpConfig.siteUrl.replace(/\/$/, '')}/wp-json/wp/v2/users/me`,
                        {
                          headers: {
                            'Authorization': `Basic ${auth}`,
                          },
                        }
                      );
                      if (response.ok) {
                        setTestSuccess(true as any);
                      } else {
                        setTestError(`Ошибка ${response.status}: ${response.statusText}`);
                      }
                    } catch (err) {
                      setTestError(err instanceof Error ? err.message : 'Ошибка подключения');
                    } finally {
                      setTestLoading(false);
                    }
                  }}
                  disabled={testLoading || !wpConfig.siteUrl || !wpConfig.username || !wpConfig.appPassword}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-bold border-2 border-calidad-blue text-calidad-blue rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {testLoading && <Loader size={10} className="animate-spin" />}
                  Тест
                </button>

                <button
                  onClick={() => setWpConfig(null)}
                  className="flex-1 px-2 py-1 text-[10px] font-bold border-2 border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      <div className="p-6 border-t border-gray-100 mt-6">
        <button 
          onClick={onResetAll}
          className="w-full flex items-center justify-center gap-2 p-3 border-2 border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition-colors font-bold text-xs uppercase"
        >
          <Trash2 size={16} />
          Сбросить все данные
        </button>
      </div>
    </div>
  );
};
