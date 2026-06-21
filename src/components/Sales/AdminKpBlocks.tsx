import React, { useState } from 'react';
import { KpBlock, KpBlockType, KpBlockCategory } from '../../types';
import { useSalesStore } from '../../store/useSalesStore';
import { KpBlockRenderer } from '../CP/KpBlockRenderer';
import '../CP/KpBlock.css';

const BLOCK_TYPES: { value: KpBlockType; label: string }[] = [
  { value: 'text', label: 'Текст' },
  { value: 'gallery', label: 'Галерея фото' },
  { value: 'chips', label: 'Чипсы (иконки)' },
  { value: 'benefits', label: 'Карточки (benefits)' },
];

const BLOCK_CATEGORIES: { value: KpBlockCategory; label: string }[] = [
  { value: 'introduction', label: 'Введение' },
  { value: 'materials', label: 'Материалы' },
  { value: 'examples', label: 'Примеры' },
  { value: 'skills', label: 'Возможности' },
  { value: 'support', label: 'Поддержка' },
  { value: 'social_proof', label: 'Доказательства' },
  { value: 'cta', label: 'Призыв к действию' },
];

export function AdminKpBlocks() {
  const kpBlocks = useSalesStore((s) => s.kpBlocks);
  const addKpBlock = useSalesStore((s) => s.addKpBlock);
  const updateKpBlock = useSalesStore((s) => s.updateKpBlock);
  const deleteKpBlock = useSalesStore((s) => s.deleteKpBlock);

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<KpBlock>>({
    type: 'text',
    category: 'introduction',
    title: '',
    portraits: [],
    equipments: ['co2'],
    visible: true,
    order: kpBlocks.length + 1,
  });

  const handleCreate = () => {
    if (!formData.title) {
      alert('Заполни заголовок');
      return;
    }

    const newBlock: KpBlock = {
      id: `block-${Date.now()}`,
      type: (formData.type || 'text') as KpBlockType,
      category: (formData.category || 'introduction') as KpBlockCategory,
      title: formData.title,
      subtitle: formData.subtitle || '',
      description: formData.description || '',
      content: formData.content || '',
      images: formData.images || [],
      chips: formData.chips || [],
      benefits: formData.benefits || [],
      portraits: formData.portraits || [],
      equipments: formData.equipments || ['co2'],
      visible: true,
      order: formData.order || kpBlocks.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin', // TODO: get from auth
    };

    addKpBlock(newBlock);
    setFormData({
      type: 'text',
      category: 'introduction',
      title: '',
      portraits: [],
      equipments: ['co2'],
      visible: true,
      order: kpBlocks.length + 1,
    });
    setIsCreating(false);
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>КП Блоки ({kpBlocks.length})</h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          style={{
            padding: '8px 16px',
            background: '#0f3c7a',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {isCreating ? 'Отмена' : '+ Новый блок'}
        </button>
      </div>

      {/* Форма создания блока */}
      {isCreating && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px', background: '#f9fafb' }}>
          <h3>Создать новый блок</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Заголовок *</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                placeholder="Например: Материалы"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Тип</label>
              <select
                value={formData.type || 'text'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as KpBlockType })}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                {BLOCK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Категория</label>
              <select
                value={formData.category || 'introduction'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as KpBlockCategory })}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              >
                {BLOCK_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Порядок</label>
              <input
                type="number"
                value={formData.order || kpBlocks.length + 1}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Подзаголовок</label>
            <input
              type="text"
              value={formData.subtitle || ''}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
              placeholder="Опционально"
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Оборудование</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['co2', 'fiber', 'marker'].map((eq) => (
                <label key={eq} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="checkbox"
                    checked={(formData.equipments || []).includes(eq)}
                    onChange={(e) => {
                      const eqs = formData.equipments || [];
                      if (e.target.checked) {
                        setFormData({ ...formData, equipments: [...eqs, eq] });
                      } else {
                        setFormData({ ...formData, equipments: eqs.filter((e) => e !== eq) });
                      }
                    }}
                  />
                  {eq.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            style={{
              padding: '8px 16px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Создать блок
          </button>
        </div>
      )}

      {/* Список блоков */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Левая колона - список */}
        <div>
          <h3 style={{ marginBottom: '12px' }}>Блоки ({kpBlocks.length})</h3>
          {kpBlocks.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>Нет блоков. Создай первый блок</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {kpBlocks
                .sort((a, b) => a.order - b.order)
                .map((block) => (
                  <div
                    key={block.id}
                    style={{
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      background: editingId === block.id ? '#dbeafe' : 'white',
                      cursor: 'pointer',
                    }}
                    onClick={() => setEditingId(editingId === block.id ? null : block.id)}
                  >
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{block.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                      {block.type} • {block.category}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>
                      Портреты: {block.portraits.length > 0 ? block.portraits.join(', ') : 'все'} | Станки: {block.equipments.join(', ')}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteKpBlock(block.id);
                      }}
                      style={{
                        padding: '4px 8px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Правая колона - превью */}
        <div>
          <h3 style={{ marginBottom: '12px' }}>Превью блока</h3>
          {editingId ? (
            kpBlocks
              .filter((b) => b.id === editingId)
              .map((block) => (
                <div key={block.id} style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '12px', background: 'white' }}>
                  <KpBlockRenderer block={block} />
                </div>
              ))
          ) : (
            <p style={{ color: '#9ca3af', textAlign: 'center', paddingTop: '40px' }}>Выбери блок для превью</p>
          )}
        </div>
      </div>
    </div>
  );
}
