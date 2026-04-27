import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppTab } from '../../types';
import {
  FileText,
  Settings,
  ChevronDown,
  ChevronUp,
  Layout as LayoutIcon,
  ArrowLeft
} from 'lucide-react';

interface LayoutProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  sidebar: React.ReactNode;
  preview: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ activeTab, setActiveTab, sidebar, preview }) => {
  const isEditorMode = activeTab === 'contract';
  const containerRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !scalerRef.current) return;

    const container = containerRef.current;
    const scaler = scalerRef.current;

    const handleResize = () => {
      const containerWidth = container.clientWidth;
      const style = window.getComputedStyle(container);
      const paddingLeft = parseFloat(style.paddingLeft);
      const paddingRight = parseFloat(style.paddingRight);
      const availableWidth = containerWidth - paddingLeft - paddingRight;
      
      // 210mm in pixels (approx 793.7px at 96dpi)
      const a4WidthPx = 210 * 3.7795275591; 
      
      if (availableWidth < a4WidthPx) {
        const scale = availableWidth / a4WidthPx;
        scaler.style.transform = `scale(${scale})`;
      } else {
        scaler.style.transform = 'scale(1)';
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Initial call
    handleResize();
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [preview]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900 print:block print:h-auto print:overflow-visible">
      {/* LEFT PANEL - CONTROLS */}
      <aside className="w-[30%] min-w-[350px] border-r border-gray-200 flex flex-col bg-white shadow-2xl z-10 print:hidden">
        {/* Header / Tabs */}
        <div className="p-6 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-calidad-red rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                <FileText className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tighter text-calidad-blue">CALIDAD <span className="text-calidad-red">DOCS</span></h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sales Automation v4.0</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-calidad-blue hover:text-white rounded-xl text-gray-500 font-bold text-xs transition-all group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Вернуться на главную
            </button>
          </div>

          {!isEditorMode && (
            <div className="flex p-1 bg-gray-100 rounded-xl gap-1">
              {[
                { id: 'contract', icon: FileText, label: 'Договор' },
                { id: 'settings', icon: Settings, label: 'Настройки' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AppTab)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === tab.id 
                      ? 'bg-white text-calidad-blue shadow-sm scale-[1.02]' 
                      : 'text-gray-500 hover:text-calidad-blue hover:bg-white/50'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {isEditorMode && (
            <div className="py-2 px-4 bg-blue-50 text-calidad-blue rounded-xl text-xs font-black uppercase tracking-widest text-center">
              Режим редактирования: {activeTab === 'contract' ? 'Договор' : 'Коммерческое предложение'}
            </div>
          )}
        </div>

        {/* Scrollable Controls Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {sidebar}
        </div>
      </aside>

      {/* RIGHT PANEL - LIVE PREVIEW */}
      <main ref={containerRef} className="flex-1 bg-gray-300 overflow-y-auto custom-scrollbar a4-container p-4 md:p-8 print:p-0 print:bg-white print:overflow-visible print:block print:static">
        <div className="w-full flex flex-col items-center min-h-full print:block print:w-auto print:static">
          <div 
            id="preview-scaler" 
            ref={scalerRef}
            className="origin-top transition-transform duration-300 ease-in-out print:!transform-none print:!scale-100 print:!m-0 print:!p-0 print:!block print:!static" 
            style={{ width: '210mm' }}
          >
            {preview}
          </div>
        </div>
      </main>
    </div>
  );
};

interface CollapsibleSectionProps {
  id: string;
  title: string;
  icon: React.ElementType;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  icon: Icon, 
  isExpanded, 
  onToggle, 
  children 
}) => {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors group"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-calidad-blue text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
            <Icon size={18} />
          </div>
          <span className={`text-xs font-black uppercase tracking-widest ${isExpanded ? 'text-calidad-blue' : 'text-gray-500'}`}>{title}</span>
        </div>
        {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-8 space-y-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
