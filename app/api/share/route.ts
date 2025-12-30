// app/api/share/route.ts

import md5 from "spark-md5";
import { NextRequest, NextResponse } from "next/server";
import { getServerSideConfig } from "@/app/config/server";
import { auth } from "@/app/api/auth";
import { ModelProvider } from "@/app/constant";
import { ChatSession } from "@/app/store";

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
    // Add authentication to prevent malicious requests
    const authResult = auth(req, ModelProvider.System);
    if (authResult.error) {
      return NextResponse.json(
        { error: true, msg: authResult.msg },
        { status: 401 },
      );
    }
    console.log("[Request Task] export-share");
    let payload: { session: ChatSession; ttl?: number };
    try {
      payload = await req.json();
    } catch (e) {
      return NextResponse.json(
        { error: true, msg: "Invalid JSON body" },
        { status: 400 },
      );
    }
    const { session, ttl: clientTTL } = payload;
    if (!session || !session.messages || !session.topic) {
      return NextResponse.json(
        { error: true, msg: "Missing 'session' data in request body" },
        { status: 400 },
      );
    }

    const sessionString = JSON.stringify(session);
    const hashedSession = md5.hash(sessionString).trim();

    const body: {
      key: string;
      value: string;
      expiration_ttl?: number;
    } = {
      key: hashedSession,
      value: sessionString,
    };

    try {
      const serverDefaultTTL = parseInt(serverConfig.cloudflareKVTTL || "0");

      if (typeof clientTTL === "number" && clientTTL >= 60) {
        // Optional: set a maximum TTL to prevent abuse, e.g., 1 year (31536000 seconds)
        const maxTTL = 31536000;
        body["expiration_ttl"] = Math.min(clientTTL, maxTTL);
      } else if (serverDefaultTTL >= 60) {
        body["expiration_ttl"] = serverDefaultTTL;
      }
    } catch (e) {
      console.error("[Share API] TTL Error:", e);
    }
    const res = await fetch(`${storeUrl()}/values/${hashedSession}`, {
      headers: {
        ...storeHeaders(),
        "Content-Type": "application/json",
      },
      method: "PUT",
      body: body.value, // Cloudflare KV API for single key expects the value directly in the body
    });

    if (res.ok) {
      // If an expiration is set, we need to update the metadata
      if (body.expiration_ttl) {
        await fetch(`${storeUrl()}/keys/${hashedSession}/metadata`, {
          method: "PUT",
          headers: {
            ...storeHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ expiration_ttl: body.expiration_ttl }),
        });
      }
      return NextResponse.json({ code: 0, id: hashedSession }, { status: 200 });
    }

    const result = await res.json();
    console.error("[Share API] Save data error:", result);
    return NextResponse.json(
      { error: true, msg: "Save data error", details: result },
      { status: 400 },
    );
  }

  if (req.method === "GET") {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: true, msg: "Missing 'id' parameter" },
        { status: 400 },
      );
    }
    const res = await fetch(`${storeUrl()}/values/${id}`, {
      headers: storeHeaders(),
      method: "GET",
    });

    if (!res.ok) {
      // If the key is not found, Cloudflare returns a 404
      return new Response("Session not found or expired.", { status: 404 });
    }

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: { "Content-Type": "application/json" },
    });
  }

  return NextResponse.json(
    { error: true, msg: "Invalid request method" },
    { status: 405 },
  );
}

export const POST = handle;
export const GET = handle;

// Route segment config
export const runtime = "edge";
// Required for static export (Tauri build)
export const dynamic = "force-static";
