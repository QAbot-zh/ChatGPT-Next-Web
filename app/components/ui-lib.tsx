/* eslint-disable @next/next/no-img-element */
import styles from "./ui-lib.module.scss";
import LoadingIcon from "../icons/three-dots.svg";
import CloseIcon from "../icons/close.svg";
import EyeIcon from "../icons/eye.svg";
import EyeOffIcon from "../icons/eye-off.svg";
import DownIcon from "../icons/down.svg";
import ConfirmIcon from "../icons/confirm.svg";
import CancelIcon from "../icons/cancel.svg";
import MaxIcon from "../icons/max.svg";
import MinIcon from "../icons/min.svg";
import { Avatar } from "./emoji";

import Locale from "../locales";

import { createRoot } from "react-dom/client";
import React, {
  HTMLProps,
  MouseEvent,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { IconButton } from "./button";
import { useAccessStore } from "../store";
import {
  compareModelGroups,
  getModelGroup,
  ModelGroup,
} from "../utils/model-groups";
import { safeLocalStorage } from "../utils";
import { StoreKey } from "../constant";

export function Popover(props: {
  children: JSX.Element;
  content: JSX.Element;
  open?: boolean;
  onClose?: () => void;
}) {
  return (
    <div className={styles.popover}>
      {props.children}
      {props.open && (
        <div className={styles["popover-mask"]} onClick={props.onClose}></div>
      )}
      {props.open && (
        <div className={styles["popover-content"]}>{props.content}</div>
      )}
    </div>
  );
}

export function Card(props: { children: JSX.Element[]; className?: string }) {
  return (
    <div className={styles.card + " " + props.className}>{props.children}</div>
  );
}

export function ListItem(props: {
  title: string;
  subTitle?: string;
  children?: JSX.Element | JSX.Element[];
  icon?: JSX.Element;
  className?: string;
  onClick?: (e: MouseEvent) => void;
  vertical?: boolean;
}) {
  return (
    <div
      className={
        styles["list-item"] +
        ` ${props.vertical ? styles["vertical"] : ""} ` +
        ` ${props.className || ""}`
      }
      onClick={props.onClick}
    >
      {/* 大屏布局：title/subtitle 在左，控件在右 */}
      <div className={styles["list-item-desktop"]}>
        <div className={styles["list-header"]}>
          {props.icon && (
            <div className={styles["list-icon"]}>{props.icon}</div>
          )}
          <div className={styles["list-item-title"]}>
            <div>{props.title}</div>
            {props.subTitle && (
              <div className={styles["list-item-sub-title"]}>
                {props.subTitle}
              </div>
            )}
          </div>
        </div>
        <div className={styles["list-item-control"]}>{props.children}</div>
      </div>
      {/* 小屏布局：非 vertical 时 title+控件 第一行，subtitle 第二行 */}
      {/* 小屏布局：vertical 时 title、subtitle、控件 各占一行 */}
      <div className={styles["list-item-mobile"]}>
        <div className={styles["list-header"]}>
          {props.icon && (
            <div className={styles["list-icon"]}>{props.icon}</div>
          )}
          <div className={styles["list-item-title"]}>{props.title}</div>
        </div>
        {props.subTitle && (
          <div className={styles["list-item-sub-title"]}>{props.subTitle}</div>
        )}
        <div className={styles["list-item-control"]}>{props.children}</div>
      </div>
    </div>
  );
}

export function List(props: { children: React.ReactNode; id?: string }) {
  return (
    <div className={styles.list} id={props.id}>
      {props.children}
    </div>
  );
}

export function Loading() {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LoadingIcon />
    </div>
  );
}

interface ModalProps {
  title: string;
  children?: any;
  actions?: React.ReactNode[];
  defaultMax?: boolean;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
  footer?: React.ReactNode;
  onClose?: () => void;
  disableClose?: boolean;
}
export function Modal(props: ModalProps) {
  useEffect(() => {
    if (props.disableClose) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        props.onClose?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.disableClose]);

  const [isMax, setMax] = useState(!!props.defaultMax);

  return (
    <div
      className={
        styles["modal-container"] + ` ${isMax && styles["modal-container-max"]}`
      }
    >
      <div className={styles["modal-header"]}>
        <div className={styles["modal-title"]}>{props.title}</div>

        <div className={styles["modal-header-actions"]}>
          <div
            className={styles["modal-header-action"]}
            onClick={() => setMax(!isMax)}
          >
            {isMax ? <MinIcon /> : <MaxIcon />}
          </div>
          {!props.disableClose && (
            <div
              className={styles["modal-header-action"]}
              onClick={props.onClose}
            >
              <CloseIcon />
            </div>
          )}
        </div>
      </div>

      <div
        className={`${styles["modal-content"]} ${props.contentClassName ?? ""}`}
        style={props.contentStyle}
      >
        {props.children}
      </div>

      <div className={styles["modal-footer"]}>
        {props.footer}
        <div className={styles["modal-actions"]}>
          {props.actions?.map((action, i) => (
            <div key={i} className={styles["modal-action"]}>
              {action}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function showModal(props: ModalProps) {
  const div = document.createElement("div");
  div.className = "modal-mask";
  document.body.appendChild(div);

  const root = createRoot(div);
  const closeModal = () => {
    props.onClose?.();
    root.unmount();
    div.remove();
  };

  div.onclick = (e) => {
    if (e.target === div && !props.disableClose) {
      closeModal();
    }
  };

  root.render(<Modal {...props} onClose={closeModal}></Modal>);
}

export type ToastProps = {
  content: string;
  action?: {
    text: string;
    onClick: () => void;
  };
  onClose?: () => void;
};

export function Toast(props: ToastProps) {
  return (
    <div className={styles["toast-container"]}>
      <div className={styles["toast-content"]}>
        <span>{props.content}</span>
        {props.action && (
          <button
            onClick={() => {
              props.action?.onClick?.();
              props.onClose?.();
            }}
            className={styles["toast-action"]}
          >
            {props.action.text}
          </button>
        )}
      </div>
    </div>
  );
}

type TimedToastProps = ToastProps & {
  showTimer?: boolean;
};

function TimedToast(props: TimedToastProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!props.showTimer) return;
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [props.showTimer]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m${secs}s`;
  };

  // 分割内容，支持多行显示（第一行为任务描述，第二行为模型名称）
  const lines = props.content.split("\n");
  const mainContent = lines[0];
  const subContent = lines.length > 1 ? lines.slice(1).join("\n") : null;

  return (
    <div className={styles["toast-container"]}>
      <div className={styles["toast-content"]}>
        <div className={styles["toast-text"]}>
          <span>
            {mainContent}
            {props.showTimer && (
              <span className={styles["toast-timer"]}>
                {" "}
                ({formatTime(elapsed)})
              </span>
            )}
          </span>
          {subContent && (
            <span className={styles["toast-sub"]}>{subContent}</span>
          )}
        </div>
        {props.action && (
          <button
            onClick={() => {
              props.action?.onClick?.();
              props.onClose?.();
            }}
            className={styles["toast-action"]}
          >
            {props.action.text}
          </button>
        )}
      </div>
    </div>
  );
}

export function showToast(
  content: string,
  action?: ToastProps["action"],
  delay = 3000,
) {
  const div = document.createElement("div");
  div.className = styles.show;
  document.body.appendChild(div);

  const root = createRoot(div);
  const close = () => {
    div.classList.add(styles.hide);

    setTimeout(() => {
      root.unmount();
      div.remove();
    }, 300);
  };

  setTimeout(() => {
    close();
  }, delay);

  root.render(<Toast content={content} action={action} onClose={close} />);
}

export type PersistentToastController = {
  update: (content: string, autoCloseDelay?: number) => void;
  close: () => void;
};

export function showPersistentToast(
  content: string,
  action?: ToastProps["action"],
): PersistentToastController {
  const div = document.createElement("div");
  div.className = styles.show;
  document.body.appendChild(div);

  const root = createRoot(div);
  let isClosed = false;
  let showTimer = true;
  let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
    div.classList.add(styles.hide);
    setTimeout(() => {
      root.unmount();
      div.remove();
    }, 300);
  };

  const update = (newContent: string, autoCloseDelay?: number) => {
    if (isClosed) return;
    // 更新时停止计时显示
    if (autoCloseDelay !== undefined && autoCloseDelay > 0) {
      showTimer = false;
    }
    root.render(
      <TimedToast
        content={newContent}
        action={action}
        onClose={close}
        showTimer={showTimer}
      />,
    );
    if (autoCloseDelay !== undefined && autoCloseDelay > 0) {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
      autoCloseTimer = setTimeout(() => {
        close();
      }, autoCloseDelay);
    }
  };

  root.render(
    <TimedToast
      content={content}
      action={action}
      onClose={close}
      showTimer={showTimer}
    />,
  );

  return { update, close };
}

export type InputProps = React.HTMLProps<HTMLTextAreaElement> & {
  autoHeight?: boolean;
  rows?: number;
};

export function Input(props: InputProps) {
  return (
    <textarea
      {...props}
      className={`${styles["input"]} ${props.className}`}
    ></textarea>
  );
}

export function PasswordInput(
  props: HTMLProps<HTMLInputElement> & { aria?: string },
) {
  const { aria, ...rest } = props;
  const [visible, setVisible] = useState(false);

  function changeVisibility() {
    setVisible(!visible);
  }

  return (
    <div className={"password-input-container"}>
      <IconButton
        aria={aria}
        icon={visible ? <EyeIcon /> : <EyeOffIcon />}
        onClick={changeVisibility}
        className={"password-eye"}
      />
      <input
        {...rest}
        type={visible ? "text" : "password"}
        className={"password-input"}
      />
    </div>
  );
}

export function Select(
  props: React.DetailedHTMLProps<
    React.SelectHTMLAttributes<HTMLSelectElement> & {
      align?: "left" | "center";
    },
    HTMLSelectElement
  >,
) {
  const { className, children, align, ...otherProps } = props;
  return (
    <div
      className={`${styles["select-with-icon"]} ${
        align === "left" ? styles["left-align-option"] : ""
      } ${className}`}
    >
      <select className={styles["select-with-icon-select"]} {...otherProps}>
        {children}
      </select>
      <DownIcon className={styles["select-with-icon-icon"]} />
    </div>
  );
}

export function showConfirm(content: any) {
  const div = document.createElement("div");
  div.className = "modal-mask";
  document.body.appendChild(div);

  const root = createRoot(div);
  const closeModal = () => {
    root.unmount();
    div.remove();
  };

  return new Promise<boolean>((resolve) => {
    root.render(
      <Modal
        title={Locale.UI.Confirm}
        actions={[
          <IconButton
            key="cancel"
            text={Locale.UI.Cancel}
            onClick={() => {
              resolve(false);
              closeModal();
            }}
            icon={<CancelIcon />}
            tabIndex={0}
            bordered
            shadow
          ></IconButton>,
          <IconButton
            key="confirm"
            text={Locale.UI.Confirm}
            type="primary"
            onClick={() => {
              resolve(true);
              closeModal();
            }}
            icon={<ConfirmIcon />}
            tabIndex={0}
            autoFocus
            bordered
            shadow
          ></IconButton>,
        ]}
        onClose={closeModal}
      >
        {content}
      </Modal>,
    );
  });
}

export type StorageErrorChoice = "retry" | "fallback";
let pendingStorageErrorPromise: Promise<StorageErrorChoice> | null = null;

export function showStorageErrorDialog(opts: {
  key: string;
  error: unknown;
}): Promise<StorageErrorChoice> {
  // 单例：并发的多次失败共用同一个弹窗
  if (pendingStorageErrorPromise) return pendingStorageErrorPromise;

  const div = document.createElement("div");
  div.className = "modal-mask";
  document.body.appendChild(div);
  const root = createRoot(div);
  const closeModal = () => {
    root.unmount();
    div.remove();
    pendingStorageErrorPromise = null;
  };

  const L = Locale.Settings.Danger.StorageError;

  // 检测 LS 中是否有 chat 备份。默认情况下不会有：只有 IDB 写入抛错回退到 LS、
  // 或用户主动点过设置里的「刷新 IndexedDB 到 localStorage」才会留下快照。
  const lsBackup = safeLocalStorage().getItem(StoreKey.Chat);
  const hasBackup = !!lsBackup;
  const backupKb = hasBackup ? (lsBackup.length / 1024).toFixed(1) : "0";
  const fallbackText = hasBackup ? L.FallbackWithBackup : L.FallbackNoBackup;
  const hintText = hasBackup ? L.HintWithBackup(backupKb) : L.HintNoBackup;

  pendingStorageErrorPromise = new Promise<StorageErrorChoice>((resolve) => {
    root.render(
      <Modal
        title={L.Title}
        disableClose
        footer={
          <div
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              gap: 20,
            }}
          >
            <IconButton
              text={fallbackText}
              type="danger"
              onClick={() => {
                resolve("fallback");
                closeModal();
              }}
              tabIndex={0}
              bordered
              shadow
            />
            <IconButton
              text={L.Retry}
              type="primary"
              onClick={() => {
                resolve("retry");
                closeModal();
              }}
              icon={<ConfirmIcon />}
              tabIndex={0}
              autoFocus
              bordered
              shadow
            />
          </div>
        }
      >
        <div style={{ lineHeight: 1.6 }}>
          <p>{L.Description}</p>
          <p style={{ marginTop: 12, fontWeight: 500 }}>{L.CausesTitle}</p>
          <ul style={{ marginTop: 4, paddingLeft: 20, opacity: 0.85 }}>
            {L.Causes.map((c, i) => (
              <li key={i} style={{ marginTop: 4 }}>
                {c}
              </li>
            ))}
          </ul>
          <p style={{ marginTop: 12, opacity: 0.8 }}>{hintText}</p>
        </div>
      </Modal>,
    );
  });

  return pendingStorageErrorPromise;
}

function PromptInput(props: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  const [input, setInput] = useState(props.value);
  const onInput = (value: string) => {
    props.onChange(value);
    setInput(value);
  };

  return (
    <textarea
      className={styles["modal-input"]}
      autoFocus
      value={input}
      onInput={(e) => onInput(e.currentTarget.value)}
      rows={props.rows ?? 3}
    ></textarea>
  );
}

export function showPrompt(content: any, value = "", rows = 3) {
  const div = document.createElement("div");
  div.className = "modal-mask";
  document.body.appendChild(div);

  const root = createRoot(div);
  const closeModal = () => {
    root.unmount();
    div.remove();
  };

  return new Promise<string>((resolve) => {
    let userInput = value;

    root.render(
      <Modal
        title={content}
        actions={[
          <IconButton
            key="cancel"
            text={Locale.UI.Cancel}
            onClick={() => {
              closeModal();
            }}
            icon={<CancelIcon />}
            bordered
            shadow
            tabIndex={0}
          ></IconButton>,
          <IconButton
            key="confirm"
            text={Locale.UI.Confirm}
            type="primary"
            onClick={() => {
              resolve(userInput);
              closeModal();
            }}
            icon={<ConfirmIcon />}
            bordered
            shadow
            tabIndex={0}
          ></IconButton>,
        ]}
        onClose={closeModal}
      >
        <PromptInput
          onChange={(val) => (userInput = val)}
          value={value}
          rows={rows}
        ></PromptInput>
      </Modal>,
    );
  });
}

function ImageModalContent({
  img,
  svgContent,
  fileName: propFileName,
  mermaidCode,
}: {
  img?: string;
  svgContent?: string;
  fileName?: string;
  mermaidCode?: string;
}) {
  const [rotation, setRotation] = useState(0); // 旋转角度
  const [scale, setScale] = useState(1); // 缩放比例
  const [isAdaptive, setIsAdaptive] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [svgIntrinsicSize, setSvgIntrinsicSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const minScale = 0.01;
  const maxScale = 10;
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleRotateLeft = () => {
    setRotation((prev) => prev - 90); // 向左旋转 90 度
  };

  const handleRotateRight = () => {
    setRotation((prev) => prev + 90); // 向右旋转 90 度
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, maxScale)); // 放大，最大 1000%
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, minScale)); // 缩小，最小 1%
  };

  const handleResetToOriginal = () => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setIsAdaptive(false);
  };

  const handleToggleAdaptive = () => {
    if (!isAdaptive) {
      fitImageToContainer(); // Apply adaptive scaling
      setIsAdaptive(true);
    }
  };

  const normalizedSvg = useMemo(() => {
    if (!svgContent) return "";
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, "image/svg+xml");
      const svg = doc.documentElement;
      if (!svg || svg.nodeName.toLowerCase() !== "svg") return svgContent;

      const widthAttr = svg.getAttribute("width") || "";
      const heightAttr = svg.getAttribute("height") || "";
      const viewBox = svg.getAttribute("viewBox");

      const isPercent = (val: string) => val.includes("%");
      const hasSize =
        widthAttr &&
        !isPercent(widthAttr) &&
        heightAttr &&
        !isPercent(heightAttr);

      if (!hasSize && viewBox) {
        const parts = viewBox.split(/[\s,]+/).map((p) => parseFloat(p));
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          svg.setAttribute("width", `${parts[2]}`);
          svg.setAttribute("height", `${parts[3]}`);
        }
      }

      return new XMLSerializer().serializeToString(svg);
    } catch {
      return svgContent;
    }
  }, [svgContent]);

  const getSvgSize = useCallback(() => {
    if (!normalizedSvg) return null;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(normalizedSvg, "image/svg+xml");
      const svg = doc.documentElement;
      const widthAttr = svg.getAttribute("width") || "";
      const heightAttr = svg.getAttribute("height") || "";
      const viewBox = svg.getAttribute("viewBox");

      const parseSize = (val: string) => {
        if (val.includes("%")) return NaN;
        const num = parseFloat(val.replace(/[^\d.]+/g, ""));
        return Number.isFinite(num) ? num : NaN;
      };

      const width = parseSize(widthAttr);
      const height = parseSize(heightAttr);

      if (Number.isFinite(width) && Number.isFinite(height) && width > 0) {
        return { width, height };
      }

      if (viewBox) {
        const parts = viewBox.split(/[\s,]+/).map((p) => parseFloat(p));
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          return { width: parts[2], height: parts[3] };
        }
      }
    } catch {
      // ignore parsing errors
    }
    return null;
  }, [normalizedSvg]);
  const svgSize = useMemo(() => getSvgSize(), [getSvgSize]);

  useEffect(() => {
    if (!normalizedSvg) return;
    // 新内容时默认回到自适应模式
    setIsAdaptive(true);
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });

    const measure = () => {
      const svgEl = svgWrapRef.current?.querySelector("svg");
      if (!svgEl) return;

      let width = 0;
      let height = 0;

      const rect = svgEl.getBoundingClientRect();
      if (rect.width > 1 && rect.height > 1) {
        width = rect.width;
        height = rect.height;
      }

      if (!width || !height) {
        try {
          const target = svgEl.querySelector("g") || svgEl;
          const bbox = (target as SVGGraphicsElement).getBBox();
          if (bbox.width > 0 && bbox.height > 0) {
            width = bbox.width;
            height = bbox.height;
          }
        } catch {
          // ignore
        }
      }

      if (width > 0 && height > 0) {
        setSvgIntrinsicSize({ width, height });
      }
    };

    requestAnimationFrame(() => requestAnimationFrame(measure));
  }, [normalizedSvg]);

  const fitImageToContainer = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const image = imageRef.current;

    let imgWidth = image?.naturalWidth || 0;
    let imgHeight = image?.naturalHeight || 0;
    if (normalizedSvg) {
      const preferred = svgIntrinsicSize || svgSize;
      if (preferred) {
        imgWidth = preferred.width;
        imgHeight = preferred.height;
      }
    }
    if (!imgWidth || !imgHeight) return;

    // Get available space (accounting for padding)
    const fitPadding = 80; // total padding (left+right / top+bottom)
    const availWidth = container.clientWidth - fitPadding;
    const availHeight = container.clientHeight - fitPadding;

    // Calculate required scale to fit
    const scaleX = availWidth / imgWidth;
    const scaleY = availHeight / imgHeight;
    // Fit 模式：包含策略，允许放大
    const newScale = Math.min(scaleX, scaleY);

    setScale(Math.min(Math.max(newScale, minScale), maxScale));
    setOffset({ x: 0, y: 0 });
  }, [
    getSvgSize,
    maxScale,
    minScale,
    normalizedSvg,
    svgIntrinsicSize,
    svgSize,
  ]);

  useEffect(() => {
    if (isAdaptive && normalizedSvg && svgIntrinsicSize) {
      fitImageToContainer();
    }
  }, [fitImageToContainer, isAdaptive, normalizedSvg, svgIntrinsicSize]);

  const handleDownload = async () => {
    try {
      // 生成带时间戳的文件名
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .replace(/\..+/, "")
        .replace("T", "_");
      // 假设 img 是完整的 URL 字符串
      let fileName: string;
      if (propFileName) {
        fileName = propFileName;
      } else if (normalizedSvg) {
        fileName = `image_${timestamp}.svg`;
      } else {
        // 否则，使用旧的逻辑作为备用方案
        const fileExt = getFileExtension(img || "") || "jpg";
        fileName = `image_${timestamp}.${fileExt}`;
      }
      // const fileExt = getFileExtension(img) || "jpg"; // img 是你图片 URL 的变量
      // const fileName = `image_${timestamp}.${fileExt}`;

      // 创建一个临时的下载链接
      const link = document.createElement("a");
      if (normalizedSvg) {
        const blob = new Blob([normalizedSvg], { type: "image/svg+xml" });
        link.href = URL.createObjectURL(blob);
      } else {
        link.href = img || ""; // 直接使用原始图片 URL
      }
      link.download = fileName; // 浏览器会尝试使用这个文件名

      // 对于某些浏览器和服务器配置，可能需要设置 target="_blank" 来确保下载行为
      // link.target = "_blank";
      // link.rel = "noopener noreferrer"; // 安全考虑

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (normalizedSvg) {
        URL.revokeObjectURL(link.href);
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert(
        "Failed to initiate download. The browser will handle the download. If it doesn't start, please check your browser settings or try right-clicking the image to save.",
      );
    }
  };

  // getFileExtension 函数保持不变
  const getFileExtension = (url: string): string | null => {
    try {
      // 移除查询参数和哈希，以正确匹配扩展名
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
      return match ? match[1].toLowerCase() : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (isAdaptive) {
      fitImageToContainer();
    }

    const handleResize = () => {
      if (isAdaptive) {
        fitImageToContainer();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isAdaptive, fitImageToContainer]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventScroll = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // 处理缩放逻辑
      if (e.deltaY > 0) {
        setScale((prev) => Math.max(prev - 0.1, minScale));
      } else {
        setScale((prev) => Math.min(prev + 0.1, maxScale));
      }
    };

    container.addEventListener("wheel", preventScroll, { passive: false });

    return () => {
      container.removeEventListener("wheel", preventScroll);
    };
  }, []);
  const scalePercentage = Math.round(scale * 100);

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!isDragging) return;
      setOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const handleMouseUp = () => {
      if (!isDragging) return;
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    };
  };

  const contentStyle: React.CSSProperties = {
    transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${scale})`,
    transformOrigin: "center",
    transition: isDragging ? "none" : "transform 0.2s ease",
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%", // 确保填充模态框高度
        overflow: "hidden", // 防止内容溢出
      }}
    >
      {/* 图片内容区域 */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          textAlign: "center",
          padding: "20px",
          backgroundColor: "#f0f0f0",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
        onMouseDown={handleMouseDown}
        // onWheel={handleWheel}
      >
        {normalizedSvg ? (
          <div
            ref={svgWrapRef}
            style={{
              display: "inline-block",
              width: svgSize?.width ? `${svgSize.width}px` : "auto",
              height: svgSize?.height ? `${svgSize.height}px` : "auto",
              ...contentStyle,
            }}
            dangerouslySetInnerHTML={{ __html: normalizedSvg }}
          />
        ) : (
          <img
            ref={imageRef}
            src={img}
            alt="preview"
            draggable={false}
            style={{
              maxWidth: "100%",
              ...contentStyle,
            }}
            onLoad={() => {
              if (isAdaptive) {
                fitImageToContainer();
              }
            }}
          />
        )}
      </div>

      {/* 底部横栏 */}
      <div
        style={{
          padding: "10px",
          backgroundColor: "#fff",
          borderTop: "1px solid #ddd",
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          boxShadow: "0 -2px 4px rgba(0,0,0,0.1)", // 可选：添加阴影
          position: "relative", // 为右下角链接按钮提供定位参考
        }}
      >
        <div className={styles["image-buttons-container"]}>
          <button
            className={styles["image-button"]}
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            ➖
          </button>
          <span
            className={styles["image-button"]}
            style={{ cursor: "default" }}
            title="Current Zoom Level"
          >
            {scalePercentage}%
          </span>
          <button
            className={styles["image-button"]}
            onClick={handleZoomIn}
            title="Zoom In"
          >
            ➕
          </button>
          {!isAdaptive ? (
            <button
              className={styles["image-button"]}
              onClick={handleToggleAdaptive}
              title="Adaptive Scaling"
            >
              Fit
            </button>
          ) : (
            <button
              className={styles["image-button"]}
              onClick={handleResetToOriginal}
              title="Original Size"
            >
              1:1
            </button>
          )}
          <button
            className={styles["image-button"]}
            onClick={handleRotateLeft}
            title="Rotate Left"
          >
            ↺
          </button>
          <button
            className={styles["image-button"]}
            onClick={handleRotateRight}
            title="Rotate Right"
          >
            ↻
          </button>
          <button
            className={styles["image-button"]}
            onClick={handleDownload}
            title="Download Image"
          >
            💾
          </button>
        </div>
        {/* Mermaid 导航链接 - 右下角 */}
        {mermaidCode && (
          <div
            style={{
              position: "absolute",
              right: "10px",
              bottom: "10px",
              display: "flex",
              gap: "8px",
            }}
          >
            <a
              href="https://mermaid.js.org/intro/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles["image-button"]}
              title="Mermaid Official Documentation"
              style={{ textDecoration: "none" }}
            >
              📖 Docs
            </a>
            <a
              href={`https://mermaid-exporter.pages.dev/?code=${encodeURIComponent(
                mermaidCode,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles["image-button"]}
              title="Open in Mermaid Exporter"
              style={{ textDecoration: "none" }}
            >
              🎨 Editor
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export function showImageModal(img: string, fileName?: string) {
  showModal({
    title: Locale.Export.Image.Modal,
    defaultMax: true,
    children: <ImageModalContent img={img} fileName={fileName} />,
  });
}

export function showSvgModal(
  svgContent: string,
  fileName?: string,
  mermaidCode?: string,
) {
  showModal({
    title: Locale.Export.Image.Modal,
    defaultMax: true,
    children: (
      <ImageModalContent
        svgContent={svgContent}
        fileName={fileName}
        mermaidCode={mermaidCode}
      />
    ),
  });
}
type SearchSelectorItem<T> = {
  title: string;
  subTitle?: string;
  value: T;
  disable?: boolean;
  modelName?: string;
};

type SearchSelectorGroup<T> = {
  group: ModelGroup;
  items: Array<SearchSelectorItem<T>>;
  count: number;
};

type SearchSelectorCollapsedGroups = Record<string, boolean>;

const SEARCH_SELECTOR_COLLAPSED_GROUPS_STORAGE_KEY =
  "search-selector-collapsed-groups";

function getStoredSearchSelectorCollapsedGroups(): SearchSelectorCollapsedGroups {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedGroups = safeLocalStorage().getItem(
      SEARCH_SELECTOR_COLLAPSED_GROUPS_STORAGE_KEY,
    );
    if (!storedGroups) {
      return {};
    }

    const parsedGroups = JSON.parse(storedGroups);
    if (
      !parsedGroups ||
      typeof parsedGroups !== "object" ||
      Array.isArray(parsedGroups)
    ) {
      return {};
    }

    return Object.entries(parsedGroups).reduce<SearchSelectorCollapsedGroups>(
      (groups, [groupId, collapsed]) => {
        if (typeof collapsed === "boolean") {
          groups[groupId] = collapsed;
        }
        return groups;
      },
      {},
    );
  } catch {
    return {};
  }
}

function saveSearchSelectorCollapsedGroups(
  groups: SearchSelectorCollapsedGroups,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    safeLocalStorage().setItem(
      SEARCH_SELECTOR_COLLAPSED_GROUPS_STORAGE_KEY,
      JSON.stringify(groups),
    );
  } catch {
    // Ignore unavailable storage.
  }
}

function getSearchSelectorItemModelName<T>(item: SearchSelectorItem<T>) {
  if (item.modelName) {
    return item.modelName;
  }
  if (typeof item.value === "string") {
    return item.value.split(/@(?=[^@]*$)/)[0];
  }
  return item.title;
}

export function SearchSelector<T>(props: {
  items: Array<SearchSelectorItem<T>>;
  defaultSelectedValue?: T[] | T;
  onSelection?: (selection: T[]) => void;
  onClose?: () => void;
  multiple?: boolean;
}) {
  const [selectedValues, setSelectedValues] = useState<T[]>(
    Array.isArray(props.defaultSelectedValue)
      ? props.defaultSelectedValue
      : props.defaultSelectedValue !== undefined
      ? [props.defaultSelectedValue]
      : [],
  );

  // 添加搜索状态
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] =
    useState<SearchSelectorCollapsedGroups>(
      getStoredSearchSelectorCollapsedGroups,
    );
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [flyoutPosition, setFlyoutPosition] = useState({
    top: 0,
    left: 0,
    width: 320,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const savedCollapsedGroupsRef =
    useRef<SearchSelectorCollapsedGroups>(collapsedGroups);
  const flyoutCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const accessStore = useAccessStore();

  const presetRules = useMemo(
    () =>
      accessStore.selectLabels
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean),
    [accessStore.selectLabels],
  );
  const [selectedRule, setSelectedRule] = useState<string>("");

  // 当组件加载时自动聚焦到输入框
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim() || selectedRule) {
      setCollapsedGroups({});
      setHoveredGroupId(null);
    } else {
      setCollapsedGroups(savedCollapsedGroupsRef.current);
    }
  }, [searchQuery, selectedRule]);

  const updateCollapsedGroups = useCallback(
    (
      getNextGroups: (
        groups: SearchSelectorCollapsedGroups,
      ) => SearchSelectorCollapsedGroups,
    ) => {
      setCollapsedGroups(() => {
        const nextGroups = getNextGroups(savedCollapsedGroupsRef.current);
        savedCollapsedGroupsRef.current = nextGroups;
        saveSearchSelectorCollapsedGroups(nextGroups);
        return nextGroups;
      });
    },
    [],
  );

  const clearFlyoutCloseTimer = useCallback(() => {
    if (flyoutCloseTimerRef.current) {
      clearTimeout(flyoutCloseTimerRef.current);
      flyoutCloseTimerRef.current = null;
    }
  }, []);

  const closeGroupFlyout = useCallback(() => {
    clearFlyoutCloseTimer();
    setHoveredGroupId(null);
  }, [clearFlyoutCloseTimer]);

  const scheduleCloseGroupFlyout = useCallback(() => {
    clearFlyoutCloseTimer();
    flyoutCloseTimerRef.current = setTimeout(() => {
      setHoveredGroupId(null);
      flyoutCloseTimerRef.current = null;
    }, 120);
  }, [clearFlyoutCloseTimer]);

  const openCollapsedGroupFlyout = useCallback(
    (groupId: string, target: HTMLElement, force = false) => {
      if (!force && !collapsedGroups[groupId]) {
        return;
      }

      const rect = target.getBoundingClientRect();
      const viewportPadding = 12;
      const gap = 6;
      const preferredLeft = rect.right + gap;
      const minFlyoutWidth = 160;
      const left =
        window.innerWidth - preferredLeft - viewportPadding < minFlyoutWidth
          ? Math.max(
              viewportPadding,
              window.innerWidth - minFlyoutWidth - viewportPadding,
            )
          : preferredLeft;
      const availableWidth = window.innerWidth - left - viewportPadding;
      const width = Math.max(minFlyoutWidth, Math.min(360, availableWidth));

      clearFlyoutCloseTimer();
      setFlyoutPosition({
        top: Math.max(viewportPadding, rect.top),
        left,
        width,
      });
      setHoveredGroupId(groupId);
    },
    [clearFlyoutCloseTimer, collapsedGroups],
  );

  useEffect(() => {
    return () => clearFlyoutCloseTimer();
  }, [clearFlyoutCloseTimer]);

  const handleSelection = (e: MouseEvent, value: T) => {
    if (props.multiple) {
      e.stopPropagation();
      const newSelectedValues = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];
      setSelectedValues(newSelectedValues);
      props.onSelection?.(newSelectedValues);
    } else {
      setSelectedValues([value]);
      props.onSelection?.([value]);
      props.onClose?.();
    }
  };
  // 过滤列表项
  const filteredItems = useMemo(
    () =>
      props.items
        .filter((item) => {
          const normalizedSearchQuery = searchQuery.toLowerCase();
          // 检查是否匹配搜索框
          const searchMatch =
            item.title.toLowerCase().includes(normalizedSearchQuery) ||
            (item.subTitle &&
              item.subTitle.toLowerCase().includes(normalizedSearchQuery)) ||
            (typeof item.value === "string" &&
              item.value.toLowerCase().includes(normalizedSearchQuery));

          // 检查是否匹配下拉列表规则，仅匹配模型描述中的文本
          const ruleMatch =
            selectedRule === "" || // 如果未选择规则，则规则匹配为 true
            (typeof item.subTitle === "string" &&
              item.subTitle.toLowerCase().includes(selectedRule.toLowerCase()));

          return searchMatch && ruleMatch; // 两者都匹配才返回 true
        })
        .sort((a, b) => {
          // 将选中的项目排在前面
          const aSelected = selectedValues.includes(a.value);
          const bSelected = selectedValues.includes(b.value);
          if (aSelected && !bSelected) {
            return -1;
          }
          if (!aSelected && bSelected) {
            return 1;
          }
          return 0;
        }),
    [props.items, searchQuery, selectedRule, selectedValues],
  );

  const selectedItems = filteredItems.filter((item) =>
    selectedValues.includes(item.value),
  );

  const groupedItems = useMemo(() => {
    const groups = new Map<string, SearchSelectorGroup<T>>();

    filteredItems.forEach((item) => {
      const group = getModelGroup(getSearchSelectorItemModelName(item));
      const groupedItem = groups.get(group.id);

      if (groupedItem) {
        groupedItem.count += 1;
        if (!selectedValues.includes(item.value)) {
          groupedItem.items.push(item);
        }
      } else {
        groups.set(group.id, {
          group,
          items: selectedValues.includes(item.value) ? [] : [item],
          count: 1,
        });
      }
    });

    return Array.from(groups.values())
      .filter((group) => group.items.length > 0)
      .sort((a, b) => compareModelGroups(a.group, b.group));
  }, [filteredItems, selectedValues]);

  const visibleGroupIds = groupedItems.map((group) => group.group.id);
  const allGroupsCollapsed =
    visibleGroupIds.length > 0 &&
    visibleGroupIds.every((groupId) => collapsedGroups[groupId]);

  const toggleAllGroups = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const nextCollapsedState = !allGroupsCollapsed;
    updateCollapsedGroups((groups) => {
      const nextGroups = { ...groups };
      visibleGroupIds.forEach((groupId) => {
        nextGroups[groupId] = nextCollapsedState;
      });
      return nextGroups;
    });
  };

  const toggleGroup = (groupId: string) => {
    updateCollapsedGroups((groups) => ({
      ...groups,
      [groupId]: !groups[groupId],
    }));
  };

  const hoveredGroup = useMemo(
    () =>
      hoveredGroupId && collapsedGroups[hoveredGroupId]
        ? groupedItems.find((group) => group.group.id === hoveredGroupId)
        : undefined,
    [collapsedGroups, groupedItems, hoveredGroupId],
  );

  useEffect(() => {
    if (!hoveredGroup) {
      return;
    }

    const flyoutElement = flyoutRef.current;
    if (!flyoutElement) {
      return;
    }

    const viewportPadding = 12;
    const rect = flyoutElement.getBoundingClientRect();
    const nextTop = Math.max(
      viewportPadding,
      Math.min(
        flyoutPosition.top,
        window.innerHeight - rect.height - viewportPadding,
      ),
    );

    if (Math.abs(nextTop - flyoutPosition.top) > 1) {
      setFlyoutPosition((position) => ({
        ...position,
        top: nextTop,
      }));
    }
  }, [flyoutPosition.top, hoveredGroup]);

  const renderSelectedBadge = () => (
    <div
      style={{
        height: 16,
        width: 16,
        backgroundColor: "var(--primary)",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 5L4 7L8 3"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );

  const renderItem = (
    item: SearchSelectorItem<T>,
    key: string | number,
    selected: boolean,
  ) => (
    <ListItem
      className={`${styles["selector-item"]} ${
        item.disable && styles["selector-item-disabled"]
      }`}
      key={key}
      icon={<Avatar model={getSearchSelectorItemModelName(item)} />}
      title={item.title}
      subTitle={item.subTitle}
      vertical={true}
      onClick={(e) => {
        if (item.disable) {
          e.stopPropagation();
        } else {
          handleSelection(e, item.value);
        }
      }}
    >
      {selected ? renderSelectedBadge() : <></>}
    </ListItem>
  );

  return (
    <div className={styles["selector"]} onClick={() => props.onClose?.()}>
      <div
        className={styles["selector-content"]}
        onClick={(e) => e.stopPropagation()}
      >
        <List>
          <div className={styles["selector-header"]}>
            <div className={styles["selector-search"]}>
              <input
                ref={inputRef}
                type="text"
                className={styles["selector-search-input"]}
                placeholder={Locale.UI.SearchModel}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                className={styles["selector-collapse-button"]}
                onClick={toggleAllGroups}
              >
                {allGroupsCollapsed
                  ? Locale.UI.ExpandGroups
                  : Locale.UI.CollapseGroups}
              </button>
            </div>
            {presetRules.length > 0 && (
              <div className={styles["selector-rules"]}>
                {presetRules.map((rule, index) => {
                  const active = selectedRule === rule;
                  return (
                    <button
                      type="button"
                      key={index}
                      className={`${styles["selector-rule-pill"]} ${
                        active ? styles["selector-rule-pill-active"] : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRule(active ? "" : rule);
                      }}
                    >
                      {rule}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {selectedItems.length > 0 && (
            <div className={styles["selector-selected-items"]}>
              {selectedItems.map((item, i) =>
                renderItem(item, `selected-${i}`, true),
              )}
            </div>
          )}
          {groupedItems.map(({ group, items, count }) => {
            const collapsed = collapsedGroups[group.id];
            return (
              <div
                className={`${styles["selector-group"]} ${
                  collapsed ? styles["selector-group-collapsed"] : ""
                }`}
                key={group.id}
                onMouseEnter={(e) =>
                  openCollapsedGroupFlyout(group.id, e.currentTarget)
                }
                onMouseLeave={scheduleCloseGroupFlyout}
              >
                <button
                  type="button"
                  className={styles["selector-group-header"]}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (collapsed) {
                      closeGroupFlyout();
                    } else {
                      openCollapsedGroupFlyout(group.id, e.currentTarget, true);
                    }
                    toggleGroup(group.id);
                  }}
                >
                  <span className={styles["selector-group-icon"]}>
                    <Avatar model={group.iconModel} />
                  </span>
                  <span className={styles["selector-group-title"]}>
                    {group.label} ({count})
                  </span>
                  <span className={styles["selector-group-arrow"]}>
                    {collapsed ? ">" : "v"}
                  </span>
                </button>
                {!collapsed && (
                  <div className={styles["selector-group-items"]}>
                    {items.map((item, i) =>
                      renderItem(item, `${group.id}-${i}`, false),
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filteredItems.length === 0 && (
            <div className={styles["selector-empty"]}>No Models</div>
          )}
        </List>
        {hoveredGroup && (
          <div
            ref={flyoutRef}
            className={styles["selector-flyout"]}
            style={{
              top: flyoutPosition.top,
              left: flyoutPosition.left,
              width: flyoutPosition.width,
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={clearFlyoutCloseTimer}
            onMouseLeave={scheduleCloseGroupFlyout}
          >
            <div className={styles["selector-flyout-header"]}>
              <span className={styles["selector-group-icon"]}>
                <Avatar model={hoveredGroup.group.iconModel} />
              </span>
              <span className={styles["selector-group-title"]}>
                {hoveredGroup.group.label} ({hoveredGroup.count})
              </span>
            </div>
            <List>
              {hoveredGroup.items.map((item, i) =>
                renderItem(item, `${hoveredGroup.group.id}-flyout-${i}`, false),
              )}
            </List>
          </div>
        )}
      </div>
    </div>
  );
}
export function Selector<T>(props: {
  items: Array<{
    title: string;
    subTitle?: string;
    value: T;
    disable?: boolean;
  }>;
  defaultSelectedValue?: T;
  onSelection?: (selection: T[]) => void;
  onClose?: () => void;
  multiple?: boolean;
}) {
  const [selectedValues, setSelectedValues] = useState<T[]>(
    Array.isArray(props.defaultSelectedValue)
      ? props.defaultSelectedValue
      : props.defaultSelectedValue !== undefined
      ? [props.defaultSelectedValue]
      : [],
  );

  const handleSelection = (e: MouseEvent, value: T) => {
    if (props.multiple) {
      e.stopPropagation();
      const newSelectedValues = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value];
      setSelectedValues(newSelectedValues);
      props.onSelection?.(newSelectedValues);
    } else {
      setSelectedValues([value]);
      props.onSelection?.([value]);
      props.onClose?.();
    }
  };

  return (
    <div className={styles["selector"]} onClick={() => props.onClose?.()}>
      <div className={styles["selector-content"]}>
        <List>
          {props.items.map((item, i) => {
            const selected = selectedValues.includes(item.value);
            return (
              <ListItem
                className={styles["selector-item"]}
                key={i}
                title={item.title}
                subTitle={item.subTitle}
                onClick={(e) => {
                  if (item.disable) {
                    e.stopPropagation();
                  } else {
                    handleSelection(e, item.value);
                  }
                }}
              >
                {selected ? (
                  <div
                    style={{
                      height: 10,
                      width: 10,
                      backgroundColor: "var(--primary)",
                      borderRadius: 10,
                    }}
                  ></div>
                ) : (
                  <></>
                )}
              </ListItem>
            );
          })}
        </List>
      </div>
    </div>
  );
}

export function FullScreen(props: any) {
  const { children, right = 10, top = 10, ...rest } = props;
  const ref = useRef<HTMLDivElement>();
  const [fullScreen, setFullScreen] = useState(false);
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      ref.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);
  useEffect(() => {
    const handleScreenChange = (e: any) => {
      if (e.target === ref.current) {
        setFullScreen(!!document.fullscreenElement);
      }
    };
    document.addEventListener("fullscreenchange", handleScreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleScreenChange);
    };
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }} {...rest}>
      <div style={{ position: "absolute", right, top }}>
        <IconButton
          icon={fullScreen ? <MinIcon /> : <MaxIcon />}
          onClick={toggleFullscreen}
          bordered
        />
      </div>
      {children}
    </div>
  );
}
