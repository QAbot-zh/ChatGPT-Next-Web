"use client";

require("../polyfill");

import { useState, useEffect } from "react";

import styles from "./home.module.scss";

// import BotIcon from "../icons/bot.svg";
import AILogoIcon from "../icons/ai-logo.svg";
import LoadingIcon from "../icons/three-dots.svg";

import { getCSSVar, useMobileScreen } from "../utils";

import dynamic from "next/dynamic";
import { ModelProvider, Path, SlotID } from "../constant";
import { ErrorBoundary } from "./error";

import { getISOLang, getLang } from "../locales";

import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { SideBar } from "./sidebar";
import { useAppConfig } from "../store/config";
import { AuthPage } from "./auth";
import { getClientConfig } from "../config/client";
import { ClientApi } from "../client/api";
import { useAccessStore, useChatStore } from "../store";
import { identifyDefaultClaudeModel } from "../utils/checkers";
import { FloatingButton } from "./floating-button";
import { CustomCssProvider } from "./CustomCssProvider";
import { ModelTableProvider } from "../context/model-table";

export function Loading(props: { noLogo?: boolean }) {
  return (
    <div className={styles["loading-content"] + " no-dark"}>
      {!props.noLogo && <AILogoIcon />}
      <LoadingIcon />
    </div>
  );
}

const Artifacts = dynamic(async () => (await import("./artifacts")).Artifacts, {
  loading: () => <Loading noLogo />,
});

const Share = dynamic(async () => (await import("./share")).Share, {
  loading: () => <Loading noLogo />,
});

const Settings = dynamic(async () => (await import("./settings")).Settings, {
  loading: () => <Loading noLogo />,
});

const Chat = dynamic(async () => (await import("./chat")).Chat, {
  loading: () => <Loading noLogo />,
});

const NewChat = dynamic(async () => (await import("./new-chat")).NewChat, {
  loading: () => <Loading noLogo />,
});

const CustomProvider = dynamic(
  async () => (await import("./custom-provider")).CustomProvider,
  {
    loading: () => <Loading noLogo />,
  },
);

const CloudBackup = dynamic(
  async () => (await import("./cloud-backup")).CloudBackupPage,
  {
    loading: () => <Loading noLogo />,
  },
);

const MaskPage = dynamic(async () => (await import("./mask")).MaskPage, {
  loading: () => <Loading noLogo />,
});

const SearchChat = dynamic(
  async () => (await import("./search-chat")).SearchChatPage,
  {
    loading: () => <Loading noLogo />,
  },
);

export function useSwitchTheme() {
  const config = useAppConfig();

  useEffect(() => {
    const applyBodyClass = (mode: "light" | "dark") => {
      document.body.classList.toggle("dark", mode === "dark");
      document.body.classList.toggle("light", mode === "light");
    };

    const metaDescriptionDark = document.querySelector(
      'meta[name="theme-color"][media*="dark"]',
    );
    const metaDescriptionLight = document.querySelector(
      'meta[name="theme-color"][media*="light"]',
    );

    const setMetaFromCSSVar = () => {
      const themeColor = getCSSVar("--theme-color");
      metaDescriptionDark?.setAttribute("content", themeColor);
      metaDescriptionLight?.setAttribute("content", themeColor);
    };

    document.body.classList.remove("light");
    document.body.classList.remove("dark");

    if (config.theme === "dark" || config.theme === "light") {
      applyBodyClass(config.theme);
      setMetaFromCSSVar();
      // 同步 custom-css 的 data-theme（你已有）
      document
        .getElementById("custom-css")
        ?.setAttribute("data-theme", config.theme);
      return;
    }

    // === auto: 跟随系统，并监听变更 ===
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      applyBodyClass(mq.matches ? "dark" : "light");
      setMetaFromCSSVar();
      document.getElementById("custom-css")?.setAttribute("data-theme", "auto");
    };

    sync(); // 立即执行一次
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, [config.theme]);
}

function useHtmlLang() {
  useEffect(() => {
    const lang = getISOLang();
    const htmlLang = document.documentElement.lang;

    if (lang !== htmlLang) {
      document.documentElement.lang = lang;
    }
  }, []);
}

const useHasHydrated = () => {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 关键：必须等 chat / config 这两个核心 store 真正水合完成才放行渲染。
  // 否则 IDB 读取异常时弹窗虽然弹出，但 Home 已经用默认 state 渲染了。
  const chatHydrated = useChatStore((s) => s._hasHydrated);
  const configHydrated = useAppConfig((s) => s._hasHydrated);

  return mounted && chatHydrated && configHydrated;
};

function Screen() {
  const config = useAppConfig();
  const location = useLocation();
  const isArtifact = location.pathname.includes(Path.Artifacts);
  const isShare = location.pathname.includes(Path.Share);
  const isHome = location.pathname === Path.Home;
  const isAuth = location.pathname === Path.Auth;
  const isMobileScreen = useMobileScreen();
  const shouldTightBorder =
    getClientConfig()?.isApp || (config.tightBorder && !isMobileScreen);

  if (isArtifact) {
    return (
      <Routes>
        <Route path="/artifacts/:id" element={<Artifacts />} />
      </Routes>
    );
  }
  if (isShare) {
    return (
      <Routes>
        <Route path="/share/:id" element={<Share />} />
      </Routes>
    );
  }
  return (
    <div
      className={
        styles.container +
        ` ${shouldTightBorder ? styles["tight-container"] : styles.container} ${
          getLang() === "ar" ? styles["rtl-screen"] : ""
        }`
      }
    >
      {isAuth ? (
        <>
          <AuthPage />
        </>
      ) : (
        <>
          <SideBar className={isHome ? styles["sidebar-show"] : ""} />

          <div className={styles["window-content"]} id={SlotID.AppBody}>
            <Routes>
              <Route path={Path.Home} element={<Chat />} />
              <Route path={Path.NewChat} element={<NewChat />} />
              <Route path={Path.Masks} element={<MaskPage />} />
              <Route path={Path.SearchChat} element={<SearchChat />} />
              <Route path={Path.CloudBackup} element={<CloudBackup />} />
              <Route path={Path.Chat} element={<Chat />} />
              <Route path={Path.Settings} element={<Settings />} />
              <Route
                path={`${Path.CustomProvider}/:providerId?`}
                element={<CustomProvider />}
              />
            </Routes>
          </div>
        </>
      )}
    </div>
  );
}

export function useLoadData() {
  const config = useAppConfig();

  var api: ClientApi;
  if (config.modelConfig.model.startsWith("gemini")) {
    api = new ClientApi(ModelProvider.GeminiPro);
  } else if (identifyDefaultClaudeModel(config.modelConfig.model)) {
    api = new ClientApi(ModelProvider.Claude);
  } else {
    api = new ClientApi(ModelProvider.GPT);
  }
  useEffect(() => {
    (async () => {
      const models = await api.llm.models();
      config.mergeModels(models);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function Home() {
  useSwitchTheme();
  useLoadData();
  useHtmlLang();

  useEffect(() => {
    console.log("[Config] got config from build time", getClientConfig());
    useAccessStore.getState().fetch();
  }, []);

  if (!useHasHydrated()) {
    return <Loading />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <ModelTableProvider>
          <CustomCssProvider />
          <Screen />
          <FloatingButton />
        </ModelTableProvider>
      </Router>
    </ErrorBoundary>
  );
}
