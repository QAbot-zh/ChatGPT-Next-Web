import type { Tiktoken } from "js-tiktoken";

let enc: Tiktoken | null = null;
let loadingPromise: Promise<Tiktoken> | null = null;

async function getEncoder(): Promise<Tiktoken> {
  if (enc) return enc;

  if (!loadingPromise) {
    loadingPromise = import("js-tiktoken").then((module) => {
      enc = module.encodingForModel("gpt-3.5-turbo");
      return enc;
    });
  }

  return loadingPromise;
}

// 空闲时预加载
if (typeof window !== "undefined") {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => getEncoder());
  } else {
    setTimeout(() => getEncoder(), 1000);
  }
}

/**
 * 精确计算 token 数量（异步）
 * 使用 tiktoken 进行精确计算
 */
export async function estimateTokenLengthInLLMAsync(
  input: string,
): Promise<number> {
  const encoder = await getEncoder();
  return encoder.encode(input).length;
}

/**
 * 快速估算 token 数量（同步）
 * 如果 tiktoken 已加载则使用精确计算，否则使用字符估算
 */
export function estimateTokenLengthInLLM(input: string): number {
  // 如果已经加载了 encoder，使用精确计算
  if (enc) {
    return enc.encode(input).length;
  }
  // 否则使用简单估算
  return estimateTokenLength(input);
}

export function estimateTokenLength(input: string): number {
  let tokenLength = 0;

  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i);

    if (charCode < 128) {
      // ASCII character
      if (charCode <= 122 && charCode >= 65) {
        // a-Z
        tokenLength += 0.25;
      } else {
        tokenLength += 0.5;
      }
    } else {
      // Unicode character
      tokenLength += 1.5;
    }
  }

  return Math.ceil(tokenLength);
}
