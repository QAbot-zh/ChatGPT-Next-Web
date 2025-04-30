import {
  trimTopic,
  getMessageTextContent,
  getMessageTextContentWithoutThinking,
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
import { indexedDBStorage } from "@/app/utils/indexedDB-storage";
import { useAccessStore } from "./access";
import { ServiceProvider } from "../constant";

const localStorage = safeLocalStorage();

export type ChatMessage = RequestMessage & {
  date: string;
  streaming?: boolean;
  isError?: boolean;
  id: string;
  model?: ModelType;
  displayName?: string;
  providerName?: string;
  beClear?: boolean;
  isContinuePrompt?: boolean;
  isStreamRequest?: boolean;

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
    ...override,
  };
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
  messages: ChatMessage[];
  stat: ChatStat;
  lastUpdate: number;
  lastSummarizeIndex: number;
  clearContextIndex?: number;
  inPrivateMode?: boolean;
  pinned?: boolean;

  mask: Mask;
}

export const DEFAULT_TOPIC = Locale.Store.DefaultTopic;
export const BOT_HELLO: ChatMessage = createMessage({
  role: "assistant",
  content: Locale.Store.BotHello,
});

function createEmptySession(): ChatSession {
  return {
    id: nanoid(),
    topic: DEFAULT_TOPIC,
    memoryPrompt: "",
    messages: [],
    stat: {
      tokenCount: 0,
      wordCount: 0,
      charCount: 0,
    },
    lastUpdate: Date.now(),
    lastSummarizeIndex: 0,

    mask: createEmptyMask(),
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
        // 深拷贝消息
        newSession.messages = currentSession.messages.map((msg) => ({
          ...msg,
          id: nanoid(), // 生成新的消息 ID
        }));
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

        return session;
      },

      onNewMessage(message: ChatMessage, targetSession: ChatSession) {
        get().updateTargetSession(targetSession, (session) => {
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
      ) {
        const session = get().currentSession();
        const modelConfig = session.mask.modelConfig;

        const userContent = fillTemplateWith(content, modelConfig);
        // console.log("[User Input] after template: ", userContent);

        let mContent: string | MultimodalContent[] = userContent;
        let displayContent: string | MultimodalContent[] = userContent;
        displayContent = [
          {
            type: "text",
            text: userContent,
          },
        ];
        // 创建一个变量来存储总的token数量
        let totalTokens = 0;

        if (attachFiles && attachFiles.length > 0) {
          let fileContent = "";

          // 处理每个文件，按照模板格式构建内容
          // 遵循deepseek-ai推荐模板：https://github.com/deepseek-ai/DeepSeek-R1?tab=readme-ov-file#official-prompts
          for (let i = 0; i < attachFiles.length; i++) {
            let curFileContent = await readFileContent(attachFiles[i]);
            if (curFileContent) {
              fileContent += `[file name]: ${attachFiles[i].name}\n`;
              fileContent += `[file content begin]\n`;
              fileContent += curFileContent;
              fileContent += `\n[file content end]\n`;
            }
          }
          // 添加用户问题
          fileContent += userContent;
          // totalTokens += estimateTokenLengthInLLM(fileContent);

          mContent = [
            {
              type: "text",
              text: fileContent,
            },
          ];
          displayContent = displayContent.concat(
            attachFiles.map((file) => {
              return {
                type: "file_url",
                file_url: {
                  url: file.url,
                  name: file.name,
                  contentType: file.contentType,
                  size: file.size,
                  tokenCount: file.tokenCount,
                },
              };
            }),
          );

          if (attachImages && attachImages.length > 0) {
            mContent = mContent.concat(
              attachImages.map((url) => {
                return {
                  type: "image_url",
                  image_url: {
                    url: url,
                  },
                };
              }),
            );
            displayContent = displayContent.concat(
              attachImages.map((url) => {
                return {
                  type: "image_url",
                  image_url: {
                    url: url,
                  },
                };
              }),
            );
          }
        } else if (attachImages && attachImages.length > 0) {
          mContent = [
            {
              type: "text",
              text: userContent,
            },
          ];
          // totalTokens += estimateTokenLengthInLLM(userContent);
          mContent = mContent.concat(
            attachImages.map((url) => {
              return {
                type: "image_url",
                image_url: {
                  url: url,
                },
              };
            }),
          );
          displayContent = displayContent.concat(
            attachImages.map((url) => {
              return {
                type: "image_url",
                image_url: {
                  url: url,
                },
              };
            }),
          );
        } else {
          mContent = userContent;
          displayContent = userContent;
          // totalTokens = estimateTokenLengthInLLM(userContent);
        }
        let userMessage: ChatMessage = createMessage({
          role: "user",
          content: mContent,
          isContinuePrompt: isContinuePrompt,
          statistic: {
            singlePromptTokens: totalTokens ?? 0,
          },
        });
        if (userMessage.statistic) {
          userMessage.statistic.singlePromptTokens =
            estimateMessageTokenInLLM(userMessage);
        }

        const botMessage: ChatMessage = createMessage({
          role: "assistant",
          streaming: true,
          model: modelConfig.model,
          providerName: modelConfig.providerName || "OpenAI",
        });

        // get recent messages
        const recentMessages = get().getMessagesWithMemory();
        const sendMessages = recentMessages.concat(userMessage);
        const messageIndex = get().currentSession().messages.length + 1;

        // save user's and bot's message
        get().updateCurrentSession((session) => {
          const savedUserMessage = {
            ...userMessage,
            //content: mContent,
            content: displayContent,
          };
          session.messages = session.messages.concat([
            savedUserMessage,
            botMessage,
          ]);
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
          (session.mask.modelConfig.model.startsWith("gpt-") ||
            session.mask.modelConfig.model.startsWith("chatgpt-"));

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
          console.log(
            "[Global System Prompt] ",
            systemPrompts.at(0)?.content ?? "empty",
          );
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
          tokenCount += estimateTokenLengthInLLM(getMessageTextContent(msg));
          reversedRecentMessages.push(msg);
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

      resetSession() {
        get().updateCurrentSession((session) => {
          session.messages = [];
          session.memoryPrompt = "";
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
        // console.log("000 compressModel:", compressModel);
        // console.log("providerName: ", providerName);
        if (!providerName && access.compressModel) {
          let providerNameStr;
          [compressModel, providerNameStr] = access.compressModel.split("@");
          providerName = providerNameStr as ServiceProvider;
        }

        // console.log("111 compressModel:", compressModel);
        // console.log("providerName: ", providerName);
        try {
          const storedProvidersData = safeLocalStorage().getItem(
            StoreKey.CustomProvider,
          );
          const providers = storedProvidersData
            ? JSON.parse(storedProvidersData)
            : [];

          const provider = Array.isArray(providers)
            ? providers.find((provider) => provider.name === providerName)
            : null;
          if (provider?.baseUrl && provider?.apiKey) {
            // 使用解构赋值和可选链操作符
            access.useCustomProvider = true;
            access.customProvider_apiKey = provider.apiKey;
            access.customProvider_baseUrl = provider.baseUrl;
            access.customProvider_type = provider.type;
          } else {
            access.useCustomProvider = false;
          }
        } catch (error) {
          console.error("Error processing custom providers:", error);
          access.useCustomProvider = false;
        }
        // console.log("222 compressModel:", compressModel);
        // console.log("providerName: ", providerName);
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
            .map((v) => ({
              ...v,
              content:
                v.role === "assistant"
                  ? getMessageTextContentWithoutThinking(v)
                  : getMessageTextContent(v),
            }));
          api.llm.chat({
            messages: topicMessages,
            config: {
              model: compressModel,
              stream: false,
            },
            type: "topic",
            onFinish(message, responseRes) {
              if (responseRes?.status === 200) {
                let replyContent: string =
                  typeof message === "string" ? message : message.content;
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
              .map((v) => ({
                ...v,
                content:
                  v.role === "assistant"
                    ? getMessageTextContentWithoutThinking(v)
                    : getMessageTextContent(v),
              })),
            config: {
              // ...modelcfg,
              stream: true,
              model: modelConfig.compressModel,
            },
            type: "compress",
            onUpdate(message) {
              session.memoryPrompt = message;
            },
            onFinish(message, responseRes) {
              if (responseRes?.status === 200) {
                console.log("[Memory] ", message);
                let replyContent =
                  typeof message === "string" ? message : message.content;
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
          return typeof message === "string" && !message.startsWith("```json");
        }
      },

      updateStat(message: ChatMessage) {
        get().updateCurrentSession((session) => {
          session.stat.charCount += message.content.length;
          session.stat.tokenCount += estimateMessageTokenInLLM(message);
          // TODO: should update chat count and word count
        });
      },

      updateCurrentSession(updater: (session: ChatSession) => void) {
        const sessions = get().sessions;
        const index = get().currentSessionIndex;
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
        // Save message content before updates to compare later
        const messagesBeforeUpdate = JSON.stringify(
          sessions[index].messages.map((m) =>
            typeof m.content === "string"
              ? m.content
              : getMessageTextContent(m),
          ),
        );
        updater(sessions[index]);
        // Check if any message content has changed and update token stats
        const updatedSession = sessions[index];
        const messagesAfterUpdate = updatedSession.messages.map((m) =>
          typeof m.content === "string" ? m.content : getMessageTextContent(m),
        );
        // Update token counts for any changed messages
        const beforeMessages = JSON.parse(messagesBeforeUpdate);
        updatedSession.messages.forEach((message, i) => {
          if (
            i < beforeMessages.length &&
            messagesAfterUpdate[i] !== beforeMessages[i]
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
        await indexedDBStorage.removeItem(StoreKey.Chat);
        localStorage.removeItem(StoreKey.Chat);
        location.reload();
      },
      async clearAllData() {
        await indexedDBStorage.clear();
        localStorage.clear();
        location.reload();
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
    version: 3.4,
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
          newSession.mask.modelConfig.historyMessageCount = 4;
          newSession.mask.modelConfig.compressMessageLengthThreshold = 1000;
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

      return newState as any;
    },
  },
);
