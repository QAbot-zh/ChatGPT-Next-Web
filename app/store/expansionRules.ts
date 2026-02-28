import { nanoid } from "nanoid";
import { StoreKey } from "../constant";
import { createPersistStore } from "../utils/store";
import { getLang } from "../locales";

export interface TextExpansionRule {
  id: string;
  trigger: string;
  replacement: string;
  description: string;
  enable: boolean;
  isUser?: boolean;
  createdAt?: number;
}

export const useExpansionRulesStore = createPersistStore(
  {
    rules: {} as Record<string, TextExpansionRule>,
    builtinRules: [] as TextExpansionRule[],
  },
  (set, get) => ({
    // 添加规则
    addRule(rule: Omit<TextExpansionRule, "id" | "isUser" | "createdAt">) {
      const rules = get().rules;
      const id = nanoid();
      const newRule: TextExpansionRule = {
        ...rule,
        id,
        isUser: true,
        createdAt: Date.now(),
      };

      rules[id] = newRule;
      set(() => ({ rules }));
      return id;
    },

    // 获取规则
    getRule(id: string) {
      const targetRule = get().rules[id];
      if (!targetRule) {
        return get().builtinRules.find((r) => r.id === id);
      }
      return targetRule;
    },

    // 删除规则
    removeRule(id: string) {
      const rules = get().rules;
      delete rules[id];
      set(() => ({ rules }));
    },

    // 更新规则
    updateRule(id: string, updater: (rule: TextExpansionRule) => void) {
      const rule = get().rules[id];
      if (rule) {
        updater(rule);
        const rules = get().rules;
        rules[id] = rule;
        set(() => ({ rules }));
      }
    },

    // 获取所有用户规则
    getUserRules() {
      const userRules = Object.values(get().rules || {});
      userRules.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return userRules;
    },

    // 获取所有启用的规则（包括内置和用户规则）
    getEnabledRules() {
      const userRules = this.getUserRules().filter((r) => r.enable);
      const builtinRules = get().builtinRules.filter((r) => r.enable);
      return [...userRules, ...builtinRules];
    },

    // 获取启用规则，并将内置规则的触发前缀替换为指定字符
    getEnabledRulesWithPrefix(prefix: string) {
      const userRules = this.getUserRules().filter((r) => r.enable);
      const builtinRules = get()
        .builtinRules.filter((r) => r.enable)
        .map((r) => ({
          ...r,
          trigger:
            r.trigger.startsWith(":") && prefix !== ":"
              ? prefix + r.trigger.slice(1)
              : r.trigger,
        }));
      return [...userRules, ...builtinRules];
    },

    // 设置内置规则
    setBuiltinRules(rules: TextExpansionRule[]) {
      set(() => ({ builtinRules: rules }));
    },
  }),
  {
    name: StoreKey.ExpansionRules,
    version: 1,

    onRehydrateStorage() {
      // 跳过服务器端加载
      if (typeof window === "undefined") {
        return;
      }

      const RULES_URL = "./expansion-rules.json";

      // 加载内置规则
      fetch(RULES_URL)
        .then((res) => res.json())
        .then((rules) => {
          const builtinRules = rules.map(
            (rule: Omit<TextExpansionRule, "id">) => ({
              ...rule,
              id: nanoid(),
            }),
          );
          useExpansionRulesStore.getState().setBuiltinRules(builtinRules);
        })
        .catch((err) => console.error("Failed to load expansion rules:", err));
    },
  },
);
