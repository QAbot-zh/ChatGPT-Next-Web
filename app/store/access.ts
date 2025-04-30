import {
  ApiPath,
  DEFAULT_API_HOST,
  ServiceProvider,
  StoreKey,
} from "../constant";
import { getHeaders } from "../client/api";
import { getClientConfig } from "../config/client";
import { createPersistStore } from "../utils/store";
import { ensure } from "../utils/clone";
import { DEFAULT_CONFIG, ModelType } from "./config";
import { showToast } from "../components/ui-lib";

let fetchState = 0; // 0 not fetch, 1 fetching, 2 done

const DEFAULT_OPENAI_URL =
  getClientConfig()?.buildMode === "export"
    ? DEFAULT_API_HOST + "/api/proxy/openai"
    : ApiPath.OpenAI;

const DEFAULT_ACCESS_STATE = {
  accessCode: "",

  useCustomProvider: false,
  customProvider_apiKey: "",
  customProvider_baseUrl: "",
  customProvider_type: "",

  useCustomConfig: false,

  provider: ServiceProvider.OpenAI,

  // openai
  openaiUrl: DEFAULT_OPENAI_URL,
  openaiApiKey: "",

  // azure
  azureUrl: "",
  azureApiKey: "",
  azureApiVersion: "2023-08-01-preview",

  // google ai studio
  googleUrl: "",
  googleApiKey: "",
  googleApiVersion: "v1",

  // anthropic
  anthropicApiKey: "",
  anthropicApiVersion: "2023-06-01",
  anthropicUrl: "",

  // server config
  needCode: true,
  hideUserApiKey: false,
  hideBalanceQuery: false,
  disableGPT4: false,
  disableFastLink: false,
  customModels: "",
  defaultModel: "",
  visionModels: "",
  customHello: "",
  UnauthorizedInfo: "",

  // icon position
  iconPosition: "",

  // sidebar config
  sidebarTitle: "",
  sidebarSubTitle: "",
  siteTitle: "NextChat",

  // model config
  compressModel: "" as ModelType,
  // translateModel: "" as ModelType,
  textProcessModel: "" as ModelType,
  ocrModel: "" as ModelType,

  // tts config
  edgeTTSVoiceName: "zh-CN-YunxiNeural",

  // select labels
  selectLabels: "",
};

export const useAccessStore = createPersistStore(
  { ...DEFAULT_ACCESS_STATE },

  (set, get) => ({
    setSideBarTitle() {
      this.fetch();
      return get().sidebarTitle;
    },
    setSideBarSubTitle() {
      this.fetch();
      return get().sidebarSubTitle;
    },
    setSiteTitle() {
      this.fetch();
      return get().siteTitle;
    },
    setCompressModel() {
      this.fetch();
      return get().compressModel;
    },
    setTextProcessModel() {
      this.fetch();
      return get().textProcessModel;
    },
    setOcrModel() {
      this.fetch();
      return get().ocrModel;
    },
    setIconPosition() {
      this.fetch();
      return get().iconPosition;
    },
    setCustomHello() {
      this.fetch();
      return get().customHello;
    },
    setUnauthorizedInfo() {
      this.fetch();
      return get().UnauthorizedInfo;
    },
    enabledAccessControl() {
      this.fetch();
      return get().needCode;
    },
    getVisionModels() {
      this.fetch();
      return get().visionModels;
    },
    edgeVoiceName() {
      this.fetch();
      return get().edgeTTSVoiceName;
    },
    getSelectLabels() {
      this.fetch();
      return get().selectLabels;
    },

    isValidOpenAI() {
      return ensure(get(), ["openaiApiKey"]);
    },

    isValidAzure() {
      return ensure(get(), ["azureUrl", "azureApiKey", "azureApiVersion"]);
    },

    isValidGoogle() {
      return ensure(get(), ["googleApiKey"]);
    },

    isValidAnthropic() {
      return ensure(get(), ["anthropicApiKey"]);
    },

    isAuthorized() {
      this.fetch();

      // has token or has code or disabled access control
      return (
        this.isValidOpenAI() ||
        this.isValidAzure() ||
        this.isValidGoogle() ||
        this.isValidAnthropic() ||
        !this.enabledAccessControl() ||
        (this.enabledAccessControl() && ensure(get(), ["accessCode"]))
      );
    },
    fetch() {
      if (fetchState > 0 || getClientConfig()?.buildMode === "export") return;
      fetchState = 1;
      fetch("/api/config", {
        method: "post",
        body: null,
        headers: {
          ...getHeaders(),
        },
      })
        .then((res) => res.json())
        .then((res) => {
          // Set default model from env request
          let defaultModel = res.defaultModel ?? "";
          if (defaultModel !== "") {
            const [model, providerName] = defaultModel.split(/@(?=[^@]*$)/);
            DEFAULT_CONFIG.modelConfig.model = model;
            DEFAULT_CONFIG.modelConfig.providerName = providerName;
          }
          return res;
        })
        .then((res: DangerConfig) => {
          console.log("[Config] got config from server", res);
          set(() => ({ ...res }));
        })
        .catch(() => {
          console.error("[Config] failed to fetch config");
        })
        .finally(() => {
          fetchState = 2;
        });
    },
    async fetchAvailableModels(
      url: string,
      apiKey: string,
      type: string = "openai",
    ): Promise<string> {
      // if (fetchState !== 0) return Promise.resolve(DEFAULT_ACCESS_STATE.customModels);
      fetchState = 1;
      const baseUrl = url.replace(/\/+$/, "");
      const path = type === "deepseek" ? "/models" : "/v1/models";

      return fetch(`${baseUrl}${path}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            // 抛出错误，包含响应状态和状态文本
            throw new Error(`${res.status} - ${res.statusText}`);
          }
          return res.json();
        })
        .then((res) => {
          const models = res.data || [];

          // 新增去重逻辑
          const uniqueModels = models.filter(
            (model: any, index: number, self: any[]) =>
              self.findIndex(
                (m) => m.id.toLowerCase() === model.id.toLowerCase(),
              ) === index,
          );
          // 根据关键字，去除非chat格式模型
          const excludedKeywords = [
            "text-",
            "moderation",
            "embedding",
            "dall-e-",
            "davinci",
            "babbage",
            "midjourney",
            "whisper",
            "tts",
          ];
          const availableModels = uniqueModels
            .filter(
              (model: any) =>
                !excludedKeywords.some((keyword) =>
                  model.id.toLowerCase().includes(keyword.toLowerCase()),
                ),
            )
            .map((model: any) => `${model.id}@OpenAI`)
            .join(",");
          // console.log("availableModels", availableModels);
          showToast("fetch and update models list successfully");
          return `-all,${availableModels}`;
        })
        .catch((error) => {
          console.error("[Access] failed to fetch available models: ", error);
          showToast(`failed to fetch available models: ${error}`);
          return DEFAULT_ACCESS_STATE.customModels;
        })
        .finally(() => (fetchState = 2));
    },
    async checkSiliconFlowBalance(
      apiKey: string,
      baseUrl: string,
    ): Promise<{
      isValid: boolean;
      balance?: string;
      totalBalance?: number;
      chargeBalance?: string;
      currency?: string;
      error?: string;
    }> {
      if (!apiKey) {
        return Promise.resolve({
          isValid: false,
          error: "API key is required",
        });
      }
      if (!baseUrl) {
        baseUrl = "https://api.siliconflow.cn";
      }
      return fetch(`${baseUrl.replace(/\/+$/, "")}/v1/user/info`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`${res.status} - ${res.statusText}`);
          }
          return res.json();
        })
        .then((res) => {
          if (res.code === 20000 && res.status === true && res.data) {
            return {
              isValid: true,
              currency: "￥",
              balance: res.data.balance,
              totalBalance: res.data.totalBalance,
              chargeBalance: res.data.chargeBalance,
            };
          } else {
            return {
              isValid: false,
              error: res.message || "Invalid response format",
            };
          }
        })
        .catch((error) => {
          console.error("[Access] failed to check SiliconFlow balance:", error);
          return {
            isValid: false,
            error: error.message || "Failed to check balance",
          };
        });
    },
    async checkDeepSeekBalance(
      apiKey: string,
      baseUrl?: string,
    ): Promise<{
      isValid: boolean;
      isAvailable?: boolean;
      balance?: string; // 总余额（等同于 totalBalance）
      totalBalance?: number; // 总余额（和 balance 相同）
      chargeBalance?: string; // 充值余额（即 toppedUpBalance）
      currency?: string;
      error?: string;
    }> {
      // 参数验证
      if (!apiKey) {
        return {
          isValid: false,
          error: "API key is required",
        };
      }

      // 设置默认 baseUrl
      baseUrl = baseUrl || "https://api.deepseek.com";

      try {
        // 调用 DeepSeek API
        const response = await fetch(
          `${baseUrl.replace(/\/+$/, "")}/user/balance`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: "application/json",
            },
          },
        );

        // 检查响应状态
        if (!response.ok) {
          throw new Error(`${response.status} - ${response.statusText}`);
        }

        const data = await response.json();

        // 查找 CNY 的余额信息
        const cnyBalance = data.balance_infos?.find(
          (info: any) => info.currency === "CNY",
        );

        return {
          isValid: true,
          isAvailable: data.is_available,
          currency: "￥",
          balance: cnyBalance?.total_balance, // 总余额
          totalBalance: cnyBalance?.total_balance, // 总余额（和 balance 相同）
          chargeBalance: cnyBalance?.topped_up_balance, // 充值余额
        };
      } catch (error) {
        console.error("[DeepSeek] Failed to check balance:", error);
        return {
          isValid: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
    async checkOpenRouterBalance(
      apiKey: string,
      baseUrl: string,
    ): Promise<{
      isValid: boolean;
      totalBalance?: number;
      currency?: string;
      error?: string;
    }> {
      if (!apiKey) {
        return Promise.resolve({
          isValid: false,
          error: "API key is required",
        });
      }
      if (!baseUrl) {
        baseUrl = "https://openrouter.ai/api";
      }
      return fetch(`${baseUrl.replace(/\/+$/, "")}/v1/credits`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`${res.status} - ${res.statusText}`);
          }
          return res.json();
        })
        .then((res) => {
          if (res.data) {
            return {
              isValid: true,
              currency: "$",
              totalBalance: res.data.total_credits - res.data.total_usage,
            };
          } else {
            return {
              isValid: false,
              error: res.message || "Invalid response format",
            };
          }
        })
        .catch((error) => {
          console.error("[Access] failed to check OpenRouter balance:", error);
          return {
            isValid: false,
            error: error.message || "Failed to check balance",
          };
        });
    },
    async checkCustomOpenaiBalance(
      apiKey: string,
      baseUrl: string,
    ): Promise<{
      isValid: boolean;
      totalBalance?: number; // 可用额度 (USD)
      currency?: string;
      error?: string;
    }> {
      // 参数校验
      if (!apiKey || !baseUrl) {
        return {
          isValid: false,
          error: "API key 和 baseUrl 不能为空",
        };
      }
      // 规范化 API 地址
      const apiUrl = baseUrl.replace(/\/+$/, "");
      try {
        // 1. 获取订阅信息（总额度）
        const subscriptionRes = await fetch(
          `${apiUrl}/dashboard/billing/subscription`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
          },
        );
        const { hard_limit_usd } = await subscriptionRes.json();
        const total = hard_limit_usd?.toFixed(2) || "0.00";
        // 2. 获取本月使用量
        const today = new Date();
        const startDate = `${today.getFullYear()}-${(today.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-01`;
        const endDate = `${today.getFullYear()}-${(today.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;

        const usageRes = await fetch(
          `${apiUrl}/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`,
          { headers: { Authorization: `Bearer ${apiKey}` } },
        );
        const { total_usage } = await usageRes.json();
        const used = (total_usage / 100).toFixed(2); // 转换为美元

        // 3. 计算剩余额度
        const remaining = parseFloat(total) - parseFloat(used);
        return { isValid: true, totalBalance: remaining, currency: "$" };
      } catch (error) {
        console.error("[OpenAI] Failed to check balance:", error);
        return {
          isValid: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  }),
  {
    name: StoreKey.Access,
    version: 2,
    migrate(persistedState, version) {
      if (version < 2) {
        const state = persistedState as {
          token: string;
          openaiApiKey: string;
          azureApiVersion: string;
          googleApiKey: string;
        };
        state.openaiApiKey = state.token;
        state.azureApiVersion = "2023-08-01-preview";
      }

      return persistedState as any;
    },
  },
);
