import { Template, CompanyDetails, ContractState, CPState } from '../types';
import { formatCurrency, formatDate } from '../utils';

export const renderTemplate = (
  content: string, 
  supplier: CompanyDetails, 
  contract: ContractState, 
  cp: CPState, 
  activeTab: string,
  totalAmount: number,
  totalAmountWords: string,
  activeTemplate?: Template
) => {
  let html = content;

  // Global variables
  const variables: Record<string, string> = {
    'supplier.name': supplier.name,
    'supplier.bin': supplier.bin,
    'supplier.iik': supplier.iik,
    'supplier.bank': supplier.bank,
    'supplier.bik': supplier.bik,
    'supplier.address': supplier.address,
    'supplier.director': supplier.director,
    'supplier.basis': supplier.basis,
    'supplier.signer': supplier.signer,
    'supplier.phone': supplier.phone,
    'supplier.email': supplier.email,
    'executorStampUrl': supplier.stampUrl,
  };

  if (activeTab === 'contract') {
    Object.assign(variables, {
      'contract.number': contract.number,
      'contract.date': formatDate(contract.date),
      'contract.deliveryDays': contract.deliveryDays.toString(),
      'buyer.name': contract.buyer.name,
      'buyer.bin': contract.buyer.bin,
      'buyer.iik': contract.buyer.iik,
      'buyer.bank': contract.buyer.bank,
      'buyer.bik': contract.buyer.bik,
      'buyer.address': contract.buyer.address,
      'buyer.director': contract.buyer.director,
      'buyer.basis': contract.buyer.basis,
      'buyer.signer': contract.buyer.signer,
      'buyer.phone': contract.buyer.phone,
      'buyer.email': contract.buyer.email,
      'totalAmount': formatCurrency(totalAmount),
      'totalAmountWords': totalAmountWords,
    });
  } else if (activeTab === 'cp') {
    Object.assign(variables, {
      'clientName': cp.clientName,
      'kpDate': formatDate(cp.date),
      'modelName': cp.model,
      'workingArea': cp.workingArea,
      'laserPower': cp.power,
      'priceM2': formatCurrency(cp.prices.m2),
      'priceRuida': formatCurrency(cp.prices.ruida),
      'deliveryTime': cp.deliveryTime,
      'managerName': cp.managerName,
      'managerPhone': cp.managerPhone,
    });
  }

  // Add custom template fields
  if (activeTemplate) {
    activeTemplate.fields.forEach(field => {
      variables[field.id] = field.defaultValue;
    });
  }

  // Replace variables in HTML
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, value || '');
  });

  return html;
};
