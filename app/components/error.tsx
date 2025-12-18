import React from "react";
import { IconButton } from "./button";
import GithubIcon from "../icons/github.svg";
// import ResetIcon from "../icons/reload.svg";
import { ISSUE_URL, UNFINISHED_INPUT } from "../constant";
import Locale from "../locales";
import { showConfirm } from "./ui-lib";
import { useSyncStore } from "../store/sync";
import { useChatStore } from "../store/chat";
import styles from "./error.module.scss";

interface IErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  info: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<any, IErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 检测 Server Action 版本不匹配错误，自动刷新页面
    if (error.message?.includes("Failed to find Server Action")) {
      console.log("[Error] Server Action version mismatch, reloading...");
      window.location.reload();
      return;
    }

    // Update state with error details
    this.setState({ hasError: true, error, info });
  }
  removeCurrentInput() {
    try {
      const session = useChatStore.getState().currentSession();
      const key = UNFINISHED_INPUT(session.id);
      localStorage.removeItem(key);
    } catch (err) {
      console.error("Failed to clear unfinished input:", err);
    }
  }
  clearAndSaveData() {
    try {
      useSyncStore.getState().export();
    } finally {
      useChatStore.getState().clearAllData();
    }
  }

  render() {
    if (this.state.hasError) {
      // Render error message
      return (
        <div className={styles.error}>
          <h2 className={styles.title}>Oops, something went wrong!</h2>

          <div className={styles.panel}>
            <pre className={styles.pre} aria-label="Error details">
              <code>{this.state.error?.toString()}</code>
              {"\n"}
              <code>{this.state.info?.componentStack}</code>
            </pre>
          </div>

          <div className={styles.actions}>
            <a href={ISSUE_URL} className={styles.report}>
              <IconButton
                text="Report This Error"
                icon={<GithubIcon />}
                bordered
              />
            </a>
            <IconButton
              // icon={<ResetIcon />}
              text="🔨 Try To Fix Error"
              bordered
              type="info"
              onClick={async () => {
                if (await showConfirm(Locale.Settings.Danger.Fix.Confirm)) {
                  this.removeCurrentInput();
                  this.setState({ hasError: false, error: null, info: null });
                }
              }}
            />
            <IconButton
              // icon={<ResetIcon />}
              text="⚠ Clear All Data"
              type="danger"
              onClick={async () => {
                if (await showConfirm(Locale.Settings.Danger.Reset.Confirm)) {
                  this.clearAndSaveData();
                  this.setState({ hasError: false, error: null, info: null });
                }
              }}
              bordered
            />
          </div>
        </div>
      );
    }
    // if no error occurred, render children
    return this.props.children;
  }
}
