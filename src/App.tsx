import React, { useState, useEffect } from 'react';
import { AppTab } from './types';
import { Layout } from './components/UI/Layout';
import { ContractSidebar } from './components/Contract/ContractSidebar';
import { SettingsSidebar } from './components/Settings/SettingsSidebar';
import { ContractPreview } from './components/Contract/ContractPreview';
import { TemplateControls } from './components/UI/TemplateControls';
import { useContract } from './hooks/useContract';
import { useSettings } from './context/SettingsContext';
import { useTemplates } from './hooks/useTemplates';
import { useCloudSync } from './hooks/useCloudSync';
import { renderTemplate } from './services/templateService';
import { Stamp } from './components/UI/Stamp';

import { Dashboard } from './components/UI/Dashboard';
import { ContractBuilder } from './components/Contract/ContractBuilder';
import { TemplatesLibrary } from './components/UI/TemplatesLibrary';
import { GeneratorPage } from './components/CP/GeneratorPage';
import { TemplateMapper } from './components/CP/TemplateMapper';
import { ManagerCockpit } from './components/Sales/ManagerCockpit';
import { AdminPanel } from './components/Sales/AdminPanel';
import { Template } from './types';
import { useDocumentStore } from './store/useDocumentStore';

const VALID_TABS: AppTab[] = [
  'contract',
  'settings',
  'dashboard',
  'contract-builder',
  'templates-library',
  'template-mapper',
  'kp-generator',
  'sales-cockpit',
  'sales-admin',
];

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const saved = localStorage.getItem('calidad_active_tab');
    return VALID_TABS.includes(saved as AppTab) ? (saved as AppTab) : 'dashboard';
  });

  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    localStorage.setItem('calidad_active_tab', activeTab);
  }, [activeTab]);

  const {
    contract,
    totalAmount,
    totalAmountWords,
    updateContract,
    updateBuyer,
    addLineItem,
    removeLineItem,
    updateLineItem,
    resetContract,
    showStamp,
    stampPositions,
    updateStampPosition,
    updateStampScale,
  } = useContract();

  const { supplier, resetSettings } = useSettings();

  const {
    templates,
    activeTemplateId,
    setActiveTemplateId,
    activeTemplate,
    isAdvancedMode,
    setIsAdvancedMode,
    handleDocxUpload,
    extractVariable,
    saveTemplate,
    saveActiveTemplateChanges,
    deleteTemplate,
    updateTemplateField,
    resetTemplates,
  } = useTemplates(activeTab);

  // Initialize cloud sync for Sales module at app startup
  useCloudSync();

  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({
    doc: true,
    spec: true,
    buyer: true,
    settings_supplier: true,
  });

  const toggleBlock = (id: string) => setExpandedBlocks((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleResetAll = () => {
    if (confirm('Вы уверены, что хотите сбросить все данные?')) {
      resetContract();
      resetSettings();
      resetTemplates();
      useDocumentStore.getState().resetAssembly();
      window.location.reload();
    }
  };

  const renderSidebar = () => {
    switch (activeTab) {
      case 'contract':
        return (
          <div className="space-y-6">
            <ContractSidebar
              contract={contract}
              updateContract={updateContract}
              updateBuyer={updateBuyer}
              addLineItem={addLineItem}
              removeLineItem={removeLineItem}
              updateLineItem={updateLineItem}
              expandedBlocks={expandedBlocks}
              toggleBlock={toggleBlock}
            />
            <div className="px-6 pb-6">
              <TemplateControls
                templates={templates.filter((t) => t.type === 'Contract' || t.type === 'contract')}
                activeTemplateId={activeTemplateId}
                setActiveTemplateId={setActiveTemplateId}
                isAdvancedMode={isAdvancedMode}
                setIsAdvancedMode={setIsAdvancedMode}
                handleDocxUpload={handleDocxUpload}
                extractVariable={extractVariable}
                saveTemplate={saveActiveTemplateChanges}
                deleteTemplate={deleteTemplate}
                updateTemplateField={updateTemplateField}
                activeTemplate={activeTemplate}
                onOpenBuilder={() => setActiveTab('contract-builder')}
              />
            </div>
          </div>
        );
      case 'settings':
        return (
          <SettingsSidebar
            expandedBlocks={expandedBlocks}
            toggleBlock={toggleBlock}
            onResetAll={handleResetAll}
          />
        );
      default:
        return null;
    }
  };

  const renderPreview = () => {
    const tabTemplateType = ['contract', 'Contract'];
    const tabActiveTemplate =
      activeTemplate && tabTemplateType.includes(activeTemplate.type) ? activeTemplate : null;

    if (tabActiveTemplate) {
      return (
        <div id="template-preview" className="flex flex-col items-center gap-10 print:block print:gap-0">
          <div className="relative">
            <div
              className={`relative ${isAdvancedMode ? 'cursor-text' : ''}`}
              dangerouslySetInnerHTML={{
                __html: renderTemplate(
                  tabActiveTemplate.content,
                  supplier,
                  contract,
                  {} as any,
                  activeTab,
                  totalAmount,
                  totalAmountWords,
                  tabActiveTemplate,
                ),
              }}
            />
            {activeTab === 'contract' && (
              <>
                {['contract-p1', 'contract-p2', 'contract-p3', 'contract-p4', 'contract-p5'].map(
                  (pageId) => (
                    <Stamp
                      key={pageId}
                      pageId={pageId}
                      stampUrl={supplier.stampUrl}
                      showStamp={showStamp}
                      position={stampPositions[pageId] || { x: 400, y: 700, scale: 1 }}
                      onUpdatePosition={updateStampPosition}
                      onUpdateScale={updateStampScale}
                    />
                  ),
                )}
              </>
            )}
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'contract':
        return (
          <ContractPreview
            contract={contract}
            supplier={supplier}
            totalAmount={totalAmount}
            totalAmountWords={totalAmountWords}
            showStamp={showStamp}
            stampPositions={stampPositions}
            updateStampPosition={updateStampPosition}
            updateStampScale={updateStampScale}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400 font-bold uppercase tracking-widest">
            Выберите раздел для предпросмотра
          </div>
        );
    }
  };

  // ── Full-page routes ─────────────────────────────────────────────────────────

  if (activeTab === 'dashboard') {
    return <Dashboard onSetActiveTab={setActiveTab} />;
  }

  if (activeTab === 'kp-generator') {
    return (
      <GeneratorPage
        onBack={() => setActiveTab('dashboard')}
        onManageTemplates={() => setActiveTab('template-mapper')}
      />
    );
  }

  if (activeTab === 'template-mapper') {
    return <TemplateMapper onBack={() => setActiveTab('dashboard')} />;
  }

  if (activeTab === 'templates-library') {
    return (
      <TemplatesLibrary
        templates={templates}
        onBack={() => setActiveTab('dashboard')}
        onEditTemplate={(t) => {
          setEditingTemplate(t);
          setActiveTab('contract-builder');
        }}
        onDeleteTemplate={deleteTemplate}
        onNewTemplate={() => {
          setEditingTemplate(null);
          setActiveTab('contract-builder');
        }}
      />
    );
  }

  if (activeTab === 'sales-cockpit') {
    return <ManagerCockpit onBack={() => setActiveTab('dashboard')} />;
  }

  if (activeTab === 'sales-admin') {
    return <AdminPanel onBack={() => setActiveTab('dashboard')} />;
  }

  if (activeTab === 'contract-builder') {
    return (
      <ContractBuilder
        onBack={() => {
          setEditingTemplate(null);
          setActiveTab('dashboard');
        }}
        initialTemplate={editingTemplate || undefined}
        onDocxUpload={handleDocxUpload}
        templateType="Contract"
        onSave={(template) => {
          saveTemplate(template);
          setEditingTemplate(null);
          setActiveTab('dashboard');
        }}
      />
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      sidebar={renderSidebar()}
      preview={renderPreview()}
    />
  );
}
