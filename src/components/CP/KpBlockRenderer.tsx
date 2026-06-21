import React from 'react';
import { KpBlock } from '../../types';

interface KpBlockRendererProps {
  block: KpBlock;
  isPreview?: boolean;
}

/**
 * Универсальный рендерер для всех типов КП блоков.
 * Поддерживает: text, gallery, chips, benefits
 */
export function KpBlockRenderer({ block, isPreview = true }: KpBlockRendererProps) {
  if (!block.visible) return null;

  return (
    <div className="kp-block" data-block-id={block.id} data-block-type={block.type}>
      {/* Заголовок + подзаголовок */}
      {block.title && (
        <div className="block-header">
          <h2 className="block-title">{block.title}</h2>
          {block.subtitle && <p className="block-subtitle">{block.subtitle}</p>}
        </div>
      )}

      {/* Основное содержимое */}
      <div className="block-content">
        {block.type === 'text' && <TextBlock block={block} />}
        {block.type === 'gallery' && <GalleryBlock block={block} />}
        {block.type === 'chips' && <ChipsBlock block={block} />}
        {block.type === 'benefits' && <BenefitsBlock block={block} />}
      </div>
    </div>
  );
}

// ─── TextBlock ────────────────────────────────────────────────────────────────

function TextBlock({ block }: { block: KpBlock }) {
  return (
    <div className="text-block">
      {block.content && (
        <div className="text-content" dangerouslySetInnerHTML={{ __html: block.content }} />
      )}
      {block.description && (
        <p className="text-description">{block.description}</p>
      )}
    </div>
  );
}

// ─── GalleryBlock (Gallery 3×3 или 2×3) ───────────────────────────────────────

function GalleryBlock({ block }: { block: KpBlock }) {
  if (!block.images?.length) return null;

  // Определяем макет в зависимости от количества фото
  const imageCount = block.images.length;
  const gridClass = imageCount <= 6 ? 'gallery-grid-2x3' : 'gallery-grid-3x3';

  return (
    <div className={`gallery-block ${gridClass}`}>
      {block.images
        .sort((a, b) => a.order - b.order)
        .map((img, idx) => (
          <figure key={`${block.id}-img-${idx}`} className="gallery-item">
            <img src={img.url} alt={img.caption || `Image ${idx + 1}`} loading="lazy" />
            {img.caption && <figcaption>{img.caption}</figcaption>}
          </figure>
        ))}
    </div>
  );
}

// ─── ChipsBlock (Материалы, иконки) ───────────────────────────────────────────

function ChipsBlock({ block }: { block: KpBlock }) {
  if (!block.chips?.length) return null;

  return (
    <div className="chips-block">
      <div className="chips-grid">
        {block.chips.map((chip, idx) => (
          <div key={`${block.id}-chip-${idx}`} className="chip">
            <span className="chip-icon">{chip.icon}</span>
            <span className="chip-label">{chip.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── BenefitsBlock (Кейсы, карточки) ──────────────────────────────────────────

function BenefitsBlock({ block }: { block: KpBlock }) {
  if (!block.benefits?.length) return null;

  return (
    <div className="benefits-block">
      <div className="benefits-grid">
        {block.benefits.map((benefit, idx) => (
          <div key={`${block.id}-benefit-${idx}`} className="benefit-card">
            <div className="benefit-icon">{benefit.icon}</div>
            <h4 className="benefit-title">{benefit.title}</h4>
            <p className="benefit-text">{benefit.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
