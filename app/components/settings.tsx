import { useState, useEffect, useMemo } from "react";

import styles from "./settings.module.scss";
import { useCustomCssStore } from "../store/customCss";

import ResetIcon from "../icons/reload.svg";
import AddIcon from "../icons/add.svg";
import CloseIcon from "../icons/close.svg";
import CopyIcon from "../icons/copy.svg";
import ClearIcon from "../icons/clear.svg";
import LoadingIcon from "../icons/three-dots.svg";
import EditIcon from "../icons/edit.svg";
import EyeIcon from "../icons/eye.svg";
import DownloadIcon from "../icons/download.svg";
import UploadIcon from "../icons/upload.svg";
import ConfigIcon from "../icons/config.svg";
import ConfirmIcon from "../icons/confirm.svg";
import DownIcon from "../icons/down.svg";

import ConnectionIcon from "../icons/connection.svg";
import CloudSuccessIcon from "../icons/cloud-success.svg";
import CloudFailIcon from "../icons/cloud-fail.svg";
import CustomProviderIcon from "../icons/custom-models.svg";

import {
  Input,
  List,
  ListItem,
  Modal,
  PasswordInput,
  Popover,
  Select,
  showConfirm,
  showToast,
} from "./ui-lib";
import { ModelConfigList } from "./model-config";

import { IconButton } from "./button";
import {
  SubmitKey,
  useChatStore,
  Theme,
  useUpdateStore,
  useAccessStore,
  useAppConfig,
  useCustomProviderStore,
} from "../store";

import Locale, {
  AllLangs,
  ALL_LANG_OPTIONS,
  changeLang,
  getLang,
} from "../locales";
import { copyToClipboard } from "../utils";
import Link from "next/link";
import {
  Anthropic,
  Azure,
  Google,
  OPENAI_BASE_URL,
  Path,
  RELEASE_URL,
  STORAGE_KEY,
  ServiceProvider,
  SlotID,
  UPDATE_URL,
  THEME_REPO_URL,
} from "../constant";
import { Prompt, SearchService, usePromptStore } from "../store/prompt";
import {
  TextExpansionRule,
  useExpansionRulesStore,
} from "../store/expansionRules";
import { ErrorBoundary } from "./error";
import { InputRange } from "./input-range";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarPicker } from "./emoji";
import { getClientConfig } from "../config/client";
import { useSyncStore } from "../store/sync";
import { nanoid } from "nanoid";
import { useMaskStore } from "../store/mask";
import { ProviderType } from "../utils/cloud";
import { TTSConfigList } from "./tts-config";

// 设置页面的分类枚举
enum SettingsTab {
  General = "general",
  ModelService = "model-service",
  Sync = "sync",
  QuickInput = "quick-input",
  Voice = "voice",
}

function CustomCssModal(props: { onClose?: () => void }) {
  const customCss = useCustomCssStore();
  const [cssContent, setCssContent] = useState(customCss.content);

  const handleSave = () => {
    customCss.update((state) => {
      state.content = cssContent;
      state.lastUpdated = Date.now();
    });
    props.onClose?.();
  };
  const openThemeRepo = () => {
    window.open(THEME_REPO_URL, "_blank", "noopener");
  };

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Settings.CustomCSS.Title}
        onClose={() => props.onClose?.()}
        actions={[
          <IconButton
            key="theme-repo"
            text={Locale.Settings.CustomCSS.More}
            onClick={openThemeRepo}
            bordered
          />,
          <IconButton
            key="cancel"
            text={Locale.UI.Cancel}
            onClick={props.onClose}
            bordered
          />,
          <IconButton
            key="save"
            text={Locale.Chat.Actions.Save}
            type="primary"
            onClick={handleSave}
          />,
        ]}
      >
        <div className={styles["edit-prompt-modal"]}>
          <div className={styles["custom-css-hint"]}>
            {Locale.Settings.CustomCSS.Hint}
          </div>

          <Input
            value={cssContent}
            placeholder=":root { --primary: #4385f5; }"
            className={styles["edit-prompt-content"]}
            rows={15}
            onInput={(e) => setCssContent(e.currentTarget.value)}
          />
        </div>
      </Modal>
    </div>
  );
}

function EditPromptModal(props: { id: string; onClose: () => void }) {
  const promptStore = usePromptStore();
  const prompt = promptStore.get(props.id);

  return prompt ? (
    <div className="modal-mask">
      <Modal
        title={Locale.Settings.Prompt.EditModal.Title}
        onClose={props.onClose}
        actions={[
          <IconButton
            key=""
            onClick={props.onClose}
            text={Locale.UI.Confirm}
            bordered
          />,
        ]}
      >
        <div className={styles["edit-prompt-modal"]}>
          <input
            type="text"
            value={prompt.title}
            readOnly={!prompt.isUser}
            className={styles["edit-prompt-title"]}
            onInput={(e) =>
              promptStore.updatePrompt(
                props.id,
                (prompt) => (prompt.title = e.currentTarget.value),
              )
            }
          ></input>
          <Input
            value={prompt.content}
            readOnly={!prompt.isUser}
            className={styles["edit-prompt-content"]}
            rows={10}
            onInput={(e) =>
              promptStore.updatePrompt(
                props.id,
                (prompt) => (prompt.content = e.currentTarget.value),
              )
            }
          ></Input>
        </div>
      </Modal>
    </div>
  ) : null;
}

function ExpansionRulesModal(props: { onClose: () => void }) {
  const [editingRule, setEditingRule] =
    useState<Partial<TextExpansionRule> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const rulesStore = useExpansionRulesStore();
  const config = useAppConfig();
  const triggerPrefix = config.expansionTriggerPrefix;
  const userRules = rulesStore.getUserRules();
  const builtinRules = rulesStore.builtinRules;

  const toggleAllUserRules = (enable: boolean) => {
    userRules.forEach((rule) => {
      rulesStore.updateRule(rule.id, (r) => {
        r.enable = enable;
      });
    });
  };

  const toggleAllBuiltinRules = (enable: boolean) => {
    const newBuiltinRules = [...builtinRules];
    newBuiltinRules.forEach((rule, index) => {
      newBuiltinRules[index] = { ...rule, enable: enable };
    });
    rulesStore.setBuiltinRules(newBuiltinRules);
  };

  const createOrUpdateRule = () => {
    if (!editingRule || !editingRule.trigger || !editingRule.replacement)
      return;

    if (editingRule.id) {
      rulesStore.updateRule(editingRule.id, (rule) => {
        rule.trigger = editingRule.trigger || rule.trigger;
        rule.replacement = editingRule.replacement || rule.replacement;
        rule.description = editingRule.description || rule.description;
        rule.enable =
          editingRule.enable !== undefined ? editingRule.enable : rule.enable;
      });
    } else {
      rulesStore.addRule({
        trigger: editingRule.trigger,
        replacement: editingRule.replacement,
        description: editingRule.description || "",
        enable: editingRule.enable !== undefined ? editingRule.enable : true,
      });
    }

    setEditingRule(null);
    setIsCreating(false);
  };

  const toggleRuleStatus = (rule: TextExpansionRule) => {
    if (rule.isUser) {
      rulesStore.updateRule(rule.id, (r) => {
        r.enable = !r.enable;
      });
    } else {
      const newBuiltinRules = [...rulesStore.builtinRules];
      const ruleIndex = newBuiltinRules.findIndex((r) => r.id === rule.id);
      if (ruleIndex >= 0) {
        newBuiltinRules[ruleIndex] = {
          ...newBuiltinRules[ruleIndex],
          enable: !rule.enable,
        };
        rulesStore.setBuiltinRules(newBuiltinRules);
      }
    }
  };

  const deleteRule = (rule: TextExpansionRule) => {
    if (rule.isUser) {
      rulesStore.removeRule(rule.id);
    }
  };

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Settings.Expansion.Rules}
        onClose={props.onClose}
        actions={[
          <IconButton
            key="add"
            onClick={() => {
              setEditingRule({
                trigger: "",
                replacement: "",
                description: "",
                enable: true,
                isUser: true,
              });
              setIsCreating(true);
            }}
            icon={<AddIcon />}
            bordered
            text={Locale.Settings.Expansion.AddRule}
          />,
          <IconButton
            key="confirm"
            onClick={props.onClose}
            icon={<ConfirmIcon />}
            bordered
            text={Locale.UI.Confirm}
          />,
        ]}
      >
        <div className={styles["expansion-rules-container"]}>
          <div className={styles["expansion-rules-section"]}>
            <div className={styles["expansion-section-header"]}>
              <div className={styles["expansion-section-title"]}>
                {Locale.Settings.Expansion.UserRules}
              </div>
              <div className={styles["expansion-section-actions"]}>
                <button
                  onClick={() => toggleAllUserRules(true)}
                  className={styles["expansion-select-all"]}
                >
                  {Locale.Settings.Expansion.SelectAll}
                </button>
                <button
                  onClick={() => toggleAllUserRules(false)}
                  className={styles["expansion-deselect-all"]}
                >
                  {Locale.Settings.Expansion.UnselectAll}
                </button>
              </div>
            </div>

            {userRules.length === 0 ? (
              <div className={styles["expansion-empty"]}>
                {Locale.Settings.Expansion.NoUserRules}
              </div>
            ) : (
              <div className={styles["expansion-rules-list"]}>
                {userRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`${styles["list-item"]} ${
                      !rule.enable ? styles["disabled-rule"] : ""
                    }`}
                  >
                    <div className={styles["expansion-rule-content"]}>
                      <div className={styles["expansion-rule-title"]}>
                        {rule.trigger}
                      </div>
                      <div className={styles["expansion-rule-desc"]}>
                        {rule.description || rule.replacement}
                      </div>
                    </div>
                    <div className={styles["expansion-rule-actions"]}>
                      <input
                        type="checkbox"
                        checked={rule.enable}
                        onChange={() => toggleRuleStatus(rule)}
                      />
                      <IconButton
                        icon={<EditIcon />}
                        onClick={() => setEditingRule({ ...rule })}
                      />
                      <IconButton
                        icon={<ClearIcon />}
                        onClick={() => deleteRule(rule)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles["expansion-rules-section"]}>
            <div className={styles["expansion-section-header"]}>
              <div className={styles["expansion-section-title"]}>
                {Locale.Settings.Expansion.BuiltinRules}
              </div>
              <div className={styles["expansion-section-actions"]}>
                <button
                  onClick={() => toggleAllBuiltinRules(true)}
                  className={styles["expansion-select-all"]}
                >
                  {Locale.Settings.Expansion.SelectAll}
                </button>
                <button
                  onClick={() => toggleAllBuiltinRules(false)}
                  className={styles["expansion-deselect-all"]}
                >
                  {Locale.Settings.Expansion.UnselectAll}
                </button>
              </div>
            </div>

            <div className={styles["expansion-rules-list"]}>
              {builtinRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`${styles["list-item"]} ${
                    !rule.enable ? styles["disabled-rule"] : ""
                  }`}
                >
                  <div className={styles["expansion-rule-content"]}>
                    <div className={styles["expansion-rule-title"]}>
                      {rule.trigger.startsWith(":") && triggerPrefix !== ":"
                        ? triggerPrefix + rule.trigger.slice(1)
                        : rule.trigger}
                    </div>
                    <div className={styles["expansion-rule-desc"]}>
                      {rule.description || rule.replacement}
                    </div>
                  </div>
                  <div className={styles["expansion-rule-actions"]}>
                    <input
                      type="checkbox"
                      checked={rule.enable}
                      onChange={() => toggleRuleStatus(rule)}
                    />
                    <IconButton
                      icon={<EyeIcon />}
                      onClick={() =>
                        setEditingRule({
                          ...rule,
                          id: undefined,
                          isUser: false,
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {(editingRule || isCreating) && (
          <div className="modal-mask">
            <Modal
              title={
                isCreating
                  ? Locale.Settings.Expansion.AddRule
                  : Locale.Settings.Expansion.EditRule
              }
              onClose={() => {
                setEditingRule(null);
                setIsCreating(false);
              }}
              actions={[
                <IconButton
                  key="cancel"
                  text={Locale.UI.Cancel}
                  onClick={() => {
                    setEditingRule(null);
                    setIsCreating(false);
                  }}
                  bordered
                />,
                <IconButton
                  key="confirm"
                  text={Locale.UI.Confirm}
                  type="primary"
                  onClick={createOrUpdateRule}
                />,
              ]}
            >
              <List>
                <ListItem title={Locale.Settings.Expansion.Trigger}>
                  <Input
                    style={{ width: "300px" }}
                    value={editingRule?.trigger || ""}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditingRule((prev) =>
                        prev ? { ...prev, trigger: e.target.value } : null,
                      )
                    }
                  />
                </ListItem>
                <ListItem
                  title={Locale.Settings.Expansion.Replacement}
                  subTitle={Locale.Settings.Expansion.ReplacementHint}
                >
                  <Input
                    rows={4}
                    style={{ width: "300px" }}
                    value={editingRule?.replacement || ""}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditingRule((prev) =>
                        prev ? { ...prev, replacement: e.target.value } : null,
                      )
                    }
                  />
                </ListItem>
                <ListItem title={Locale.Settings.Expansion.Description}>
                  <Input
                    style={{ width: "300px" }}
                    value={editingRule?.description || ""}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditingRule((prev) =>
                        prev ? { ...prev, description: e.target.value } : null,
                      )
                    }
                  />
                </ListItem>
                <ListItem title={Locale.Settings.Expansion.Enabled}>
                  <input
                    type="checkbox"
                    checked={editingRule?.enable}
                    onChange={(e) =>
                      setEditingRule((prev) =>
                        prev ? { ...prev, enable: e.target.checked } : null,
                      )
                    }
                  />
                </ListItem>
              </List>
            </Modal>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CustomUserContinuePromptModal(props: { onClose?: () => void }) {
  const config = useAppConfig();
  const updateConfig = config.update;

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Settings.Prompt.CustomUserContinuePrompt.Title}
        onClose={() => props.onClose?.()}
        actions={[
          <IconButton
            key="primary"
            onClick={props.onClose}
            icon={<ConfirmIcon />}
            bordered
            text={Locale.UI.Confirm}
          />,
        ]}
      >
        <div className={styles["edit-prompt-modal"]}>
          <Input
            value={config.customUserContinuePrompt || ""}
            placeholder={Locale.Chat.InputActions.Continue.ContinuePrompt}
            className={styles["edit-prompt-content"]}
            rows={10}
            onInput={(e) =>
              updateConfig(
                (config) =>
                  (config.customUserContinuePrompt = e.currentTarget.value),
              )
            }
          ></Input>
        </div>
      </Modal>
    </div>
  );
}

function UserPromptModal(props: { onClose?: () => void }) {
  const promptStore = usePromptStore();
  const userPrompts = promptStore.getUserPrompts();
  const builtinPrompts = SearchService.builtinPrompts;
  const allPrompts = userPrompts.concat(builtinPrompts);
  const [searchInput, setSearchInput] = useState("");
  const [searchPrompts, setSearchPrompts] = useState<Prompt[]>([]);
  const prompts = searchInput.length > 0 ? searchPrompts : allPrompts;

  const [editingPromptId, setEditingPromptId] = useState<string>();

  useEffect(() => {
    if (searchInput.length > 0) {
      const searchResult = SearchService.search(searchInput);
      setSearchPrompts(searchResult);
    } else {
      setSearchPrompts([]);
    }
  }, [searchInput]);

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Settings.Prompt.Modal.Title}
        onClose={() => props.onClose?.()}
        actions={[
          <IconButton
            key="add"
            onClick={() => {
              const promptId = promptStore.add({
                id: nanoid(),
                createdAt: Date.now(),
                title: "Empty Prompt",
                content: "Empty Prompt Content",
              });
              setEditingPromptId(promptId);
            }}
            icon={<AddIcon />}
            bordered
            text={Locale.Settings.Prompt.Modal.Add}
          />,
        ]}
      >
        <div className={styles["user-prompt-modal"]}>
          <input
            type="text"
            className={styles["user-prompt-search"]}
            placeholder={Locale.Settings.Prompt.Modal.Search}
            value={searchInput}
            onInput={(e) => setSearchInput(e.currentTarget.value)}
          ></input>

          <div className={styles["user-prompt-list"]}>
            {prompts.map((v, _) => (
              <div className={styles["user-prompt-item"]} key={v.id ?? v.title}>
                <div className={styles["user-prompt-header"]}>
                  <div className={styles["user-prompt-title"]}>{v.title}</div>
                  <div className={styles["user-prompt-content"] + " one-line"}>
                    {v.content}
                  </div>
                </div>

                <div className={styles["user-prompt-buttons"]}>
                  {v.isUser && (
                    <IconButton
                      icon={<ClearIcon />}
                      className={styles["user-prompt-button"]}
                      onClick={() => promptStore.remove(v.id!)}
                    />
                  )}
                  {v.isUser ? (
                    <IconButton
                      icon={<EditIcon />}
                      className={styles["user-prompt-button"]}
                      onClick={() => setEditingPromptId(v.id)}
                    />
                  ) : (
                    <IconButton
                      icon={<EyeIcon />}
                      className={styles["user-prompt-button"]}
                      onClick={() => setEditingPromptId(v.id)}
                    />
                  )}
                  <IconButton
                    icon={<CopyIcon />}
                    className={styles["user-prompt-button"]}
                    onClick={() => copyToClipboard(v.content)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {editingPromptId !== undefined && (
        <EditPromptModal
          id={editingPromptId!}
          onClose={() => setEditingPromptId(undefined)}
        />
      )}
    </div>
  );
}

function DangerItems() {
  const chatStore = useChatStore();
  const appConfig = useAppConfig();

  return (
    <List>
      <ListItem
        title={Locale.Settings.Danger.Reset.Title}
        subTitle={Locale.Settings.Danger.Reset.SubTitle}
      >
        <IconButton
          aria={Locale.Settings.Danger.Reset.Title}
          text={Locale.Settings.Danger.Reset.Action}
          onClick={async () => {
            if (await showConfirm(Locale.Settings.Danger.Reset.Confirm)) {
              appConfig.reset();
            }
          }}
          type="danger"
        />
      </ListItem>
      <ListItem
        title={Locale.Settings.Danger.ClearChat.Title}
        subTitle={Locale.Settings.Danger.ClearChat.SubTitle}
      >
        <IconButton
          aria={Locale.Settings.Danger.ClearChat.Title}
          text={Locale.Settings.Danger.ClearChat.Action}
          onClick={async () => {
            if (await showConfirm(Locale.Settings.Danger.ClearChat.Confirm)) {
              chatStore.clearAllChatData();
            }
          }}
          type="danger"
        />
      </ListItem>
      <ListItem
        title={Locale.Settings.Danger.ClearALL.Title}
        subTitle={Locale.Settings.Danger.ClearALL.SubTitle}
      >
        <IconButton
          aria={Locale.Settings.Danger.ClearALL.Title}
          text={Locale.Settings.Danger.ClearALL.Action}
          onClick={async () => {
            if (await showConfirm(Locale.Settings.Danger.ClearALL.Confirm)) {
              chatStore.clearAllData();
            }
          }}
          type="danger"
        />
      </ListItem>
    </List>
  );
}

function CheckButton() {
  const syncStore = useSyncStore();

  const couldCheck = useMemo(() => {
    return syncStore.cloudSync();
  }, [syncStore]);

  const [checkState, setCheckState] = useState<
    "none" | "checking" | "success" | "failed"
  >("none");

  async function check() {
    setCheckState("checking");
    const valid = await syncStore.check();
    setCheckState(valid ? "success" : "failed");
  }

  if (!couldCheck) return null;

  return (
    <IconButton
      text={Locale.Settings.Sync.Config.Modal.Check}
      bordered
      onClick={check}
      icon={
        checkState === "none" ? (
          <ConnectionIcon />
        ) : checkState === "checking" ? (
          <LoadingIcon />
        ) : checkState === "success" ? (
          <CloudSuccessIcon />
        ) : checkState === "failed" ? (
          <CloudFailIcon />
        ) : (
          <ConnectionIcon />
        )
      }
    ></IconButton>
  );
}

function SyncConfigModal(props: { onClose?: () => void }) {
  const syncStore = useSyncStore();

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Settings.Sync.Config.Modal.Title}
        onClose={() => props.onClose?.()}
        actions={[
          <CheckButton key="check" />,
          <IconButton
            key="confirm"
            onClick={props.onClose}
            icon={<ConfirmIcon />}
            bordered
            text={Locale.UI.Confirm}
          />,
        ]}
      >
        <List>
          <ListItem
            title={Locale.Settings.Sync.Config.SyncType.Title}
            subTitle={Locale.Settings.Sync.Config.SyncType.SubTitle}
          >
            <select
              value={syncStore.provider}
              onChange={(e) => {
                syncStore.update(
                  (config) =>
                    (config.provider = e.target.value as ProviderType),
                );
              }}
            >
              {Object.entries(ProviderType).map(([k, v]) => (
                <option value={v} key={k}>
                  {k}
                </option>
              ))}
            </select>
          </ListItem>

          <ListItem
            title={Locale.Settings.Sync.Config.Proxy.Title}
            subTitle={Locale.Settings.Sync.Config.Proxy.SubTitle}
          >
            <input
              type="checkbox"
              checked={syncStore.useProxy}
              onChange={(e) => {
                syncStore.update(
                  (config) => (config.useProxy = e.currentTarget.checked),
                );
              }}
            ></input>
          </ListItem>
          {syncStore.useProxy ? (
            <ListItem
              title={Locale.Settings.Sync.Config.ProxyUrl.Title}
              subTitle={Locale.Settings.Sync.Config.ProxyUrl.SubTitle}
            >
              <input
                type="text"
                value={syncStore.proxyUrl}
                onChange={(e) => {
                  syncStore.update(
                    (config) => (config.proxyUrl = e.currentTarget.value),
                  );
                }}
              ></input>
            </ListItem>
          ) : null}
        </List>

        {syncStore.provider === ProviderType.WebDAV && (
          <>
            <List>
              <ListItem title={Locale.Settings.Sync.Config.WebDav.Endpoint}>
                <input
                  type="text"
                  value={syncStore.webdav.endpoint}
                  onChange={(e) => {
                    syncStore.update(
                      (config) =>
                        (config.webdav.endpoint = e.currentTarget.value),
                    );
                  }}
                ></input>
              </ListItem>

              <ListItem title={Locale.Settings.Sync.Config.WebDav.UserName}>
                <input
                  type="text"
                  value={syncStore.webdav.username}
                  onChange={(e) => {
                    syncStore.update(
                      (config) =>
                        (config.webdav.username = e.currentTarget.value),
                    );
                  }}
                ></input>
              </ListItem>
              <ListItem title={Locale.Settings.Sync.Config.WebDav.Password}>
                <PasswordInput
                  value={syncStore.webdav.password}
                  onChange={(e) => {
                    syncStore.update(
                      (config) =>
                        (config.webdav.password = e.currentTarget.value),
                    );
                  }}
                ></PasswordInput>
              </ListItem>
            </List>
          </>
        )}

        {syncStore.provider === ProviderType.UpStash && (
          <List>
            <ListItem title={Locale.Settings.Sync.Config.UpStash.Endpoint}>
              <input
                type="text"
                value={syncStore.upstash.endpoint}
                onChange={(e) => {
                  syncStore.update(
                    (config) =>
                      (config.upstash.endpoint = e.currentTarget.value),
                  );
                }}
              ></input>
            </ListItem>

            <ListItem title={Locale.Settings.Sync.Config.UpStash.UserName}>
              <input
                type="text"
                value={syncStore.upstash.username}
                placeholder={STORAGE_KEY}
                onChange={(e) => {
                  syncStore.update(
                    (config) =>
                      (config.upstash.username = e.currentTarget.value),
                  );
                }}
              ></input>
            </ListItem>
            <ListItem title={Locale.Settings.Sync.Config.UpStash.Password}>
              <PasswordInput
                value={syncStore.upstash.apiKey}
                onChange={(e) => {
                  syncStore.update(
                    (config) => (config.upstash.apiKey = e.currentTarget.value),
                  );
                }}
              ></PasswordInput>
            </ListItem>
          </List>
        )}
      </Modal>
    </div>
  );
}

function SyncItems() {
  const syncStore = useSyncStore();
  const chatStore = useChatStore();
  const promptStore = usePromptStore();
  const maskStore = useMaskStore();
  const providerStore = useCustomProviderStore();
  const couldSync = useMemo(() => {
    return syncStore.cloudSync();
  }, [syncStore]);

  const [showSyncConfigModal, setShowSyncConfigModal] = useState(false);

  const stateOverview = useMemo(() => {
    const sessions = chatStore.sessions;
    const messageCount = sessions.reduce((p, c) => p + c.messages.length, 0);

    return {
      chat: sessions.length,
      message: messageCount,
      prompt: Object.keys(promptStore.prompts).length,
      mask: Object.keys(maskStore.masks).length,
      provider: providerStore.providers.length,
    };
  }, [
    chatStore.sessions,
    maskStore.masks,
    promptStore.prompts,
    providerStore.providers,
  ]);

  return (
    <>
      <List>
        <ListItem
          title={Locale.Settings.Sync.CloudState}
          subTitle={
            syncStore.lastProvider
              ? `${new Date(syncStore.lastSyncTime).toLocaleString()} [${
                  syncStore.lastProvider
                }]`
              : Locale.Settings.Sync.NotSyncYet
          }
        >
          <div style={{ display: "flex" }}>
            <IconButton
              aria={Locale.Settings.Sync.CloudState + Locale.UI.Config}
              icon={<ConfigIcon />}
              text={Locale.UI.Config}
              onClick={() => {
                setShowSyncConfigModal(true);
              }}
            />
            {couldSync && (
              <IconButton
                icon={<ResetIcon />}
                text={`${
                  syncStore.syncState === "fetching"
                    ? Locale.Settings.Sync.Fetching
                    : syncStore.syncState === "merging"
                    ? Locale.Settings.Sync.Merging
                    : syncStore.syncState === "uploading"
                    ? Locale.Settings.Sync.Uploading
                    : syncStore.syncState === "error"
                    ? Locale.Settings.Sync.Fail
                    : syncStore.syncState === "success"
                    ? Locale.Settings.Sync.Success
                    : Locale.UI.Sync
                }${
                  syncStore.syncStateSize >= 0
                    ? ` (${(syncStore.syncStateSize / 1024 / 1024).toFixed(
                        2,
                      )} MB)`
                    : ""
                }`}
                onClick={async () => {
                  try {
                    await syncStore.sync();
                    showToast(Locale.Settings.Sync.Success);
                  } catch (e) {
                    showToast(Locale.Settings.Sync.Fail);
                    console.error("[Sync]", e);
                  }
                }}
              />
            )}
          </div>
        </ListItem>

        <ListItem
          title={Locale.Settings.Sync.LocalState}
          subTitle={Locale.Settings.Sync.Overview(stateOverview)}
        >
          <div style={{ display: "flex" }}>
            <IconButton
              aria={Locale.Settings.Sync.LocalState + Locale.UI.Export}
              icon={<UploadIcon />}
              text={Locale.UI.Export}
              onClick={() => {
                syncStore.export();
              }}
            />
            <IconButton
              aria={Locale.Settings.Sync.LocalState + Locale.UI.Import}
              icon={<DownloadIcon />}
              text={Locale.UI.Import}
              onClick={() => {
                syncStore.import();
              }}
            />
          </div>
        </ListItem>
      </List>

      {showSyncConfigModal && (
        <SyncConfigModal onClose={() => setShowSyncConfigModal(false)} />
      )}
    </>
  );
}

export function Settings() {
  const navigate = useNavigate();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentTab, setCurrentTab] = useState<SettingsTab>(
    SettingsTab.General,
  );
  const config = useAppConfig();
  const updateConfig = config.update;

  const updateStore = useUpdateStore();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const currentVersion = updateStore.formatVersion(updateStore.version);
  const remoteId = updateStore.formatVersion(updateStore.remoteVersion);
  const hasNewVersion = currentVersion !== remoteId;
  const updateUrl = getClientConfig()?.isApp ? RELEASE_URL : UPDATE_URL;

  const [showExpansionRules, setShowExpansionRules] = useState(false);
  const [collapsedProviders, setCollapsedProviders] = useState<
    Record<ServiceProvider, boolean>
  >({
    [ServiceProvider.OpenAI]: false,
    [ServiceProvider.Azure]: false,
    [ServiceProvider.Google]: false,
    [ServiceProvider.Anthropic]: false,
  });

  function checkUpdate(force = false) {
    setCheckingUpdate(true);
    updateStore.getLatestVersion(force).then(() => {
      setCheckingUpdate(false);
    });

    console.log("[Update] local version ", updateStore.version);
    console.log("[Update] remote version ", updateStore.remoteVersion);
  }

  const accessStore = useAccessStore();
  if (config.modelConfig.model === "") {
    config.modelConfig.model = accessStore.defaultModel;
  }
  if (config.modelConfig.compressModel === "") {
    config.modelConfig.compressModel = accessStore.compressModel;
  }
  if (config.modelConfig.ocrModel === "") {
    config.modelConfig.ocrModel = accessStore.ocrModel;
  }
  if (config.modelConfig.textProcessModel === "") {
    config.modelConfig.textProcessModel = accessStore.textProcessModel;
  }

  const shouldHideBalanceQuery = useMemo(() => {
    const isOpenAiUrl = accessStore.openaiUrl.includes(OPENAI_BASE_URL);

    return (
      accessStore.hideBalanceQuery ||
      isOpenAiUrl ||
      accessStore.provider === ServiceProvider.Azure
    );
  }, [
    accessStore.hideBalanceQuery,
    accessStore.openaiUrl,
    accessStore.provider,
  ]);

  const usage = {
    used: updateStore.used,
    subscription: updateStore.subscription,
  };
  const [loadingUsage, setLoadingUsage] = useState(false);
  function checkUsage(force = false) {
    if (shouldHideBalanceQuery) {
      return;
    }

    setLoadingUsage(true);
    updateStore.updateUsage(force).finally(() => {
      setLoadingUsage(false);
    });
  }

  const enabledAccessControl = useMemo(
    () => accessStore.enabledAccessControl(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const promptStore = usePromptStore();
  const builtinCount = SearchService.count.builtin;
  const customCount = promptStore.getUserPrompts().length ?? 0;
  const [shouldShowPromptModal, setShowPromptModal] = useState(false);
  const [shouldShowCustomCssModal, setShowCustomCssModal] = useState(false);
  const [
    shouldShowCustomContinuePromptModal,
    setShowCustomContinuePromptModal,
  ] = useState(false);

  const customCss = useCustomCssStore();

  const showUsage = accessStore.isAuthorized();
  useEffect(() => {
    checkUpdate();
    showUsage && checkUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const keydownEvent = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        navigate(Path.Home);
      }
    };
    if (clientConfig?.isApp) {
      accessStore.update((state) => {
        state.useCustomConfig = true;
      });
    }
    document.addEventListener("keydown", keydownEvent);
    return () => {
      document.removeEventListener("keydown", keydownEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientConfig = useMemo(() => getClientConfig(), []);
  const showAccessCode = enabledAccessControl && !clientConfig?.isApp;

  // 服务提供商配置
  const providerConfigs = [
    {
      provider: ServiceProvider.OpenAI,
      name: "OpenAI",
      icon: "🤖",
      description: "OpenAI API",
      configComponent: (
        <>
          <ListItem
            title={Locale.Settings.Access.OpenAI.Endpoint.Title}
            subTitle={Locale.Settings.Access.OpenAI.Endpoint.SubTitle}
          >
            <input
              aria-label={Locale.Settings.Access.OpenAI.Endpoint.Title}
              type="text"
              value={accessStore.openaiUrl}
              placeholder={OPENAI_BASE_URL}
              onChange={(e) =>
                accessStore.update(
                  (access) => (access.openaiUrl = e.currentTarget.value),
                )
              }
            ></input>
          </ListItem>
          <ListItem
            title={Locale.Settings.Access.OpenAI.ApiKey.Title}
            subTitle={Locale.Settings.Access.OpenAI.ApiKey.SubTitle}
          >
            <PasswordInput
              aria={Locale.Settings.ShowPassword}
              aria-label={Locale.Settings.Access.OpenAI.ApiKey.Title}
              value={accessStore.openaiApiKey}
              type="text"
              placeholder={Locale.Settings.Access.OpenAI.ApiKey.Placeholder}
              onChange={(e) => {
                accessStore.update(
                  (access) => (access.openaiApiKey = e.currentTarget.value),
                );
              }}
            />
          </ListItem>
          <ListItem
            title={Locale.Settings.Access.OpenAI.AvailableModels.Title}
            subTitle={Locale.Settings.Access.OpenAI.AvailableModels.SubTitle}
          >
            <IconButton
              text={Locale.Settings.Access.OpenAI.AvailableModels.Action}
              onClick={async () => {
                if (
                  await showConfirm(
                    Locale.Settings.Access.OpenAI.AvailableModels.Confirm,
                  )
                ) {
                  const availableModelsStr =
                    await accessStore.fetchAvailableModels(
                      accessStore.openaiUrl,
                      accessStore.openaiApiKey,
                    );
                  config.update(
                    (config) => (config.customModels = availableModelsStr),
                  );
                }
              }}
              type="primary"
            />
          </ListItem>
        </>
      ),
    },
    {
      provider: ServiceProvider.Azure,
      name: "Azure",
      icon: "☁️",
      description: "Azure OpenAI",
      configComponent: (
        <>
          <ListItem
            title={Locale.Settings.Access.Azure.Endpoint.Title}
            subTitle={
              Locale.Settings.Access.Azure.Endpoint.SubTitle +
              Azure.ExampleEndpoint
            }
          >
            <input
              aria-label={Locale.Settings.Access.Azure.Endpoint.Title}
              type="text"
              value={accessStore.azureUrl}
              placeholder={Azure.ExampleEndpoint}
              onChange={(e) =>
                accessStore.update(
                  (access) => (access.azureUrl = e.currentTarget.value),
                )
              }
            ></input>
          </ListItem>
          <ListItem
            title={Locale.Settings.Access.Azure.ApiKey.Title}
            subTitle={Locale.Settings.Access.Azure.ApiKey.SubTitle}
          >
            <PasswordInput
              aria-label={Locale.Settings.Access.Azure.ApiKey.Title}
              value={accessStore.azureApiKey}
              type="text"
              placeholder={Locale.Settings.Access.Azure.ApiKey.Placeholder}
              onChange={(e) => {
                accessStore.update(
                  (access) => (access.azureApiKey = e.currentTarget.value),
                );
              }}
            />
          </ListItem>
          <ListItem
            title={Locale.Settings.Access.Azure.ApiVerion.Title}
            subTitle={Locale.Settings.Access.Azure.ApiVerion.SubTitle}
          >
            <input
              aria-label={Locale.Settings.Access.Azure.ApiKey.Title}
              type="text"
              value={accessStore.azureApiVersion}
              placeholder="2023-08-01-preview"
              onChange={(e) =>
                accessStore.update(
                  (access) => (access.azureApiVersion = e.currentTarget.value),
                )
              }
            ></input>
          </ListItem>
        </>
      ),
    },
    {
      provider: ServiceProvider.Google,
      name: "Google",
      icon: "🔍",
      description: "Google Gemini",
      configComponent: (
        <>
          <ListItem
            title={Locale.Settings.Access.Google.Endpoint.Title}
            subTitle={
              Locale.Settings.Access.Google.Endpoint.SubTitle +
              Google.ExampleEndpoint
            }
          >
            <input
              aria-label={Locale.Settings.Access.Google.Endpoint.Title}
              type="text"
              value={accessStore.googleUrl}
              placeholder={Google.ExampleEndpoint}
              onChange={(e) =>
                accessStore.update(
                  (access) => (access.googleUrl = e.currentTarget.value),
                )
              }
            ></input>
          </ListItem>
          <ListItem
            title={Locale.Settings.Access.Google.ApiKey.Title}
            subTitle={Locale.Settings.Access.Google.ApiKey.SubTitle}
          >
            <PasswordInput
              aria-label={Locale.Settings.Access.Google.ApiKey.Title}
              value={accessStore.googleApiKey}
              type="text"
              placeholder={Locale.Settings.Access.Google.ApiKey.Placeholder}
              onChange={(e) => {
                accessStore.update(
                  (access) => (access.googleApiKey = e.currentTarget.value),
                );
              }}
            />
          </ListItem>
          <ListItem
            title={Locale.Settings.Access.Google.ApiVersion.Title}
            subTitle={Locale.Settings.Access.Google.ApiVersion.SubTitle}
          >
            <input
              aria-label={Locale.Settings.Access.Google.ApiVersion.Title}
              type="text"
              value={accessStore.googleApiVersion}
              placeholder="2023-08-01-preview"
              onChange={(e) =>
                accessStore.update(
                  (access) => (access.googleApiVersion = e.currentTarget.value),
                )
              }
            ></input>
          </ListItem>
        </>
      ),
    },
    {
      provider: ServiceProvider.Anthropic,
      name: "Anthropic",
      icon: "🎭",
      description: "Claude AI",
      configComponent: (
        <>
          <ListItem
            title={Locale.Settings.Access.Anthropic.Endpoint.Title}
            subTitle={
              Locale.Settings.Access.Anthropic.Endpoint.SubTitle +
              Anthropic.ExampleEndpoint
            }
          >
            <input
              aria-label={Locale.Settings.Access.Anthropic.Endpoint.Title}
              type="text"
              value={accessStore.anthropicUrl}
              placeholder={Anthropic.ExampleEndpoint}
              onChange={(e) =>
                accessStore.update(
                  (access) => (access.anthropicUrl = e.currentTarget.value),
                )
              }
            ></input>
          </ListItem>
          <ListItem
            title={Locale.Settings.Access.Anthropic.ApiKey.Title}
            subTitle={Locale.Settings.Access.Anthropic.ApiKey.SubTitle}
          >
            <PasswordInput
              aria-label={Locale.Settings.Access.Anthropic.ApiKey.Title}
              value={accessStore.anthropicApiKey}
              type="text"
              placeholder={Locale.Settings.Access.Anthropic.ApiKey.Placeholder}
              onChange={(e) => {
                accessStore.update(
                  (access) => (access.anthropicApiKey = e.currentTarget.value),
                );
              }}
            />
          </ListItem>
          <ListItem
            title={Locale.Settings.Access.Anthropic.ApiVerion.Title}
            subTitle={Locale.Settings.Access.Anthropic.ApiVerion.SubTitle}
          >
            <input
              aria-label={Locale.Settings.Access.Anthropic.ApiVerion.Title}
              type="text"
              value={accessStore.anthropicApiVersion}
              placeholder={Anthropic.Vision}
              onChange={(e) =>
                accessStore.update(
                  (access) =>
                    (access.anthropicApiVersion = e.currentTarget.value),
                )
              }
            ></input>
          </ListItem>
        </>
      ),
    },
  ];

  // 分页标签配置
  const tabConfig = [
    {
      key: SettingsTab.General,
      label: Locale.Settings.Tabs.General,
      icon: "⚙️",
    },
    {
      key: SettingsTab.ModelService,
      label: Locale.Settings.Tabs.ModelService,
      icon: "🤖",
    },
    { key: SettingsTab.Sync, label: Locale.Settings.Tabs.Sync, icon: "☁️" },
    {
      key: SettingsTab.QuickInput,
      label: Locale.Settings.Tabs.QuickInput,
      icon: "⚡",
    },
    { key: SettingsTab.Voice, label: Locale.Settings.Tabs.Voice, icon: "🔊" },
  ];

  // 渲染分页内容
  const renderTabContent = () => {
    switch (currentTab) {
      case SettingsTab.General:
        return renderGeneralSettings();
      case SettingsTab.ModelService:
        return renderModelServiceSettings();
      case SettingsTab.Sync:
        return renderSyncSettings();
      case SettingsTab.QuickInput:
        return renderQuickInputSettings();
      case SettingsTab.Voice:
        return renderVoiceSettings();
      default:
        return renderGeneralSettings();
    }
  };

  // 通用配置
  const renderGeneralSettings = () => (
    <>
      {showAccessCode && (
        <List>
          <ListItem
            title={Locale.Settings.Access.AccessCode.Title}
            subTitle={Locale.Settings.Access.AccessCode.SubTitle}
          >
            <PasswordInput
              value={accessStore.accessCode}
              type="text"
              placeholder={Locale.Settings.Access.AccessCode.Placeholder}
              onChange={(e) => {
                accessStore.update(
                  (access) => (access.accessCode = e.currentTarget.value),
                );
              }}
            />
          </ListItem>
        </List>
      )}

      <List>
        <ListItem title={Locale.Settings.Avatar}>
          <Popover
            onClose={() => setShowEmojiPicker(false)}
            content={
              <AvatarPicker
                onEmojiClick={(avatar: string) => {
                  updateConfig((config) => (config.avatar = avatar));
                  setShowEmojiPicker(false);
                }}
              />
            }
            open={showEmojiPicker}
          >
            <div
              className={styles.avatar}
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
              }}
            >
              <Avatar avatar={config.avatar} />
            </div>
          </Popover>
        </ListItem>

        <ListItem
          title={Locale.Settings.Update.Version(currentVersion ?? "unknown")}
          subTitle={
            checkingUpdate
              ? Locale.Settings.Update.IsChecking
              : hasNewVersion
              ? Locale.Settings.Update.FoundUpdate(remoteId ?? "ERROR")
              : Locale.Settings.Update.IsLatest
          }
        >
          {checkingUpdate ? (
            <LoadingIcon />
          ) : hasNewVersion ? (
            <Link href={updateUrl} target="_blank" className="link">
              {Locale.Settings.Update.GoToUpdate}
            </Link>
          ) : (
            <IconButton
              icon={<ResetIcon></ResetIcon>}
              text={Locale.Settings.Update.CheckUpdate}
              onClick={() => checkUpdate(true)}
            />
          )}
        </ListItem>

        <ListItem title={Locale.Settings.SendKey}>
          <Select
            value={config.submitKey}
            onChange={(e) => {
              updateConfig(
                (config) =>
                  (config.submitKey = e.target.value as any as SubmitKey),
              );
            }}
          >
            {Object.values(SubmitKey).map((v) => (
              <option value={v} key={v}>
                {v}
              </option>
            ))}
          </Select>
        </ListItem>

        <ListItem title={Locale.Settings.Theme}>
          <Select
            value={config.theme}
            onChange={(e) => {
              updateConfig(
                (config) => (config.theme = e.target.value as any as Theme),
              );
            }}
          >
            {Object.values(Theme).map((v) => (
              <option value={v} key={v}>
                {v}
              </option>
            ))}
          </Select>
        </ListItem>

        <ListItem
          title={Locale.Settings.CustomCSS.Title}
          subTitle={
            customCss.enabled
              ? Locale.Settings.CustomCSS.SubTitleEnabled
              : Locale.Settings.CustomCSS.SubTitleDisabled
          }
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={customCss.enabled}
              onChange={(e) => {
                if (e.currentTarget.checked) {
                  customCss.enable();
                } else {
                  customCss.disable();
                }
              }}
              style={{ marginRight: "10px" }}
            />
            <IconButton
              icon={<EditIcon />}
              text={Locale.Settings.CustomCSS.Edit}
              onClick={() => setShowCustomCssModal(true)}
            />
          </div>
        </ListItem>

        <ListItem title={Locale.Settings.Lang.Name}>
          <Select
            value={getLang()}
            onChange={(e) => {
              changeLang(e.target.value as any);
            }}
          >
            {AllLangs.map((lang) => (
              <option value={lang} key={lang}>
                {ALL_LANG_OPTIONS[lang]}
              </option>
            ))}
          </Select>
        </ListItem>

        <ListItem
          title={Locale.Settings.FontSize.Title}
          subTitle={Locale.Settings.FontSize.SubTitle}
        >
          <input
            aria-label={Locale.Settings.FontSize.Title}
            type="number"
            min={12}
            max={40}
            value={config.fontSize ?? 14}
            onChange={(e) =>
              updateConfig(
                (config) =>
                  (config.fontSize = Number.parseInt(e.currentTarget.value)),
              )
            }
          />
        </ListItem>

        <ListItem
          title={Locale.Settings.AutoGenerateTitle.Title}
          subTitle={Locale.Settings.AutoGenerateTitle.SubTitle}
        >
          <input
            type="checkbox"
            checked={config.enableAutoGenerateTitle}
            onChange={(e) =>
              updateConfig(
                (config) =>
                  (config.enableAutoGenerateTitle = e.currentTarget.checked),
              )
            }
          ></input>
        </ListItem>

        <ListItem
          title={Locale.Settings.SendPreviewBubble.Title}
          subTitle={Locale.Settings.SendPreviewBubble.SubTitle}
        >
          <input
            type="checkbox"
            checked={config.sendPreviewBubble}
            onChange={(e) =>
              updateConfig(
                (config) =>
                  (config.sendPreviewBubble = e.currentTarget.checked),
              )
            }
          ></input>
        </ListItem>

        <ListItem
          title={Locale.Mask.Config.Artifacts.Title}
          subTitle={Locale.Mask.Config.Artifacts.SubTitle}
        >
          <input
            aria-label={Locale.Mask.Config.Artifacts.Title}
            type="checkbox"
            checked={config.enableArtifacts}
            onChange={(e) =>
              updateConfig(
                (config) => (config.enableArtifacts = e.currentTarget.checked),
              )
            }
          ></input>
        </ListItem>

        <ListItem
          title={Locale.Mask.Config.CodeFold.Title}
          subTitle={Locale.Mask.Config.CodeFold.SubTitle}
        >
          <input
            aria-label={Locale.Mask.Config.CodeFold.Title}
            type="checkbox"
            checked={config.enableCodeFold}
            onChange={(e) =>
              updateConfig(
                (config) => (config.enableCodeFold = e.currentTarget.checked),
              )
            }
          ></input>
        </ListItem>

        <ListItem
          title={Locale.Mask.Config.FloatingButton.Title}
          subTitle={Locale.Mask.Config.FloatingButton.SubTitle}
        >
          <input
            aria-label={Locale.Mask.Config.FloatingButton.Title}
            type="checkbox"
            checked={config.enableFloatingButton}
            onChange={(e) =>
              updateConfig(
                (config) =>
                  (config.enableFloatingButton = e.currentTarget.checked),
              )
            }
          ></input>
        </ListItem>
      </List>

      <DangerItems />
    </>
  );

  // 模型服务商设置
  const renderModelServiceSettings = () => (
    <>
      {!clientConfig?.isApp && (
        <List>
          <ListItem
            title={Locale.Settings.Access.CustomEndpoint.Title}
            subTitle={Locale.Settings.Access.CustomEndpoint.SubTitle}
            className="mobile-vertical"
            // vertical={true}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <IconButton
                text={Locale.Settings.Access.CustomEndpoint.Advanced}
                type="info"
                icon={<CustomProviderIcon />}
                onClick={() => navigate(Path.CustomProvider)}
                bordered
              />
              <input
                aria-label={Locale.Settings.Access.CustomEndpoint.Title}
                type="checkbox"
                checked={accessStore.useCustomConfig}
                onChange={(e) =>
                  accessStore.update(
                    (access) =>
                      (access.useCustomConfig = e.currentTarget.checked),
                  )
                }
              ></input>
            </div>
          </ListItem>
        </List>
      )}

      {!accessStore.hideUserApiKey && accessStore.useCustomConfig && (
        <div className={styles["provider-cards"]}>
          {providerConfigs.map((config) => {
            const isEnabled =
              accessStore.provider === config.provider ||
              accessStore.useCustomConfig;
            const isCollapsed = collapsedProviders[config.provider];

            return (
              <div
                key={config.provider}
                className={`${styles["provider-card"]} ${
                  isEnabled ? styles["provider-card-active"] : ""
                }`}
              >
                <div
                  className={styles["provider-card-header"]}
                  onClick={() => {
                    if (isEnabled) {
                      setCollapsedProviders((prev) => ({
                        ...prev,
                        [config.provider]: !prev[config.provider],
                      }));
                    }
                  }}
                >
                  <div className={styles["provider-info"]}>
                    <span className={styles["provider-icon"]}>
                      {config.icon}
                    </span>
                    <div>
                      <div className={styles["provider-name-container"]}>
                        <h3 className={styles["provider-name"]}>
                          {config.name}
                        </h3>
                        {accessStore.provider === config.provider && (
                          <span className={styles["provider-badge"]}>
                            当前使用
                          </span>
                        )}
                      </div>
                      <p className={styles["provider-description"]}>
                        {config.description}
                      </p>
                    </div>
                  </div>
                  <div className={styles["provider-controls"]}>
                    <div className={styles["provider-toggle"]}>
                      <input
                        type="radio"
                        name="provider"
                        checked={accessStore.provider === config.provider}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            accessStore.update((access) => {
                              access.provider = config.provider;
                            });
                          }
                        }}
                        className={styles["provider-checkbox"]}
                      />
                    </div>
                    {isEnabled && (
                      <button
                        className={`${styles["collapse-button"]} ${
                          isCollapsed ? styles["collapsed"] : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCollapsedProviders((prev) => ({
                            ...prev,
                            [config.provider]: !prev[config.provider],
                          }));
                        }}
                      >
                        <DownIcon />
                      </button>
                    )}
                  </div>
                </div>

                {isEnabled && (
                  <div
                    className={`${styles["provider-config"]} ${
                      isCollapsed ? styles["collapsed"] : styles["expanded"]
                    }`}
                  >
                    <List>{config.configComponent}</List>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!shouldHideBalanceQuery && !clientConfig?.isApp && (
        <List>
          <ListItem
            title={Locale.Settings.Usage.Title}
            subTitle={
              showUsage
                ? loadingUsage
                  ? Locale.Settings.Usage.IsChecking
                  : Locale.Settings.Usage.SubTitle(
                      usage?.used ?? "[?]",
                      usage?.subscription ?? "[?]",
                    )
                : Locale.Settings.Usage.NoAccess
            }
          >
            {!showUsage || loadingUsage ? (
              <div />
            ) : (
              <IconButton
                icon={<ResetIcon></ResetIcon>}
                text={Locale.Settings.Usage.Check}
                onClick={() => checkUsage(true)}
              />
            )}
          </ListItem>
        </List>
      )}

      <List id={SlotID.CustomModel}>
        <ListItem
          title={Locale.Settings.Access.CustomModel.Title}
          subTitle={Locale.Settings.Access.CustomModel.SubTitle}
          className="mobile-vertical"
          vertical={true}
        >
          <input
            aria-label={Locale.Settings.Access.CustomModel.Title}
            style={{ width: "100%", maxWidth: "unset", textAlign: "left" }}
            type="text"
            value={config.customModels}
            placeholder="model1,model2,model3"
            onChange={(e) =>
              config.update(
                (config) => (config.customModels = e.currentTarget.value),
              )
            }
          ></input>
        </ListItem>
      </List>

      <List>
        <ModelConfigList
          modelConfig={config.modelConfig}
          updateConfig={(updater) => {
            const modelConfig = { ...config.modelConfig };
            updater(modelConfig);
            config.update((config) => (config.modelConfig = modelConfig));
          }}
        />
      </List>
    </>
  );

  // 云同步设置
  const renderSyncSettings = () => <SyncItems />;

  // 快捷输入设置
  const renderQuickInputSettings = () => (
    <>
      <List>
        <ListItem
          title={Locale.Settings.Prompt.Disable.Title}
          subTitle={Locale.Settings.Prompt.Disable.SubTitle}
        >
          <input
            type="checkbox"
            checked={config.disablePromptHint}
            onChange={(e) =>
              updateConfig(
                (config) =>
                  (config.disablePromptHint = e.currentTarget.checked),
              )
            }
          ></input>
        </ListItem>

        <ListItem
          title={Locale.Settings.Prompt.List}
          subTitle={Locale.Settings.Prompt.ListCount(builtinCount, customCount)}
        >
          <IconButton
            icon={<EditIcon />}
            text={Locale.Settings.Prompt.Edit}
            onClick={() => setShowPromptModal(true)}
          />
        </ListItem>

        <ListItem
          title={Locale.Settings.Prompt.CustomUserContinuePrompt.Enable}
        >
          <input
            type="checkbox"
            checked={config.enableShowUserContinuePrompt}
            onChange={(e) =>
              updateConfig(
                (config) =>
                  (config.enableShowUserContinuePrompt =
                    e.currentTarget.checked),
              )
            }
          ></input>
        </ListItem>

        <ListItem
          title={Locale.Settings.Prompt.CustomUserContinuePrompt.Title}
          subTitle={Locale.Settings.Prompt.CustomUserContinuePrompt.SubTitle}
        >
          <IconButton
            icon={<EditIcon />}
            text={Locale.Settings.Prompt.CustomUserContinuePrompt.Edit}
            onClick={() => setShowCustomContinuePromptModal(true)}
          />
        </ListItem>
      </List>

      <List>
        <ListItem
          title={Locale.Settings.Mask.Splash.Title}
          subTitle={Locale.Settings.Mask.Splash.SubTitle}
        >
          <input
            type="checkbox"
            checked={!config.dontShowMaskSplashScreen}
            onChange={(e) =>
              updateConfig(
                (config) =>
                  (config.dontShowMaskSplashScreen = !e.currentTarget.checked),
              )
            }
          ></input>
        </ListItem>

        <ListItem
          title={Locale.Settings.Mask.Builtin.Title}
          subTitle={Locale.Settings.Mask.Builtin.SubTitle}
        >
          <input
            type="checkbox"
            checked={config.hideBuiltinMasks}
            onChange={(e) =>
              updateConfig(
                (config) => (config.hideBuiltinMasks = e.currentTarget.checked),
              )
            }
          ></input>
        </ListItem>
      </List>

      <List>
        <ListItem
          title={Locale.Settings.Expansion.EnabledTitle}
          subTitle={Locale.Settings.Expansion.EnabledSubTitle}
        >
          <input
            type="checkbox"
            checked={config.enableTextExpansion}
            onChange={(e) =>
              config.update(
                (config) =>
                  (config.enableTextExpansion = e.currentTarget.checked),
              )
            }
          />
        </ListItem>

        <ListItem
          title={Locale.Settings.Expansion.TriggerPrefixTitle}
          subTitle={Locale.Settings.Expansion.TriggerPrefixSubTitle}
        >
          <Select
            value={config.expansionTriggerPrefix}
            onChange={(e) =>
              config.update(
                (config) => (config.expansionTriggerPrefix = e.target.value),
              )
            }
          >
            {[":", ";", "/", "!", "#", "~"].map((prefix) => (
              <option key={prefix} value={prefix}>
                {prefix}
              </option>
            ))}
          </Select>
        </ListItem>

        <ListItem
          title={Locale.Settings.Expansion.Title}
          subTitle={Locale.Settings.Expansion.SubTitle}
        >
          <IconButton
            icon={<EditIcon />}
            text={Locale.Settings.Expansion.Manage}
            onClick={() => setShowExpansionRules(true)}
          />
        </ListItem>
      </List>

      {shouldShowPromptModal && (
        <UserPromptModal onClose={() => setShowPromptModal(false)} />
      )}
      {shouldShowCustomContinuePromptModal && (
        <CustomUserContinuePromptModal
          onClose={() => setShowCustomContinuePromptModal(false)}
        />
      )}
      {showExpansionRules && (
        <ExpansionRulesModal onClose={() => setShowExpansionRules(false)} />
      )}
    </>
  );

  // 语音设置
  const renderVoiceSettings = () => (
    <List>
      <TTSConfigList
        ttsConfig={config.ttsConfig}
        updateConfig={(updater) => {
          const ttsConfig = { ...config.ttsConfig };
          updater(ttsConfig);
          config.update((config) => (config.ttsConfig = ttsConfig));
        }}
      />
    </List>
  );

  return (
    <ErrorBoundary>
      <div className="window-header" data-tauri-drag-region>
        <div className="window-header-title">
          <div className="window-header-main-title">
            {Locale.Settings.Title}
          </div>
          <div className="window-header-sub-title">
            {Locale.Settings.SubTitle}
          </div>
        </div>
        <div className="window-actions">
          <div className="window-action-button"></div>
          <div className="window-action-button"></div>
          <div className="window-action-button">
            <IconButton
              icon={<CloseIcon />}
              onClick={() => navigate(Path.Home)}
              bordered
            />
          </div>
        </div>
      </div>
      <div className={styles["settings"]}>
        {/* 分页导航 */}
        <div className={styles["settings-tabs"]}>
          {tabConfig.map((tab) => (
            <button
              key={tab.key}
              className={`${styles["settings-tab"]} ${
                currentTab === tab.key ? styles["settings-tab-active"] : ""
              }`}
              onClick={() => setCurrentTab(tab.key)}
            >
              <span className={styles["tab-icon"]}>{tab.icon}</span>
              <span className={styles["tab-label"]}>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 分页内容 */}
        <div className={styles["settings-content"]}>{renderTabContent()}</div>
      </div>

      {/* 自定义CSS弹窗 */}
      {shouldShowCustomCssModal && (
        <CustomCssModal onClose={() => setShowCustomCssModal(false)} />
      )}
    </ErrorBoundary>
  );
}
