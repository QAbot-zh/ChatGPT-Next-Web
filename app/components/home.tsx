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
import { useAccessStore } from "../store";
import { identifyDefaultClaudeModel } from "../utils/checkers";
import { FloatingButton } from "./floating-button";
import { CustomCssProvider } from "./CustomCssProvider";

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
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated;
};

const loadAsyncGoogleFont = () => {
  const linkEl = document.createElement("link");
  const proxyFontUrl = "/google-fonts";
  const remoteFontUrl = "https://fonts.googleapis.com";
  const googleFontUrl =
    getClientConfig()?.buildMode === "export" ? remoteFontUrl : proxyFontUrl;
  linkEl.rel = "stylesheet";
  linkEl.href =
    googleFontUrl +
    "/css2?family=" +
    encodeURIComponent("Noto Sans:wght@300;400;700;900") +
    "&display=swap";
  document.head.appendChild(linkEl);
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

  // useEffect(() => {
  //   loadAsyncGoogleFont();
  // }, []);
  useEffect(() => {
    const load = () => {
      try {
        loadAsyncGoogleFont();
      } catch {}
    };
    // 空闲时加载，低端网络或省流量模式直接跳过
    const conn = (navigator as any).connection;
    if (conn?.saveData || conn?.effectiveType === "2g") return;
    if ("requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(load, { timeout: 2000 });
      return () => (window as any).cancelIdleCallback?.(id);
    } else {
      const t = setTimeout(load, 1200);
      return () => clearTimeout(t);
    }
  }, []);

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

// 版本检测 Hook：当页面从后台切换回前台时检测服务器版本
function useVersionCheck() {
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch("/api/config");
        const serverConfig = await res.json();
        const clientBuildId = getClientConfig()?.buildId;

        if (
          serverConfig.buildId &&
          clientBuildId &&
          serverConfig.buildId !== clientBuildId
        ) {
          console.log(
            "[Version] Mismatch detected:",
            clientBuildId,
            "->",
            serverConfig.buildId,
            ", reloading...",
          );
          window.location.reload();
        }
      } catch (e) {
        // 忽略网络错误
      }
    };

    // 页面可见时检查版本
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);
}

export function Home() {
  useSwitchTheme();
  useLoadData();
  useHtmlLang();
  useVersionCheck();

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
        <CustomCssProvider />
        <Screen />
        <FloatingButton />
      </Router>
    </ErrorBoundary>
  );
}
