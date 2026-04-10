import React from 'react';
import { ContractState, CompanyDetails, Specification, StampPosition } from '../../types';
import { formatCurrency, formatDate } from '../../utils';
import { Stamp } from '../UI/Stamp';

const LOGO_URL = 'https://calidad.kz/wp-content/uploads/2022/09/c-logo-b.png';

interface ContractPreviewProps {
  contract: ContractState;
  supplier: CompanyDetails;
  totalAmount: number;
  totalAmountWords: string;
  showStamp: boolean;
  stampPositions: Record<string, StampPosition>;
  updateStampPosition: (pageId: string, x: number, y: number) => void;
  updateStampScale: (pageId: string, scale: number) => void;
}

export const ContractPreview: React.FC<ContractPreviewProps> = ({
  contract,
  supplier,
  totalAmount,
  totalAmountWords,
  showStamp,
  stampPositions,
  updateStampPosition,
  updateStampScale
}) => {
  return (
    <div id="contract-preview" className="flex flex-col items-center gap-10 print:block print:gap-0">
      {/* Page 1: Main Text */}
      <div className="a4-page relative">
        <div className="flex justify-between items-start mb-12">
          <img src={LOGO_URL} alt="Calidad" className="h-12 object-contain" referrerPolicy="no-referrer" />
          <div className="text-right">
            <h1 className="text-xl mb-1">ДОГОВОР ПОСТАВКИ № {contract.number}</h1>
            <p className="text-sm text-gray-500">г. Караганда, {formatDate(contract.date)}</p>
          </div>
        </div>
        
        <p className="mb-6">
          <strong>{supplier.name}</strong>, в лице директора {supplier.director}, действующего на основании {supplier.basis}, именуемое в дальнейшем «Поставщик», с одной стороны, и 
          <strong> {contract.buyer.name}</strong>, в лице {contract.buyer.signer}, действующего на основании {contract.buyer.basis}, именуемое в дальнейшем «Покупатель», с другой стороны, заключили настоящий Договор о нижеследующем:
        </p>

        <h3 className="font-bold mb-2">1. ПРЕДМЕТ ДОГОВОРА</h3>
        <p className="mb-4">1.1. Поставщик обязуется поставить, а Покупатель обязуется принять и оплатить Товар, наименование, количество и цена которого указаны в Спецификации (Приложение №1), являющейся неотъемлемой частью настоящего Договора.</p>
        
        <h3 className="font-bold mb-2">2. СТОИМОСТЬ И ПОРЯДОК РАСЧЕТОВ</h3>
        <p className="mb-2">2.1. Общая стоимость Товара по настоящему Договору составляет <strong>{formatCurrency(totalAmount)} ({totalAmountWords}) тенге</strong>, без НДС.</p>
        <p className="mb-4">2.2. Оплата производится путем перечисления денежных средств на расчетный счет Поставщика в течение 3-х банковских дней с момента подписания Договора.</p>

        <h3 className="font-bold mb-2">3. СРОКИ И ПОРЯДОК ПОСТАВКИ</h3>
        <p className="mb-4">3.1. Поставка Товара осуществляется в течение {contract.deliveryDays} рабочих дней с момента поступления предоплаты на счет Поставщика.</p>
        
        <Stamp 
          pageId="contract-p1" 
          stampUrl={supplier.stampUrl} 
          showStamp={showStamp} 
          position={stampPositions['contract-p1'] || { x: 400, y: 700, scale: 1 }}
          onUpdatePosition={updateStampPosition}
          onUpdateScale={updateStampScale}
        />
      </div>

      {/* Page 2: Terms */}
      <div className="a4-page relative">
        <h3 className="font-bold mb-2">4. ОБЯЗАННОСТИ СТОРОН</h3>
        <p className="mb-2">4.1. Поставщик обязан поставить Товар надлежащего качества и в оговоренные сроки.</p>
        <p className="mb-4">4.2. Покупатель обязан обеспечить своевременную приемку и оплату Товара.</p>

        <h3 className="font-bold mb-2">5. ОТВЕТСТВЕННОСТЬ СТОРОН</h3>
        <p className="mb-4">5.1. За неисполнение или ненадлежащее исполнение обязательств по настоящему Договору Стороны несут ответственность в соответствии с действующим законодательством Республики Казахстан.</p>

        <h3 className="font-bold mb-2">6. ФОРС-МАЖОР</h3>
        <p className="mb-4">6.1. Стороны освобождаются от ответственности за частичное или полное неисполнение обязательств по настоящему Договору, если это неисполнение явилось следствием обстоятельств непреодолимой силы.</p>

        <h3 className="font-bold mb-2">7. ПРОЧИЕ УСЛОВИЯ</h3>
        <p className="mb-2">7.1. Настоящий Договор вступает в силу с момента его подписания и действует до полного исполнения Сторонами своих обязательств.</p>
        <p className="mb-4">7.2. Все споры и разногласия решаются путем переговоров.</p>
        
        <Stamp 
          pageId="contract-p2" 
          stampUrl={supplier.stampUrl} 
          showStamp={showStamp} 
          position={stampPositions['contract-p2'] || { x: 400, y: 700, scale: 1 }}
          onUpdatePosition={updateStampPosition}
          onUpdateScale={updateStampScale}
        />
      </div>

      {/* Page 3: Requisites */}
      <div className="a4-page relative">
        <h2 className="text-lg font-bold mb-10 text-center uppercase">8. ЮРИДИЧЕСКИЕ АДРЕСА И РЕКВИЗИТЫ СТОРОН</h2>
        
        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-2 text-[11px]">
            <p className="font-bold border-b border-black pb-1 uppercase">ПОСТАВЩИК</p>
            <p><strong>{supplier.name}</strong></p>
            <p>Адрес: {supplier.address}</p>
            <p>БИН: {supplier.bin}</p>
            <p>ИИК: {supplier.iik}</p>
            <p>Банк: {supplier.bank}</p>
            <p>БИК: {supplier.bik}</p>
            <p>Тел: {supplier.phone}</p>
            <div className="pt-10">
              <p>________________ / {supplier.signer}</p>
              <p className="text-[8px] text-gray-400 italic mt-1">М.П.</p>
            </div>
          </div>

          <div className="space-y-2 text-[11px]">
            <p className="font-bold border-b border-black pb-1 uppercase">ПОКУПАТЕЛЬ</p>
            <p><strong>{contract.buyer.name}</strong></p>
            <p>Адрес: {contract.buyer.address}</p>
            <p>БИН: {contract.buyer.bin}</p>
            <p>ИИК: {contract.buyer.iik}</p>
            <p>Банк: {contract.buyer.bank}</p>
            <p>БИК: {contract.buyer.bik}</p>
            <p>Тел: {contract.buyer.phone}</p>
            <div className="pt-10">
              <p>________________ / {contract.buyer.signer}</p>
              <p className="text-[8px] text-gray-400 italic mt-1">М.П.</p>
            </div>
          </div>
        </div>
        
        <Stamp 
          pageId="contract-p3" 
          stampUrl={supplier.stampUrl} 
          showStamp={showStamp} 
          position={stampPositions['contract-p3'] || { x: 100, y: 650, scale: 1 }}
          onUpdatePosition={updateStampPosition}
          onUpdateScale={updateStampScale}
        />
      </div>

      {/* Page 4: Specification */}
      <div className="a4-page relative">
        <div className="text-right mb-10 text-xs">
          <p className="font-bold">Приложение №1</p>
          <p>к Договору поставки № {contract.number}</p>
          <p>от {formatDate(contract.date)}</p>
        </div>

        <h2 className="text-lg font-bold mb-6 text-center uppercase">СПЕЦИФИКАЦИЯ ПОСТАВЛЯЕМОГО ТОВАРА</h2>

        <table className="w-full border-collapse border border-black text-[11px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 w-10">№</th>
              <th className="border border-black p-2">Наименование товара</th>
              <th className="border border-black p-2 w-16">Кол-во</th>
              <th className="border border-black p-2 w-24">Цена, ₸</th>
              <th className="border border-black p-2 w-24">Сумма, ₸</th>
            </tr>
          </thead>
          <tbody>
            {[...contract.spec.main, ...contract.spec.components, ...contract.spec.consumables].map((item, idx) => (
              <tr key={item.id}>
                <td className="border border-black p-2 text-center">{idx + 1}</td>
                <td className="border border-black p-2">{item.name}</td>
                <td className="border border-black p-2 text-center">{item.qty}</td>
                <td className="border border-black p-2 text-right">{formatCurrency(item.price)}</td>
                <td className="border border-black p-2 text-right">{formatCurrency(item.qty * item.price)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td colSpan={4} className="border border-black p-2 text-right uppercase">ИТОГО К ОПЛАТЕ:</td>
              <td className="border border-black p-2 text-right">{formatCurrency(totalAmount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-10 grid grid-cols-2 gap-10">
          <div className="text-[11px]">
            <p className="font-bold uppercase mb-4">ПОСТАВЩИК</p>
            <p>________________ / {supplier.signer}</p>
          </div>
          <div className="text-[11px]">
            <p className="font-bold uppercase mb-4">ПОКУПАТЕЛЬ</p>
            <p>________________ / {contract.buyer.signer}</p>
          </div>
        </div>
        
        <Stamp 
          pageId="contract-p4" 
          stampUrl={supplier.stampUrl} 
          showStamp={showStamp} 
          position={stampPositions['contract-p4'] || { x: 450, y: 750, scale: 1 }}
          onUpdatePosition={updateStampPosition}
          onUpdateScale={updateStampScale}
        />
      </div>
    </div>
  );
};
