import { useState, useEffect, useMemo } from 'react';
import { ContractState, LineItem, Specification, CompanyDetails, StampPosition } from '../types';
import { numberToWordsRu } from '../utils';

const INITIAL_CONTRACT: ContractState = {
  number: '124-2024',
  date: new Date().toISOString().split('T')[0],
  deliveryDays: 45,
  buyer: {
    name: 'ТОО «ПромТехИнвест»',
    bin: '123456789012',
    iik: 'KZ123456789012345678',
    bank: 'АО «Народный Банк Казахстана»',
    bik: 'HSBKZKA',
    address: 'г. Алматы, пр. Абая, 150',
    director: 'Иванов И. И.',
    basis: 'Устава',
    signer: 'Иванов И. И.',
    phone: '+7 777 123 45 67',
    email: 'info@promtech.kz',
    stampUrl: ''
  },
  spec: {
    main: [{ id: '1', name: 'Лазерный станок CALIDAD 1390', qty: 1, price: 2500000 }],
    components: [{ id: '2', name: 'Чиллер CW-5200', qty: 1, price: 150000 }],
    consumables: [{ id: '3', name: 'Лазерная трубка Reci W2', qty: 1, price: 85000 }]
  }
};

export const useContract = () => {
  const [contract, setContract] = useState<ContractState>(() => {
    const saved = localStorage.getItem('calidad_contract');
    return saved ? JSON.parse(saved) : INITIAL_CONTRACT;
  });

  useEffect(() => {
    localStorage.setItem('calidad_contract', JSON.stringify(contract));
  }, [contract]);

  const totalAmount = useMemo(() => {
    const { main, components, consumables } = contract.spec;
    return [...main, ...components, ...consumables].reduce((acc, item) => acc + (item.qty * item.price), 0);
  }, [contract.spec]);

  const totalAmountWords = useMemo(() => numberToWordsRu(totalAmount), [totalAmount]);

  const updateContract = (path: string, value: any) => {
    setContract(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let current: any = newState;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      return newState;
    });
  };

  const updateBuyer = (field: keyof CompanyDetails, value: string) => {
    setContract(prev => ({
      ...prev,
      buyer: { ...prev.buyer, [field]: value }
    }));
  };

  const addLineItem = (category: keyof Specification) => {
    const newItem: LineItem = { id: Math.random().toString(36).substr(2, 9), name: '', qty: 1, price: 0 };
    setContract(prev => ({
      ...prev,
      spec: { ...prev.spec, [category]: [...prev.spec[category], newItem] }
    }));
  };

  const removeLineItem = (category: keyof Specification, id: string) => {
    setContract(prev => ({
      ...prev,
      spec: { ...prev.spec, [category]: prev.spec[category].filter(i => i.id !== id) }
    }));
  };

  const updateLineItem = (category: keyof Specification, id: string, field: keyof LineItem, value: any) => {
    setContract(prev => ({
      ...prev,
      spec: {
        ...prev.spec,
        [category]: prev.spec[category].map(i => i.id === id ? { ...i, [field]: value } : i)
      }
    }));
  };

  const resetContract = () => {
    setContract(INITIAL_CONTRACT);
    localStorage.removeItem('calidad_contract');
  };

  const [showStamp, setShowStamp] = useState<boolean>(() => {
    const saved = localStorage.getItem('calidad_show_stamp');
    return saved ? JSON.parse(saved) : true;
  });

  const [stampPositions, setStampPositions] = useState<Record<string, StampPosition>>(() => {
    const saved = localStorage.getItem('calidad_stamp_positions');
    return saved ? JSON.parse(saved) : {
      'contract-p1': { x: 400, y: 700, scale: 1 },
      'contract-p2': { x: 400, y: 700, scale: 1 },
      'contract-p3': { x: 100, y: 650, scale: 1 },
      'contract-p4': { x: 450, y: 750, scale: 1 },
      'contract-p5': { x: 450, y: 600, scale: 1 }
    };
  });

  useEffect(() => {
    localStorage.setItem('calidad_show_stamp', JSON.stringify(showStamp));
  }, [showStamp]);

  useEffect(() => {
    localStorage.setItem('calidad_stamp_positions', JSON.stringify(stampPositions));
  }, [stampPositions]);

  const updateStampPosition = (pageId: string, x: number, y: number) => {
    setStampPositions(prev => ({
      ...prev,
      [pageId]: { ...(prev[pageId] || { scale: 1 }), x, y }
    }));
  };

  const updateStampScale = (pageId: string, scale: number) => {
    setStampPositions(prev => ({
      ...prev,
      [pageId]: { ...(prev[pageId] || { x: 100, y: 100 }), scale }
    }));
  };

  return {
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
    setShowStamp,
    stampPositions,
    updateStampPosition,
    updateStampScale
  };
};
