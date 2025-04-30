import { useMemo, useState } from "react";
import { useAccessStore, useAppConfig } from "../store";
import { collectModelsWithDefaultModel } from "./model";
import { safeLocalStorage } from "../utils";
import { StoreKey } from "../constant";
import { Model, userCustomProvider } from "../client/api";

export function useAllModels() {
  const accessStore = useAccessStore();
  const configStore = useAppConfig();
  const models = useMemo(() => {
    return collectModelsWithDefaultModel(
      configStore.models,
      [
        configStore.customModels,
        accessStore.customModels,
        accessStore.defaultModel,
        accessStore.compressModel,
        // accessStore.translateModel,
        accessStore.textProcessModel,
        accessStore.ocrModel,
      ].join(","),
      accessStore,
    );
  }, [
    accessStore.customModels,
    accessStore.defaultModel,
    configStore.customModels,
    configStore.models,
    accessStore,
  ]);
  return models;
}

// New hook that combines built-in models with custom provider models
export function useAllModelsWithCustomProviders() {
  const builtInModels = useAllModels();
  const [customProviderModels, setCustomProviderModels] = useState<Model[]>(
    () => {
      const storedProviders = safeLocalStorage().getItem(
        StoreKey.CustomProvider,
      );
      if (!storedProviders) return [];
      try {
        const providers = JSON.parse(storedProviders) as userCustomProvider[];
        const activeProviders = providers.filter((p) => p.status === "active");
        return activeProviders.flatMap((provider) => {
          return (provider.models || [])
            .filter((model) => model.available)
            .map((model) => ({
              name: model.name,
              available: true,
              displayName: `${model.displayName || model.name} | ${
                provider.name
              }`,
              provider: {
                id: provider.id,
                providerName: provider.name,
                providerType: "custom-provider",
              },
              isCustom: true as const,
              enableVision: model?.enableVision,
              description: model?.description,
            }));
        });
      } catch (e) {
        console.error("Failed to parse custom providers:", e);
        return [];
      }
    },
  );
  // }, []);
  // Combine built-in models with custom provider models
  return useMemo(() => {
    return [...customProviderModels, ...builtInModels];
  }, [builtInModels, customProviderModels]);
}
