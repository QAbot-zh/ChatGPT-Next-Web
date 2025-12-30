import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth";
import { ModelProvider } from "@/app/constant";

const PISTON_API_URL =
  process.env.PISTON_API_URL || "https://emkc.org/api/v2/piston/execute";
const EXECUTION_TIMEOUT = Number(process.env.PISTON_TIMEOUT) || 10000; // 10 seconds

// Dangerous patterns that should block execution
const DANGEROUS_PATTERNS = [
  // Network operations
  /\bimport\s+(?:urllib|requests|httpx|aiohttp|socket|http\.client|ftplib|smtplib|poplib|imaplib|nntplib|telnetlib)/,
  /\bfrom\s+(?:urllib|requests|httpx|aiohttp|socket|http|ftplib|smtplib|poplib|imaplib|nntplib|telnetlib)\b/,
  /\bsocket\s*\.\s*(?:socket|create_connection|getaddrinfo)/,
  /\burllib\s*\.\s*request/,

  // File system operations
  /\bopen\s*\(\s*['"]/, // open() with string path
  /\bopen\s*\(\s*[a-zA-Z_]/, // open() with variable
  /\bos\s*\.\s*(?:remove|unlink|rmdir|makedirs|mkdir|rename|replace|chmod|chown|link|symlink|truncate)/,
  /\bshutil\s*\.\s*(?:rmtree|copy|copy2|copytree|move)/,
  /\bpathlib\s*\..*\.\s*(?:read_|write_|unlink|rmdir|mkdir|rename|replace|chmod|touch)/,

  // System operations
  /\bos\s*\.\s*(?:system|popen|spawn|exec|fork|kill|killpg)/,
  /\bsubprocess\s*\.\s*(?:run|call|Popen|check_output|check_call|getoutput|getstatusoutput)/,
  /\beval\s*\(\s*(?:input|raw_input)/,
  /\bexec\s*\(\s*(?:input|raw_input)/,
  /\b__import__\s*\(/,

  // Dangerous modules import
  /\bimport\s+(?:subprocess|multiprocessing|threading|ctypes|_thread)/,
  /\bfrom\s+(?:subprocess|multiprocessing|threading|ctypes|_thread)\s+import/,
];

interface PistonRequest {
  code: string;
  stdin?: string;
  language?: string;
  version?: string;
}

interface PistonResponse {
  success: boolean;
  stdout?: string;
  stderr?: string;
  code?: number;
  signal?: string;
  output?: string;
  error?: string;
  blocked?: boolean;
  blockedReason?: string;
}

function checkDangerousCode(code: string): {
  blocked: boolean;
  reason?: string;
} {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      // Determine the type of dangerous operation
      if (
        pattern.source.includes("urllib|requests|httpx|aiohttp|socket|http")
      ) {
        return { blocked: true, reason: "network" };
      }
      if (
        pattern.source.includes("open") ||
        pattern.source.includes("os\\.") ||
        pattern.source.includes("shutil") ||
        pattern.source.includes("pathlib")
      ) {
        return { blocked: true, reason: "filesystem" };
      }
      if (
        pattern.source.includes("subprocess") ||
        pattern.source.includes("system") ||
        pattern.source.includes("exec") ||
        pattern.source.includes("eval")
      ) {
        return { blocked: true, reason: "system" };
      }
      return { blocked: true, reason: "dangerous" };
    }
  }
  return { blocked: false };
}

async function handle(req: NextRequest): Promise<NextResponse<PistonResponse>> {
  if (req.method === "OPTIONS") {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  if (req.method !== "POST") {
    return NextResponse.json(
      { success: false, error: "Method not allowed" },
      { status: 405 },
    );
  }

  console.log("[Piston] New code execution request received");
  // Auth check
  const authResult = auth(req, ModelProvider.System);
  if (authResult.error) {
    return NextResponse.json(
      { success: false, error: authResult.msg },
      { status: 401 },
    );
  }

  try {
    const body = (await req.json()) as PistonRequest;
    const { code, stdin = "", language = "python", version = "*" } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: "Code is required" },
        { status: 400 },
      );
    }

    // Check code length limit (100KB)
    if (code.length > 100 * 1024) {
      return NextResponse.json(
        { success: false, error: "Code too long (max 100KB)" },
        { status: 400 },
      );
    }

    // Check for dangerous patterns
    const dangerCheck = checkDangerousCode(code);
    if (dangerCheck.blocked) {
      return NextResponse.json(
        {
          success: false,
          blocked: true,
          blockedReason: dangerCheck.reason,
          error: `Code contains potentially dangerous operations (${dangerCheck.reason}). Execution is not allowed.`,
        },
        { status: 200 }, // Return 200 so frontend can handle this gracefully
      );
    }

    // Prepare request to Piston API
    const pistonPayload = {
      language,
      version,
      files: [
        {
          name: "main.py",
          content: code,
        },
      ],
      stdin,
    };

    // Execute with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT);

    try {
      const response = await fetch(PISTON_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pistonPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json(
          {
            success: false,
            error: `Piston API error: ${response.status} ${errorText}`,
          },
          { status: 200 },
        );
      }

      const result = await response.json();
      // Piston returns { language, version, run: { stdout, stderr, code, signal, output } }
      const runResult = result.run || {};

      return NextResponse.json({
        success: true,
        stdout: runResult.stdout || "",
        stderr: runResult.stderr || "",
        code: runResult.code ?? 0,
        signal: runResult.signal || "",
        output: runResult.output || "",
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "Execution timeout (30 seconds)",
          },
          { status: 200 },
        );
      }

      throw fetchError;
    }
  } catch (error: any) {
    console.error("[Piston API Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}

export const POST = handle;
export const OPTIONS = handle;

// Route segment config
export const runtime = "edge";
// Required for static export (Tauri build)
export const dynamic = "force-static";
