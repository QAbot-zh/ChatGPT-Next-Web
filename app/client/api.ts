import { getClientConfig } from "../config/client";
import {
  ACCESS_CODE_PREFIX,
  ModelProvider,
  ServiceProvider,
  REPO_URL,
  ThinkingType,
} from "../constant";
import {
  ChatMessage,
  ModelType,
  useAccessStore,
  useChatStore,
  useCustomProviderStore,
} from "../store";
import { ChatGPTApi } from "./platforms/openai";
import { GeminiProApi } from "./platforms/google";
import { ClaudeApi } from "./platforms/anthropic";
export const ROLES = ["system", "user", "assistant"] as const;
export type MessageRole = (typeof ROLES)[number];

export const Models = ["gpt-3.5-turbo", "gpt-4"] as const;
export const TTSModels = ["gpt-4o-mini-tts", "tts-1", "tts-1-hd"] as const;
export type ChatModel = ModelType;

export interface MultimodalContent {
  type: "text" | "image_url" | "file_url";
  text?: string;
  image_url?: {
    url: string;
  };
  file_url?: {
    url: string;
    name: string;
    contentType?: string;
    size?: number;
    tokenCount?: number;
  };
}

export interface UploadFile {
  name: string;
  url: string;
  contentType?: string;
  size?: number;
  tokenCount?: number;
}

export interface RequestMessage {
  role: MessageRole;
  content: string | MultimodalContent[];
  reasoning_content?: string;
}

export interface LLMConfig {
  model: string;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  presence_penalty?: number;
  frequency_penalty?: number;
}

export interface SpeechOptions {
  model: string;
  input: string;
  voice: string;
  response_format?: string;
  speed?: number;
  onController?: (controller: AbortController) => void;
}
export interface RichMessage {
  content: string;
  reasoning_content: string;
  thinking_type?: ThinkingType;
  is_stream_request?: boolean;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    first_content_latency?: number;
    thinking_time?: number;
    searching_time?: number;
    total_latency?: number;
  };
}
export interface ChatOptions {
  messages: RequestMessage[];
  config: LLMConfig;
  type?: "chat" | "topic" | "compress" | "translate" | "ocr" | "improve";

  onUpdate?: (message: string, chunk: string, reasoningChunk?: string) => void;
  onFinish: (message: string | RichMessage, responseRes: Response) => void;
  onError?: (err: Error) => void;
  onController?: (controller: AbortController) => void;
}

export interface LLMUsage {
  used: number;
  total: number;
}

export interface LLMModel {
  name: string;
  available: boolean;
  provider: LLMModelProvider;
}

export interface LLMModelProvider {
  id: string;
  providerName: string;
  providerType: string;
}

export abstract class LLMApi {
  abstract chat(options: ChatOptions): Promise<void>;
  abstract speech(options: SpeechOptions): Promise<ArrayBuffer>;
  abstract usage(): Promise<LLMUsage>;
  abstract models(): Promise<LLMModel[]>;
}

type ProviderName = "openai" | "azure" | "claude" | "palm";

// interface Model {
//   name: string;
//   provider: ProviderName;
//   ctxlen: number;
// }

export interface Model {
  available: boolean;
  name: string;
  displayName?: string;
  description?: string;
  provider?: LLMModelProvider;
  isDefault?: boolean;
  enableVision?: boolean;
}

interface ChatProvider {
  name: ProviderName;
  apiConfig: {
    baseUrl: string;
    apiKey: string;
    summaryModel: Model;
  };
  models: Model[];

  chat: () => void;
  usage: () => void;
}

export interface ApiPaths {
  ChatPath?: string;
  ImagePath?: string;
  SpeechPath?: string;
  ListModelPath?: string;
}

export interface userCustomProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  type: string;
  status: "active" | "inactive";
  enableKeyList?: string[];
  disableKeyList?: string[];
  models?: Model[];
  description?: string;
  testModel?: string;
  paths?: ApiPaths;
  useProxy?: boolean; // 是否通过服务器代理转发请求
  balance?: {
    amount: number;
    currency: string;
    lastUpdated?: string;
  };
}

export class ClientApi {
  public llm: LLMApi;
  public readonly providerName: string;

  constructor(
    provider: ModelProvider = ModelProvider.GPT,
    providerName: string = "",
  ) {
    const clientConfig = getClientConfig();
    this.providerName = providerName;
    switch (provider) {
      case ModelProvider.GeminiPro:
        this.llm = new GeminiProApi();
        break;
      case ModelProvider.Claude:
        this.llm = new ClaudeApi();
        break;
      default:
        this.llm = new ChatGPTApi(this.providerName);
    }
  }

  config() {}

  prompts() {}

  masks() {}

  async share(messages: ChatMessage[], avatarUrl: string | null = null) {
    const msgs = messages
      .map((m) => ({
        from: m.role === "user" ? "human" : "gpt",
        value: m.content,
      }))
      .concat([
        {
          from: "human",
          value: `Share from [NextChat]: ${REPO_URL}`,
        },
      ]);
    // 敬告二开开发者们，为了开源大模型的发展，请不要修改上述消息，此消息用于后续数据清洗使用
    // Please do not modify this message

    console.log("[Share]", messages, msgs);
    const clientConfig = getClientConfig();
    const proxyUrl = "/sharegpt";
    const rawUrl = "https://sharegpt.com/api/conversations";
    const shareUrl = clientConfig?.isApp ? rawUrl : proxyUrl;
    const res = await fetch(shareUrl, {
      body: JSON.stringify({
        avatarUrl,
        items: msgs,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const resJson = await res.json();
    console.log("[Share]", resJson);
    if (resJson.id) {
      return `https://shareg.pt/${resJson.id}`;
    }
  }
}

/**
 * Finds a custom provider configuration in localStorage by its name.
 * @param providerName The name of the provider to find.
 * @returns The provider configuration object if found and valid, otherwise null.
 */
interface CustomProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  enableKeyList?: string[]; // 可选，启用的 API Key 列表
  paths?: ApiPaths;
  type?: string; // 可选，可能用于区分 Azure 等类型
  useProxy?: boolean; // 可选，是否通过服务器代理转发请求
}
export function findProviderInLocalStorage(
  providerName: string,
): CustomProviderConfig | null {
  if (!providerName) {
    return null; // No provider name to search for
  }
  try {
    const providers = useCustomProviderStore.getState().providers;

    const provider = providers.find(
      (p) =>
        p.name === providerName && // Match name
        typeof p.baseUrl === "string" && // Ensure baseUrl is a string
        p.baseUrl.length > 0 && // Ensure baseUrl is not empty
        typeof p.apiKey === "string" && // Ensure apiKey is a string
        p.apiKey.length > 0, // Ensure apiKey is not empty
    );

    return provider || null; // Return found provider or null
  } catch (error) {
    console.error(
      "[LocalStorage Provider] Error processing custom providers:",
      error,
    );
    return null; // Return null on error
  }
}
function selectApiKey(apiKeyString: string): string {
  if (!apiKeyString) return "";
  // Split the string into an array of keys, removing empty strings
  const keys = apiKeyString
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  // If only one key, return it directly
  if (keys.length <= 1) return apiKeyString.trim();
  // Random selection
  const randomIndex = Math.floor(Math.random() * keys.length);
  return keys[randomIndex];
}
function selectApiKeyFromList(keyList: string[]): string {
  if (!Array.isArray(keyList)) return "";

  // 如果没有可用 key，返回空字符串
  if (keyList.length === 0) return "";

  // 如果只有一个 key，直接返回
  if (keyList.length === 1) return keyList[0];

  // 随机选择一个 key 返回
  const randomIndex = Math.floor(Math.random() * keyList.length);
  return keyList[randomIndex];
}
export function getHeaders(
  ignoreHeaders: boolean = false,
  api_key: string = "",
  enableKeyList: string[] = [],
) {
  const accessStore = useAccessStore.getState();
  const chatStore = useChatStore.getState();
  let headers: Record<string, string> = {};
  if (!ignoreHeaders) {
    headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }
  const modelConfig = chatStore.currentSession().mask.modelConfig;
  const isGoogle = modelConfig.providerName === ServiceProvider.Google;
  const isAzure = accessStore.provider === ServiceProvider.Azure;
  const authHeader = isAzure ? "api-key" : "Authorization";
  const apiKey =
    enableKeyList.length > 0
      ? selectApiKeyFromList(enableKeyList)
      : api_key
      ? selectApiKey(api_key)
      : isGoogle
      ? accessStore.googleApiKey
      : isAzure
      ? accessStore.azureApiKey
      : accessStore.openaiApiKey;
  const clientConfig = getClientConfig();
  const makeBearer = (s: string) => `${isAzure ? "" : "Bearer "}${s.trim()}`;
  const validString = (x: string) => x && x.length > 0;

  // when using google api in app, not set auth header
  if (!(isGoogle && clientConfig?.isApp)) {
    // use user's api key first
    if (validString(apiKey)) {
      headers[authHeader] = makeBearer(apiKey);
    } else if (
      accessStore.enabledAccessControl() &&
      validString(accessStore.accessCode)
    ) {
      headers[authHeader] = makeBearer(
        ACCESS_CODE_PREFIX + accessStore.accessCode,
      );
    }
  }

  return headers;
}

export function getClientApi(provider: ServiceProvider): ClientApi {
  switch (provider) {
    case ServiceProvider.Google:
      return new ClientApi(ModelProvider.GeminiPro);
    case ServiceProvider.Anthropic:
      return new ClientApi(ModelProvider.Claude);
    default:
      return new ClientApi(ModelProvider.GPT, provider);
  }
}
