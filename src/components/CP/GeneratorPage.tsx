/**
 * GeneratorPage.tsx — Manager КП generator.
 *
 * LEFT  — dynamic form: one block per unique variable key.
 *         Each block has a textarea for the value + a collapsible
 *         "Оформление" panel (font family, color, alignment, padding).
 *
 * RIGHT — live preview: PDF page canvas + absolutely positioned divs that
 *         mirror each pin's bounding box. Text wraps inside the div
 *         (overflow: hidden) exactly as it will in the generated PDF.
 *
 * Download → pdf-lib generates the final PDF with all format overrides applied.
 */

import React, { useState, useCallback } from 'react';
import {
  ArrowLeft, Download, FileText, Settings,
  ChevronLeft, ChevronRight, RefreshCw, ChevronDown,
} from 'lucide-react';
import { PdfPageCanvas } from './PdfPageCanvas';
import { useTemplateStore } from '../../store/useTemplateStore';
import { generateKpPdf, downloadPdf, PAGE_W_PT, PAGE_H_PT } from '../../lib/pdfGenerator';
import type { PdfTemplate, FieldPin, FieldFormatOverride } from '../../types';

// ── Font options ──────────────────────────────────────────────────────────────

const FONT_OPTIONS = [
  { key: 'inter',     label: 'Inter'      },
  { key: 'roboto',    label: 'Roboto'     },
  { key: 'open-sans', label: 'Open Sans'  },
  { key: 'pt-serif',  label: 'PT Serif'   },
] as const;

/** Map fontFamily key → CSS font-family string for live preview */
const FONT_CSS_MAP: Record<string, string> = {
  'inter':     'Inter, sans-serif',
  'roboto':    'Roboto, sans-serif',
  'open-sans': '"Open Sans", sans-serif',
  'pt-serif':  '"PT Serif", serif',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
  onManageTemplates: () => void;
}

const getKeys = (tpl: PdfTemplate): string[] =>
  Array.from(new Set(tpl.fields.map((f) => f.key)));

/** Convert pdf-lib bounding box to CSS px for the overlay div */
const boxToCss = (pin: FieldPin, cssW: number, cssH: number) => ({
  left:   (pin.x                            / PAGE_W_PT) * cssW,
  top:    ((PAGE_H_PT - pin.y - pin.height) / PAGE_H_PT) * cssH,
  width:  (pin.width                        / PAGE_W_PT) * cssW,
  height: (pin.height                       / PAGE_H_PT) * cssH,
});

const defaultFmt = (pin: FieldPin): FieldFormatOverride => ({
  align:      pin.align      ?? 'left',
  paddingX:   pin.paddingX   ?? 0,
  paddingY:   pin.paddingY   ?? 0,
  fontFamily: pin.fontFamily ?? 'inter',
  color:      pin.color      ?? '#000000',
});

// ── Component ─────────────────────────────────────────────────────────────────

export const GeneratorPage: React.FC<Props> = ({ onBack, onManageTemplates }) => {
  const { pdfTemplates } = useTemplateStore();

  const [selected,       setSelected      ] = useState<PdfTemplate | null>(null);
  const [values,         setValues        ] = useState<Record<string, string>>({});
  const [formatOptions,  setFormatOptions ] = useState<Record<string, FieldFormatOverride>>({});
  const [expanded,       setExpanded      ] = useState<Record<string, boolean>>({});
  const [page,           setPage          ] = useState(0);
  const [canvasSize,     setCanvasSize    ] = useState<{ w: number; h: number } | null>(null);
  const [isGenerating,   setIsGenerating  ] = useState(false);

  const handleSizeReady = useCallback((w: number, h: number) => setCanvasSize({ w, h }), []);

  const selectTemplate = (tpl: PdfTemplate) => {
    setSelected(tpl);
    setPage(0);
    setCanvasSize(null);
    const initValues: Record<string, string> = {};
    const initFmt:    Record<string, FieldFormatOverride> = {};
    getKeys(tpl).forEach((k) => {
      initValues[k] = '';
      const pin = tpl.fields.find((f) => f.key === k);
      initFmt[k]   = pin ? defaultFmt(pin) : { align: 'left', paddingX: 0, paddingY: 0, fontFamily: 'inter', color: '#000000' };
    });
    setValues(initValues);
    setFormatOptions(initFmt);
    setExpanded({});
  };

  const resetForm = () => {
    if (!selected) return;
    const initValues: Record<string, string> = {};
    getKeys(selected).forEach((k) => (initValues[k] = ''));
    setValues(initValues);
  };

  const setFmt = (key: string, patch: Partial<FieldFormatOverride>) =>
    setFormatOptions((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const handleDownload = async () => {
    if (!selected || isGenerating) return;
    setIsGenerating(true);
    try {
      const bytes = await generateKpPdf(selected, values, formatOptions);
      const firstName = values[getKeys(selected)[0]] || 'КП';
      downloadPdf(bytes, `КП_${firstName}`);
    } catch (err: any) {
      alert('Ошибка генерации PDF: ' + (err?.message || String(err)));
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Template selection ──────────────────────────────────────────────────────

  if (!selected) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft size={20} className="text-gray-500" /></button>
          <div>
            <h1 className="text-lg font-black text-gray-800">Генератор КП</h1>
            <p className="text-xs text-gray-400">Выберите шаблон коммерческого предложения</p>
          </div>
          <button onClick={onManageTemplates}
            className="ml-auto flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50">
            <Settings size={16} /> Управление шаблонами
          </button>
        </div>

        <div className="p-6">
          {pdfTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText size={48} className="text-gray-200 mb-4" />
              <p className="text-gray-400 font-medium">Нет шаблонов КП</p>
              <p className="text-gray-300 text-sm mt-1 mb-6">Создайте шаблон в конструкторе</p>
              <button onClick={onManageTemplates}
                className="flex items-center gap-2 bg-calidad-blue text-white px-6 py-3 rounded-xl text-sm font-black hover:bg-blue-800">
                <Settings size={16} /> Открыть конструктор
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pdfTemplates.map((t) => (
                <button key={t.id} onClick={() => selectTemplate(t)}
                  className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-5 text-left hover:border-calidad-blue hover:shadow-md transition-all group">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-calidad-blue transition-colors">
                    <FileText size={20} className="text-calidad-blue group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-black text-gray-800">{t.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">{t.fields.length} зон · {t.pageCount} стр.</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {getKeys(t).map((k) => (
                      <span key={k} className="px-2 py-0.5 bg-blue-50 text-calidad-blue text-[10px] font-bold rounded-full">{k}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Generator screen ────────────────────────────────────────────────────────

  const keys       = getKeys(selected);
  const pinsOnPage = selected.fields.filter((p) => p.page === page);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 flex-shrink-0">
        <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={20} className="text-gray-500" />
        </button>
        <div>
          <h1 className="text-lg font-black text-gray-800">{selected.name}</h1>
          <p className="text-xs text-gray-400">Заполните поля слева — текст появляется в предпросмотре справа</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={resetForm} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl" title="Очистить">
            <RefreshCw size={18} />
          </button>
          <button onClick={handleDownload} disabled={isGenerating}
            className="flex items-center gap-2 bg-calidad-blue text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed">
            {isGenerating
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Генерация...</>
              : <><Download size={16} /> Скачать PDF</>
            }
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: form */}
        <div className="w-80 bg-white border-r border-gray-100 overflow-y-auto flex-shrink-0 pb-20">
          <div className="p-4 border-b border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Данные для КП</p>
          </div>

          <div className="p-4 space-y-5">
            {keys.length === 0 && (
              <p className="text-gray-300 text-xs text-center py-8">В шаблоне нет переменных</p>
            )}

            {keys.map((key) => {
              const fmt  = formatOptions[key] ?? {};
              const open = expanded[key] ?? false;
              return (
                <div key={key} className="rounded-xl border border-gray-100 overflow-hidden">
                  {/* Text input area */}
                  <div className="px-3 pt-3 pb-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{key}</label>
                    <textarea
                      rows={2}
                      value={values[key] ?? ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={key}
                      className="w-full border-b-2 border-gray-200 focus:border-calidad-blue py-1.5 outline-none text-sm font-medium resize-none transition-colors bg-transparent"
                    />
                  </div>

                  {/* Toggle formatting panel */}
                  <button
                    onClick={() => setExpanded((p) => ({ ...p, [key]: !open }))}
                    className="w-full flex items-center justify-between px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors text-[10px] font-bold text-gray-400 uppercase tracking-wider"
                  >
                    Оформление
                    <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Formatting panel */}
                  {open && (
                    <div className="px-3 py-3 space-y-3 border-t border-gray-100 bg-gray-50/50">

                      {/* Font family */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Шрифт</label>
                        <select
                          value={fmt.fontFamily ?? 'inter'}
                          onChange={(e) => setFmt(key, { fontFamily: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-calidad-blue bg-white"
                        >
                          {FONT_OPTIONS.map((f) => (
                            <option key={f.key} value={f.key}>{f.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Color */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Цвет текста</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={fmt.color ?? '#000000'}
                            onChange={(e) => setFmt(key, { color: e.target.value })}
                            className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
                          />
                          <span className="text-xs text-gray-400 font-mono">{fmt.color ?? '#000000'}</span>
                        </div>
                      </div>

                      {/* Alignment */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Выравнивание</label>
                        <div className="flex gap-1.5">
                          {(['left', 'center', 'right'] as const).map((a) => (
                            <button key={a}
                              onClick={() => setFmt(key, { align: a })}
                              className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${(fmt.align ?? 'left') === a ? 'bg-calidad-blue text-white border-calidad-blue' : 'bg-white text-gray-500 border-gray-200 hover:border-calidad-blue'}`}>
                              {a === 'left' ? '◀' : a === 'center' ? '▬' : '▶'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Padding */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Отступ гориз.</label>
                          <input
                            type="number" min={0} max={50}
                            value={fmt.paddingX ?? 0}
                            onChange={(e) => setFmt(key, { paddingX: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-calidad-blue bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Отступ верт.</label>
                          <input
                            type="number" min={0} max={50}
                            value={fmt.paddingY ?? 0}
                            onChange={(e) => setFmt(key, { paddingY: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-calidad-blue bg-white"
                          />
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: live preview */}
        <div className="flex-1 overflow-auto p-6 flex flex-col items-center gap-4">
          <div className="relative shadow-xl rounded" style={{ display: 'inline-block' }}>
            <PdfPageCanvas
              pdfRef={selected.basePdfRef}
              pageIndex={page}
              renderScale={1.5}
              onSizeReady={handleSizeReady}
              className="block"
            />

            {/* Bounding-box text overlays */}
            {canvasSize && pinsOnPage.map((pin, i) => {
              const val = values[pin.key] ?? '';
              const fmt = formatOptions[pin.key] ?? {};
              const css = boxToCss(pin, canvasSize.w, canvasSize.h);
              const scale  = canvasSize.w / PAGE_W_PT;
              const padXcss = ((fmt.paddingX ?? 0) / PAGE_W_PT) * canvasSize.w;
              const padYcss = ((fmt.paddingY ?? 0) / PAGE_H_PT) * canvasSize.h;
              return (
                <div
                  key={i}
                  className="absolute overflow-hidden pointer-events-none"
                  style={{
                    left:         css.left,
                    top:          css.top,
                    width:        css.width,
                    height:       css.height,
                    fontSize:     pin.fontSize * scale,
                    fontWeight:   pin.fontWeight === 'bold' ? 700 : 400,
                    color:        fmt.color      ?? pin.color,
                    fontFamily:   FONT_CSS_MAP[fmt.fontFamily ?? 'inter'],
                    lineHeight:   1.25,
                    whiteSpace:   'pre-wrap',
                    wordBreak:    'break-word',
                    overflowWrap: 'break-word',
                    textAlign:    fmt.align ?? 'left',
                    padding:      `${padYcss}px ${padXcss}px`,
                    boxSizing:    'border-box',
                  }}
                >
                  {val}
                </div>
              );
            })}
          </div>

          {/* Page navigation */}
          {selected.pageCount > 1 && (
            <div className="flex items-center gap-3">
              <button disabled={page === 0}
                onClick={() => { setPage((p) => p - 1); setCanvasSize(null); }}
                className="p-2 rounded-xl border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-gray-500">Стр. {page + 1} / {selected.pageCount}</span>
              <button disabled={page >= selected.pageCount - 1}
                onClick={() => { setPage((p) => p + 1); setCanvasSize(null); }}
                className="p-2 rounded-xl border border-gray-200 disabled:opacity-30 hover:bg-gray-50">
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <p className="text-[10px] text-gray-400 text-center max-w-xs">
            Предпросмотр точно отражает расположение и перенос строк в финальном PDF.
          </p>
        </div>
      </div>
    </div>
  );
};
