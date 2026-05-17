import { ServiceProvider, StoreKey } from "@/app/constant";
import { ModalConfigValidator, ModelConfig, useAccessStore } from "../store";

import Locale from "../locales";
import { InputRange } from "./input-range";
import { ListItem, Select } from "./ui-lib";
import { useModelTable } from "../context/model-table";
import { groupBy } from "lodash-es";
import { useState, useEffect } from "react";
import { Model } from "../client/api";

function findMatchingProvider(
  model: string,
  providername: string,
  groupModels: Record<string, any[]>,
): string {
  // 1. 首先尝试直接匹配providername
  if (groupModels[providername]) {
    // 检查这个provider下是否有匹配的model
    const hasMatchingModel = groupModels[providername].some(
      (m) => m.name === model || m.displayName === model,
    );
    if (hasMatchingModel) {
      return providername;
    }
  }

  // 2. 尝试用model名称作为providername
  if (groupModels[model]) {
    return model;
  }

  // 3. 遍历所有groupModels查找匹配的model
  for (const [providerKey, models] of Object.entries(groupModels)) {
    if (models.some((m) => m.name === model || m.displayName === model)) {
      return providerKey;
    }
  }

  // 4. 如果都没找到，返回原始providername
  return providername;
}
function isModelAvailable(
  model: string,
  providerName: string,
  allModels: Model[],
): boolean {
  const modelInfo = allModels.find(
    (m) => m.name === model && m.provider?.providerName === providerName,
  );
  return modelInfo ? modelInfo.available : false;
}
export function ModelConfigList(props: {
  modelConfig: ModelConfig;
  updateConfig: (updater: (config: ModelConfig) => void) => void;
}) {
  const allModels = useModelTable();
  const groupModels = groupBy(
    allModels.filter((v) => v.available),
    "provider.providerName",
  );
  // const value = `${props.modelConfig.model}@${props.modelConfig?.providerName}`;
  // let compressModelValue = compressModel ?
  //   `${compressModelName}@${compressModelProviderName}` :
  //   `${props.modelConfig.compressModel}@${props.modelConfig?.compressProviderName}`;
  // console.log("[model-config] compressModelValue", compressModelValue);

  const accessStore = useAccessStore();
  // 创建状态变量来存储模型值
  const [chatModelValue, setChatModelValue] = useState<string>(
    props.modelConfig.model || accessStore.defaultModel,
  );
  const [compressModelValue, setCompressModelValue] = useState<string>(
    props.modelConfig.compressModel || accessStore.compressModel,
  );
  const [textProcessModelValue, setTextProcessModelValue] = useState<string>(
    props.modelConfig.textProcessModel || accessStore.textProcessModel,
  );
  const [ocrModelValue, setOcrModelValue] = useState<string>(
    props.modelConfig.ocrModel || accessStore.ocrModel,
  );

  useEffect(() => {
    const { updateConfig, modelConfig } = props;

    const [chatModel, chatProviderName] = chatModelValue.split(/@(?=[^@]*$)/);
    const matchedChatProviderName = findMatchingProvider(
      chatModel,
      chatProviderName,
      groupModels,
    );
    updateConfig((config) => {
      config.model = ModalConfigValidator.model(chatModel);
      config.providerName = matchedChatProviderName as ServiceProvider;
    });
    setChatModelValue(`${chatModel}@${matchedChatProviderName}`);

    const [compressModel, compressProviderName] =
      compressModelValue.split(/@(?=[^@]*$)/);
    const matchedCompressProviderName = findMatchingProvider(
      compressModel,
      compressProviderName,
      groupModels,
    );
    updateConfig((config) => {
      config.compressModel = ModalConfigValidator.model(compressModel);
      config.compressProviderName =
        matchedCompressProviderName as ServiceProvider;
    });
    setCompressModelValue(`${compressModel}@${matchedCompressProviderName}`);

    const [ocrModel, ocrProviderName] = ocrModelValue.split(/@(?=[^@]*$)/);
    const matchedOcrProviderName = findMatchingProvider(
      ocrModel,
      ocrProviderName,
      groupModels,
    );
    updateConfig((config) => {
      config.ocrModel = ModalConfigValidator.model(ocrModel);
      config.ocrProviderName = matchedOcrProviderName as ServiceProvider;
    });
    setOcrModelValue(`${ocrModel}@${matchedOcrProviderName}`);

    const [textProcessModel, textProcessProviderName] =
      textProcessModelValue.split(/@(?=[^@]*$)/);
    const matchedTextProcessProviderName = findMatchingProvider(
      textProcessModel,
      textProcessProviderName,
      groupModels,
    );
    updateConfig((config) => {
      config.textProcessModel = ModalConfigValidator.model(textProcessModel);
      config.textProcessProviderName =
        matchedTextProcessProviderName as ServiceProvider;
    });
    setTextProcessModelValue(
      `${textProcessModel}@${matchedTextProcessProviderName}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chatModelValue,
    compressModelValue,
    ocrModelValue,
    textProcessModelValue,
  ]);

  return (
    <>
      <ListItem
        title={Locale.Settings.Model}
        className="mobile-vertical"
        vertical={true}
      >
        <Select
          aria-label={Locale.Settings.Model}
          value={chatModelValue}
          align="left"
          onChange={(e) => {
            const value = e.currentTarget.value;
            setChatModelValue(value);
            // saveModelConfig("chatModel", value);

            const [model, providerName] = value.split(/@(?=[^@]*$)/);
            props.updateConfig((config) => {
              config.model = ModalConfigValidator.model(model);
              config.providerName = providerName as ServiceProvider;
            });
          }}
        >
          {accessStore.defaultModel && (
            <option value={accessStore.defaultModel}>
              【Default】{accessStore.defaultModel}
            </option>
          )}
          {Object.keys(groupModels).map((providerName, index) => (
            <optgroup label={providerName} key={index}>
              {groupModels[providerName].map((v, i) => (
                <option value={`${v.name}@${v.provider?.providerName}`} key={i}>
                  {v.displayName}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </ListItem>
      <ListItem
        title={Locale.Settings.CompressModel.Title}
        subTitle={Locale.Settings.CompressModel.SubTitle}
        className="mobile-vertical"
        vertical={true}
      >
        <Select
          aria-label={Locale.Settings.CompressModel.Title}
          value={compressModelValue}
          align="left"
          onChange={(e) => {
            const value = e.currentTarget.value;
            setCompressModelValue(value);
            // saveModelConfig("compressModel", value);

            const [model, providerName] = value.split(/@(?=[^@]*$)/);

            props.updateConfig((config) => {
              config.compressModel = ModalConfigValidator.model(model);
              config.compressProviderName = providerName as ServiceProvider;
            });
          }}
        >
          {accessStore.compressModel && (
            <option value={accessStore.compressModel}>
              【Default】{accessStore.compressModel}
            </option>
          )}
          {Object.keys(groupModels).map((providerName, index) => (
            <optgroup label={providerName} key={index}>
              {groupModels[providerName].map((v, i) => (
                <option value={`${v.name}@${v.provider?.providerName}`} key={i}>
                  {v.displayName}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </ListItem>

      {/* 添加翻译模型选择器 */}
      <ListItem
        title={Locale.Settings.TextProcessModel.Title}
        subTitle={Locale.Settings.TextProcessModel.SubTitle}
        className="mobile-vertical"
        vertical={true}
      >
        <Select
          aria-label={Locale.Settings.TextProcessModel.Title}
          value={textProcessModelValue}
          align="left"
          onChange={(e) => {
            const value = e.currentTarget.value;
            setTextProcessModelValue(value);
            // saveModelConfig("textProcessModel", value);

            const [model, providerName] = value.split(/@(?=[^@]*$)/);
            props.updateConfig((config) => {
              config.textProcessModel = ModalConfigValidator.model(model);
              config.textProcessProviderName = providerName as ServiceProvider;
            });
          }}
        >
          {accessStore.textProcessModel && (
            <option value={accessStore.textProcessModel}>
              【Default】{accessStore.textProcessModel}
            </option>
          )}
          {Object.keys(groupModels).map((providerName, index) => (
            <optgroup label={providerName} key={index}>
              {groupModels[providerName].map((v, i) => (
                <option value={`${v.name}@${v.provider?.providerName}`} key={i}>
                  {v.displayName}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </ListItem>

      {/* 添加OCR模型选择器 */}
      <ListItem
        title={Locale.Settings.OCRModel.Title}
        subTitle={Locale.Settings.OCRModel.SubTitle}
        className="mobile-vertical"
        vertical={true}
      >
        <Select
          aria-label={Locale.Settings.OCRModel.Title}
          value={ocrModelValue}
          align="left"
          onChange={(e) => {
            const value = e.currentTarget.value;
            setOcrModelValue(value);
            // saveModelConfig("ocrModel", value);

            const [model, providerName] = value.split(/@(?=[^@]*$)/);
            props.updateConfig((config) => {
              config.ocrModel = ModalConfigValidator.model(model);
              config.ocrProviderName = providerName as ServiceProvider;
            });
          }}
        >
          {accessStore.ocrModel && (
            <option value={accessStore.ocrModel}>
              【Default】{accessStore.ocrModel}
            </option>
          )}
          {Object.keys(groupModels).map((providerName, index) => (
            <optgroup label={providerName} key={index}>
              {groupModels[providerName].map((v, i) => (
                <option value={`${v.name}@${v.provider?.providerName}`} key={i}>
                  {v.displayName}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </ListItem>

      <ListItem
        title={Locale.Settings.StreamUsageEnable.Title}
        subTitle={Locale.Settings.StreamUsageEnable.SubTitle}
      >
        <input
          aria-label={Locale.Settings.StreamUsageEnable.Title}
          type="checkbox"
          checked={props.modelConfig.enableStreamUsageOptions}
          onChange={(e) =>
            props.updateConfig(
              (config) =>
                (config.enableStreamUsageOptions = e.currentTarget.checked),
            )
          }
        ></input>
      </ListItem>
      {/* <ListItem
        title={Locale.Settings.EnableStream.Title}
        subTitle={Locale.Settings.EnableStream.SubTitle}
      >
        <input
          aria-label={Locale.Settings.EnableStream.Title}
          type="checkbox"
          checked={props.modelConfig.enableStream}
          onChange={(e) =>
            props.updateConfig(
              (config) =>
                (config.enableStream = e.currentTarget.checked),
            )
          }
        ></input>
      </ListItem> */}
      <ListItem
        title={Locale.Settings.RequestTimeout.Title}
        subTitle={Locale.Settings.RequestTimeout.SubTitle}
      >
        <input
          aria-label={Locale.Settings.RequestTimeout.Title}
          type="number"
          min={5}
          max={4000}
          value={props.modelConfig.requestTimeout || 300}
          onChange={(e) =>
            props.updateConfig(
              (config) =>
                (config.requestTimeout = e.currentTarget.valueAsNumber),
            )
          }
        ></input>
      </ListItem>
      <ListItem
        title={Locale.Settings.Temperature.Title}
        subTitle={Locale.Settings.Temperature.SubTitle}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <input
            aria-label={Locale.Settings.Temperature.Title}
            type="number"
            // min={0}
            // max={1}
            value={props.modelConfig.temperature}
            disabled={!props.modelConfig.temperature_enabled}
            style={{
              width: "80px",
              backgroundColor: props.modelConfig.temperature_enabled
                ? "inherit"
                : "#e0e0e0",
            }}
            onChange={(e) => {
              props.updateConfig((config) => {
                config.temperature = ModalConfigValidator.temperature(
                  e.currentTarget.valueAsNumber,
                );
              });
            }}
          />
          <input
            type="checkbox"
            checked={props.modelConfig.temperature_enabled}
            onChange={(e) =>
              props.updateConfig((config) => {
                config.temperature_enabled = e.currentTarget.checked;
              })
            }
          />
        </div>
      </ListItem>
      <ListItem
        title={Locale.Settings.TopP.Title}
        subTitle={Locale.Settings.TopP.SubTitle}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <input
            aria-label={Locale.Settings.TopP.Title}
            type="number"
            // min={0}
            // max={1}
            value={props.modelConfig.top_p ?? 1}
            disabled={!props.modelConfig.top_p_enabled}
            style={{
              width: "80px",
              backgroundColor: props.modelConfig.top_p_enabled
                ? "inherit"
                : "#e0e0e0",
            }}
            onChange={(e) => {
              props.updateConfig((config) => {
                config.top_p = ModalConfigValidator.top_p(
                  e.currentTarget.valueAsNumber,
                );
              });
            }}
          />
          <input
            type="checkbox"
            checked={props.modelConfig.top_p_enabled}
            onChange={(e) =>
              props.updateConfig((config) => {
                config.top_p_enabled = e.currentTarget.checked;
              })
            }
          />
        </div>
      </ListItem>
      <ListItem
        title={Locale.Settings.MaxTokens.Title}
        subTitle={Locale.Settings.MaxTokens.SubTitle}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <input
            aria-label={Locale.Settings.MaxTokens.Title}
            type="number"
            min={10}
            max={512000}
            value={props.modelConfig.max_tokens}
            disabled={!props.modelConfig.max_tokens_enabled}
            style={{
              width: "80px",
              backgroundColor: props.modelConfig.max_tokens_enabled
                ? "inherit"
                : "#e0e0e0",
            }}
            onChange={(e) =>
              props.updateConfig((config) => {
                config.max_tokens = ModalConfigValidator.max_tokens(
                  e.currentTarget.valueAsNumber,
                );
              })
            }
          />
          <input
            type="checkbox"
            checked={props.modelConfig.max_tokens_enabled}
            onChange={(e) =>
              props.updateConfig((config) => {
                config.max_tokens_enabled = e.currentTarget.checked;
              })
            }
          />
        </div>
      </ListItem>

      {props.modelConfig?.providerName == ServiceProvider.Google ? null : (
        <>
          <ListItem
            title={Locale.Settings.PresencePenalty.Title}
            subTitle={Locale.Settings.PresencePenalty.SubTitle}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <input
                aria-label={Locale.Settings.PresencePenalty.Title}
                type="number"
                min={-2}
                max={2}
                value={props.modelConfig.presence_penalty}
                disabled={!props.modelConfig.presence_penalty_enabled}
                style={{
                  width: "80px",
                  backgroundColor: props.modelConfig.presence_penalty_enabled
                    ? "inherit"
                    : "#e0e0e0",
                }}
                onChange={(e) => {
                  props.updateConfig((config) => {
                    config.presence_penalty =
                      ModalConfigValidator.presence_penalty(
                        e.currentTarget.valueAsNumber,
                      );
                  });
                }}
              />
              <input
                type="checkbox"
                checked={props.modelConfig.presence_penalty_enabled}
                onChange={(e) =>
                  props.updateConfig((config) => {
                    config.presence_penalty_enabled = e.currentTarget.checked;
                  })
                }
              />
            </div>
          </ListItem>

          <ListItem
            title={Locale.Settings.FrequencyPenalty.Title}
            subTitle={Locale.Settings.FrequencyPenalty.SubTitle}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <input
                aria-label={Locale.Settings.FrequencyPenalty.Title}
                type="number"
                min={-2}
                max={2}
                value={props.modelConfig.frequency_penalty}
                disabled={!props.modelConfig.frequency_penalty_enabled}
                style={{
                  width: "80px",
                  backgroundColor: props.modelConfig.frequency_penalty_enabled
                    ? "inherit"
                    : "#e0e0e0",
                }}
                onChange={(e) => {
                  props.updateConfig((config) => {
                    config.frequency_penalty =
                      ModalConfigValidator.frequency_penalty(
                        e.currentTarget.valueAsNumber,
                      );
                  });
                }}
              />
              <input
                type="checkbox"
                checked={props.modelConfig.frequency_penalty_enabled}
                onChange={(e) =>
                  props.updateConfig((config) => {
                    config.frequency_penalty_enabled = e.currentTarget.checked;
                  })
                }
              />
            </div>
          </ListItem>

          <ListItem
            title={Locale.Settings.InjectSystemPrompts.Title}
            subTitle={Locale.Settings.InjectSystemPrompts.SubTitle}
          >
            <input
              aria-label={Locale.Settings.InjectSystemPrompts.Title}
              type="checkbox"
              checked={props.modelConfig.enableInjectSystemPrompts}
              onChange={(e) =>
                props.updateConfig(
                  (config) =>
                    (config.enableInjectSystemPrompts =
                      e.currentTarget.checked),
                )
              }
            ></input>
          </ListItem>

          <ListItem
            title={Locale.Settings.SendReasoningContent.Title}
            subTitle={Locale.Settings.SendReasoningContent.SubTitle}
          >
            <input
              aria-label={Locale.Settings.SendReasoningContent.Title}
              type="checkbox"
              checked={!!props.modelConfig.sendReasoningContent}
              onChange={(e) =>
                props.updateConfig(
                  (config) =>
                    (config.sendReasoningContent = e.currentTarget.checked),
                )
              }
            ></input>
          </ListItem>

          <ListItem
            title={Locale.Settings.InputTemplate.Title}
            subTitle={Locale.Settings.InputTemplate.SubTitle}
          >
            <input
              aria-label={Locale.Settings.InputTemplate.Title}
              type="text"
              value={props.modelConfig.template}
              onChange={(e) =>
                props.updateConfig(
                  (config) => (config.template = e.currentTarget.value),
                )
              }
            ></input>
          </ListItem>
        </>
      )}
      <ListItem
        title={Locale.Settings.HistoryCount.Title}
        subTitle={Locale.Settings.HistoryCount.SubTitle}
      >
        <input
          aria-label={Locale.Settings.HistoryCount.Title}
          type="number"
          min={0}
          max={64}
          value={props.modelConfig.historyMessageCount}
          onChange={(e) =>
            props.updateConfig(
              (config) =>
                (config.historyMessageCount = e.currentTarget.valueAsNumber),
            )
          }
        />
      </ListItem>

      <ListItem
        title={Locale.Settings.CompressThreshold.Title}
        subTitle={Locale.Settings.CompressThreshold.SubTitle}
      >
        <input
          aria-label={Locale.Settings.CompressThreshold.Title}
          type="number"
          min={500}
          max={4000}
          value={props.modelConfig.compressMessageLengthThreshold}
          onChange={(e) =>
            props.updateConfig(
              (config) =>
                (config.compressMessageLengthThreshold =
                  e.currentTarget.valueAsNumber),
            )
          }
        ></input>
      </ListItem>
      <ListItem title={Locale.Memory.Title} subTitle={Locale.Memory.Send}>
        <input
          aria-label={Locale.Memory.Title}
          type="checkbox"
          checked={props.modelConfig.sendMemory}
          onChange={(e) =>
            props.updateConfig(
              (config) => (config.sendMemory = e.currentTarget.checked),
            )
          }
        ></input>
      </ListItem>
      <ListItem
        title={Locale.Settings.ReasoningEffort.Title}
        subTitle={Locale.Settings.ReasoningEffort.SubTitle}
      >
        <Select
          aria-label={Locale.Settings.ReasoningEffort.Title}
          value={props.modelConfig.reasoning_effort || "none"} // 默认值，如果未设置则为 'none'
          align="left"
          onChange={(e) => {
            const value = e.currentTarget.value; // 获取选中的值
            props.updateConfig((config) => {
              config.reasoning_effort = value; // 更新配置
            });
          }}
        >
          <option value="low">low</option>
          <option value="high">high</option>
          <option value="none">none</option>
        </Select>
      </ListItem>
      {/* Parameter Override feature */}
      <ListItem
        title={Locale.Settings.ParameterOverride.Title}
        subTitle={Locale.Settings.ParameterOverride.SubTitle}
        className="mobile-vertical"
        vertical={true}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              justifyContent: "flex-end",
            }}
          >
            <textarea
              placeholder='{"stream": false, "temperature": 0.8}'
              value={props.modelConfig.paramOverrideContent || ""}
              rows={3}
              style={{
                width: "100%",
                resize: "vertical",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                backgroundColor: props.modelConfig.enableParamOverride
                  ? "inherit"
                  : "#f0f0f0",
                opacity: props.modelConfig.enableParamOverride ? 1 : 0.7,
                transition: "all 0.3s ease",
                marginRight: "8px",
              }}
              disabled={!props.modelConfig.enableParamOverride}
              onChange={(e) => {
                const content = e.currentTarget.value;
                props.updateConfig((config) => {
                  config.paramOverrideContent = content;

                  // Apply JSON parameters if enabled and valid
                  if (config.enableParamOverride && content) {
                    try {
                      const overrideParams = JSON.parse(content);
                      Object.assign(config, overrideParams);
                    } catch (error) {
                      // Just store the content even if invalid JSON
                    }
                  }
                });
              }}
            />
            <input
              type="checkbox"
              checked={props.modelConfig.enableParamOverride || false}
              onChange={(e) => {
                const isEnabled = e.currentTarget.checked;
                props.updateConfig((config) => {
                  config.enableParamOverride = isEnabled;

                  // Apply JSON parameters if enabled and valid JSON exists
                  if (isEnabled && config.paramOverrideContent) {
                    try {
                      const overrideParams = JSON.parse(
                        config.paramOverrideContent,
                      );
                      Object.assign(config, overrideParams);
                    } catch (error) {
                      console.error(
                        "Failed to parse parameter override JSON:",
                        error,
                      );
                    }
                  }
                });
              }}
            />
          </div>

          {props.modelConfig.enableParamOverride &&
            props.modelConfig.paramOverrideContent && (
              <div
                style={{
                  fontSize: "0.75em",
                  marginTop: "2px",
                  width: "55%",
                  textAlign: "left",
                  color: (() => {
                    try {
                      JSON.parse(props.modelConfig.paramOverrideContent);
                      return "#10a37f"; // Success color
                    } catch (e) {
                      return "#e53e3e"; // Error color
                    }
                  })(),
                }}
              >
                {(() => {
                  try {
                    JSON.parse(props.modelConfig.paramOverrideContent);
                    return Locale.Settings.ParameterOverride.ValidJson;
                  } catch (e) {
                    return Locale.Settings.ParameterOverride.InvalidJson;
                  }
                })()}
              </div>
            )}
        </div>
      </ListItem>
    </>
  );
}
