import React from 'react';
import {
  FileText,
  Briefcase,
  Settings,
  FileCode,
  ArrowRight,
  History,
  MapPin,
  Headphones,
  BookOpen,
} from 'lucide-react';
import { AppTab } from '../../types';
import { motion } from 'framer-motion';
import { useDBStatus } from '../../hooks/useDBStatus';
import { DBStatusIndicator } from './DBStatusIndicator';

interface DashboardProps {
  onSetActiveTab: (tab: AppTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSetActiveTab }) => {
  const dbStatus = useDBStatus();
  const actions = [
    {
      id: 'kp-generator',
      title: 'Генератор КП',
      description: 'Создать коммерческое предложение на основе PDF-шаблона',
      icon: Briefcase,
      color: 'bg-blue-500',
      tab: 'kp-generator' as AppTab,
    },
    {
      id: 'contract',
      title: 'Договор',
      description: 'Создать новый договор по шаблону',
      icon: FileText,
      color: 'bg-red-500',
      tab: 'contract' as AppTab,
    },
    {
      id: 'template-mapper',
      title: 'Конструктор шаблонов КП',
      description: 'Загрузить PDF-подложку и разметить поля для подстановки',
      icon: MapPin,
      color: 'bg-purple-500',
      tab: 'template-mapper' as AppTab,
    },
    {
      id: 'contract-builder',
      title: 'Конструктор договоров',
      description: 'Загрузить .docx и настроить переменные',
      icon: FileCode,
      color: 'bg-orange-500',
      tab: 'contract-builder' as AppTab,
    },
    {
      id: 'settings',
      title: 'Настройки компании',
      description: 'Реквизиты, печать, подпись',
      icon: Settings,
      color: 'bg-gray-500',
      tab: 'settings' as AppTab,
    },
    {
      id: 'templates-library',
      title: 'Библиотека шаблонов',
      description: 'Управление шаблонами договоров',
      icon: History,
      color: 'bg-blue-600',
      tab: 'templates-library' as AppTab,
    },
    {
      id: 'sales-cockpit',
      title: 'Cockpit менеджера',
      description: 'Динамический скрипт и мини-презентации в режиме реального звонка',
      icon: Headphones,
      color: 'bg-teal-600',
      tab: 'sales-cockpit' as AppTab,
    },
    {
      id: 'sales-admin',
      title: 'Управление скриптом',
      description: 'Загрузка диалогов, AI-анализ, редактор скрипта и базы знаний',
      icon: BookOpen,
      color: 'bg-indigo-600',
      tab: 'sales-admin' as AppTab,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">CALIDAD Document Builder</h1>
              <p className="text-gray-500 text-lg">Выберите действие для начала работы</p>
            </div>
            <DBStatusIndicator status={dbStatus} />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {actions.map((action, index) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onSetActiveTab(action.tab)}
              className="group relative bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all text-left overflow-hidden"
            >
              <div className={`w-14 h-14 ${action.color} rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 transition-transform`}>
                <action.icon size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{action.title}</h3>
              <p className="text-gray-500 mb-6 leading-relaxed">{action.description}</p>
              <div className="flex items-center text-blue-600 font-semibold group-hover:gap-2 transition-all">
                Начать <ArrowRight size={18} className="ml-1" />
              </div>
              
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <action.icon size={120} />
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-16 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <History className="text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-900">Последние документы</h2>
          </div>
          <div className="text-center py-12 text-gray-400">
            <p>У вас пока нет сохраненных документов</p>
          </div>
        </div>
      </div>
    </div>
  );
};
