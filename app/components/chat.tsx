import { useDebouncedCallback } from "use-debounce";
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  Fragment,
  RefObject,
  useLayoutEffect,
} from "react";

import SendWhiteIcon from "../icons/send-white.svg";
import BrainIcon from "../icons/brain.svg";
import RenameIcon from "../icons/rename.svg";
import ExportIcon from "../icons/share.svg";
import ReturnIcon from "../icons/return.svg";
import CopyIcon from "../icons/copy.svg";
import SpeakIcon from "../icons/speak.svg";
import SpeakStopIcon from "../icons/speak-stop.svg";
import LoadingIcon from "../icons/three-dots.svg";
import LoadingButtonIcon from "../icons/loading.svg";
import PromptIcon from "../icons/prompt.svg";
// import MaskIcon from "../icons/mask.svg";
import MaxIcon from "../icons/max.svg";
import MinIcon from "../icons/min.svg";
import ResetIcon from "../icons/reload.svg";
import BreakIcon from "../icons/break.svg";
import SettingsIcon from "../icons/chat-settings.svg";
import DeleteIcon from "../icons/clear.svg";
// import PinIcon from "../icons/pin.svg";
import EditIcon from "../icons/rename.svg";
import EditToInputIcon from "../icons/edit_input.svg";
import ConfirmIcon from "../icons/confirm.svg";
import CancelIcon from "../icons/cancel.svg";
import ContinueIcon from "../icons/continue.svg";
// import ImageIcon from "../icons/image.svg";

// import LightIcon from "../icons/light.svg";
// import DarkIcon from "../icons/dark.svg";
// import AutoIcon from "../icons/auto.svg";
import BottomIcon from "../icons/bottom.svg";
import StopIcon from "../icons/pause.svg";
import RobotIcon from "../icons/robot.svg";

import FileExpressIcon from "../icons/cloud.svg";
import SearchChatIcon from "../icons/zoom.svg";
import ShortcutkeyIcon from "../icons/shortcutkey.svg";
import ReloadIcon from "../icons/reload.svg";
import TranslateIcon from "../icons/translate.svg";
import OcrIcon from "../icons/ocr.svg";
import PrivacyIcon from "../icons/privacy.svg";
import PrivacyModeIcon from "../icons/incognito.svg";
import ImprovePromptIcon from "../icons/lightOn.svg";
// import UploadDocIcon from "../icons/upload-doc.svg";
import CollapseIcon from "../icons/collapse.svg";
import ExpandIcon from "../icons/expand.svg";
import AttachmentIcon from "../icons/paperclip.svg";

import {
  ChatMessage,
  SubmitKey,
  useChatStore,
  BOT_HELLO,
  createMessage,
  useAccessStore,
  Theme,
  useAppConfig,
  DEFAULT_TOPIC,
  ModelType,
} from "../store";

import {
  copyToClipboard,
  selectOrCopy,
  autoGrowTextArea,
  useMobileScreen,
  getMessageTextContent,
  getMessageImages,
  getMessageFiles,
  isVisionModel,
  safeLocalStorage,
  isThinkingModel,
  wrapThinkingPart,
  countTokens,
  saveModelConfig,
  getStoredModelConfigs,
} from "../utils";
import { estimateTokenLengthInLLM } from "@/app/utils/token";

import type { UploadFile } from "../client/api";
import { uploadImage as uploadImageRemote } from "@/app/utils/chat";
import { uploadFileRemote } from "@/app/utils/chat";
import Image from "next/image";

import dynamic from "next/dynamic";

import { ChatControllerPool } from "../client/controller";
import { Prompt, usePromptStore } from "../store/prompt";
import Locale from "../locales";

import { IconButton } from "./button";
import styles from "./chat.module.scss";

import {
  List,
  ListItem,
  Modal,
  SearchSelector,
  showConfirm,
  showPrompt,
  showToast,
} from "./ui-lib";
import { useNavigate } from "react-router-dom";
import { FileIcon, defaultStyles } from "react-file-icon";
import type { DefaultExtensionType } from "react-file-icon";
import {
  CHAT_PAGE_SIZE,
  DEFAULT_TTS_ENGINE,
  ModelProvider,
  Path,
  REQUEST_TIMEOUT_MS,
  UNFINISHED_INPUT,
  ServiceProvider,
  MAX_DOC_CNT,
  textFileExtensions,
  maxFileSizeInKB,
  minTokensForPastingAsFile,
  StoreKey,
} from "../constant";
import { Avatar } from "./emoji";
import { ContextPrompts, MaskAvatar, MaskConfig } from "./mask";
import { useMaskStore } from "../store/mask";
import {
  ChatCommandPrefix,
  MaskCommandPrefix,
  useChatCommand,
  useCommand,
} from "../command";
import { prettyObject } from "../utils/format";
import { ExportMessageModal } from "./exporter";
import { getClientConfig } from "../config/client";
import { useAllModelsWithCustomProviders } from "../utils/hooks";
import { Model, MultimodalContent, getClientApi } from "../client/api";

import { ClientApi } from "../client/api";
import { createTTSPlayer } from "../utils/audio";
import { MsEdgeTTS, OUTPUT_FORMAT } from "../utils/ms_edge_tts";

import { isEmpty } from "lodash-es";

const localStorage = safeLocalStorage();

const ttsPlayer = createTTSPlayer();

const Markdown = dynamic(async () => (await import("./markdown")).Markdown, {
  loading: () => <LoadingIcon />,
});

export function SessionConfigModel(props: { onClose: () => void }) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const maskStore = useMaskStore();
  const navigate = useNavigate();

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Context.Edit}
        onClose={() => props.onClose()}
        actions={[
          <IconButton
            key="reset"
            icon={<ResetIcon />}
            bordered
            text={Locale.Chat.Config.Reset}
            onClick={async () => {
              if (await showConfirm(Locale.Memory.ResetConfirm)) {
                chatStore.updateTargetSession(
                  session,
                  (session) => (session.memoryPrompt = ""),
                );
              }
            }}
          />,
          <IconButton
            key="copy"
            icon={<CopyIcon />}
            bordered
            text={Locale.Chat.Config.SaveAs}
            onClick={() => {
              navigate(Path.Masks);
              setTimeout(() => {
                maskStore.create(session.mask);
              }, 500);
            }}
          />,
        ]}
      >
        <MaskConfig
          mask={session.mask}
          updateMask={(updater) => {
            const mask = { ...session.mask };
            updater(mask);
            chatStore.updateTargetSession(
              session,
              (session) => (session.mask = mask),
            );
          }}
          shouldSyncFromGlobal
          extraListItems={
            session.mask.modelConfig.sendMemory ? (
              <ListItem
                className="copyable"
                title={`${Locale.Memory.Title} (${session.lastSummarizeIndex} of ${session.messages.length})`}
                subTitle={session.memoryPrompt || Locale.Memory.EmptyContent}
              ></ListItem>
            ) : (
              <></>
            )
          }
        ></MaskConfig>
      </Modal>
    </div>
  );
}

function PromptToast(props: {
  showToast?: boolean;
  showModal?: boolean;
  setShowModal: (_: boolean) => void;
}) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const context = session.mask.context;

  return (
    <div className={styles["prompt-toast"]} key="prompt-toast">
      {props.showToast && context.length > 0 && (
        <div
          className={styles["prompt-toast-inner"] + " clickable"}
          role="button"
          onClick={() => props.setShowModal(true)}
        >
          <BrainIcon />
          <span className={styles["prompt-toast-content"]}>
            {Locale.Context.Toast(context.length)}
          </span>
        </div>
      )}
      {props.showModal && (
        <SessionConfigModel onClose={() => props.setShowModal(false)} />
      )}
    </div>
  );
}

function useSubmitHandler() {
  const config = useAppConfig();
  const submitKey = config.submitKey;
  const isComposing = useRef(false);

  useEffect(() => {
    const onCompositionStart = () => {
      isComposing.current = true;
    };
    const onCompositionEnd = () => {
      isComposing.current = false;
    };

    window.addEventListener("compositionstart", onCompositionStart);
    window.addEventListener("compositionend", onCompositionEnd);

    return () => {
      window.removeEventListener("compositionstart", onCompositionStart);
      window.removeEventListener("compositionend", onCompositionEnd);
    };
  }, []);

  const shouldSubmit = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Fix Chinese input method "Enter" on Safari
    if (e.keyCode == 229) return false;
    if (e.key !== "Enter") return false;
    if (e.key === "Enter" && (e.nativeEvent.isComposing || isComposing.current))
      return false;
    return (
      (config.submitKey === SubmitKey.AltEnter && e.altKey) ||
      (config.submitKey === SubmitKey.CtrlEnter && e.ctrlKey) ||
      (config.submitKey === SubmitKey.ShiftEnter && e.shiftKey) ||
      (config.submitKey === SubmitKey.MetaEnter && e.metaKey) ||
      (config.submitKey === SubmitKey.Enter &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        !e.metaKey)
    );
  };

  return {
    submitKey,
    shouldSubmit,
  };
}

export type RenderPompt = Pick<Prompt, "title" | "content">;

export function PromptHints(props: {
  prompts: RenderPompt[];
  onPromptSelect: (prompt: RenderPompt) => void;
}) {
  const noPrompts = props.prompts.length === 0;
  const [selectIndex, setSelectIndex] = useState(0);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectIndex(0);
  }, [props.prompts.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (noPrompts || e.metaKey || e.altKey || e.ctrlKey) {
        return;
      }
      // arrow up / down to select prompt
      const changeIndex = (delta: number) => {
        e.stopPropagation();
        e.preventDefault();
        const nextIndex = Math.max(
          0,
          Math.min(props.prompts.length - 1, selectIndex + delta),
        );
        setSelectIndex(nextIndex);
        selectedRef.current?.scrollIntoView({
          block: "center",
        });
      };

      if (e.key === "ArrowUp") {
        changeIndex(1);
      } else if (e.key === "ArrowDown") {
        changeIndex(-1);
      } else if (e.key === "Enter") {
        const selectedPrompt = props.prompts.at(selectIndex);
        if (selectedPrompt) {
          props.onPromptSelect(selectedPrompt);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.prompts.length, selectIndex]);

  if (noPrompts) return null;
  return (
    <div className={styles["prompt-hints"]}>
      {props.prompts.map((prompt, i) => (
        <div
          ref={i === selectIndex ? selectedRef : null}
          className={
            styles["prompt-hint"] +
            ` ${i === selectIndex ? styles["prompt-hint-selected"] : ""}`
          }
          key={prompt.title + i.toString()}
          onClick={() => props.onPromptSelect(prompt)}
          onMouseEnter={() => setSelectIndex(i)}
        >
          <div className={styles["hint-title"]}>{prompt.title}</div>
          <div className={styles["hint-content"]}>{prompt.content}</div>
        </div>
      ))}
    </div>
  );
}

// function ClearContextDivider() {
function ClearContextDivider(props: { index: number }) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  return (
    <div
      className={styles["clear-context"]}
      onClick={() =>
        chatStore.updateTargetSession(session, (session) => {
          session.clearContextIndex = undefined;
          if (props.index > 0) {
            session.messages[props.index - 1].beClear = false;
          }
        })
      }
    >
      <div className={styles["clear-context-tips"]}>{Locale.Context.Clear}</div>
      <div className={styles["clear-context-revert-btn"]}>
        {Locale.Context.Revert}
      </div>
    </div>
  );
}

export function ChatAction(props: {
  text: string;
  icon: JSX.Element;
  alwaysShowText?: boolean;
  onClick: () => void;
}) {
  const isMobileScreen = useMobileScreen();
  const shouldAlawayShowText = !isMobileScreen && props.alwaysShowText;

  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState({
    full: 16,
    icon: 16,
  });
  const { text, icon } = props;
  useLayoutEffect(() => {
    updateWidth();
  }, [shouldAlawayShowText, text, icon]);

  function updateWidth() {
    if (!iconRef.current || !textRef.current) return;
    const getWidth = (dom: HTMLDivElement) => dom.getBoundingClientRect().width;
    const textWidth = getWidth(textRef.current);
    const iconWidth = getWidth(iconRef.current);
    setWidth({
      full: textWidth + iconWidth,
      icon: iconWidth,
    });
  }

  return (
    <div
      className={`${styles["chat-input-action"]} clickable ${
        shouldAlawayShowText ? styles["always-show-text"] : ""
      }`}
      onClick={() => {
        props.onClick();
        setTimeout(updateWidth, 1);
      }}
      onMouseEnter={!shouldAlawayShowText ? updateWidth : undefined}
      onTouchStart={!shouldAlawayShowText ? updateWidth : undefined}
      style={
        {
          "--icon-width": `${width.icon}px`,
          "--full-width": `${width.full}px`,
        } as React.CSSProperties
      }
    >
      <div ref={iconRef} className={styles["icon"]}>
        {props.icon}
      </div>
      <div
        className={styles["text"]}
        ref={textRef}
        style={
          shouldAlawayShowText
            ? { opacity: 1, transform: "translate(0)", pointerEvents: "auto" }
            : {}
        }
      >
        {text}
      </div>
    </div>
  );
}

function useScrollToBottom(
  scrollRef: RefObject<HTMLDivElement>,
  detach: boolean = false,
) {
  // for auto-scroll

  const [autoScroll, setAutoScroll] = useState(true);
  function scrollDomToBottom() {
    const dom = scrollRef.current;
    if (dom) {
      requestAnimationFrame(() => {
        setAutoScroll(true);
        dom.scrollTo(0, dom.scrollHeight);
      });
    }
  }

  // auto scroll
  useEffect(() => {
    if (autoScroll && !detach) {
      scrollDomToBottom();
    }
  });

  return {
    scrollRef,
    autoScroll,
    setAutoScroll,
    scrollDomToBottom,
  };
}

export function ChatActions(props: {
  uploadDocument: () => void;
  uploadImage: () => Promise<string[]>;
  attachImages: string[];
  setAttachImages: (images: string[]) => void;
  attachFiles: UploadFile[];
  setAttachFiles: (files: UploadFile[]) => void;
  setUploading: (uploading: boolean) => void;
  showPromptModal: () => void;
  scrollToBottom: () => void;
  showPromptHints: () => void;
  hitBottom: boolean;
  uploading: boolean;
  setShowShortcutKeyModal: React.Dispatch<React.SetStateAction<boolean>>;
  userInput: string;
  setUserInput: (input: string) => void;
  modelTable: Model[];
}) {
  const config = useAppConfig();
  const navigate = useNavigate();
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const access = useAccessStore();

  // translate
  const [isTranslating, setIsTranslating] = useState(false);
  const [originalTextForTranslate, setOriginalTextForTranslate] = useState<
    string | null
  >(null);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  // ocr
  const [isOCRing, setIsOCRing] = useState(false);
  // improve prompt
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [originalPromptForImproving, setOriginalPromptForImproving] = useState<
    string | null
  >(null);
  const [optimizedPrompt, setOptimizedPrompt] = useState<string | null>(null);
  // privacy
  const [isPrivacying, setIsPrivacying] = useState(false);
  const [originalTextForPrivacy, setOriginalTextForPrivacy] = useState<
    string | null
  >(null);
  const [privacyProcessedText, setPrivacyProcessedText] = useState<
    string | null
  >(null);
  // continue chat
  const [isContinue, setIsContinue] = useState(false);
  // model

  // 监听用户输入变化，如果输入改变则重置撤销状态
  useEffect(() => {
    // 当用户输入变化时，检查是否需要重置撤销状态
    if (
      originalTextForTranslate !== null &&
      props.userInput.trim() !== translatedText?.trim()
    ) {
      // 如果当前输入与原始输入不同，则重置翻译的撤销状态
      setOriginalTextForTranslate(null);
      setTranslatedText(null);
    }

    if (
      originalTextForPrivacy !== null &&
      props.userInput.trim() !== privacyProcessedText
    ) {
      // 如果当前输入与经过隐私处理的原始输入不同，则重置隐私处理的撤销状态
      setOriginalTextForPrivacy(null);
      setPrivacyProcessedText(null);
    }
  }, [props.userInput]);

  const handleTranslate = async () => {
    if (originalTextForTranslate !== null) {
      // 执行撤销操作
      props.setUserInput(originalTextForTranslate);
      setOriginalTextForTranslate(null);
      setTranslatedText(null);
      showToast(Locale.Chat.InputActions.Translate.UndoToast);
      return;
    }
    if (props.userInput.trim() === "") {
      showToast(Locale.Chat.InputActions.Translate.BlankToast);
      return;
    }
    setIsTranslating(true);
    showToast(Locale.Chat.InputActions.Translate.isTranslatingToast);
    //
    const modelConfig = session.mask.modelConfig;
    // let translateModel = modelConfig.translateModel;
    // let providerName = modelConfig.translateProviderName;
    let textProcessModel = modelConfig.textProcessModel;
    let providerName = modelConfig.textProcessProviderName;

    if (!providerName && access.textProcessModel) {
      let providerNameStr;
      [textProcessModel, providerNameStr] = access.textProcessModel.split("@");
      providerName = providerNameStr as ServiceProvider;
    }
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
    const api: ClientApi = getClientApi(providerName);
    api.llm.chat({
      messages: [
        {
          role: "system",
          content: `${Locale.Chat.InputActions.Translate.SystemPrompt}`,
        },
        {
          role: "user",
          content: `${Locale.Chat.InputActions.Translate.UserPrompt} ${props.userInput}`,
        },
      ],
      config: {
        model: textProcessModel,
        stream: false,
      },
      onFinish(message, responseRes) {
        if (responseRes?.status === 200) {
          if (typeof message !== "string") {
            message = message.content;
          }
          if (!isValidMessage(message)) {
            showToast(Locale.Chat.InputActions.Translate.FailTranslateToast);
            return;
          }

          let translatedContent = message;
          translatedContent = translatedContent || props.userInput; // 避免空翻译无法撤销

          // 保存原始文本和翻译结果以便撤销
          setOriginalTextForTranslate(props.userInput);
          setTranslatedText(translatedContent);
          props.setUserInput(translatedContent);

          showToast(Locale.Chat.InputActions.Translate.SuccessTranslateToast);
        } else {
          showToast(Locale.Chat.InputActions.Translate.FailTranslateToast);
        }
        setIsTranslating(false);
      },
    });
  };
  const handleOCR = async () => {
    let uploadedImages: string[] = props.attachImages || [];
    if (isEmpty(props.attachImages)) {
      uploadedImages = await props.uploadImage();
      // console.log("uploadedImages", uploadedImages);
      // 如果上传后仍然没有图片，则退出
      if (isEmpty(uploadedImages)) {
        showToast(Locale.Chat.InputActions.OCR.BlankToast);
        return;
      }
    }
    setIsOCRing(true);
    showToast(Locale.Chat.InputActions.OCR.isDetectingToast);
    //
    const modelConfig = session.mask.modelConfig;
    let ocrModel = modelConfig.ocrModel;
    let providerName = modelConfig.ocrProviderName;
    if (!providerName && access.ocrModel) {
      let providerNameStr;
      [ocrModel, providerNameStr] = access.ocrModel.split("@");
      providerName = providerNameStr as ServiceProvider;
    }

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

    const api: ClientApi = getClientApi(providerName);
    let textValue = Locale.Chat.InputActions.OCR.DetectPrompt;
    if (props.userInput && props.userInput.trim() !== "") {
      textValue += `\n(${props.userInput})`;
    }
    const newContext: MultimodalContent[] = [{ type: "text", text: textValue }];
    for (const image of uploadedImages) {
      newContext.push({ type: "image_url", image_url: { url: image } });
    }

    api.llm.chat({
      messages: [
        {
          role: "system",
          content: `${Locale.Chat.InputActions.OCR.DetectSystemPrompt}`,
        },
        {
          role: "user",
          content: newContext,
        },
      ],
      config: {
        model: ocrModel,
        stream: false,
      },
      onFinish(message, responseRes) {
        if (responseRes?.status === 200) {
          if (typeof message !== "string") {
            message = message.content;
          }
          if (!isValidMessage(message)) {
            showToast(Locale.Chat.InputActions.OCR.FailDetectToast);
            return;
          }
          props.setUserInput(
            `${props.userInput}${props.userInput ? "\n" : ""}${message}`,
          );
          props.setAttachImages([]);
          showToast(Locale.Chat.InputActions.OCR.SuccessDetectToast);
        } else {
          showToast(Locale.Chat.InputActions.OCR.FailDetectToast);
        }
        setIsOCRing(false);
      },
    });
  };
  const handleImprovePrompt = async () => {
    if (originalPromptForImproving !== null) {
      // 执行撤销操作
      props.setUserInput(originalPromptForImproving);
      setOriginalPromptForImproving(null);
      setOptimizedPrompt(null);
      showToast(Locale.Chat.InputActions.ImprovePrompt.UndoToast);
      return;
    }
    if (props.userInput.trim() === "") {
      showToast(Locale.Chat.InputActions.ImprovePrompt.BlankToast);
      return;
    }
    setIsImprovingPrompt(true);
    showToast(Locale.Chat.InputActions.ImprovePrompt.isImprovingToast);
    //
    const modelConfig = session.mask.modelConfig;
    let textProcessModel = modelConfig.textProcessModel;
    let providerName = modelConfig.textProcessProviderName;
    if (!providerName && access.textProcessModel) {
      let providerNameStr;
      [textProcessModel, providerNameStr] = access.textProcessModel.split("@");
      providerName = providerNameStr as ServiceProvider;
    }
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
    const api: ClientApi = getClientApi(providerName);
    api.llm.chat({
      messages: [
        {
          role: "system",
          content: `${Locale.Chat.InputActions.ImprovePrompt.SystemPrompt}`,
        },
        {
          role: "user",
          content: `${Locale.Chat.InputActions.ImprovePrompt.UserPrompt} ${props.userInput}`,
        },
      ],
      config: {
        model: textProcessModel,
        stream: false,
      },
      onFinish(message, responseRes) {
        if (responseRes?.status === 200) {
          if (typeof message !== "string") {
            message = message.content;
          }
          if (!isValidMessage(message)) {
            showToast(
              Locale.Chat.InputActions.ImprovePrompt.FailImprovingToast,
            );
            return;
          }

          let optimizedContent = message;
          optimizedContent = optimizedContent || props.userInput; // 避免空翻译无法撤销

          // 保存原始文本和翻译结果以便撤销
          setOriginalPromptForImproving(props.userInput);
          setOptimizedPrompt(optimizedContent);
          props.setUserInput(optimizedContent);

          showToast(
            Locale.Chat.InputActions.ImprovePrompt.SuccessImprovingToast,
          );
        } else {
          showToast(Locale.Chat.InputActions.ImprovePrompt.FailImprovingToast);
        }
        setIsImprovingPrompt(false);
      },
    });
  };
  const handlePrivacy = async () => {
    if (originalTextForPrivacy !== null) {
      // 执行撤销操作
      props.setUserInput(originalTextForPrivacy);
      setOriginalTextForPrivacy(null);
      setPrivacyProcessedText(null);
      showToast(Locale.Chat.InputActions.Privacy.UndoToast);
      return;
    }

    if (props.userInput.trim() === "") {
      showToast(Locale.Chat.InputActions.Privacy.BlankToast);
      return;
    }
    setIsPrivacying(true);
    showToast(Locale.Chat.InputActions.Privacy.isPrivacyToast);
    const markedText = maskSensitiveInfo(props.userInput);
    // 保存原始文本以便撤销
    setOriginalTextForPrivacy(props.userInput);
    setPrivacyProcessedText(markedText);
    props.setUserInput(markedText);

    showToast(Locale.Chat.InputActions.Privacy.SuccessPrivacyToast);
    setIsPrivacying(false);
  };
  function maskSensitiveInfo(text: string): string {
    // 手机号: 保留前3位和后4位
    const maskPhone = (match: string): string => {
      return match.slice(0, 3) + "****" + match.slice(-4);
    };

    // 邮箱: 保留用户名首字母和完整域名
    const maskEmail = (match: string): string => {
      const [username, domain] = match.split("@");
      return username[0] + "***" + "@" + domain;
    };

    // UUID: 保留首尾各4位
    const maskUUID = (match: string): string => {
      return match.slice(0, 4) + "****" + match.slice(-4);
    };

    // IP地址: 保留第一段
    const maskIP = (match: string): string => {
      const segments = match.split(".");
      return segments[0] + ".*.*.*";
    };

    // sk-开头的密钥: 保留前4位和后4位，中间部分用*替换
    const maskKey = (match: string): string => {
      return match.slice(0, 4) + "*".repeat(match.length - 8) + match.slice(-4);
    };

    // 正则匹配
    const patterns: { regex: RegExp; maskFunc: (match: string) => string }[] = [
      { regex: /1[3-9]\d{9}/g, maskFunc: maskPhone }, // 11位手机号
      {
        regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        maskFunc: maskEmail,
      }, // 邮箱
      {
        regex:
          /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
        maskFunc: maskUUID,
      }, // UUID
      { regex: /\b\d{1,3}(\.\d{1,3}){3}\b/g, maskFunc: maskIP }, // IP地址
      { regex: /sk-[a-zA-Z0-9]{12,}/g, maskFunc: maskKey }, // sk-开头的、超过12位的密钥
    ];

    let maskedText = text;
    for (const { regex, maskFunc } of patterns) {
      maskedText = maskedText.replace(regex, maskFunc);
    }

    return maskedText;
  }
  const handleContinueChat = async () => {
    setIsContinue(true);
    showToast(Locale.Chat.InputActions.Continue.isContinueToast);

    const continuePrompt = config.customUserContinuePrompt
      ? config.customUserContinuePrompt
      : Locale.Chat.InputActions.Continue.ContinuePrompt;
    chatStore
      .onUserInput(continuePrompt, [], [], true)
      .then(() => setIsContinue(false));
    chatStore.setLastInput(continuePrompt);
    setIsContinue(false);
  };

  function isValidMessage(message: any): boolean {
    if (typeof message !== "string") {
      return false;
    }
    message = message.trim();
    if (message.startsWith("```") && message.endsWith("```")) {
      const codeBlockContent = message.slice(3, -3).trim();
      const jsonString = codeBlockContent.replace(/^json\s*/i, "").trim();
      try {
        // 返回 json 格式消息，error 字段为 true 或者包含 error.message 字段，判定为错误回复，否则为正常回复
        const jsonObject = JSON.parse(jsonString);
        if (jsonObject?.error == true || jsonObject?.error?.message) {
          return false;
        }
        return true;
      } catch (e) {
        console.log("Invalid JSON format.");
        // 非 json 格式，通常可认为是正常回复
        return true;
      }
    }
    return true;
  }
  // 统一的文件上传处理函数
  const handleFileUpload = () => {
    if (props.uploading) return;

    // 创建文件输入元素
    const fileInput = document.createElement("input");
    fileInput.type = "file";

    // // 设置接受的文件类型
    // if (canUploadImage) {
    //   // 支持图片和文本文件
    //   const imageTypes =
    //     "image/png, image/jpeg, image/webp, image/heic, image/heif";
    //   const textTypes = textFileExtensions.map((ext) => `.${ext}`).join(",");
    //   fileInput.accept = `${imageTypes}, ${textTypes}`;
    // } else {
    //   // 只支持文本文件
    //   fileInput.accept = textFileExtensions.map((ext) => `.${ext}`).join(",");
    // }

    // Always accept image files, regardless of model
    const imageTypes =
      "image/png, image/jpeg, image/webp, image/heic, image/heif";
    const textTypes = textFileExtensions.map((ext) => `.${ext}`).join(",");
    fileInput.accept = `${imageTypes}, ${textTypes}`;
    fileInput.multiple = true;

    fileInput.onchange = async (event: any) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);

      const imageFiles: File[] = [];
      const textFiles: File[] = [];

      // 分类文件
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          imageFiles.push(file);
          // if (canUploadImage) {
          //   imageFiles.push(file);
          // } else {
          //   showToast(
          //     Locale.Chat.InputActions.UploadFile.UnsupportToUploadImage,
          //   );
          //   continue;
          // }
        } else {
          textFiles.push(file);
        }
      }

      // 处理图片文件
      if (imageFiles.length > 0) {
        const images = [...props.attachImages];

        for (const file of imageFiles) {
          try {
            const dataUrl = await uploadImageRemote(file);
            images.push(dataUrl);
          } catch (e) {
            console.error("Error uploading image:", e);
            showToast(String(e));
          }
        }

        // 限制图片数量
        if (images.length > 3) {
          images.splice(3, images.length - 3);
        }

        props.setAttachImages(images);
      }

      // 处理文本文件
      if (textFiles.length > 0) {
        const files = [...props.attachFiles];

        for (const file of textFiles) {
          try {
            const data = await uploadFileRemote(file);
            const tokenCount: number = countTokens(data.content);
            const fileData: UploadFile = {
              name: file.name,
              url: data.content,
              contentType: data.type,
              size: parseFloat((file.size / 1024).toFixed(2)),
              tokenCount: tokenCount,
            };

            // 限制文件大小
            if (fileData?.size && fileData?.size > maxFileSizeInKB) {
              showToast(Locale.Chat.InputActions.UploadFile.FileTooLarge);
              continue;
            }

            // 检查是否有同名且内容相同的文件
            const isDuplicate = files.some(
              (existingFile) =>
                existingFile.name === fileData.name &&
                existingFile.url === fileData.url,
            );

            if (isDuplicate) {
              showToast(
                Locale.Chat.InputActions.UploadFile.DuplicateFile(file.name),
              );
              continue;
            }

            if (data.content && tokenCount > 0) {
              files.push(fileData);
            }
          } catch (e) {
            console.error("Error uploading file:", e);
            showToast(String(e));
          }
        }

        // 限制文件数量
        if (files.length > MAX_DOC_CNT) {
          files.splice(MAX_DOC_CNT, files.length - MAX_DOC_CNT);
          showToast(Locale.Chat.InputActions.UploadFile.TooManyFile);
        }

        props.setAttachFiles(files);
      }

      setUploading(false);
    };

    fileInput.click();
  };
  // switch themes
  const theme = config.theme;
  function nextTheme() {
    const themes = [Theme.Auto, Theme.Light, Theme.Dark];
    const themeIndex = themes.indexOf(theme);
    const nextIndex = (themeIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    config.update((config) => (config.theme = nextTheme));
  }

  // stop all responses
  const couldStop = ChatControllerPool.hasPending();
  const stopAll = () => ChatControllerPool.stopAll();

  // switch model
  const models = props.modelTable;
  const currentModel = session.mask.modelConfig.model;
  const currentProviderName =
    session.mask.modelConfig?.providerName || ServiceProvider.OpenAI;
  const [currentModelInfo, setCurrentModelInfo] = useState<Model | null>(null);
  useEffect(() => {
    const _currentModel =
      models.find(
        (m) =>
          m.name === currentModel &&
          m.provider?.providerName === currentProviderName,
      ) || null;
    setCurrentModelInfo(_currentModel);
    try {
      const storedProvidersData = safeLocalStorage().getItem(
        StoreKey.CustomProvider,
      );
      const providers = storedProvidersData
        ? JSON.parse(storedProvidersData)
        : [];

      const provider = Array.isArray(providers)
        ? providers.find((provider) => provider.name === currentProviderName)
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
  }, [
    models,
    session.mask.modelConfig.model,
    session.messages,
    currentModel,
    currentProviderName,
  ]);
  const canUploadImage =
    isVisionModel(currentModel) || !!currentModelInfo?.enableVision;

  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showUploadImage, setShowUploadImage] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const toggleMobileActions = () => setShowMobileActions(!showMobileActions);

  const isMobileScreen = useMobileScreen();
  const { setAttachImages, setUploading } = props;

  useEffect(() => {
    const show = isVisionModel(currentModel);
    setShowUploadImage(show);
    if (!show) {
      // setAttachImages([]);
      setUploading(false);
    }

    // if current model is not available
    // switch to first available model
    const isUnavaliableModel = !models.some((m) => m.name === currentModel);
    if (isUnavaliableModel && models.length > 0) {
      // show next model to default model if exist
      let nextModel: ModelType = (
        models.find((model) => model.isDefault) || models[0]
      ).name;
      chatStore.updateTargetSession(
        session,
        (session) => (session.mask.modelConfig.model = nextModel),
      );
      showToast(nextModel);
    }
  }, [chatStore, currentModel, models, session, setAttachImages, setUploading]);

  return (
    <div className={styles["chat-input-actions"]}>
      <div className={styles["primary-actions"]}>
        {couldStop && (
          <ChatAction
            onClick={stopAll}
            text={Locale.Chat.InputActions.Stop}
            icon={<StopIcon />}
          />
        )}
        {!props.hitBottom && (
          <ChatAction
            onClick={props.scrollToBottom}
            text={Locale.Chat.InputActions.ToBottom}
            icon={<BottomIcon />}
          />
        )}
        {props.hitBottom && (
          <ChatAction
            onClick={props.showPromptModal}
            text={Locale.Chat.InputActions.Settings}
            icon={<SettingsIcon />}
          />
        )}
        {/* 统一的上传按钮，使用回形针图标 */}
        <ChatAction
          onClick={handleFileUpload}
          text={Locale.Chat.InputActions.UploadFile.Title(canUploadImage)}
          icon={props.uploading ? <LoadingButtonIcon /> : <AttachmentIcon />}
        />
        {/* {showUploadImage && (
          <ChatAction
            onClick={props.uploadImage}
            text={Locale.Chat.InputActions.UploadImage}
            icon={props.uploading ? <LoadingButtonIcon /> : <ImageIcon />}
          />
        )}
        <ChatAction
          onClick={props.uploadDocument}
          text={Locale.Chat.InputActions.UploadFile.Title}
          icon={props.uploading ? <LoadingButtonIcon /> : <UploadDocIcon />}
        /> */}
        {/* {!isMobileScreen && (
          <ChatAction
            onClick={nextTheme}
            text={Locale.Chat.InputActions.Theme[theme]}
            icon={
              <>
                {theme === Theme.Auto ? (
                  <AutoIcon />
                ) : theme === Theme.Light ? (
                  <LightIcon />
                ) : theme === Theme.Dark ? (
                  <DarkIcon />
                ) : null}
              </>
            }
          />
        )} */}

        {!isMobileScreen && (
          <ChatAction
            onClick={props.showPromptHints}
            text={Locale.Chat.InputActions.Prompt}
            icon={<PromptIcon />}
          />
        )}

        {/* {!isMobileScreen && (
          <ChatAction
            onClick={() => {
              navigate(Path.Masks);
            }}
            text={Locale.Chat.InputActions.Masks}
            icon={<MaskIcon />}
          />
        )} */}

        <ChatAction
          text={Locale.Chat.InputActions.Clear}
          icon={<BreakIcon />}
          onClick={() => {
            chatStore.updateTargetSession(session, (session) => {
              // 找到最后一条消息
              const lastMessage = session.messages[session.messages.length - 1];
              if (lastMessage) {
                if (lastMessage?.beClear) {
                  session.clearContextIndex = undefined;
                  lastMessage.beClear = false;
                } else {
                  session.clearContextIndex = session.messages.length;
                  lastMessage.beClear = true;
                  session.memoryPrompt = ""; // 清除记忆提示
                }
              }
            });
          }}
        />
        <ChatAction
          text={Locale.Chat.InputActions.Continue.Title}
          icon={<ContinueIcon />}
          onClick={handleContinueChat}
        />
        <ChatAction
          text={
            !session?.inPrivateMode
              ? Locale.Chat.InputActions.PrivateMode.On
              : Locale.Chat.InputActions.PrivateMode.Off
          }
          alwaysShowText={session?.inPrivateMode}
          icon={<PrivacyModeIcon />}
          onClick={() => {
            if (!session?.inPrivateMode) {
              chatStore.newSession(undefined, true);
              showToast(Locale.Chat.InputActions.PrivateMode.OnToast);
            } else {
              chatStore.deleteSession(chatStore.currentSessionIndex);
            }
          }}
        />
        <ChatAction
          onClick={() => setShowModelSelector(true)}
          alwaysShowText={true}
          text={currentModelInfo?.displayName || currentModel}
          icon={<RobotIcon />}
        />

        {showModelSelector && (
          <SearchSelector
            defaultSelectedValue={`${currentModel}@${currentProviderName}`}
            items={models.map((m) => ({
              title:
                m?.provider?.providerName?.toLowerCase() === "openai" ||
                m?.provider?.providerType === "custom-provider" ||
                m?.provider?.providerName === m.name
                  ? `${m.displayName}`
                  : `${m.displayName} (${m?.provider?.providerName})`,
              subTitle: m.description,
              value: `${m.name}@${m?.provider?.providerName}`,
            }))}
            onClose={() => setShowModelSelector(false)}
            onSelection={(s) => {
              if (s.length === 0) return;
              const [model, providerName] = s[0].split(/@(?=[^@]*$)/);
              chatStore.updateTargetSession(session, (session) => {
                session.mask.modelConfig.model = model as ModelType;
                session.mask.modelConfig.providerName =
                  providerName as ServiceProvider;
                session.mask.syncGlobalConfig = false;
              });
              showToast(model);
            }}
          />
        )}
        {isMobileScreen && !showMobileActions && (
          <ChatAction
            onClick={toggleMobileActions}
            text={Locale.Chat.InputActions.Expand}
            icon={<ExpandIcon />}
          />
        )}
      </div>
      <div
        className={`${styles["secondary-actions"]} ${
          isMobileScreen && !showMobileActions ? styles["mobile-collapsed"] : ""
        }`}
      >
        {!isMobileScreen && (
          <ChatAction
            onClick={() => props.setShowShortcutKeyModal(true)}
            text={Locale.Chat.ShortcutKey.Title}
            icon={<ShortcutkeyIcon />}
          />
        )}
        {!isMobileScreen && (
          <ChatAction
            onClick={() => {
              navigate(Path.SearchChat);
            }}
            text={Locale.SearchChat.Page.Title}
            icon={<SearchChatIcon />}
          />
        )}
        <ChatAction
          onClick={() => {
            navigate(Path.CloudBackup);
          }}
          text={Locale.Chat.InputActions.CloudBackup}
          icon={<FileExpressIcon />}
        />
        <ChatAction
          onClick={handleTranslate}
          text={
            originalTextForTranslate !== null
              ? Locale.Chat.InputActions.Translate.Undo
              : isTranslating
              ? Locale.Chat.InputActions.Translate.isTranslatingToast
              : Locale.Chat.InputActions.Translate.Title
          }
          alwaysShowText={isTranslating || originalTextForTranslate !== null}
          icon={<TranslateIcon />}
        />
        {/* {!isMobileScreen && ( */}
        <ChatAction
          onClick={handleOCR}
          text={
            isOCRing
              ? Locale.Chat.InputActions.OCR.isDetectingToast
              : Locale.Chat.InputActions.OCR.Title
          }
          alwaysShowText={isOCRing}
          icon={<OcrIcon />}
        />
        {/* )} */}

        <ChatAction
          onClick={handleImprovePrompt}
          text={
            originalPromptForImproving !== null
              ? Locale.Chat.InputActions.ImprovePrompt.Undo
              : isImprovingPrompt
              ? Locale.Chat.InputActions.ImprovePrompt.isImprovingToast
              : Locale.Chat.InputActions.ImprovePrompt.Title
          }
          alwaysShowText={
            isImprovingPrompt || originalPromptForImproving !== null
          }
          icon={<ImprovePromptIcon />}
        />
        <ChatAction
          onClick={handlePrivacy}
          text={
            originalTextForPrivacy !== null
              ? Locale.Chat.InputActions.Privacy.Undo
              : isPrivacying
              ? Locale.Chat.InputActions.Privacy.isPrivacyToast
              : Locale.Chat.InputActions.Privacy.Title
          }
          alwaysShowText={isPrivacying || originalTextForPrivacy !== null}
          icon={<PrivacyIcon />}
        />
        {isMobileScreen && showMobileActions && (
          <ChatAction
            onClick={toggleMobileActions}
            alwaysShowText={true}
            text={Locale.Chat.InputActions.Collapse}
            icon={<CollapseIcon />}
          />
        )}
      </div>
    </div>
  );
}

export function EditMessageModal(props: { onClose: () => void }) {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const [messages, setMessages] = useState(session.messages.slice());

  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Chat.EditMessage.Title}
        onClose={props.onClose}
        actions={[
          <IconButton
            text={Locale.UI.Cancel}
            icon={<CancelIcon />}
            key="cancel"
            onClick={() => {
              props.onClose();
            }}
          />,
          <IconButton
            type="primary"
            text={Locale.UI.Confirm}
            icon={<ConfirmIcon />}
            key="ok"
            onClick={() => {
              chatStore.updateTargetSession(
                session,
                (session) => (session.messages = messages),
              );
              props.onClose();
            }}
          />,
        ]}
      >
        <List>
          <ListItem
            title={Locale.Chat.EditMessage.Topic.Title}
            subTitle={Locale.Chat.EditMessage.Topic.SubTitle}
          >
            <input
              type="text"
              value={session.topic}
              onInput={(e) =>
                chatStore.updateTargetSession(
                  session,
                  (session) => (session.topic = e.currentTarget.value),
                )
              }
            ></input>
          </ListItem>
        </List>
        <ContextPrompts
          context={messages}
          updateContext={(updater) => {
            const newMessages = messages.slice();
            updater(newMessages);
            setMessages(newMessages);
          }}
        />
      </Modal>
    </div>
  );
}

export function DeleteImageButton(props: { deleteImage: () => void }) {
  return (
    <div className={styles["delete-image"]} onClick={props.deleteImage}>
      <DeleteIcon />
    </div>
  );
}

export function ShortcutKeyModal(props: { onClose: () => void }) {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const shortcuts = [
    {
      title: Locale.Chat.ShortcutKey.newChat,
      keys: isMac ? ["⌘", "Shift", "O"] : ["Ctrl", "Shift", "O"],
    },
    { title: Locale.Chat.ShortcutKey.focusInput, keys: ["Shift", "Esc"] },
    {
      title: Locale.Chat.ShortcutKey.copyLastCode,
      keys: isMac ? ["⌘", "Shift", ";"] : ["Ctrl", "Shift", ";"],
    },
    {
      title: Locale.Chat.ShortcutKey.resendLastMessage,
      keys: isMac ? ["⌘", "Shift", "L"] : ["Ctrl", "Shift", "L"],
    },
    {
      title: Locale.Chat.ShortcutKey.copyLastMessage,
      keys: isMac ? ["⌘", "Shift", "C"] : ["Ctrl", "Shift", "C"],
    },
    {
      title: Locale.Chat.ShortcutKey.showShortcutKey,
      keys: isMac ? ["⌘", "/"] : ["Ctrl", "/"],
    },
    {
      title: Locale.Chat.ShortcutKey.moveCursorToStart,
      keys: isMac ? ["⌘", "Shift", "Left"] : ["Ctrl", "Shift", "Left"],
    },
    {
      title: Locale.Chat.ShortcutKey.moveCursorToEnd,
      keys: isMac ? ["⌘", "Shift", "Right"] : ["Ctrl", "Shift", "Right"],
    },
    {
      title: Locale.Chat.ShortcutKey.searchChat,
      keys: isMac ? ["⌘", "Alt", "F"] : ["Ctrl", "Alt", "F"],
    },
  ];
  return (
    <div className="modal-mask">
      <Modal
        title={Locale.Chat.ShortcutKey.Title}
        onClose={props.onClose}
        actions={[
          <IconButton
            type="primary"
            text={Locale.UI.Confirm}
            icon={<ConfirmIcon />}
            key="ok"
            onClick={() => {
              props.onClose();
            }}
          />,
        ]}
      >
        <div className={styles["shortcut-key-container"]}>
          <div className={styles["shortcut-key-grid"]}>
            {shortcuts.map((shortcut, index) => (
              <div key={index} className={styles["shortcut-key-item"]}>
                <div className={styles["shortcut-key-title"]}>
                  {shortcut.title}
                </div>
                <div className={styles["shortcut-key-keys"]}>
                  {shortcut.keys.map((key, i) => (
                    <div key={i} className={styles["shortcut-key"]}>
                      <span>{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ChatInputActions(props: {
  message: any; // 根据实际情况定义 message 的类型
  onUserStop: (messageId: string) => void;
  onResend: (message: any) => void;
  onDelete: (msgId: string) => void;
  onBreak: (msgId: string) => void;
  onPinMessage: (message: any) => void;
  copyToClipboard: (text: string) => void;
  openaiSpeech: (text: string) => void;
  setUserInput: (text: string) => void;
  speechStatus: boolean;
  config: any;
  i: number;
}) {
  const {
    message,
    onUserStop,
    onResend,
    onDelete,
    onBreak,
    onPinMessage,
    copyToClipboard,
    openaiSpeech,
    setUserInput,
    speechStatus,
    config,
    i,
  } = props;

  return (
    <div className={styles["message-actions-row"]}>
      {message.streaming ? (
        <ChatAction
          text={Locale.Chat.Actions.Stop}
          icon={<StopIcon />}
          onClick={() => onUserStop(message.id ?? i)}
        />
      ) : (
        <>
          <ChatAction
            text={Locale.Chat.Actions.Retry}
            icon={<ResetIcon />}
            onClick={() => onResend(message)}
          />

          <ChatAction
            text={Locale.Chat.Actions.Delete}
            icon={<DeleteIcon />}
            onClick={() => onDelete(message.id ?? i)}
          />

          {/* <ChatAction
            text={Locale.Chat.Actions.Pin}
            icon={<PinIcon />}
            onClick={() => onPinMessage(message)}
          /> */}
          <ChatAction
            text={Locale.Chat.Actions.Copy}
            icon={<CopyIcon />}
            onClick={() => copyToClipboard(getMessageTextContent(message))}
          />
          {config.ttsConfig.enable && (
            <ChatAction
              text={
                speechStatus
                  ? Locale.Chat.Actions.StopSpeech
                  : Locale.Chat.Actions.Speech
              }
              icon={speechStatus ? <SpeakStopIcon /> : <SpeakIcon />}
              onClick={() => openaiSpeech(getMessageTextContent(message))}
            />
          )}
          <ChatAction
            text={Locale.Chat.Actions.EditToInput}
            icon={<EditToInputIcon />}
            onClick={() => setUserInput(getMessageTextContent(message))}
          />
          <ChatAction
            text={Locale.Chat.InputActions.Clear}
            icon={<BreakIcon />}
            onClick={() => onBreak(message.id ?? i)}
          />
        </>
      )}
    </div>
  );
}
function ChatComponent({ modelTable }: { modelTable: Model[] }) {
  type RenderMessage = ChatMessage & { preview?: boolean };

  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const config = useAppConfig();
  const fontSize = config.fontSize;

  const [showExport, setShowExport] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { submitKey, shouldSubmit } = useSubmitHandler();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrolledToBottom = scrollRef?.current
    ? Math.abs(
        scrollRef.current.scrollHeight -
          (scrollRef.current.scrollTop + scrollRef.current.clientHeight),
      ) <= 1
    : false;
  const isAttachWithTop = useMemo(() => {
    const lastMessage = scrollRef.current?.lastElementChild as HTMLElement;
    // if scrolllRef is not ready or no message, return false
    if (!scrollRef?.current || !lastMessage) return false;
    const topDistance =
      lastMessage!.getBoundingClientRect().top -
      scrollRef.current.getBoundingClientRect().top;
    // leave some space for user question
    return topDistance < 100;
  }, [scrollRef?.current?.scrollHeight]);

  const isTyping = userInput !== "";

  // if user is typing, should auto scroll to bottom
  // if user is not typing, should auto scroll to bottom only if already at bottom

  const { setAutoScroll, scrollDomToBottom } = useScrollToBottom(
    scrollRef,
    (isScrolledToBottom || isAttachWithTop) && !isTyping,
  );
  const [hitBottom, setHitBottom] = useState(true);
  const isMobileScreen = useMobileScreen();
  const navigate = useNavigate();
  const [attachImages, setAttachImages] = useState<string[]>([]);
  const [attachFiles, setAttachFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [renameAttachFile, setRenameAttachFile] = useState<{
    index: number;
    name: string;
  } | null>(null);

  const [showModelAtSelector, setShowModelAtSelector] = useState(false); // 是否显示@
  const [modelAtQuery, setModelAtQuery] = useState(""); // 模型选择器的搜索字符
  const [modelAtSelectIndex, setModelAtSelectIndex] = useState(0); // 当前选中模型的索引

  // prompt hints
  const promptStore = usePromptStore();
  const [promptHints, setPromptHints] = useState<RenderPompt[]>([]);
  const onSearch = useDebouncedCallback(
    (text: string) => {
      const matchedPrompts = promptStore.search(text);
      setPromptHints(matchedPrompts);
    },
    100,
    { leading: true, trailing: true },
  );

  // auto grow input
  const minInputRows = 3;
  const [inputRows, setInputRows] = useState(minInputRows);
  const [isExpanded, setIsExpanded] = useState(false);
  const measure = useDebouncedCallback(
    () => {
      const rows = inputRef.current ? autoGrowTextArea(inputRef.current) : 1;
      const inputRows = isExpanded
        ? 20
        : Math.min(
            20,
            Math.max(minInputRows + 2 * Number(!isMobileScreen), rows),
          );
      setInputRows(inputRows);
    },
    100,
    {
      leading: true,
      trailing: true,
    },
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(measure, [userInput, isExpanded]);
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // chat commands shortcuts
  const chatCommands = useChatCommand({
    edit: async () => {
      // Get the last user message from current session
      const lastUserMessage = [...session.messages]
        .filter((message) => message.role === "user")
        .pop();
      if (!lastUserMessage) {
        showToast(Locale.Chat.Actions.EditNoMessage);
        return;
      }

      const newMessage = await showPrompt(
        Locale.Chat.Actions.Edit,
        getMessageTextContent(lastUserMessage),
        10,
      );

      let newContent: string | MultimodalContent[] = newMessage;
      const images = getMessageImages(lastUserMessage);

      if (images.length > 0) {
        newContent = [{ type: "text", text: newMessage }];
        for (let i = 0; i < images.length; i++) {
          newContent.push({
            type: "image_url",
            image_url: {
              url: images[i],
            },
          });
        }
      }

      chatStore.updateTargetSession(session, (session) => {
        const m = session.mask.context
          .concat(session.messages)
          .find((m) => m.id === lastUserMessage.id);
        if (m) {
          m.content = newContent;
        }
      });
    },
    resend: () => onResend(session.messages[session.messages.length - 1]),
    clear: () =>
      chatStore.updateTargetSession(session, (session) => {
        session.clearContextIndex = session.messages.length;
        if (session.clearContextIndex > 1) {
          session.messages[session.messages.length - 1].beClear = true;
        }
      }),
    new: () => chatStore.newSession(),
    search: () => navigate(Path.SearchChat),
    newm: () => navigate(Path.NewChat),
    prev: () => chatStore.nextSession(-1),
    next: () => chatStore.nextSession(1),
    fork: () => chatStore.forkSession(),
    del: () => chatStore.deleteSession(chatStore.currentSessionIndex),
    pin: () => chatStore.pinSession(chatStore.currentSessionIndex),
    private: () => {
      if (!chatStore.sessions[chatStore.currentSessionIndex]?.inPrivateMode) {
        chatStore.newSession(session.mask, true);
        showToast(Locale.Chat.InputActions.PrivateMode.OnToast);
      } else {
        chatStore.deleteSession(chatStore.currentSessionIndex);
      }
    },
  });

  // only search prompts when user input is short
  const SEARCH_TEXT_LIMIT = 30;
  const onInput = (text: string) => {
    setUserInput(text);
    const n = text.trim().length;

    // const atMatch = text.match(/^@([\w-]*)$/); // 完整匹配 @ 后面任意单词或短线
    const atMatch = text.match(/^@(\S*)$/); // 完整匹配 @ 后面非空字符
    if (!isMobileScreen && atMatch) {
      setModelAtQuery(atMatch[1]);
      setShowModelAtSelector(true);
      setModelAtSelectIndex(0);
    } else {
      setShowModelAtSelector(false);
    }

    // clear search results
    if (n === 0) {
      setPromptHints([]);
    } else if (text.match(ChatCommandPrefix)) {
      setPromptHints(chatCommands.search(text));
    } else if (!config.disablePromptHint && n < SEARCH_TEXT_LIMIT) {
      // check if need to trigger auto completion
      if (text.match(MaskCommandPrefix)) {
        let searchText = text.slice(1);
        onSearch(searchText);
      }
    }
  };

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [modelAtSelectIndex, modelAtQuery, showModelAtSelector]);

  const doSubmit = (userInput: string) => {
    if (userInput.trim() === "" && isEmpty(attachImages)) return;
    const matchCommand = chatCommands.match(userInput);
    if (matchCommand.matched) {
      setUserInput("");
      setPromptHints([]);
      matchCommand.invoke();
      return;
    }
    setIsLoading(true);
    if (canUploadImage) {
      chatStore
        .onUserInput(userInput, attachImages, attachFiles)
        .then(() => setIsLoading(false));
      setAttachImages([]);
    } else {
      chatStore
        .onUserInput(userInput, [], attachFiles)
        .then(() => setIsLoading(false));
    }
    setAttachFiles([]);
    chatStore.setLastInput(userInput);
    setUserInput("");
    setPromptHints([]);
    if (!isMobileScreen) inputRef.current?.focus();
    setAutoScroll(true);
  };

  const onPromptSelect = (prompt: RenderPompt) => {
    setTimeout(() => {
      setPromptHints([]);

      const matchedChatCommand = chatCommands.match(prompt.content);
      if (matchedChatCommand.matched) {
        // if user is selecting a chat command, just trigger it
        matchedChatCommand.invoke();
        setUserInput("");
      } else {
        // or fill the prompt
        setUserInput(prompt.content);
      }
      inputRef.current?.focus();
    }, 30);
  };

  // stop response
  const onUserStop = (messageId: string) => {
    ChatControllerPool.stop(session.id, messageId);
  };

  useEffect(() => {
    chatStore.updateTargetSession(session, (session) => {
      const stopTiming = Date.now() - REQUEST_TIMEOUT_MS;
      session.messages.forEach((m) => {
        // check if should stop all stale messages
        if (m.isError || new Date(m.date).getTime() < stopTiming) {
          if (m.streaming) {
            m.streaming = false;
          }

          if (m.content.length === 0) {
            m.isError = true;
            m.content = prettyObject({
              error: true,
              message: "empty response",
            });
          }
        }
      });

      // auto sync mask config from global config
      if (session.mask.syncGlobalConfig) {
        console.log("[Mask] syncing from global, name = ", session.mask.name);
        session.mask.modelConfig = { ...config.modelConfig };
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const formatModelItem = (model: Model) => ({
    title:
      model?.provider?.providerName?.toLowerCase() === "openai" ||
      model?.provider?.providerType === "custom" ||
      model?.provider?.providerType === "custom-provider" ||
      model?.provider?.providerName === model.name
        ? `${model.displayName || model.name}`
        : `${model.displayName || model.name} (${model?.provider
            ?.providerName})`,
    subTitle: model.description,
    value: `${model.name}@${model?.provider?.providerName}`,
    model: model, // 保存原始模型对象，方便后续使用
  });
  // 修改过滤逻辑
  const getFilteredModels = () => {
    const query = modelAtQuery.toLowerCase();
    return modelTable
      .filter((model) => {
        // 使用与 SearchSelector 相同的过滤逻辑
        const formattedItem = formatModelItem(model);
        return (
          formattedItem.title.toLowerCase().includes(query) ||
          (formattedItem.subTitle &&
            formattedItem.subTitle.toLowerCase().includes(query)) ||
          model.name.toLowerCase().includes(query) ||
          (model.provider?.providerName &&
            model.provider.providerName.toLowerCase().includes(query))
        );
      })
      .map(formatModelItem);
  };
  const selectedRef = useRef<HTMLDivElement>(null); //引用当前所选项
  // check if should send message
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showModelAtSelector) {
      const filteredModels = getFilteredModels();

      const changeIndex = (delta: number) => {
        e.preventDefault();
        setModelAtSelectIndex((prev) => {
          const newIndex = Math.max(
            0,
            Math.min(prev + delta, filteredModels.length - 1),
          );
          return newIndex;
        });
      };

      if (e.key === "ArrowUp") {
        changeIndex(-1);
      } else if (e.key === "ArrowDown") {
        changeIndex(1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selectedItem = filteredModels[modelAtSelectIndex];
        if (selectedItem) {
          // 解析 value 字符串，获取模型名称和提供商
          const [modelName, providerName] =
            selectedItem.value.split(/@(?=[^@]*$)/);

          chatStore.updateTargetSession(session, (session) => {
            session.mask.modelConfig.model = modelName as ModelType;
            session.mask.modelConfig.providerName =
              providerName as ServiceProvider;
            session.mask.syncGlobalConfig = false;
          });
          setUserInput("");
          setShowModelAtSelector(false);
          showToast(modelName);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowModelAtSelector(false);
      }
      return;
    }
    if (e.ctrlKey && e.shiftKey) {
      const textarea = inputRef.current;
      if (!textarea) return;

      if (e.key === "ArrowLeft") {
        // Ctrl+Shift+左箭头：跳转到段首
        e.preventDefault();
        textarea.setSelectionRange(0, 0);
        textarea.focus();
        textarea.scrollTop = 0;
        showToast(Locale.Chat.InputActions.MoveCursorToStart);
      } else if (e.key === "ArrowRight") {
        // Ctrl+Shift+右箭头：跳转到段尾
        e.preventDefault();
        textarea.setSelectionRange(
          textarea.value.length,
          textarea.value.length,
        );
        textarea.focus();
        textarea.scrollTop = textarea.scrollHeight;
        showToast(Locale.Chat.InputActions.MoveCursorToEnd);
      }
      return;
    }
    // if ArrowUp and no userInput, fill with last input
    if (
      e.key === "ArrowUp" &&
      userInput.length <= 0 &&
      !(e.metaKey || e.altKey || e.ctrlKey)
    ) {
      setUserInput(chatStore.lastInput ?? "");
      e.preventDefault();
      return;
    }
    if (shouldSubmit(e) && promptHints.length === 0) {
      doSubmit(userInput);
      e.preventDefault();
    }
  };
  const onRightClick = (e: any, message: ChatMessage) => {
    // copy to clipboard
    if (selectOrCopy(e.currentTarget, getMessageTextContent(message))) {
      if (userInput.length === 0) {
        setUserInput(getMessageTextContent(message));
      }

      e.preventDefault();
    }
  };

  const deleteMessage = (msgId?: string) => {
    chatStore.updateTargetSession(
      session,
      (session) =>
        (session.messages = session.messages.filter((m) => m.id !== msgId)),
    );
  };

  const onDelete = (msgId: string) => {
    deleteMessage(msgId);
  };

  const onBreak = (msgId: string) => {
    chatStore.updateTargetSession(session, (session) => {
      const msg = session.messages.find((m) => m.id === msgId);
      if (msg) {
        msg.beClear = true;
      }
    });
  };

  const onResend = (message: ChatMessage) => {
    // when it is resending a message
    // 1. for a user's message, find the next bot response
    // 2. for a bot's message, find the last user's input
    // 3. delete original user input and bot's message
    // 4. resend the user's input

    const resendingIndex = session.messages.findIndex(
      (m) => m.id === message.id,
    );

    if (resendingIndex < 0 || resendingIndex >= session.messages.length) {
      console.error("[Chat] failed to find resending message", message);
      return;
    }

    let userMessage: ChatMessage | undefined;
    let botMessage: ChatMessage | undefined;

    if (message.role === "assistant") {
      // if it is resending a bot's message, find the user input for it
      botMessage = message;
      for (let i = resendingIndex; i >= 0; i -= 1) {
        if (session.messages[i].role === "user") {
          userMessage = session.messages[i];
          break;
        }
      }
    } else if (message.role === "user") {
      // if it is resending a user's input, find the bot's response
      userMessage = message;
      for (let i = resendingIndex; i < session.messages.length; i += 1) {
        if (session.messages[i].role === "assistant") {
          botMessage = session.messages[i];
          break;
        }
      }
    }

    if (userMessage === undefined) {
      console.error("[Chat] failed to resend", message);
      return;
    }

    // 提取用户消息中的文件附件
    const userAttachFiles: UploadFile[] = [];
    if (Array.isArray(userMessage.content)) {
      userMessage.content.forEach((item) => {
        if (item.type === "file_url" && item.file_url) {
          userAttachFiles.push({
            name: item.file_url.name,
            url: item.file_url.url,
            contentType: item.file_url.contentType,
            size: item.file_url.size,
            tokenCount: item.file_url.tokenCount,
          });
        }
      });
    }

    // delete the original messages
    deleteMessage(userMessage.id);
    deleteMessage(botMessage?.id);

    // resend the message
    setIsLoading(true);
    const textContent = getMessageTextContent(userMessage);
    const images = getMessageImages(userMessage);
    // 将图片和文件附件传递给 onUserInput
    chatStore
      .onUserInput(textContent, images, userAttachFiles)
      .then(() => setIsLoading(false));
    inputRef.current?.focus();
  };

  const onPinMessage = (message: ChatMessage) => {
    chatStore.updateTargetSession(session, (session) =>
      session.mask.context.push(message),
    );

    showToast(Locale.Chat.Actions.PinToastContent, {
      text: Locale.Chat.Actions.PinToastAction,
      onClick: () => {
        setShowPromptModal(true);
      },
    });
  };

  const accessStore = useAccessStore();
  const [speechStatus, setSpeechStatus] = useState(false);
  const [speechLoading, setSpeechLoading] = useState(false);
  // cover default hello message
  BOT_HELLO.content = accessStore.customHello || BOT_HELLO.content;
  Locale.Error.Unauthorized =
    accessStore.UnauthorizedInfo || Locale.Error.Unauthorized;

  // icon position
  const iconPosition = accessStore.iconPosition.toLowerCase() || "down";
  const iconUpEnabled = iconPosition === "up" || iconPosition === "both";
  const iconDownEnabled = iconPosition === "down" || iconPosition === "both";

  async function openaiSpeech(text: string) {
    if (speechStatus) {
      ttsPlayer.stop();
      setSpeechStatus(false);
    } else {
      var api: ClientApi;
      api = new ClientApi(ModelProvider.GPT);
      const config = useAppConfig.getState();
      setSpeechLoading(true);
      ttsPlayer.init();
      let audioBuffer: ArrayBuffer;
      const { markdownToTxt } = require("markdown-to-txt");
      const textContent = markdownToTxt(text);
      if (config.ttsConfig.engine !== DEFAULT_TTS_ENGINE) {
        const edgeVoiceName = accessStore.edgeVoiceName();
        const tts = new MsEdgeTTS();
        await tts.setMetadata(
          edgeVoiceName,
          OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3,
        );
        audioBuffer = await tts.toArrayBuffer(textContent);
      } else {
        audioBuffer = await api.llm.speech({
          model: config.ttsConfig.model,
          input: textContent,
          voice: config.ttsConfig.voice,
          speed: config.ttsConfig.speed,
        });
      }
      setSpeechStatus(true);
      ttsPlayer
        .play(audioBuffer, () => {
          setSpeechStatus(false);
        })
        .catch((e) => {
          console.error("[OpenAI Speech]", e);
          showToast(prettyObject(e));
          setSpeechStatus(false);
        })
        .finally(() => setSpeechLoading(false));
    }
  }

  const context: RenderMessage[] = useMemo(() => {
    return session.mask.hideContext ? [] : session.mask.context.slice();
  }, [session.mask.context, session.mask.hideContext]);

  if (
    context.length === 0 &&
    session.messages.at(0)?.content !== BOT_HELLO.content
  ) {
    const copiedHello = Object.assign({}, BOT_HELLO);
    if (!accessStore.isAuthorized()) {
      copiedHello.content = Locale.Error.Unauthorized;
    }
    context.push(copiedHello);
  }

  // preview messages
  const renderMessages = useMemo(() => {
    return context
      .concat(session.messages as RenderMessage[])
      .concat(
        isLoading
          ? [
              {
                ...createMessage({
                  role: "assistant",
                  content: "……",
                }),
                preview: true,
              },
            ]
          : [],
      )
      .concat(
        userInput.length > 0 && config.sendPreviewBubble
          ? [
              {
                ...createMessage({
                  role: "user",
                  content: userInput,
                }),
                preview: true,
              },
            ]
          : [],
      );
  }, [
    config.sendPreviewBubble,
    context,
    isLoading,
    session.messages,
    userInput,
  ]);

  const [msgRenderIndex, _setMsgRenderIndex] = useState(
    Math.max(0, renderMessages.length - CHAT_PAGE_SIZE),
  );
  function setMsgRenderIndex(newIndex: number) {
    newIndex = Math.min(renderMessages.length - CHAT_PAGE_SIZE, newIndex);
    newIndex = Math.max(0, newIndex);
    _setMsgRenderIndex(newIndex);
  }

  const messages = useMemo(() => {
    const endRenderIndex = Math.min(
      msgRenderIndex + 3 * CHAT_PAGE_SIZE,
      renderMessages.length,
    );
    return renderMessages.slice(msgRenderIndex, endRenderIndex);
  }, [msgRenderIndex, renderMessages]);

  const onChatBodyScroll = (e: HTMLElement) => {
    const bottomHeight = e.scrollTop + e.clientHeight;
    const edgeThreshold = e.clientHeight;

    const isTouchTopEdge = e.scrollTop <= edgeThreshold;
    const isTouchBottomEdge = bottomHeight >= e.scrollHeight - edgeThreshold;
    const isHitBottom =
      bottomHeight >= e.scrollHeight - (isMobileScreen ? 4 : 10);

    const prevPageMsgIndex = msgRenderIndex - CHAT_PAGE_SIZE;
    const nextPageMsgIndex = msgRenderIndex + CHAT_PAGE_SIZE;

    if (isTouchTopEdge && !isTouchBottomEdge) {
      setMsgRenderIndex(prevPageMsgIndex);
    } else if (isTouchBottomEdge) {
      setMsgRenderIndex(nextPageMsgIndex);
    }

    setHitBottom(isHitBottom);
    setAutoScroll(isHitBottom);
  };
  function scrollToBottom() {
    setMsgRenderIndex(renderMessages.length - CHAT_PAGE_SIZE);
    scrollDomToBottom();
  }

  // clear context index = context length + index in messages
  const clearContextIndex =
    (session.clearContextIndex ?? -1) >= 0
      ? session.clearContextIndex! + context.length - msgRenderIndex
      : -1;

  const [showPromptModal, setShowPromptModal] = useState(false);

  const clientConfig = useMemo(() => getClientConfig(), []);

  const autoFocus = !isMobileScreen; // wont auto focus on mobile screen
  const showMaxIcon = !isMobileScreen && !clientConfig?.isApp;

  useCommand({
    fill: setUserInput,
    submit: (text) => {
      doSubmit(text);
    },
    code: (text) => {
      if (accessStore.disableFastLink) return;
      console.log("[Command] got code from url: ", text);
      showConfirm(Locale.URLCommand.Code + `code = ${text}`).then((res) => {
        if (res) {
          accessStore.update((access) => (access.accessCode = text));
        }
      });
    },
    settings: (text) => {
      if (accessStore.disableFastLink) return;

      try {
        const payload = JSON.parse(text) as {
          key?: string;
          url?: string;
        };

        console.log("[Command] got settings from url: ", payload);

        if (payload.key || payload.url) {
          showConfirm(
            Locale.URLCommand.Settings +
              `\n${JSON.stringify(payload, null, 4)}`,
          ).then((res) => {
            if (!res) return;
            if (payload.key) {
              accessStore.update(
                (access) => (access.openaiApiKey = payload.key!),
              );
            }
            if (payload.url) {
              accessStore.update((access) => (access.openaiUrl = payload.url!));
            }
            accessStore.update((access) => (access.useCustomConfig = true));
          });
        }
      } catch {
        console.error("[Command] failed to get settings from url: ", text);
      }
    },
  });

  // edit / insert message modal
  const [isEditingMessage, setIsEditingMessage] = useState(false);

  // remember unfinished input
  useEffect(() => {
    // try to load from local storage
    const key = UNFINISHED_INPUT(session.id);
    const mayBeUnfinishedInput = localStorage.getItem(key);
    if (mayBeUnfinishedInput && userInput.length === 0) {
      setUserInput(mayBeUnfinishedInput);
      localStorage.removeItem(key);
    }

    const dom = inputRef.current;
    return () => {
      localStorage.setItem(key, dom?.value ?? "");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Extract these as shared variables in the ChatComponent function
  const modelName = session.mask.modelConfig.model;
  const providerName =
    session.mask.modelConfig.providerName || ServiceProvider.OpenAI;
  // Find the current model info from modelTable
  const currentModelInfo = useMemo(() => {
    return modelTable.find(
      (m) => m.name === modelName && m.provider?.providerName === providerName,
    );
  }, [modelName, providerName, modelTable]);
  // Determine if the model supports vision
  const canUploadImage = useMemo(() => {
    return isVisionModel(modelName) || !!currentModelInfo?.enableVision;
  }, [modelName, currentModelInfo]);

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = (event.clipboardData || window.clipboardData).items;

      // 检查是否有文本内容
      const textContent = event.clipboardData.getData("text");
      const tokenCount: number = countTokens(textContent);
      if (textContent && tokenCount > minTokensForPastingAsFile) {
        event.preventDefault(); // 阻止默认粘贴行为

        // 将大量文本转换为文件对象
        // 生成唯一的文件名以避免重复
        const timestamp = new Date().getTime();
        const fileName = `pasted_text_${timestamp}.txt`;
        const file = new File([textContent], fileName, { type: "text/plain" });
        setUploading(true);

        try {
          const data = await uploadFileRemote(file);
          const fileData: UploadFile = {
            name: fileName,
            url: data.content,
            contentType: data.type,
            size: parseFloat((file.size / 1024).toFixed(2)),
            tokenCount: tokenCount,
          };

          // 限制文件大小:1M
          if (fileData?.size && fileData?.size > maxFileSizeInKB) {
            showToast(Locale.Chat.InputActions.UploadFile.FileTooLarge);
            setUploading(false);
            return;
          }

          if (data.content && tokenCount > 0) {
            const newFiles = [...attachFiles, fileData];
            // 检查文件数量限制
            const MAX_DOC_CNT = 6;
            if (newFiles.length > MAX_DOC_CNT) {
              showToast(Locale.Chat.InputActions.UploadFile.TooManyFile);
              newFiles.splice(MAX_DOC_CNT, newFiles.length - MAX_DOC_CNT);
            }
            setAttachFiles(newFiles);
            showToast(
              Locale.Chat.InputActions.UploadFile.TooManyTokenToPasteAsFile,
            );
          }
        } catch (e) {
          console.error("Error uploading file:", e);
          showToast(String(e));
        } finally {
          setUploading(false);
        }

        return;
      }
      for (const item of items) {
        if (item.kind === "file") {
          event.preventDefault();
          const file = item.getAsFile();

          if (file) {
            // 处理图片文件
            if (item.type.startsWith("image/")) {
              // if (!canUploadImage) {
              //   showToast(
              //     Locale.Chat.InputActions.UnsupportedModelForUploadImage,
              //   );
              //   continue;
              // }
              const images: string[] = [];
              images.push(...attachImages);
              images.push(
                ...(await new Promise<string[]>((res, rej) => {
                  setUploading(true);
                  const imagesData: string[] = [];
                  uploadImageRemote(file)
                    .then((dataUrl) => {
                      imagesData.push(dataUrl);
                      setUploading(false);
                      res(imagesData);
                    })
                    .catch((e) => {
                      setUploading(false);
                      rej(e);
                    });
                })),
              );
              const imagesLength = images.length;

              if (imagesLength > 3) {
                images.splice(3, imagesLength - 3);
              }
              setAttachImages(images);
            }
            // 处理文本文件
            else {
              // 检查是否是支持的文件类型
              if (supportFileType(file.name)) {
                setUploading(true);
                try {
                  const data = await uploadFileRemote(file);
                  const tokenCount: number = countTokens(data.content);
                  const fileData: UploadFile = {
                    name: file.name,
                    url: data.content,
                    contentType: data.type,
                    size: parseFloat((file.size / 1024).toFixed(2)),
                    tokenCount: tokenCount,
                  };

                  // 限制文件大小:1M
                  if (fileData?.size && fileData?.size > maxFileSizeInKB) {
                    showToast(Locale.Chat.InputActions.UploadFile.FileTooLarge);
                    setUploading(false);
                    return;
                  }

                  // 检查重复文件
                  const isDuplicate = attachFiles.some(
                    (existingFile) =>
                      existingFile.name === fileData.name &&
                      existingFile.url === fileData.url,
                  );

                  if (isDuplicate) {
                    showToast(
                      Locale.Chat.InputActions.UploadFile.DuplicateFile(
                        file.name,
                      ),
                    );
                    setUploading(false);
                    return;
                  }

                  if (data.content && tokenCount > 0) {
                    const newFiles = [...attachFiles, fileData];
                    // 检查文件数量限制
                    const MAX_DOC_CNT = 6;
                    if (newFiles.length > MAX_DOC_CNT) {
                      showToast(
                        Locale.Chat.InputActions.UploadFile.TooManyFile,
                      );
                      newFiles.splice(
                        MAX_DOC_CNT,
                        newFiles.length - MAX_DOC_CNT,
                      );
                    }
                    setAttachFiles(newFiles);
                  }
                } catch (e) {
                  console.error("Error uploading file:", e);
                  showToast(String(e));
                } finally {
                  setUploading(false);
                }
              }
            }
          }
        }
      }
    },
    [attachImages, attachFiles, canUploadImage],
  );

  function supportFileType(filename: string) {
    // 获取文件扩展名
    const fileExtension = filename.split(".").pop()?.toLowerCase();
    return fileExtension && textFileExtensions.includes(fileExtension);
  }
  async function uploadDocument() {
    const files: UploadFile[] = [...attachFiles];

    // 构建accept属性的值
    const acceptTypes = textFileExtensions.map((ext) => `.${ext}`).join(",");

    files.push(
      ...(await new Promise<UploadFile[]>((res, rej) => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = acceptTypes;
        fileInput.multiple = true;
        fileInput.onchange = (event: any) => {
          setUploading(true);
          const inputFiles = event.target.files;
          const filesData: UploadFile[] = [];

          (async () => {
            for (let i = 0; i < inputFiles.length; i++) {
              const file = inputFiles[i];
              // 检查文件类型是否在允许列表中
              if (!supportFileType(file.name)) {
                setUploading(false);
                showToast(
                  Locale.Chat.InputActions.UploadFile.UnsupportedFileType,
                );
                return;
              }
              try {
                const data = await uploadFileRemote(file);
                const tokenCount: number = countTokens(data.content);
                const fileData: UploadFile = {
                  name: file.name,
                  url: data.content,
                  contentType: data.type,
                  size: parseFloat((file.size / 1024).toFixed(2)),
                  tokenCount: tokenCount,
                };

                // 限制文件大小
                if (fileData?.size && fileData?.size > maxFileSizeInKB) {
                  showToast(Locale.Chat.InputActions.UploadFile.FileTooLarge);
                  setUploading(false);
                } else {
                  // 检查是否有同名且内容相同的文件
                  const isDuplicate = files.some(
                    (existingFile) =>
                      existingFile.name === fileData.name &&
                      existingFile.url === fileData.url,
                  );
                  if (isDuplicate) {
                    // 如果是重复文件，显示提示但不添加到filesData
                    showToast(
                      Locale.Chat.InputActions.UploadFile.DuplicateFile(
                        file.name,
                      ),
                    );
                    setUploading(false);
                  } else if (data.content && tokenCount > 0) {
                    // 如果不是重复文件且有效，则添加到filesData
                    filesData.push(fileData);
                  }
                }

                if (
                  filesData.length === MAX_DOC_CNT ||
                  filesData.length === inputFiles.length
                ) {
                  setUploading(false);
                  res(filesData);
                }
              } catch (e) {
                setUploading(false);
                rej(e);
              }
            }
          })();
        };
        fileInput.click();
      })),
    );

    const filesLength = files.length;
    if (filesLength > MAX_DOC_CNT) {
      files.splice(MAX_DOC_CNT, filesLength - MAX_DOC_CNT);
      showToast(Locale.Chat.InputActions.UploadFile.TooManyFile);
    }
    setAttachFiles(files);
  }

  async function uploadImage(): Promise<string[]> {
    const images: string[] = [];
    images.push(...attachImages);

    images.push(
      ...(await new Promise<string[]>((res, rej) => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept =
          "image/png, image/jpeg, image/webp, image/heic, image/heif";
        fileInput.multiple = true;
        fileInput.onchange = (event: any) => {
          setUploading(true);
          const files = event.target.files;
          const imagesData: string[] = [];
          for (let i = 0; i < files.length; i++) {
            const file = event.target.files[i];
            uploadImageRemote(file)
              .then((dataUrl) => {
                imagesData.push(dataUrl);
                if (
                  imagesData.length === 3 ||
                  imagesData.length === files.length
                ) {
                  setUploading(false);
                  res(imagesData);
                }
              })
              .catch((e) => {
                setUploading(false);
                rej(e);
              });
          }
        };
        fileInput.click();
      })),
    );

    const imagesLength = images.length;
    if (imagesLength > 3) {
      images.splice(3, imagesLength - 3);
    }
    setAttachImages(images);
    return images;
  }
  // 快捷键 shortcut keys
  const [showShortcutKeyModal, setShowShortcutKeyModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: any) => {
      // 打开新聊天 command + shift + o
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "o"
      ) {
        event.preventDefault();
        setTimeout(() => {
          chatStore.newSession();
          navigate(Path.Chat);
        }, 10);
      }
      // 聚焦聊天输入 shift + esc
      else if (event.shiftKey && event.key.toLowerCase() === "escape") {
        event.preventDefault();
        inputRef.current?.focus();
      }
      // 复制最后一个代码块 command + shift + ;
      else if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.code === "Semicolon"
      ) {
        event.preventDefault();
        const copyCodeButton =
          document.querySelectorAll<HTMLElement>(".copy-code-button");
        if (copyCodeButton.length > 0) {
          copyCodeButton[copyCodeButton.length - 1].click();
        }
      }
      // 复制最后一个回复 command + shift + c
      else if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "c"
      ) {
        event.preventDefault();
        const lastNonUserMessage = messages
          .filter((message) => message.role !== "user")
          .pop();
        if (lastNonUserMessage) {
          const lastMessageContent = getMessageTextContent(lastNonUserMessage);
          copyToClipboard(lastMessageContent);
        }
      }
      // 重试最后一个提问 command + shift + L
      else if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "l"
      ) {
        event.preventDefault();
        const lastUserMessage = messages
          .filter((message) => message.role === "user")
          .pop();
        if (lastUserMessage) {
          onResend(lastUserMessage);
        }
      }
      // 展示快捷键 command + /
      else if ((event.metaKey || event.ctrlKey) && event.key === "/") {
        event.preventDefault();
        setShowShortcutKeyModal(true);
      }
      // 搜索聊天记录 command + shift + f
      else if (
        (event.metaKey || event.ctrlKey) &&
        event.altKey &&
        event.key.toLowerCase() === "f"
      ) {
        event.preventDefault();
        setTimeout(() => {
          navigate(Path.SearchChat);
        }, 10);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [messages, chatStore, navigate]);

  const formatMessage = (message: RenderMessage) => {
    const mainInfo = `${message.date.toLocaleString()}${
      message.model ? ` - ${message.displayName || message.model}` : ""
    }`;
    const { statistic } = message;
    if (!statistic) return mainInfo;
    const isStreaming =
      message.isStreamRequest !== undefined
        ? message.isStreamRequest
        : statistic &&
          "firstReplyLatency" in statistic &&
          statistic.firstReplyLatency !== undefined;
    const {
      singlePromptTokens,
      completionTokens,
      firstReplyLatency,
      totalReplyLatency,
    } = statistic;

    if (message.role === "assistant") {
      if (isStreaming) {
        // For streaming, check all relevant fields
        if (
          completionTokens === undefined ||
          !firstReplyLatency ||
          !totalReplyLatency
        ) {
          return mainInfo;
        }
      } else {
        // For non-streaming, only check completionTokens and totalReplyLatency
        if (completionTokens === undefined || !totalReplyLatency) {
          return mainInfo;
        }
      }
    } else {
      // Other roles only need to check prompt tokens
      if (singlePromptTokens === undefined) return mainInfo;
    }

    const tokenString =
      message.role === "assistant"
        ? `${completionTokens} Tokens`
        : `${singlePromptTokens} Tokens`;

    const performanceInfo =
      message.role === "assistant"
        ? (() => {
            if (isStreaming) {
              const ttft = (firstReplyLatency! / 1000).toFixed(2);
              const latency = (totalReplyLatency! / 1000).toFixed(2);
              const speed = (
                (1000 * completionTokens!) /
                (totalReplyLatency! - firstReplyLatency!)
              ).toFixed(2);
              return `⚡ ${speed} T/s ⏱️ FT:${ttft}s | TT:${latency}s`;
            } else {
              const speed = (
                (1000 * completionTokens!) /
                totalReplyLatency!
              ).toFixed(2);
              const latency = (totalReplyLatency! / 1000).toFixed(2);
              return `⚡ ${speed} T/s ⏱️ ${latency}s (Non-stream)`;
            }
          })()
        : "";

    const statInfo = performanceInfo
      ? `${tokenString} ${performanceInfo}`
      : tokenString;

    return isMobileScreen ? (
      <>
        {mainInfo}
        <br />
        {statInfo}
      </>
    ) : (
      `${mainInfo} - ${statInfo}`
    );
  };

  const enableParamOverride =
    session.mask.modelConfig.enableParamOverride || false;
  const paramOverrideContent =
    session.mask.modelConfig.paramOverrideContent || "";
  return (
    <div className={styles.chat} key={session.id}>
      <div className="window-header" data-tauri-drag-region>
        {isMobileScreen && (
          <div className="window-actions">
            <div className={"window-action-button"}>
              <IconButton
                icon={<ReturnIcon />}
                bordered
                title={Locale.Chat.Actions.ChatList}
                onClick={() => navigate(Path.Home)}
              />
            </div>
          </div>
        )}

        <div className={`window-header-title ${styles["chat-body-title"]}`}>
          <div
            className={`window-header-main-title ${styles["chat-body-main-title"]}`}
            onClickCapture={() => setIsEditingMessage(true)}
          >
            {!session.topic ? DEFAULT_TOPIC : session.topic}
          </div>
          {/* <div className="window-header-sub-title">
            {Locale.Chat.SubTitle(session.messages.length)}
          </div> */}
        </div>
        <div className="window-actions">
          <div className="window-action-button">
            <IconButton
              icon={<ReloadIcon />}
              bordered
              title={Locale.Chat.Actions.RefreshTitle}
              onClick={() => {
                showToast(Locale.Chat.Actions.RefreshToast);
                chatStore.summarizeSession(true, session);
              }}
            />
          </div>
          {!isMobileScreen && (
            <div className="window-action-button">
              <IconButton
                icon={<RenameIcon />}
                bordered
                title={Locale.Chat.EditMessage.Title}
                aria={Locale.Chat.EditMessage.Title}
                onClick={() => setIsEditingMessage(true)}
              />
            </div>
          )}
          <div className="window-action-button">
            <IconButton
              icon={<ExportIcon />}
              bordered
              title={Locale.Chat.Actions.Export}
              onClick={() => {
                setShowExport(true);
              }}
            />
          </div>
          {showMaxIcon && (
            <div className="window-action-button">
              <IconButton
                icon={config.tightBorder ? <MinIcon /> : <MaxIcon />}
                bordered
                title={Locale.Chat.Actions.FullScreen}
                aria={Locale.Chat.Actions.FullScreen}
                onClick={() => {
                  config.update(
                    (config) => (config.tightBorder = !config.tightBorder),
                  );
                }}
              />
            </div>
          )}
        </div>

        <PromptToast
          showToast={!hitBottom}
          showModal={showPromptModal}
          setShowModal={setShowPromptModal}
        />
      </div>

      <div
        className={styles["chat-body"]}
        ref={scrollRef}
        onScroll={(e) => onChatBodyScroll(e.currentTarget)}
        onMouseDown={() => inputRef.current?.blur()}
        onTouchStart={() => {
          inputRef.current?.blur();
          setAutoScroll(false);
        }}
      >
        {messages.map((message, i) => {
          const isUser = message.role === "user";
          const shouldHideUserMessage =
            isUser && message.isContinuePrompt === true;
          if (!config.enableShowUserContinuePrompt && shouldHideUserMessage) {
            return null;
          }
          const isContext = i < context.length;
          const showActions =
            i > 0 &&
            !(message.preview || message.content.length === 0) &&
            !isContext;
          const showTyping = message.preview || message.streaming;
          const shouldShowClearContextDivider =
            i === clearContextIndex - 1 || message?.beClear === true;
          return (
            <Fragment key={message.id}>
              <div
                className={
                  isUser ? styles["chat-message-user"] : styles["chat-message"]
                }
              >
                <div className={styles["chat-message-container"]}>
                  <div className={styles["chat-message-header"]}>
                    <div className={styles["chat-message-avatar"]}>
                      <div className={styles["chat-message-edit"]}>
                        <IconButton
                          icon={<EditIcon />}
                          aria={Locale.Chat.Actions.Edit}
                          onClick={async () => {
                            const newMessage = await showPrompt(
                              Locale.Chat.Actions.Edit,
                              getMessageTextContent(message),
                              10,
                            );
                            // 检查原始消息是否包含多模态内容（图片或文件）
                            const hasMultimodalContent =
                              Array.isArray(message.content) &&
                              message.content.some(
                                (item) =>
                                  item.type === "image_url" ||
                                  item.type === "file_url",
                              );

                            let newContent: string | MultimodalContent[];

                            if (hasMultimodalContent) {
                              // 如果有多模态内容，直接创建为数组类型
                              newContent = [{ type: "text", text: newMessage }];

                              // 如果原始消息是数组形式，遍历并保留所有非文本内容
                              if (Array.isArray(message.content)) {
                                // 保留所有图片和文件
                                message.content.forEach((item) => {
                                  if (
                                    item.type === "image_url" &&
                                    item.image_url
                                  ) {
                                    (newContent as MultimodalContent[]).push({
                                      type: "image_url",
                                      image_url: {
                                        url: item.image_url.url,
                                      },
                                    });
                                  } else if (
                                    item.type === "file_url" &&
                                    item.file_url
                                  ) {
                                    console.log("edit file_url", item);
                                    (newContent as MultimodalContent[]).push({
                                      type: "file_url",
                                      file_url: {
                                        url: item.file_url.url,
                                        name: item.file_url.name,
                                        contentType: item.file_url.contentType,
                                        size: item.file_url.size,
                                        tokenCount: item.file_url.tokenCount,
                                      },
                                    });
                                  }
                                });
                              }
                            } else {
                              // 如果没有多模态内容，就直接使用文本
                              newContent = newMessage;
                            }
                            chatStore.updateTargetSession(
                              session,
                              (session) => {
                                const m = session.mask.context
                                  .concat(session.messages)
                                  .find((m) => m.id === message.id);
                                if (m) {
                                  m.content = newContent;
                                }
                              },
                            );
                          }}
                        ></IconButton>
                      </div>
                      {isUser ? (
                        <Avatar avatar={config.avatar} />
                      ) : (
                        <>
                          {["system"].includes(message.role) ? (
                            <Avatar avatar="2699-fe0f" />
                          ) : (
                            <MaskAvatar
                              avatar={session.mask.avatar}
                              model={
                                message.displayName ||
                                message.model ||
                                session.mask.modelConfig.model
                              }
                            />
                          )}
                        </>
                      )}
                    </div>
                    {!isUser && (
                      <div className={styles["chat-model-name"]}>
                        {message.displayName || message.model}
                      </div>
                    )}

                    {iconUpEnabled && showActions && (
                      <div className={styles["chat-message-actions"]}>
                        <div className={styles["message-actions-row"]}>
                          <ChatInputActions
                            message={message}
                            onUserStop={onUserStop}
                            onResend={onResend}
                            onDelete={onDelete}
                            onBreak={onBreak}
                            onPinMessage={onPinMessage}
                            copyToClipboard={copyToClipboard}
                            openaiSpeech={openaiSpeech}
                            setUserInput={setUserInput}
                            speechStatus={speechStatus}
                            config={config}
                            i={i}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {showTyping && (
                    <div className={styles["chat-message-status"]}>
                      {Locale.Chat.Typing}
                    </div>
                  )}
                  <div className={styles["chat-message-item"]}>
                    <Markdown
                      key={message.streaming ? "loading" : "done"}
                      content={
                        !message.streaming && isThinkingModel(message.model)
                          ? wrapThinkingPart(getMessageTextContent(message))
                          : getMessageTextContent(message)
                      }
                      loading={
                        (message.preview || message.streaming) &&
                        message.content.length === 0 &&
                        !isUser
                      }
                      // onContextMenu={(e) => onRightClick(e, message)}  //don't copy message to input area when right click
                      onDoubleClickCapture={() => {
                        if (!isMobileScreen) return;
                        setUserInput(getMessageTextContent(message));
                      }}
                      fontSize={fontSize}
                      parentRef={scrollRef}
                      defaultShow={i >= messages.length - 6}
                      searchingTime={message.statistic?.searchingLatency}
                      thinkingTime={message.statistic?.reasoningLatency}
                    />
                    {getMessageImages(message).length == 1 && (
                      <Image
                        className={styles["chat-message-item-image"]}
                        src={getMessageImages(message)[0]}
                        alt=""
                        width={400}
                        height={400}
                        style={{ maxWidth: "100%", height: "auto" }}
                      />
                    )}
                    {getMessageImages(message).length > 1 && (
                      <div
                        className={styles["chat-message-item-images"]}
                        style={
                          {
                            "--image-count": getMessageImages(message).length,
                          } as React.CSSProperties
                        }
                      >
                        {getMessageImages(message).map((image, index) => {
                          return (
                            <Image
                              className={
                                styles["chat-message-item-image-multi"]
                              }
                              key={index}
                              src={image}
                              alt=""
                              width={400}
                              height={400}
                              style={{ maxWidth: "100%", height: "auto" }}
                            />
                          );
                        })}
                      </div>
                    )}
                    {getMessageFiles(message).length > 0 && (
                      <div className={styles["chat-message-item-files"]}>
                        {getMessageFiles(message).map((file, index) => {
                          const extension: DefaultExtensionType = file.name
                            .split(".")
                            .pop()
                            ?.toLowerCase() as DefaultExtensionType;
                          const style = defaultStyles[extension];
                          return (
                            <a
                              key={index}
                              className={styles["chat-message-item-file"]}
                            >
                              <div
                                className={
                                  styles["chat-message-item-file-icon"] +
                                  " no-dark"
                                }
                              >
                                <FileIcon {...style} glyphColor="#303030" />
                              </div>
                              <div
                                className={
                                  styles["chat-message-item-file-name"]
                                }
                              >
                                {file.name}{" "}
                                {file?.size !== undefined
                                  ? `(${file.size}K, ${file.tokenCount}Tokens)`
                                  : `(${file.tokenCount}K)`}
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className={styles["chat-message-action-date"]}>
                    {isContext ? Locale.Chat.IsContext : formatMessage(message)}
                  </div>
                  {iconDownEnabled && showActions && (
                    <div className={styles["chat-message-actions"]}>
                      <div className={styles["message-actions-row"]}>
                        <ChatInputActions
                          message={message}
                          onUserStop={onUserStop}
                          onResend={onResend}
                          onDelete={onDelete}
                          onBreak={onBreak}
                          onPinMessage={onPinMessage}
                          copyToClipboard={copyToClipboard}
                          openaiSpeech={openaiSpeech}
                          setUserInput={setUserInput}
                          speechStatus={speechStatus}
                          config={config}
                          i={i}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {shouldShowClearContextDivider && (
                <ClearContextDivider index={i} />
              )}
            </Fragment>
          );
        })}
      </div>

      <div className={styles["chat-input-panel"]}>
        <PromptHints prompts={promptHints} onPromptSelect={onPromptSelect} />

        {showModelAtSelector && (
          <div className={styles["model-selector"]}>
            <div className={styles["model-selector-title"]}>
              <span>
                {Locale.Chat.InputActions.ModelAtSelector.SelectModel}
              </span>
              <span className={styles["model-selector-count"]}>
                {Locale.Chat.InputActions.ModelAtSelector.AvailableModels(
                  getFilteredModels().length,
                )}
              </span>
            </div>

            {getFilteredModels().length === 0 ? (
              <div className={styles["model-selector-empty"]}>
                {Locale.Chat.InputActions.ModelAtSelector.NoAvailableModels}
              </div>
            ) : (
              getFilteredModels().map((item, index) => {
                const selected = modelAtSelectIndex === index;
                const [modelName, providerName] =
                  item.value.split(/@(?=[^@]*$)/);

                return (
                  <div
                    ref={selected ? selectedRef : null}
                    key={item.value}
                    className={`${styles["model-selector-item"]} ${
                      selected ? styles["model-selector-item-selected"] : ""
                    }`}
                    onMouseEnter={() => setModelAtSelectIndex(index)}
                    onClick={() => {
                      chatStore.updateTargetSession(session, (session) => {
                        session.mask.modelConfig.model = modelName as ModelType;
                        session.mask.modelConfig.providerName =
                          providerName as ServiceProvider;
                        session.mask.syncGlobalConfig = false;
                      });
                      setUserInput("");
                      setShowModelAtSelector(false);
                      showToast(modelName);
                    }}
                  >
                    <div className={styles["item-header"]}>
                      <div className={styles["item-icon"]}>
                        <Avatar model={item.title as string} />
                      </div>
                      <div className={styles["item-title"]}>{item.title}</div>
                    </div>
                    {item.subTitle && (
                      <div className={styles["item-description"]}>
                        {item.subTitle}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
        <ChatActions
          uploadDocument={uploadDocument}
          uploadImage={uploadImage}
          attachImages={attachImages}
          setAttachImages={setAttachImages}
          attachFiles={attachFiles}
          setAttachFiles={setAttachFiles}
          setUploading={setUploading}
          showPromptModal={() => setShowPromptModal(true)}
          scrollToBottom={scrollToBottom}
          hitBottom={hitBottom}
          uploading={uploading}
          showPromptHints={() => {
            // Click again to close
            if (promptHints.length > 0) {
              setPromptHints([]);
              return;
            }

            inputRef.current?.focus();
            setUserInput("/");
            onSearch("");
          }}
          setShowShortcutKeyModal={setShowShortcutKeyModal}
          userInput={userInput}
          setUserInput={setUserInput}
          modelTable={modelTable}
        />
        <label
          className={`${styles["chat-input-panel-inner"]} ${
            attachImages.length != 0 || attachFiles.length != 0
              ? styles["chat-input-panel-inner-attach"]
              : ""
          } ${enableParamOverride ? styles["with-param-override"] : ""} ${
            attachImages.length > 0 && !canUploadImage
              ? styles["with-vision-warning"]
              : ""
          }`}
          htmlFor="chat-input"
        >
          {attachImages.length > 0 && !canUploadImage && (
            <div className={styles["vision-warning-header"]}>
              <div className={styles["vision-warning-indicator"]}>
                <div className={styles["vision-warning-icon"]}>
                  {Locale.Settings.DocumentUploadWarning}
                </div>
              </div>
            </div>
          )}
          {enableParamOverride && (
            <div className={styles["param-override-header"]}>
              <div className={styles["param-override-indicator"]}>
                <span className={styles["param-override-icon"]}>⚙️</span>
                <span>{Locale.Settings.ParameterOverride.EnableInfo}</span>
              </div>
              <div className={styles["param-override-tooltip"]}>
                {paramOverrideContent ||
                  Locale.Settings.ParameterOverride.EmptyParam}
              </div>
            </div>
          )}
          <textarea
            id="chat-input"
            ref={inputRef}
            className={styles["chat-input"]}
            placeholder={Locale.Chat.Input(submitKey, isMobileScreen)}
            onInput={(e) => onInput(e.currentTarget.value)}
            value={userInput}
            onKeyDown={onInputKeyDown}
            // onFocus={scrollToBottom}
            onClick={scrollToBottom}
            onPaste={handlePaste}
            rows={inputRows}
            autoFocus={autoFocus}
            style={{
              fontSize: config.fontSize,
            }}
          />
          <div className={styles["attachments"]}>
            {attachImages.length != 0 && (
              <div className={styles["attach-images"]}>
                {attachImages.map((image, index) => {
                  return (
                    <div
                      key={index}
                      className={styles["attach-image"]}
                      style={{ backgroundImage: `url("${image}")` }}
                    >
                      <div className={styles["attach-image-mask"]}>
                        <DeleteImageButton
                          deleteImage={() => {
                            setAttachImages(
                              attachImages.filter((_, i) => i !== index),
                            );
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {attachFiles.length != 0 && (
              <div className={styles["attach-files"]}>
                {attachFiles.map((file, index) => {
                  const extension: DefaultExtensionType = file.name
                    .split(".")
                    .pop()
                    ?.toLowerCase() as DefaultExtensionType;
                  const style = defaultStyles[extension];
                  const getFileNameClassName = (attachImagesLength: number) => {
                    if (attachImagesLength <= 1)
                      return styles["attach-file-name-full"];
                    if (attachImagesLength === 2)
                      return styles["attach-file-name-half"];
                    if (attachImagesLength === 3)
                      return styles["attach-file-name-less"];
                    if (attachImagesLength === 4)
                      return styles["attach-file-name-min"];
                    return styles["attach-file-name-tiny"]; // 5个或更多
                  };
                  return (
                    <div key={index} className={styles["attach-file"]}>
                      <div
                        className={styles["attach-file-icon"] + " no-dark"}
                        key={extension}
                      >
                        <FileIcon {...style} glyphColor="#303030" />
                      </div>
                      {renameAttachFile && renameAttachFile.index === index ? (
                        <input
                          type="text"
                          className={getFileNameClassName(attachImages.length)}
                          value={renameAttachFile.name}
                          onChange={(e) =>
                            setRenameAttachFile({
                              ...renameAttachFile,
                              name: e.target.value,
                            })
                          }
                          onBlur={() => {
                            if (renameAttachFile.name.trim()) {
                              // 保留原始扩展名
                              const originalExt = file.name.split(".").pop();
                              const newName = renameAttachFile.name.includes(
                                ".",
                              )
                                ? renameAttachFile.name
                                : `${renameAttachFile.name}.${originalExt}`;

                              const newFiles = [...attachFiles];
                              newFiles[index] = { ...file, name: newName };
                              setAttachFiles(newFiles);
                            }
                            setRenameAttachFile(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                            if (e.key === "Escape") {
                              setRenameAttachFile(null);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <div
                          className={getFileNameClassName(attachImages.length)}
                          onDoubleClick={() => {
                            setRenameAttachFile({
                              index,
                              name: file.name.split(".")[0], // 默认选中文件名部分，不包括扩展名
                            });
                          }}
                        >
                          {file.name} ({file.size}K, {file.tokenCount}Tokens)
                        </div>
                      )}
                      <div className={styles["attach-image-mask"]}>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <IconButton
                            icon={<RenameIcon />}
                            onClick={() => {
                              setRenameAttachFile({
                                index,
                                name: file.name.split(".")[0], // 默认选中文件名部分，不包括扩展名
                              });
                            }}
                            title={Locale.Chat.InputActions.RenameFile}
                            style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "4px",
                              marginRight: "4px",
                              border: "1px solid #e0e0e0",
                              backgroundColor: "#f9f9f9",
                            }}
                          />
                          <DeleteImageButton
                            deleteImage={() => {
                              setAttachFiles(
                                attachFiles.filter((_, i) => i !== index),
                              );
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className={styles["chat-input-textarea"]}>
            <div className={styles["token-counter"]}>
              (
              {estimateTokenLengthInLLM(userInput) +
                (attachFiles?.reduce(
                  (total, file) => total + (file.tokenCount || 0),
                  0,
                ) || 0)}
              )
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <IconButton
                icon={isExpanded ? <MinIcon /> : <MaxIcon />}
                bordered
                title={Locale.Chat.Actions.FullScreen}
                aria={Locale.Chat.Actions.FullScreen}
                onClick={toggleExpand}
              />
              <IconButton
                icon={<SendWhiteIcon />}
                text={isMobileScreen ? "" : Locale.Chat.Send}
                type="primary"
                onClick={() => doSubmit(userInput)}
              />
            </div>
          </div>
        </label>
      </div>

      {showExport && (
        <ExportMessageModal onClose={() => setShowExport(false)} />
      )}

      {isEditingMessage && (
        <EditMessageModal
          onClose={() => {
            setIsEditingMessage(false);
          }}
        />
      )}

      {showShortcutKeyModal && (
        <ShortcutKeyModal onClose={() => setShowShortcutKeyModal(false)} />
      )}
    </div>
  );
}

export function Chat() {
  console.log("Chat component rendered, ---------------------------");
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const allModels = useAllModelsWithCustomProviders();
  const access = useAccessStore();

  const modelTable = useMemo(() => {
    const filteredModels = allModels.filter((m) => m.available);
    const modelMap = new Map<string, (typeof allModels)[0]>();

    filteredModels.forEach((model) => {
      const key = `${model.name}@${model?.provider?.id}`;

      if (modelMap.has(key)) {
        // 合并已存在的模型
        const existingModel = modelMap.get(key)!;

        // 合并 description（如果新模型有 description 而旧模型没有）
        if (model.description && !existingModel.description) {
          existingModel.description = model.description;
        }
        if (model.displayName && !existingModel.displayName) {
          existingModel.displayName = model.displayName;
        }
        if (model.isDefault) {
          existingModel.isDefault = true;
        }
      } else {
        // 添加新模型
        modelMap.set(key, { ...model });
      }
    });

    // 转换为数组
    const mergedModels = Array.from(modelMap.values());

    // 确保默认模型排在第一位
    const defaultModel = mergedModels.find((m) => m.isDefault);

    if (defaultModel) {
      return [defaultModel, ...mergedModels.filter((m) => m !== defaultModel)];
    }
    console.log("recalculate modelTable... ");
    return mergedModels;
  }, [allModels]);

  // Update session messages based on modelTable
  useEffect(() => {
    // 仅在 session 最后一条消息 id 变化时执行，即有新的消息进入队列
    console.log("session.messages changed, updating displayName...");
    for (let i = 0; i < session.messages.length; i++) {
      const message = session.messages[i];
      if (message.role !== "user" && !message.displayName && message.model) {
        const displayName = modelTable.find(
          (model) =>
            model.name === message.model &&
            model.provider?.providerName === message.providerName,
        )?.displayName;

        if (displayName !== message.displayName) {
          // 仅当 displayName 发生变化时才更新
          session.messages[i].displayName = displayName;
        }
      }
    }
  }, [session.messages[session.messages.length - 1]?.id]);

  // update session model
  useEffect(() => {
    console.log("modelTable changed, updating session model...");
    console.log("modelTable: ", modelTable);
    if (!modelTable || modelTable.length === 0) return;

    console.log(
      "[Chat.tsx] models: ",
      access.defaultModel,
      access.compressModel,
      access.ocrModel,
      access.textProcessModel,
    );
    const storedConfigs = getStoredModelConfigs();
    console.log("[Chat.tsx] storedConfigs: ", storedConfigs);
    console.log(
      "[Chat.tsx] session.mask.modelConfig: ",
      session.id,
      session.mask.modelConfig,
    );
    if (!storedConfigs.chatModel) {
      saveModelConfig("chatModel", access.defaultModel);
      const [modelName, providerName] =
        access.defaultModel.split(/@(?=[^@]*$)/);
      chatStore.updateTargetSession(session, (session) => {
        session.mask.modelConfig.model = modelName;
        session.mask.modelConfig.providerName = providerName as ServiceProvider;
      });
    }
    if (!storedConfigs.compressModel) {
      saveModelConfig("compressModel", access.compressModel);
      const [modelName, providerName] =
        access.compressModel.split(/@(?=[^@]*$)/);
      chatStore.updateTargetSession(session, (session) => {
        session.mask.modelConfig.compressModel = modelName;
        session.mask.modelConfig.compressProviderName =
          providerName as ServiceProvider;
      });
    }
    if (!storedConfigs.ocrModel) {
      saveModelConfig("ocrModel", access.ocrModel);
      const [modelName, providerName] = access.ocrModel.split(/@(?=[^@]*$)/);
      chatStore.updateTargetSession(session, (session) => {
        session.mask.modelConfig.ocrModel = modelName;
        session.mask.modelConfig.ocrProviderName =
          providerName as ServiceProvider;
      });
    }
    if (!storedConfigs.textProcessModel) {
      saveModelConfig("textProcessModel", access.textProcessModel);
      const [modelName, providerName] =
        access.textProcessModel.split(/@(?=[^@]*$)/);
      chatStore.updateTargetSession(session, (session) => {
        session.mask.modelConfig.textProcessModel = modelName;
        session.mask.modelConfig.textProcessProviderName =
          providerName as ServiceProvider;
      });
    }
    console.log(
      "[Chat.tsx] After, session.mask.modelConfig: ",
      session.mask.modelConfig,
    );
    // 获取当前所有任务的模型配置
    const currentConfig = {
      chat: {
        model: session.mask.modelConfig.model,
        providerName: session.mask.modelConfig.providerName,
      },
      textProcess: {
        model: session.mask.modelConfig.textProcessModel,
        providerName: session.mask.modelConfig.textProcessProviderName,
      },
      ocr: {
        model: session.mask.modelConfig.ocrModel,
        providerName: session.mask.modelConfig.ocrProviderName,
      },
      compress: {
        model: session.mask.modelConfig.compressModel,
        providerName: session.mask.modelConfig.compressProviderName,
      },
    };
    console.log("[Chat.tsx] currentConfig: ", currentConfig);

    /**
     * 获取任务模型 - 优先级：
     * 1. 同名且 providerName 一致的模型
     * 2. 同名的模型（任意提供商）
     * 3. 首个可用模型
     */
    const getTaskModel = (model: string, providerName: string) => {
      // 如果当前未设置模型名称，直接返回首个模型
      if (!model) {
        return modelTable.length > 0
          ? {
              model: modelTable[0].name,
              providerName: modelTable[0].provider?.providerName,
            }
          : null;
      }

      let sameNameModel = null;
      let firstAvailable = null;

      for (const item of modelTable) {
        // 【优先级 1】完全匹配（名称和提供商均一致）
        if (
          item.name === model &&
          item.provider?.providerName === providerName
        ) {
          return null; // 直接返回无需修改
        }

        // 【优先级 2】记录第一个同名模型（只要名称匹配）
        if (item.name === model && !sameNameModel) {
          sameNameModel = item;
        }

        // 【优先级 3】记录首个可用模型（数组中第一个非空项）
        if (!firstAvailable) {
          firstAvailable = item;
        }
      }

      // 根据候选结果返回
      if (sameNameModel) {
        return {
          model: sameNameModel.name,
          providerName: sameNameModel.provider?.providerName,
        };
      }

      return firstAvailable
        ? {
            model: firstAvailable.name,
            providerName: firstAvailable.provider?.providerName,
          }
        : null;
    };

    // 检查并更新每个任务的模型
    Object.entries(currentConfig).forEach(([taskType, config]) => {
      // 获取该任务可能的替代模型
      const replacementModel = getTaskModel(config.model, config.providerName);

      // 如果需要替换
      if (replacementModel) {
        console.log("update model for task", taskType, replacementModel);
        switch (taskType) {
          case "chat":
            session.mask.modelConfig.model = replacementModel.model;
            session.mask.modelConfig.providerName =
              replacementModel.providerName as ServiceProvider;
            saveModelConfig(
              "chatModel",
              `${replacementModel.model}@${replacementModel.providerName}`,
            );
            break;
          case "textProcess":
            session.mask.modelConfig.textProcessModel = replacementModel.model;
            session.mask.modelConfig.textProcessProviderName =
              replacementModel.providerName as ServiceProvider;
            saveModelConfig(
              "textProcessModel",
              `${replacementModel.model}@${replacementModel.providerName}`,
            );
            break;
          case "ocr":
            session.mask.modelConfig.ocrModel = replacementModel.model;
            session.mask.modelConfig.ocrProviderName =
              replacementModel.providerName as ServiceProvider;
            saveModelConfig(
              "ocrModel",
              `${replacementModel.model}@${replacementModel.providerName}`,
            );
            break;
          case "compress":
            session.mask.modelConfig.compressModel = replacementModel.model;
            session.mask.modelConfig.compressProviderName =
              replacementModel.providerName as ServiceProvider;
            saveModelConfig(
              "compressModel",
              `${replacementModel.model}@${replacementModel.providerName}`,
            );
            break;
          default:
            // 非 chat 类型的任务暂不做处理
            break;
        }
      }
    });
  }, [modelTable]);
  return (
    <ChatComponent key={session.id} modelTable={modelTable}></ChatComponent>
  );
}
