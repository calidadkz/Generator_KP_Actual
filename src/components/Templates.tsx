import React from 'react';
import { Template } from '../types';

interface CPPreviewProps {
  data: Record<string, string>;
}

export const LaserMarkingTKP: React.FC<CPPreviewProps> = ({ data }) => {
  return (
    <div className="a4-page">
      
      {/* Header */}
      <header className="flex justify-between items-center border-b-[3px] border-[#0f3c7a] pb-5 mb-6">
        <div className="w-48">
          <img src="https://calidad.kz/wp-content/uploads/2022/09/c-logo-b.png" alt="CALIDAD Logo" className="w-full h-auto object-contain" referrerPolicy="no-referrer" />
        </div>
        <div className="text-right text-[11px] text-gray-600 space-y-1">
          <p><strong className="text-gray-800">ТОО «CALIDAD»</strong></p>
          <p>БИН: 230740022815</p>
          <p>РК, г. Караганда, ул. Мельничная, д. 4/3, офис 015</p>
          <p>Сайт: <span className="text-[#0f3c7a]">www.calidad.kz</span> | E-mail: toocalidad@yandex.ru</p>
          <p>Тел: <strong className="text-gray-800">+7 707 920 28 20</strong></p>
        </div>
      </header>

      {/* Recipient */}
      <div className="mb-6">
        <p className="mb-2 text-sm"><strong>Кому:</strong> <span className="border-b border-gray-400 pb-1 px-2 inline-block min-w-[200px] text-gray-900 font-semibold tracking-wide">{data.companyName || '[Укажите компанию]'}</span></p>
      </div>
      
      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="text-lg font-bold text-[#0f3c7a] uppercase tracking-wide font-header">Технико-коммерческое предложение</h1>
        <h2 className="text-sm font-semibold text-gray-700 mt-1 font-header">на интеграцию комплекса лазерной маркировки</h2>
      </div>

      <p className="mb-5 text-justify">
        В ответ на Ваш запрос о предоставлении технического решения по автоматизации процесса нанесения обязательной маркировки (Data Matrix) на производственной линии, ТОО «CALIDAD» сообщает следующее. Исходя из предоставленных Вами данных, мы предлагаем интеграцию аппаратно-программного комплекса конвейерного типа, адаптированного под Ваши задачи.
      </p>

      {/* 1. Data */}
      <section className="mb-6">
        <h3 className="font-bold text-[#0f3c7a] text-sm mb-2 border-b border-gray-200 pb-1 font-header">1. Исходные данные производственной линии</h3>
        <p className="mb-2">Комплектация оборудования подбирается с учетом следующих фактических параметров:</p>
        <ul className="list-none space-y-1 ml-2">
          <li><span className="text-[#d9232a] font-bold mr-2">•</span><strong>Тип тары:</strong> {data.taraType}</li>
          <li><span className="text-[#d9232a] font-bold mr-2">•</span><strong>Материал и цвет:</strong> {data.materialColor}</li>
          <li><span className="text-[#d9232a] font-bold mr-2">•</span><strong>Высота линии от пола:</strong> {data.heightFromFloor}</li>
          <li><span className="text-[#d9232a] font-bold mr-2">•</span><strong>Скорость конвейера:</strong> {data.conveyorSpeed}</li>
          <li><span className="text-[#d9232a] font-bold mr-2">•</span><strong>Формат кода:</strong> {data.codeFormat}</li>
        </ul>
      </section>

      {/* 2. Architecture */}
      <section className="mb-6">
        <h3 className="font-bold text-[#0f3c7a] text-sm mb-2 border-b border-gray-200 pb-1 font-header">2. Порядок работы и архитектура комплекса</h3>
        <p className="mb-3 text-justify">Внедрение лазерного узла <strong className="text-[#d9232a]">исключает использование расходных материалов</strong> (чернил, термолент) и осуществляется путем термического изменения структуры поверхности пластика.</p>
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-md">
          <p className="font-semibold mb-2">Алгоритм работы:</p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Оператор загружает исходный файл в формате <strong>.csv</strong> с кодами маркировки во встроенный промышленный компьютер комплекса.</li>
            <li>Оптический датчик осуществляет фиксацию тары в зоне маркировки.</li>
            <li>Промышленный <strong>энкодер</strong> считывает фактическую скорость движения конвейерной ленты для синхронизации с контроллером.</li>
            <li>Лазерный излучатель осуществляет поочередное нанесение кодов из загруженного файла в динамике. <em>Синхронизация через энкодер предотвращает геометрические искажения кода при нестабильности скорости конвейера.</em></li>
          </ol>
        </div>
      </section>

      {/* 3 & 4. Specs */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <section>
          <h3 className="font-bold text-[#0f3c7a] text-sm mb-2 border-b border-gray-200 pb-1 font-header">3. Базовая спецификация</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Излучатель лазерный промышленный*</li>
            <li>Сканатор (гальванометр)</li>
            <li>Оптическая система (линза)</li>
            <li>Промышленный ПК с ПО</li>
            <li>Датчик наличия детали</li>
            <li>Энкодер скорости</li>
            <li>Стойка-штатив (регулируемая)</li>
          </ul>
          <p className="text-[10px] text-gray-500 mt-2">* Тип источника и мощность утверждаются после тестов.</p>
        </section>
        <section>
          <h3 className="font-bold text-[#0f3c7a] text-sm mb-2 border-b border-gray-200 pb-1 font-header">4. Результаты стендовых испытаний</h3>
          <p className="text-justify text-gray-700">
            По результатам предварительных тестов нами был протестирован процесс генерации Data Matrix из файла .csv. Тестовые коды <strong className="text-green-700">успешно распознаются</strong> мобильным приложением «Нақты өнім» (Naqty Onym).
          </p>
        </section>
      </div>

      {/* 5. Price */}
      <section className="mb-6">
        <h3 className="font-bold text-[#0f3c7a] text-sm mb-3 border-b border-gray-200 pb-1 font-header">5. Стоимость и порядок реализации проекта</h3>
        
        <div className="bg-[#0f3c7a] text-white p-4 rounded-md mb-4 flex justify-between items-center shadow-md">
          <div>
            <p className="font-bold text-sm uppercase font-header">Аппаратно-программный комплекс</p>
            <p className="text-[11px] text-blue-200 mt-1">Оборудование + ПНР, монтаж и первичное обучение</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-blue-200 uppercase">Ориентировочная стоимость</p>
            <p className="font-bold text-xl font-header">{data.mainPrice} ₸ <span className="text-[10px] font-normal tracking-wide">без НДС</span></p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border-l-2 border-[#0f3c7a] pl-4">
            <h4 className="font-bold text-gray-800">5.1. Услуга по созданию образцов и подбору конфигурации</h4>
            <p className="mt-1 text-gray-600"><strong>Стоимость услуги: <span className="text-[#0f3c7a] font-bold">{data.testPrice} ₸</span>.</strong> <em>При заключении договора поставки данная сумма вычитается из итоговой стоимости оборудования.</em></p>
          </div>

          <div className="border-l-2 border-[#d9232a] pl-4 bg-red-50 p-2 rounded-r-md">
            <h4 className="font-bold text-[#d9232a]">5.2. Право на отказ</h4>
            <p className="mt-1 text-gray-700">В случае если в ходе тестирования выявится необходимость изменения комплектации, что повлечет удорожание комплекса (свыше 20% от суммы {data.mainPrice} ₸), <strong>Заказчик имеет право отказаться от заключения договора поставки.</strong> При этом стоимость услуги по тестам ({data.testPrice} ₸) не возвращается.</p>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <div className="mt-auto bg-gray-100 p-5 rounded-lg text-center text-gray-800 text-[13px] font-semibold border-2 border-dashed border-gray-300">
        Для перехода к этапу тестирования просим предоставить образцы крышек и полные реквизиты компании для выставления счета на оплату услуг по созданию образцов.
      </div>

      {/* Footer */}
      <footer className="flex justify-between items-end mt-8 relative">
        <div className="relative">
          <p className="font-bold text-gray-800 mb-6">Директор ТОО «CALIDAD»</p>
          <p className="text-gray-800">________________ / {data.directorName}</p>
          
          {/* Stamp Overlay */}
          {data.executorStampUrl && (
            <div className="absolute -top-12 left-10 w-40 opacity-80 pointer-events-none">
              <img src={data.executorStampUrl} className="w-full h-auto" referrerPolicy="no-referrer" />
            </div>
          )}
        </div>
        <div className="text-gray-600 text-right">
          <p className="font-bold text-gray-800">{data.kpDate}</p>
          <p className="text-[10px] uppercase tracking-widest mt-1">г. Караганда</p>
        </div>
      </footer>
    </div>
  );
};
