import React, { useState, useEffect, useMemo, useCallback } from "react";
import { IconButton } from "./button";
import styles from "./custom-provider.module.scss";
import uiStyles from "./ui-lib.module.scss";
import { useAccessStore } from "../store";
import { Model, userCustomProvider, ApiPaths } from "../client/api";
import Locale from "../locales";
import {
  List,
  ListItem,
  Modal,
  PasswordInput,
  Select,
  showConfirm,
  showToast,
} from "./ui-lib";

// 导入图标
import CloseIcon from "../icons/close.svg";
import LoadingIcon from "../icons/loading.svg";
import SearchIcon from "../icons/zoom.svg";
import VisionIcon from "../icons/eye.svg";
import VisionOffIcon from "../icons/eye-off.svg";
import TrashIcon from "../icons/delete.svg";
import { useMobileScreen } from "../utils";

// 测试结果结构
type TestResultType = {
  success: boolean;
  message: string;
  fullError?: string;
  time?: number; // Include time as optional
};
// 获取提供商类型标签
export const providerTypeLabels: Record<string, string> = {
  openai: "OpenAI",
  siliconflow: "SiliconFlow",
  deepseek: "DeepSeek",
  openrouter: "OpenRouter",
  // azure: 'Azure OpenAI',
  // anthropic: 'Anthropic',
  // custom: '自定义API',
};
// 获取提供商默认的地址
export const providerTypeDefaultUrls: Record<string, string> = {
  openai: "https://api.openai.com",
  siliconflow: "https://api.siliconflow.cn",
  deepseek: "https://api.deepseek.com",
  openrouter: "https://openrouter.ai/api",
};
export const providerTypeDefaultTestModel: Record<string, string> = {
  openai: "gpt-4o-mini",
  siliconflow: "Qwen/Qwen2.5-7B-Instruct",
  deepseek: "deepseek-chat",
  openrouter: "qwen/qwen-2.5-7b-instruct:free",
};
// KeyItem 组件
const KeyItem = ({
  onDelete,
  index,
  apiKey,
  baseUrl,
  type,
  externalBalance,
  externalLoading,
  testResult,
  isTesting,
  onTest,
  isDisabled,
  onToggleDisable,
}: {
  onDelete: (index: number) => void;
  index: number;
  apiKey: string;
  baseUrl: string;
  type: string;
  externalBalance?: string | null;
  externalLoading?: boolean;
  testResult?: {
    success: boolean;
    message: string;
    fullError?: string;
    time?: number;
  };
  isTesting?: boolean;
  onTest?: () => void;
  isDisabled?: boolean;
  onToggleDisable?: () => void;
}) => {
  const accessStore = useAccessStore.getState();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);

  // 使用外部传入的余额覆盖本地状态
  useEffect(() => {
    if (externalBalance !== undefined) {
      setBalance(externalBalance);
    }
  }, [externalBalance]);

  const checkBalance = async () => {
    if (baseUrl.endsWith("#")) {
      showToast("当前渠道不支持余额查询");
      return;
    }
    setLoading(true);
    try {
      let result = null;
      if (type === "openrouter") {
        result = await accessStore.checkOpenRouterBalance(apiKey, baseUrl);
      } else if (type === "siliconflow") {
        result = await accessStore.checkSiliconFlowBalance(apiKey, baseUrl);
      } else if (type === "deepseek") {
        result = await accessStore.checkDeepSeekBalance(apiKey, baseUrl);
      } else if (
        type === "openai" &&
        baseUrl !== providerTypeDefaultUrls[type]
      ) {
        result = await accessStore.checkCustomOpenaiBalance(apiKey, baseUrl);
      }
      // 处理 result
      if (result && result.isValid && result.totalBalance) {
        try {
          const formattedBalance = Number(result.totalBalance).toFixed(2);
          setBalance(`${result.currency} ${formattedBalance}`);
        } catch (e) {
          showToast("余额格式化失败");
        }
      } else {
        showToast(result?.error || "查询失败或不支持查询");
      }
    } catch (error) {
      console.error("查询余额出错:", error);
      showToast("查询余额失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      showToast("API密钥已复制到剪贴板");
    } catch (error) {
      console.error("复制失败:", error);
      showToast("复制失败");
    }
  };

  return (
    <div
      className={`${styles.keyItem} ${isDisabled ? styles.disabledKey : ""}`}
    >
      <div className={styles.keyContent}>
        <div
          className={styles.keyText}
          onClick={handleCopyApiKey}
          title="copy the key"
        >
          {apiKey}
        </div>
        {isDisabled && (
          <div className={styles.disabledBadge}>
            {Locale.CustomProvider.Status.Disabled}
          </div>
        )}
        {testResult && (
          <div
            className={`${styles.testResult} ${
              testResult.success ? styles.testSuccess : styles.testError
            }`}
            title={testResult.fullError || ""}
          >
            {testResult.message}
          </div>
        )}
      </div>
      <div className={styles.keyActions}>
        {balance && <div className={styles.balanceDisplay}>{balance}</div>}

        {!loading && !externalLoading && !balance ? (
          <IconButton
            icon={<SearchIcon />}
            text="$"
            bordered
            onClick={checkBalance}
            title="查询余额"
          />
        ) : loading || externalLoading ? (
          <div style={{ width: "20px", height: "20px" }}>
            <LoadingIcon />
          </div>
        ) : null}

        {/* Add test button */}
        {onTest &&
          (isTesting ? (
            <div style={{ width: "20px", height: "20px" }}>
              <LoadingIcon />
            </div>
          ) : (
            <IconButton
              text="Test"
              bordered
              onClick={onTest}
              title="测试API密钥连通性"
            />
          ))}
        <IconButton
          icon={<TrashIcon />}
          text="Delete"
          bordered
          onClick={() => onDelete(index)}
          title="删除密钥"
        />
        {onToggleDisable && (
          <div
            className={styles.statusToggleContainer}
            title={isDisabled ? "启用此密钥" : "禁用此密钥"}
          >
            <div
              className={`${styles.toggleSwitch} ${
                !isDisabled ? styles.active : ""
              }`}
              onClick={onToggleDisable}
            >
              <div className={styles.toggleSlider}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export interface ProviderModalProps {
  provider: userCustomProvider | null;
  onSave: (provider: userCustomProvider) => void;
  onClose: () => void;
  providers: userCustomProvider[];
  // setProviders: React.Dispatch<React.SetStateAction<userCustomProvider[]>>;
  // saveProvidersToStorage: (providers: userCustomProvider[]) => void;
}

export const API_CONCURRENCY_LIMIT = 10;
// 提供商编辑模态框
export function ProviderModal(props: ProviderModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<
    Omit<userCustomProvider, "id"> & { id?: string }
  >({
    name: "",
    apiKey: "",
    baseUrl: "",
    type: "openai",
    models: [],
    status: "inactive",
    enableKeyList: [],
    disableKeyList: [],
    useProxy: false,
    paths: {
      ChatPath: "",
      SpeechPath: "",
      ImagePath: "",
      ListModelPath: "",
    },
  });

  const isMobileScreen = useMobileScreen();
  // 模型相关状态
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelSearchTerm, setModelSearchTerm] = useState("");
  // 模型视图模式: 'list' | 'grid'
  const [modelViewMode, setModelViewMode] = useState<"list" | "grid">("list");
  // 模型排序状态
  const [initialSortDone, setInitialSortDone] = useState(false);
  // 模型编辑和json视图
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [editedDisplayName, setEditedDisplayName] = useState("");
  const [isJsonViewMode, setIsJsonViewMode] = useState(false);
  const [displayNameMapText, setDisplayNameMapText] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedEnableVision, setEditedEnableVision] = useState(false);
  // API Key 列表视图状态
  const [isKeyListViewMode, setIsKeyListViewMode] = useState(true);
  const [keyList, setKeyList] = useState<string[]>([]);
  const [newKey, setNewKey] = useState("");
  const [keyInputError, setKeyInputError] = useState<string | null>(null);

  // 高级设置显示
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // 检测 API Key 中的非标准字符
  const validateApiKey = (key: string): string | null => {
    if (!key) return null;

    // 检测非 ASCII 字符 (超出 0x00-0x7F 范围)
    const nonAsciiChars: { char: string; code: number; position: number }[] =
      [];
    for (let i = 0; i < key.length; i++) {
      const code = key.charCodeAt(i);
      if (code > 127) {
        nonAsciiChars.push({ char: key[i], code, position: i + 1 });
      }
    }

    if (nonAsciiChars.length > 0) {
      const details = nonAsciiChars
        .slice(0, 3) // 只显示前3个
        .map(
          (c) =>
            `"${c.char}" (U+${c.code
              .toString(16)
              .toUpperCase()
              .padStart(4, "0")})`,
        )
        .join(", ");
      const moreText =
        nonAsciiChars.length > 3 ? ` 等${nonAsciiChars.length}个` : "";
      return `检测到异常字符: ${details}${moreText}。可能是复制时带入的特殊符号，请检查并重新输入。`;
    }

    return null;
  };

  // 处理 API Key 输入变化
  const handleNewKeyChange = (value: string) => {
    setNewKey(value);
    const error = validateApiKey(value);
    setKeyInputError(error);
  };

  // 当编辑现有提供商时，加载数据
  useEffect(() => {
    if (props.provider) {
      setFormData({
        id: props.provider.id,
        name: props.provider.name,
        apiKey: props.provider.apiKey,
        baseUrl:
          props.provider.baseUrl ||
          providerTypeDefaultUrls[props.provider.type],
        type: props.provider.type,
        models: props.provider.models || [],
        status: props.provider.status || "active",
        enableKeyList: props.provider.enableKeyList || [],
        disableKeyList: props.provider.disableKeyList || [],
        balance: props.provider.balance,
        useProxy: props.provider.useProxy || false,
        testModel:
          props.provider.testModel ||
          providerTypeDefaultTestModel[props.provider.type],
        paths: props.provider.paths || {
          ChatPath: "",
          SpeechPath: "",
          ImagePath: "",
          ListModelPath: "",
        },
      });

      if (props.provider.models) {
        setModels(props.provider.models);
      }

      if (props.provider.apiKey) {
        setKeyList(
          props.provider.apiKey
            .split(/[\s,]+/)
            .map((key) => key.trim())
            .filter(Boolean),
        );
      } else {
        setKeyList([]); // Ensure keyList is empty if apiKey is empty
      }
    } else {
      // 添加新提供商，初始化默认值
      setFormData({
        name: "",
        apiKey: "",
        baseUrl: "",
        type: "openai",
        models: [],
        status: "active",
        balance: undefined,
        useProxy: false,
        enableKeyList: [],
        disableKeyList: [],
        testModel: providerTypeDefaultTestModel["openai"],
        paths: {
          ChatPath: "",
          SpeechPath: "",
          ImagePath: "",
          ListModelPath: "",
        },
      });
      setModels([]);
      setKeyList([]);
    }
  }, [props.provider]);

  const [rawInput, setRawInput] = useState("");
  const parseRawInput = () => {
    if (!rawInput.trim()) {
      showToast("请输入需要解析的内容");
      return;
    }

    // Initial data to be filled
    let parsedName = "";
    let parsedUrl = "";
    let parsedApiKey = "";

    // Extract name (first line is usually the name)
    const lines = rawInput.split("\n");
    if (lines.length > 0) {
      parsedName = lines[0].trim();
    }

    // Extract URL with regex
    const urlRegex = /(https?:\/\/[^\s]+)/i;
    const urlMatch = rawInput.match(urlRegex);
    if (urlMatch && urlMatch[1]) {
      let url = urlMatch[1].replace(/["'<>()\[\]]+$/, "").trim();

      // Process URL according to the rules
      const urlObj = new URL(url);
      const mainDomain = `${urlObj.protocol}//${urlObj.hostname}`;

      // Check if it ends with 'completions' but is NOT 'v1/chat/completions'
      if (url.endsWith("completions") && !url.endsWith("v1/chat/completions")) {
        // For completions endpoints (not standard OpenAI path), add '#'
        parsedUrl = url + "#";
      } else {
        // For all other cases, use just the main domain
        parsedUrl = mainDomain;
      }
    }
    // Extract API key with regex
    const apiKeyRegex = /(sk-[^\s]+)/i;
    const apiKeyMatch = rawInput.match(apiKeyRegex);
    if (apiKeyMatch && apiKeyMatch[1]) {
      parsedApiKey = apiKeyMatch[1].trim();
    }

    // Update form data
    setFormData((prev) => ({
      ...prev,
      name: parsedName || prev.name,
      baseUrl: parsedUrl || prev.baseUrl,
      apiKey: parsedApiKey || prev.apiKey,
    }));

    // Clear the raw input area
    // setRawInput("");

    // Show success message
    showToast("解析成功");
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePathChange = (pathName: keyof ApiPaths, value: string) => {
    setFormData((prev) => ({
      ...prev,
      paths: {
        ...prev.paths,
        [pathName]: value,
      },
    }));
  };

  const handleSubmit = () => {
    // 准备保存的数据，包括选中的模型
    const selectedModels = models.filter((model) => model.available);
    const saveData: userCustomProvider = {
      ...formData,
      id: formData.id || `provider-${Date.now()}`, // 确保有ID
      models: selectedModels,
      status: (formData.status as "active" | "inactive") || "active",
      balance: formData.balance,
      testModel:
        formData.testModel || providerTypeDefaultTestModel[formData.type],
      paths: formData.paths,
      useProxy: formData.useProxy || false,
      enableKeyList: formData.enableKeyList || [],
      disableKeyList: formData.disableKeyList || [],
    };
    props.onSave(saveData);
  };

  const handleClose = async () => {
    const confirmContent = (
      <div>
        <div>{"可能有未保存的更改，是否要保存当前渠道的修改？"}</div>
        <div style={{ marginTop: "8px", fontWeight: "500", color: "#dc2626" }}>
          此操作执行后无法撤回，是否继续？
        </div>
      </div>
    );

    // 如果用户选择保存，则调用 handleSubmit 函数
    // 如果用户选择不保存，则直接关闭模态框
    const shouldSave = await showConfirm(confirmContent);
    if (shouldSave) {
      handleSubmit();
    }
    props.onClose();
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        showToast(Locale.CustomProvider.ApiNameRequired);
        return;
      }
      if (!formData.apiKey.trim()) {
        showToast(Locale.CustomProvider.ApiKeyRequired);
        return;
      }
    }
    if (!formData.baseUrl.trim()) {
      formData.baseUrl = providerTypeDefaultUrls[formData.type];
      console.log(formData);
    }
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
      setInitialSortDone(false);
      fetchModels();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setIsJsonViewMode(false);
    }
  };

  // 拉取模型列表
  const fetchModels = async () => {
    if (!formData.apiKey || !formData.baseUrl) {
      showToast(Locale.CustomProvider.ApiConfigRequired);
      return;
    }

    setIsLoadingModels(true);

    try {
      const accessStore = useAccessStore.getState();
      // 调用真实的API获取模型列表
      const api_key = formData.apiKey.split(",")[0].trim();
      const modelsStr = await accessStore.fetchAvailableModels(
        formData.baseUrl,
        api_key,
        formData.paths?.ListModelPath || "/v1/models",
        formData.type,
        formData.useProxy || false,
      );

      // 创建一个现有模型的映射，用于保留displayName
      const existingModelsMap = new Map();
      models.forEach((model) => {
        // 只保存有自定义displayName的模型
        if (model.displayName) {
          existingModelsMap.set(model.name, model.displayName);
        }
      });

      // 解析API返回的模型数据
      let fetchedModels: Model[] = [];
      if (modelsStr) {
        const modelNames = modelsStr
          .replace("-all,", "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);

        fetchedModels = modelNames.map((modelName) => {
          const [id, provider] = modelName.split(/@(?=[^@]*$)/);
          return {
            name: id,
            displayName: existingModelsMap.get(id),
            available: false,
            isDefault: false,
            provider: {
              id: provider || id,
              providerName: provider || id,
              providerType: provider || id,
            },
          };
        });
      }

      // 优先使用API返回的数据，如果为空则尝试本地存储
      if (fetchedModels.length === 0 && formData.models?.length) {
        fetchedModels = formData.models; // 使用本地存储的模型数据
      }

      // 保留已选状态
      const selectedModelNames = (formData.models || [])
        .filter((m) => m.available)
        .map((m) => m.name);

      // 构建displayName映射
      const displayNameMap = new Map();
      formData.models?.forEach((model) => {
        if (model.displayName) {
          displayNameMap.set(model.name, model.displayName);
        }
      });

      let modelsToSet = fetchedModels.map((model) => {
        const existingModel = formData.models?.find(
          (m) => m.name === model.name,
        );

        return {
          ...model,
          // 保留显示名称的优先级:
          // 1. 从API获取的模型已有displayName
          // 2. 从现有formData.models中获取displayName
          // 3. 不设置displayName
          displayName: model.displayName || displayNameMap.get(model.name),
          available: selectedModelNames.includes(model.name),
          description: existingModel?.description || model?.description,
          enableVision: existingModel?.enableVision || model?.enableVision,
        };
      });
      // 如果是在 step 2 且还没有进行过初始排序，则进行一次排序
      if (!initialSortDone) {
        modelsToSet = modelsToSet.sort((a, b) => {
          if (a.available && !b.available) return -1;
          if (!a.available && b.available) return 1;
          return a.name.localeCompare(b.name);
        });
        setInitialSortDone(true);
      }
      setModels(modelsToSet);
    } catch (error) {
      console.error("获取模型列表失败:", error);
      if (formData.models?.length) {
        if (currentStep === 2 && !initialSortDone) {
          const sortedModels = [...formData.models].sort((a, b) => {
            if (a.available && !b.available) return -1;
            if (!a.available && b.available) return 1;
            return a.name.localeCompare(b.name);
          });
          setModels(sortedModels);
          setInitialSortDone(true);
        } else {
          setModels(formData.models);
        }
      } else {
        showToast(`获取模型列表失败: ${error}`);
      }
    } finally {
      setIsLoadingModels(false);
    }
  };
  // 添加模型
  const AddModels = async () => {
    const searchModel = modelSearchTerm.trim();
    if (!searchModel) {
      showToast(Locale.CustomProvider.ModelNameRequired);
      return;
    }

    // 检查是否已存在同名模型
    if (models.some((m) => m.name === searchModel)) {
      showToast(Locale.CustomProvider.ModelExists);
      return;
    }

    // 支持逗号和换行符分割多个模型名称
    const modelNames = searchModel
      .split(/[,，\s\n]/)
      .map((name) => name.trim())
      .filter(Boolean);

    // 处理每个模型名称
    const newModels: Model[] = [];
    const existingNames = new Set(models.map((m) => m.name));

    for (const name of modelNames) {
      if (existingNames.has(name)) {
        continue; // 跳过已存在的模型
      }

      // 创建新模型
      newModels.push({
        name: name,
        available: true,
        isDefault: false,
        provider: {
          id: name,
          providerName: name,
          providerType: name,
        },
      });

      existingNames.add(name);
    }
    if (newModels.length > 0) {
      // 更新模型列表并清空搜索
      setModels([...models, ...newModels]);
      setModelSearchTerm("");
    } else if (modelNames.length > 0) {
      showToast(Locale.CustomProvider.ModelExists);
    }
  };

  // 添加键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      AddModels();
    }
  };
  // 编辑模型显示名称的处理函数
  const handleEditDisplayName = (model: Model, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingModel(model);
    setEditedDisplayName(model.displayName || model.name);
    setEditedDescription(model.description || "");
    setEditedEnableVision(model.enableVision || false);
  };
  // 保存显示名称
  const saveDisplayName = () => {
    if (!editingModel) return;

    setModels(
      models.map((model) =>
        model.name === editingModel.name
          ? {
              ...model,
              displayName: editedDisplayName.trim() || model.name,
              description: editedDescription,
              enableVision: editedEnableVision,
            }
          : model,
      ),
    );

    setEditingModel(null);
  };
  // 生成显示名称映射JSON字符串的函数
  const generateDisplayNameMapView = useCallback(() => {
    const displayNameMap: Record<string, string> = {};
    models.forEach((model) => {
      if (model.displayName && model.displayName !== model.name) {
        displayNameMap[model.name] = model.displayName;
      }
    });

    return JSON.stringify(displayNameMap, null, 2);
  }, [models]);

  // 解析并应用显示名称映射的函数
  const applyDisplayNameMap = () => {
    try {
      const json = JSON.parse(displayNameMapText);

      // 验证是否为有效的映射格式
      if (typeof json !== "object" || json === null) {
        throw new Error(Locale.CustomProvider.EditModel.ErrorJson);
      }

      // 应用映射到模型
      const updatedModels = [...models];
      for (const model of updatedModels) {
        if (json[model.name]) {
          // Update existing model's display name
          model.displayName = json[model.name];
        }
      }
      // 检查新模型
      for (const modelName in json) {
        if (!updatedModels.some((model) => model.name === modelName)) {
          // Create a new model if it doesn't exist
          updatedModels.push({
            name: modelName,
            displayName: json[modelName],
            available: true, // Set default values as needed
            isDefault: false,
            provider: {
              id: modelName,
              providerName: modelName,
              providerType: formData.type, // Adjust as necessary
            },
          });
        }
      }

      setModels(updatedModels);

      showToast(Locale.CustomProvider.EditModel.SuccessJson);
      setIsJsonViewMode(false); // 应用后切回正常视图
    } catch (error) {
      console.error("解析JSON失败:", error);
      showToast(Locale.CustomProvider.EditModel.ErrorJson);
    }
  };
  // 在JSON视图模式切换时更新文本内容
  useEffect(() => {
    if (isJsonViewMode) {
      setDisplayNameMapText(generateDisplayNameMapView());
    }
  }, [isJsonViewMode, generateDisplayNameMapView]);

  // 切换模型选中状态
  const toggleModelSelection = (modelName: string) => {
    setModels(
      models.map((model) =>
        model.name === modelName
          ? {
              ...model,
              available:
                model.available === undefined ? true : !model.available,
            }
          : model,
      ),
    );
  };

  useEffect(() => {
    if (props.provider) {
      setFormData({
        id: props.provider.id,
        name: props.provider.name,
        apiKey: props.provider.apiKey,
        baseUrl:
          props.provider.baseUrl ||
          providerTypeDefaultUrls[props.provider.type],
        type: props.provider.type,
        models: props.provider.models || [],
        status: props.provider.status || "active",
        enableKeyList: props.provider.enableKeyList || [],
        disableKeyList: props.provider.disableKeyList || [],
        balance: props.provider.balance,
        useProxy: props.provider.useProxy || false,
        testModel:
          props.provider.testModel ||
          providerTypeDefaultTestModel[props.provider.type],
        paths: props.provider.paths || {
          ChatPath: "",
          SpeechPath: "",
          ImagePath: "",
          ListModelPath: "",
        },
      });
      if (props.provider.models) {
        setModels(props.provider.models);
      }

      const en = (props.provider.enableKeyList || [])
        .map((k) => k.trim())
        .filter(Boolean);
      const dis = (props.provider.disableKeyList || [])
        .map((k) => k.trim())
        .filter(Boolean);
      let allKeys: string[];

      if (en.length > 0 || dis.length > 0) {
        const disSet = new Set(dis);
        const enPruned = en.filter((k) => !disSet.has(k));
        allKeys = Array.from(new Set([...enPruned, ...dis]));
        setKeyList(allKeys);
      } else {
        const fromApi = (props.provider.apiKey || "")
          .split(/[\s,]+/)
          .map((k) => k.trim())
          .filter(Boolean);
        setKeyList(fromApi);
        setFormData((prev) => ({
          ...prev,
          enableKeyList: fromApi,
          disableKeyList: [],
        }));
      }
    } else {
      setFormData({
        name: "",
        apiKey: "",
        baseUrl: "",
        type: "openai",
        models: [],
        status: "active",
        enableKeyList: [],
        disableKeyList: [],
      });
      setModels([]);
      setKeyList([]);
    }
  }, [props.provider]);

  // 密钥额度状态
  const [keyBalances, setKeyBalances] = useState<Record<string, string | null>>(
    {},
  );
  const [loadingKeyBalances, setLoadingKeyBalances] = useState<
    Record<string, boolean>
  >({});
  // Update apiKey string when keyList changes
  useEffect(() => {
    const apiKeyString = keyList.join(",");
    setFormData((prev) => ({ ...prev, apiKey: apiKeyString }));
  }, [keyList]);

  // Function to add a new key to the list
  const addKeyToList = () => {
    if (!newKey.trim()) {
      showToast("API Key cannot be empty");
      return;
    }

    // 检查是否有非标准字符
    const validationError = validateApiKey(newKey);
    if (validationError) {
      showToast("API Key 包含非标准字符，请先修正后再添加");
      return;
    }

    const keys = newKey
      .split(/[\s,]+/)
      .map((k) => k.trim())
      .filter(Boolean);

    if (keys.length === 0) {
      showToast("API Key cannot be empty");
      return;
    }
    const uniqueNewKeys = keys.filter((k) => !keyList.includes(k));
    if (uniqueNewKeys.length === 0) {
      showToast("All API Keys already exist");
      return;
    }

    const nextKeys = [...keyList, ...uniqueNewKeys];
    setKeyList(nextKeys);

    setFormData((prev) => {
      const en = new Set([...(prev.enableKeyList || []), ...uniqueNewKeys]);
      const dis = new Set(prev.disableKeyList || []);
      uniqueNewKeys.forEach((k) => dis.delete(k));
      return {
        ...prev,
        enableKeyList: Array.from(en),
        disableKeyList: Array.from(dis),
        apiKey: nextKeys.join(","),
      };
    });

    setNewKey("");
    showToast(`${uniqueNewKeys.length} Keys had added successfully`);
  };

  // Function to remove a key from the list
  const removeKeyFromList = async (index: number) => {
    // Get the key that will be deleted for display in the confirmation message
    const keyToDelete = keyList[index];

    // Show confirmation dialog
    const confirmContent = (
      <div>
        <div>{"Are you sure you want to delete this API key?"}</div>
        <div
          style={{
            marginTop: "8px",
            padding: "6px 10px",
            backgroundColor: "#f9fafb",
            borderRadius: "4px",
            fontFamily: "monospace",
            wordBreak: "break-all",
          }}
        >
          {keyToDelete}
        </div>
      </div>
    );

    // If user confirms, proceed with deletion
    if (await showConfirm(confirmContent)) {
      const updatedKeys = [...keyList];
      updatedKeys.splice(index, 1);
      setKeyList(updatedKeys);

      setFormData((prev) => ({
        ...prev,
        enableKeyList: (prev.enableKeyList || []).filter(
          (k) => k !== keyToDelete,
        ),
        disableKeyList: (prev.disableKeyList || []).filter(
          (k) => k !== keyToDelete,
        ),
        apiKey: updatedKeys.join(","),
      }));
    }
  };

  // Function to handle key press in key input field
  const handleKeyInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyToList();
    }
  };

  const hasValidBalance = (balanceStr: string | null): boolean => {
    if (!balanceStr) return false;

    // 尝试提取数字部分 - 假设格式是"货币 数字"
    const parts = balanceStr.split(" ");
    if (parts.length < 2) return false;

    // 获取最后一部分作为数字
    const numberPart = parts[parts.length - 1];

    // 尝试转换为浮点数
    const balance = parseFloat(numberPart);

    // 检查是否为有效数字且大于0
    return !isNaN(balance) && balance > 0;
  };

  const [testMessage, setTestMessage] = useState(
    "Hello. Please respond with 'OK'.",
  );
  const [testingKeys, setTestingKeys] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<
    Record<
      string,
      {
        success: boolean;
        message: string;
        time?: number;
        fullError?: string;
      }
    >
  >({});
  // const [testModel, setTestModel] = useState("gpt-4o-mini");

  // Add this useEffect to update the test model when formData.type changes
  useEffect(() => {
    // This will run when formData.type changes
    // if (!formData.testModel) {
    if (!props.provider) {
      // 仅在添加新 Provider 时，根据 type 设置默认 testModel
      const defaultTestModel =
        providerTypeDefaultTestModel[formData.type] || "gpt-4o-mini";
      setFormData((prev) => ({
        ...prev,
        testModel: defaultTestModel,
      }));
    }
    // }
  }, [formData.type, props.provider]);

  // Add this helper function to test a single key
  const testKeyConnectivity = async (apiKey: string) => {
    setTestingKeys((prev) => ({ ...prev, [apiKey]: true }));
    setTestResults((prev) => ({
      ...prev,
      [apiKey]: { success: false, message: "Testing..." },
    }));

    let result = {
      success: false,
      message: "✗ Error",
      fullError: "Unknown error",
      time: -1,
    };

    try {
      const startTime = Date.now();
      let completionPath = formData.paths?.ChatPath || "/v1/chat/completions";
      const modelToTest = formData.testModel;

      // 根据 useProxy 决定请求 URL 和 headers
      const requestUrl = formData.useProxy
        ? `/api/custom-proxy${completionPath}`
        : `${formData.baseUrl}${completionPath}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
      if (formData.useProxy && formData.baseUrl) {
        headers["X-Proxy-Target"] = formData.baseUrl;
      }

      const response = await fetchWithTimeout(
        requestUrl,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: modelToTest,
            messages: [{ role: "user", content: testMessage }],
            max_tokens: 20,
            stream: false,
          }),
        },
        10000, // 10 second timeout
      );

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.ok) {
        const data = await response.json();
        result = {
          ...result,
          success: true,
          message: `✓ (${responseTime}ms)`,
          time: responseTime,
        };
        setFormData((prev) => {
          const enableList = [...(prev.enableKeyList || [])];
          const disableList = [...(prev.disableKeyList || [])].filter(
            (k) => k !== apiKey,
          );

          if (!enableList.includes(apiKey)) {
            enableList.push(apiKey);
          }

          return {
            ...prev,
            enableKeyList: enableList,
            disableKeyList: disableList,
          };
        });
      } else {
        const errorData = await response.json().catch(() => ({
          error: { message: "Unknown error", code: "unknown" },
        }));

        const fullError =
          errorData.error?.message || `Error ${response.status}`;
        result = {
          ...result,
          success: false,
          message: `✗ Error (${response.status})`,
          fullError: fullError,
        };
        if ([401, 403, 429, 500, 502, 503].includes(response.status)) {
          setFormData((prev) => {
            const enableList = [...(prev.enableKeyList || [])].filter(
              (k) => k !== apiKey,
            );
            const disableList = [...(prev.disableKeyList || [])];

            if (!disableList.includes(apiKey)) {
              disableList.push(apiKey);
              // 只有当密钥实际被禁用时才显示提示
              showToast(
                `密钥已自动禁用 (${response.status}): ${apiKey.substring(
                  0,
                  10,
                )}...`,
              );
            }

            return {
              ...prev,
              enableKeyList: enableList,
              disableKeyList: disableList,
            };
          });
        }
      }
    } catch (error) {
      let errorMsg = "Request failed";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMsg = "Request timeout";
        } else {
          errorMsg = error.message;
        }
      }

      result = {
        ...result,
        success: false,
        message: "✗ Error",
        fullError: errorMsg,
      };
      setFormData((prev) => {
        const enableList = [...(prev.enableKeyList || [])].filter(
          (k) => k !== apiKey,
        );
        const disableList = [...(prev.disableKeyList || [])];

        if (!disableList.includes(apiKey)) {
          disableList.push(apiKey);
          showToast(`密钥已自动禁用 (网络错误): ${apiKey.substring(0, 10)}...`);
        }

        return {
          ...prev,
          enableKeyList: enableList,
          disableKeyList: disableList,
        };
      });
    } finally {
      setTestResults((prev) => ({ ...prev, [apiKey]: result }));
      setTestingKeys((prev) => ({ ...prev, [apiKey]: false }));
    }
    return result;
  };

  // Function to test all keys
  const testAllKeys = async () => {
    if (!formData.testModel?.trim()) {
      showToast(
        "Test model cannot be empty. Please specify a model to test with.",
      );
      return;
    }
    let testedCount = 0;
    const totalKeys = keyList.length;
    for (let i = 0; i < totalKeys; i += API_CONCURRENCY_LIMIT) {
      const batch = keyList.slice(i, i + API_CONCURRENCY_LIMIT);
      showToast(
        `Testing keys ${i + 1}-${Math.min(
          i + API_CONCURRENCY_LIMIT,
          totalKeys,
        )} of ${totalKeys}...`,
      );
      await Promise.all(batch.map((key) => testKeyConnectivity(key)));
      testedCount += batch.length;
    }
    showToast(`All ${totalKeys} keys tested.`);
  };

  const removeInvalidKeys = async () => {
    // Add confirmation dialog
    const confirmContent = (
      <div style={{ lineHeight: "1.4" }}>
        <div style={{ fontWeight: "500" }}>
          此操作将会移除所有测试连接失败的密钥。
        </div>

        <div
          style={{
            margin: "8px 0",
            padding: "8px 10px",
            backgroundColor: "#fff7ed",
            borderLeft: "3px solid #f97316",
            borderRadius: "4px",
          }}
        >
          <div
            style={{
              fontWeight: "600",
              color: "#c2410c",
              marginBottom: "4px",
            }}
          >
            将移除以下类型的密钥:
          </div>
          <ul
            style={{
              paddingLeft: "20px",
              margin: "4px 0 0 0",
              color: "#9a3412",
            }}
          >
            <li>API连接超时的密钥</li>
            <li>验证失败的密钥</li>
            <li>模型不可用的密钥</li>
          </ul>
        </div>
        <div
          style={{
            margin: "8px 0",
            padding: "8px 10px",
            backgroundColor: "#f0f9ff",
            borderLeft: "3px solid #0ea5e9",
            borderRadius: "4px",
          }}
        >
          <div
            style={{
              fontWeight: "600",
              color: "#0369a1",
              marginBottom: "4px",
            }}
          >
            测试信息:
          </div>
          <ul
            style={{
              paddingLeft: "20px",
              margin: "4px 0 0 0",
              color: "#0c4a6e",
            }}
          >
            <li>
              测试模型:{" "}
              <code
                style={{
                  background: "#e0f2fe",
                  padding: "2px 4px",
                  borderRadius: "3px",
                }}
              >
                {formData.testModel || "未指定"}
              </code>
            </li>
            <li>
              接口地址:{" "}
              <code
                style={{
                  background: "#e0f2fe",
                  padding: "2px 4px",
                  borderRadius: "3px",
                  wordBreak: "break-all",
                }}
              >
                {formData.baseUrl || providerTypeDefaultUrls[formData.type]}
              </code>
            </li>
          </ul>
        </div>
        <div
          style={{
            marginTop: "8px",
            fontWeight: "600",
            color: "#dc2626",
          }}
        >
          此操作执行后无法撤回，是否继续？
        </div>
      </div>
    );

    // If user cancels, don't proceed
    if (!(await showConfirm(confirmContent))) {
      return;
    }

    // Show progress indicator
    showToast("正在检查密钥...");

    // Check if we have test results for all keys
    const untestedKeys = keyList.filter((key) => !testResults[key]);

    // Create a local collection of results
    const localResults: Record<string, TestResultType> = {};

    // First, copy any existing test results
    for (const key of keyList) {
      if (testResults[key]) {
        localResults[key] = { ...testResults[key] };
      }
    }

    // If there are untested keys, test them first
    if (untestedKeys.length > 0) {
      showToast(`测试 ${untestedKeys.length} 个未测试的密钥...`);

      const processBatch = async (keys: string[], batchSize: number) => {
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);

          // Run current batch in parallel
          const batchPromises = batch.map(async (key) => {
            const result = await testKeyConnectivity(key);
            return { key, result };
          });

          // Wait for current batch to complete
          const results = await Promise.all(batchPromises);

          // Store results
          results.forEach(({ key, result }) => {
            localResults[key] = result;
          });

          // Show progress
          if (keys.length > batchSize) {
            const progress = Math.min(i + batchSize, keys.length);
            showToast(`已测试 ${progress}/${keys.length} 个密钥...`);
          }
        }
      };

      // Process with a reasonable batch size (adjust as needed)
      // const BATCH_SIZE = 10; // Test 10 keys at a time
      await processBatch(untestedKeys, API_CONCURRENCY_LIMIT);
    }

    // Use our local results collection for filtering
    const validKeys = keyList.filter(
      (key) => localResults[key] && localResults[key].success,
    );

    const invalidKeys = keyList.filter(
      (key) => !localResults[key] || !localResults[key].success,
    );

    // Update key list to only include valid keys
    setKeyList(validKeys);

    setFormData((prev) => ({
      ...prev,
      apiKey: validKeys.join(","),
      enableKeyList: validKeys,
      disableKeyList: (prev.disableKeyList || []).filter(
        (k) => validKeys.includes(k) === false,
      ),
    }));

    // Show results
    const removedCount = invalidKeys.length;
    if (removedCount > 0) {
      showToast(`已移除 ${removedCount} 个失败的密钥`);

      // Log invalid keys for debugging
      console.log("移除的无效密钥:", invalidKeys);
      console.log(
        "失败原因:",
        invalidKeys.map((key) => ({
          key,
          error: localResults[key]?.fullError || "未知错误",
        })),
      );
    } else {
      showToast("没有发现失败的密钥");
    }
  };

  // 使用 useMemo 缓存过滤后的键列表，并优化空输入情况
  const filteredKeys = useMemo(() => {
    // 如果搜索输入为空，直接返回所有键，避免不必要的遍历
    if (!newKey.trim()) {
      return keyList;
    }
    // 只有当有搜索条件时才执行过滤
    const lowerSearchTerm = newKey.toLowerCase();
    return keyList.filter((key) => {
      const lowerKey = key.toLowerCase();

      // 匹配键本身
      if (lowerKey.includes(lowerSearchTerm)) return true;

      // 匹配测试结果
      const testResult = testResults[key];
      if (testResult) {
        const resultText = `${testResult.message} ${
          testResult.fullError || ""
        }`.toLowerCase();
        if (resultText.includes(lowerSearchTerm)) return true;
      }

      return false;
    });
  }, [keyList, newKey, testResults]);

  // yi
  const clearDisabledKeys = async () => {
    // 检查是否有禁用的密钥
    if (!formData.disableKeyList || formData.disableKeyList.length === 0) {
      showToast("没有禁用的密钥需要清除");
      return;
    }

    // 构建确认对话框内容
    const confirmContent = (
      <div style={{ lineHeight: "1.4" }}>
        <div style={{ marginBottom: "8px" }}>确定要清除所有禁用的密钥吗？</div>

        <div
          style={{
            padding: "8px 10px",
            borderLeft: "3px solid #f87171",
            backgroundColor: "#fef2f2",
            margin: "8px 0",
          }}
        >
          <div
            style={{
              fontWeight: "600",
              color: "#b91c1c",
              marginBottom: "4px",
            }}
          >
            将移除以下密钥:
          </div>
          <div
            style={{
              maxHeight: "150px",
              overflowY: "auto",
              paddingRight: "5px",
            }}
          >
            {formData.disableKeyList.map((key, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "4px",
                  fontFamily: "monospace",
                  fontSize: "13px",
                  wordBreak: "break-all",
                }}
              >
                {index + 1}. {key.substring(0, 12)}...
                {key.substring(key.length - 5)}
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: "8px",
              color: "#b91c1c",
              fontWeight: "500",
              fontSize: "14px",
            }}
          >
            共 {formData.disableKeyList.length} 个密钥
          </div>
        </div>

        <div
          style={{
            fontSize: "14px",
            color: "#6b7280",
            marginTop: "8px",
          }}
        >
          此操作不可撤销，请确认是否继续？
        </div>
      </div>
    );

    // 显示确认对话框
    if (await showConfirm(confirmContent)) {
      // 更新键列表：移除所有禁用的密钥
      const newKeyList = keyList.filter(
        (key) => !formData.disableKeyList?.includes(key),
      );

      // 更新 formData
      setFormData((prev) => ({
        ...prev,
        apiKey: newKeyList.join(","), // 重要：更新 apiKey 字符串
        disableKeyList: [], // 清空禁用列表
        enableKeyList: newKeyList, // 保留启用列表中的键
      }));

      // 更新 keyList 状态
      setKeyList(newKeyList);

      // 显示成功消息
      showToast(`已清除 ${formData.disableKeyList.length} 个禁用的密钥`);
    }
  };

  // 添加批量删除过滤后密钥的函数
  const removeFilteredKeys = async () => {
    // 如果没有过滤条件或没有匹配项，不执行任何操作
    if (!newKey.trim() || filteredKeys.length === 0) return;

    // 构建确认对话框内容
    const confirmContent = (
      <div>
        <div>
          {`确定要删除所有匹配"${newKey}"的 ${filteredKeys.length} 个密钥吗？`}
        </div>
        <div
          style={{
            marginTop: "10px",
            padding: "8px 12px",
            backgroundColor: "#fff1f0",
            borderRadius: "4px",
            borderLeft: "3px solid #ff4d4f",
          }}
        >
          <div style={{ fontWeight: "500", color: "#cf1322" }}>
            此操作不可撤销
          </div>
          <div style={{ marginTop: "4px", color: "#ff4d4f" }}>
            {filteredKeys.length > 3
              ? `将删除 ${filteredKeys.length} 个密钥，包括: ${filteredKeys
                  .slice(0, 3)
                  .join(", ")}... 等`
              : `将删除: ${filteredKeys.join(", ")}`}
          </div>
        </div>
      </div>
    );

    // 显示确认对话框
    if (await showConfirm(confirmContent)) {
      // 用户确认后，创建一个新的密钥列表，排除所有匹配的密钥
      const remainingKeys = keyList.filter(
        (key) => !filteredKeys.includes(key),
      );
      setKeyList(remainingKeys);

      setFormData((prev) => ({
        ...prev,
        apiKey: remainingKeys.join(","),
        enableKeyList: (prev.enableKeyList || []).filter(
          (k) => !filteredKeys.includes(k),
        ),
        disableKeyList: (prev.disableKeyList || []).filter(
          (k) => !filteredKeys.includes(k),
        ),
      }));
      // 清空搜索输入
      setNewKey("");

      // 显示成功消息
      showToast(`已删除 ${filteredKeys.length} 个密钥`);
    }
  };

  const renderApiKeysSection = () => {
    if (isKeyListViewMode) {
      return (
        <div className={styles.keyListContainer}>
          {/* Add test prompt input and Test All button */}
          <div className={styles.testConfigContainer}>
            <label className={styles.testModelLabel}>Test Model:</label>
            <input
              type="text"
              placeholder={providerTypeDefaultTestModel[formData.type]}
              value={formData.testModel ?? ""}
              onChange={(e) => {
                handleChange("testModel", e.target.value);
              }}
              className={styles.testModelInput}
            />
            <IconButton
              text="Test All Keys"
              onClick={testAllKeys}
              bordered
              disabled={
                keyList.length === 0 ||
                Object.values(testingKeys).some((val) => val)
              }
            />
          </div>

          <div className={styles.keyInputContainer}>
            <div className={styles.keyInputWrapper}>
              <input
                type="text"
                value={newKey}
                onChange={(e) => handleNewKeyChange(e.target.value)}
                placeholder={Locale.CustomProvider.ApiKeyPlaceholder}
                className={`${styles.keyInput} ${
                  keyInputError ? styles.keyInputError : ""
                }`}
                onKeyDown={handleKeyInputKeyDown}
              />
              {keyInputError && (
                <div className={styles.keyInputErrorMessage}>
                  {keyInputError}
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <IconButton
                text={Locale.CustomProvider.AddKey}
                onClick={addKeyToList}
                bordered
              />
              <IconButton
                text={Locale.CustomProvider.ClearInput}
                onClick={() => {
                  setNewKey("");
                  setKeyInputError(null);
                }}
                bordered
              />
              <IconButton
                text={Locale.CustomProvider.ClearDisabledKeys}
                onClick={clearDisabledKeys}
                bordered
                disabled={!formData.disableKeyList?.length}
              />
              <IconButton
                text={Locale.CustomProvider.ClearSelectKeys}
                onClick={removeFilteredKeys}
                bordered
                title="删除所有匹配的密钥"
                disabled={!newKey.trim() || filteredKeys.length === 0}
                className={styles.deleteMatchedButton}
              />
              <IconButton
                text={Locale.CustomProvider.RefreshBalance}
                onClick={async () => {
                  if (formData.baseUrl.endsWith("#")) {
                    showToast("当前渠道不支持余额查询");
                    return;
                  }
                  setKeyBalances({});
                  const loadingState: Record<string, boolean> = {};
                  keyList.forEach((key) => {
                    loadingState[key] = true;
                  });
                  setLoadingKeyBalances(loadingState);

                  let totalBalance = 0;
                  let currency = "";
                  let hasValidBalanceOverall = false;
                  let processedCount = 0;
                  const totalKeysToRefresh = keyList.length;

                  for (
                    let i = 0;
                    i < totalKeysToRefresh;
                    i += API_CONCURRENCY_LIMIT
                  ) {
                    const batchKeys = keyList.slice(
                      i,
                      i + API_CONCURRENCY_LIMIT,
                    );
                    showToast(
                      `Refreshing balances for keys ${i + 1}-${Math.min(
                        i + API_CONCURRENCY_LIMIT,
                        totalKeysToRefresh,
                      )} of ${totalKeysToRefresh}...`,
                    );

                    const batchPromises = batchKeys.map(async (key) => {
                      try {
                        let result: any = null;
                        if (formData.type === "openrouter") {
                          result = await useAccessStore
                            .getState()
                            .checkOpenRouterBalance(key, formData.baseUrl);
                        } else if (formData.type === "siliconflow") {
                          result = await useAccessStore
                            .getState()
                            .checkSiliconFlowBalance(key, formData.baseUrl);
                        } else if (formData.type === "deepseek") {
                          result = await useAccessStore
                            .getState()
                            .checkDeepSeekBalance(key, formData.baseUrl);
                        } else if (
                          formData.type === "openai" &&
                          formData.baseUrl !==
                            providerTypeDefaultUrls[formData.type]
                        ) {
                          result = await useAccessStore
                            .getState()
                            .checkCustomOpenaiBalance(key, formData.baseUrl);
                        }

                        if (result && result.isValid && result.totalBalance) {
                          const balance = Number(result.totalBalance);
                          if (!isNaN(balance)) {
                            totalBalance += balance; // Accumulate total balance
                            if (!currency && result.currency) {
                              currency = result.currency; // Set currency from the first valid result
                            }
                            hasValidBalanceOverall = true;
                          }
                          setKeyBalances((prev) => ({
                            ...prev,
                            [key]: `${result.currency} ${Number(
                              result.totalBalance,
                            ).toFixed(2)}`,
                          }));
                        } else {
                          setKeyBalances((prev) => ({ ...prev, [key]: null }));
                        }
                      } catch (error) {
                        setKeyBalances((prev) => ({ ...prev, [key]: null }));
                      } finally {
                        setLoadingKeyBalances((prev) => ({
                          ...prev,
                          [key]: false,
                        }));
                      }
                    });

                    await Promise.all(batchPromises);
                    processedCount += batchKeys.length;
                  }

                  if (hasValidBalanceOverall) {
                    setFormData((prev) => ({
                      ...prev,
                      balance: {
                        amount: totalBalance,
                        currency: currency,
                        lastUpdated: new Date().toISOString(),
                      },
                    }));
                    showToast(
                      `所有余额刷新完成，当前渠道总额度：${currency} ${totalBalance.toFixed(
                        2,
                      )}`,
                    );
                  } else {
                    setFormData((prev) => ({ ...prev, balance: undefined }));
                    showToast("所有余额刷新完成，未查询到有效额度信息。");
                  }
                }}
                bordered
              />
              <IconButton
                text={Locale.CustomProvider.RemoveInvalidKey}
                onClick={removeInvalidKeys}
                bordered
              />
            </div>
          </div>

          <div className={styles.keyListScroll}>
            {filteredKeys.length === 0 ? (
              <div className={styles.emptyKeys}>
                {keyList.length === 0
                  ? "No API keys added. Add your first key above."
                  : `No keys matching "${newKey}"`}
              </div>
            ) : (
              <div className={styles.keyList}>
                {filteredKeys.map((key, index) => (
                  <KeyItem
                    key={index}
                    onDelete={removeKeyFromList}
                    index={keyList.indexOf(key)}
                    apiKey={key}
                    baseUrl={formData.baseUrl}
                    type={formData.type}
                    externalBalance={keyBalances[key]}
                    externalLoading={loadingKeyBalances[key]}
                    testResult={testResults[key]}
                    isTesting={testingKeys[key]}
                    onTest={() => testKeyConnectivity(key)}
                    isDisabled={formData.disableKeyList?.includes(key)}
                    onToggleDisable={() => toggleKeyDisableStatus(key)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div className={styles.apiKeyNormalView}>
          <PasswordInput
            value={formData.apiKey}
            type="text"
            placeholder={Locale.CustomProvider.ApiKeyPlaceholder}
            onChange={(e) => handleChange("apiKey", e.currentTarget.value)}
            required
          />
        </div>
      );
    }
  };

  // 模型网格排序和过滤
  const filteredModels = models
    .filter((model) => {
      // 过滤无效模型
      const hasValidName =
        typeof model.name === "string" && model.name.trim() !== "";
      if (!hasValidName) return false;

      // 如果没有搜索关键词，直接通过
      if (!modelSearchTerm) return true;

      const lowerName = model.name.toLowerCase();
      const lowerSearchTerm = modelSearchTerm.toLowerCase();

      if (lowerName.includes(lowerSearchTerm)) {
        return true;
      }
      try {
        const regex = new RegExp(modelSearchTerm, "i");
        return regex.test(model.name);
      } catch (e) {
        console.error(`Invalid regex: ${modelSearchTerm}`, e);
        return false;
      }
    })
    .sort((a, b) => {
      // 在 step 2 中且已完成初始排序，不再排序
      if (currentStep === 2 && initialSortDone) {
        return 0;
      }

      if (a.available && !b.available) return -1;
      if (!a.available && b.available) return 1;
      return a.name.localeCompare(b.name);
    });

  // 添加模型测试状态管理
  const [modelTestStatus, setModelTestStatus] = useState<
    Record<
      string,
      {
        status: "idle" | "testing" | "success" | "error";
        result?: string;
        time?: number;
      }
    >
  >({});
  // 测试模型可用性
  const testModelAvailability = async (model: Model, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡，避免触发选择模型
    const modelName = model.name;

    // 更新状态为测试中
    setModelTestStatus((prev) => ({
      ...prev,
      [modelName]: { status: "testing" },
    }));
    try {
      const startTime = Date.now();

      // 使用第一个API Key进行测试
      const apiKey = formData.apiKey.split(",")[0].trim();

      // 准备测试请求
      const testMessage = {
        role: "user",
        content: "Hello. Please respond with 'OK'.",
      };
      let completionPath = formData.paths?.ChatPath || "/v1/chat/completions";

      // 根据 useProxy 决定请求 URL 和 headers
      const requestUrl = formData.useProxy
        ? `/api/custom-proxy${completionPath}`
        : `${formData.baseUrl}${completionPath}`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
      if (formData.useProxy && formData.baseUrl) {
        headers["X-Proxy-Target"] = formData.baseUrl;
      }

      // 发送非流式请求
      const response = await fetchWithTimeout(
        requestUrl,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: modelName,
            messages: [testMessage],
            max_tokens: 20,
            stream: false,
          }),
        },
        10000, // 设置超时时间为10秒
      );

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.ok) {
        // 测试成功
        setModelTestStatus((prev) => ({
          ...prev,
          [modelName]: {
            status: "success",
            result: `${responseTime}ms`,
            time: responseTime,
          },
        }));
      } else {
        // API返回错误
        const errorData = await response
          .json()
          .catch(() => ({ error: { message: "未知错误", code: "unknown" } }));
        const errorCode =
          errorData.error?.code ||
          errorData.error?.type ||
          `${response.status}`;
        const errorMessage =
          errorData.error?.message || `错误 ${response.status}`;

        showToast(`模型 ${modelName} 测试失败: ${errorMessage}`);

        setModelTestStatus((prev) => ({
          ...prev,
          [modelName]: {
            status: "error",
            result: errorCode,
          },
        }));
      }
    } catch (error) {
      // 请求异常
      console.error("测试模型失败:", error);
      let errorMsg = "请求失败";
      let errorCode = "Error";

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMsg = "请求超时";
          errorCode = "TIMEOUT";
        } else if (error.message.includes("timeout")) {
          errorMsg = "请求超时";
          errorCode = "TIMEOUT";
        } else {
          errorMsg = error.message;
          errorCode = error.name || "ERROR";
        }
      }
      showToast(`模型 ${modelName} 测试失败: ${errorMsg}`);

      setModelTestStatus((prev) => ({
        ...prev,
        [modelName]: {
          status: "error",
          result: errorCode,
        },
      }));
    }
  };
  // 带超时的请求函数
  const fetchWithTimeout = async (
    url: string,
    options: RequestInit,
    timeout = 10000,
  ) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  const toggleKeyDisableStatus = (key: string) => {
    setFormData((prev) => {
      // 创建副本以避免直接修改
      const enableList = [...(prev.enableKeyList || [])];
      const disableList = [...(prev.disableKeyList || [])];

      // 检查当前状态
      const isCurrentlyDisabled = disableList.includes(key);

      if (isCurrentlyDisabled) {
        // 如果已禁用，则移除禁用并添加到启用列表
        const newDisableList = disableList.filter((k) => k !== key);
        if (!enableList.includes(key)) {
          enableList.push(key);
        }

        showToast(`密钥已启用: ${key.substring(0, 10)}...`);

        return {
          ...prev,
          enableKeyList: enableList,
          disableKeyList: newDisableList,
        };
      } else {
        // 如果已启用，则移除启用并添加到禁用列表
        const newEnableList = enableList.filter((k) => k !== key);
        if (!disableList.includes(key)) {
          disableList.push(key);
        }

        showToast(`密钥已禁用: ${key.substring(0, 10)}...`);

        return {
          ...prev,
          enableKeyList: newEnableList,
          disableKeyList: disableList,
        };
      }
    });
  };

  return (
    <div className="modal-mask">
      <Modal
        title={
          props.provider
            ? Locale.CustomProvider.Edit
            : Locale.CustomProvider.AddProvider
        }
        defaultMax={true}
        onClose={handleClose}
        actions={[
          currentStep > 1 && !isJsonViewMode && (
            <IconButton
              key="prev"
              text={Locale.CustomProvider.Previous}
              onClick={prevStep}
              bordered
            />
          ),
          currentStep < 2 ? (
            <IconButton
              key="next"
              text={Locale.CustomProvider.Next}
              onClick={nextStep}
              bordered
            />
          ) : null,
          currentStep === 1 && (
            <IconButton
              key="keyViewToggle"
              text={
                isKeyListViewMode
                  ? Locale.CustomProvider.NormalView
                  : Locale.CustomProvider.KeyListView
              }
              onClick={() => {
                if (!isKeyListViewMode) {
                  // 切换到密钥列表视图时，将当前输入解析到keyList
                  const newApiKey = keyList.join(",");
                  setFormData((prev) => ({ ...prev, apiKey: newApiKey }));
                } else {
                  // 切换回普通视图时，将keyList合并为字符串
                  setKeyList(() => {
                    const en = (formData.enableKeyList || [])
                      .map((k) => k.trim())
                      .filter(Boolean);
                    const dis = (formData.disableKeyList || [])
                      .map((k) => k.trim())
                      .filter(Boolean);
                    if (en.length > 0 || dis.length > 0) {
                      const disSet = new Set(dis);
                      const enPruned = en.filter((k) => !disSet.has(k));
                      return Array.from(new Set([...enPruned, ...dis]));
                    }
                    return (formData.apiKey || "")
                      .split(/[\s,]+/)
                      .map((k) => k.trim())
                      .filter(Boolean);
                  });
                }
                setIsKeyListViewMode(!isKeyListViewMode);
              }}
              bordered
            />
          ),
          currentStep === 2 && (
            <IconButton
              key="viewToggle"
              text={
                isJsonViewMode
                  ? Locale.CustomProvider.EditModel.CardView
                  : Locale.CustomProvider.EditModel.JsonView
              }
              onClick={() => setIsJsonViewMode(!isJsonViewMode)}
              bordered
            />
          ),

          // 在JSON视图模式下显示应用按钮
          currentStep === 2 && isJsonViewMode && (
            <IconButton
              key="applyJson"
              text={Locale.CustomProvider.EditModel.ApplyJson}
              // type="primary"
              onClick={applyDisplayNameMap}
              bordered
            />
          ),

          // 保存按钮 - 在JSON视图模式下不显示
          !isJsonViewMode && (
            <IconButton
              key="save"
              text={
                props.provider
                  ? Locale.CustomProvider.SaveChanges
                  : Locale.CustomProvider.AddProvider
              }
              // type="primary"
              onClick={handleSubmit}
              bordered
            />
          ),
        ].filter(Boolean)}
      >
        <div className={styles.stepsContainer}>
          <div className={styles.steps}>
            <div
              className={`${styles.stepItem} ${
                currentStep === 1 ? styles.active : ""
              }`}
              onClick={() => setCurrentStep(1)}
            >
              <span className={styles.stepNumber}>1</span>
              <span className={styles.stepText}>
                {Locale.CustomProvider.BasicInfo}
              </span>
            </div>

            <div
              className={`${styles.stepItem} ${
                currentStep === 2 ? styles.active : ""
              } ${currentStep < 2 ? styles.disabled : ""}`}
              onClick={() => currentStep >= 2 && setCurrentStep(2)}
            >
              <span className={styles.stepNumber}>2</span>
              <span className={styles.stepText}>
                {Locale.CustomProvider.ModelConfig}
              </span>
            </div>
          </div>
        </div>
        {currentStep === 1 && (
          <List>
            <>
              <ListItem
                title={Locale.CustomProvider.Type}
                subTitle={Locale.CustomProvider.TypeSubtitle}
              >
                <Select
                  value={formData.type}
                  onChange={(e) => handleChange("type", e.target.value)}
                >
                  <option value="openai">OpenAI</option>
                  <option value="siliconflow">SiliconFlow</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="openrouter">OpenRouter</option>
                </Select>
              </ListItem>
              <ListItem
                title={Locale.CustomProvider.Name}
                subTitle={Locale.CustomProvider.NameSubtitle}
                vertical={isMobileScreen}
              >
                <input
                  className={styles.providerFormInput}
                  type="text"
                  value={formData.name}
                  placeholder={Locale.CustomProvider.NamePlaceholder}
                  onChange={(e) => handleChange("name", e.currentTarget.value)}
                  required
                />
              </ListItem>
              <ListItem
                title={Locale.CustomProvider.CustomAPIService}
                subTitle={Locale.CustomProvider.ApiUrlSubtitle}
                vertical={isMobileScreen}
              >
                <input
                  className={styles.providerFormInput}
                  type="text"
                  value={formData.baseUrl}
                  placeholder={providerTypeDefaultUrls[formData.type]}
                  onChange={(e) =>
                    handleChange("baseUrl", e.currentTarget.value)
                  }
                  required
                />
              </ListItem>
              <ListItem
                title={Locale.CustomProvider.advancedSettings.title}
                subTitle={Locale.CustomProvider.advancedSettings.subtitle}
              >
                <input
                  type="checkbox"
                  checked={showAdvancedSettings}
                  onChange={(e) => setShowAdvancedSettings(e.target.checked)}
                />
              </ListItem>
              {showAdvancedSettings && (
                <>
                  <ListItem
                    title={Locale.CustomProvider.chatPath.title}
                    subTitle={Locale.CustomProvider.chatPath.subtitle}
                    vertical={isMobileScreen}
                  >
                    <input
                      type="text"
                      className={styles.providerFormInput}
                      value={formData.paths?.ChatPath || ""}
                      placeholder="/v1/chat/completions"
                      onChange={(e) =>
                        handlePathChange("ChatPath", e.target.value)
                      }
                    />
                  </ListItem>

                  {/* <ListItem
                    title={Locale.CustomProvider.speechPath.title}
                    subTitle={Locale.CustomProvider.speechPath.subtitle}
                  >
                    <input
                      type="text"
                      className={styles.providerFormInput}
                      value={formData.paths?.SpeechPath || ""}
                      placeholder="/v1/audio/speech"
                      onChange={(e) => handlePathChange("SpeechPath", e.target.value)}
                    />
                  </ListItem>

                  <ListItem
                    title={Locale.CustomProvider.imagePath.title}
                    subTitle={Locale.CustomProvider.imagePath.subtitle}
                  >
                    <input
                      type="text"
                      className={styles.providerFormInput}
                      value={formData.paths?.ImagePath || ""}
                      placeholder="/v1/images/generations"
                      onChange={(e) => handlePathChange("ImagePath", e.target.value)}
                    />
                  </ListItem> */}

                  <ListItem
                    title={Locale.CustomProvider.listModelPath.title}
                    subTitle={Locale.CustomProvider.listModelPath.subtitle}
                    vertical={isMobileScreen}
                  >
                    <input
                      type="text"
                      className={styles.providerFormInput}
                      value={formData.paths?.ListModelPath || ""}
                      placeholder="/v1/models"
                      onChange={(e) =>
                        handlePathChange("ListModelPath", e.target.value)
                      }
                    />
                  </ListItem>
                </>
              )}

              {/* 服务器代理选项 - 独立于高级设置 */}
              <ListItem
                title="服务器代理"
                subTitle="通过服务器转发请求，解决跨域问题"
              >
                <input
                  type="checkbox"
                  checked={formData.useProxy || false}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      useProxy: e.target.checked,
                    }))
                  }
                />
              </ListItem>

              <ListItem
                title="API Key"
                subTitle={Locale.CustomProvider.ApiKeySubtitle}
                vertical={isKeyListViewMode || isMobileScreen}
                className={isKeyListViewMode ? uiStyles["force-vertical"] : ""}
              >
                {renderApiKeysSection()}
              </ListItem>
            </>
            {!isKeyListViewMode && (
              <div className={styles.intelligentParsingContainer}>
                <textarea
                  placeholder={Locale.CustomProvider.ParsingPlaceholder}
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  className={styles.parsingTextarea}
                />
                <div className={styles.parsingButtonContainer}>
                  <IconButton
                    text={Locale.CustomProvider.IntelligentParsing}
                    onClick={parseRawInput}
                    type="primary"
                  />
                </div>
              </div>
            )}
          </List>
        )}
        {currentStep === 2 && (
          <div className={styles.modelPullContainer}>
            {/* 搜索和操作区域 */}
            <div className={styles.modelFilter}>
              <input
                type="text"
                value={modelSearchTerm}
                placeholder={Locale.CustomProvider.SearchModel}
                className={styles.searchBar}
                onChange={(e) => setModelSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <div className={styles.actions}>
                <IconButton
                  text={Locale.Select.All}
                  bordered
                  onClick={() => {
                    if (modelSearchTerm) {
                      // 有搜索关键词时只选择筛选后的模型
                      setModels(
                        models.map((model) => ({
                          ...model,
                          available: filteredModels.some(
                            (m) => m.name === model.name,
                          ),
                        })),
                      );
                    } else {
                      // 没有搜索关键词时选择所有模型
                      setModels(
                        models.map((model) => ({ ...model, available: true })),
                      );
                    }
                  }}
                />
                <IconButton
                  text={Locale.Select.Clear}
                  bordered
                  onClick={() => {
                    if (modelSearchTerm) {
                      // 有搜索关键词时只清除筛选后的模型的选中状态
                      const filteredModelNames = new Set(
                        filteredModels.map((m) => m.name),
                      );
                      setModels(
                        models.map((model) => ({
                          ...model,
                          available:
                            model.available &&
                            !filteredModelNames.has(model.name),
                        })),
                      );
                      setModelSearchTerm("");
                    } else {
                      // 没有搜索关键词时清除所有模型的选中状态
                      setModels(
                        models.map((model) => ({ ...model, available: false })),
                      );
                    }
                  }}
                />
                <IconButton
                  text={Locale.CustomProvider.RefreshModels}
                  bordered
                  onClick={fetchModels}
                />
                <IconButton
                  text={Locale.CustomProvider.AddModels}
                  bordered
                  onClick={AddModels}
                />
                {/* 视图切换按钮组 */}
                <div className={styles.viewToggleGroup}>
                  <button
                    className={`${styles.viewToggleBtn} ${
                      modelViewMode === "list" ? styles.active : ""
                    }`}
                    onClick={() => setModelViewMode("list")}
                    title="列表视图"
                  >
                    列表
                  </button>
                  <button
                    className={`${styles.viewToggleBtn} ${
                      modelViewMode === "grid" ? styles.active : ""
                    }`}
                    onClick={() => setModelViewMode("grid")}
                    title="卡片视图"
                  >
                    卡片
                  </button>
                </div>
              </div>
            </div>

            {/* 模型列表容器 */}
            <div className={styles.modelListContainer}>
              {/* 加载状态 */}
              {isLoadingModels ? (
                <div className={styles.loadingModels}>
                  <LoadingIcon />
                  <span>{Locale.CustomProvider.LoadingModels}</span>
                </div>
              ) : isJsonViewMode ? (
                // JSON编辑视图 - 移除内部应用按钮
                <div style={{ padding: "10px" }}>
                  <div
                    style={{
                      marginBottom: "10px",
                      fontSize: "14px",
                      color: "#374151",
                    }}
                  >
                    {Locale.CustomProvider.EditModel.EditJson}
                  </div>
                  <textarea
                    value={displayNameMapText}
                    onChange={(e) => setDisplayNameMapText(e.target.value)}
                    style={{
                      width: "100%",
                      height: "250px",
                      padding: "12px",
                      borderRadius: "6px",
                      border: "1px solid #e5e7eb",
                      fontFamily: "monospace",
                      fontSize: "14px",
                      lineHeight: "1.5",
                      resize: "vertical",
                    }}
                  />
                </div>
              ) : filteredModels.length > 0 ? (
                /* 根据视图模式渲染 */
                modelViewMode === "list" ? (
                  /* 列表视图 */
                  <div className={styles.modelListView}>
                    {filteredModels.map((model) => (
                      <div
                        key={model.name}
                        className={`${styles.modelListItem} ${
                          model.available ? styles.selected : ""
                        }`}
                        onClick={() => toggleModelSelection(model.name)}
                      >
                        <div className={styles.modelListLeft}>
                          <div className={styles.modelCheckbox} />
                          <div className={styles.modelListInfo}>
                            <div className={styles.modelListName}>
                              {model.displayName || model.name}
                            </div>
                            {model.displayName &&
                              model.displayName !== model.name && (
                                <div className={styles.modelListOriginalName}>
                                  {model.name}
                                </div>
                              )}
                          </div>
                        </div>
                        <div className={styles.modelListRight}>
                          {/* 测试结果 */}
                          {modelTestStatus[model.name]?.status === "testing" ? (
                            <span
                              className={`${styles.modelListTestResult} ${styles.testing}`}
                            >
                              测试中...
                            </span>
                          ) : modelTestStatus[model.name]?.status ===
                            "success" ? (
                            <span
                              className={`${styles.modelListTestResult} ${styles.success}`}
                            >
                              {modelTestStatus[model.name]?.result}
                            </span>
                          ) : modelTestStatus[model.name]?.status ===
                            "error" ? (
                            <span
                              className={`${styles.modelListTestResult} ${styles.error}`}
                              title={modelTestStatus[model.name]?.result}
                            >
                              失败
                            </span>
                          ) : null}
                          {/* 测试按钮 */}
                          <div
                            className={styles.modelTestIcon}
                            onClick={(e) => testModelAvailability(model, e)}
                            title="测试模型可用性"
                          >
                            {modelTestStatus[model.name]?.status ===
                            "testing" ? (
                              <LoadingIcon />
                            ) : (
                              <span className={styles.testIcon}>Test</span>
                            )}
                          </div>
                          {/* 视觉开关 */}
                          <div
                            className={styles.visionToggle}
                            onClick={(e) => {
                              e.stopPropagation();
                              setModels(
                                models.map((m) =>
                                  m.name === model.name
                                    ? { ...m, enableVision: !m.enableVision }
                                    : m,
                                ),
                              );
                            }}
                            title={
                              model.enableVision
                                ? "关闭视觉支持"
                                : "开启视觉支持"
                            }
                          >
                            {model.enableVision ? (
                              <VisionIcon width="16" height="16" />
                            ) : (
                              <VisionOffIcon width="16" height="16" />
                            )}
                          </div>
                          {/* 编辑按钮 */}
                          <div
                            className={styles.modelEditButton}
                            onClick={(e) => handleEditDisplayName(model, e)}
                          >
                            Edit
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* 卡片网格视图 */
                  <div className={styles.modelGrid}>
                    {filteredModels.map((model) => (
                      <div
                        key={model.name}
                        className={`${styles.modelItem} ${
                          model.available ? styles.selected : ""
                        }`}
                        onClick={() => toggleModelSelection(model.name)}
                      >
                        <div className={styles.modelContent}>
                          <div className={styles.modelName} title={model.name}>
                            {model.displayName || model.name}
                          </div>
                        </div>
                        <div className={styles.modelFooter}>
                          <div
                            className={`${styles.modelTestIcon} ${
                              modelTestStatus[model.name]?.status === "testing"
                                ? styles.testing
                                : modelTestStatus[model.name]?.status ===
                                  "success"
                                ? styles.success
                                : modelTestStatus[model.name]?.status ===
                                  "error"
                                ? styles.error
                                : ""
                            }`}
                            onClick={(e) => testModelAvailability(model, e)}
                            title={
                              modelTestStatus[model.name]?.status === "success"
                                ? `响应时间: ${modelTestStatus[model.name]
                                    ?.result}`
                                : modelTestStatus[model.name]?.status ===
                                  "error"
                                ? `错误: ${modelTestStatus[model.name]?.result}`
                                : "测试模型可用性"
                            }
                          >
                            {modelTestStatus[model.name]?.status ===
                            "testing" ? (
                              <LoadingIcon />
                            ) : modelTestStatus[model.name]?.status ===
                              "success" ? (
                              <span className={styles.testResult}>
                                {modelTestStatus[model.name]?.result}
                              </span>
                            ) : modelTestStatus[model.name]?.status ===
                              "error" ? (
                              <span className={styles.testResult}>
                                {modelTestStatus[model.name]?.result}
                              </span>
                            ) : (
                              <span className={styles.testIcon}>Test</span>
                            )}
                          </div>
                          <div
                            className={styles.visionToggle}
                            onClick={(e) => {
                              e.stopPropagation();
                              setModels(
                                models.map((m) =>
                                  m.name === model.name
                                    ? { ...m, enableVision: !m.enableVision }
                                    : m,
                                ),
                              );
                            }}
                            title={
                              model.enableVision
                                ? "关闭视觉支持"
                                : "开启视觉支持"
                            }
                          >
                            {model.enableVision ? (
                              <VisionIcon width="16" height="16" />
                            ) : (
                              <VisionOffIcon width="16" height="16" />
                            )}
                          </div>
                          <div
                            className={styles.modelEditButton}
                            onClick={(e) => handleEditDisplayName(model, e)}
                          >
                            Edit
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className={styles.emptyModels}>
                  <p>{Locale.CustomProvider.NoModelsFound}</p>
                  <p>{Locale.CustomProvider.NoModelsFoundHint}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
      {editingModel && (
        <div className="modal-mask" style={{ zIndex: 2000 }}>
          <div className={styles.editNameModal}>
            <div className={styles.editNameHeader}>
              <h3>{Locale.CustomProvider.EditModel.EditModelFeature}</h3>
              <span
                className={styles.closeButton}
                onClick={() => setEditingModel(null)}
              >
                <CloseIcon />
              </span>
            </div>
            <div className={styles.editNameContent}>
              <div className={styles.editNameRow}>
                <label>
                  {Locale.CustomProvider.EditModel.ModelID}
                  {editingModel.name}
                </label>
              </div>
              <div className={styles.editNameRow}>
                <label>{Locale.CustomProvider.EditModel.DisplayName}</label>
                <input
                  type="text"
                  value={editedDisplayName}
                  onChange={(e) => setEditedDisplayName(e.target.value)}
                  placeholder={editingModel.name}
                  className={styles.displayNameInput}
                />
              </div>
              <div className={styles.editNameRow}>
                <label>{Locale.CustomProvider.EditModel.Description}</label>
                <input
                  type="text"
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="输入模型描述（可选）"
                  className={styles.displayNameInput}
                />
              </div>
              <div className={styles.editNameRow}>
                <div className={styles.visionSupportRow}>
                  <label>{Locale.CustomProvider.EditModel.VisionSupport}</label>
                  <div className={styles.toggleContainer}>
                    <div
                      className={`${styles.toggleSwitch} ${
                        editedEnableVision ? styles.active : ""
                      }`}
                      onClick={() => setEditedEnableVision(!editedEnableVision)}
                    >
                      <div className={styles.toggleSlider}></div>
                    </div>
                    <span className={styles.toggleLabel}>
                      {editedEnableVision ? "已启用" : "未启用"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.editNameFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setEditingModel(null)}
              >
                {Locale.CustomProvider.EditModel.Cancel}
              </button>
              <button className={styles.saveButton} onClick={saveDisplayName}>
                {Locale.CustomProvider.EditModel.Save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
