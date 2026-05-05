import {
  trimTopic,
  getMessageTextContent,
  getMessageTextContentWithoutThinking,
  getMessageTextContentWithoutThinkingFromContent,
  isImageGenerationModel,
} from "../utils";

import Locale, { getLang } from "../locales";
import { showToast } from "../components/ui-lib";
import { ModelConfig, ModelType, useAppConfig } from "./config";
import { createEmptyMask, Mask } from "./mask";
import {
  DEFAULT_INPUT_TEMPLATE,
  DEFAULT_MODELS,
  DEFAULT_SYSTEM_TEMPLATE,
  KnowledgeCutOffDate,
  StoreKey,
} from "../constant";
import type {
  ClientApi,
  RequestMessage,
  RichMessage,
  MultimodalContent,
  UploadFile,
} from "../client/api";
import { getClientApi } from "../client/api";
import { ChatControllerPool } from "../client/controller";
import { prettyObject } from "../utils/format";
import { estimateTokenLengthInLLM } from "../utils/token";
import { nanoid } from "nanoid";
import { createPersistStore } from "../utils/store";
import { safeLocalStorage, readFileContent } from "../utils";
import {
  indexedDBStorage,
  autoBackupChatToLocalStorage,
} from "@/app/utils/indexedDB-storage";
import { useAccessStore } from "./access";
import { ServiceProvider } from "../constant";

const localStorage = safeLocalStorage();

export type ChatMessage = RequestMessage & {
  date: string;
  streaming?: boolean;
  isError?: boolean;
  id: string;
  parentId?: string;
  childrenIds?: string[];
  activeChildId?: string;
  turnId?: string;
  originId?: string;
  branchKind?: "normal" | "retry" | "edit";
  model?: ModelType;
  displayName?: string;
  providerName?: string;
  providerId?: string;
  providerType?: string;
  beClear?: boolean;
  isContinuePrompt?: boolean;
  isStreamRequest?: boolean;
  modelSource?: "primary" | "secondary"; // 双模型模式下标识消息来源

  // 引用信息
  quote?: {
    text: string;
    messageId: string;
    messageIndex: number;
    // DOM 位置信息（用于精确高亮）
    startOffset?: number; // 在消息内容中的起始字符偏移
    endOffset?: number; // 在消息内容中的结束字符偏移
  };

  statistic?: {
    singlePromptTokens?: number;
    completionTokens?: number;
    reasoningTokens?: number;
    firstReplyLatency?: number;
    searchingLatency?: number;
    reasoningLatency?: number;
    totalReplyLatency?: number;
  };
};

export function createMessage(override: Partial<ChatMessage>): ChatMessage {
  return {
    id: nanoid(),
    date: new Date().toLocaleString(),
    role: "user",
    content: "",
    branchKind: "normal",
    ...override,
  };
}

function getResponseContentWithoutThinking(message: string | RichMessage) {
  return getMessageTextContentWithoutThinkingFromContent(
    typeof message === "string" ? message : message.content,
  );
}

export interface ChatStat {
  tokenCount: number;
  wordCount: number;
  charCount: number;
}

export interface ChatSession {
  id: string;
  topic: string;

  memoryPrompt: string;
  enableMessageTree?: boolean;
  messageTree?: Record<string, ChatMessage>;
  rootMessageIds?: string[];
  activeRootId?: string;
  messages: ChatMessage[];
  stat: ChatStat;
  lastUpdate: number;
  lastSummarizeIndex: number;
  clearContextIndex?: number;
  inPrivateMode?: boolean;
  pinned?: boolean;

  mask: Mask;

  // 双模型模式相关字段
  dualModelMode?: boolean; // 是否启用双模型模式
  secondaryMessages?: ChatMessage[]; // 副模型消息队列
  secondaryModelConfig?: {
    // 副模型配置 - 只存储与主模型不同的配置
    model: ModelType;
    providerName: ServiceProvider;
    displayName?: string;
    // 以下配置为可选，如果不设置则跟随主模型配置
    // 设置为具体值表示使用独立配置，不跟随主模型
    historyMessageCount?: number;
    sendMemory?: boolean;
    compressMessageLengthThreshold?: number;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    enableInjectSystemPrompts?: boolean;
  };
  secondaryMemoryPrompt?: string; // 副模型记忆提示
  secondaryLastSummarizeIndex?: number; // 副模型摘要索引
  secondaryClearContextIndex?: number; // 副模型独立的历史清除索引
}

export const DEFAULT_TOPIC = Locale.Store.DefaultTopic;
export const BOT_HELLO: ChatMessage = createMessage({
  role: "assistant",
  content: Locale.Store.BotHello,
});

const NO_ACTIVE_MESSAGE = "";

function normalizeTreeNode(message: ChatMessage, parent?: ChatMessage) {
  message.childrenIds = message.childrenIds?.filter(Boolean) ?? [];
  message.turnId =
    message.turnId ??
    (message.role === "assistant"
      ? parent?.turnId ?? parent?.id ?? message.id
      : message.id);
  message.originId = message.originId || undefined;
  message.branchKind = message.branchKind ?? "normal";
  return message;
}

export function rebuildMessageTreeFromMessages(session: ChatSession) {
  const tree: Record<string, ChatMessage> = {};
  const rootMessageIds: string[] = [];
  let parent: ChatMessage | undefined;

  session.messages.forEach((message) => {
    message.parentId = parent?.id;
    normalizeTreeNode(message, parent);
    message.childrenIds = [];
    message.activeChildId = undefined;
    tree[message.id] = message;

    if (parent) {
      parent.childrenIds = [message.id];
      parent.activeChildId = message.id;
    } else {
      rootMessageIds.push(message.id);
    }
    parent = message;
  });

  session.messageTree = tree;
  session.rootMessageIds = rootMessageIds;
  session.activeRootId = rootMessageIds[0];
}

function hasMessageTreeBranches(session: ChatSession) {
  const tree = session.messageTree;
  if (!tree) return false;

  const hasRootBranch =
    (session.rootMessageIds ?? []).filter((id) => tree[id]).length > 1;
  const hasNodeBranch = Object.values(tree).some(
    (message) =>
      (message.childrenIds ?? []).filter((id) => tree[id]).length > 1,
  );

  return hasRootBranch || hasNodeBranch;
}

export function getActiveMessagePath(session: ChatSession) {
  const tree = session.messageTree;
  if (!tree) return session.messages;

  const rootIds = (session.rootMessageIds ?? []).filter((id) => tree[id]);
  let currentId: string | undefined =
    session.activeRootId === undefined ? rootIds[0] : session.activeRootId;

  if (!currentId || currentId === NO_ACTIVE_MESSAGE) return [];

  const messages: ChatMessage[] = [];
  const visited = new Set<string>();
  while (currentId && !visited.has(currentId)) {
    const message: ChatMessage | undefined = tree[currentId];
    if (!message) break;
    visited.add(currentId);
    normalizeTreeNode(
      message,
      message.parentId ? tree[message.parentId] : undefined,
    );
    messages.push(message);

    const nextId: string | undefined = message.activeChildId;
    if (!nextId || nextId === NO_ACTIVE_MESSAGE || !tree[nextId]) break;
    currentId = nextId;
  }

  return messages;
}

export function syncMessagesFromTree(session: ChatSession) {
  if (!session.messageTree) return;
  session.messages = getActiveMessagePath(session);
}

function restoreActiveDescendantPath(session: ChatSession, messageId: string) {
  const tree = session.messageTree;
  if (!tree) return;

  const visited = new Set<string>();
  let current = tree[messageId];

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    normalizeTreeNode(
      current,
      current.parentId ? tree[current.parentId] : undefined,
    );

    const activeChildId = current.activeChildId;
    const activeChildExists =
      !!activeChildId &&
      activeChildId !== NO_ACTIVE_MESSAGE &&
      !!tree[activeChildId];

    if (!activeChildExists) {
      const fallbackChildId = current.childrenIds
        ?.filter((id) => tree[id])
        .at(-1);

      if (!fallbackChildId) break;
      current.activeChildId = fallbackChildId;
    }

    const nextId = current.activeChildId;
    if (!nextId || nextId === NO_ACTIVE_MESSAGE) break;
    current = tree[nextId];
  }
}

export function ensureMessageTree(session: ChatSession) {
  const messageIds = session.messages.map((m) => m.id);
  const missingActiveMessage =
    !session.messageTree || messageIds.some((id) => !session.messageTree?.[id]);

  if (missingActiveMessage) {
    rebuildMessageTreeFromMessages(session);
    return;
  }

  const tree = session.messageTree;
  if (!tree) return;

  Object.values(tree).forEach((message) =>
    normalizeTreeNode(
      message,
      message.parentId ? tree[message.parentId] : undefined,
    ),
  );
  session.rootMessageIds =
    session.rootMessageIds?.filter((id) => tree[id]) ??
    Object.values(tree)
      .filter((message) => !message.parentId)
      .map((message) => message.id);

  if (
    session.activeRootId !== NO_ACTIVE_MESSAGE &&
    session.activeRootId &&
    !tree[session.activeRootId]
  ) {
    session.activeRootId = session.rootMessageIds[0];
  }

  syncMessagesFromTree(session);
}

export function activateMessagePath(
  session: ChatSession,
  messageId: string | null,
  options?: { truncate?: boolean },
) {
  ensureMessageTree(session);
  const tree = session.messageTree;
  if (!tree) return;

  if (messageId === null) {
    session.activeRootId = NO_ACTIVE_MESSAGE;
    session.messages = [];
    return;
  }

  const target = tree[messageId];
  if (!target) {
    syncMessagesFromTree(session);
    return;
  }

  const path: ChatMessage[] = [];
  const visited = new Set<string>();
  let current: ChatMessage | undefined = target;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = current.parentId ? tree[current.parentId] : undefined;
  }

  session.activeRootId = path[0]?.id;
  for (let i = 0; i < path.length - 1; i += 1) {
    path[i].activeChildId = path[i + 1].id;
  }
  if (options?.truncate) {
    target.activeChildId = NO_ACTIVE_MESSAGE;
  } else {
    restoreActiveDescendantPath(session, target.id);
  }
  syncMessagesFromTree(session);
}

export function appendMessagesToActivePath(
  session: ChatSession,
  newMessages: ChatMessage[],
) {
  ensureMessageTree(session);
  if (!session.messageTree) {
    rebuildMessageTreeFromMessages(session);
  }

  const tree = session.messageTree!;
  let parent = getActiveMessagePath(session).at(-1);

  newMessages.forEach((message) => {
    message.parentId = parent?.id;
    normalizeTreeNode(message, parent);
    message.childrenIds = [];
    message.activeChildId = undefined;
    tree[message.id] = message;

    if (parent) {
      const parentNode = tree[parent.id];
      parentNode.childrenIds = (parentNode.childrenIds ?? []).filter(
        (id) => id !== message.id && tree[id],
      );
      parentNode.childrenIds.push(message.id);
      parentNode.activeChildId = message.id;
    } else {
      session.rootMessageIds = (session.rootMessageIds ?? []).filter(
        (id) => id !== message.id && tree[id],
      );
      session.rootMessageIds.push(message.id);
      session.activeRootId = message.id;
    }

    parent = message;
  });

  syncMessagesFromTree(session);
}

export function removeMessageFromTree(session: ChatSession, messageId: string) {
  ensureMessageTree(session);
  const activeMessagesBeforeDelete = session.messages.slice();
  const tree = session.messageTree;
  if (!tree?.[messageId]) {
    const deletedMessageIds = [messageId];
    cleanupDeletedMessageRuntimeState(session, deletedMessageIds);
    session.messages = session.messages.filter(
      (message) => message.id !== messageId,
    );
    resetMemoryIfDeletedSummarizedMessages(
      session,
      activeMessagesBeforeDelete,
      deletedMessageIds,
    );
    syncSessionDerivedState(session);
    return;
  }

  const message = tree[messageId];
  const idsToDelete: string[] = [];
  const idsToDeleteSet = new Set<string>();
  const collect = (id: string) => {
    const node = tree[id];
    if (!node || idsToDeleteSet.has(id)) return;
    idsToDeleteSet.add(id);
    idsToDelete.push(id);
    (node.childrenIds ?? []).forEach(collect);
  };
  collect(messageId);
  cleanupDeletedMessageRuntimeState(session, idsToDelete);

  const ownerParentId =
    message.parentId && tree[message.parentId]?.childrenIds?.includes(messageId)
      ? message.parentId
      : Object.values(tree).find(
          (node) => node.childrenIds?.includes(messageId),
        )?.id;
  const isRootMessage =
    !ownerParentId || (session.rootMessageIds ?? []).includes(messageId);
  const siblings = isRootMessage
    ? session.rootMessageIds ?? []
    : tree[ownerParentId]?.childrenIds ?? [];
  const deletingIndex = siblings.indexOf(messageId);
  const nextSiblings = siblings.filter((id) => !idsToDeleteSet.has(id));
  const nextActiveId =
    nextSiblings[
      Math.min(Math.max(deletingIndex, 0), Math.max(nextSiblings.length - 1, 0))
    ] ?? NO_ACTIVE_MESSAGE;

  idsToDelete.forEach((id) => delete tree[id]);

  if (isRootMessage) {
    session.rootMessageIds = nextSiblings;
    session.activeRootId = nextActiveId;
  } else if (ownerParentId && tree[ownerParentId]) {
    tree[ownerParentId].childrenIds = nextSiblings;
    tree[ownerParentId].activeChildId = nextActiveId;
  }

  session.rootMessageIds = (session.rootMessageIds ?? []).filter(
    (id) => tree[id],
  );
  Object.values(tree).forEach((node) => {
    node.childrenIds = (node.childrenIds ?? []).filter((id) => tree[id]);
    if (
      node.activeChildId &&
      node.activeChildId !== NO_ACTIVE_MESSAGE &&
      !tree[node.activeChildId]
    ) {
      node.activeChildId = node.childrenIds[0] ?? NO_ACTIVE_MESSAGE;
    }
  });
  if (
    session.activeRootId &&
    session.activeRootId !== NO_ACTIVE_MESSAGE &&
    !tree[session.activeRootId]
  ) {
    session.activeRootId = session.rootMessageIds[0] ?? NO_ACTIVE_MESSAGE;
  }

  syncMessagesFromTree(session);
  resetMemoryIfDeletedSummarizedMessages(
    session,
    activeMessagesBeforeDelete,
    idsToDelete,
  );
  syncSessionDerivedState(session);
}

export function getMessageBranchInfo(session: ChatSession, messageId: string) {
  ensureMessageTree(session);
  const tree = session.messageTree;
  const message = tree?.[messageId];
  if (!tree || !message) return null;

  const siblings = (
    message.parentId
      ? tree[message.parentId]?.childrenIds ?? []
      : session.rootMessageIds ?? []
  ).filter((id) => tree[id]);
  const index = siblings.indexOf(messageId);

  if (index < 0 || siblings.length <= 1) return null;
  return {
    current: index + 1,
    total: siblings.length,
  };
}

export function switchMessageBranchInSession(
  session: ChatSession,
  messageId: string,
  delta: number,
) {
  ensureMessageTree(session);
  const tree = session.messageTree;
  const message = tree?.[messageId];
  if (!tree || !message) return;

  const siblings = (
    message.parentId
      ? tree[message.parentId]?.childrenIds ?? []
      : session.rootMessageIds ?? []
  ).filter((id) => tree[id]);
  const index = siblings.indexOf(messageId);
  if (index < 0 || siblings.length <= 1) return;

  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= siblings.length) return;

  const nextId = siblings[nextIndex];
  activateMessagePath(session, nextId);
}

function createEmptySession(): ChatSession {
  return {
    id: nanoid(),
    topic: DEFAULT_TOPIC,
    memoryPrompt: "",
    enableMessageTree: false,
    messageTree: {},
    rootMessageIds: [],
    activeRootId: undefined,
    messages: [],
    stat: {
      tokenCount: 0,
      wordCount: 0,
      charCount: 0,
    },
    lastUpdate: Date.now(),
    lastSummarizeIndex: 0,

    mask: createEmptyMask(),

    // 双模型模式默认值
    dualModelMode: false,
    secondaryMessages: [],
    secondaryModelConfig: undefined,
    secondaryMemoryPrompt: "",
    secondaryLastSummarizeIndex: 0,
    secondaryClearContextIndex: undefined,
  };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function createTemplateRegex(output: string) {
  const keys = [
    "{{ServiceProvider}}",
    "{{cutoff}}",
    "{{model}}",
    "{{time}}",
    "{{lang}}",
    "{{newline}}",
  ];
  const placeholder = "PLACEHOLDER_FOR_INPUT";
  let escapedOutput = output.replace("{{input}}", placeholder);
  const keysRegex = new RegExp(
    keys.map((key) => escapeRegExp(key)).join("|"),
    "g",
  );
  escapedOutput = escapedOutput.replace(keysRegex, "");
  const escapedRegexString = escapeRegExp(escapedOutput);
  const finalRegexString = escapedRegexString.replace(
    new RegExp(`\\s*${placeholder}\\s*`, "g"),
    "([\\s\\S]*)",
  );
  return new RegExp("^" + finalRegexString + "$");
}

function countMessages(msgs: ChatMessage[]) {
  return msgs.reduce((pre, cur) => pre + estimateMessageTokenInLLM(cur), 0);
}

function calculateSessionStat(messages: ChatMessage[]): ChatStat {
  return messages.reduce(
    (stat, message) => {
      const contentText =
        typeof message.content === "string"
          ? message.content
          : getMessageTextContent(message);
      stat.charCount += contentText.length;
      stat.tokenCount += estimateMessageTokenInLLM(message);
      return stat;
    },
    { tokenCount: 0, wordCount: 0, charCount: 0 },
  );
}

function syncSessionDerivedState(session: ChatSession) {
  session.stat = calculateSessionStat(session.messages);
  session.lastSummarizeIndex = Math.min(
    session.lastSummarizeIndex ?? 0,
    session.messages.length,
  );

  const clearContextIndex = session.messages.reduce<number | undefined>(
    (index, message, i) => (message.beClear ? i + 1 : index),
    undefined,
  );
  session.clearContextIndex = clearContextIndex;
  session.lastUpdate = Date.now();
}

function cleanupDeletedMessageRuntimeState(
  session: ChatSession,
  deletedMessageIds: string[],
) {
  deletedMessageIds.forEach((id) => {
    ChatControllerPool.stop(session.id, id);
    ChatControllerPool.remove(session.id, id);
  });
}

function resetMemoryIfDeletedSummarizedMessages(
  session: ChatSession,
  activeMessagesBeforeDelete: ChatMessage[],
  deletedMessageIds: string[],
) {
  if (!session.memoryPrompt || !session.lastSummarizeIndex) return;

  const deletedMessageIdSet = new Set(deletedMessageIds);
  const firstDeletedActiveIndex = activeMessagesBeforeDelete.findIndex(
    (message) => deletedMessageIdSet.has(message.id),
  );
  if (
    firstDeletedActiveIndex >= 0 &&
    firstDeletedActiveIndex < session.lastSummarizeIndex
  ) {
    session.memoryPrompt = "";
    session.lastSummarizeIndex = 0;
  }
}

export function estimateMessageTokenInLLM(message: RequestMessage) {
  if (typeof message.content === "string") {
    return estimateTokenLengthInLLM(message.content);
  }
  let total_tokens = 0;
  for (const c of message.content) {
    if (c.type === "text" && c.text) {
      total_tokens += estimateTokenLengthInLLM(c.text);
    } else if (c.type === "file_url" && c.file_url?.url) {
      total_tokens +=
        c.file_url?.tokenCount || estimateTokenLengthInLLM(c.file_url?.url);
    } else if (c.type === "image_url") {
      // todo
    }
  }
  return total_tokens;
}

function fillTemplateWith(input: string, modelConfig: ModelConfig) {
  const cutoff =
    KnowledgeCutOffDate[modelConfig.model] ?? KnowledgeCutOffDate.default;
  // Find the model in the DEFAULT_MODELS array that matches the modelConfig.model
  const modelInfo = DEFAULT_MODELS.find((m) => m.name === modelConfig.model);

  var serviceProvider = "OpenAI";
  if (modelInfo) {
    // TODO: auto detect the providerName from the modelConfig.model

    // Directly use the providerName from the modelInfo
    serviceProvider = modelInfo.provider.providerName;
  }

  const vars = {
    ServiceProvider: serviceProvider,
    cutoff,
    model: modelConfig.model,
    time: new Date().toString(),
    lang: getLang(),
    input: input,
    newline: "\n",
  };

  let output = modelConfig.template ?? DEFAULT_INPUT_TEMPLATE;
  // avoid duplicate template
  const templateRegex = createTemplateRegex(output);
  if (templateRegex.test(input)) {
    output = "";
  }
  // must contains {{input}}
  const inputVar = "{{input}}";
  if (!output.includes(inputVar)) {
    output += inputVar;
  }

  Object.entries(vars).forEach(([name, value]) => {
    const regex = new RegExp(`{{${name}}}`, "g");
    output = output.replace(regex, value.toString()); // Ensure value is a string
  });
  return output;
}

const DEFAULT_CHAT_STATE = {
  sessions: [createEmptySession()],
  currentSessionIndex: 0,
  lastInput: "",
};

export function getCompressModel() {
  const compressModel = useAccessStore.getState().compressModel; // 直接访问状态
  return compressModel;
}

export const useChatStore = createPersistStore(
  DEFAULT_CHAT_STATE,
  (set, _get) => {
    function get() {
      return {
        ..._get(),
        ...methods,
      };
    }

    const methods = {
      forkSession() {
        // 获取当前会话
        const currentSession = get().currentSession();
        if (!currentSession) return;

        const newSession = createEmptySession();

        newSession.topic = currentSession.topic;
        newSession.enableMessageTree = !!currentSession.enableMessageTree;
        // 深拷贝消息
        newSession.messages = currentSession.messages.map((msg) => ({
          ...msg,
          id: nanoid(), // 生成新的消息 ID
          parentId: undefined,
          childrenIds: [],
          activeChildId: undefined,
          turnId: undefined,
          originId: undefined,
          branchKind: "normal",
        }));
        rebuildMessageTreeFromMessages(newSession);
        newSession.mask = {
          ...currentSession.mask,
          modelConfig: {
            ...currentSession.mask.modelConfig,
          },
        };

        set((state) => ({
          currentSessionIndex: 0,
          sessions: [newSession, ...state.sessions],
        }));
      },

      clearSessions() {
        set(() => ({
          sessions: [createEmptySession()],
          currentSessionIndex: 0,
          lastInput: "",
        }));
      },

      selectSession(index: number) {
        set({
          currentSessionIndex: index,
        });
      },

      moveSession(from: number, to: number) {
        set((state) => {
          const { sessions, currentSessionIndex: oldIndex } = state;

          // move the session
          const newSessions = [...sessions];
          const session = newSessions[from];
          newSessions.splice(from, 1);
          newSessions.splice(to, 0, session);

          // modify current session id
          let newIndex = oldIndex === from ? to : oldIndex;
          if (oldIndex > from && oldIndex <= to) {
            newIndex -= 1;
          } else if (oldIndex < from && oldIndex >= to) {
            newIndex += 1;
          }

          return {
            currentSessionIndex: newIndex,
            sessions: newSessions,
          };
        });
      },

      newSession(mask?: Mask, privateMode?: boolean) {
        const session = createEmptySession();

        if (mask) {
          const config = useAppConfig.getState();
          const globalModelConfig = config.modelConfig;

          session.mask = {
            ...mask,
            modelConfig: {
              ...globalModelConfig,
              ...mask.modelConfig,
            },
          };
          session.topic = mask.name;
        }
        if (privateMode) {
          session.inPrivateMode = privateMode;
          session.topic = Locale.Store.PrivateTopic;
        }

        set((state) => ({
          currentSessionIndex: 0,
          sessions: [session].concat(state.sessions),
        }));
      },

      nextSession(delta: number) {
        const n = get().sessions.length;
        const limit = (x: number) => (x + n) % n;
        const i = get().currentSessionIndex;
        get().selectSession(limit(i + delta));
      },

      deleteSession(index: number) {
        const deletingLastSession = get().sessions.length === 1;
        const deletedSession = get().sessions.at(index);

        if (!deletedSession) return;

        const sessions = get().sessions.slice();
        sessions.splice(index, 1);

        const currentIndex = get().currentSessionIndex;
        let nextIndex = Math.min(
          currentIndex - Number(index < currentIndex),
          sessions.length - 1,
        );

        if (deletingLastSession) {
          nextIndex = 0;
          sessions.push(createEmptySession());
        }

        // for undo delete action
        const restoreState = {
          currentSessionIndex: get().currentSessionIndex,
          sessions: get().sessions.slice(),
        };

        set(() => ({
          currentSessionIndex: nextIndex,
          sessions,
        }));

        showToast(
          Locale.Home.DeleteToast,
          {
            text: Locale.Home.Revert,
            onClick() {
              set(() => restoreState);
            },
          },
          5000,
        );
      },

      // 添加置顶会话的方法
      pinSession(index: number) {
        set((state) => {
          const sessions = [...state.sessions];
          const session = sessions[index];
          if (session) {
            session.pinned = true;
            session.lastUpdate = Date.now(); // 更新时间戳以触发UI更新
          }
          return {
            sessions,
          };
        });
      },

      // 取消置顶会话的方法
      unpinSession(index: number) {
        set((state) => {
          const sessions = [...state.sessions];
          const session = sessions[index];
          if (session) {
            session.pinned = false;
            session.lastUpdate = Date.now(); // 更新时间戳以触发UI更新
          }
          return {
            sessions,
          };
        });
      },

      currentSession() {
        let index = get().currentSessionIndex;
        const sessions = get().sessions;

        if (index < 0 || index >= sessions.length) {
          index = Math.min(sessions.length - 1, Math.max(0, index));
          set(() => ({ currentSessionIndex: index }));
        }

        const session = sessions[index];
        ensureMessageTree(session);
        if (session.enableMessageTree && session.dualModelMode) {
          session.dualModelMode = false;
        }

        return session;
      },

      onNewMessage(message: ChatMessage, targetSession: ChatSession) {
        get().updateTargetSession(targetSession, (session) => {
          syncMessagesFromTree(session);
          session.messages = session.messages.concat();
          session.lastUpdate = Date.now();
        });
        get().updateStat(message);
        get().summarizeSession(false, targetSession);
      },

      async onUserInput(
        content: string,
        attachImages?: string[],
        attachFiles?: UploadFile[],
        isContinuePrompt?: boolean,
        quote?: {
          text: string;
          messageId: string;
          messageIndex: number;
          startOffset?: number;
          endOffset?: number;
        },
        branchParentId?: string | null,
      ) {
        if (branchParentId !== undefined) {
          get().updateCurrentSession((session) => {
            session.enableMessageTree = true;
            activateMessagePath(session, branchParentId, { truncate: true });
          });
        }

        const session = get().currentSession();
        const modelConfig = session.mask.modelConfig;

        const userContent = fillTemplateWith(content, modelConfig);
        // console.log("[User Input] after template: ", userContent);

        // 构建发送给 AI 的内容（包含引用前缀）
        let userContentForAI = userContent;
        if (quote) {
          const quotedText = quote.text
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n");
          userContentForAI = `${quotedText}\n\n${userContent}`;
        }

        let mContent: string | MultimodalContent[] = userContentForAI;
        let displayContent: string | MultimodalContent[] = userContent;

        const hasImages = attachImages && attachImages.length > 0;
        const hasFiles = attachFiles && attachFiles.length > 0;
        const hasAttachments = hasImages || hasFiles;
        if (hasAttachments) {
          // 如果有任何附件，内容必须是多模态部分组成的数组
          const mContentParts: MultimodalContent[] = [];
          const displayContentParts: MultimodalContent[] = [
            { type: "text", text: userContent },
          ];

          // Part 1: 文件部分 (Files)
          let mContentText = userContentForAI;
          if (hasFiles) {
            let fileHeaderText = "";
            // 处理每个文件，按照模板格式构建内容
            // 遵循deepseek-ai推荐模板：https://github.com/deepseek-ai/DeepSeek-R1?tab=readme-ov-file#official-prompts
            for (const file of attachFiles!) {
              const curFileContent = await readFileContent(file);
              if (curFileContent) {
                fileHeaderText += `[file name]: ${file.name}\n`;
                fileHeaderText += `[file content begin]\n`;
                fileHeaderText += curFileContent;
                fileHeaderText += `\n[file content end]\n`;
              }
            }
            mContentText = fileHeaderText + userContentForAI;

            // 对于UI展示，文件以结构化对象的形式存在
            displayContentParts.push(
              ...attachFiles!.map((file) => ({
                type: "file_url" as const,
                file_url: {
                  url: file.url,
                  name: file.name,
                  contentType: file.contentType,
                  size: file.size,
                  tokenCount: file.tokenCount,
                },
              })),
            );
          }

          // 发送给模型的文本部分（可能已包含文件内容）必须是第一个部分
          mContentParts.push({ type: "text", text: mContentText });

          // Part 2: 图片部分 (Images)
          if (hasImages) {
            const imageParts: MultimodalContent[] = attachImages!.map(
              (url) => ({
                type: "image_url" as const,
                image_url: { url },
              }),
            );
            // 图片部分同时添加到模型入参和UI展示内容中
            mContentParts.push(...imageParts);
            displayContentParts.push(...imageParts);
          }

          mContent = mContentParts;
          displayContent = displayContentParts;
        }

        let userMessage: ChatMessage = createMessage({
          role: "user",
          content: mContent,
          isContinuePrompt: isContinuePrompt,
          quote: quote,
          branchKind: branchParentId !== undefined ? "retry" : "normal",
          statistic: {
            // singlePromptTokens: totalTokens ?? 0,
          },
        });
        userMessage.turnId = userMessage.turnId ?? userMessage.id;
        if (userMessage.statistic) {
          userMessage.statistic.singlePromptTokens =
            estimateMessageTokenInLLM(userMessage);
        }

        const botMessage: ChatMessage = createMessage({
          role: "assistant",
          streaming: true,
          model: modelConfig.model,
          providerName: modelConfig.providerName || "OpenAI",
          turnId: userMessage.turnId,
          branchKind: userMessage.branchKind,
        });

        // get recent messages
        const recentMessages = get().getMessagesWithMemory();
        const sendMessages = recentMessages.concat(userMessage);
        const messageIndex = get().currentSession().messages.length + 1;

        // 双模型模式：在保存消息之前获取副模型的历史消息（与主模型逻辑一致）
        let secondaryRecentMessages: ChatMessage[] = [];
        let secondaryUserMessage: ChatMessage | null = null;
        let secondaryBotMessage: ChatMessage | null = null;
        if (session.dualModelMode && session.secondaryModelConfig) {
          secondaryRecentMessages = get().getSecondaryMessagesWithMemory();
          secondaryUserMessage = {
            ...userMessage,
            id: nanoid(),
            content: displayContent,
            modelSource: "secondary" as const,
          };
          secondaryUserMessage.turnId = secondaryUserMessage.id;
          secondaryBotMessage = createMessage({
            role: "assistant",
            streaming: true,
            model: session.secondaryModelConfig.model,
            providerName: session.secondaryModelConfig.providerName,
            displayName: session.secondaryModelConfig.displayName,
            modelSource: "secondary",
            turnId: secondaryUserMessage.turnId,
            branchKind: secondaryUserMessage.branchKind,
          });
        }

        // save user's and bot's message
        get().updateCurrentSession((session) => {
          // 存储在会话中的用户消息使用 displayContent，以支持富文本渲染
          const savedUserMessage = {
            ...userMessage,
            //content: mContent,
            content: displayContent,
            modelSource: "primary" as const,
          };
          appendMessagesToActivePath(session, [savedUserMessage, botMessage]);

          // 双模型模式：同时保存到副模型消息队列
          if (
            session.dualModelMode &&
            session.secondaryModelConfig &&
            secondaryUserMessage &&
            secondaryBotMessage
          ) {
            session.secondaryMessages = (
              session.secondaryMessages || []
            ).concat([secondaryUserMessage, secondaryBotMessage]);
          }
        });

        const api: ClientApi = getClientApi(modelConfig.providerName);

        // make request
        api.llm.chat({
          messages: sendMessages,
          config: { ...modelConfig, stream: true },
          onUpdate(message) {
            botMessage.streaming = true;
            if (message) {
              botMessage.content = message;
            }
            get().updateCurrentSession((session) => {
              session.messages = session.messages.concat();
            });
          },
          onFinish(message) {
            botMessage.streaming = false;
            if (message) {
              botMessage.content =
                typeof message === "string" ? message : message.content;
              if (typeof message !== "string") {
                if (!botMessage.statistic) {
                  botMessage.statistic = {};
                }
                botMessage.isStreamRequest = !!message?.is_stream_request;
                botMessage.statistic.completionTokens =
                  message?.usage?.completion_tokens;
                botMessage.statistic.firstReplyLatency =
                  message?.usage?.first_content_latency;
                botMessage.statistic.totalReplyLatency =
                  message?.usage?.total_latency;
                botMessage.statistic.reasoningLatency =
                  message?.usage?.thinking_time;
                botMessage.statistic.searchingLatency =
                  message?.usage?.searching_time;
              }
              botMessage.date = new Date().toLocaleString();
              get().onNewMessage(botMessage, session);
            }
            ChatControllerPool.remove(session.id, botMessage.id);
          },
          onError(error) {
            const isAborted = error.message?.includes?.("aborted");
            botMessage.content +=
              "\n\n" +
              prettyObject({
                error: true,
                message: error.message,
              });
            botMessage.streaming = false;
            userMessage.isError = !isAborted;
            botMessage.isError = !isAborted;
            get().updateCurrentSession((session) => {
              session.messages = session.messages.concat();
            });
            ChatControllerPool.remove(
              session.id,
              botMessage.id ?? messageIndex,
            );

            console.error("[Chat] failed ", error);
          },
          onController(controller) {
            // collect controller for stop/retry
            ChatControllerPool.addController(
              session.id,
              botMessage.id ?? messageIndex,
              controller,
            );
          },
        });

        // 双模型模式：同时发送请求到副模型
        if (
          session.dualModelMode &&
          session.secondaryModelConfig &&
          secondaryBotMessage &&
          secondaryUserMessage
        ) {
          const secondaryModelConfig = session.secondaryModelConfig;
          const primaryConfig = session.mask.modelConfig;
          const secondaryApi: ClientApi = getClientApi(
            secondaryModelConfig.providerName,
          );

          // 使用之前获取的历史消息，并添加用户消息（与主模型逻辑一致）
          const secondarySendMessages =
            secondaryRecentMessages.concat(secondaryUserMessage);

          // 构建副模型的完整配置，使用副模型配置覆盖主模型配置
          const secondaryFullConfig = {
            ...primaryConfig,
            model: secondaryModelConfig.model,
            providerName: secondaryModelConfig.providerName,
            // 使用副模型配置，如果没有则回退到主模型配置
            historyMessageCount:
              secondaryModelConfig.historyMessageCount ??
              primaryConfig.historyMessageCount,
            sendMemory:
              secondaryModelConfig.sendMemory ?? primaryConfig.sendMemory,
            compressMessageLengthThreshold:
              secondaryModelConfig.compressMessageLengthThreshold ??
              primaryConfig.compressMessageLengthThreshold,
            temperature:
              secondaryModelConfig.temperature ?? primaryConfig.temperature,
            top_p: secondaryModelConfig.top_p ?? primaryConfig.top_p,
            max_tokens:
              secondaryModelConfig.max_tokens ?? primaryConfig.max_tokens,
            presence_penalty:
              secondaryModelConfig.presence_penalty ??
              primaryConfig.presence_penalty,
            frequency_penalty:
              secondaryModelConfig.frequency_penalty ??
              primaryConfig.frequency_penalty,
            enableInjectSystemPrompts:
              secondaryModelConfig.enableInjectSystemPrompts ??
              primaryConfig.enableInjectSystemPrompts,
            stream: true,
          };

          // 创建局部变量以避免闭包中的 null 检查问题
          const botMsg = secondaryBotMessage;

          secondaryApi.llm.chat({
            messages: secondarySendMessages,
            config: secondaryFullConfig,
            onUpdate(message) {
              botMsg.streaming = true;
              if (message) {
                botMsg.content = message;
              }
              get().updateCurrentSession((session) => {
                session.secondaryMessages = session.secondaryMessages?.concat();
              });
            },
            onFinish(message) {
              botMsg.streaming = false;
              if (message) {
                botMsg.content =
                  typeof message === "string" ? message : message.content;
                if (typeof message !== "string") {
                  if (!botMsg.statistic) {
                    botMsg.statistic = {};
                  }
                  botMsg.isStreamRequest = !!message?.is_stream_request;
                  botMsg.statistic.completionTokens =
                    message?.usage?.completion_tokens;
                  botMsg.statistic.firstReplyLatency =
                    message?.usage?.first_content_latency;
                  botMsg.statistic.totalReplyLatency =
                    message?.usage?.total_latency;
                  botMsg.statistic.reasoningLatency =
                    message?.usage?.thinking_time;
                  botMsg.statistic.searchingLatency =
                    message?.usage?.searching_time;
                }
                botMsg.date = new Date().toLocaleString();
              }
              get().updateCurrentSession((session) => {
                session.secondaryMessages = session.secondaryMessages?.concat();
              });
              ChatControllerPool.remove(`${session.id}-secondary`, botMsg.id);
            },
            onError(error) {
              const isAborted = error.message?.includes?.("aborted");
              botMsg.content +=
                "\n\n" +
                prettyObject({
                  error: true,
                  message: error.message,
                });
              botMsg.streaming = false;
              botMsg.isError = !isAborted;
              get().updateCurrentSession((session) => {
                session.secondaryMessages = session.secondaryMessages?.concat();
              });
              ChatControllerPool.remove(`${session.id}-secondary`, botMsg.id);
              console.error("[Chat] secondary model failed ", error);
            },
            onController(controller) {
              ChatControllerPool.addController(
                `${session.id}-secondary`,
                botMsg.id,
                controller,
              );
            },
          });
        }
      },

      getMemoryPrompt() {
        const session = get().currentSession();

        if (session.memoryPrompt.length) {
          return {
            role: "system",
            content: Locale.Store.Prompt.History(session.memoryPrompt),
            date: "",
          } as ChatMessage;
        }
      },

      getMessagesWithMemory() {
        const session = get().currentSession();
        const modelConfig = session.mask.modelConfig;
        const messages = session.messages.slice();
        const totalMessageCount = session.messages.length;

        let clearContextIndex = session.clearContextIndex ?? 0;
        for (let i = totalMessageCount - 1; i >= 0; i--) {
          if (messages[i].beClear === true) {
            // 找到带有 beClear 标记的消息，更新 clearContextIndex
            // +1 是因为我们需要从这条消息之后开始包含消息
            clearContextIndex = i + 1;
            break;
          }
        }

        // in-context prompts
        const contextPrompts = session.mask.context.slice();

        // system prompts, to get close to OpenAI Web ChatGPT
        const shouldInjectSystemPrompts =
          modelConfig.enableInjectSystemPrompts &&
          !isImageGenerationModel(modelConfig.model);
        // && (session.mask.modelConfig.model.startsWith("gpt-") ||
        //   session.mask.modelConfig.model.startsWith("chatgpt-"));

        var systemPrompts: ChatMessage[] = [];
        systemPrompts = shouldInjectSystemPrompts
          ? [
              createMessage({
                role: "system",
                content: fillTemplateWith("", {
                  ...modelConfig,
                  template: DEFAULT_SYSTEM_TEMPLATE,
                }),
              }),
            ]
          : [];
        if (shouldInjectSystemPrompts) {
          // console.log(
          //   "[Global System Prompt] ",
          //   systemPrompts.at(0)?.content ?? "empty",
          // );
          console.log("[System Prompt Injected]");
        }
        const memoryPrompt = get().getMemoryPrompt();
        // long term memory
        const shouldSendLongTermMemory =
          modelConfig.sendMemory &&
          session.memoryPrompt &&
          session.memoryPrompt.length > 0 &&
          session.lastSummarizeIndex > clearContextIndex;
        const longTermMemoryPrompts =
          shouldSendLongTermMemory && memoryPrompt ? [memoryPrompt] : [];
        const longTermMemoryStartIndex = session.lastSummarizeIndex;

        // short term memory
        const shortTermMemoryStartIndex = Math.max(
          0,
          totalMessageCount - modelConfig.historyMessageCount,
        );

        // lets concat send messages, including 4 parts:
        // 0. system prompt: to get close to OpenAI Web ChatGPT
        // 1. long term memory: summarized memory messages
        // 2. pre-defined in-context prompts
        // 3. short term memory: latest n messages
        // 4. newest input message
        const memoryStartIndex = shouldSendLongTermMemory
          ? Math.min(longTermMemoryStartIndex, shortTermMemoryStartIndex)
          : shortTermMemoryStartIndex;
        // and if user has cleared history messages, we should exclude the memory too.
        const contextStartIndex = Math.max(clearContextIndex, memoryStartIndex);
        const maxTokenThreshold = modelConfig.max_tokens;

        // get recent messages as much as possible
        const reversedRecentMessages = [];
        for (
          let i = totalMessageCount - 1, tokenCount = 0;
          i >= contextStartIndex; // && tokenCount < maxTokenThreshold;
          i -= 1
        ) {
          const msg = messages[i];
          if (!msg || msg.isError) continue;

          // 如果消息包含引用字段，构建发送给 AI 的消息内容
          let msgContent = getMessageTextContent(msg);
          if (msg.quote) {
            const quotedText = msg.quote.text
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n");
            msgContent = `${quotedText}\n\n${msgContent}`;
          }

          // 创建发送给 AI 的消息对象（不包含 quote 字段，只包含处理后的内容）
          const sendMessage: ChatMessage = {
            ...msg,
            content: msgContent,
          };
          // 删除 quote 字段，因为已经合并到内容中了
          delete (sendMessage as any).quote;

          tokenCount += estimateTokenLengthInLLM(msgContent);
          reversedRecentMessages.push(sendMessage);
        }
        // concat all messages
        const recentMessages = [
          ...systemPrompts,
          ...longTermMemoryPrompts,
          ...contextPrompts,
          ...reversedRecentMessages.reverse(),
        ];

        return recentMessages;
      },

      updateMessage(
        sessionIndex: number,
        messageIndex: number,
        updater: (message?: ChatMessage) => void,
      ) {
        const sessions = get().sessions;
        const session = sessions.at(sessionIndex);
        const messages = session?.messages;
        const message = messages?.at(messageIndex);

        // 保存更新前的消息内容
        const oldContent = message ? getMessageTextContent(message) : "";

        // 应用更新
        updater(message);

        const newContent = message ? getMessageTextContent(message) : "";

        // 如果是消息内容已更改，更新token计数
        if (message && newContent !== oldContent) {
          if (!message.statistic) {
            message.statistic = {};
          }
          if (message.role === "assistant") {
            message.statistic.completionTokens =
              estimateMessageTokenInLLM(message);
          } else {
            message.statistic.singlePromptTokens =
              estimateMessageTokenInLLM(message);
          }
        }
        set(() => ({ sessions }));
      },

      switchMessageBranch(messageId: string, delta: number) {
        get().updateCurrentSession((session) => {
          if (!session.enableMessageTree) return;
          switchMessageBranchInSession(session, messageId, delta);
        });
      },

      resetSession() {
        get().updateCurrentSession((session) => {
          session.messages = [];
          session.enableMessageTree = false;
          session.messageTree = {};
          session.rootMessageIds = [];
          session.activeRootId = undefined;
          session.memoryPrompt = "";
          session.secondaryClearContextIndex = undefined;
        });
      },

      summarizeSession(
        refreshTitle: boolean = false,
        targetSession: ChatSession,
      ) {
        const access = useAccessStore.getState();
        const config = useAppConfig.getState();
        const session = targetSession;

        const modelConfig = session.mask.modelConfig;
        let compressModel = modelConfig.compressModel;
        let providerName = modelConfig.compressProviderName;
        // console.log("[Summarize] ", compressModel)
        if ((!compressModel || !providerName) && access.compressModel) {
          let providerNameStr;
          [compressModel, providerNameStr] =
            access.compressModel.split(/@(?=[^@]*$)/);
          providerName = providerNameStr as ServiceProvider;
        }
        // console.log("[Summarize] ", compressModel)

        const api: ClientApi = getClientApi(providerName);

        // remove error messages if any
        const messages = session.messages;
        let clearContextIndex = session.clearContextIndex ?? 0;

        // should summarize topic after chating more than 50 words
        const SUMMARIZE_MIN_LEN = 50;
        if (
          (config.enableAutoGenerateTitle &&
            session.topic === DEFAULT_TOPIC &&
            countMessages(messages) >= SUMMARIZE_MIN_LEN) ||
          refreshTitle
        ) {
          const totalMessageCount = session.messages.length;
          for (let i = totalMessageCount - 1; i >= 0; i--) {
            if (session.messages[i].beClear === true) {
              clearContextIndex = i + 1;
              break;
            }
          }
          const startIndex = Math.max(
            0,
            clearContextIndex,
            messages.length - modelConfig.historyMessageCount,
          );
          const topicMessages = messages
            .slice(
              startIndex < messages.length ? startIndex : messages.length - 1,
              messages.length,
            )
            .concat(
              createMessage({
                role: "user",
                content: Locale.Store.Prompt.Topic,
              }),
            )
            .map((v) => {
              let msgContent =
                v.role === "assistant"
                  ? getMessageTextContentWithoutThinking(v)
                  : getMessageTextContent(v);

              // 如果消息包含引用字段，将引用内容添加到消息前面
              if (v.quote) {
                const quotedText = v.quote.text
                  .split("\n")
                  .map((line) => `> ${line}`)
                  .join("\n");
                msgContent = `${quotedText}\n\n${msgContent}`;
              }

              return {
                ...v,
                content: msgContent,
              };
            });
          api.llm.chat({
            messages: topicMessages,
            config: {
              model: compressModel,
              stream: false,
            },
            type: "topic",
            onFinish(message, responseRes) {
              if (responseRes?.status === 200) {
                const replyContent = getResponseContentWithoutThinking(message);
                if (!isValidMessage(replyContent)) {
                  showToast(Locale.Chat.Actions.FailTitleToast);
                  return;
                }
                get().updateTargetSession(
                  session,
                  (session) =>
                    (session.topic =
                      replyContent.length > 0
                        ? trimTopic(replyContent)
                        : DEFAULT_TOPIC),
                );
              }
            },
          });
        }
        const summarizeIndex = Math.max(
          session.lastSummarizeIndex,
          clearContextIndex,
        );
        let toBeSummarizedMsgs = messages
          .filter((msg) => !msg.isError)
          .slice(summarizeIndex);

        const historyMsgLength = countMessages(toBeSummarizedMsgs);

        if (historyMsgLength > (modelConfig?.max_tokens || 4000)) {
          const n = toBeSummarizedMsgs.length;
          toBeSummarizedMsgs = toBeSummarizedMsgs.slice(
            Math.max(0, n - modelConfig.historyMessageCount),
          );
        }
        const memoryPrompt = get().getMemoryPrompt();
        if (memoryPrompt) {
          // add memory prompt
          toBeSummarizedMsgs.unshift(memoryPrompt);
        }

        const lastSummarizeIndex = session.messages.length;

        // console.log(
        //   "[Chat History] ",
        //   toBeSummarizedMsgs,
        //   historyMsgLength,
        //   modelConfig.compressMessageLengthThreshold,
        // );

        if (
          historyMsgLength > modelConfig.compressMessageLengthThreshold &&
          modelConfig.sendMemory
        ) {
          /** Destruct max_tokens while summarizing
           * this param is just shit
           **/
          const { max_tokens, ...modelcfg } = modelConfig;
          api.llm.chat({
            messages: toBeSummarizedMsgs
              .concat(
                createMessage({
                  role: "user",
                  content: Locale.Store.Prompt.Summarize,
                  date: "",
                }),
              )
              .map((v) => {
                let msgContent =
                  v.role === "assistant"
                    ? getMessageTextContentWithoutThinking(v)
                    : getMessageTextContent(v);

                // 如果消息包含引用字段，将引用内容添加到消息前面
                if (v.quote) {
                  const quotedText = v.quote.text
                    .split("\n")
                    .map((line) => `> ${line}`)
                    .join("\n");
                  msgContent = `${quotedText}\n\n${msgContent}`;
                }

                return {
                  ...v,
                  content: msgContent,
                };
              }),
            config: {
              // ...modelcfg,
              stream: true,
              model: compressModel,
            },
            type: "compress",
            onUpdate(message) {
              session.memoryPrompt =
                getMessageTextContentWithoutThinkingFromContent(message);
            },
            onFinish(message, responseRes) {
              if (responseRes?.status === 200) {
                console.log("[Memory] ", message);
                const replyContent = getResponseContentWithoutThinking(message);
                if (!isValidMessage(replyContent)) {
                  return;
                }
                get().updateTargetSession(session, (session) => {
                  session.lastSummarizeIndex = lastSummarizeIndex;
                  session.memoryPrompt = replyContent; // Update the memory prompt for stored it in local storage
                });
              }
            },
            onError(err) {
              console.error("[Summarize] ", err);
            },
          });
        }
        function isValidMessage(message: any): boolean {
          if (typeof message !== "string") {
            return false;
          }
          message = message.trim();
          if (message.length === 0) {
            return false;
          }
          if (message.startsWith("```") && message.endsWith("```")) {
            // 提取包裹的内容
            const jsonString = message.slice(3, -3).trim(); // 去掉开头和结尾的 ```

            try {
              // 解析 JSON
              const jsonObject = JSON.parse(jsonString);

              // 检查是否存在 error 字段
              if (jsonObject.error) {
                return false;
              }
            } catch (e) {
              console.log("Invalid JSON format.");
            }
          }
          return !message.startsWith("```json");
        }
      },

      updateStat(message: ChatMessage) {
        get().updateCurrentSession((session) => {
          const contentText =
            typeof message.content === "string"
              ? message.content
              : getMessageTextContent(message);
          session.stat.charCount += contentText.length;
          session.stat.tokenCount += estimateMessageTokenInLLM(message);
          // TODO: should update chat count and word count
        });
      },

      updateCurrentSession(updater: (session: ChatSession) => void) {
        const sessions = get().sessions;
        const index = get().currentSessionIndex;
        ensureMessageTree(sessions[index]);
        updater(sessions[index]);
        set(() => ({ sessions }));
      },

      updateSession(index: number, updater: (session: ChatSession) => void) {
        const sessions = get().sessions;
        if (index < 0 || index >= sessions.length) return;
        ensureMessageTree(sessions[index]);
        updater(sessions[index]);
        set(() => ({ sessions }));
      },

      updateTargetSession(
        targetSession: ChatSession,
        updater: (session: ChatSession) => void,
      ) {
        const sessions = get().sessions;
        const index = sessions.findIndex((s) => s.id === targetSession.id);
        if (index < 0) return;
        ensureMessageTree(sessions[index]);
        // Save message content before updates to compare later
        const messagesBeforeUpdate = sessions[index].messages.map((m) => ({
          id: m.id,
          content:
            typeof m.content === "string"
              ? m.content
              : getMessageTextContent(m),
        }));
        updater(sessions[index]);
        // Check if any message content has changed and update token stats
        const updatedSession = sessions[index];
        const messagesAfterUpdate = updatedSession.messages.map((m) =>
          typeof m.content === "string" ? m.content : getMessageTextContent(m),
        );
        // Update token counts for any changed messages
        updatedSession.messages.forEach((message, i) => {
          const beforeMessage = messagesBeforeUpdate[i];
          if (
            beforeMessage &&
            beforeMessage.id === message.id &&
            messagesAfterUpdate[i] !== beforeMessage.content
          ) {
            // Content changed, update token count
            if (!message.statistic) {
              message.statistic = {};
            }

            if (message.role === "assistant") {
              message.statistic.completionTokens =
                estimateMessageTokenInLLM(message);
            } else {
              message.statistic.singlePromptTokens =
                estimateMessageTokenInLLM(message);
            }
          }
        });
        set(() => ({ sessions }));
      },
      async clearAllChatData() {
        indexedDBStorage.removeItem(StoreKey.Chat);
        await indexedDBStorage.flushPending();
        localStorage.removeItem(StoreKey.Chat);
        location.reload();
      },
      async clearAllData() {
        await indexedDBStorage.clear();
        localStorage.clear();
        location.reload();
      },

      // ========== 双模型模式相关方法 ==========
      toggleMessageTreeMode() {
        get().updateCurrentSession((session) => {
          const enableMessageTree = !session.enableMessageTree;

          if (enableMessageTree) {
            session.enableMessageTree = true;
            session.dualModelMode = false;
            ensureMessageTree(session);
            return;
          }

          syncMessagesFromTree(session);
          session.enableMessageTree = false;
          rebuildMessageTreeFromMessages(session);
        });
      },

      toggleDualModelMode(displayName?: string) {
        const session = get().currentSession();
        get().updateCurrentSession((session) => {
          if (session.enableMessageTree) return;

          session.dualModelMode = !session.dualModelMode;

          // 首次开启时初始化副模型配置
          if (session.dualModelMode && !session.secondaryModelConfig) {
            const primaryConfig = session.mask.modelConfig;
            // 只初始化必要的配置（model、providerName）
            // 其他配置不设置，会自动跟随主模型配置
            session.secondaryModelConfig = {
              model: primaryConfig.model,
              providerName: primaryConfig.providerName,
              displayName,
              // 不设置以下配置，让它们跟随主模型
              // historyMessageCount, sendMemory, temperature 等
            };
            session.secondaryMessages = [];
            session.secondaryMemoryPrompt = "";
            session.secondaryLastSummarizeIndex = 0;
          }
        });
      },

      setSecondaryModel(
        model: ModelType,
        providerName: ServiceProvider,
        displayName?: string,
      ) {
        get().updateCurrentSession((session) => {
          const existingConfig = session.secondaryModelConfig;
          // 只更新模型相关配置，保留其他独立配置（如果有的话）
          session.secondaryModelConfig = {
            ...existingConfig,
            model,
            providerName,
            displayName,
          };
        });
      },

      clearSecondaryMessages() {
        get().updateCurrentSession((session) => {
          session.secondaryMessages = [];
          session.secondaryMemoryPrompt = "";
          session.secondaryLastSummarizeIndex = 0;
        });
      },

      // 获取副模型的消息历史（带记忆）
      getSecondaryMessagesWithMemory() {
        const session = get().currentSession();
        const secondaryConfig = session.secondaryModelConfig;
        const primaryConfig = session.mask.modelConfig;
        const messages = session.secondaryMessages?.slice() || [];
        const totalMessageCount = messages.length;

        // 检查 beClear 标记，找到清除上下文的位置
        let clearContextIndex = 0;
        for (let i = totalMessageCount - 1; i >= 0; i--) {
          if (messages[i]?.beClear === true) {
            clearContextIndex = i + 1;
            break;
          }
        }

        // 使用副模型配置，如果没有则回退到主模型配置
        const historyCount =
          secondaryConfig?.historyMessageCount ??
          primaryConfig.historyMessageCount ??
          4;
        const sendMemory =
          secondaryConfig?.sendMemory ?? primaryConfig.sendMemory ?? true;
        const enableInjectSystemPrompts =
          secondaryConfig?.enableInjectSystemPrompts ??
          primaryConfig.enableInjectSystemPrompts ??
          true;

        // 上下文提示词（与主模型共享）
        const contextPrompts = session.mask.context.slice();

        // 系统提示词
        let systemPrompts: ChatMessage[] = [];
        if (
          enableInjectSystemPrompts &&
          secondaryConfig?.model &&
          !isImageGenerationModel(secondaryConfig.model)
        ) {
          systemPrompts = [
            createMessage({
              role: "system",
              content: fillTemplateWith("", {
                ...primaryConfig,
                ...secondaryConfig,
                template: DEFAULT_SYSTEM_TEMPLATE,
              } as ModelConfig),
            }),
          ];
          console.log("[Secondary Model] System Prompt Injected");
        }

        // 长期记忆
        const shouldSendLongTermMemory =
          sendMemory &&
          session.secondaryMemoryPrompt &&
          session.secondaryMemoryPrompt.length > 0 &&
          (session.secondaryLastSummarizeIndex ?? 0) > clearContextIndex;

        const longTermMemoryPrompts: ChatMessage[] = [];
        if (shouldSendLongTermMemory) {
          longTermMemoryPrompts.push(
            createMessage({
              role: "system",
              content: Locale.Store.Prompt.History(
                session.secondaryMemoryPrompt!,
              ),
              date: "",
            }),
          );
        }
        const longTermMemoryStartIndex =
          session.secondaryLastSummarizeIndex ?? 0;

        // 短期记忆
        const shortTermMemoryStartIndex = Math.max(
          0,
          totalMessageCount - historyCount,
        );

        // 计算消息起始索引
        const memoryStartIndex = shouldSendLongTermMemory
          ? Math.min(longTermMemoryStartIndex, shortTermMemoryStartIndex)
          : shortTermMemoryStartIndex;
        const contextStartIndex = Math.max(clearContextIndex, memoryStartIndex);

        // 获取最近的消息
        const reversedRecentMessages: ChatMessage[] = [];
        for (let i = totalMessageCount - 1; i >= contextStartIndex; i -= 1) {
          const msg = messages[i];
          if (!msg || msg.isError) continue;

          // 处理引用字段
          let msgContent = getMessageTextContent(msg);
          if (msg.quote) {
            const quotedText = msg.quote.text
              .split("\n")
              .map((line: string) => `> ${line}`)
              .join("\n");
            msgContent = `${quotedText}\n\n${msgContent}`;
          }

          const sendMessage: ChatMessage = {
            ...msg,
            content: msgContent,
          };
          delete (sendMessage as any).quote;

          reversedRecentMessages.push(sendMessage);
        }

        // 组合所有消息
        const recentMessages = [
          ...systemPrompts,
          ...longTermMemoryPrompts,
          ...contextPrompts,
          ...reversedRecentMessages.reverse(),
        ];

        return recentMessages;
      },

      setLastInput(lastInput: string) {
        set({
          lastInput,
        });
      },
    };

    return methods;
  },
  {
    name: StoreKey.Chat,
    version: 3.8,
    onRehydrateStorage() {
      // 水合完成后做一次自动备份：把 IDB 中的 chat 数据快照写入 localStorage。
      // 用 setTimeout 推到 microtask 之外，避免阻塞首屏渲染。
      return () => {
        setTimeout(() => {
          autoBackupChatToLocalStorage();
        }, 0);
      };
    },
    migrate(persistedState, version) {
      const state = persistedState as any;
      const newState = JSON.parse(
        JSON.stringify(state),
      ) as typeof DEFAULT_CHAT_STATE;

      if (version < 2) {
        newState.sessions = [];

        const oldSessions = state.sessions;
        for (const oldSession of oldSessions) {
          const newSession = createEmptySession();
          newSession.topic = oldSession.topic;
          newSession.messages = [...oldSession.messages];
          newSession.mask.modelConfig.sendMemory = true;
          newSession.mask.modelConfig.historyMessageCount = 10;
          newSession.mask.modelConfig.compressMessageLengthThreshold = 2000;
          newState.sessions.push(newSession);
        }
      }

      if (version < 3) {
        // migrate id to nanoid
        newState.sessions.forEach((s) => {
          s.id = nanoid();
          s.messages.forEach((m) => (m.id = nanoid()));
        });
      }

      // Enable `enableInjectSystemPrompts` attribute for old sessions.
      // Resolve issue of old sessions not automatically enabling.
      if (version < 3.1) {
        newState.sessions.forEach((s) => {
          if (
            // Exclude those already set by user
            !s.mask.modelConfig.hasOwnProperty("enableInjectSystemPrompts")
          ) {
            // Because users may have changed this configuration,
            // the user's current configuration is used instead of the default
            const config = useAppConfig.getState();
            s.mask.modelConfig.enableInjectSystemPrompts =
              config.modelConfig.enableInjectSystemPrompts;
          }
        });
      }

      // add default summarize model for every session
      if (version < 3.2) {
        newState.sessions.forEach((s) => {
          const config = useAppConfig.getState();
          s.mask.modelConfig.compressModel = config.modelConfig.compressModel;
          s.mask.modelConfig.compressProviderName =
            config.modelConfig.compressProviderName;
          // s.mask.modelConfig.translateModel = config.modelConfig.translateModel;
          // s.mask.modelConfig.translateProviderName =
          //   config.modelConfig.translateProviderName;
          // s.mask.modelConfig.ocrModel = config.modelConfig.ocrModel;
          // s.mask.modelConfig.ocrProviderName =
          //   config.modelConfig.ocrProviderName;
        });
      }
      if (version < 3.3) {
        newState.sessions.forEach((s) => {
          // 将旧的 clearContextIndex 转换为新的 beClear 标记
          if (s.clearContextIndex !== undefined && s.clearContextIndex > 0) {
            const index = s.clearContextIndex - 1; // 因为 divider 显示在 clearContextIndex-1 的位置
            if (index >= 0 && index < s.messages.length) {
              s.messages[index].beClear = true;
            }
          }
        });
      }
      // 处理会话置顶功能（pinSession)新增字段的数据迁移
      if (version < 3.4) {
        newState.sessions.forEach((s) => {
          // 为旧数据添加置顶相关字段的默认值
          s.pinned = s.pinned || false;
        });
      }
      if (version < 3.5) {
        newState.sessions.forEach((s) => {
          rebuildMessageTreeFromMessages(s);
        });
      }
      if (version < 3.6) {
        newState.sessions.forEach((s) => {
          s.enableMessageTree =
            s.enableMessageTree ?? hasMessageTreeBranches(s);
        });
      }
      if (version < 3.7) {
        newState.sessions.forEach((s) => {
          if (!hasMessageTreeBranches(s)) {
            s.enableMessageTree = false;
          }
          if (s.enableMessageTree) {
            s.dualModelMode = false;
          }
        });
      }
      if (version < 3.8) {
        newState.sessions.forEach((s) => {
          if (
            s.mask.modelConfig.historyMessageCount === undefined ||
            s.mask.modelConfig.historyMessageCount === 4
          ) {
            s.mask.modelConfig.historyMessageCount = 10;
          }
          if (
            s.mask.modelConfig.compressMessageLengthThreshold === undefined ||
            s.mask.modelConfig.compressMessageLengthThreshold === 1000
          ) {
            s.mask.modelConfig.compressMessageLengthThreshold = 2000;
          }
        });
      }

      return newState as any;
    },
  },
);
