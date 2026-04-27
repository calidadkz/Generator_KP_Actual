import { Template, Company } from "./types";

export const BRAND_NAME = 'CALIDAD';

export const DEFAULT_COMPANIES: Company[] = [
  {
    id: 'calidad-main',
    name: 'ТОО «CALIDAD»',
    bin: '230740022815',
    address: 'РК, г. Караганда, ул. Мельничная, д. 4/3, офис 015',
    email: 'toocalidad@yandex.ru',
    phone: '+7 707 920 28 20',
    director: 'Хурашвили Е. А.',
    basis: 'Устава',
    bank: 'АО «Kaspi Bank»',
    iik: 'KZ29722S000009295800',
    bik: 'CASPKZKA',
    signer: 'Хурашвили Е. А.',
    stampUrl: 'https://calidad.kz/wp-content/uploads/2022/09/c-logo-b.png'
  }
];

export const INITIAL_SUPPLIER = DEFAULT_COMPANIES[0];

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'equipment-selection-contract',
    name: 'Договор на подбор оборудования',
    type: 'Contract',
    content: `
      <div class="a4-page contract-content">
        <div class="text-center mb-10">
          <h1 class="text-xl font-bold uppercase underline">Договор</h1>
          <h2 class="text-lg font-bold uppercase">на оказание услуг по подбору оборудования</h2>
          <p class="mt-2 text-sm">г. Караганда &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; «{{contractDate}}»</p>
        </div>

        <div class="space-y-4 text-justify text-sm">
          <p>
            <strong>{{executorName}}</strong>, в лице директора {{executorDirector}}, действующего на основании {{executorBasis}}, именуемое в дальнейшем «Исполнитель» с одной стороны, и 
            <strong>{{clientName}}</strong>, в лице {{clientDirector}}, действующего на основании {{clientBasis}}, именуемый в дальнейшем «Заказчик, с другой стороны, при упоминании совместно именуемые «стороны», по раздельности – как указано выше, заключили настоящий договор о нижеследующем:
          </p>

          <section>
            <h3 class="font-bold uppercase">1. Предмет договора</h3>
            <p>1.1. По настоящему договору Исполнитель обязуется оказать Заказчику услуги, перечисленные в п. 1.2. настоящего Договора (далее – услуги), а Заказчик их оплатить, в порядке и на условиях, установленных настоящим договором.</p>
            <p>1.2. Виды оказываемых услуг:</p>
            <p>1.2.1. Составление технического задания (далее – ТЗ) для подбора оборудования;</p>
            <p>1.2.2. Подбор оборудования под условия ТЗ.</p>
          </section>

          <section>
            <h3 class="font-bold uppercase">2. Техническое задание</h3>
            <p>2.1. Исполнитель по полученным от Заказчика исходным данным составляет ТЗ, в котором описываются необходимые условия и требования к оборудованию и его производительности.</p>
          </section>

          <section>
            <h3 class="font-bold uppercase">3. Стоимость и порядок оплаты</h3>
            <p>3.1. Стоимость услуг по настоящему договору составляет {{totalAmount}} тенге.</p>
            <p>3.2. Заказчик оплачивает услуги на условиях 100% предоплаты в течение {{prepaymentDays}} банковских дней.</p>
          </section>
        </div>

        <div class="mt-20 grid grid-cols-2 gap-10 pt-10 border-t relative">
          <div class="relative">
            <h4 class="font-bold uppercase mb-4">Исполнитель</h4>
            <p>{{executorName}}</p>
            <p>БИН: {{executorBin}}</p>
            <p>Адрес: {{executorAddress}}</p>
            <div class="mt-10 border-t border-black pt-1 text-sm">Директор {{executorDirector}}</div>
            
            <!-- Stamp Overlay -->
            <div class="absolute -top-10 left-10 w-48 opacity-80 pointer-events-none">
              <img src="{{executorStampUrl}}" class="w-full h-auto" referrerPolicy="no-referrer" />
            </div>
          </div>
          <div>
            <h4 class="font-bold uppercase mb-4">Заказчик</h4>
            <p>{{clientName}}</p>
            <p>Адрес: {{clientAddress}}</p>
            <div class="mt-10 border-t border-black pt-1 text-sm">М.П.</div>
          </div>
        </div>
      </div>
    `,
    fields: [
      { id: 'contractDate', label: 'Дата договора', type: 'text', defaultValue: '25.03.2026', section: '1. РЕКВИЗИТЫ СТОРОН' },
      { id: 'clientName', label: 'Заказчик (Компания)', type: 'text', defaultValue: 'ТОО "Заказчик"', section: '1. РЕКВИЗИТЫ СТОРОН' },
      { id: 'clientDirector', label: 'ФИО Директора Заказчика', type: 'text', defaultValue: 'Иванов И. И.', section: '1. РЕКВИЗИТЫ СТОРОН' },
      { id: 'clientBasis', label: 'Действует на основании', type: 'text', defaultValue: 'Устава', section: '1. РЕКВИЗИТЫ СТОРОН' },
      { id: 'clientAddress', label: 'Адрес Заказчика', type: 'textarea', defaultValue: 'г. Алматы, ул. Абая 1', section: '1. РЕКВИЗИТЫ СТОРОН' },
      { id: 'totalAmount', label: 'Сумма договора (₸)', type: 'text', defaultValue: '1 000 000', section: '2. ФИНАНСОВЫЕ УСЛОВИЯ' },
      { id: 'prepaymentDays', label: 'Срок оплаты (дней)', type: 'number', defaultValue: '3', section: '2. ФИНАНСОВЫЕ УСЛОВИЯ' },
    ]
  }
];
