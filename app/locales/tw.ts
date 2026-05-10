import { FullScreen } from "../components/ui-lib";
import { getClientConfig } from "../config/client";
import { SubmitKey } from "../store/config";

const isApp = !!getClientConfig()?.isApp;

const tw = {
  WIP: "該功能仍在開發中……",
  Error: {
    Unauthorized: isApp
      ? "檢測到無效 API Key，請前往[設定](/#/settings)頁檢查 API Key 是否設定正確。"
      : "存取密碼不正確或未填寫，請前往[登入](/#/auth)頁輸入正確的存取密碼，或者在[設定](/#/settings)頁填入你自己的 OpenAI API Key。",
  },

  Auth: {
    Title: "需要密碼",
    Tips: "管理員開啟了密碼驗證，請在下方填入存取密碼",
    SubTips: "或者輸入你的 OpenAI 或 Google API 金鑰",
    Input: "在此處填寫存取密碼",
    Confirm: "確認",
    Later: "稍候再說",
  },
  ChatItem: {
    ChatItemCount: (count: number) => `${count} 則對話`,
  },
  Chat: {
    SubTitle: (count: number) => `您已經與 ChatGPT 進行了 ${count} 則對話`,
    EditMessage: {
      Title: "編輯訊息記錄",
      Topic: {
        Title: "聊天主題",
        SubTitle: "更改目前聊天主題",
      },
    },
    Actions: {
      ChatList: "檢視訊息列表",
      CompressedHistory: "檢視壓縮後的歷史 Prompt",
      Export: "匯出聊天紀錄",
      Copy: "複製",
      Stop: "停止",
      Retry: "重試",
      RetryDirect: "直接重試",
      RetryWithInstruction: "補充要求後重試",
      RetryInstructionPrefix: "補充要求",
      RetryInstructionEmpty: "請輸入重試要求",
      Pin: "固定",
      PinToastContent: "已將 1 條對話固定至預設提示詞",
      PinToastAction: "檢視",
      Delete: "刪除",
      Edit: "編輯",
      FullScreen: "全屏",
      RefreshTitle: "刷新標題",
      RefreshToast: "已發送刷新標題請求",
      FailTitleToast: "標題生成失敗，檢查壓縮模型設置後點擊🔄手動刷新標題",
      // Python execution
      Run: "執行",
      RunCode: "執行程式碼",
      Rerun: "重新執行",
      Running: "執行中...",
      ExecutionResult: "執行結果",
      ExecutionSuccess: "執行成功",
      ExecutionFailed: "執行失敗",
      CopyOutput: "複製輸出結果",
      ExitCode: "退出碼",
      Stdout: "標準輸出",
      Stderr: "錯誤輸出",
      Stdin: "標準輸入",
      StdinPlaceholder: "程式需要輸入時在此填寫，多行輸入用換行分隔",
      StdinHint: "偵測到程式碼中有 input() 呼叫，請在下方輸入框填寫輸入內容",
      ShowStdin: "顯示輸入框",
      HideStdin: "隱藏輸入框",
      ExecutionTimeout: "執行逾時 (30秒)",
      CodeBlocked: "程式碼包含危險操作，禁止執行",
      BlockedNetwork: "程式碼包含網路請求操作，禁止執行",
      BlockedFilesystem: "程式碼包含檔案系統操作，禁止執行",
      BlockedSystem: "程式碼包含系統呼叫操作，禁止執行",
      NoOutput: "(無輸出)",
      NoOutputHint: "程式碼中未偵測到輸出語句 (如 print)",
      SignalError: (signal: string) =>
        `程序被信號終止: ${signal}（可能是超時或記憶體超限）`,
      Download: "下載",
      Preview: "預覽",
      ShowCode: "程式碼",
    },
    Commands: {
      new: "新建聊天",
      newm: "從角色範本新建聊天",
      next: "下一個聊天",
      prev: "上一個聊天",
      clear: "清除上下文",
      del: "刪除聊天",
      search: "搜尋聊天",
    },
    InputActions: {
      Stop: "停止回應",
      ToBottom: "移至最新",
      Theme: {
        auto: "自動主題",
        light: "亮色模式",
        dark: "深色模式",
      },
      Prompt: "快捷指令",
      Masks: "所有角色範本",
      Clear: "清除聊天",
      Settings: "對話設定",
      UploadImage: "上傳圖片",
    },
    Rename: "重新命名對話",
    Navigator: {
      Title: "對話導航",
      Toggle: "打開對話導航",
      Close: "收起對話導航",
      Empty: "暫無訊息",
      Search: "搜尋訊息...",
      NoResults: "無匹配結果",
      List: "列表",
      Structure: "結構",
      Graph: "樹圖",
      StructureEmpty: "暫無對話結構",
      EmptyMessage: "(空訊息)",
      User: "使用者",
      Assistant: "助手",
    },
    MessageTree: {
      Enable: "開啟樹形會話",
      Disable: "關閉樹形會話",
      EnabledToast: "已開啟樹形會話",
      DisabledToast: "已關閉樹形會話，僅保留啟用分支，其他分支訊息將被移除",
      DisableConfirm:
        "關閉樹形會話後，僅保留目前啟用分支，其他分支訊息將被移除。確認關閉？",
      DeleteNodeConfirm: "刪除該節點後，它的後續子分支也會被移除。確認刪除？",
      PreviousBranch: "上一分支",
      NextBranch: "下一分支",
      DualModelNotSupported: "樹形會話不支援雙模型模式",
    },
    Typing: "正在輸入…",
    Input: (submitKey: string) => {
      var inputHints = `輸入訊息後，按下 ${submitKey} 鍵即可傳送`;
      if (submitKey === String(SubmitKey.Enter)) {
        inputHints += "，Shift + Enter 鍵換行";
      }
      return inputHints;
    },
    Send: "傳送",
    Config: {
      Reset: "重設",
      SaveAs: "另存新檔",
    },
    IsContext: "預設提示詞",
    ShortcutKey: {
      Title: "鍵盤快捷方式",
      newChat: "打開新聊天",
      focusInput: "聚焦輸入框",
      copyLastMessage: "複製最後一個回覆",
      copyLastCode: "複製最後一個代碼塊",
      showShortcutKey: "顯示快捷方式",
      searchChat: "搜尋聊天記錄",
    },
  },
  Export: {
    Title: "將聊天記錄匯出為 Markdown",
    Copy: "複製全部",
    Download: "下載檔案",
    Share: "分享到 ShareGPT",
    MessageFromYou: "來自您的訊息",
    MessageFromChatGPT: "來自 ChatGPT 的訊息",
    Format: {
      Title: "匯出格式",
      SubTitle: "可以匯出 Markdown 文字檔或者 PNG 圖片",
    },
    IncludeContext: {
      Title: "包含角色範本上下文",
      SubTitle: "是否在訊息中顯示角色範本上下文",
    },
    Steps: {
      Select: "選取",
      Preview: "預覽",
    },
    Image: {
      Toast: "正在產生截圖",
      Modal: "長按或按右鍵儲存圖片",
    },
  },
  Select: {
    Search: "查詢訊息",
    All: "選取全部",
    Latest: "最近幾條",
    Clear: "清除選取",
  },
  Memory: {
    Title: "上下文記憶 Prompt",
    EmptyContent: "尚未記憶",
    Copy: "複製全部",
    Send: "傳送記憶",
    Reset: "重設對話",
    ResetConfirm: "重設後將清除目前對話記錄以及歷史記憶，確認重設？",
  },
  Home: {
    NewChat: "開新對話",
    DeleteChat: "確定要刪除選取的對話嗎？",
    DeleteToast: "已刪除對話",
    Revert: "撤銷",
  },
  Settings: {
    Title: "設定",
    SubTitle: "設定選項",

    Danger: {
      Reset: {
        Title: "重置所有設定",
        SubTitle: "重置所有設定項目為預設值（不包含聊天資料）",
        Action: "立即重置",
        Confirm: "確認重置所有設定？",
      },
      ClearChat: {
        Title: "清除聊天資料",
        SubTitle: "清除所有聊天資料（不包含設定）",
        Action: "立即清除",
        Confirm: "確認清除所有聊天資料？",
      },
      ClearALL: {
        Title: "清除所有資料及設定",
        SubTitle: "清除所有聊天、設定資料，恢復至初始狀態",
        Action: "立即清除",
        Confirm: "確認清除所有聊天、設定資料？",
      },
    },
    Lang: {
      Name: "Language", // ATTENTION: if you wanna add a new translation, please do not translate this value, leave it as `Language`
      All: "所有語言",
    },
    Avatar: "大頭貼",
    FontSize: {
      Title: "基準字型大小",
      SubTitle: "整體程式風格的字型基準（1em），參考聊天標題的字型大小",
    },
    MessageMaxWidth: {
      Title: "訊息最大寬度 (%)",
      SubTitle: "聊天訊息內容的最大寬度佔比，行動裝置永遠為 100%",
    },
    InjectSystemPrompts: {
      Title: "匯入系統提示",
      SubTitle: "強制在每個請求的訊息列表開頭新增一個模擬 ChatGPT 的系統提示",
    },
    InputTemplate: {
      Title: "使用者輸入預處理",
      SubTitle: "使用者最新的一條訊息會填充到此範本",
    },

    Update: {
      Version: (x: string) => `目前版本：${x}`,
      IsLatest: "已是最新版本",
      CheckUpdate: "檢查更新",
      IsChecking: "正在檢查更新...",
      FoundUpdate: (x: string) => `發現新版本：${x}`,
      GoToUpdate: "前往更新",
    },
    SendKey: "傳送鍵",
    Theme: "主題",
    TightBorder: "緊湊邊框",
    SendPreviewBubble: {
      Title: "預覽氣泡",
      SubTitle: "在預覽氣泡中預覽 Markdown 內容",
    },
    AutoGenerateTitle: {
      Title: "自動產生標題",
      SubTitle: "根據對話內容產生合適的標題",
    },
    Sync: {
      CloudState: "雲端資料",
      NotSyncYet: "還沒有進行過同步",
      Success: "同步成功",
      Fail: "同步失敗",

      Config: {
        Modal: {
          Title: "設定雲端同步",
          Check: "檢查可用性",
        },
        SyncType: {
          Title: "同步類型",
          SubTitle: "選擇喜愛的同步伺服器",
        },
        Proxy: {
          Title: "啟用代理",
          SubTitle: "在瀏覽器中同步時，必須啟用代理以避免跨域限制",
        },
        ProxyUrl: {
          Title: "代理地址",
          SubTitle: "僅適用於本專案自帶的跨域代理",
        },

        WebDav: {
          Endpoint: "WebDAV 地址",
          UserName: "使用者名稱",
          Password: "密碼",
        },

        UpStash: {
          Endpoint: "UpStash Redis REST Url",
          UserName: "備份名稱",
          Password: "UpStash Redis REST Token",
        },
      },

      LocalState: "本地資料",
      Overview: (overview: any) => {
        return `${overview.chat} 次對話，${overview.message} 條訊息，${overview.prompt} 條提示詞，${overview.mask} 個角色範本`;
      },
      ImportFailed: "匯入失敗",
    },
    Mask: {
      Splash: {
        Title: "角色範本啟動頁面",
        SubTitle: "新增聊天時，呈現角色範本啟動頁面",
      },
      Builtin: {
        Title: "隱藏內建角色範本",
        SubTitle: "在所有角色範本列表中隱藏內建角色範本",
      },
    },
    Prompt: {
      Disable: {
        Title: "停用提示詞自動補齊",
        SubTitle: "在輸入框開頭輸入 / 即可觸發自動補齊",
      },
      List: "自定義提示詞列表",
      ListCount: (builtin: number, custom: number) =>
        `內建 ${builtin} 條，使用者定義 ${custom} 條`,
      Edit: "編輯",
      Modal: {
        Title: "提示詞列表",
        Add: "新增一條",
        Search: "搜尋提示詞",
      },
      EditModal: {
        Title: "編輯提示詞",
      },
    },
    HistoryCount: {
      Title: "附帶歷史訊息數",
      SubTitle: "每次請求附帶的歷史訊息數",
    },
    CompressThreshold: {
      Title: "歷史訊息長度壓縮閾值",
      SubTitle: "當未壓縮的歷史訊息超過該值時，將進行壓縮",
    },

    Usage: {
      Title: "帳戶餘額",
      SubTitle(used: any, total: any) {
        return `本月已使用 $${used}，訂閱總額 $${total}`;
      },
      IsChecking: "正在檢查…",
      Check: "重新檢查",
      NoAccess: "輸入 API Key 檢視餘額",
    },

    Access: {
      AccessCode: {
        Title: "存取密碼",
        SubTitle: "管理員已開啟加密存取",
        Placeholder: "請輸入存取密碼",
      },
      CustomEndpoint: {
        Title: "自定義介面 (Endpoint)",
        SubTitle: "是否使用自定義 Azure 或 OpenAI 服務",
      },
      Provider: {
        Title: "模型服務商",
        SubTitle: "切換不同的服務商",
      },
      OpenAI: {
        ApiKey: {
          Title: "API Key",
          SubTitle: "使用自定義 OpenAI Key 繞過密碼存取限制",
          Placeholder: "OpenAI API Key",
        },

        Endpoint: {
          Title: "介面(Endpoint) 地址",
          SubTitle: "除預設地址外，必須包含 http(s)://",
        },
      },
      Azure: {
        ApiKey: {
          Title: "介面金鑰",
          SubTitle: "使用自定義 Azure Key 繞過密碼存取限制",
          Placeholder: "Azure API Key",
        },

        Endpoint: {
          Title: "介面(Endpoint) 地址",
          SubTitle: "樣例：",
        },

        ApiVerion: {
          Title: "介面版本 (azure api version)",
          SubTitle: "選擇指定的部分版本",
        },
      },
      Anthropic: {
        ApiKey: {
          Title: "API 金鑰",
          SubTitle: "從 Anthropic AI 取得您的 API 金鑰",
          Placeholder: "Anthropic API Key",
        },

        Endpoint: {
          Title: "終端地址",
          SubTitle: "範例：",
        },

        ApiVerion: {
          Title: "API 版本 (claude api version)",
          SubTitle: "選擇一個特定的 API 版本輸入",
        },
      },
      Google: {
        ApiKey: {
          Title: "API 金鑰",
          SubTitle: "從 Google AI 取得您的 API 金鑰",
          Placeholder: "輸入您的 Google AI Studio API 金鑰",
        },

        Endpoint: {
          Title: "終端地址",
          SubTitle: "範例：",
        },

        ApiVersion: {
          Title: "API 版本（僅適用於 gemini-pro）",
          SubTitle: "選擇一個特定的 API 版本",
        },
      },
      CustomModel: {
        Title: "自定義模型名",
        SubTitle: "增加自定義模型可選項，使用英文逗號隔開",
      },
    },

    Model: "模型 (model)",
    CompressModel: {
      Title: "壓縮模型",
      SubTitle: "用於壓縮歷史記錄的模型",
    },
    Temperature: {
      Title: "隨機性 (temperature)",
      SubTitle: "值越大，回應越隨機",
    },
    TopP: {
      Title: "核心採樣 (top_p)",
      SubTitle: "與隨機性類似，但不要和隨機性一起更改",
    },
    MaxTokens: {
      Title: "單次回應限制 (max_tokens)",
      SubTitle: "單次互動所用的最大 Token 數",
    },
    PresencePenalty: {
      Title: "話題新穎度 (presence_penalty)",
      SubTitle: "值越大，越有可能拓展到新話題",
    },
    FrequencyPenalty: {
      Title: "頻率懲罰度 (frequency_penalty)",
      SubTitle: "值越大，越有可能降低重複字詞",
    },
  },
  Store: {
    DefaultTopic: "新的對話",
    BotHello: "請問需要我的協助嗎？",
    Error: "出錯了，請稍後再嘗試",
    Prompt: {
      History: (content: string) =>
        "這是 AI 與使用者的歷史聊天總結，作為前情提要：" + content,
      Topic:
        "Use the language used by the user (e.g. en for english conversation, zh-hant for chinese conversation, etc.) to generate a title (at most 6 words) summarizing our conversation without any lead-in, quotation marks, preamble like 'Title:', direct text copies, single-word replies, quotation marks, translations, or brackets. Remove enclosing quotation marks. The title should make third-party grasp the essence of the conversation in first sight.",
      Summarize:
        "Use the language used by the user (e.g. en-us for english conversation, zh-hant for chinese conversation, etc.) to summarise the conversation in at most 200 words. The summary will be used as prompt for you to continue the conversation in the future.",
    },
  },
  Copy: {
    Success: "已複製到剪貼簿中",
    Failed: "複製失敗，請賦予剪貼簿權限",
  },
  Download: {
    Success: "內容已下載到您的目錄。",
    Failed: "下載失敗。",
  },
  Context: {
    Toast: (x: any) => `已設定 ${x} 條前置上下文`,
    Edit: "前置上下文和歷史記憶",
    Add: "新增一條",
    Clear: "上下文已清除",
    Revert: "恢復上下文",
  },
  Plugin: { Name: "外掛" },
  FineTuned: { Sysmessage: "你是一個助手" },
  Mask: {
    Name: "角色範本",
    Page: {
      Title: "預設角色角色範本",
      SubTitle: (count: number) => `${count} 個預設角色定義`,
      Search: "搜尋角色角色範本",
      Create: "新增",
    },
    Item: {
      Info: (count: number) => `包含 ${count} 條預設對話`,
      Chat: "對話",
      View: "檢視",
      Edit: "編輯",
      Delete: "刪除",
      DeleteConfirm: "確認刪除？",
    },
    EditModal: {
      Title: (readonly: boolean) =>
        `編輯預設角色範本 ${readonly ? "（唯讀）" : ""}`,
      Download: "下載預設",
      Clone: "複製預設",
    },
    Config: {
      Avatar: "角色頭像",
      Name: "角色名稱",
      Sync: {
        Title: "使用全域性設定",
        SubTitle: "目前對話是否使用全域性模型設定",
        Confirm: "目前對話的自定義設定將會被自動覆蓋，確認啟用全域性設定？",
      },
      HideContext: {
        Title: "隱藏預設對話",
        SubTitle: "隱藏後預設對話不會出現在聊天介面",
      },
      Share: {
        Title: "分享此角色範本",
        SubTitle: "產生此角色範本的直達連結",
        Action: "複製連結",
      },
    },
  },
  NewChat: {
    Return: "返回",
    Skip: "跳過",
    NotShow: "不再呈現",
    ConfirmNoShow: "確認停用？停用後可以隨時在設定中重新啟用。",
    Title: "挑選一個角色範本",
    SubTitle: "現在開始，與角色範本背後的靈魂思維碰撞",
    More: "搜尋更多",
    Less: "摺疊程式",
  },
  URLCommand: {
    Code: "檢測到連結中已經包含存取密碼，是否自動填入？",
    Settings: "檢測到連結中包含了預設設定，是否自動填入？",
  },
  UI: {
    Confirm: "確認",
    Cancel: "取消",
    Close: "關閉",
    Create: "新增",
    Edit: "編輯",
    Export: "匯出",
    Import: "匯入",
    Sync: "同步",
    Config: "設定",
    SearchModel: "搜尋模型",
    ExpandGroups: "展開分組",
    CollapseGroups: "摺疊分組",
  },
  Exporter: {
    Description: {
      Title: "只有清除上下文之後的訊息會被顯示",
    },
    Model: "模型",
    Messages: "訊息",
    Topic: "主題",
    Time: "時間",
  },
};

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type LocaleType = typeof tw;
export type PartialLocaleType = DeepPartial<typeof tw>;

export default tw;
// Translated by @chunkiuuu, feel free the submit new pr if there are typo/incorrect translations :D
