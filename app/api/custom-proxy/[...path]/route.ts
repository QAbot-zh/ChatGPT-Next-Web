import { NextRequest, NextResponse } from "next/server";

/**
 * 通用代理端点，用于规避 CORS 限制
 * 客户端通过 X-Proxy-Target 头传入目标 baseUrl
 */
async function handle(req: NextRequest) {
  // 检查是否禁用代理功能
  const disableCustomProxy =
    process.env.DISABLE_CUSTOM_PROXY === "1" ||
    process.env.DISABLE_CUSTOM_PROXY === "true";
  if (disableCustomProxy) {
    return NextResponse.json(
      { error: true, message: "Custom proxy is disabled by server" },
      { status: 403 },
    );
  }

  // 处理 OPTIONS 预检请求
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  // 从请求头获取目标地址
  const targetUrl = req.headers.get("X-Proxy-Target");
  if (!targetUrl) {
    return NextResponse.json(
      { error: true, message: "Missing X-Proxy-Target header" },
      { status: 400 },
    );
  }

  // 获取请求路径（去掉 /api/custom-proxy 前缀）
  const pathParts = req.nextUrl.pathname.split("/");
  const subpath = pathParts.slice(3).join("/"); // 跳过 ['', 'api', 'custom-proxy']

  // 构建目标 URL
  let baseUrl = targetUrl;
  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }
  const fetchUrl = subpath ? `${baseUrl}/${subpath}` : baseUrl;

  // 复制请求头，移除不需要转发的头
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    // 跳过 hop-by-hop 头和代理相关头
    if (
      ![
        "host",
        "connection",
        "keep-alive",
        "transfer-encoding",
        "te",
        "trailer",
        "upgrade",
        "x-proxy-target",
        "accept-encoding", // 移除压缩请求，避免返回压缩内容导致乱码
      ].includes(lowerKey)
    ) {
      headers.set(key, value);
    }
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10分钟超时

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      signal: controller.signal,
      redirect: "manual",
      // @ts-ignore
      duplex: "half",
    };

    // 只有非 GET/HEAD 请求才添加 body
    if (req.method !== "GET" && req.method !== "HEAD") {
      fetchOptions.body = req.body;
    }

    const res = await fetch(fetchUrl, fetchOptions);

    // 构建响应头
    const responseHeaders = new Headers(res.headers);
    // 移除可能导致问题的头
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");
    // 添加 CORS 头
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("X-Accel-Buffering", "no");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (e: any) {
    console.error("[Proxy] Error:", e);
    return NextResponse.json(
      {
        error: true,
        message: e.message || "Proxy request failed",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const OPTIONS = handle;

// Route segment config
export const runtime = "edge";
// Required for static export (Tauri build)
export const dynamic = "force-static";
