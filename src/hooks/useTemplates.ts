import { useState, useEffect, useMemo } from 'react';
import { Template, AppTab, TemplateField } from '../types';
import { DEFAULT_TEMPLATES } from '../constants';

export const useTemplates = (activeTab: AppTab) => {
  const [templates, setTemplates] = useState<Template[]>(() => {
    const saved = localStorage.getItem('calidad_templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });

  const [activeTemplateId, setActiveTemplateId] = useState<string>(() => {
    const saved = localStorage.getItem('calidad_active_template_id');
    return saved || (DEFAULT_TEMPLATES[0]?.id || '');
  });

  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  useEffect(() => {
    localStorage.setItem('calidad_templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('calidad_active_template_id', activeTemplateId);
  }, [activeTemplateId]);

  const activeTemplate = useMemo(() => {
    return templates.find(t => t.id === activeTemplateId);
  }, [templates, activeTemplateId]);

  const handleDocxUpload = async (file: File) => {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    
    // Simple variable extraction: find all {{variable}} in result.value
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const fields: TemplateField[] = [];
    let match;
    const foundVars = new Set<string>();

    while ((match = variableRegex.exec(result.value)) !== null) {
      const varName = match[1].trim();
      if (!foundVars.has(varName)) {
        fields.push({
          id: varName,
          label: varName,
          type: 'text',
          defaultValue: ''
        });
        foundVars.add(varName);
      }
    }

    return {
      content: result.value,
      fields
    };
  };

  const saveTemplate = (template: Template) => {
    setTemplates(prev => {
      const exists = prev.find(t => t.id === template.id);
      if (exists) {
        return prev.map(t => t.id === template.id ? template : t);
      }
      return [...prev, template];
    });
    setActiveTemplateId(template.id);
  };

  const extractVariable = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.toString()) return;

    const varName = prompt('Введите название переменной (например, clientName):');
    if (!varName) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'bg-yellow-200 border border-yellow-400 px-1 rounded';
    span.textContent = `{{${varName}}}`;
    range.deleteContents();
    range.insertNode(span);

    // Update template content
    const previewEl = document.getElementById('template-preview');
    if (previewEl) {
      const newContent = previewEl.innerHTML;
      setTemplates(prev => prev.map(t => 
        t.id === activeTemplateId 
          ? { ...t, content: newContent, fields: [...t.fields, { id: varName, label: varName, type: 'text', defaultValue: '' }] }
          : t
      ));
    }
  };

  const saveActiveTemplateChanges = () => {
    const previewEl = document.getElementById('template-preview');
    if (previewEl && activeTemplateId) {
      const newContent = previewEl.innerHTML;
      setTemplates(prev => prev.map(t => 
        t.id === activeTemplateId 
          ? { ...t, content: newContent }
          : t
      ));
      alert('Шаблон сохранен!');
    }
  };

  const deleteTemplate = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот шаблон?')) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (activeTemplateId === id) setActiveTemplateId('');
    }
  };

  const updateTemplateField = (fieldId: string, value: string) => {
    setTemplates(prev => prev.map(t => 
      t.id === activeTemplateId 
        ? { ...t, fields: t.fields.map(f => f.id === fieldId ? { ...f, defaultValue: value } : f) }
        : t
    ));
  };

  const resetTemplates = () => {
    setTemplates(DEFAULT_TEMPLATES);
    setActiveTemplateId(DEFAULT_TEMPLATES[0]?.id || '');
    localStorage.removeItem('calidad_templates');
    localStorage.removeItem('calidad_active_template_id');
  };

  return {
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
    resetTemplates
  };
};
