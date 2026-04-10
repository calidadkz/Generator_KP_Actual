import React, { createContext, useContext, useState, useEffect } from 'react';
import { CompanyDetails } from '../types';
import { INITIAL_SUPPLIER } from '../constants';

interface SettingsContextType {
  supplier: CompanyDetails;
  setSupplier: (supplier: CompanyDetails) => void;
  updateSupplierField: (field: keyof CompanyDetails, value: string) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supplier, setSupplier] = useState<CompanyDetails>(() => {
    const saved = localStorage.getItem('calidad_supplier');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIER;
  });

  useEffect(() => {
    localStorage.setItem('calidad_supplier', JSON.stringify(supplier));
  }, [supplier]);

  const updateSupplierField = (field: keyof CompanyDetails, value: string) => {
    setSupplier(prev => ({ ...prev, [field]: value }));
  };

  const resetSettings = () => {
    setSupplier(INITIAL_SUPPLIER);
    localStorage.removeItem('calidad_supplier');
  };

  return (
    <SettingsContext.Provider value={{ supplier, setSupplier, updateSupplierField, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
