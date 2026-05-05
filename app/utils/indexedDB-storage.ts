import { StateStorage } from "zustand/middleware";
import { get, set, del, clear, promisifyRequest } from "idb-keyval";
import { safeLocalStorage } from "../utils";
import { StoreKey } from "../constant";

const localStorage = safeLocalStorage();

// 动态加载弹窗，避免与 ui-lib → store → 本文件 之间形成循环依赖。
// 仅在 IDB 真正抛错时才需要，此时延迟一次 import 不影响首屏。
async function askUserOnStorageError(opts: {
  key: string;
  error: unknown;
}): Promise<"retry" | "fallback"> {
  const mod = await import("../components/ui-lib");
  return mod.showStorageErrorDialog(opts);
}

// 多 store 并发失败时聚合日志：1s 内同一错误信息只打一条。
let lastErrorLogAt = 0;
let lastErrorMsg = "";
function logIDBError(name: string, error: unknown) {
  const msg = (error as any)?.message ?? String(error);
  const now = Date.now();
  if (msg === lastErrorMsg && now - lastErrorLogAt < 1000) return;
  lastErrorMsg = msg;
  lastErrorLogAt = now;
  console.warn(`[IDB getItem] read failed: "${name}" — ${msg}`);
}

function createStrictStore(dbName: string, storeName: string) {
  let dbp: IDBDatabase | undefined;
  const getDB = (): Promise<IDBDatabase> => {
    if (dbp) return Promise.resolve(dbp);
    const request = indexedDB.open(dbName);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName);
    };
    const p = promisifyRequest(request) as Promise<IDBDatabase>;
    p.then(
      (db) => {
        dbp = db;
        db.onclose = () => (dbp = undefined);
      },
      () => {},
    );
    return p;
  };
  return <T>(
    txMode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => T | PromiseLike<T>,
  ): Promise<T> =>
    getDB().then((db) => {
      const tx = db.transaction(storeName, txMode, {
        durability: "strict",
      } as IDBTransactionOptions);
      const store = tx.objectStore(storeName);
      return callback(store) as T;
    });
}

const strictStore = createStrictStore("keyval-store", "keyval");

let flushCount = 0;
let lastFlushLogTime = 0;
const isDev = process.env.NODE_ENV === "development";

class IndexedDBStorage implements StateStorage {
  private pending = new Map<string, string | null>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  private scheduleFlush() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, 1000);
  }

  private async flush() {
    const batch = new Map(this.pending);
    if (batch.size === 0) return;
    this.pending.clear();

    flushCount += batch.size;
    const now = Date.now();
    if (now - lastFlushLogTime >= 1000) {
      if (isDev) {
        const keys = Array.from(batch.keys()).join(", ");
        console.log(
          `[IDB flush] ${flushCount} actual writes in last 1s, keys: [${keys}]`,
        );
      }
      flushCount = 0;
      lastFlushLogTime = now;
    }

    for (const [name, value] of batch) {
      if (value === null) {
        await this._removeItem(name);
      } else {
        await this._setItem(name, value);
      }
    }
  }

  private async _setItem(name: string, value: string) {
    try {
      const _value = JSON.parse(value);
      if (!_value?.state?._hasHydrated) {
        console.warn("skip setItem", name);
        return;
      }
      await set(name, value, strictStore);
    } catch (error) {
      localStorage.setItem(name, value);
    }
  }

  private async _removeItem(name: string) {
    try {
      await del(name, strictStore);
    } catch (error) {
      localStorage.removeItem(name);
    }
  }

  private async _clear() {
    try {
      await clear(strictStore);
    } catch (error) {
      localStorage.clear();
    }
  }

  public async getItem(name: string): Promise<string | null> {
    if (this.pending.has(name)) {
      const value = this.pending.get(name)!;
      return value === null ? null : value;
    }
    // 关键：把「IDB 抛错（DB 损坏 / 被驱逐 / 权限拒绝）」与
    // 「IDB 正常但 key 不存在（首次进入或迁移场景）」区分开。
    // 前者必须阻塞，让用户决定，绝不静默回退到 LS 旧快照覆盖真实状态。
    while (true) {
      let idbValue: string | undefined;
      try {
        idbValue = await get<string>(name, strictStore);
      } catch (error) {
        logIDBError(name, error);
        // SSR / 非浏览器环境下没有 document，无法弹窗，直接走 LS 兜底（server 端通常返回 null）。
        if (typeof window === "undefined" || typeof document === "undefined") {
          return localStorage.getItem(name);
        }
        const choice = await askUserOnStorageError({ key: name, error });
        if (choice === "retry") continue; // 重新尝试 indexedDB.open
        // 用户主动选择回滚到 LS 旧快照，已知风险
        return localStorage.getItem(name);
      }
      // IDB 正常但 key 不存在 —— 走 LS 兜底（用于迁移/首次启动）
      if (idbValue === undefined) return localStorage.getItem(name);
      return idbValue;
    }
  }

  public setItem(name: string, value: string): void {
    this.pending.set(name, value);
    this.scheduleFlush();
  }

  public removeItem(name: string): void {
    this.pending.set(name, null);
    this.scheduleFlush();
  }

  public async clear(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending.clear();
    await this._clear();
  }

  public async flushPending(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
}

export const indexedDBStorage = new IndexedDBStorage();

/**
 * 把 IndexedDB 中的 chat 数据快照写入 localStorage，作为应急备份。
 * 当 IDB 在浏览器更新或磁盘吃紧时被驱逐，LS 中的快照可作为最近一次手动备份恢复。
 * - 调用前会先 flush 当前 pending 写入，确保拿到最新状态。
 * - 仅写 StoreKey.Chat（聊天数据）—— 控制 LS 占用，避免触发 5MB 配额。
 * - 超过 4MB 直接跳过：避免悄悄写失败留下半截数据。
 */
export async function dumpChatToLocalStorage(): Promise<{
  ok: boolean;
  bytes: number;
  skipped?: boolean;
  error?: string;
}> {
  await indexedDBStorage.flushPending();
  try {
    const value = await get<string>(StoreKey.Chat, strictStore);
    if (!value) return { ok: false, bytes: 0, error: "IDB 中无聊天数据" };
    if (value.length > 4 * 1024 * 1024) {
      return {
        ok: false,
        bytes: value.length,
        skipped: true,
        error: `${(value.length / 1024 / 1024).toFixed(
          2,
        )} MB 超过 4MB 安全阈值`,
      };
    }
    try {
      localStorage.setItem(StoreKey.Chat, value);
    } catch (writeErr: any) {
      return {
        ok: false,
        bytes: value.length,
        error: writeErr?.message ?? String(writeErr),
      };
    }
    return { ok: true, bytes: value.length };
  } catch (e: any) {
    return { ok: false, bytes: 0, error: e?.message ?? String(e) };
  }
}

/**
 * 启动后自动备份 chat 到 LS：仅在水合成功后调用一次，安静失败不打扰用户。
 */
export async function autoBackupChatToLocalStorage(): Promise<void> {
  try {
    const r = await dumpChatToLocalStorage();
    if (process.env.NODE_ENV === "development") {
      if (r.ok) {
        console.log(
          `[auto backup] chat → LS: ${(r.bytes / 1024).toFixed(1)} KB`,
        );
      } else if (r.skipped) {
        console.warn(`[auto backup] skipped: ${r.error}`);
      } else if (r.error && r.error !== "IDB 中无聊天数据") {
        console.warn(`[auto backup] failed: ${r.error}`);
      }
    }
  } catch {
    // 静默：备份永远不应阻塞主流程
  }
}
