import { useState, useEffect } from 'react';
import { CPState } from '../types';

const INITIAL_CP: CPState = {
  clientName: 'Уважаемый партнер',
  date: new Date().toISOString().split('T')[0],
  model: 'CALIDAD 1390 Pro',
  workingArea: '1300 x 900 мм',
  power: '100 Вт',
  prices: { m2: 2450000, ruida: 2650000 },
  deliveryTime: '15-20 рабочих дней',
  videos: [
    { title: 'Обзор станка 1390', url: 'https://youtube.com/watch?v=example1' },
    { title: 'Работа по дереву', url: 'https://youtube.com/watch?v=example2' }
  ],
  managerName: 'Александр',
  managerPhone: '+7 707 920 28 20'
};

export const useCP = () => {
  const [cp, setCP] = useState<CPState>(() => {
    const saved = localStorage.getItem('calidad_cp');
    return saved ? JSON.parse(saved) : INITIAL_CP;
  });

  useEffect(() => {
    localStorage.setItem('calidad_cp', JSON.stringify(cp));
  }, [cp]);

  const updateCP = (field: keyof CPState, value: any) => {
    setCP(prev => ({ ...prev, [field]: value }));
  };

  const updateCPPrice = (field: keyof CPState['prices'], value: number) => {
    setCP(prev => ({ ...prev, prices: { ...prev.prices, [field]: value } }));
  };

  const resetCP = () => {
    setCP(INITIAL_CP);
    localStorage.removeItem('calidad_cp');
  };

  return {
    cp,
    updateCP,
    updateCPPrice,
    resetCP
  };
};
