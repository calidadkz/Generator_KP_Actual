import React from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Maximize2, X } from 'lucide-react';
import { StampPosition } from '../../types';

interface StampProps {
  pageId: string;
  stampUrl: string;
  showStamp: boolean;
  position: StampPosition;
  onUpdatePosition: (pageId: string, x: number, y: number) => void;
  onUpdateScale: (pageId: string, scale: number) => void;
}

export const Stamp: React.FC<StampProps> = ({ 
  pageId, 
  stampUrl, 
  showStamp, 
  position, 
  onUpdatePosition, 
  onUpdateScale 
}) => {
  if (!showStamp || !stampUrl) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={(_, info) => {
        const rect = (info as any).target.parentElement.getBoundingClientRect();
        const x = info.point.x - rect.left;
        const y = info.point.y - rect.top;
        onUpdatePosition(pageId, x, y);
      }}
      initial={{ x: position.x, y: position.y }}
      style={{ 
        position: 'absolute', 
        zIndex: 50, 
        cursor: 'grab',
        scale: position.scale || 1
      }}
      className="group"
    >
      <div className="relative">
        <img 
          src={stampUrl} 
          alt="Stamp" 
          className="w-32 h-32 object-contain opacity-80 mix-blend-multiply pointer-events-none" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute -top-6 -left-6 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-1 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 items-center">
          <div className="p-1 cursor-move text-gray-400 hover:text-calidad-blue">
            <GripVertical size={14} />
          </div>
          <div className="flex items-center gap-1 border-l border-gray-200 pl-1">
            <button 
              onClick={() => onUpdateScale(pageId, (position.scale || 1) - 0.1)}
              className="p-1 hover:bg-gray-100 rounded text-gray-500"
            >
              <X size={12} className="rotate-45" />
            </button>
            <span className="text-[10px] font-bold w-8 text-center">{Math.round((position.scale || 1) * 100)}%</span>
            <button 
              onClick={() => onUpdateScale(pageId, (position.scale || 1) + 0.1)}
              className="p-1 hover:bg-gray-100 rounded text-gray-500"
            >
              <Maximize2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
