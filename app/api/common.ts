import { NextRequest, NextResponse } from "next/server";
import { getServerSideConfig } from "../config/server";
import { OPENAI_BASE_URL, ServiceProvider, OpenaiPath } from "../constant";
import { isModelAvailableInServer } from "../utils/model";
import { makeAzurePath } from "../azure";
import { useAccessStore } from "../store";

const serverConfig = getServerSideConfig();

export async function requestOpenai(req: NextRequest) {
  const controller = new AbortController();

  var authValue,
    authHeaderName = "";
  if (serverConfig.isAzure) {
    authValue =
      req.headers
        .get("Authorization")
        ?.trim()
        .replaceAll("Bearer ", "")
        .trim() ?? "";

    authHeaderName = "api-key";
  } else {
    authValue = req.headers.get("Authorization") ?? "";
    authHeaderName = "Authorization";
  }
  // console.log("[search] ", req.nextUrl.search);
  let path = `${req.nextUrl.pathname}`.replaceAll("/api/openai/", "");
  let isChatRequest = path.includes(OpenaiPath.ChatPath);

  let baseUrl =
    serverConfig.azureUrl || serverConfig.baseUrl || OPENAI_BASE_URL;

  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  console.log("[Proxy] ", path);
  console.log("[Base Url]", baseUrl);

  const timeoutId = setTimeout(
    () => {
      controller.abort();
    },
    10 * 60 * 1000,
  );

  if (serverConfig.isAzure) {
    if (!serverConfig.azureApiVersion) {
      return NextResponse.json({
        error: true,
        message: `missing AZURE_API_VERSION in server env vars`,
      });
    }
    path = makeAzurePath(path, serverConfig.azureApiVersion);
  }

  // const fetchUrl = `${baseUrl}/${path}`;
  let fetchUrl = `${baseUrl}/${path}`;
  const fetchOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      [authHeaderName]: authValue,
      ...(serverConfig.openaiOrgId && {
        "OpenAI-Organization": serverConfig.openaiOrgId,
      }),
    },
    method: req.method,
    body: req.body,
    // to fix #2485: https://stackoverflow.com/questions/55920957/cloudflare-worker-typeerror-one-time-use-body
    redirect: "manual",
    // @ts-ignore
    duplex: "half",
    signal: controller.signal,
  };

  // #1815 try to refuse gpt4 request
  if (serverConfig.customModels && req.body) {
    try {
      const clonedBody = await req.text();
      fetchOptions.body = clonedBody;

      const jsonBody = JSON.parse(clonedBody) as { model?: string };
      console.log("[Requset Model] ", jsonBody?.model ?? "");
      // not undefined and is false
      const models = [
        serverConfig.customModels,
        serverConfig.compressModel,
        serverConfig.textProcessModel,
        serverConfig.ocrModel,
      ];

      // 使用filter过滤掉不存在的model，再用join组合成字符串
      const combinedModels = models.filter((model) => model).join(",");
      if (
        isChatRequest &&
        !isModelAvailableInServer(
          combinedModels,
          jsonBody?.model as string,
          [ServiceProvider.OpenAI, ServiceProvider.Azure, "custom" as string],
          null,
        )
      ) {
        return NextResponse.json(
          {
            error: true,
            message: `you are not allowed to use ${jsonBody?.model} model`,
          },
          {
            status: 403,
          },
        );
      }
      const token = authValue.trim().replaceAll("Bearer ", "").trim();
      if (token === serverConfig.apiKey) {
        // 如果使用系统内置的key，则增加fast api连接
        const isMatchFastRoute = serverConfig.fastModels
          .split(",")
          .includes(jsonBody?.model ?? "");
        if (isMatchFastRoute) {
          fetchUrl = `${serverConfig.fastBaseUrl}/${path}`;
          (fetchOptions.headers as Record<string, string>)[authHeaderName] =
            serverConfig.fastApiKey;
          // console.log("[Fast API] ", fetchUrl);
          // console.log("[Fast Model Match] ", isMatchFastRoute);
        }
      }
    } catch (e) {
      console.error("[OpenAI] gpt4 filter", e);
    }
  }

  try {
    console.log("[Fetch Url]", fetchUrl);
    const res = await fetch(fetchUrl, fetchOptions);

    // Extract the OpenAI-Organization header from the response
    const openaiOrganizationHeader = res.headers.get("OpenAI-Organization");

    // Check if serverConfig.openaiOrgId is defined and not an empty string
    // if (serverConfig.openaiOrgId && serverConfig.openaiOrgId.trim() !== "") {
    //   // If openaiOrganizationHeader is present, log it; otherwise, log that the header is not present
    //   console.log("[Org ID]", openaiOrganizationHeader);
    // } else {
    //   console.log("[Org ID] is not set up.");
    // }

    // to prevent browser prompt for credentials
    const newHeaders = new Headers(res.headers);
    newHeaders.delete("www-authenticate");
    // to disable nginx buffering
    newHeaders.set("X-Accel-Buffering", "no");

    // Conditionally delete the OpenAI-Organization header from the response if [Org ID] is undefined or empty (not setup in ENV)
    // Also, this is to prevent the header from being sent to the client
    if (!serverConfig.openaiOrgId || serverConfig.openaiOrgId.trim() === "") {
      newHeaders.delete("OpenAI-Organization");
    }

    // The latest version of the OpenAI API forced the content-encoding to be "br" in json response
    // So if the streaming is disabled, we need to remove the content-encoding header
    // Because Vercel uses gzip to compress the response, if we don't remove the content-encoding header
    // The browser will try to decode the response with brotli and fail
    newHeaders.delete("content-encoding");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
