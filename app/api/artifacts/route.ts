import md5 from "spark-md5";
import { NextRequest, NextResponse } from "next/server";
import { getServerSideConfig } from "@/app/config/server";
import { auth } from "@/app/api/auth";
import { ModelProvider } from "@/app/constant";

async function handle(req: NextRequest) {
  const serverConfig = getServerSideConfig();
  if (
    !serverConfig.cloudflareAccountId ||
    !serverConfig.cloudflareKVNamespaceId ||
    !serverConfig.cloudflareKVApiKey
  ) {
    return NextResponse.json(
      { error: true, msg: "Cloudflare KV is not configured" },
      { status: 500 },
    );
  }

  const storeUrl = () =>
    `https://api.cloudflare.com/client/v4/accounts/${serverConfig.cloudflareAccountId}/storage/kv/namespaces/${serverConfig.cloudflareKVNamespaceId}`;
  const storeHeaders = () => ({
    Authorization: `Bearer ${serverConfig.cloudflareKVApiKey}`,
  });
  if (req.method === "POST") {
    // post 请求添加身份验证避免恶意请求
    const authResult = auth(req, ModelProvider.System);
    if (authResult.error) {
      return NextResponse.json(
        { error: true, msg: authResult.msg },
        { status: 401 },
      );
    }
    console.log("[Request Task] artifacts-share");
    let payload: { code: string; ttl?: number };
    try {
      payload = await req.json();
    } catch (e) {
      return NextResponse.json(
        { error: true, msg: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const { code, ttl: clientTTL } = payload;
    if (!code) {
      return NextResponse.json(
        { error: true, msg: "Missing 'code' in request body" },
        { status: 400 },
      );
    }

    // const clonedBody = await req.text();
    const hashedCode = md5.hash(code).trim();
    const body: {
      key: string;
      value: string;
      expiration_ttl?: number;
    } = {
      key: hashedCode,
      value: code,
    };
    try {
      const serverDefaultTTL = parseInt(serverConfig.cloudflareKVTTL || "0");
      // Prioritize client-side TTL if it's a valid number >= 60 seconds
      if (typeof clientTTL === "number" && clientTTL >= 60) {
        // Optional: you can set a maximum TTL to prevent abuse, e.g., 1 year (31536000 seconds)
        const maxTTL = 31536000;
        body["expiration_ttl"] = Math.min(clientTTL, maxTTL);
      } else if (serverDefaultTTL >= 60) {
        // Fallback to server default TTL
        body["expiration_ttl"] = serverDefaultTTL;
      }
    } catch (e) {
      console.error(e);
    }
    const res = await fetch(`${storeUrl()}/bulk`, {
      headers: {
        ...storeHeaders(),
        "Content-Type": "application/json",
      },
      method: "PUT",
      body: JSON.stringify([body]),
    });
    const result = await res.json();
    // console.log("save data", result);
    if (result?.success) {
      return NextResponse.json(
        { code: 0, id: hashedCode, result },
        { status: res.status },
      );
    }
    return NextResponse.json(
      { error: true, msg: "Save data error" },
      { status: 400 },
    );
  }
  if (req.method === "GET") {
    const id = req?.nextUrl?.searchParams?.get("id");
    const res = await fetch(`${storeUrl()}/values/${id}`, {
      headers: storeHeaders(),
      method: "GET",
    });
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  }
  return NextResponse.json(
    { error: true, msg: "Invalid request" },
    { status: 400 },
  );
}

export const POST = handle;
export const GET = handle;

// Route segment config
export const runtime = "edge";
// Required for static export (Tauri build)
export const dynamic = "force-static";
