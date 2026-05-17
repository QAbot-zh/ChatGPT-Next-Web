"use client";
import {
  ApiPath,
  DEFAULT_API_HOST,
  DEFAULT_MODELS,
  OpenaiPath,
  REQUEST_TIMEOUT_MS,
  AUX_REQUEST_TIMEOUT_MS,
  STREAM_IDLE_TIMEOUT_MS,
  THINKING_MODEL_TIMEOUT_CAP_MS,
  ServiceProvider,
  ThinkingType,
  ThinkingTypeMap,
} from "@/app/constant";
import { useAccessStore, useAppConfig, useChatStore } from "@/app/store";

import {
  ChatOptions,
  getHeaders,
  LLMApi,
  LLMModel,
  LLMUsage,
  MultimodalContent,
  SpeechOptions,
  RichMessage,
  findProviderInLocalStorage,
} from "../api";
import Locale from "../../locales";
import {
  EventStreamContentType,
  fetchEventSource,
} from "@fortaine/fetch-event-source";
import { prettyObject } from "@/app/utils/format";
import { getClientConfig } from "@/app/config/client";
import { makeAzurePath } from "@/app/azure";
import {
  isImageGenerationModel,
  isThinkingModel,
  wrapThinkingPart,
} from "@/app/utils";
import { preProcessMultimodalContent } from "@/app/utils/chat";
import { estimateTokenLengthInLLM } from "@/app/utils/token";
import { imageUploadManager } from "@/app/utils/image-upload";

export interface OpenAIListModelResponse {
  object: string;
  data: Array<{
    id: string;
    object: string;
    root: string;
  }>;
}

interface RequestPayload {
  messages: {
    role: "system" | "user" | "assistant";
    content: string | MultimodalContent[];
  }[];
  stream?: boolean;
  model: string;
  temperature?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  reasoning_effort?: string;
  stream_options?: {
    include_usage?: boolean;
  };
}
/**
 * 根据模型名称和配置，解析出对应的额外参数
 * 支持：
 *  1. 精确匹配
 *  2. 前缀通配符（*suffix） / 后缀通配符（prefix*） / 中间通配符（pre*suf）
 *  3. 通用 *
 */
function resolveExtraParams(
  modelName: string,
  paramsConfig: Record<string, any>,
): Record<string, any> {
  if (!paramsConfig) return {};

  // 1. 精确匹配
  if (paramsConfig[modelName]) {
    return { ...paramsConfig[modelName] };
  }

  // 2. 通配符匹配（排除 '*'，后面单独处理）
  for (const pat of Object.keys(paramsConfig).filter((k) => k !== "*")) {
    // 前缀通配符: *suffix
    if (pat.startsWith("*") && modelName.endsWith(pat.slice(1))) {
      return { ...paramsConfig[pat] };
    }
    // 后缀通配符: prefix*
    if (pat.endsWith("*") && modelName.startsWith(pat.slice(0, -1))) {
      return { ...paramsConfig[pat] };
    }
    // 中间通配符: pre*suf
    if (pat.includes("*") && !pat.startsWith("*") && !pat.endsWith("*")) {
      const [pre, suf] = pat.split("*");
      if (modelName.startsWith(pre) && modelName.endsWith(suf)) {
        return { ...paramsConfig[pat] };
      }
    }
  }

  // 3. '*' 兜底
  if (paramsConfig["*"]) {
    return { ...paramsConfig["*"] };
  }

  return {};
}
export class ChatGPTApi implements LLMApi {
  private disableListModels = true;
  private readonly baseUrl: string = "";
  private readonly apiKey: string = "";
  private readonly enableKeyList: string[] = [];
  private readonly chatPath: string = "";
  private readonly imagePath: string = "";
  private readonly speechPath: string = "";
  private readonly listModelPath: string = "";
  private readonly useProxy: boolean = false; // 是否使用服务器代理

  constructor(providerName: string = "") {
    if (providerName) {
      const CustomProviderConfig = findProviderInLocalStorage(providerName);
      if (CustomProviderConfig) {
        this.baseUrl = CustomProviderConfig.baseUrl;
        this.apiKey = CustomProviderConfig.apiKey;
        this.enableKeyList = CustomProviderConfig.enableKeyList || [];
        this.chatPath = CustomProviderConfig?.paths?.ChatPath || "";
        this.imagePath = CustomProviderConfig?.paths?.ImagePath || "";
        this.speechPath = CustomProviderConfig?.paths?.SpeechPath || "";
        this.listModelPath = CustomProviderConfig?.paths?.ListModelPath || "";
        this.useProxy = CustomProviderConfig?.useProxy || false;
      }
    }
  }

  // 获取代理相关的请求头
  private getProxyHeaders(): Record<string, string> {
    if (this.useProxy && this.baseUrl) {
      return { "X-Proxy-Target": this.baseUrl };
    }
    return {};
  }

  path(path: string): string {
    const accessStore = useAccessStore.getState();
    // console.log("[openai.ts] access: ", accessStore);
    let baseUrl = "";
    if (this.baseUrl) {
      // 自定义渠道
      if (this.useProxy) {
        // 使用代理时，返回代理端点 URL
        return `/api/custom-proxy/${path.replace(/^\//, "")}`;
      }
      baseUrl = this.baseUrl;
    } else {
      // if (accessStore.useCustomProvider) {
      //   baseUrl = accessStore.customProvider_baseUrl;
      // } else if (accessStore.useCustomConfig) {
      const isAzure = accessStore.provider === ServiceProvider.Azure;

      if (isAzure && !accessStore.isValidAzure()) {
        throw Error(
          "incomplete azure config, please check it in your settings page",
        );
      }

      if (isAzure) {
        path = makeAzurePath(path, accessStore.azureApiVersion);
      }

      baseUrl = isAzure ? accessStore.azureUrl : accessStore.openaiUrl;
      // }

      if (baseUrl.length === 0) {
        const isApp = !!getClientConfig()?.isApp;
        baseUrl = isApp
          ? DEFAULT_API_HOST + "/proxy" + ApiPath.OpenAI
          : ApiPath.OpenAI;
      }

      if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, baseUrl.length - 1);
      }
      if (!baseUrl.startsWith("http") && !baseUrl.startsWith(ApiPath.OpenAI)) {
        baseUrl = "https://" + baseUrl;
      }
    }

    console.log("[Proxy Endpoint] ", baseUrl, path);

    return [baseUrl.replace(/\/$/, ""), path.replace(/^\//, "")].join("/");
  }

  async extractMessage(res: any) {
    if (res.error) {
      return "```\n" + JSON.stringify(res, null, 4) + "\n```";
    }
    let richMessage: RichMessage = {
      content: "",
      reasoning_content: "",
    };
    richMessage.reasoning_content =
      res.choices?.at(0)?.message?.reasoning_content ||
      res.choices?.at(0)?.message?.reasoning ||
      "";
    let content: string | undefined = res.choices?.at(0)?.message?.content;

    // 非流式下,reasoning_content 字段存在即 ReasoningType;
    // 否则若 content 头部含 <think>,识别为 ThinkType 并拆出
    if (richMessage.reasoning_content) {
      richMessage.thinking_type = ThinkingType.ReasoningType;
    } else if (typeof content === "string" && content.startsWith("<think>")) {
      const m = content.match(/^<think>\n?([\s\S]*?)\n?<\/think>\n*/);
      if (m) {
        richMessage.reasoning_content = m[1];
        content = content.slice(m[0].length);
        richMessage.thinking_type = ThinkingType.ThinkType;
      }
    }
    richMessage.content = content ?? (richMessage.reasoning_content ? "" : res);
    let prompt_tokens = res.usage?.prompt_tokens;
    let completion_tokens = res.usage?.completion_tokens;
    let total_tokens = res.usage?.total_tokens;
    richMessage.usage = {
      prompt_tokens: prompt_tokens,
      completion_tokens:
        prompt_tokens !== undefined && total_tokens !== undefined
          ? total_tokens - prompt_tokens
          : completion_tokens,
      total_tokens: total_tokens,
    };
    return richMessage ?? res;
  }

  async speech(options: SpeechOptions): Promise<ArrayBuffer> {
    const requestPayload = {
      model: options.model,
      input: options.input,
      voice: options.voice,
      response_format: options.response_format,
      speed: options.speed,
    };

    console.log("[Request] openai speech payload: ", requestPayload);

    const controller = new AbortController();
    options.onController?.(controller);

    try {
      const speechPath = this.path(this.speechPath || OpenaiPath.SpeechPath);
      const speechPayload = {
        method: "POST",
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        headers: {
          ...getHeaders(false, this.apiKey, this.enableKeyList),
          ...this.getProxyHeaders(),
        },
      };

      // make a fetch request
      const requestTimeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );

      const res = await fetch(speechPath, speechPayload);
      clearTimeout(requestTimeoutId);
      return await res.arrayBuffer();
    } catch (e) {
      console.log("[Request] failed to make a speech request", e);
      throw e;
    }
  }

  async chat(options: ChatOptions) {
    const accessStore = useAccessStore.getState();
    const paramsConfig = accessStore.modelParams as Record<string, any>;
    const extraParams = resolveExtraParams(options.config.model, paramsConfig);
    // const visionModel = isVisionModel(options.config.model);
    const model_name = options.config.model.toLowerCase();
    const isPureGPT =
      model_name.startsWith("gpt-") || model_name.startsWith("chatgpt-");
    const isO1 = model_name.startsWith("o1") || model_name.startsWith("gpt-o1");
    const isO3 = model_name.startsWith("o3") || model_name.startsWith("gpt-o3");
    const isO1orO3 = isO1 || isO3;
    const isGPT = isPureGPT || isO1 || isO3;
    const isClaude = model_name.startsWith("claude");
    // const isGlm4v = model_name.startsWith("glm-4v");
    const isMistral = model_name.startsWith("mistral");
    // const isMiniMax = model_name.startsWith("aabb");
    const isDeepseekReasoner =
      model_name.includes("deepseek-reasoner") ||
      model_name.includes("deepseek-r1");
    const isGrok = model_name.startsWith("grok-");
    const isGrokThink = model_name.startsWith("grok-3-mini-");
    const thinkingModel = isThinkingModel(model_name);

    // 检测是否为图像生成模型
    const isImageModel = isImageGenerationModel(model_name);

    // 是否保留推理细节回传，统一由 session 「回传思考内容」开关控制
    const retainReasoningDetails = !!(
      useChatStore.getState().currentSession().mask.modelConfig
        .sendReasoningContent ??
      useAppConfig.getState().modelConfig.sendReasoningContent
    );

    // const isThinking =
    //   model_name.includes("thinking") || isO1 || isO3 || isDeepseekReasoner;

    const messages: ChatOptions["messages"] = [];
    for (const v of options.messages) {
      const content = await preProcessMultimodalContent(
        v,
        retainReasoningDetails,
      );
      // 对于O1/O3模型和图像生成模型，移除system消息
      if (!((isO1orO3 || isImageModel) && v.role === "system")) {
        const outMsg: any = { role: v.role, content };
        // 透传 ReasoningType peer 字段(由 chat.ts getMessagesWithMemory 决定是否附加)
        if (v.reasoning_content) {
          outMsg.reasoning_content = v.reasoning_content;
        }
        messages.push(outMsg);
      }
    }

    // 合并连续的 system 消息
    for (let i = messages.length - 1; i > 0; i--) {
      if (messages[i].role === "system" && messages[i - 1].role === "system") {
        messages[i - 1].content += "\n\n" + messages[i].content;
        messages.splice(i, 1);
      }
    }

    // For claude model: roles must alternate between "user" and "assistant" in claude, so add a fake assistant message between two user messages
    // const keys = ["system", "user"];
    if (isClaude) {
      // 新的处理方式
      // 忽略所有不是 user 或 system 的开头消息
      while (
        messages.length > 0 &&
        messages[0].role !== "user" &&
        messages[0].role !== "system"
      ) {
        messages.shift();
      }

      // 如果第一条消息是 system，确保其后跟着的是 user 消息
      if (messages[0]?.role === "system") {
        let index = 1;
        while (index < messages.length && messages[index].role !== "user") {
          messages.splice(index, 1);
        }
      }
      // 检查消息的顺序，添加或删除消息以确保 user 和 assistant 交替出现
      let i = 0;
      while (i < messages.length) {
        if (
          i < messages.length - 1 &&
          messages[i].role === messages[i + 1].role
        ) {
          if (messages[i].role === "user") {
            // 插入一个含分号的 assistant 消息
            messages.splice(i + 1, 0, {
              role: "assistant",
              content: ";",
            });
            i++; // 跳过新插入的 assistant 消息
          } else if (messages[i].role === "assistant") {
            // 忽略前一条 assistant 消息
            messages.splice(i, 1);
            continue; // 由于数组长度减少，当前索引继续指向下一个待比较的元素
          }
        }
        i++; // 正常移动到下一个元素
      }
      while (
        messages.length > 0 &&
        messages[messages.length - 1].role !== "user"
      ) {
        messages.pop(); // 删除非 user 消息
      }
    }

    const modelConfig = {
      ...useAppConfig.getState().modelConfig,
      ...useChatStore.getState().currentSession().mask.modelConfig,
      ...{
        model: options.config.model,
      },
    };
    const requestTimeoutMS = (modelConfig.requestTimeout || 300) * 1000;
    // 辅助调用（translate/ocr/improve/topic/compress）按类型使用更短的独立超时
    const auxTimeout = options.type
      ? AUX_REQUEST_TIMEOUT_MS[options.type]
      : undefined;
    const baseTimeoutMS = auxTimeout ?? requestTimeoutMS;

    // O1 not support image, tools (plugin in ChatGPTNextWeb) and system, stream, logprobs, temperature, top_p, n, presence_penalty, frequency_penalty yet.
    let requestPayload: RequestPayload;
    requestPayload = {
      messages,
      stream: options.config.stream,
      model: modelConfig.model,
      // temperature: !isO1 ? modelConfig.temperature : 1,
      // top_p: !isO1 ? modelConfig.top_p : 1,
    };
    // reasoning_effort
    if (isGrokThink) {
      if (
        modelConfig.reasoning_effort === "low" ||
        modelConfig.reasoning_effort === "high"
      ) {
        requestPayload["reasoning_effort"] = modelConfig.reasoning_effort;
      }
    }
    // stream usage
    if (
      modelConfig.enableStreamUsageOptions &&
      options.config.stream &&
      isGPT
    ) {
      requestPayload["stream_options"] = { include_usage: true };
    }
    if (!isDeepseekReasoner) {
      if (modelConfig.temperature_enabled) {
        requestPayload["temperature"] = !isO1 ? modelConfig.temperature : 1;
      }
      if (modelConfig.top_p_enabled) {
        requestPayload["top_p"] = !isO1 ? modelConfig.top_p : 1;
      }
    }

    // add max_tokens to vision model
    // if (visionModel && modelConfig.model.includes("preview")) {
    if (
      modelConfig.max_tokens_enabled &&
      options?.type !== "compress" &&
      options?.type !== "topic"
    ) {
      if (isGrok) {
        requestPayload["max_completion_tokens"] = modelConfig.max_tokens;
      } else {
        requestPayload["max_tokens"] = modelConfig.max_tokens;
      }
    }

    if (!isMistral && !isDeepseekReasoner) {
      if (modelConfig.presence_penalty_enabled) {
        requestPayload["presence_penalty"] = modelConfig.presence_penalty;
      }
      if (modelConfig.frequency_penalty_enabled) {
        requestPayload["frequency_penalty"] = modelConfig.frequency_penalty;
      }
      if (isO1) {
        if (modelConfig.presence_penalty_enabled) {
          requestPayload["presence_penalty"] = 0;
        }
        if (modelConfig.frequency_penalty_enabled) {
          requestPayload["frequency_penalty"] = 0;
        }
        if (modelConfig.max_tokens_enabled) {
          requestPayload["max_completion_tokens"] = modelConfig.max_tokens;
        }
      }
    }

    // 进行参数覆盖
    // console.log("[parameter]", modelConfig.enableParamOverride, modelConfig.paramOverrideContent);
    // {"stream_options":null, "temperature":0.1}
    if (modelConfig.enableParamOverride && modelConfig.paramOverrideContent) {
      let overrideObj = {};
      try {
        // 如果 paramOverrideContent 已经是对象，可以直接赋值
        overrideObj =
          typeof modelConfig.paramOverrideContent === "string"
            ? JSON.parse(modelConfig.paramOverrideContent)
            : modelConfig.paramOverrideContent;
      } catch (e) {
        console.error("paramOverrideContent parse error:", e);
      }
      if (overrideObj && typeof overrideObj === "object") {
        Object.assign(requestPayload, overrideObj);
      }
    }

    Object.assign(requestPayload, extraParams);

    console.log("[Request] openai payload: ", requestPayload);

    const shouldStream = !!requestPayload["stream"]; // && !isO1; // o1 已经开始支持流式
    const controller = new AbortController();
    options.onController?.(controller);

    try {
      const chatPath = this.path(this.chatPath || OpenaiPath.ChatPath);
      const chatPayload = {
        method: "POST",
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        headers: {
          ...getHeaders(false, this.apiKey, this.enableKeyList),
          ...this.getProxyHeaders(),
        },
      };

      // make a fetch request
      // 仅对非辅助调用、且是思考模型时放大 ×10，并加 600s 上限
      const finalTimeoutMS = auxTimeout
        ? baseTimeoutMS
        : thinkingModel
        ? Math.min(baseTimeoutMS * 10, THINKING_MODEL_TIMEOUT_CAP_MS)
        : baseTimeoutMS;
      const requestTimeoutId = setTimeout(
        () => controller.abort(),
        finalTimeoutMS,
      );

      // 流式 chunk 空闲超时：onopen 后启动，每收到一个 chunk 重置；超 STREAM_IDLE_TIMEOUT_MS 无消息则 abort
      let streamIdleTimer: ReturnType<typeof setTimeout> | null = null;
      const resetStreamIdleTimer = () => {
        if (streamIdleTimer) clearTimeout(streamIdleTimer);
        streamIdleTimer = setTimeout(() => {
          console.warn(
            `[OpenAI] stream idle for ${STREAM_IDLE_TIMEOUT_MS}ms, aborting`,
          );
          controller.abort();
        }, STREAM_IDLE_TIMEOUT_MS);
      };
      const clearStreamIdleTimer = () => {
        if (streamIdleTimer) {
          clearTimeout(streamIdleTimer);
          streamIdleTimer = null;
        }
      };

      if (shouldStream) {
        let responseText = "";
        let remainText = "";
        let reasoningResponseText = "";
        let reasoningRemainText = "";
        let searchContent = "";
        let thinkContent = "";
        let completionContent = "";
        let citationsContent = "";

        let finished = false;
        let isInSearching = false;
        let searchLatency = 0;
        let isInThinking = false;
        let thinkingType = ThinkingType.Unknown; // 0: reasoning_content, 1: <think> 类型, 2: > 引用类型
        let foundFirstNonEmptyLineOrNonReference = false;
        let totalThinkingLatency = 0;
        let startRequestTime = Date.now();
        let isFirstReply = false;
        let firstReplyLatency = 0;
        let totalReplyLatency = 0;
        let completionTokens = 0;
        let richMessage: RichMessage = {
          content: "",
          reasoning_content: "",
        };

        // animate response to make it looks smooth
        function animateResponseText() {
          if (finished || controller.signal.aborted) {
            responseText += remainText;
            reasoningResponseText += reasoningRemainText;
            console.log("[Response Animation] finished");
            if (
              responseText?.length === 0 &&
              reasoningResponseText?.length === 0
            ) {
              options.onError?.(new Error("empty response from server"));
            }
            return;
          }

          let fetchText = "";
          let reasoningFetchText = "";
          if (reasoningRemainText.length > 0) {
            // 思考缓冲未排空前不消化正文，保持「先思考后正文」的串行顺序
            const fetchCount = Math.max(
              1,
              Math.round(reasoningRemainText.length / 60),
            );
            reasoningFetchText = reasoningRemainText.slice(0, fetchCount);
            reasoningResponseText += reasoningFetchText;
            reasoningRemainText = reasoningRemainText.slice(fetchCount);
          } else if (remainText.length > 0) {
            const fetchCount = Math.max(1, Math.round(remainText.length / 60));
            fetchText = remainText.slice(0, fetchCount);
            responseText += fetchText;
            remainText = remainText.slice(fetchCount);
          }
          if (fetchText.length > 0 || reasoningFetchText.length > 0) {
            options.onUpdate?.(responseText, fetchText, reasoningFetchText);
          }

          requestAnimationFrame(animateResponseText);
        }

        // start animaion
        animateResponseText();

        const finish = async () => {
          if (!finished || controller.signal.aborted) {
            finished = true;
            clearStreamIdleTimer();
            if (isInThinking || !totalThinkingLatency) {
              totalThinkingLatency =
                Date.now() -
                startRequestTime -
                firstReplyLatency -
                searchLatency;
            }
            if (!totalReplyLatency) {
              totalReplyLatency = Date.now() - startRequestTime;
            }

            let full_reply = responseText + remainText + citationsContent;
            full_reply = wrapThinkingPart(full_reply);
            let fullReasoning = reasoningResponseText + reasoningRemainText;

            // 把 ThinkType / ReferenceType 经 wrapThinkingPart 标准化后产生的
            // <think>...</think> 头部抽出，统一写入 reasoning_content
            // ReasoningType 已通过独立字段累积，跳过避免重复
            if (
              thinkingType !== ThinkingType.ReasoningType &&
              full_reply.startsWith("<think>")
            ) {
              const m = full_reply.match(
                /^<think>\n?([\s\S]*?)\n?<\/think>\n*/,
              );
              if (m) {
                fullReasoning = m[1];
                full_reply = full_reply.slice(m[0].length);
              }
            }

            // 处理图片上传
            try {
              if (imageUploadManager.containsBase64Image(full_reply)) {
                console.log("[ImageUpload] 检测到base64图片，开始上传...");
                full_reply =
                  await imageUploadManager.processTextWithImages(full_reply);
                console.log("[ImageUpload] 图片上传完成");
              }
            } catch (error) {
              console.error("[ImageUpload] 图片上传失败:", error);
              // 继续处理，不中断流程
            }

            if (completionTokens == 0) {
              completionTokens = estimateTokenLengthInLLM(full_reply);
            }
            richMessage.content = full_reply;
            richMessage.reasoning_content = fullReasoning;
            richMessage.thinking_type = thinkingType;
            richMessage.is_stream_request = true;
            richMessage.usage = {
              completion_tokens: completionTokens,
              first_content_latency: firstReplyLatency,
              searching_time: searchLatency,
              thinking_time: totalThinkingLatency,
              total_latency: totalReplyLatency,
            };
            options.onFinish(richMessage, new Response(null, { status: 200 }));
            console.log("thinkingType: ", ThinkingTypeMap[thinkingType]);
            console.log(
              `[Latency] ft: ${firstReplyLatency}, st: ${searchLatency}, tt: ${totalThinkingLatency}, rt: ${totalReplyLatency}`,
            );
          }
        };

        controller.signal.onabort = finish;

        fetchEventSource(chatPath, {
          ...chatPayload,
          async onopen(res) {
            clearTimeout(requestTimeoutId);
            resetStreamIdleTimer();
            const contentType = res.headers.get("content-type");
            console.log(
              "[OpenAI] request response content type: ",
              contentType,
            );

            if (contentType?.startsWith("text/plain")) {
              responseText = await res.clone().text();
              return finish();
            }
            if (
              !res.ok ||
              !contentType?.startsWith(EventStreamContentType) ||
              (res.status !== 200 && res.status !== 201)
            ) {
              const responseTexts = [responseText];
              let extraInfo = await res.clone().text();
              try {
                const resJson = await res.clone().json();
                extraInfo = prettyObject(resJson);
              } catch {}

              if (res.status === 401) {
                responseTexts.push(Locale.Error.Unauthorized);
              }

              if (extraInfo) {
                responseTexts.push(extraInfo);
              }

              responseText = responseTexts.join("\n\n");

              return finish();
            }
          },
          onmessage(msg) {
            if (msg.data === "[DONE]" || finished) {
              return finish();
            }
            resetStreamIdleTimer();
            const text = msg.data;
            try {
              const json = JSON.parse(text);
              const choices = json.choices as Array<{
                delta: {
                  content: string | null;
                  reasoning_content: string | null; // 兼容 deepseek 字段
                  reasoning: string | null; // 兼容 openRouter 字段
                  citations: string[] | null; // 兼容 openRouter 字段
                  images: Array<{
                    type: string;
                    image_url: {
                      url: string;
                    };
                  }> | null; // 兼容 openRouter/Gemini 生图字段
                };
              }>;
              const reasoning =
                choices[0]?.delta?.reasoning_content ||
                choices[0]?.delta?.reasoning;
              const content = choices[0]?.delta?.content;
              const images = choices[0]?.delta?.images;
              const citations = json?.citations;

              const textmoderation = json?.prompt_filter_results;
              completionTokens =
                json?.usage?.total_tokens != null &&
                json?.usage?.prompt_tokens != null
                  ? json.usage.total_tokens - json.usage.prompt_tokens
                  : json?.usage?.completion_tokens ?? completionTokens;

              if (firstReplyLatency == 0) {
                firstReplyLatency = Date.now() - startRequestTime;
                isFirstReply = true;
              } else {
                isFirstReply = false;
              }
              if (citations && citations.length > 0 && !citationsContent) {
                const formatted = citations
                  .map((url: string, index: number) => `[${index + 1}] ${url}`)
                  .join("\n");
                citationsContent = "\n\n-------\n### citations\n" + formatted;
              }
              if (reasoning && reasoning.length > 0) {
                // 存在非空的 reasoning_content => reasoningType
                thinkingType = ThinkingType.ReasoningType;
                reasoningRemainText += reasoning;
                isInThinking = true;
                totalThinkingLatency =
                  Date.now() -
                  startRequestTime -
                  firstReplyLatency -
                  searchLatency;
              } else if (content && content.length > 0) {
                // 先接收 content，再处理各种计时和状态标记
                if (
                  isInThinking &&
                  thinkingType === ThinkingType.ReasoningType
                ) {
                  isInThinking = false;
                  totalThinkingLatency =
                    Date.now() -
                    startRequestTime -
                    firstReplyLatency -
                    searchLatency;
                }
                remainText += content;
                let response_content = (responseText + remainText).trimStart();
                // 标记搜索状态
                if (!searchLatency) {
                  if (
                    !isInSearching &&
                    response_content.startsWith("<search>")
                  ) {
                    isInSearching = true;
                  }
                  if (isInSearching && response_content.includes("</search>")) {
                    const match_search = response_content.match(
                      /^<search>[\s\S]*?<\/search>/,
                    );
                    searchContent = match_search ? match_search[0] : "";
                    isInSearching = false;
                    searchLatency =
                      Date.now() - startRequestTime - firstReplyLatency;
                  }
                }
                response_content = response_content
                  .replace(/^<search>[\s\S]*?<\/search>/, "")
                  .trimStart();

                if ((searchLatency || !isInSearching) && response_content) {
                  // 标记思考状态
                  // 1. 标记思考类型
                  if (thinkingType === ThinkingType.Unknown && !isInThinking) {
                    if (response_content.startsWith("<think>")) {
                      isInThinking = true;
                      thinkingType = ThinkingType.ThinkType;
                    } else if (response_content.startsWith(">")) {
                      isInThinking = true;
                      foundFirstNonEmptyLineOrNonReference = false;
                      thinkingType = ThinkingType.ReferenceType;
                    } else if (!response_content.startsWith("<")) {
                      thinkingType = ThinkingType.MaybeNotThink;
                      foundFirstNonEmptyLineOrNonReference = true; //首字非<think>、非空、非引用
                    }
                  }

                  // 2. 处理闭合思考计时
                  if (isInThinking || !totalThinkingLatency) {
                    if (isInThinking) {
                      thinkContent = response_content;
                    }
                    // think类型，检测闭合</think>标签
                    if (
                      (thinkingType === ThinkingType.ThinkType ||
                        thinkingType === ThinkingType.MaybeNotThink) &&
                      content.includes("</think>")
                    ) {
                      isInThinking = false;
                      const match_think =
                        response_content.match(/[\s\S]*?<\/think>/);
                      thinkContent = match_think ? match_think[0] : "";
                      totalThinkingLatency =
                        Date.now() -
                        startRequestTime -
                        firstReplyLatency -
                        searchLatency;
                    }
                    // 引用类型，检测非空&非引用行
                    else if (
                      thinkingType === ThinkingType.ReferenceType &&
                      !foundFirstNonEmptyLineOrNonReference
                    ) {
                      const lines = response_content.split("\n");
                      for (const line of lines) {
                        if (line.trim() !== "" && !line.startsWith(">")) {
                          isInThinking = false;
                          foundFirstNonEmptyLineOrNonReference = true;
                          totalThinkingLatency =
                            Date.now() -
                            startRequestTime -
                            firstReplyLatency -
                            searchLatency;
                          break;
                        }
                        thinkContent += line + "\n";
                      }
                      if (isInThinking) {
                        thinkContent = "";
                      }
                    }
                  }
                  completionContent = response_content
                    .replace(searchContent, "")
                    .replace(thinkContent, "");
                }
              } else if (images && images.length > 0) {
                // 处理生图内容
                for (const image of images) {
                  if (image?.image_url?.url) {
                    // 将图片以 ![image](data:image/xxx) 的形式添加到 remainText
                    remainText += `![image](${image.image_url.url})\n`;
                  }
                }
              }

              if (
                textmoderation &&
                textmoderation.length > 0 &&
                ServiceProvider.Azure
              ) {
                const contentFilterResults =
                  textmoderation[0]?.content_filter_results;
                console.log(
                  `[${ServiceProvider.Azure}] [Text Moderation] flagged categories result:`,
                  contentFilterResults,
                );
              }
            } catch (e) {
              console.error("[Request] parse error", text, msg);
            }
          },
          onclose() {
            clearStreamIdleTimer();
            finish();
          },
          onerror(e) {
            clearStreamIdleTimer();
            options.onError?.(e);
            throw e;
          },
          openWhenHidden: true,
        });
      } else {
        let startRequestTime = Date.now();
        const res = await fetch(chatPath, chatPayload);
        clearTimeout(requestTimeoutId);

        const resJson = await res.json();
        let message = await this.extractMessage(resJson);

        // 处理图片上传
        try {
          if (message && typeof message === "object" && message.content) {
            if (imageUploadManager.containsBase64Image(message.content)) {
              console.log("[ImageUpload] 检测到base64图片，开始上传...");
              message.content = await imageUploadManager.processTextWithImages(
                message.content,
              );
              console.log("[ImageUpload] 图片上传完成");
            }
          }
        } catch (error) {
          console.error("[ImageUpload] 图片上传失败:", error);
          // 继续处理，不中断流程
        }

        let finishRequestTime = Date.now();
        if (
          message &&
          typeof message === "object" &&
          "usage" in message &&
          message.usage
        ) {
          message.usage.total_latency = finishRequestTime - startRequestTime;
          message.is_stream_request = false;
        }
        options.onFinish(message, res);
      }
    } catch (e) {
      console.log("[Request] failed to make a chat request", e);
      options.onError?.(e as Error);
    }
  }
  async usage() {
    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d
        .getDate()
        .toString()
        .padStart(2, "0")}`;
    const ONE_DAY = 1 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = formatDate(startOfMonth);
    const endDate = formatDate(new Date(Date.now() + ONE_DAY));

    const [used, subs] = await Promise.all([
      fetch(
        this.path(
          `${OpenaiPath.UsagePath}?start_date=${startDate}&end_date=${endDate}`,
        ),
        {
          method: "GET",
          headers: {
            ...getHeaders(false, this.apiKey, this.enableKeyList),
            ...this.getProxyHeaders(),
          },
        },
      ),
      fetch(this.path(OpenaiPath.SubsPath), {
        method: "GET",
        headers: {
          ...getHeaders(false, this.apiKey, this.enableKeyList),
          ...this.getProxyHeaders(),
        },
      }),
    ]);

    if (used.status === 401) {
      throw new Error(Locale.Error.Unauthorized);
    }

    if (!used.ok || !subs.ok) {
      throw new Error("Failed to query usage from openai");
    }

    const response = (await used.json()) as {
      total_usage?: number;
      error?: {
        type: string;
        message: string;
      };
    };

    const total = (await subs.json()) as {
      hard_limit_usd?: number;
    };

    if (response.error && response.error.type) {
      throw Error(response.error.message);
    }

    if (response.total_usage) {
      response.total_usage = Math.round(response.total_usage) / 100;
    }

    if (total.hard_limit_usd) {
      total.hard_limit_usd = Math.round(total.hard_limit_usd * 100) / 100;
    }

    return {
      used: response.total_usage,
      total: total.hard_limit_usd,
    } as LLMUsage;
  }

  async models(): Promise<LLMModel[]> {
    if (this.disableListModels) {
      return DEFAULT_MODELS.slice();
    }

    const res = await fetch(
      this.path(this.listModelPath || OpenaiPath.ListModelPath),
      {
        method: "GET",
        headers: {
          ...getHeaders(false, this.apiKey, this.enableKeyList),
          ...this.getProxyHeaders(),
        },
      },
    );

    const resJson = (await res.json()) as OpenAIListModelResponse;
    const chatModels = resJson.data?.filter(
      (m) => m.id.startsWith("gpt-") || m.id.startsWith("chatgpt-"),
    );
    console.log("[Models]", chatModels);

    if (!chatModels) {
      return [];
    }

    return chatModels.map((m) => ({
      name: m.id,
      available: true,
      provider: {
        id: "openai",
        providerName: "OpenAI",
        providerType: "openai",
      },
    }));
  }
}
export { OpenaiPath };
