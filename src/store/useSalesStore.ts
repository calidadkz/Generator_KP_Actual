import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  BatchInsights,
  MachineType,
  MicroPresentation,
  ScriptNode,
  DialogueRecord,
} from '../types';
import { deleteDialogueTexts, saveDialogueTexts } from '../lib/dialogueStorage';

const defaultMachineTypes: MachineType[] = [
  { id: 'mt-01', name: 'Лазерный резчик CO2', description: 'Резка и гравировка неметаллов, акрил, дерево, ткань', qualifiers: ['Какой материал резать?', 'Нужна ли гравировка?'] },
  { id: 'mt-02', name: 'Волоконный лазер', description: 'Резка металла: сталь, нержавейка, алюминий', qualifiers: ['Какой металл?', 'Толщина материала?'] },
  { id: 'mt-03', name: 'ЧПУ фрезер по дереву', description: 'Фрезеровка, резьба, мебельное производство', qualifiers: ['Какой материал?', 'Размер рабочего поля?'] },
  { id: 'mt-04', name: 'ЧПУ фрезер по металлу', description: 'Механообработка металлических деталей', qualifiers: ['Материал заготовки?', 'Точность обработки?'] },
  { id: 'mt-05', name: 'Плазменный резчик', description: 'Резка металла большой толщины', qualifiers: ['Толщина металла?', 'Скорость резки важна?'] },
  { id: 'mt-06', name: 'Лазерный гравер', description: 'Гравировка на сувенирах, металле, коже', qualifiers: ['Что гравировать?', 'Нужна цветная гравировка?'] },
  { id: 'mt-07', name: 'Токарный станок ЧПУ', description: 'Обработка тел вращения', qualifiers: ['Диаметр деталей?', 'Материал?'] },
  { id: 'mt-08', name: 'Листогиб ЧПУ', description: 'Гибка листового металла', qualifiers: ['Толщина листа?', 'Длина гибки?'] },
  { id: 'mt-09', name: 'Пробивной станок ЧПУ', description: 'Пробивка отверстий в листовом металле', qualifiers: ['Толщина листа?', 'Серийность производства?'] },
  { id: 'mt-10', name: 'Лазерный маркировщик', description: 'Маркировка деталей, QR-коды, серийные номера', qualifiers: ['Материал маркировки?', 'Скорость маркировки?'] },
  { id: 'mt-11', name: 'Промышленный лазер', description: 'Сварка и резка в тяжёлой промышленности', qualifiers: ['Производственный объём?', 'Автоматизация нужна?'] },
  { id: 'mt-12', name: 'Сварочный робот ЧПУ', description: 'Автоматизированная сварка деталей', qualifiers: ['Серийность производства?', 'Размер свариваемых деталей?'] },
];

const defaultScriptNodes: ScriptNode[] = [
  {
    id: 'step-01',
    order: 1,
    category: 'Открытие',
    title: 'Открытие разговора',
    content: 'Добрый день! Меня зовут [Имя], компания CALIDAD. Вы оставляли заявку на [тему]. Вам удобно сейчас поговорить пару минут?',
    tips: [
      'Говорить уверенно, не торопясь',
      'Назвать компанию и своё имя',
      'Получить разрешение на разговор',
      'Если не вовремя — договориться о созвоне',
    ],
  },
  {
    id: 'step-02',
    order: 2,
    category: 'Открытие',
    title: 'Выявление потребности',
    content: 'Расскажите, пожалуйста, какие задачи вы планируете решить? Что сейчас делаете вручную или хотите автоматизировать?',
    tips: [
      'Задавать открытые вопросы',
      'Слушать активно — не перебивать',
      'Уточнять детали: объём, материал, частота',
      'Понять боль и текущий способ работы',
    ],
  },
  {
    id: 'step-03',
    order: 3,
    category: 'Квалификация',
    title: 'Квалификация — Тип станка',
    content: 'Исходя из ваших задач, вам подойдёт [тип станка]. Скажите, с какими материалами планируете работать и какие размеры деталей?',
    tips: [
      'Уточнить материал (металл / дерево / акрил / и т.д.)',
      'Уточнить рабочую зону',
      'Уточнить толщину / размер заготовок',
      'Записать ключевые параметры',
    ],
  },
  {
    id: 'step-04',
    order: 4,
    category: 'Квалификация',
    title: 'Квалификация — Бюджет',
    content: 'Чтобы подобрать оптимальный вариант — есть ли понимание по бюджету? Ориентируетесь на какую-то сумму?',
    tips: [
      'Задавать вопрос о бюджете после выявления потребности, не в начале',
      'Не давить — предложить диапазон для ориентира',
      'Если отказывается называть — уточнить: "выше / ниже 3 млн?"',
      'Зафиксировать бюджет и ЛПР (лицо принимающее решение)',
    ],
  },
  {
    id: 'step-05',
    order: 5,
    category: 'Квалификация',
    title: 'Мини-презентация',
    content: 'Для ваших задач мы предлагаем [модель]. Она решает [проблему клиента] за счёт [ключевые преимущества]. Наши клиенты в похожей ситуации получают [конкретный результат].',
    tips: [
      'Говорить языком выгод, не характеристик',
      'Использовать кейсы похожих клиентов',
      'Держать презентацию короткой — 2-3 минуты',
      'После — задать вопрос: "Как это соотносится с вашими ожиданиями?"',
    ],
  },
  {
    id: 'step-06',
    order: 6,
    category: 'Возражения',
    title: 'Работа с возражениями',
    content: 'Понимаю ваше беспокойство. [Парафраз возражения]. Давайте разберём этот момент подробнее...',
    tips: [
      'Не спорить — принять и переформулировать',
      'Уточнить: "Правильно понимаю, что вас беспокоит X?"',
      'Привести аргумент или кейс',
      'Подтвердить снятие возражения: "Это отвечает на ваш вопрос?"',
    ],
  },
  {
    id: 'step-07',
    order: 7,
    category: 'Закрытие',
    title: 'Назначение следующего шага',
    content: 'Отлично! Предлагаю следующий шаг: [КП / демо / встреча / замер]. Когда вам удобно — завтра или послезавтра?',
    tips: [
      'Всегда заканчивать звонок конкретным следующим шагом',
      'Предлагать альтернативу — не "когда удобно?", а "завтра или в среду?"',
      'Зафиксировать дату и время в CRM',
      'Отправить резюме звонка в мессенджер / email',
    ],
  },
];

const defaultMicroPresentations: MicroPresentation[] = [
  {
    id: 'mp-01',
    title: 'Экспертная позиция',
    content: 'Мы занимаемся ЧПУ-оборудованием уже более 10 лет. За это время реализовали сотни проектов в Казахстане и СНГ. Это позволяет нам точно подобрать решение под вашу задачу, а не просто продать станок.',
    category: 'Открытие',
    tags: ['доверие', 'экспертиза'],
  },
  {
    id: 'mp-02',
    title: 'Почему CO2 лазер — для вашей задачи',
    content: 'CO2 лазер идеально подходит для резки акрила, дерева, фанеры, кожи и ткани. Он даёт чистый рез без оплавления, что критично для декоративных изделий. При этом стоимость эксплуатации значительно ниже волоконного лазера.',
    category: 'Квалификация',
    machineTypeIds: ['mt-01'],
    tags: ['co2', 'резка', 'преимущества'],
  },
  {
    id: 'mp-03',
    title: 'Почему волоконный лазер — для металла',
    content: 'Волоконный лазер — это стандарт для резки металла. Скорость резки в 3-5 раз выше CO2, минимальная зона термического влияния, не требует обслуживания лазерной трубки. Ресурс источника — 100 000 часов.',
    category: 'Квалификация',
    machineTypeIds: ['mt-02'],
    tags: ['волоконный', 'металл', 'преимущества'],
  },
  {
    id: 'mp-04',
    title: 'Вопрос о бюджете — мягкий заход',
    content: 'Оборудование у нас представлено в разных ценовых категориях — от компактных настольных до промышленных линий. Чтобы я сразу показал подходящие варианты — есть ориентир по бюджету? Хотя бы примерно: до 2 млн, до 5 млн или выше?',
    category: 'Квалификация',
    tags: ['бюджет', 'квалификация'],
  },
  {
    id: 'mp-05',
    title: 'Переключение модели',
    content: 'Знаете, я хочу быть с вами честным. Для ваших объёмов та модель будет работать на пределе. Есть вариант чуть дороже, но он даст вам запас мощности и не потребует апгрейда через год. Разница — порядка 300 тыс., но окупится за первые полгода.',
    category: 'Возражения',
    tags: ['переключение', 'апсейл'],
  },
  {
    id: 'mp-06',
    title: 'Подготовка следующего шага',
    content: 'Давайте я подготовлю для вас конкретное КП с расчётом под ваши параметры. Это займёт 1 день. И параллельно — если интересно — можем организовать демонстрацию на нашей площадке. Как вам такой план?',
    category: 'Закрытие',
    tags: ['кп', 'демо', 'следующий шаг'],
  },
  {
    id: 'mp-07',
    title: 'Возражение "Дорого"',
    content: 'Понимаю. Давайте смотреть на это иначе: станок стоит X тенге, но если он позволяет вам выполнять [N] заказов в месяц по [цене], то срок окупаемости — около [M] месяцев. После этого — чистая прибыль. Это инвестиция, а не расход.',
    category: 'Возражения',
    tags: ['дорого', 'окупаемость', 'roi'],
  },
  {
    id: 'mp-08',
    title: 'Возражение "Подумаю"',
    content: 'Конечно, решение серьёзное. Скажите, есть ли что-то конкретное, что останавливает? Может, не хватает информации по какому-то параметру? Я хочу убедиться, что у вас есть всё для принятия решения.',
    category: 'Возражения',
    tags: ['подумаю', 'работа с возражением'],
  },
];

interface SalesStore {
  machineTypes: MachineType[];
  scriptNodes: ScriptNode[];
  microPresentations: MicroPresentation[];
  dialogues: DialogueRecord[];
  batchInsights: BatchInsights[];

  addMachineType: (t: MachineType) => void;
  updateMachineType: (id: string, patch: Partial<MachineType>) => void;
  deleteMachineType: (id: string) => void;

  saveScriptNodes: (nodes: ScriptNode[]) => void;
  addScriptNode: (node: ScriptNode) => void;
  updateScriptNode: (id: string, patch: Partial<ScriptNode>) => void;
  deleteScriptNode: (id: string) => void;

  addMicroPresentation: (mp: MicroPresentation) => void;
  updateMicroPresentation: (id: string, patch: Partial<MicroPresentation>) => void;
  deleteMicroPresentation: (id: string) => void;

  addDialogue: (d: DialogueRecord) => void;
  updateDialogue: (id: string, patch: Partial<DialogueRecord>) => void;
  deleteDialogue: (id: string) => void;

  addBatchInsight: (bi: BatchInsights) => void;
  deleteBatchInsight: (id: string) => void;

  migrateOldDialogues: () => Promise<void>;
}

export const useSalesStore = create<SalesStore>()(
  persist(
    (set, get) => ({
      machineTypes: defaultMachineTypes,
      scriptNodes: defaultScriptNodes,
      microPresentations: defaultMicroPresentations,
      dialogues: [],
      batchInsights: [],

      addMachineType: (t) =>
        set((s) => ({ machineTypes: [...s.machineTypes, t] })),
      updateMachineType: (id, patch) =>
        set((s) => ({
          machineTypes: s.machineTypes.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      deleteMachineType: (id) =>
        set((s) => ({ machineTypes: s.machineTypes.filter((m) => m.id !== id) })),

      saveScriptNodes: (nodes) => set({ scriptNodes: nodes }),
      addScriptNode: (node) =>
        set((s) => ({ scriptNodes: [...s.scriptNodes, node] })),
      updateScriptNode: (id, patch) =>
        set((s) => ({
          scriptNodes: s.scriptNodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        })),
      deleteScriptNode: (id) =>
        set((s) => ({ scriptNodes: s.scriptNodes.filter((n) => n.id !== id) })),

      addMicroPresentation: (mp) =>
        set((s) => ({ microPresentations: [...s.microPresentations, mp] })),
      updateMicroPresentation: (id, patch) =>
        set((s) => ({
          microPresentations: s.microPresentations.map((mp) =>
            mp.id === id ? { ...mp, ...patch } : mp,
          ),
        })),
      deleteMicroPresentation: (id) =>
        set((s) => ({
          microPresentations: s.microPresentations.filter((mp) => mp.id !== id),
        })),

      addDialogue: (d) =>
        set((s) => ({ dialogues: [...s.dialogues, d] })),
      updateDialogue: (id, patch) =>
        set((s) => ({
          dialogues: s.dialogues.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
      deleteDialogue: (id) => {
        const d = get().dialogues.find((x) => x.id === id);
        if (d?.textRef) {
          deleteDialogueTexts(d.textRef).catch(() => {});
        }
        set((s) => ({ dialogues: s.dialogues.filter((d) => d.id !== id) }));
      },

      addBatchInsight: (bi) =>
        set((s) => ({ batchInsights: [bi, ...s.batchInsights] })),
      deleteBatchInsight: (id) =>
        set((s) => ({ batchInsights: s.batchInsights.filter((b) => b.id !== id) })),

      migrateOldDialogues: async () => {
        const dialogues = get().dialogues;
        for (const d of dialogues) {
          if (d.rawTextLegacy && !d.textRef) {
            try {
              const ref = await saveDialogueTexts({
                rawText: d.rawTextLegacy,
                cleanedText: d.rawTextLegacy,
              });
              get().updateDialogue(d.id, { textRef: ref, rawTextLegacy: undefined });
            } catch { /* non-critical, user can retry */ }
          }
        }
      },
    }),
    {
      name: 'calidad_sales',
      version: 2,
      migrate: (state: unknown, version: number) => {
        const s = state as Record<string, unknown>;
        if (version < 2) {
          s.batchInsights = [];
          const oldDialogues = (s.dialogues as Array<Record<string, unknown>>) ?? [];
          s.dialogues = oldDialogues.map((d) => {
            const hadRawText = !!d.rawText;
            const wasAnalyzed = d.status === 'done';
            return {
              id: d.id,
              filename: d.filename,
              uploadedAt: d.uploadedAt,
              rawTextLegacy: d.rawText || undefined,
              cleanStatus: hadRawText ? 'ready' : 'pending',
              analysisStatus: wasAnalyzed ? 'done' : (d.status === 'error' ? 'error' : 'pending'),
              clientType: (d.extractedData as Record<string, unknown> | undefined)?.clientType,
              machineTypeHint: (d.extractedData as Record<string, unknown> | undefined)?.machineTypeHint,
              extractedData: d.extractedData,
              errorMessage: d.errorMessage,
              usedModel: d.usedModel,
              modelLog: d.modelLog,
            };
          });
        }
        return s as SalesStore;
      },
    },
  ),
);
