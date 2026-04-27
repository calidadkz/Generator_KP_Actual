import React, { useState } from 'react';
import { ArrowLeft, MessageSquare, BookOpen, Presentation, Cpu } from 'lucide-react';
import { AdminDialogues } from './AdminDialogues';
import { AdminScript } from './AdminScript';
import { AdminMicroPresentations } from './AdminMicroPresentations';
import { AdminMachineTypes } from './AdminMachineTypes';

type AdminTab = 'dialogues' | 'script' | 'micropresentations' | 'machinetypes';

const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'dialogues',          label: 'Диалоги',          icon: MessageSquare },
  { id: 'script',             label: 'Скрипт',            icon: BookOpen },
  { id: 'micropresentations', label: 'Мини-презентации',  icon: Presentation },
  { id: 'machinetypes',       label: 'Типы станков',      icon: Cpu },
];

interface AdminPanelProps {
  onBack: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dialogues');

  const renderContent = () => {
    switch (activeTab) {
      case 'dialogues':          return <AdminDialogues />;
      case 'script':             return <AdminScript />;
      case 'micropresentations': return <AdminMicroPresentations />;
      case 'machinetypes':       return <AdminMachineTypes />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-bold text-xs transition-colors"
        >
          <ArrowLeft size={14} /> Назад
        </button>
        <div>
          <h1 className="text-lg font-black text-calidad-blue">
            CALIDAD <span className="text-calidad-red">SALES</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Управление скриптом и базой знаний
          </p>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-1 flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-calidad-blue text-calidad-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
