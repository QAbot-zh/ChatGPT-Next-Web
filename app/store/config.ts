import { LLMModel } from "../client/api";
import { getClientConfig } from "../config/client";
import {
  DEFAULT_INPUT_TEMPLATE,
  DEFAULT_MODELS,
  DEFAULT_SIDEBAR_WIDTH,
  DEFAULT_TTS_ENGINE,
  DEFAULT_TTS_ENGINES,
  DEFAULT_TTS_MODEL,
  DEFAULT_TTS_MODELS,
  DEFAULT_TTS_VOICE,
  DEFAULT_TTS_VOICES,
  ServiceProvider,
  StoreKey,
} from "../constant";
import { createPersistStore } from "../utils/store";

export type ModelType = (typeof DEFAULT_MODELS)[number]["name"];
export type TTSModelType = (typeof DEFAULT_TTS_MODELS)[number];
export type TTSVoiceType = (typeof DEFAULT_TTS_VOICES)[number];
export type TTSEngineType = (typeof DEFAULT_TTS_ENGINES)[number];

export enum SubmitKey {
  Enter = "Enter",
  CtrlEnter = "Ctrl + Enter",
  ShiftEnter = "Shift + Enter",
  AltEnter = "Alt + Enter",
  MetaEnter = "Meta + Enter",
}

export enum Theme {
  Auto = "auto",
  Dark = "dark",
  Light = "light",
}

const config = getClientConfig();

export const DEFAULT_CONFIG = {
  lastUpdate: Date.now(), // timestamp, to merge state

  submitKey: SubmitKey.Enter,
  avatar: "1f603",
  fontSize: 14,
  theme: Theme.Auto as Theme,
  tightBorder: !!config?.isApp,
  sendPreviewBubble: true,
  enableAutoGenerateTitle: true,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,

  enableArtifacts: true, // show artifacts config

  enableCodeFold: true, // code fold config
  enableFloatingButton: false,

  disablePromptHint: false,
  enableShowUserContinuePrompt: false,
  customUserContinuePrompt: "",

  dontShowMaskSplashScreen: true, // dont show splash screen when create chat
  hideBuiltinMasks: false, // dont add builtin masks

  customModels: "",
  models: DEFAULT_MODELS as any as LLMModel[],

  modelConfig: {
    model: "gpt-4o-mini" as ModelType,
    providerName: "OpenAI" as ServiceProvider,
    temperature: 0.5,
    temperature_enabled: true,
    top_p: 0.99,
    top_p_enabled: false,
    max_tokens: 4000,
    max_tokens_enabled: true,
    presence_penalty: 0,
    presence_penalty_enabled: false,
    frequency_penalty: 0,
    frequency_penalty_enabled: false,
    reasoning_effort: "none",
    sendMemory: true,
    historyMessageCount: 4,
    compressMessageLengthThreshold: 1000,
    compressModel: "gpt-4o-mini" as ModelType,
    compressProviderName: "" as ServiceProvider,
    // translateModel: "gpt-4o-mini" as ModelType,
    // translateProviderName: "" as ServiceProvider,
    textProcessModel: "gpt-4o-mini" as ModelType,
    textProcessProviderName: "" as ServiceProvider,
    ocrModel: "gpt-4o-mini" as ModelType,
    ocrProviderName: "" as ServiceProvider,
    enableInjectSystemPrompts: false,
    enableStreamUsageOptions: false,
    template: config?.template ?? DEFAULT_INPUT_TEMPLATE,
    // 参数覆盖变量
    paramOverrideContent: "",
    enableParamOverride: false,
  },

  ttsConfig: {
    enable: false,
    autoplay: false,
    engine: DEFAULT_TTS_ENGINE,
    model: DEFAULT_TTS_MODEL,
    voice: DEFAULT_TTS_VOICE,
    speed: 1.0,
  },
};

export type ChatConfig = typeof DEFAULT_CONFIG;

export type ModelConfig = ChatConfig["modelConfig"];
export type TTSConfig = ChatConfig["ttsConfig"];

export function limitNumber(
  x: number,
  min: number,
  max: number,
  defaultValue: number,
) {
  if (isNaN(x)) {
    return defaultValue;
  }

  return Math.min(max, Math.max(min, x));
}

export const TTSConfigValidator = {
  engine(x: string) {
    return x as TTSEngineType;
  },
  model(x: string) {
    return x as TTSModelType;
  },
  voice(x: string) {
    return x as TTSVoiceType;
  },
  speed(x: number) {
    return limitNumber(x, 0.25, 4.0, 1.0);
  },
};

export const ModalConfigValidator = {
  model(x: string) {
    return x as ModelType;
  },
  max_tokens(x: number) {
    return limitNumber(x, 0, 512000, 1024);
  },
  presence_penalty(x: number) {
    return limitNumber(x, -2, 2, 0);
  },
  frequency_penalty(x: number) {
    return limitNumber(x, -2, 2, 0);
  },
  temperature(x: number) {
    return limitNumber(x, 0, 2, 0.6);
  },
  top_p(x: number) {
    return limitNumber(x, 0, 2, 0.99);
  },
};

export const useAppConfig = createPersistStore(
  { ...DEFAULT_CONFIG },
  (set, get) => ({
    reset() {
      set(() => ({ ...DEFAULT_CONFIG }));
    },

    mergeModels(newModels: LLMModel[]) {
      if (!newModels || newModels.length === 0) {
        return;
      }

      const oldModels = get().models;
      const modelMap: Record<string, LLMModel> = {};

      for (const model of oldModels) {
        model.available = false;
        modelMap[`${model.name}@${model?.provider?.id}`] = model;
      }

      for (const model of newModels) {
        model.available = true;
        modelMap[`${model.name}@${model?.provider?.id}`] = model;
      }

      set(() => ({
        models: Object.values(modelMap),
      }));
    },

    allModels() {},
  }),
  {
    name: StoreKey.Config,
    version: 4.3,

    merge(persistedState, currentState) {
      const state = persistedState as ChatConfig | undefined;
      if (!state) return { ...currentState };
      const models = currentState.models.slice();
      state.models.forEach((pModel) => {
        const idx = models.findIndex(
          (v) =>
            v.name === pModel.name &&
            v.provider.id === pModel.provider.id &&
            v.provider.providerName === pModel.provider.providerName &&
            v.provider.providerType === pModel.provider.providerType,
        );
        if (idx !== -1) models[idx] = pModel;
        else models.push(pModel);
      });
      return { ...currentState, ...state, models: models };
    },

    migrate(persistedState, version) {
      const state = persistedState as ChatConfig;

      if (version < 3.4) {
        state.modelConfig.sendMemory = true;
        state.modelConfig.historyMessageCount = 4;
        state.modelConfig.compressMessageLengthThreshold = 1000;
        state.modelConfig.frequency_penalty = 0;
        state.modelConfig.top_p = 1;
        state.modelConfig.template = DEFAULT_INPUT_TEMPLATE;
        state.dontShowMaskSplashScreen = true;
        state.hideBuiltinMasks = false;
      }

      if (version < 3.5) {
        state.customModels = "claude,claude-100k";
      }

      if (version < 3.6) {
        state.modelConfig.enableInjectSystemPrompts = true;
      }

      if (version < 3.7) {
        state.enableAutoGenerateTitle = true;
      }

      if (version < 3.8) {
        state.lastUpdate = Date.now();
      }

      if (version < 3.9) {
        state.modelConfig.template =
          state.modelConfig.template !== DEFAULT_INPUT_TEMPLATE
            ? state.modelConfig.template
            : config?.template ?? DEFAULT_INPUT_TEMPLATE;
      }

      if (version < 4) {
        state.modelConfig.compressModel =
          DEFAULT_CONFIG.modelConfig.compressModel;
        state.modelConfig.compressProviderName =
          DEFAULT_CONFIG.modelConfig.compressProviderName;
        // state.modelConfig.translateModel =
        //   DEFAULT_CONFIG.modelConfig.translateModel;
        // state.modelConfig.translateProviderName =
        //   DEFAULT_CONFIG.modelConfig.translateProviderName;
        state.modelConfig.ocrModel = DEFAULT_CONFIG.modelConfig.ocrModel;
        state.modelConfig.ocrProviderName =
          DEFAULT_CONFIG.modelConfig.ocrProviderName;
      }
      if (version < 4.2) {
        state.modelConfig.temperature_enabled = true;
        state.modelConfig.top_p_enabled = false;
        state.modelConfig.max_tokens_enabled = false;
        state.modelConfig.presence_penalty_enabled = false;
        state.modelConfig.frequency_penalty_enabled = false;
        state.modelConfig.enableStreamUsageOptions = false;
        state.modelConfig.reasoning_effort = "none";
      }
      if (version < 4.3) {
        state.modelConfig.textProcessModel =
          DEFAULT_CONFIG.modelConfig.textProcessModel;
        state.modelConfig.textProcessProviderName =
          DEFAULT_CONFIG.modelConfig.textProcessProviderName;
      }
      return state as any;
    },
  },
);
