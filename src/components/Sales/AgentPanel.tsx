import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, CheckCircle, XCircle, AlertTriangle, Sparkles, Trash2, Settings, Eye, EyeOff } from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { AGENT_SYSTEM_PROMPT_BASE } from '../../lib/agentPromptBase';
import { MicroPresentation, ScriptNode } from '../../types';
import { logApiUsage } from '../../lib/apiUsageLog';
import { analyzeDialogue, extractArticlePatterns } from '../../services/dialogueProcessor';
import { resolveDialogueTexts } from '../../lib/dialogueStorage';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiMessage {
  role: 'user' | 'assistant' | 'tool_result';
  text?: string;
  toolCall?: { name: string; args: Record<string, unknown>; id?: string };
  toolName?: string;
  toolResult?: string;
  toolCallId?: string; // для сопоставления tool_result → tool_use в Anthropic
}

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  id: string;
}

type DisplayMsg =
  | { id: string; type: 'user'; text: string }
  | { id: string; type: 'assistant'; text: string }
  | { id: string; type: 'tool_proposal'; toolCall: ToolCall; status: 'pending' | 'confirmed' | 'rejected' }
  | { id: string; type: 'tool_auto'; toolName: string; summary: string }
  | { id: string; type: 'error'; text: string };

// ─── Chat history persistence ────────────────────────────────────────────────

const CHAT_STORAGE_KEY = 'calidad_agent_chat_v1';
const MAX_DISPLAY = 100;
const MAX_API = 40;

function loadChatHistory(): { displayMsgs: DisplayMsg[]; apiHistory: ApiMessage[] } {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return { displayMsgs: [], apiHistory: [] };
    const parsed = JSON.parse(raw);
    return {
      displayMsgs: Array.isArray(parsed.displayMsgs) ? parsed.displayMsgs : [],
      apiHistory: Array.isArray(parsed.apiHistory) ? parsed.apiHistory : [],
    };
  } catch {
    return { displayMsgs: [], apiHistory: [] };
  }
}

function saveChatHistory(displayMsgs: DisplayMsg[], apiHistory: ApiMessage[]) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
      displayMsgs: displayMsgs.slice(-MAX_DISPLAY),
      apiHistory: apiHistory.slice(-MAX_API),
      savedAt: new Date().toISOString(),
    }));
  } catch { /* quota exceeded — ignore */ }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const READ_TOOLS = new Set(['get_micro_presentations', 'get_script_nodes', 'get_dialogues', 'get_dialogue_content', 'get_machine_types']);

const TOOL_LABELS: Record<string, string> = {
  create_micro_presentation:  'Создать атом знаний',
  update_micro_presentation:  'Обновить атом знаний',
  delete_micro_presentation:  'Удалить атом знаний',
  get_micro_presentations:    'Поиск атомов знаний',
  get_script_nodes:           'Загрузка скрипта',
  get_dialogues:              'Загрузка диалогов',
  get_dialogue_content:       'Чтение диалога',
  get_machine_types:          'Типы станков',
  create_script_node:         'Создать этап скрипта',
  update_script_node:         'Обновить этап скрипта',
  update_machine_type:        'Обновить слоты станка',
  analyze_dialogue:           'Запустить анализ диалога',
};

const TOOL_RISK: Record<string, 'green' | 'yellow' | 'red'> = {
  get_micro_presentations:    'green',
  get_script_nodes:           'green',
  get_dialogues:              'green',
  get_dialogue_content:       'green',
  get_machine_types:          'green',
  create_micro_presentation:  'yellow',
  update_micro_presentation:  'yellow',
  create_script_node:         'yellow',
  update_script_node:         'yellow',
  analyze_dialogue:           'yellow',
  update_machine_type:        'yellow',
  delete_micro_presentation:  'red',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function describeToolCall(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case 'create_micro_presentation':
      return `Создать "${input.title}" [${input.category}]\nМетод: ${input.methodology}${input.technical ? `\nФакт: ${input.technical}` : ''}${input.compromise ? `\nКомпромисс: ${input.compromise}` : ''}${input.machineTypeIds ? `\nСтанки: ${input.machineTypeIds}` : ''}`;
    case 'update_micro_presentation': {
      const fields = Object.entries(input)
        .filter(([k]) => k !== 'id')
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      return `Обновить МП ${input.id}\n${fields}`;
    }
    case 'create_script_node':
      return `Создать этап "${input.title}" [${input.category}]\n${input.content}${input.tips ? `\nСоветы: ${input.tips}` : ''}`;
    case 'update_machine_type':
      return `Обновить слоты станка ${input.id}\nСлоты: ${input.qualifiers}`;
    default:
      return `${name}(${JSON.stringify(input).slice(0, 100)})`;
  }
}

function uid(): string {
  return Math.random().toString(36).slice(2);
}

// ─── Component ───────────────────────────────────────────────────────────────

export const AgentPanel: React.FC = () => {
  const {
    microPresentations, scriptNodes, dialogues, machineTypes,
    addMicroPresentation, updateMicroPresentation, deleteMicroPresentation,
    addScriptNode, updateScriptNode, updateMachineType,
    updateDialogue,
    agentCustomInstructions, setAgentCustomInstructions,
  } = useSalesStore();

  const [showInstructions, setShowInstructions] = useState(false);
  const [showBasePrompt, setShowBasePrompt] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState(agentCustomInstructions);

  const saved = loadChatHistory();
  const [displayMsgs, setDisplayMsgs] = useState<DisplayMsg[]>(saved.displayMsgs);
  const [apiHistory, setApiHistory] = useState<ApiMessage[]>(saved.apiHistory);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingToolMsgId, setPendingToolMsgId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMsgs]);

  useEffect(() => {
    if (displayMsgs.length > 0) saveChatHistory(displayMsgs, apiHistory);
  }, [displayMsgs, apiHistory]);

  const stats = {
    mpCount: microPresentations.length,
    publishedCount: microPresentations.filter((mp) => mp.isPublished !== false).length,
    draftCount: microPresentations.filter((mp) => mp.isPublished === false).length,
    scriptCount: scriptNodes.length,
    dialogueCount: dialogues.length,
  };

  // ─── Tool execution ────────────────────────────────────────────────────────

  async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
    switch (name) {
      case 'get_micro_presentations': {
        let mps = microPresentations;
        if (input.category) mps = mps.filter((mp) => mp.category === input.category);
        if (input.query) {
          const q = String(input.query).toLowerCase();
          mps = mps.filter(
            (mp) =>
              mp.title.toLowerCase().includes(q) ||
              (mp.methodology || mp.content || '').toLowerCase().includes(q) ||
              (mp.technical || '').toLowerCase().includes(q),
          );
        }
        const result = mps.map((mp) => ({
          id: mp.id, title: mp.title, category: mp.category,
          technical: mp.technical, methodology: mp.methodology, compromise: mp.compromise,
          isPublished: mp.isPublished, machineTypeIds: mp.machineTypeIds, tags: mp.tags,
        }));
        return JSON.stringify(result);
      }

      case 'create_micro_presentation': {
        let parsedSlotConditions: Record<string, string[]> | undefined;
        if (input.slotConditions) {
          try { parsedSlotConditions = JSON.parse(String(input.slotConditions)); } catch { /* ignore */ }
        }
        const mp: MicroPresentation = {
          id: 'mp-' + Date.now().toString(36),
          title: String(input.title || ''),
          content: String(input.methodology || ''),
          category: String(input.category || 'Общее'),
          technical: input.technical ? String(input.technical) : undefined,
          methodology: input.methodology ? String(input.methodology) : undefined,
          compromise: input.compromise ? String(input.compromise) : undefined,
          machineTypeIds: input.machineTypeIds
            ? String(input.machineTypeIds).split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          tags: input.tags
            ? String(input.tags).split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          slotConditions: parsedSlotConditions,
          isPublished: false,
          createdBy: 'agent',
        };
        addMicroPresentation(mp);
        return JSON.stringify({ success: true, id: mp.id, message: `Создан черновик "${mp.title}" (${mp.id})` });
      }

      case 'update_micro_presentation': {
        const id = String(input.id || '');
        const updates: Partial<MicroPresentation> = {};
        if (input.title !== undefined) updates.title = String(input.title);
        if (input.technical !== undefined) updates.technical = String(input.technical) || undefined;
        if (input.methodology !== undefined) {
          updates.methodology = String(input.methodology);
          updates.content = String(input.methodology);
        }
        if (input.compromise !== undefined) updates.compromise = String(input.compromise) || undefined;
        if (input.tags !== undefined) updates.tags = String(input.tags).split(',').map((s) => s.trim()).filter(Boolean);
        if (input.isPublished !== undefined) updates.isPublished = Boolean(input.isPublished);
        if (input.slotConditions !== undefined) {
          const raw = String(input.slotConditions).trim();
          if (!raw) {
            updates.slotConditions = undefined;
          } else {
            try { updates.slotConditions = JSON.parse(raw); } catch { /* ignore */ }
          }
        }
        updateMicroPresentation(id, updates);
        return JSON.stringify({ success: true, message: `МП ${id} обновлена` });
      }

      case 'get_script_nodes': {
        let nodes = scriptNodes;
        if (input.scriptType) nodes = nodes.filter((n) => n.scriptType === input.scriptType);
        return JSON.stringify(
          nodes.map((n) => ({
            id: n.id, title: n.title, category: n.category,
            order: n.order, scriptType: n.scriptType,
            content: (n.content || '').substring(0, 200),
          })),
        );
      }

      case 'get_dialogues': {
        const limit = Math.min(Number(input.limit || 10), 30);
        return JSON.stringify(
          dialogues.slice(0, limit).map((d) => ({
            id: d.id,
            filename: d.filename,
            machineTypeIds: d.machineTypeIds,
            analysisStatus: d.analysisStatus,
            dialogueType: d.dialogueType,
            hasExtractedData: !!d.extractedData,
            formulationsCount: d.extractedData?.formulations?.length ?? 0,
            suggestedMPsCount: d.extractedData?.suggestedMicroPresentations?.length ?? 0,
            stepsCount: d.extractedData?.conversationSteps?.length ?? 0,
          })),
        );
      }

      case 'get_dialogue_content': {
        const id = String(input.id || '');
        const dialogue = dialogues.find((d) => d.id === id);
        if (!dialogue) return JSON.stringify({ error: `Диалог ${id} не найден` });
        if (!dialogue.extractedData) return JSON.stringify({ error: `Диалог ${id} ещё не проанализирован (analysisStatus: ${dialogue.analysisStatus})` });
        return JSON.stringify({
          id: dialogue.id,
          filename: dialogue.filename,
          dialogueType: dialogue.dialogueType,
          machineTypeIds: dialogue.machineTypeIds,
          clientType: dialogue.extractedData.clientType,
          machineTypeHint: dialogue.extractedData.machineTypeHint,
          formulations: dialogue.extractedData.formulations,
          techniques: dialogue.extractedData.techniques,
          painPoints: dialogue.extractedData.painPoints ?? [],
          conversationSteps: dialogue.extractedData.conversationSteps,
          suggestedMicroPresentations: dialogue.extractedData.suggestedMicroPresentations,
        });
      }

      case 'get_machine_types': {
        return JSON.stringify(
          machineTypes.map((mt) => ({
            id: mt.id,
            name: mt.name,
            description: mt.description,
            qualifiers: mt.qualifiers ?? [],
          })),
        );
      }

      case 'create_script_node': {
        const node: ScriptNode = {
          id: 'step-' + Date.now().toString(36),
          order: scriptNodes.length + 1,
          title: String(input.title || ''),
          content: String(input.content || ''),
          category: String(input.category || 'Общее'),
          scriptType: input.scriptType
            ? (String(input.scriptType) as ScriptNode['scriptType'])
            : 'qualification',
          tips: input.tips
            ? String(input.tips).split('|').map((s) => s.trim()).filter(Boolean)
            : [],
        };
        addScriptNode(node);
        return JSON.stringify({ success: true, id: node.id, message: `Создан этап "${node.title}" (${node.id})` });
      }

      case 'update_machine_type': {
        const id = String(input.id || '');
        const mt = machineTypes.find((m) => m.id === id);
        if (!mt) return JSON.stringify({ error: `Тип станка ${id} не найден` });
        const qualifiers = input.qualifiers
          ? String(input.qualifiers)
              .split('|')
              .map((s) => s.trim())
              .filter(Boolean)
              .map((pair) => {
                const colonIdx = pair.indexOf(':');
                if (colonIdx === -1) return { key: pair.toLowerCase().replace(/\s+/g, '_'), label: pair };
                return { key: pair.slice(0, colonIdx).trim(), label: pair.slice(colonIdx + 1).trim() };
              })
          : [];
        updateMachineType(id, { qualifiers });
        return JSON.stringify({ success: true, message: `Станок "${mt.name}" обновлён: ${qualifiers.length} слотов` });
      }

      case 'update_script_node': {
        const id = String(input.id || '');
        const updates: Partial<ScriptNode> = {};
        if (input.title !== undefined) updates.title = String(input.title);
        if (input.content !== undefined) updates.content = String(input.content);
        if (input.category !== undefined) updates.category = String(input.category) as ScriptNode['category'];
        if (input.tips !== undefined) {
          const raw = String(input.tips).trim();
          updates.tips = raw ? raw.split('|').map((s) => s.trim()).filter(Boolean) : [];
        }
        updateScriptNode(id, updates);
        return JSON.stringify({ success: true, message: `Этап ${id} обновлён` });
      }

      case 'delete_micro_presentation': {
        const id = String(input.id || '');
        const mp = microPresentations.find((m) => m.id === id);
        if (!mp) return JSON.stringify({ error: `МП ${id} не найдена` });
        deleteMicroPresentation(id);
        return JSON.stringify({ success: true, message: `МП "${mp.title}" (${id}) удалена. Причина: ${input.reason || 'не указана'}` });
      }

      case 'analyze_dialogue': {
        const id = String(input.id || '');
        const dialogue = dialogues.find((d) => d.id === id);
        if (!dialogue) return JSON.stringify({ error: `Диалог ${id} не найден` });
        if (!dialogue.textRef) return JSON.stringify({ error: `Диалог ${id} не имеет текста` });
        if (dialogue.analysisStatus === 'analyzing') return JSON.stringify({ error: 'Анализ уже запущен' });

        updateDialogue(id, { analysisStatus: 'analyzing', errorMessage: undefined, modelLog: [], usedModel: undefined });
        try {
          const texts = await resolveDialogueTexts(dialogue.textRef);
          if (!texts) throw new Error('Текст не найден в хранилище');

          const result = await analyzeDialogue(
            texts.cleanedText || texts.rawText,
            (entry) => {
              const cur = useSalesStore.getState().dialogues.find((x) => x.id === id)?.modelLog ?? [];
              updateDialogue(id, { modelLog: [...cur, entry] });
            },
          );

          let finalData = result.data;
          if (input.forArticles) {
            try {
              const patterns = await extractArticlePatterns(texts.cleanedText || texts.rawText);
              finalData = { ...result.data, articleTopics: patterns.articleTopics, painPoints: patterns.painPoints, styleMarkers: patterns.styleMarkers };
            } catch { /* ignore */ }
          }

          updateDialogue(id, {
            analysisStatus: 'done',
            extractedData: finalData,
            clientType: finalData.clientType,
            machineTypeHint: finalData.machineTypeHint,
            usedModel: result.usedModel,
            modelLog: result.log,
          });

          logApiUsage({
            model: result.usedModel || 'gemini-2.5-flash',
            module: 'dialogue_analyze',
            inputTokens: Math.round((texts.cleanedText || texts.rawText).length / 4),
            outputTokens: 500,
          }).catch(() => {});

          return JSON.stringify({
            success: true,
            message: `Анализ завершён. ${finalData.formulations?.length ?? 0} формулировок, ${finalData.suggestedMicroPresentations?.length ?? 0} предложенных МП, ${finalData.conversationSteps?.length ?? 0} этапов. Теперь вызови get_dialogue_content("${id}") чтобы прочитать результаты.`,
            usedModel: result.usedModel,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          updateDialogue(id, { analysisStatus: 'error', errorMessage: msg });
          return JSON.stringify({ error: `Анализ не удался: ${msg}` });
        }
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  }

  // ─── API call loop ─────────────────────────────────────────────────────────

  async function callAgent(history: ApiMessage[]): Promise<{
    updatedHistory: ApiMessage[];
    pendingTool?: { toolCall: ToolCall; msgId: string };
    text?: string;
  }> {
    let currentHistory = [...history];

    // Loop to auto-execute read tools
    for (let i = 0; i < 12; i++) {
      let res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentHistory, stats, customInstructions: agentCustomInstructions }),
      });

      // Auto-retry once on rate limit (429) after 65 seconds
      if (res.status === 429) {
        setDisplayMsgs((prev) => [
          ...prev,
          { id: uid(), type: 'tool_auto', toolName: 'rate_limit', summary: 'Лимит токенов API — ожидаем 65 сек и повторяем...' },
        ]);
        await new Promise((r) => setTimeout(r, 65000));
        res = await fetch('/api/agent-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: currentHistory, stats, customInstructions: agentCustomInstructions }),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'API error');
      }

      const data = (await res.json()) as
        | { type: 'text'; content: string; usage?: { inputTokens: number; outputTokens: number } }
        | { type: 'tool_call'; toolCall: ToolCall; usage?: { inputTokens: number; outputTokens: number } };

      if (data.usage) {
        logApiUsage({ model: 'claude-sonnet-4-6', module: 'agent', inputTokens: data.usage.inputTokens, outputTokens: data.usage.outputTokens }).catch(() => {});
      }

      if (data.type === 'text') {
        return { updatedHistory: currentHistory, text: data.content };
      }

      if (data.type === 'tool_call') {
        const { toolCall } = data;

        // Add assistant tool-call turn to history (сохраняем id для Anthropic)
        currentHistory = [
          ...currentHistory,
          { role: 'assistant', toolCall: { name: toolCall.name, args: toolCall.input, id: toolCall.id } },
        ];

        if (READ_TOOLS.has(toolCall.name)) {
          // Auto-execute read tool
          const result = await executeTool(toolCall.name, toolCall.input);
          currentHistory = [
            ...currentHistory,
            { role: 'tool_result', toolName: toolCall.name, toolResult: result, toolCallId: toolCall.id },
          ];

          // Add to display as auto-executed summary
          const summary = `${TOOL_LABELS[toolCall.name] || toolCall.name}: ${result.length} символов`;
          setDisplayMsgs((prev) => [
            ...prev,
            { id: uid(), type: 'tool_auto', toolName: toolCall.name, summary },
          ]);
          // Continue loop
        } else {
          // Write tool — pause and ask confirmation
          const msgId = uid();
          return {
            updatedHistory: currentHistory,
            pendingTool: { toolCall, msgId },
          };
        }
      }
    }

    throw new Error('Слишком много итераций инструментов');
  }

  // ─── Send message ──────────────────────────────────────────────────────────

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    const userMsgId = uid();
    setDisplayMsgs((prev) => [...prev, { id: userMsgId, type: 'user', text }]);

    const newHistory: ApiMessage[] = [...apiHistory, { role: 'user', text }];
    setApiHistory(newHistory);
    setIsLoading(true);

    try {
      const { updatedHistory, text: responseText, pendingTool } = await callAgent(newHistory);

      if (responseText !== undefined) {
        setDisplayMsgs((prev) => [...prev, { id: uid(), type: 'assistant', text: responseText }]);
        setApiHistory([...updatedHistory, { role: 'assistant', text: responseText }]);
      }

      if (pendingTool) {
        const proposalMsg: DisplayMsg = {
          id: pendingTool.msgId,
          type: 'tool_proposal',
          toolCall: pendingTool.toolCall,
          status: 'pending',
        };
        setDisplayMsgs((prev) => [...prev, proposalMsg]);
        setApiHistory(updatedHistory);
        setPendingToolMsgId(pendingTool.msgId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDisplayMsgs((prev) => [...prev, { id: uid(), type: 'error', text: msg }]);
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Tool confirmation ─────────────────────────────────────────────────────

  async function handleToolConfirm(msgId: string, toolCall: ToolCall) {
    setDisplayMsgs((prev) =>
      prev.map((m) => (m.id === msgId && m.type === 'tool_proposal' ? { ...m, status: 'confirmed' as const } : m)),
    );
    setPendingToolMsgId(null);
    setIsLoading(true);

    try {
      const result = await executeTool(toolCall.name, toolCall.input);
      const newHistory: ApiMessage[] = [
        ...apiHistory,
        { role: 'tool_result', toolName: toolCall.name, toolResult: result, toolCallId: toolCall.id },
      ];

      const { updatedHistory, text, pendingTool } = await callAgent(newHistory);

      if (text !== undefined) {
        setDisplayMsgs((prev) => [...prev, { id: uid(), type: 'assistant', text }]);
        setApiHistory([...updatedHistory, { role: 'assistant', text }]);
      }

      if (pendingTool) {
        const proposalMsg: DisplayMsg = {
          id: pendingTool.msgId,
          type: 'tool_proposal',
          toolCall: pendingTool.toolCall,
          status: 'pending',
        };
        setDisplayMsgs((prev) => [...prev, proposalMsg]);
        setApiHistory(updatedHistory);
        setPendingToolMsgId(pendingTool.msgId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDisplayMsgs((prev) => [...prev, { id: uid(), type: 'error', text: msg }]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToolReject(msgId: string, toolCall: ToolCall) {
    setDisplayMsgs((prev) =>
      prev.map((m) => (m.id === msgId && m.type === 'tool_proposal' ? { ...m, status: 'rejected' as const } : m)),
    );
    setPendingToolMsgId(null);
    setIsLoading(true);

    try {
      const newHistory: ApiMessage[] = [
        ...apiHistory,
        { role: 'tool_result', toolName: toolCall.name, toolResult: '{"cancelled": true, "message": "Пользователь отклонил действие"}', toolCallId: toolCall.id },
      ];

      const { updatedHistory, text, pendingTool } = await callAgent(newHistory);

      if (text !== undefined) {
        setDisplayMsgs((prev) => [...prev, { id: uid(), type: 'assistant', text }]);
        setApiHistory([...updatedHistory, { role: 'assistant', text }]);
      }

      if (pendingTool) {
        const proposalMsg: DisplayMsg = {
          id: pendingTool.msgId,
          type: 'tool_proposal',
          toolCall: pendingTool.toolCall,
          status: 'pending',
        };
        setDisplayMsgs((prev) => [...prev, proposalMsg]);
        setApiHistory(updatedHistory);
        setPendingToolMsgId(pendingTool.msgId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDisplayMsgs((prev) => [...prev, { id: uid(), type: 'error', text: msg }]);
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Keyboard handler ──────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = input.trim().length > 0 && !isLoading && !pendingToolMsgId;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full" style={{ minHeight: 500 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Sparkles size={18} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Knowledge Architect</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {stats.mpCount} атомов · {stats.scriptCount} этапов · {stats.dialogueCount} диалогов
          </p>
        </div>
        {displayMsgs.length > 0 && (
          <button
            onClick={() => {
              setDisplayMsgs([]);
              setApiHistory([]);
              localStorage.removeItem(CHAT_STORAGE_KEY);
            }}
            title="Очистить историю чата"
            className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Custom instructions panel */}
      <div className="mb-3 rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowInstructions((p) => !p)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        >
          <Settings size={12} className="text-gray-400 flex-shrink-0" />
          <span className="text-xs font-bold text-gray-500 flex-1">Инструкции агента</span>
          {agentCustomInstructions.trim() && (
            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold">активны</span>
          )}
          {showInstructions ? <EyeOff size={11} className="text-gray-400" /> : <Eye size={11} className="text-gray-400" />}
        </button>
        {showInstructions && (
          <div className="px-3 pb-3 pt-2 bg-white space-y-2">
            <p className="text-[10px] text-gray-400">
              Дополнительные инструкции добавляются к базовому промпту и влияют на поведение агента.
              Базовый промпт обновляется автоматически при деплое.
            </p>
            <textarea
              value={instructionsDraft}
              onChange={(e) => setInstructionsDraft(e.target.value)}
              placeholder="Например: Всегда уточняй тип станка прежде чем создавать атом. Не создавай более 3 атомов за раз без подтверждения."
              className="w-full text-xs border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:border-calidad-blue"
              rows={4}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setAgentCustomInstructions(instructionsDraft); setShowInstructions(false); }}
                className="px-3 py-1 bg-calidad-blue text-white rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors"
              >
                Сохранить
              </button>
              <button
                onClick={() => { setInstructionsDraft(''); setAgentCustomInstructions(''); }}
                className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
              >
                Сбросить
              </button>
              <button
                onClick={() => setShowBasePrompt((p) => !p)}
                className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors ml-auto"
              >
                {showBasePrompt ? 'Скрыть базовый промпт' : 'Просмотр базового промпта'}
              </button>
            </div>
            {showBasePrompt && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 max-h-48 overflow-y-auto">
                <pre className="text-[10px] text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">{AGENT_SYSTEM_PROMPT_BASE}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
        {displayMsgs.length === 0 && (
          <div className="text-center py-10 text-gray-400 space-y-3">
            <Bot size={32} className="mx-auto opacity-30" />
            <p className="text-sm font-medium">Агент готов к работе</p>
            <div className="text-xs space-y-1 max-w-xs mx-auto text-left bg-gray-50 rounded-xl p-3">
              <p className="font-semibold text-gray-500 mb-2">Примеры:</p>
              {[
                'Покажи диалоги готовые к анализу',
                'Создай атомы знаний из первого диалога',
                'Создай этапы скрипта из диалогов',
                'Добавь квалификационные слоты для лазера',
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="block w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  → {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {displayMsgs.map((msg) => {
          if (msg.type === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="flex items-end gap-2 max-w-[80%]">
                  <div className="bg-calidad-blue text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm">
                    {msg.text}
                  </div>
                  <User size={16} className="text-gray-400 flex-shrink-0 mb-0.5" />
                </div>
              </div>
            );
          }

          if (msg.type === 'assistant') {
            return (
              <div key={msg.id} className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles size={12} className="text-indigo-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-gray-800 whitespace-pre-wrap max-w-[85%]">
                  {msg.text}
                </div>
              </div>
            );
          }

          if (msg.type === 'tool_auto') {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="text-[10px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                  🔍 {TOOL_LABELS[msg.toolName] || msg.toolName}
                </span>
              </div>
            );
          }

          if (msg.type === 'tool_proposal') {
            const risk = TOOL_RISK[msg.toolCall.name] ?? 'yellow';
            const riskColors = {
              green: 'bg-green-50 border-green-200',
              yellow: 'bg-amber-50 border-amber-200',
              red: 'bg-red-50 border-red-200',
            };
            const riskDot = { green: '🟢', yellow: '🟡', red: '🔴' };

            return (
              <div key={msg.id} className={`rounded-xl border p-4 ${riskColors[risk]}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{riskDot[risk]}</span>
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {TOOL_LABELS[msg.toolCall.name] || msg.toolCall.name}
                  </span>
                </div>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white bg-opacity-60 rounded-lg p-2.5 mb-3">
                  {describeToolCall(msg.toolCall.name, msg.toolCall.input)}
                </pre>

                {msg.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToolConfirm(msg.id, msg.toolCall)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={12} /> Выполнить
                    </button>
                    <button
                      onClick={() => handleToolReject(msg.id, msg.toolCall)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={12} /> Отклонить
                    </button>
                  </div>
                )}

                {msg.status === 'confirmed' && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-bold">
                    <CheckCircle size={12} /> Выполнено
                  </span>
                )}

                {msg.status === 'rejected' && (
                  <span className="flex items-center gap-1 text-xs text-gray-400 font-bold">
                    <XCircle size={12} /> Отклонено
                  </span>
                )}
              </div>
            );
          }

          if (msg.type === 'error') {
            return (
              <div key={msg.id} className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{msg.text}</p>
              </div>
            );
          }

          return null;
        })}

        {isLoading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles size={12} className="text-indigo-600" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5">
              <Loader2 size={14} className="text-gray-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2 items-end border-t border-gray-200 pt-3">
        <textarea
          ref={inputRef}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-calidad-blue min-h-[42px] max-h-32"
          placeholder={pendingToolMsgId ? 'Подтвердите или отклоните действие выше...' : 'Сообщение агенту...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={!!pendingToolMsgId}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex-shrink-0 w-10 h-10 bg-calidad-blue text-white rounded-xl flex items-center justify-center hover:bg-blue-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </div>

      {pendingToolMsgId && (
        <p className="text-[10px] text-amber-600 mt-1.5 text-center">
          ⏸ Ожидает подтверждения действия
        </p>
      )}
    </div>
  );
};
