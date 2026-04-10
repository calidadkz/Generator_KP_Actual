import { CPBlock } from "../types";

export const CP_BLOCKS: CPBlock[] = [
  {
    id: 'cover',
    name: 'Обложка',
    description: 'Первая страница КП с логотипом и данными клиента',
    content: `
      <div class="a4-page bg-[#0f3c7a] text-white flex flex-col justify-between p-16 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-full bg-[#d9232a] -skew-x-12 translate-x-32 opacity-20"></div>
        <div class="flex justify-between items-start relative z-10">
          <img src="{{logoUrl}}" alt="Logo" class="w-48 brightness-0 invert">
          <div class="text-right">
            <p class="text-sm opacity-80 uppercase tracking-widest">Коммерческое предложение</p>
            <p class="text-xl font-bold">{{date}}</p>
          </div>
        </div>
        <div class="relative z-10">
          <h1 class="text-5xl font-black mb-4 uppercase tracking-tighter leading-none">{{title}}</h1>
          <p class="text-2xl font-bold opacity-90 text-blue-200 uppercase tracking-widest">{{subtitle}}</p>
        </div>
        <div class="border-t border-white/20 pt-8 relative z-10">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Подготовлено для:</p>
          <p class="text-3xl font-black uppercase">{{clientName}}</p>
        </div>
      </div>
    `,
    fields: [
      { id: 'logoUrl', label: 'URL Логотипа', type: 'image', defaultValue: 'https://calidad.kz/wp-content/uploads/2022/09/c-logo-b.png' },
      { id: 'title', label: 'Заголовок', type: 'text', defaultValue: 'Станок лазерной резки' },
      { id: 'subtitle', label: 'Подзаголовок', type: 'text', defaultValue: 'Industrial Solutions' },
      { id: 'clientName', label: 'Имя клиента', type: 'text', defaultValue: 'Уважаемый партнер' },
      { id: 'date', label: 'Дата', type: 'text', defaultValue: '25.03.2026' }
    ]
  },
  {
    id: 'intro',
    name: 'Вступление',
    description: 'Приветственное слово и регалии компании',
    content: `
      <div class="a4-page p-12">
        <div class="flex items-center gap-4 mb-12">
          <div class="w-2 h-12 bg-[#d9232a]"></div>
          <h2 class="text-3xl font-black text-[#0f3c7a] uppercase tracking-tight">{{heading}}</h2>
        </div>
        <div class="prose max-w-none text-gray-700 leading-relaxed text-lg mb-16">
          {{text}}
        </div>
        <div class="grid grid-cols-3 gap-8">
          {{achievements}}
        </div>
      </div>
    `,
    fields: [
      { id: 'heading', label: 'Заголовок', type: 'text', defaultValue: 'О компании CALIDAD' },
      { id: 'text', label: 'Текст вступления', type: 'textarea', defaultValue: 'Компания CALIDAD является ведущим поставщиком лазерного оборудования на рынке Казахстана. Мы предлагаем только проверенные решения, которые помогут вашему бизнесу выйти на новый уровень производительности.' },
      { id: 'achievements', label: 'Достижения (HTML)', type: 'richText', defaultValue: `
        <div class="text-center p-8 bg-gray-50 rounded-3xl border border-gray-100">
          <p class="text-4xl font-black text-[#d9232a] mb-2">500+</p>
          <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Инсталляций</p>
        </div>
        <div class="text-center p-8 bg-gray-50 rounded-3xl border border-gray-100">
          <p class="text-4xl font-black text-[#d9232a] mb-2">24/7</p>
          <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Поддержка</p>
        </div>
        <div class="text-center p-8 bg-gray-50 rounded-3xl border border-gray-100">
          <p class="text-4xl font-black text-[#d9232a] mb-2">2 года</p>
          <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Гарантии</p>
        </div>
      ` }
    ]
  },
  {
    id: 'specs',
    name: 'Технические характеристики',
    description: 'Сетка характеристик оборудования',
    content: `
      <div class="a4-page p-12">
        <h2 class="text-2xl font-black text-[#0f3c7a] mb-8 uppercase tracking-tight border-b-4 border-[#d9232a] pb-4 inline-block">{{model}}</h2>
        <div class="grid grid-cols-2 gap-12 mb-12">
          <div class="relative group">
            <div class="absolute inset-0 bg-[#0f3c7a] rounded-3xl rotate-3 group-hover:rotate-0 transition-transform duration-500 opacity-5"></div>
            <img src="{{imageUrl}}" alt="Machine" class="relative z-10 w-full h-auto rounded-3xl shadow-2xl border-8 border-white">
          </div>
          <div class="space-y-4">
            {{specsList}}
          </div>
        </div>
        <div class="bg-[#0f3c7a] text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <h3 class="text-xl font-black mb-6 uppercase tracking-widest text-blue-200">Преимущества модели:</h3>
          <ul class="grid grid-cols-2 gap-6">
            <li class="flex items-center gap-3 font-bold text-sm">
              <span class="w-6 h-6 bg-[#d9232a] rounded-full flex items-center justify-center text-[10px]">✓</span> Высокая скорость резки
            </li>
            <li class="flex items-center gap-3 font-bold text-sm">
              <span class="w-6 h-6 bg-[#d9232a] rounded-full flex items-center justify-center text-[10px]">✓</span> Точность 0.01мм
            </li>
            <li class="flex items-center gap-3 font-bold text-sm">
              <span class="w-6 h-6 bg-[#d9232a] rounded-full flex items-center justify-center text-[10px]">✓</span> Надежные комплектующие
            </li>
            <li class="flex items-center gap-3 font-bold text-sm">
              <span class="w-6 h-6 bg-[#d9232a] rounded-full flex items-center justify-center text-[10px]">✓</span> Простое ПО (RU)
            </li>
          </ul>
        </div>
      </div>
    `,
    fields: [
      { id: 'model', label: 'Модель станка', type: 'text', defaultValue: 'CLD 1060 PRO' },
      { id: 'imageUrl', label: 'Фото станка', type: 'image', defaultValue: 'https://calidad.kz/wp-content/uploads/2022/09/cld-1060-pro.png' },
      { id: 'specsList', label: 'Список характеристик (HTML)', type: 'richText', defaultValue: `
        <div class="p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Рабочее поле</p>
          <p class="text-lg font-black text-[#0f3c7a]">1000 x 600 мм</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Мощность лазера</p>
          <p class="text-lg font-black text-[#0f3c7a]">90-100 Вт</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Тип охлаждения</p>
          <p class="text-lg font-black text-[#0f3c7a]">Чиллер CW-3000/5000</p>
        </div>
      ` }
    ]
  },
  {
    id: 'pricing',
    name: 'Стоимость и комплектация',
    description: 'Таблица с ценами и условиями',
    content: `
      <div class="a4-page p-12">
        <div class="flex items-center justify-between mb-12">
          <h2 class="text-3xl font-black text-[#0f3c7a] uppercase tracking-tight">Стоимость решения</h2>
          <div class="h-1 w-32 bg-[#d9232a]"></div>
        </div>
        <div class="overflow-hidden rounded-[32px] border-2 border-gray-100 shadow-xl mb-12">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-[#0f3c7a] text-white">
                <th class="p-6 text-left text-xs font-black uppercase tracking-widest">Наименование</th>
                <th class="p-6 text-right text-xs font-black uppercase tracking-widest">Цена (KZT)</th>
              </tr>
            </thead>
            <tbody class="text-gray-700">
              {{priceRows}}
              <tr class="bg-gray-50">
                <td class="p-6 font-black text-xl text-[#0f3c7a] uppercase tracking-tight">Итого к оплате:</td>
                <td class="p-6 text-right font-black text-3xl text-[#d9232a]">{{totalPrice}}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="grid grid-cols-2 gap-8">
          <div class="p-8 bg-gray-50 rounded-[32px] border border-gray-100">
            <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Срок поставки</h4>
            <p class="font-bold text-[#0f3c7a]">{{deliveryTime}}</p>
          </div>
          <div class="p-8 bg-gray-50 rounded-[32px] border border-gray-100">
            <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Условия оплаты</h4>
            <p class="font-bold text-[#0f3c7a]">{{paymentTerms}}</p>
          </div>
        </div>
      </div>
    `,
    fields: [
      { id: 'priceRows', label: 'Строки цен (HTML)', type: 'richText', defaultValue: `
        <tr class="border-b border-gray-100">
          <td class="p-6 font-bold">Базовая комплектация станка</td>
          <td class="p-6 text-right font-black text-xl">1 084 000 ₸</td>
        </tr>
        <tr class="border-b border-gray-100">
          <td class="p-6 font-bold">Система управления Ruida</td>
          <td class="p-6 text-right font-black text-xl">214 000 ₸</td>
        </tr>
      ` },
      { id: 'totalPrice', label: 'Итоговая цена', type: 'text', defaultValue: '1 298 000 ₸' },
      { id: 'deliveryTime', label: 'Срок поставки', type: 'text', defaultValue: 'В наличии на складе' },
      { id: 'paymentTerms', label: 'Условия оплаты', type: 'text', defaultValue: '70% предоплата, 30% перед отгрузкой' }
    ]
  },
  {
    id: 'media',
    name: 'Видеоматериалы',
    description: 'Ссылки на YouTube обзоры',
    content: `
      <div class="a4-page p-12">
        <h2 class="text-3xl font-black text-[#0f3c7a] mb-12 uppercase tracking-tight">Видеообзоры оборудования</h2>
        <div class="grid grid-cols-1 gap-6">
          {{videoItems}}
        </div>
        <div class="mt-12 p-8 bg-red-50 rounded-[32px] flex items-center gap-6 border-2 border-red-100">
          <div class="w-16 h-16 bg-[#d9232a] rounded-full flex items-center justify-center text-white shadow-lg">
            <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.015 3.015 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
          </div>
          <div>
            <p class="text-lg font-black text-[#0f3c7a] uppercase tracking-tight">Наш YouTube канал</p>
            <p class="text-sm text-gray-500 font-bold">Подписывайтесь, чтобы видеть станки в работе</p>
          </div>
        </div>
      </div>
    `,
    fields: [
      { id: 'videoItems', label: 'Видео (HTML)', type: 'richText', defaultValue: `
        <a href="#" class="flex items-center p-6 bg-gray-50 rounded-[32px] border border-gray-100 hover:bg-white transition-all duration-300 group">
          <div class="w-20 h-20 bg-gray-200 rounded-2xl overflow-hidden mr-6 flex-shrink-0 relative">
            <div class="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div class="w-8 h-8 bg-[#d9232a] rounded-full flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-transform">▶</div>
            </div>
          </div>
          <div class="flex-grow">
            <p class="text-lg font-black text-[#0f3c7a] uppercase tracking-tight mb-1">Полный обзор CLD 1060</p>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Смотреть на YouTube</p>
          </div>
          <div class="text-[#d9232a] font-black">→</div>
        </a>
      ` }
    ]
  },
  {
    id: 'info',
    name: 'Материалы и FAQ',
    description: 'Информационный блок и ответы на вопросы',
    content: `
      <div class="a4-page p-12">
        <h2 class="text-2xl font-black text-[#0f3c7a] mb-8 uppercase tracking-tight">Применение и FAQ</h2>
        <div class="grid grid-cols-3 gap-4 mb-12">
          {{materialItems}}
        </div>
        <div class="space-y-6">
          <h3 class="text-xl font-black text-[#0f3c7a] uppercase tracking-widest border-l-4 border-[#d9232a] pl-4">Часто задаваемые вопросы:</h3>
          <div class="space-y-4">
            {{faqItems}}
          </div>
        </div>
      </div>
    `,
    fields: [
      { id: 'materialItems', label: 'Материалы (HTML)', type: 'richText', defaultValue: `
        <div class="p-4 bg-gray-50 rounded-2xl text-center font-bold text-[10px] text-[#0f3c7a] uppercase tracking-widest border border-gray-100">Фанера / Дерево</div>
        <div class="p-4 bg-gray-50 rounded-2xl text-center font-bold text-[10px] text-[#0f3c7a] uppercase tracking-widest border border-gray-100">Акрил / Пластик</div>
        <div class="p-4 bg-gray-50 rounded-2xl text-center font-bold text-[10px] text-[#0f3c7a] uppercase tracking-widest border border-gray-100">Кожа / Ткань</div>
      ` },
      { id: 'faqItems', label: 'FAQ (HTML)', type: 'richText', defaultValue: `
        <div class="p-6 bg-gray-50 rounded-[32px] border border-gray-100">
          <p class="font-black text-[#d9232a] uppercase text-xs mb-2">От какого напряжения работает?</p>
          <p class="text-sm text-gray-600 font-medium">Оборудование работает от стандартной сети 220V. Среднее потребление — 1.5 кВт/ч.</p>
        </div>
        <div class="p-6 bg-gray-50 rounded-[32px] border border-gray-100">
          <p class="font-black text-[#d9232a] uppercase text-xs mb-2">Какая гарантия?</p>
          <p class="text-sm text-gray-600 font-medium">Мы предоставляем полную гарантию 12 месяцев на все узлы станка.</p>
        </div>
      ` }
    ]
  },
  {
    id: 'cta',
    name: 'Призыв к действию',
    description: 'Контакты и завершение',
    content: `
      <div class="a4-page p-12 flex flex-col justify-between">
        <div>
          <h2 class="text-4xl font-black text-[#0f3c7a] mb-6 uppercase tracking-tighter leading-none">Готовы начать?</h2>
          <p class="text-xl text-gray-500 font-bold mb-12">Свяжитесь со мной любым удобным способом для обсуждения деталей.</p>
          <div class="flex items-center gap-8 p-10 bg-[#0f3c7a] rounded-[48px] text-white shadow-2xl relative overflow-hidden">
            <div class="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 translate-x-24"></div>
            <div class="w-32 h-32 bg-white/10 rounded-[40px] flex items-center justify-center text-4xl font-black border border-white/20">
              {{managerInitial}}
            </div>
            <div>
              <p class="text-3xl font-black uppercase tracking-tight mb-1">{{managerName}}</p>
              <p class="text-blue-200 font-bold uppercase tracking-widest text-xs mb-4">Ваш персональный менеджер</p>
              <p class="text-2xl font-black text-[#d9232a] bg-white px-4 py-2 rounded-xl inline-block">{{managerPhone}}</p>
            </div>
          </div>
        </div>
        <div class="flex justify-between items-end border-t border-gray-100 pt-12">
          <div class="space-y-2">
            <p class="text-lg font-black text-[#0f3c7a] uppercase tracking-tight">{{supplierName}}</p>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">{{supplierAddress}}</p>
            <p class="text-xs font-bold text-[#d9232a] uppercase tracking-widest">{{supplierEmail}}</p>
          </div>
          <img src="{{stampUrl}}" alt="Stamp" class="w-40 opacity-80 grayscale brightness-50">
        </div>
      </div>
    `,
    fields: [
      { id: 'managerName', label: 'Имя менеджера', type: 'text', defaultValue: 'Евгений Хурашвили' },
      { id: 'managerInitial', label: 'Инициал', type: 'text', defaultValue: 'Е' },
      { id: 'managerPhone', label: 'Телефон', type: 'text', defaultValue: '+7 778 200 00 38' },
      { id: 'supplierName', label: 'Компания', type: 'text', defaultValue: 'ТОО «CALIDAD»' },
      { id: 'supplierAddress', label: 'Адрес', type: 'text', defaultValue: 'г. Караганда, ул. Мельничная 4/3' },
      { id: 'supplierEmail', label: 'Email', type: 'text', defaultValue: 'toocalidad@yandex.ru' },
      { id: 'stampUrl', label: 'Печать', type: 'image', defaultValue: 'https://calidad.kz/wp-content/uploads/2022/09/c-logo-b.png' }
    ]
  }
];
