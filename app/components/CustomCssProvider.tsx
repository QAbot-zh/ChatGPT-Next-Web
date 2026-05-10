// app/components/CustomCssProvider.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCustomCssStore } from "../store/customCss";
import { useAppConfig } from "../store";

export function CustomCssProvider() {
  const customCss = useCustomCssStore();
  const config = useAppConfig();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // --message-max-width 通过 documentElement inline style 注入，
  // 以保证优先级高于 globals.scss / chat.module.scss 中的 :root 规则；
  // 同时监听移动端 media query：移动端清除 inline 值，回退到样式表中的 100%。
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 600px)");
    const apply = () => {
      const root = document.documentElement;
      const value = Number.isFinite(config.messageMaxWidth)
        ? config.messageMaxWidth
        : 80;
      if (mq.matches) {
        root.style.removeProperty("--message-max-width");
      } else {
        root.style.setProperty("--message-max-width", `${value}%`);
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [config.messageMaxWidth]);

  // 基准字体样式，独立于自定义 CSS
  const baseFontCss = useMemo(
    () => `:root { font-size: ${config.fontSize}px; }`,
    [config.fontSize],
  );

  if (!mounted) {
    return null;
  }

  return (
    // <style id="custom-css" dangerouslySetInnerHTML={{ __html: initialCss }} />
    <>
      {/* 基准字体大小：始终生效，与 custom-css 启用状态无关 */}
      <style
        id="app-font-size"
        dangerouslySetInnerHTML={{ __html: baseFontCss }}
      />

      {/* 用户自定义样式：仅在开启且有内容时渲染 */}
      {customCss.enabled && customCss.content?.trim() ? (
        <style
          id="custom-css"
          data-theme={String(config.theme)}
          // 这里仅注入用户写的 CSS，不再附带 font-size 注入
          dangerouslySetInnerHTML={{ __html: customCss.content }}
        />
      ) : null}
    </>
  );
}
