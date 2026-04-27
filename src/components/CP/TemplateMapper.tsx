/**
 * TemplateMapper.tsx — Admin tool for creating PDF КП templates.
 *
 * Variable placement workflow:
 *   1. Upload a designer PDF (the "подложка").
 *   2. DRAG a rectangle over the area where a variable should appear.
 *      The rectangle defines exactly where text will be drawn and clipped.
 *   3. In the panel that appears, type the variable name and set font options.
 *   4. Click "Добавить" → the zone is saved and shown as a labelled overlay.
 *   5. Repeat for every variable across all pages.
 *   6. Save the template.
 *
 * In GeneratorPage the same rectangles are used for:
 *   - Live CSS overlay (text wraps inside the div, overflow hidden)
 *   - PDF generation (text word-wrapped inside the box via pdf-lib)
 */

import React, { useState, useRef } from 'react';
import {
  ArrowLeft, Plus, Trash2, Upload, Save, FileText,
  Settings, ChevronLeft, ChevronRight, Check, X,
} from 'lucide-react';
import { PdfPageCanvas } from './PdfPageCanvas';
import { useTemplateStore } from '../../store/useTemplateStore';
import { savePdf } from '../../lib/pdfStorage';
import { canvasRectToPdfBox, PAGE_W_PT, PAGE_H_PT } from '../../lib/pdfGenerator';
import type { PdfTemplate, FieldPin } from '../../types';

type Mode = 'list' | 'editor';

interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const emptyPinForm = () => ({
  key: '',
  fontSize: 11,
  fontWeight: 'normal' as 'normal' | 'bold',
  color: '#000000',
});

const blankTemplate = (): PdfTemplate => ({
  id:         `tpl-${Date.now()}`,
  name:       '',
  basePdfRef: '',
  pageCount:  1,
  fields:     [],
  createdAt:  Date.now(),
});

interface Props { onBack: () => void; }

export const TemplateMapper: React.FC<Props> = ({ onBack }) => {
  const { pdfTemplates, saveTemplate, deleteTemplate } = useTemplateStore();

  const [mode,      setMode     ] = useState<Mode>('list');
  const [tpl,       setTpl      ] = useState<PdfTemplate>(blankTemplate());
  const [pageIdx,   setPageIdx  ] = useState(0);
  const [canvasSize,setCanvasSize] = useState<{ w: number; h: number } | null>(null);

  // Drag state
  const [drag,      setDrag     ] = useState<DragState | null>(null);
  // Pending pin (filled after drag ends)
  const [pending,   setPending  ] = useState<Omit<FieldPin, 'key' | 'fontSize' | 'fontWeight' | 'color'> | null>(null);
  const [pinForm,   setPinForm  ] = useState(emptyPinForm());

  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── PDF upload ──────────────────────────────────────────────────────────────

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) { alert('Загрузите PDF файл'); return; }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const ref = await savePdf(buf);
      const { getDocument } = await import('pdfjs-dist');
      const doc = await getDocument({ data: new Uint8Array(buf) }).promise;
      setTpl((p) => ({ ...p, basePdfRef: ref, pageCount: doc.numPages, name: p.name || file.name.replace(/\.pdf$/i, '') }));
      setPageIdx(0);
      setCanvasSize(null);
    } catch (e) { alert('Ошибка: ' + String(e)); }
    finally { setUploading(false); }
  };

  // ── Drag handlers ───────────────────────────────────────────────────────────

  const getRelative = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { x, y } = getRelative(e);
    setDrag({ startX: x, startY: y, currentX: x, currentY: y });
    setPending(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drag) return;
    const { x, y } = getRelative(e);
    setDrag((d) => d ? { ...d, currentX: x, currentY: y } : null);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drag) return;
    const { x: endX, y: endY } = getRelative(e);

    const cssW = parseFloat(e.currentTarget.getAttribute('data-css-width')  || String(e.currentTarget.offsetWidth));
    const cssH = parseFloat(e.currentTarget.getAttribute('data-css-height') || String(e.currentTarget.offsetHeight));

    const box = canvasRectToPdfBox(drag.startX, drag.startY, endX, endY, cssW, cssH);

    // Minimum size: 10×5 pts — otherwise treat as accidental click
    if (box.width < 10 || box.height < 5) { setDrag(null); return; }

    setPending({ page: pageIdx, ...box });
    setPinForm(emptyPinForm());
    setDrag(null);
  };

  const confirmPin = () => {
    if (!pending) return;
    if (!pinForm.key.trim()) { alert('Введите название переменной'); return; }
    const pin: FieldPin = {
      ...pending,
      key:        pinForm.key.trim(),
      fontSize:   pinForm.fontSize,
      fontWeight: pinForm.fontWeight,
      color:      pinForm.color,
    };
    setTpl((p) => ({ ...p, fields: [...p.fields, pin] }));
    setPending(null);
  };

  const removePin = (idx: number) =>
    setTpl((p) => ({ ...p, fields: p.fields.filter((_, i) => i !== idx) }));

  const handleSave = () => {
    if (!tpl.name.trim())   { alert('Введите название шаблона'); return; }
    if (!tpl.basePdfRef)    { alert('Загрузите PDF-подложку');   return; }
    saveTemplate(tpl);
    setMode('list');
  };

  // ── Overlay helpers ─────────────────────────────────────────────────────────

  /** Convert a pdf-lib bounding box to CSS px position/size */
  const boxToCss = (pin: FieldPin, cw: number, ch: number) => ({
    left:   (pin.x / PAGE_W_PT) * cw,
    top:    ((PAGE_H_PT - pin.y - pin.height) / PAGE_H_PT) * ch,
    width:  (pin.width  / PAGE_W_PT) * cw,
    height: (pin.height / PAGE_H_PT) * ch,
  });

  // ────────────────────────────────────────────────────────────────────────────
  // LIST
  // ────────────────────────────────────────────────────────────────────────────
  if (mode === 'list') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft size={20} className="text-gray-500" /></button>
          <div>
            <h1 className="text-lg font-black text-gray-800">Конструктор шаблонов КП</h1>
            <p className="text-xs text-gray-400">Загрузите PDF-подложку и выделите зоны для переменных</p>
          </div>
          <button onClick={() => { setTpl(blankTemplate()); setPageIdx(0); setCanvasSize(null); setPending(null); setMode('editor'); }}
            className="ml-auto flex items-center gap-2 bg-calidad-blue text-white px-4 py-2.5 rounded-xl text-sm font-black hover:bg-blue-800">
            <Plus size={16} /> Новый шаблон
          </button>
        </div>

        <div className="p-6">
          {pdfTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText size={48} className="text-gray-200 mb-4" />
              <p className="text-gray-400 font-medium">Нет шаблонов</p>
              <p className="text-gray-300 text-sm mt-1">Создайте первый шаблон</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pdfTemplates.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-black text-gray-800">{t.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{t.fields.length} зон · {t.pageCount} стр.</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setTpl(t); setPageIdx(0); setCanvasSize(null); setPending(null); setMode('editor'); }}
                        className="p-1.5 text-gray-400 hover:text-calidad-blue hover:bg-blue-50 rounded-lg"><Settings size={14} /></button>
                      <button onClick={() => { if (confirm('Удалить шаблон?')) deleteTemplate(t.id); }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(t.fields.map((f) => f.key))).map((k) => (
                      <span key={k} className="px-2 py-0.5 bg-blue-50 text-calidad-blue text-[10px] font-bold rounded-full">{k}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // EDITOR
  // ────────────────────────────────────────────────────────────────────────────

  const pinsOnPage = tpl.fields.filter((p) => p.page === pageIdx);

  // Drag rect in CSS px (for the overlay indicator)
  const dragRect = drag && canvasSize ? {
    left:   Math.min(drag.startX, drag.currentX),
    top:    Math.min(drag.startY, drag.currentY),
    width:  Math.abs(drag.currentX - drag.startX),
    height: Math.abs(drag.currentY - drag.startY),
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 flex-shrink-0">
        <button onClick={() => { setPending(null); setDrag(null); setMode('list'); }} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={20} className="text-gray-500" />
        </button>
        <input type="text" value={tpl.name} placeholder="Название шаблона..."
          onChange={(e) => setTpl((p) => ({ ...p, name: e.target.value }))}
          className="flex-1 text-lg font-black bg-transparent outline-none border-b-2 border-transparent focus:border-calidad-blue py-1" />
        <button onClick={handleSave}
          className="flex items-center gap-2 bg-calidad-blue text-white px-4 py-2.5 rounded-xl text-sm font-black hover:bg-blue-800">
          <Save size={16} /> Сохранить
        </button>
      </div>

      {/* Instruction */}
      <div className="bg-amber-50 border-b border-amber-100 px-6 py-2 text-xs text-amber-700 font-medium flex items-center gap-2">
        <span className="w-5 h-5 bg-amber-400 text-white rounded-full flex items-center justify-center font-black text-[10px] flex-shrink-0">!</span>
        Зажмите и потяните мышью прямоугольник на PDF — это будет зоной переменной. Текст заполнит именно этот прямоугольник.
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: canvas */}
        <div className="flex-1 overflow-auto p-6 flex flex-col items-center gap-4">
          {!tpl.basePdfRef ? (
            <div onClick={() => fileRef.current?.click()}
              className="w-full max-w-[595px] aspect-[595/842] border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-calidad-blue hover:bg-blue-50/30 transition-all">
              {uploading
                ? <div className="w-8 h-8 border-2 border-calidad-blue border-t-transparent rounded-full animate-spin" />
                : <><Upload size={32} className="text-gray-300" /><p className="text-gray-400 font-medium">Загрузить PDF-подложку</p></>
              }
            </div>
          ) : (
            <>
              {/* Canvas + overlays */}
              <div className="relative select-none" style={{ display: 'inline-block' }}>
                <PdfPageCanvas
                  pdfRef={tpl.basePdfRef}
                  pageIndex={pageIdx}
                  renderScale={1.5}
                  onSizeReady={(w, h) => setCanvasSize({ w, h })}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="block shadow-xl rounded"
                />

                {/* Drag preview rectangle */}
                {dragRect && dragRect.width > 2 && (
                  <div className="absolute pointer-events-none rounded"
                    style={{
                      left: dragRect.left, top: dragRect.top,
                      width: dragRect.width, height: dragRect.height,
                      border: '2px dashed #0066cc',
                      backgroundColor: 'rgba(0,102,204,0.08)',
                    }} />
                )}

                {/* Saved pin zones */}
                {canvasSize && pinsOnPage.map((pin, i) => {
                  const css = boxToCss(pin, canvasSize.w, canvasSize.h);
                  return (
                    <div key={i} className="absolute pointer-events-none group"
                      style={{ left: css.left, top: css.top, width: css.width, height: css.height }}>
                      <div className="w-full h-full rounded border-2 border-calidad-blue/50 bg-calidad-blue/5" />
                      <span className="absolute -top-5 left-0 bg-calidad-blue text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shadow">
                        {pin.key}
                      </span>
                    </div>
                  );
                })}

                {/* Pending zone indicator (after drag, before confirm) */}
                {pending && canvasSize && (
                  <div className="absolute pointer-events-none"
                    style={{
                      left:   (pending.x       / PAGE_W_PT) * canvasSize.w,
                      top:    ((PAGE_H_PT - pending.y - pending.height) / PAGE_H_PT) * canvasSize.h,
                      width:  (pending.width  / PAGE_W_PT) * canvasSize.w,
                      height: (pending.height / PAGE_H_PT) * canvasSize.h,
                      border: '2px solid #ef4444',
                      backgroundColor: 'rgba(239,68,68,0.08)',
                      borderRadius: 4,
                    }} />
                )}
              </div>

              {/* Page nav */}
              {tpl.pageCount > 1 && (
                <div className="flex items-center gap-3">
                  <button disabled={pageIdx === 0}
                    onClick={() => { setPageIdx((p) => p - 1); setCanvasSize(null); setPending(null); }}
                    className="p-2 rounded-xl border border-gray-200 disabled:opacity-30 hover:bg-gray-50"><ChevronLeft size={16} /></button>
                  <span className="text-sm font-bold text-gray-500">Стр. {pageIdx + 1} / {tpl.pageCount}</span>
                  <button disabled={pageIdx >= tpl.pageCount - 1}
                    onClick={() => { setPageIdx((p) => p + 1); setCanvasSize(null); setPending(null); }}
                    className="p-2 rounded-xl border border-gray-200 disabled:opacity-30 hover:bg-gray-50"><ChevronRight size={16} /></button>
                </div>
              )}

              <button onClick={() => fileRef.current?.click()}
                className="text-xs text-gray-400 hover:text-calidad-blue flex items-center gap-1 transition-colors">
                <Upload size={12} /> Заменить PDF
              </button>
            </>
          )}
          <input ref={fileRef} type="file" accept=".pdf" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        </div>

        {/* RIGHT: sidebar */}
        <div className="w-80 bg-white border-l border-gray-100 overflow-y-auto flex-shrink-0 flex flex-col">

          {/* Pending pin form */}
          {pending && (
            <div className="p-4 bg-blue-50 border-b border-blue-100">
              <p className="text-xs font-black text-calidad-blue uppercase tracking-wider mb-1">
                Новая зона · стр.{pending.page + 1}
              </p>
              <p className="text-[10px] text-blue-400 mb-3">
                {Math.round(pending.width)} × {Math.round(pending.height)} pt
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Название переменной</label>
                  <input autoFocus type="text" placeholder='напр. "Имя клиента"'
                    value={pinForm.key}
                    onChange={(e) => setPinForm((p) => ({ ...p, key: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmPin(); if (e.key === 'Escape') setPending(null); }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-calidad-blue" />
                  <p className="text-[10px] text-gray-400 mt-1">Имя станет полем формы у менеджера</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Размер шрифта</label>
                    <input type="number" min={6} max={72}
                      value={pinForm.fontSize}
                      onChange={(e) => setPinForm((p) => ({ ...p, fontSize: Math.max(6, parseInt(e.target.value) || 11) }))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-1 outline-none focus:border-calidad-blue" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Цвет</label>
                    <input type="color" value={pinForm.color}
                      onChange={(e) => setPinForm((p) => ({ ...p, color: e.target.value }))}
                      className="w-full h-[34px] border border-gray-200 rounded-lg mt-1 cursor-pointer" />
                  </div>
                </div>

                <div className="flex gap-2">
                  {(['normal', 'bold'] as const).map((w) => (
                    <button key={w} onClick={() => setPinForm((p) => ({ ...p, fontWeight: w }))}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${pinForm.fontWeight === w ? 'bg-calidad-blue text-white border-calidad-blue' : 'bg-white text-gray-500 border-gray-200 hover:border-calidad-blue'}`}>
                      {w === 'normal' ? 'Обычный' : 'Жирный'}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button onClick={confirmPin}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-calidad-blue text-white py-2 rounded-xl text-xs font-black hover:bg-blue-800 transition-colors">
                    <Check size={14} /> Добавить
                  </button>
                  <button onClick={() => setPending(null)}
                    className="px-3 py-2 text-gray-400 border border-gray-200 rounded-xl text-xs hover:bg-gray-50">
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pin list */}
          <div className="p-4 flex-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">
              Зоны ({tpl.fields.length})
            </p>
            {tpl.fields.length === 0 ? (
              <p className="text-gray-300 text-xs text-center py-8">Потяните прямоугольник на PDF</p>
            ) : (
              <div className="space-y-2">
                {tpl.fields.map((pin, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 group">
                    <div>
                      <p className="text-xs font-bold text-gray-700">{pin.key}</p>
                      <p className="text-[10px] text-gray-400">
                        Стр.{pin.page + 1} · {pin.fontSize}pt ·
                        <span className="font-bold" style={{ color: pin.color }}> ■ </span>
                        {Math.round(pin.width)}×{Math.round(pin.height)}pt
                      </p>
                    </div>
                    <button onClick={() => removePin(i)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 transition-opacity">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
