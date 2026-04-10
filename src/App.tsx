import React, { useState, useEffect } from 'react';
import { AppTab } from './types';
import { Layout } from './components/UI/Layout';
import { ContractSidebar } from './components/Contract/ContractSidebar';
import { CPSidebar } from './components/CP/CPSidebar';
import { SettingsSidebar } from './components/Settings/SettingsSidebar';
import { ContractPreview } from './components/Contract/ContractPreview';
import { CPPreview } from './components/CP/CPPreview';
import { TemplateControls } from './components/UI/TemplateControls';
import { useContract } from './hooks/useContract';
import { useCP } from './hooks/useCP';
import { useSettings } from './context/SettingsContext';
import { useTemplates } from './hooks/useTemplates';
import { renderTemplate } from './services/templateService';
import { Stamp } from './components/UI/Stamp';

import { Dashboard } from './components/UI/Dashboard';
import { CPBuilder } from './components/CP/CPBuilder';
import { ContractBuilder } from './components/Contract/ContractBuilder';
import { TemplatesLibrary } from './components/UI/TemplatesLibrary';
import { Template, CPTemplate } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const saved = localStorage.getItem('calidad_active_tab');
    return (saved as AppTab) || 'dashboard';
  });

  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editingCPTemplate, setEditingCPTemplate] = useState<CPTemplate | null>(null);

  useEffect(() => {
    localStorage.setItem('calidad_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    (window as any).onEditCPTemplate = (template: CPTemplate) => {
      setEditingCPTemplate(template);
      setActiveTab('cp-builder');
    };
    return () => {
      delete (window as any).onEditCPTemplate;
    };
  }, []);

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
    updateStampScale
  } = useContract();

  const { cp, updateCP, updateCPPrice, resetCP } = useCP();
  const { supplier, resetSettings } = useSettings();
  
  const {
    templates,
    cpTemplates,
    activeTemplateId,
    activeCPTemplateId,
    setActiveTemplateId,
    setActiveCPTemplateId,
    activeTemplate,
    activeCPTemplate,
    isAdvancedMode,
    setIsAdvancedMode,
    handleDocxUpload,
    extractVariable,
    saveTemplate,
    saveActiveTemplateChanges,
    saveCPTemplate,
    deleteTemplate,
    updateTemplateField,
    resetTemplates
  } = useTemplates(activeTab);

  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({
    doc: true,
    spec: true,
    buyer: true,
    cp_main: true,
    cp_prices: true,
    cp_manager: true,
    settings_supplier: true
  });

  const toggleBlock = (id: string) => setExpandedBlocks(prev => ({ ...prev, [id]: !prev[id] }));

  const handleResetAll = () => {
    if (confirm('Вы уверены, что хотите сбросить все данные?')) {
      resetContract();
      resetCP();
      resetSettings();
      resetTemplates();
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
                templates={templates.filter(t => t.type === 'Contract' || t.type === 'contract')}
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
      case 'cp':
        return (
          <div className="space-y-6">
            <CPSidebar 
              cp={cp}
              updateCP={updateCP}
              updateCPPrice={updateCPPrice}
              expandedBlocks={expandedBlocks}
              toggleBlock={toggleBlock}
              cpTemplates={cpTemplates}
              activeCPTemplateId={activeCPTemplateId}
              setActiveCPTemplateId={setActiveCPTemplateId}
              supplier={supplier}
            />
            <div className="px-6 pb-6">
              <TemplateControls 
                templates={templates.filter(t => t.type === 'CP')}
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
                onOpenBuilder={() => setActiveTab('cp-builder')}
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
    if (activeTemplate) {
      return (
        <div id="template-preview" className="flex flex-col items-center gap-10 print:block print:gap-0">
          <div className="relative">
            <div 
              className={`relative ${isAdvancedMode ? 'cursor-text' : ''}`}
              dangerouslySetInnerHTML={{ 
                __html: renderTemplate(
                  activeTemplate.content, 
                  supplier, 
                  contract, 
                  cp, 
                  activeTab, 
                  totalAmount, 
                  totalAmountWords,
                  activeTemplate
                ) 
              }}
            />
            {activeTab === 'contract' && (
              <>
                {['contract-p1', 'contract-p2', 'contract-p3', 'contract-p4', 'contract-p5'].map(pageId => (
                  <Stamp 
                    key={pageId}
                    pageId={pageId}
                    stampUrl={supplier.stampUrl}
                    showStamp={showStamp}
                    position={stampPositions[pageId] || { x: 400, y: 700, scale: 1 }}
                    onUpdatePosition={updateStampPosition}
                    onUpdateScale={updateStampScale}
                  />
                ))}
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
      case 'cp':
        return <CPPreview cp={cp} supplier={supplier} activeCPTemplate={activeCPTemplate} totalAmount={cp.prices.m2 + cp.prices.ruida} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400 font-bold uppercase tracking-widest">
            Выберите раздел для предпросмотра
          </div>
        );
    }
  };

  if (activeTab === 'dashboard') {
    return <Dashboard onSetActiveTab={setActiveTab} />;
  }

  if (activeTab === 'templates-library') {
    return (
      <TemplatesLibrary 
        templates={templates}
        cpTemplates={cpTemplates}
        onBack={() => setActiveTab('dashboard')}
        onEditTemplate={(t) => {
          setEditingTemplate(t);
          setActiveTab('contract-builder');
        }}
        onEditCPTemplate={(t) => {
          setEditingCPTemplate(t);
          setActiveTab('cp-builder');
        }}
        onDeleteTemplate={deleteTemplate}
        onDeleteCPTemplate={(id) => {
          // Add deleteCPTemplate to useTemplates
          console.log('Delete CP Template:', id);
        }}
        onNewTemplate={(type) => {
          if (type === 'Contract') {
            setEditingTemplate(null);
            setActiveTab('contract-builder');
          } else {
            setEditingCPTemplate(null);
            setActiveTab('cp-builder');
          }
        }}
      />
    );
  }

  if (activeTab === 'cp-builder') {
    return (
      <CPBuilder 
        onBack={() => {
          setEditingCPTemplate(null);
          setActiveTab('cp');
        }}
        initialTemplate={editingCPTemplate || undefined}
        onSave={(template) => {
          saveCPTemplate(template);
          setEditingCPTemplate(null);
          setActiveTab('cp');
        }}
        cp={cp}
        supplier={supplier}
      />
    );
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
