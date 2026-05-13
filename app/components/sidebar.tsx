import React, { useEffect, useRef, useMemo, useState, Fragment } from "react";

import styles from "./home.module.scss";

import { IconButton } from "./button";
import SettingsIcon from "../icons/settings.svg";
import GithubIcon from "../icons/github.svg";
// import ChatGptIcon from "../icons/chatgpt.svg";
import AILogoIcon from "../icons/ai-logo.svg";
import AddIcon from "../icons/add.svg";
import DeleteIcon from "../icons/delete.svg";
import MaskIcon from "../icons/mask.svg";
import DragIcon from "../icons/drag.svg";
import DiscoveryIcon from "../icons/discovery.svg";
import CustomProviderIcon from "../icons/custom-models.svg";
import HomeIcon from "../icons/home.svg";

import parse from "html-react-parser";

import Locale from "../locales";

import { useAppConfig, useChatStore, useAccessStore } from "../store";
import { useLocation } from "react-router-dom";

import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  NARROW_SIDEBAR_WIDTH,
  Path,
  REPO_URL,
} from "../constant";

import { Link, useNavigate } from "react-router-dom";
import { isIOS, useMobileScreen } from "../utils";
import dynamic from "next/dynamic";
import { showConfirm } from "./ui-lib";

const ChatList = dynamic(async () => (await import("./chat-list")).ChatList, {
  loading: () => null,
});

function useHotKey() {
  const chatStore = useChatStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey) {
        if (e.key === "ArrowUp") {
          chatStore.nextSession(-1);
        } else if (e.key === "ArrowDown") {
          chatStore.nextSession(1);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
}

function useDragSideBar() {
  const limit = (x: number) => Math.min(MAX_SIDEBAR_WIDTH, x);

  const config = useAppConfig();
  const startX = useRef(0);
  const startDragWidth = useRef(config.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH);
  const lastUpdateTime = useRef(Date.now());

  const toggleSideBar = () => {
    config.update((config) => {
      if (config.sidebarWidth < MIN_SIDEBAR_WIDTH) {
        config.sidebarWidth = DEFAULT_SIDEBAR_WIDTH;
      } else {
        config.sidebarWidth = NARROW_SIDEBAR_WIDTH;
      }
    });
  };

  const onDragStart = (e: MouseEvent) => {
    // Remembers the initial width each time the mouse is pressed
    startX.current = e.clientX;
    startDragWidth.current = config.sidebarWidth;
    const dragStartTime = Date.now();

    const handleDragMove = (e: MouseEvent) => {
      if (Date.now() < lastUpdateTime.current + 20) {
        return;
      }
      lastUpdateTime.current = Date.now();
      const d = e.clientX - startX.current;
      const nextWidth = limit(startDragWidth.current + d);
      config.update((config) => {
        if (nextWidth < MIN_SIDEBAR_WIDTH) {
          config.sidebarWidth = NARROW_SIDEBAR_WIDTH;
        } else {
          config.sidebarWidth = nextWidth;
        }
      });
    };

    const handleDragEnd = () => {
      // In useRef the data is non-responsive, so `config.sidebarWidth` can't get the dynamic sidebarWidth
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("pointerup", handleDragEnd);

      // if user click the drag icon, should toggle the sidebar
      const shouldFireClick = Date.now() - dragStartTime < 300;
      if (shouldFireClick) {
        toggleSideBar();
      }
    };

    window.addEventListener("pointermove", handleDragMove);
    window.addEventListener("pointerup", handleDragEnd);
  };

  const isMobileScreen = useMobileScreen();
  const shouldNarrow =
    !isMobileScreen && config.sidebarWidth < MIN_SIDEBAR_WIDTH;

  useEffect(() => {
    const barWidth = shouldNarrow
      ? NARROW_SIDEBAR_WIDTH
      : limit(config.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH);
    const sideBarWidth = isMobileScreen ? "100vw" : `${barWidth}px`;
    document.documentElement.style.setProperty("--sidebar-width", sideBarWidth);
  }, [config.sidebarWidth, isMobileScreen, shouldNarrow]);

  return {
    onDragStart,
    shouldNarrow,
  };
}

export function SideBarContainer(props: {
  children: React.ReactNode;
  onDragStart: (e: MouseEvent) => void;
  shouldNarrow: boolean;
  className?: string;
  inPrivateMode?: boolean;
}) {
  const isMobileScreen = useMobileScreen();
  const isIOSMobile = useMemo(
    () => isIOS() && isMobileScreen,
    [isMobileScreen],
  );
  const { children, className, onDragStart, shouldNarrow, inPrivateMode } =
    props;
  const [showTooltip, setShowTooltip] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isMobileScreen && inPrivateMode) {
      setShowTooltip(true);
    }
  }, [isMobileScreen, inPrivateMode]);

  const handleTooltipClick = () => {
    if (isMobileScreen) {
      navigate(Path.Chat);
    }
  };

  return (
    <div
      className={`${styles.sidebar} ${className} ${
        shouldNarrow && styles["narrow-sidebar"]
      }`}
      style={{
        // #3016 disable transition on ios mobile screen
        transition: isMobileScreen && isIOSMobile ? "none" : undefined,
      }}
    >
      {inPrivateMode && (
        <div
          className={styles["sidebar-mask"]}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {showTooltip && (
            <div
              className={styles["sidebar-tooltip"]}
              onClick={handleTooltipClick}
              style={isMobileScreen ? { cursor: "pointer" } : undefined}
            >
              <div className={styles["tooltip-content"]}>
                {Locale.Chat.InputActions.PrivateMode.Info}
                {isMobileScreen && (
                  <div>{Locale.Chat.InputActions.PrivateMode.Return}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div
        className={styles["sidebar-drag"]}
        onPointerDown={(e) => onDragStart(e as any)}
      >
        <DragIcon />
      </div>
      {children}
    </div>
  );
}

export function SideBarHeader(props: {
  title?: string | React.ReactNode;
  subTitle?: string | React.ReactNode;
  logo?: React.ReactNode;
  children?: React.ReactNode;
  shouldNarrow?: boolean;
}) {
  const { title, subTitle, logo, children, shouldNarrow } = props;
  const renderSubTitle = (text: string) => {
    return parse(text);
  };
  return (
    <Fragment>
      <div
        className={`${styles["sidebar-header"]} ${
          shouldNarrow ? styles["sidebar-header-narrow"] : ""
        }`}
        data-tauri-drag-region
      >
        <div className={styles["sidebar-title-container"]}>
          <div className={styles["sidebar-title"]} data-tauri-drag-region>
            {title}
          </div>
          <div className={styles["sidebar-sub-title"]}>
            {typeof subTitle === "string" ? renderSubTitle(subTitle) : subTitle}
          </div>
        </div>
        <div className={styles["sidebar-logo"] + " no-dark"}>{logo}</div>
      </div>
      {children}
    </Fragment>
  );
}

export function SideBarBody(props: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}) {
  const { onClick, children } = props;
  return (
    <div className={styles["sidebar-body"]} onClick={onClick}>
      {children}
    </div>
  );
}

export function SideBarTail(props: {
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}) {
  const { primaryAction, secondaryAction } = props;

  return (
    <div className={styles["sidebar-tail"]}>
      <div className={styles["sidebar-actions"]}>{primaryAction}</div>
      <div className={styles["sidebar-actions"]}>{secondaryAction}</div>
    </div>
  );
}

export function SideBar(props: { className?: string }) {
  useHotKey();

  // drag side bar
  const { onDragStart, shouldNarrow } = useDragSideBar();

  const navigate = useNavigate();
  const config = useAppConfig();
  const chatStore = useChatStore();
  const { sidebarTitle, sidebarSubTitle } = useAccessStore();
  const inPrivateMode = useChatStore((state) => {
    const currentSession = state.sessions[state.currentSessionIndex];
    return !!currentSession?.inPrivateMode;
  });
  const location = useLocation();
  const isSettingsRoute = location.pathname === Path.Settings;
  const isCustomProviderRoute = location.pathname === Path.CustomProvider;

  return (
    <SideBarContainer
      onDragStart={onDragStart}
      shouldNarrow={shouldNarrow}
      inPrivateMode={inPrivateMode}
      {...props}
    >
      <SideBarHeader
        title={sidebarTitle}
        subTitle={sidebarSubTitle}
        logo={<AILogoIcon />}
        shouldNarrow={shouldNarrow}
      >
        <div className={styles["sidebar-header-bar"]}>
          <IconButton
            icon={<MaskIcon />}
            text={shouldNarrow ? undefined : Locale.Mask.Name}
            title={shouldNarrow ? Locale.Mask.Name : undefined}
            tooltipPosition="right"
            className={styles["sidebar-bar-button"]}
            onClick={() => {
              if (config.dontShowMaskSplashScreen !== true) {
                navigate(Path.NewChat, { state: { fromHome: true } });
              } else {
                navigate(Path.Masks, { state: { fromHome: true } });
              }
            }}
            shadow
          />
          <IconButton
            icon={<DiscoveryIcon />}
            text={shouldNarrow ? undefined : Locale.Discovery.Name}
            title={shouldNarrow ? Locale.Discovery.Name : undefined}
            tooltipPosition="right"
            className={styles["sidebar-bar-button"]}
            onClick={() =>
              navigate(Path.SearchChat, { state: { fromHome: true } })
            }
            shadow
          />
        </div>
      </SideBarHeader>
      <SideBarBody
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            navigate(Path.Home);
          }
        }}
      >
        <ChatList narrow={shouldNarrow} />
      </SideBarBody>
      <SideBarTail
        primaryAction={
          <>
            <div className={styles["sidebar-action"] + " " + styles.mobile}>
              <IconButton
                icon={<DeleteIcon />}
                title={Locale.Home.DeleteChat}
                tooltipPosition={shouldNarrow ? "right" : "top"}
                onClick={async () => {
                  if (await showConfirm(Locale.Home.DeleteChat)) {
                    chatStore.deleteSession(chatStore.currentSessionIndex);
                  }
                }}
              />
            </div>
            <div className={styles["sidebar-action"]}>
              <Link to={isSettingsRoute ? Path.Home : Path.Settings}>
                <IconButton
                  title={
                    isSettingsRoute
                      ? Locale.NewChat.Return
                      : Locale.Settings.Title
                  }
                  tooltipPosition={shouldNarrow ? "right" : "top"}
                  aria={
                    isSettingsRoute
                      ? Locale.NewChat.Return
                      : Locale.Settings.Title
                  }
                  icon={isSettingsRoute ? <HomeIcon /> : <SettingsIcon />}
                  shadow
                />
              </Link>
            </div>
            <div className={styles["sidebar-action"]}>
              <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                <IconButton
                  title="GitHub"
                  tooltipPosition={shouldNarrow ? "right" : "top"}
                  aria={Locale.Export.MessageFromChatGPT}
                  icon={<GithubIcon />}
                  shadow
                />
              </a>
            </div>
            <div className={styles["sidebar-action"]}>
              <Link
                to={isCustomProviderRoute ? Path.Home : Path.CustomProvider}
              >
                <IconButton
                  title={
                    isCustomProviderRoute
                      ? Locale.NewChat.Return
                      : Locale.CustomProvider.Title
                  }
                  tooltipPosition={shouldNarrow ? "right" : "top"}
                  aria={
                    isCustomProviderRoute
                      ? Locale.NewChat.Return
                      : Locale.CustomProvider.Title
                  }
                  icon={
                    isCustomProviderRoute ? (
                      <HomeIcon />
                    ) : (
                      <CustomProviderIcon />
                    )
                  }
                  shadow
                />
              </Link>
            </div>
          </>
        }
        secondaryAction={
          <IconButton
            icon={<AddIcon />}
            text={shouldNarrow ? undefined : Locale.Home.NewChat}
            title={shouldNarrow ? Locale.Home.NewChat : undefined}
            tooltipPosition={shouldNarrow ? "right" : "top"}
            onClick={() => {
              if (config.dontShowMaskSplashScreen) {
                chatStore.newSession();
                navigate(Path.Chat);
              } else {
                navigate(Path.NewChat);
              }
            }}
            shadow
          />
        }
      />
    </SideBarContainer>
  );
}
