import React, { createContext, useContext, useState, useEffect } from 'react';
import { CompanyDetails, WordPressConfig } from '../types';
import { INITIAL_SUPPLIER } from '../constants';

interface SettingsContextType {
  supplier: CompanyDetails;
  setSupplier: (supplier: CompanyDetails) => void;
  updateSupplierField: (field: keyof CompanyDetails, value: string) => void;
  resetSettings: () => void;
  wpConfig: WordPressConfig | null;
  setWpConfig: (config: WordPressConfig | null) => void;
  updateWpConfigField: (field: keyof WordPressConfig, value: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supplier, setSupplier] = useState<CompanyDetails>(() => {
    const saved = localStorage.getItem('calidad_supplier');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIER;
  });

  const [wpConfig, setWpConfig] = useState<WordPressConfig | null>(() => {
    const saved = localStorage.getItem('calidad_wp_config');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('calidad_supplier', JSON.stringify(supplier));
  }, [supplier]);

  useEffect(() => {
    if (wpConfig) {
      localStorage.setItem('calidad_wp_config', JSON.stringify(wpConfig));
    } else {
      localStorage.removeItem('calidad_wp_config');
    }
  }, [wpConfig]);

  const updateSupplierField = (field: keyof CompanyDetails, value: string) => {
    setSupplier(prev => ({ ...prev, [field]: value }));
  };

  const updateWpConfigField = (field: keyof WordPressConfig, value: string) => {
    setWpConfig(prev => (prev ? { ...prev, [field]: value } : null));
  };

  const resetSettings = () => {
    setSupplier(INITIAL_SUPPLIER);
    localStorage.removeItem('calidad_supplier');
  };

  return (
    <SettingsContext.Provider
      value={{
        supplier,
        setSupplier,
        updateSupplierField,
        resetSettings,
        wpConfig,
        setWpConfig,
        updateWpConfigField,
      }}
    >
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
