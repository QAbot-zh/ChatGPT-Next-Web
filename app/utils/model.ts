import { DEFAULT_MODELS } from "../constant";
import { LLMModel } from "../client/api";

const customProvider = (providerName: string) => ({
  id: providerName.toLowerCase(),
  providerName: providerName,
  providerType: "custom",
});

export function collectModelTable(
  models: readonly LLMModel[],
  customModels: string,
  accessStore: any,
) {
  const modelTable: Record<
    string,
    {
      available: boolean;
      name: string;
      displayName: string;
      description?: string;
      provider?: LLMModel["provider"]; // Marked as optional
      isDefault?: boolean;
    }
  > = {};

  // 检查各提供商是否有配置 API key
  const hasOpenAIKey = !!accessStore?.openaiApiKey || !!accessStore?.accessCode;
  const hasAzureKey = !!accessStore?.azureApiKey;
  const hasGoogleKey = !!accessStore?.googleApiKey;
  const hasAnthropicKey = !!accessStore?.anthropicApiKey;

  // default models
  models.forEach((m) => {
    // 根据提供商类型和是否有 API key 设置初始可用性
    let available = m.available;
    const providerType = m?.provider?.providerType;

    // 根据提供商类型和 API key 配置调整可用性
    if (providerType === "openai") {
      available = available && hasOpenAIKey;
    } else if (providerType === "azure") {
      available = available && hasAzureKey;
    } else if (providerType === "google") {
      available = available && hasGoogleKey;
    } else if (providerType === "anthropic") {
      available = available && hasAnthropicKey;
    }

    // using <modelName>@<providerType> as fullName
    modelTable[`${m.name}@${m?.provider?.providerType}`] = {
      ...m,
      displayName: m.name, // 'provider' is copied over if it exists
      description: "",
      available,
    };
  });

  // server custom models
  customModels
    .split(",")
    .map((v) => v.trim())
    .filter((v) => !!v && v.length > 0)
    .forEach((m) => {
      const available = !m.startsWith("-");
      const nameConfig =
        m.startsWith("+") || m.startsWith("-") ? m.slice(1) : m;
      // const [name, displayName] = nameConfig.split("=");
      let name, displayName, description;
      const regex = /([^=<>]+)(?:=([^<>]*)?)?(?:<([^>]*)>)?/;
      const match = nameConfig.match(regex);

      if (match) {
        [, name, displayName, description] = match;
      } else {
        name = nameConfig;
      }

      // enable or disable all models
      if (name === "all") {
        Object.values(modelTable).forEach(
          (model) => (model.available = available),
        );
      } else if (name.startsWith("*")) {
        const modelId = name.substring(1).toLowerCase();
        Object.values(modelTable).forEach((model) => {
          if (model?.provider?.id === modelId) {
            model.available = available;
          }
        });
      } else {
        // 1. find model by name, and set available value
        const [customModelName, customProviderName] = name.split(/@(?=[^@]*$)/);
        let count = 0;
        for (const fullName in modelTable) {
          const [modelName, providerName] = fullName.split(/@(?=[^@]*$)/);
          if (
            customModelName == modelName &&
            (customProviderName === undefined ||
              customProviderName === providerName)
          ) {
            count += 1;
            modelTable[fullName]["available"] = available;
            if (displayName) {
              modelTable[fullName]["displayName"] = displayName;
            }
            if (description) {
              modelTable[fullName]["description"] = description;
            }
          }
        }
        // 2. if model not exists, create new model with available value
        if (count === 0) {
          let [customModelName, customProviderName] = name.split(/@(?=[^@]*$)/);
          const provider = customProvider(
            customProviderName || customModelName,
          );
          // 检查新模型的可用性
          const providerType = provider?.providerType;
          let modelAvailable = available;
          if (providerType === "openai") {
            modelAvailable = modelAvailable && hasOpenAIKey;
          } else if (providerType === "azure") {
            modelAvailable = modelAvailable && hasAzureKey;
          } else if (providerType === "google") {
            modelAvailable = modelAvailable && hasGoogleKey;
          } else if (providerType === "anthropic") {
            modelAvailable = modelAvailable && hasAnthropicKey;
          }
          modelTable[`${customModelName}@${providerType}`] = {
            name: customModelName,
            displayName: displayName || customModelName,
            description: description || "",
            available,
            provider, // Use optional chaining
          };
        }
      }
    });
  return modelTable;
}

export function collectModelTableWithDefaultModel(
  models: readonly LLMModel[],
  customModels: string,
  accessStore: any,
) {
  const defaultModel = accessStore.defaultModel;
  let modelTable = collectModelTable(models, customModels, accessStore);
  if (defaultModel && defaultModel !== "") {
    if (defaultModel.includes("@")) {
      if (defaultModel in modelTable) {
        modelTable[defaultModel].isDefault = true;
      }
    } else {
      for (const key of Object.keys(modelTable)) {
        if (
          modelTable[key].available &&
          key.split("@").shift() == defaultModel
        ) {
          modelTable[key].isDefault = true;
          break;
        }
      }
    }
  }
  return modelTable;
}

/**
 * Generate full model table.
 */
export function collectModels(
  models: readonly LLMModel[],
  customModels: string,
  accessStore: any,
) {
  const modelTable = collectModelTable(models, customModels, accessStore);
  const allModels = Object.values(modelTable);

  return allModels;
}

export function collectModelsWithDefaultModel(
  models: readonly LLMModel[],
  customModels: string,
  accessStore: any,
) {
  const modelTable = collectModelTableWithDefaultModel(
    models,
    customModels,
    accessStore,
  );
  const allModels = Object.values(modelTable);
  return allModels;
}

export function isModelAvailableInServer(
  customModels: string,
  modelName: string,
  providerNames: string | string[],
  accessStore: any,
) {
  const modelTable = collectModelTable(
    DEFAULT_MODELS,
    customModels,
    accessStore,
  );
  const providerNamesArray = Array.isArray(providerNames)
    ? providerNames
    : [providerNames];
  for (const providerName of providerNamesArray) {
    const fullName = `${modelName}@${providerName.toLowerCase()}`;
    if (modelTable[fullName]?.available === true) {
      return true;
    }
  }
  return false;
}
