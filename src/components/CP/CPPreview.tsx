import React from 'react';
import { CPState, CompanyDetails, CPTemplate, CPBlockInstance, CPBlock } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import { Youtube, Phone, CheckCircle2 } from 'lucide-react';
import { CP_BLOCKS } from '../../constants/blocks';

const LOGO_URL = 'https://calidad.kz/wp-content/uploads/2022/09/c-logo-b.png';

interface CPPreviewProps {
  cp: CPState;
  supplier: CompanyDetails;
  activeCPTemplate?: CPTemplate;
  totalAmount?: number;
  customBlocks?: CPBlock[];
}

export const CPPreview: React.FC<CPPreviewProps> = ({ cp, supplier, activeCPTemplate, totalAmount, customBlocks = [] }) => {
  const allBlocks = [...CP_BLOCKS, ...customBlocks];

  const renderBlockInstance = (instance: CPBlockInstance) => {
    const blockDef = allBlocks.find(b => b.id === instance.blockId);
    if (!blockDef) return null;

    let html = blockDef.content;
    
    // Replace placeholders with instance data
    Object.entries(instance.data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, String(value || ''));
    });

    // Fallback for global variables if not provided in instance data
    const globalReplacements: Record<string, string> = {
      'supplier.name': supplier.name,
      'supplier.address': supplier.address,
      'supplier.email': supplier.email,
      'supplier.stampUrl': supplier.stampUrl,
      'cp.clientName': cp.clientName,
      'cp.date': formatDate(cp.date),
      'cp.model': cp.model,
      'totalAmount': formatCurrency(totalAmount || 0),
    };

    Object.entries(globalReplacements).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value);
    });

    return (
      <div 
        key={instance.id} 
        className="relative"
        dangerouslySetInnerHTML={{ __html: html }} 
      />
    );
  };

  if (activeCPTemplate && activeCPTemplate.blocks) {
    return (
      <div id="cp-preview" className="flex flex-col items-center gap-10 print:block print:gap-0">
        {activeCPTemplate.blocks.map(renderBlockInstance)}
      </div>
    );
  }

  return (
    <div id="cp-preview" className="flex flex-col items-center gap-10 print:block print:gap-0">
      <div className="a4-page bg-white p-0 overflow-hidden">
        {/* Header Banner */}
        <div className="h-48 bg-calidad-blue relative overflow-hidden flex items-center px-12">
          <div className="absolute top-0 right-0 w-64 h-full bg-calidad-red -skew-x-12 translate-x-32" />
          <div className="relative z-10">
            <img src={LOGO_URL} alt="Calidad" className="h-16 brightness-0 invert mb-4" referrerPolicy="no-referrer" />
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Коммерческое предложение</h1>
            <p className="text-blue-200 font-bold tracking-widest text-xs uppercase">Industrial Solutions & Engineering</p>
          </div>
        </div>

        <div className="p-12 space-y-10">
          <div className="flex justify-between items-end border-b-2 border-gray-100 pb-6">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Для компании</p>
              <h2 className="text-2xl font-black text-calidad-blue uppercase">{cp.clientName}</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Дата предложения</p>
              <p className="font-bold text-calidad-red">{formatDate(cp.date)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-xl font-black text-calidad-blue border-l-4 border-calidad-red pl-4 uppercase">Лазерный станок {cp.model}</h3>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { label: 'Рабочее поле', value: cp.workingArea },
                  { label: 'Мощность излучателя', value: cp.power },
                  { label: 'Тип охлаждения', value: 'Водяное (чиллер)' },
                  { label: 'Срок поставки', value: cp.deliveryTime }
                ].map((spec, i) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{spec.label}</span>
                    <span className="font-black text-xs text-calidad-blue">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-black text-calidad-blue border-l-4 border-calidad-red pl-4 uppercase">Стоимость решения</h3>
              <div className="space-y-4">
                <div className="bg-calidad-blue p-6 rounded-2xl text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-700" />
                  <p className="text-[10px] font-bold text-blue-200 uppercase mb-2">Комплектация M2</p>
                  <p className="text-3xl font-black">{formatCurrency(cp.prices.m2)} ₸</p>
                </div>
                <div className="bg-white border-2 border-calidad-blue p-6 rounded-2xl text-calidad-blue shadow-xl shadow-gray-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-calidad-blue/5 rounded-full -translate-y-12 translate-x-12 group-hover:scale-150 transition-transform duration-700" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Комплектация Ruida</p>
                  <p className="text-3xl font-black">{formatCurrency(cp.prices.ruida)} ₸</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-black text-calidad-blue uppercase">Видеообзоры оборудования</h3>
            <div className="grid grid-cols-2 gap-6">
              {cp.videos.map((video, i) => (
                <a 
                  key={i} 
                  href={video.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group relative h-32 rounded-2xl overflow-hidden bg-gray-900 flex items-center justify-center"
                >
                  <img 
                    src={`https://img.youtube.com/vi/${video.url.split('v=')[1]}/0.jpg`} 
                    alt={video.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-calidad-red rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Youtube className="text-white" size={20} />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{video.title}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto bg-gray-50 p-12 flex justify-between items-center border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-calidad-blue rounded-2xl flex items-center justify-center shadow-lg">
              <Phone className="text-white" size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ваш менеджер</p>
              <p className="font-black text-calidad-blue">{cp.managerName}</p>
              <p className="text-sm font-bold text-calidad-red">{cp.managerPhone}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Наши преимущества</p>
            <div className="flex gap-4">
              {['Гарантия 12 месяцев', 'Пуско-наладка', 'Обучение'].map((adv, i) => (
                <div key={i} className="flex items-center gap-1 text-[9px] font-bold text-calidad-blue uppercase">
                  <CheckCircle2 size={12} className="text-calidad-red" />
                  {adv}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
