import { getClientConfig } from "../config/client";
import { SubmitKey } from "../store/config";

const isApp = !!getClientConfig()?.isApp;

const cn = {
  WIP: "该功能仍在开发中……",
  Error: {
    Unauthorized: isApp
      ? "检测到无效 API Key，请前往[设置](/#/settings)页检查 API Key 是否配置正确"
      : "访问密码不正确或为空，请前往[登录](/#/auth)页输入正确的访问密码，或者在[设置](/#/settings)页填入你自己的 OpenAI API Key",
  },
  Auth: {
    Title: "需要密码",
    Tips: "管理员开启了密码验证，请在下方填入访问码",
    SubTips: "或者输入你的 OpenAI 或 Google API 密钥",
    Input: "在此处填写访问码",
    Confirm: "确认",
    Later: "稍后再说",
  },
  ChatItem: {
    ChatItemCount: (count: number) => `${count} 条对话`,
  },
  Chat: {
    SubTitle: (count: number) => `共 ${count} 条对话`,
    EditMessage: {
      Title: "编辑消息记录",
      Topic: {
        Title: "聊天主题",
        SubTitle: "更改当前聊天主题",
      },
    },
    Actions: {
      ChatList: "查看消息列表",
      CompressedHistory: "查看压缩后的历史 Prompt",
      Export: "导出聊天记录",
      Copy: "复制",
      Stop: "停止",
      Retry: "重试",
      Pin: "固定",
      PinToastContent: "已将 1 条对话固定至预设提示词",
      PinToastAction: "查看",
      Delete: "删除",
      Edit: "编辑",
      EditToInput: "编辑为输入",
      EditNoMessage: "没有消息可以编辑",
      FullScreen: "全屏",
      RefreshTitle: "刷新标题",
      RefreshToast: "已发送刷新标题请求",
      FailTitleToast: "标题生成失败，检查压缩模型设置后点击🔄手动刷新标题",
      Speech: "朗读",
      StopSpeech: "停止",
    },
    Commands: {
      new: "新建聊天",
      newm: "从面具新建聊天",
      next: "下一个聊天",
      prev: "上一个聊天",
      clear: "清除上下文",
      fork: "复制聊天",
      del: "删除聊天",
      search: "搜索聊天",
      edit: "编辑最后一条用户聊天",
      resend: "重新获取 AI 回复",
      private: "切换无痕状态（新建/退出）",
      pin: "置顶当前对话",
    },
    InputActions: {
      Collapse: "折叠功能区",
      Expand: "展开功能区",
      Stop: "停止响应",
      ToBottom: "滚到最新",
      Theme: {
        auto: "自动主题",
        light: "亮色模式",
        dark: "深色模式",
      },
      PrivateMode: {
        On: "开启无痕模式",
        OnToast: "已开启无痕模式，已创建新的无痕会话",
        Off: "关闭无痕模式",
        Info: "当前处于无痕模式\n对话阅后即焚",
        Return: "↩ 点击返回聊天页面",
      },
      ModelAtSelector: {
        SelectModel: "选择模型",
        AvailableModels: (count: number | undefined) =>
          `${count ?? 0} 个可用模型`,
        NoAvailableModels: "没有找到匹配的模型",
      },
      MoveCursorToStart: "Ctrl+Shift+Left 跳转至段首",
      MoveCursorToEnd: "Ctrl+Shift+Right 跳转至段尾",
      Prompt: "快捷指令",
      Masks: "所有面具",
      Clear: "清除聊天",
      Settings: "对话设置",
      UploadImage: "上传图片",
      UnsupportedModelForUploadImage: "当前模型不支持上传图片",
      RenameFile: "重命名文件",
      CloudBackup: "云备份",
      Continue: {
        Title: "继续补全",
        isContinueToast: "正在补全中...",
        ContinuePrompt:
          "请继续补充完整上文未完成的内容，保持思路和风格的连贯性，直接接续输出。不要重复已有内容，不要添加总结或开场白。根据内容类型（写作、解题、代码等）自动判断合理的结束点。",
      },
      Translate: {
        Title: "中英互译",
        BlankToast: "输入内容为空，不执行本次翻译",
        isTranslatingToast: "正在翻译中...",
        FailTranslateToast: "本次翻译失败，无权限或请检查模型设置后再次尝试",
        SuccessTranslateToast: "本次翻译已结束并替换输入文本",
        Undo: "撤销翻译",
        UndoToast: "已撤销翻译",
        SystemPrompt:
          "请担任中英文翻译官，你需要根据输入文本的语言自动识别语种并将其翻译成另一种语言（中文翻译成英文，英文翻译成中文）。\
请翻译得准确、自然、流畅和地道，使用优美和高雅的表达方式。\
文本可能由于复制问题导致冗余的段内换行和数字页码问题，请根据上下文智能去除。\
无论对方回复什么，你只需将内容翻译为相对的另一种语言（中文或英文）。您应该只回复您翻译后的内容，而不应回复其他任何内容。不要写解释。",
        UserPrompt: "请翻译一下内容（注意翻译语言）: \n",
      },
      OCR: {
        Title: "图片文字识别",
        Screenshot: "截图 OCR",
        ImportImage: "图片文件 OCR",
        BlankToast: "未检测到图片输入，不执行本次图文识别。",
        isDetectingToast: "正在 OCR 中...",
        FailDetectToast: "本次识别失败，无权限或请检查模型设置后再次尝试",
        SuccessDetectToast: "本次识别已结束并替换输入图片",
        DetectSystemPrompt:
          "你是一个专业的OCR文字识别工具。请严格按照以下规则:\n\
1. 只输出图片中实际存在的文字内容,不要添加任何解释、评论或额外内容\n\
2. 保持原文的格式、换行、缩进、标点符号等完全一致\n\
3. 对于难以识别的文字,使用[...]标注,不要猜测或补充\n\
4. 如果是表格,尽可能保持原有的表格结构\n\
5. 如果是代码,保持原有的代码格式\n\
6. 如果包含数学公式,使用LaTeX格式并用$$包裹\n\
7. 如果内容包含多种语言,请准确识别并保持原有语言\n\
8. 如果有标点符号,保持原有的标点使用\n\
9. 如果有特殊符号或公式,确保准确转换为对应的格式\n\
10. 不要对文字内容进行任何修改、润色或重新组织",
        DetectPrompt:
          "请帮我识别这张图片中的文字内容,按照上述规则输出结果，确保输出结果的准确性且没有多余内容。",
      },
      ImprovePrompt: {
        Title: "优化输入提示",
        BlankToast: "输入内容为空，不执行本次优化",
        isImprovingToast: "正在优化中...",
        FailImprovingToast: "本次优化失败，无权限或请检查模型设置后再次尝试",
        SuccessImprovingToast: "本次输入优化已结束并替换输入内容",
        Undo: "撤销优化处理",
        UndoToast: "已撤销优化处理",
        SystemPrompt:
          "You are an AI prompt optimization specialist operating in an AI Model playground context. Your role is to analyze and improve user prompts while adhering to the following guidelines:\
\
    Evaluate the given prompt based on:\
    - Clarity and specificity of instructions\
    - Alignment with intended goals\
    - Potential for consistent model responses\
    - Technical feasibility within model constraints\
    - Absence of ambiguous or conflicting directions\
\
    Provide improvements that:\
    - Enhance precision and clarity\
    - Maintain compatibility with AI Model playground parameters\
    - Optimize for both effectiveness and efficiency\
    - Remove redundancies and ambiguities\
    - Include necessary context and constraints\
\
    Focus solely on prompt improvement without engaging in task execution or additional commentary. Ensure all improvements maintain technical feasibility within standard AI Model playground limitations. Do not add surrounding quotes to the suggested prompt. Do not change the language of user prompts.\
\
    Please respond with the improved user prompt only, formatted clearly and ready for implementation.",
        UserPrompt:
          "Improve this user prompt without changing its original language: \n",
      },
      Privacy: {
        Title: "隐私打码",
        BlankToast: "输入内容为空，不执行本次打码",
        isPrivacyToast: "正在打码中...",
        FailPrivacyToast: "本次打码失败，无权限或请检查模型设置后再次尝试",
        SuccessPrivacyToast: "本次打码已结束并替换输入内容",
        Undo: "撤销隐私处理",
        UndoToast: "已撤销隐私处理",
      },
      UploadFile: {
        Title: (canUploadImage: boolean = false) =>
          canUploadImage ? "上传图片或文本文件" : "上传文本文件",
        FileTooLarge: "暂不支持上传超过1M的文件",
        TooManyFile: "超出可上传文件数量",
        UnsupportedFileType: "不支持的文件类型",
        UnsupportToUploadImage: "当前模型未配置视觉功能，不支持上传图片",
        FailToRead: "文件内容读取失败",
        TooManyTokenToPasteAsFile: "粘贴文本数量过大，自动粘贴为附件文本",
        DuplicateFile: (filename: string) =>
          `文件 "${filename}" 已存在，请勿重复上传`,
      },
    },
    Rename: "重命名对话",
    Typing: "正在输入…",
    Input: (submitKey: string, isMobileScreen: boolean = false) => {
      if (isMobileScreen) {
        return "/ 触发预设，: 触发命令\n输入你的问题...";
      }
      var inputHints = `${submitKey} 发送`;
      if (submitKey === String(SubmitKey.Enter)) {
        inputHints += "，Shift + Enter 换行";
      }
      return (
        inputHints +
        "\n@ 选择模型，/ 触发预设，: 触发命令\nCtrl + Shift + ;  快速复制最后一个代码块\nCtrl + Shift + L 重新获取 AI 回复"
      );
    },
    Send: "发送",
    StartSpeak: "说话",
    StopSpeak: "停止",
    Config: {
      Reset: "清除记忆",
      SaveAs: "存为面具",
    },
    IsContext: "预设提示词",
    ShortcutKey: {
      Title: "键盘快捷方式",
      newChat: "打开新聊天",
      focusInput: "聚焦输入框",
      copyLastMessage: "复制最后一个回复",
      copyLastCode: "复制最后一个代码块",
      resendLastMessage: "重试最后一个提问",
      showShortcutKey: "显示快捷方式",
      moveCursorToStart: "跳转至段首",
      moveCursorToEnd: "跳转至段尾",
      searchChat: "搜索聊天记录",
    },
  },
  Export: {
    Title: "分享聊天记录",
    Copy: "全部复制",
    Download: "下载文件",
    Share: "分享到 ShareGPT",
    MessageFromYou: "用户",
    MessageFromChatGPT: "ChatGPT",
    Format: {
      Title: "导出格式",
      SubTitle: "可以导出 Markdown 文本或者 PNG 图片",
    },
    IncludeContext: {
      Title: "包含面具上下文",
      SubTitle: "是否在消息中展示面具上下文",
    },
    UseDisplayName: {
      Title: "是否使用别名",
      SubTitle:
        "是否在消息中使用别名(DisplayName)，如模型未定义别名则使用原来的名称",
    },
    ShareSessionTitle: {
      Title: "对话主题",
      SubTitle: "支持设置对话主题覆盖原有标题",
    },
    Steps: {
      Select: "选取",
      Preview: "预览",
    },
    Image: {
      Toast: "正在生成截图",
      Modal: "长按或右键保存图片",
    },
    Artifacts: {
      Title: "分享页面",
      Error: "分享失败",
    },
  },
  Select: {
    Search: "搜索消息",
    All: "选取全部",
    Latest: "最近几条",
    Clear: "清除全部",
    HideUserContinueMsg: "过滤“继续补全”消息",
  },
  Memory: {
    Title: "历史摘要",
    EmptyContent: "对话内容过短，无需总结",
    Send: "自动压缩聊天记录并作为上下文发送",
    Copy: "复制摘要",
    Reset: "[unused]",
    ResetConfirm: "确认清空历史摘要？",
  },
  Home: {
    // PlusChat: "Plus",
    FakeChat: "镜像站",
    NewChat: "新聊天",
    DeleteChat: "确认删除选中的对话？",
    DeleteToast: "已删除会话",
    Revert: "撤销",
  },
  Settings: {
    Title: "设置",
    SubTitle: "所有设置选项",
    ShowPassword: "显示密码",

    Danger: {
      Reset: {
        Title: "重置所有设置",
        SubTitle: "重置所有设置项回默认值（不包含聊天数据）",
        Action: "立即重置",
        Confirm: "确认重置所有设置？",
      },
      ClearChat: {
        Title: "清除聊天数据",
        SubTitle: "清除所有聊天数据（不包含设置）",
        Action: "立即清除",
        Confirm: "确认清除所有聊天数据？",
      },
      ClearALL: {
        Title: "清除所有数据及设置",
        SubTitle: "清除所有聊天、设置数据，恢复到初始状态",
        Action: "立即清除",
        Confirm: "确认清除所有聊天、设置数据？",
      },
    },
    Lang: {
      Name: "Language", // ATTENTION: if you wanna add a new translation, please do not translate this value, leave it as `Language`
      All: "所有语言",
    },
    Avatar: "头像",
    FontSize: {
      Title: "字体大小",
      SubTitle: "聊天内容的字体大小",
    },
    InjectSystemPrompts: {
      Title: "注入系统级提示信息",
      SubTitle:
        "强制给每次请求的消息列表开头添加一个优化输出内容格式的系统提示",
    },
    InputTemplate: {
      Title: "用户输入预处理",
      SubTitle: "用户最新的一条消息会填充到此模板",
    },

    Update: {
      Version: (x: string) => `当前版本：${x}`,
      IsLatest: "已是最新版本",
      CheckUpdate: "检查更新",
      IsChecking: "正在检查更新...",
      FoundUpdate: (x: string) => `发现新版本：${x}`,
      GoToUpdate: "前往更新",
    },
    Personalization: {
      Title: "个性化设置",
      SubTitle: "点击展开个性化设置",
      CloseSubTile: "收起个性化设置",
    },
    SendKey: "发送键",
    Theme: "主题",
    TightBorder: "无边框模式",
    SendPreviewBubble: {
      Title: "预览气泡",
      SubTitle: "在预览气泡中预览 Markdown 内容",
    },
    AutoGenerateTitle: {
      Title: "自动生成标题",
      SubTitle: "根据对话内容生成合适的标题",
    },
    Sync: {
      CloudState: "云端数据",
      NotSyncYet: "还没有进行过同步",
      Success: "同步成功",
      Fail: "同步失败",

      Config: {
        Modal: {
          Title: "配置云同步",
          Check: "检查可用性",
        },
        SyncType: {
          Title: "同步类型",
          SubTitle: "选择喜爱的同步服务器",
        },
        Proxy: {
          Title: "启用代理",
          SubTitle: "在浏览器中同步时，必须启用代理以避免跨域限制",
        },
        ProxyUrl: {
          Title: "代理地址",
          SubTitle: "仅适用于本项目自带的跨域代理",
        },

        WebDav: {
          Endpoint: "WebDAV 地址",
          UserName: "用户名",
          Password: "密码",
        },

        UpStash: {
          Endpoint: "UpStash Redis REST Url",
          UserName: "备份名称",
          Password: "UpStash Redis REST Token",
        },
      },

      LocalState: "本地数据",
      Overview: (overview: any) => {
        return `${overview.chat} 次对话，${overview.message} 条消息，${overview.prompt} 条提示词，${overview.mask} 个面具`;
      },
      ImportFailed: "导入失败",
    },
    Mask: {
      Splash: {
        Title: "面具启动页",
        SubTitle: "新建聊天时，展示面具启动页",
      },
      Builtin: {
        Title: "隐藏内置面具",
        SubTitle: "在所有面具列表中隐藏内置面具",
      },
    },
    Prompt: {
      Disable: {
        Title: "禁用提示词自动补全",
        SubTitle: "在输入框开头输入 / 即可触发自动补全",
      },
      List: "自定义提示词列表",
      ListCount: (builtin: number, custom: number) =>
        `内置 ${builtin} 条，用户定义 ${custom} 条`,
      Edit: "编辑",
      Modal: {
        Title: "提示词列表",
        Add: "新建",
        Search: "搜索提示词",
      },
      EditModal: {
        Title: "编辑提示词",
      },
      CustomUserContinuePrompt: {
        Title: "自定义 “继续补全” 提示词",
        SubTitle: "自定义补全会话的提示词，用于引导模型补全会话",
        Enable: "显示“继续补全”对话框",
        Edit: "编辑",
        Modal: {
          Title: "“继续补全”提示词",
        },
      },
    },
    HistoryCount: {
      Title: "附带历史消息数",
      SubTitle: "每次请求携带的历史消息数",
    },
    CompressThreshold: {
      Title: "历史消息长度压缩阈值",
      SubTitle: "当未压缩的历史消息超过该值时，将进行压缩",
    },

    Usage: {
      Title: "余额查询",
      SubTitle(used: any, total: any) {
        return `本月已使用 $${used}，订阅总额 $${total}`;
      },
      IsChecking: "正在检查…",
      Check: "重新检查",
      NoAccess: "输入 API Key 或访问密码查看余额",
    },

    Access: {
      AccessCode: {
        Title: "访问密码",
        SubTitle: "管理员已开启加密访问",
        Placeholder: "请输入访问密码",
      },
      CustomEndpoint: {
        Title: "自定义接口",
        SubTitle: "是否使用自定义 Azure 或 OpenAI 服务",
      },
      Provider: {
        Title: "模型服务商",
        SubTitle: "切换不同的服务商",
      },
      OpenAI: {
        ApiKey: {
          Title: "API Key",
          SubTitle: "使用自定义 OpenAI Key 绕过密码访问限制",
          Placeholder: "OpenAI API Key",
        },

        Endpoint: {
          Title: "接口地址",
          SubTitle: "除默认地址外，必须包含 http(s)://",
        },
        AvailableModels: {
          Title: "可用模型",
          SubTitle: "点击获取可用模型列表",
          Action: "一键提取模型",
          Confirm: "确认拉取可用模型列表并填入自定义模型名？",
        },
      },
      Azure: {
        ApiKey: {
          Title: "接口密钥",
          SubTitle: "使用自定义 Azure Key 绕过密码访问限制",
          Placeholder: "Azure API Key",
        },

        Endpoint: {
          Title: "接口地址",
          SubTitle: "样例：",
        },

        ApiVerion: {
          Title: "接口版本 (azure api version)",
          SubTitle: "选择指定的部分版本",
        },
      },
      Anthropic: {
        ApiKey: {
          Title: "接口密钥",
          SubTitle: "使用自定义 Anthropic Key 绕过密码访问限制",
          Placeholder: "Anthropic API Key",
        },

        Endpoint: {
          Title: "接口地址",
          SubTitle: "样例：",
        },

        ApiVerion: {
          Title: "接口版本 (claude api version)",
          SubTitle: "选择一个特定的 API 版本输入",
        },
      },
      Google: {
        ApiKey: {
          Title: "API 密钥",
          SubTitle: "从 Google AI 获取您的 API 密钥",
          Placeholder: "输入您的 Google AI Studio API 密钥",
        },

        Endpoint: {
          Title: "终端地址",
          SubTitle: "示例：",
        },

        ApiVersion: {
          Title: "API 版本（仅适用于 gemini-pro）",
          SubTitle: "选择一个特定的 API 版本",
        },
      },
      CustomModel: {
        Title: "自定义模型名",
        SubTitle: "增加自定义模型可选项，使用英文逗号隔开",
      },
    },

    ModelSettings: {
      Title: "模型设置",
      SubTitle: "点击展开对话模型设置",
      CloseSubTile: "收起对话模型设置",
    },
    Model: "对话模型 (model)",
    StreamUsageEnable: {
      Title: "开启原生流式用量统计",
      SubTitle:
        "是否开启原生流式用量统计，需要 api 支持 stream_options 参数，否则按照默认编码器进行统计",
    },
    CompressModel: {
      Title: "对话摘要模型",
      SubTitle: "用于压缩历史记录、生成对话标题的模型",
    },
    TextProcessModel: {
      Title: "文本处理模型",
      SubTitle: "用于输入文本的翻译、润色等基础任务的模型",
    },
    OCRModel: {
      Title: "OCR模型",
      SubTitle: "用于识别输入图片中的文本的模型",
    },
    Params: {
      SessionInfo: "会话信息",
      current_history: "当前上下文",
      temperature: {
        name: "随机温度",
        tip: "控制生成文本的随机性 (0-2), 值越大创造性越高, 低温抑制知识幻觉",
      },
      top_p: {
        name: "采样概率",
        tip: "控制生成文本的多样性 (0-1), 值越小内容越单调, 通常与温度二选一使用",
      },
      max_tokens: {
        name: "最大回复",
        tip: "生成文本的最大长度, 思考模型、视觉对话、代码生成建议设置高回复限制",
      },
      presence_penalty: {
        name: "话题创意",
        tip: "鼓励模型谈论新话题 (-2 到 2), 值越大越容易扩展到新话题, 降低主题一致性",
      },
      frequency_penalty: {
        name: "重复抑制",
        tip: "降低重复词汇的可能性 (-2 到 2), 值越大越能避免AI使用重复词汇",
      },
      reasoning_effort: {
        name: "推理努力",
        tip: "修改模型推理努力程序，当前仅grok适用",
      },
    },
    Temperature: {
      Title: "随机性 (temperature)",
      SubTitle: "值越大，回复越随机",
    },
    TopP: {
      Title: "核采样 (top_p)",
      SubTitle: "与随机性类似，但不要和随机性一起更改",
    },
    MaxTokens: {
      Title: "单次回复限制 (max_tokens)",
      SubTitle: "单次交互所用的最大 Token 数",
    },
    PresencePenalty: {
      Title: "话题新鲜度 (presence_penalty)",
      SubTitle: "值越大，越有可能扩展到新话题",
    },
    FrequencyPenalty: {
      Title: "频率惩罚度 (frequency_penalty)",
      SubTitle: "值越大，越有可能降低重复字词",
    },
    ReasoningEffort: {
      Title: "推理努力程度(reasoning_effort)",
      SubTitle:
        "约束推理模型的努力程度和思考时间，仅适用于支持该参数的模型和供应商（当前仅grok)",
    },
    ParameterOverride: {
      Title: "参数覆盖",
      SubTitle: "用于覆盖请求参数，使用 json 格式",
      ValidJson: "✓ 有效的 json 设置",
      InvalidJson: "✗ json 格式错误",
      EnableInfo: "已添加覆盖参数",
      EmptyParam: "覆盖参数内容为空",
    },
    DocumentUploadWarning: "⚠️当前对话模型不支持图片理解或未配置视觉支持",
    TTS: {
      Enable: {
        Title: "启用文本转语音",
        SubTitle: "启用文本生成语音服务",
      },
      Autoplay: {
        Title: "启用自动朗读",
        SubTitle: "自动生成语音并播放，需先开启文本转语音开关",
      },
      Model: "模型",
      Engine: "转换引擎",
      Voice: {
        Title: "声音",
        SubTitle: "生成语音时使用的声音",
      },
      Speed: {
        Title: "速度",
        SubTitle: "生成语音的速度",
      },
    },
  },
  Store: {
    DefaultTopic: "新的聊天",
    PrivateTopic: "临时对话窗口，记录不保存",
    BotHello: "你好！有什么需要我帮忙的吗？😎",
    Error: "出错了，稍后重试吧",
    Prompt: {
      History: (content: string) => "这是历史聊天总结作为前情提要：" + content,
      old_Topic:
        "使用四到五个字直接返回这句话的简要主题，不要解释、不要标点、不要语气词、不要多余文本，不要加粗，如果没有主题，请直接返回“闲聊”",
      Topic:
        "为上述的对话内容主题创建一个简洁的3~8个字的标题，并带有一个表情符号。适合的Emoji可以用来增强理解，但避免使用引号或特殊格式。标题格式为“emoji + 空格 + 标题描述”，语言跟随用户对话，注意控制字数。\n一些标题示例：\n📉 股市趋势\n🍪 完美巧克力饼干配方\n🎵 音乐流媒体演变\n🎮 电子游戏开发见解",
      Summarize:
        "简要总结一下对话内容，用作后续的上下文提示 prompt，控制在 200 字以内",
    },
  },
  Copy: {
    Success: "已写入剪切板",
    Failed: "复制失败，请赋予剪切板权限",
  },
  Download: {
    Success: "内容已下载到您的目录",
    Failed: "下载失败",
  },
  Context: {
    Toast: (x: any) => `包含 ${x} 条预设提示词`,
    Edit: "当前对话设置",
    Add: "新增一条对话",
    Clear: "上下文已清除",
    Revert: "恢复上下文",
  },
  Discovery: {
    Name: "搜索",
  },
  FineTuned: {
    Sysmessage: "你是一个助手",
  },
  SearchChat: {
    Name: "搜索",
    Page: {
      Title: "搜索聊天记录",
      Search: "输入搜索关键词",
      NoResult: "没有找到结果",
      NoData: "没有数据",
      Loading: "加载中",

      SubTitle: (count: number) => `搜索到 ${count} 条结果`,
    },
    Item: {
      View: "查看",
    },
  },
  Mask: {
    Name: "面具",
    Page: {
      Title: "预设角色面具",
      SubTitle: (count: number) => `${count} 个预设角色定义`,
      Search: "搜索角色面具",
      Create: "新建",
    },
    Item: {
      Info: (count: number) => `包含 ${count} 条预设对话`,
      Chat: "对话",
      View: "查看",
      Edit: "编辑",
      Delete: "删除",
      DeleteConfirm: "确认删除？",
    },
    EditModal: {
      Title: (readonly: boolean) =>
        `编辑预设面具 ${readonly ? "（只读）" : ""}`,
      Download: "下载预设",
      Clone: "克隆预设",
    },
    Config: {
      Avatar: "角色头像",
      Name: "角色名称",
      Sync: {
        Title: "使用全局设置",
        SubTitle: "当前对话是否使用全局模型设置",
        Confirm: "当前对话的自定义设置将会被自动覆盖，确认启用全局设置？",
      },
      HideContext: {
        Title: "隐藏预设对话",
        SubTitle: "隐藏后预设对话不会出现在聊天界面",
      },
      Artifacts: {
        Title: "启用Artifacts",
        SubTitle: "启用之后可以直接渲染HTML页面",
      },
      CodeFold: {
        Title: "启用代码折叠",
        SubTitle: "启用之后可以自动折叠/展开过长的代码块",
      },
      FloatingButton: {
        Title: "启用悬浮球",
        SubTitle: "启用之后可以从悬浮球查看当前的会话信息和快捷功能跳转",
      },
      Share: {
        Title: "分享此面具",
        SubTitle: "生成此面具的直达链接",
        Action: "复制链接",
      },
    },
  },
  NewChat: {
    Return: "返回",
    Skip: "直接开始",
    NotShow: "不再展示",
    ConfirmNoShow: "确认禁用？禁用后可以随时在设置中重新启用。",
    Title: "挑选一个面具",
    SubTitle: "现在开始，与面具背后的灵魂思维碰撞",
    More: "展开代码",
    Less: "折叠代码",
    Searching: "搜索中...",
    Search: "搜索内容",
    NoSearch: "没有搜索内容",
    SearchFormat: (SearchTime?: number) =>
      SearchTime !== undefined
        ? `（用时 ${Math.round(SearchTime / 1000)} 秒）`
        : "",
    Thinking: "正在思考中...",
    Think: "思考过程",
    NoThink: "没有思考过程",
    ThinkFormat: (thinkingTime?: number) =>
      thinkingTime !== undefined
        ? `（用时 ${Math.round(thinkingTime / 1000)} 秒）`
        : "",
    ArtifactsInfo:
      "可在设置中开启/关闭“Artifacts 预览”和“代码折叠”，若预览失败请刷新页面",
  },

  URLCommand: {
    Code: "检测到链接中已经包含访问码，是否自动填入？",
    Settings: "检测到链接中包含了预制设置，是否自动填入？",
  },

  UI: {
    Confirm: "确认",
    Cancel: "取消",
    Close: "关闭",
    Create: "新建",
    Edit: "编辑",
    Export: "导出",
    Import: "导入",
    Sync: "同步",
    Config: "配置",
    SearchModel: "搜索模型",
    SelectALL: "所有模型",
    NoPresetRule: "未预置规则",
  },
  Exporter: {
    Description: {
      Title: "只有清除上下文之后的消息会被展示",
    },
    Model: "模型",
    Messages: "消息",
    Topic: "主题",
    Time: "时间",
  },
  CustomProvider: {
    Title: "自定义 AI 提供商",
    AddButton: "添加提供商",
    Count: "共 {count} 个提供商配置",
    SearchPlaceholder: "搜索提供商名称或模型名称...",
    Loading: "加载 AI 提供商...",
    NoProviders: "未找到匹配的 AI 提供商",
    Edit: "编辑",
    Delete: "删除",
    ConfirmDeleteProvider: "确定要删除这个 AI 提供商吗?",
    Return: "返回",
    BasicInfo: "基本信息",
    ModelConfig: "模型配置",
    APIConfig: "API 配置",
    AdvancedConfig: "高级设置",
    Name: "名称",
    NamePlaceholder: "例如：openai 官方",
    Type: "类型",
    CustomAPI: "自定义 API",
    DescriptionPlaceholder: "添加描述（可选）",
    ApiKeyPlaceholder: "输入您的 API Key，可以逗号或空格分隔多个密钥",
    Show: "显示",
    Hide: "隐藏",
    Previous: "上一步",
    Next: "下一步",
    SaveChanges: "保存修改",
    AddProvider: "添加提供商",
    DefaultOpenAIDescription: "默认 OpenAI API 配置",
    CustomAPIService: "自定义 API 地址",
    CustomHostedDescription: "自托管 API 服务",
    AdvancedOptions: "高级选项",
    NoAdvancedOptions: "目前没有其他高级选项可以配置。",
    TypeSubtitle: "选择您的AI服务提供商类型",
    NameSubtitle: "为您的AI提供商设置一个易于识别的名称",
    ApiUrlSubtitle: "API 的请求地址，为空则默认官方地址",
    ApiKeySubtitle:
      "您的API密钥将被安全地存储在本地并用于API请求，可切换视图查询密钥额度",
    ApiNameRequired: "请输入 API 名称",
    ApiUrlRequired: "请输入 API 地址",
    ApiKeyRequired: "请输入 API key",
    ApiConfigRequired: "请先填写 API Key 和 API URL",
    ModelNameRequired: "请输入模型名称",
    SearchModel: "搜索或添加模型（支持逗号分隔多个模型，支持正则）",
    Select: {
      All: "选择全部",
      Clear: "清除",
    },
    AddModels: "添加模型",
    RefreshModels: "刷新模型",
    LoadingModels: "正在加载模型列表...",
    ModelExists: "同名模型已存在",
    NoModelsFound: "没有找到模型",
    NoModelsFoundHint: "确认 API 信息无误后尝试刷新模型列表",
    NoModels: "暂无模型",
    NoSelectedModels: "暂无已选模型",
    ModelsCount: "{count} 个模型",
    ProviderUpdated: "提供商已更新",
    ProviderAdded: "提供商已添加",
    ProviderEnabled: "提供商已启用",
    ProviderDisabled: "提供商已禁用",
    ToggleEnable: "点击启用",
    ToggleDisable: "点击禁用",
    Status: {
      Enabled: "已启用",
      Disabled: "已禁用",
    },
    EmptyTitle: "暂无AI提供商",
    EmptyDescription: '点击"添加提供商"按钮来添加您的提供商',
    EmptySearchDescription: "尝试使用不同的搜索词或清除搜索",
    ParsingPlaceholder: "输入请求样例或包含 api 信息的待解析文本",
    IntelligentParsing: "智能解析",
    KeyListView: "密钥：列表视图",
    NormalView: "密钥：普通视图",
    AddKey: "添加密钥",
    ClearInput: "清除输入",
    RefreshBalance: "刷新余额",
    RemoveInvalidKey: "删除无效密钥",
    NoKeysAdded: "尚未添加任何API密钥",
    NewKeyPlaceholder: "输入新的API密钥",
    EditModel: {
      EditModelFeature: "编辑模型特性",
      ModelID: "模型ID：",
      DisplayName: "显示名称：",
      Description: "模型描述：",
      VisionSupport: "视觉支持：",
      Cancel: "取消",
      Save: "保存",
      ErrorJson: "无效的格式，请提供有效的JSON对象",
      SuccessJson: "模型别名映射已成功应用",
      CardView: "卡片视图",
      JsonView: "JSON视图",
      ApplyJson: "应用 JSON 映射",
      EditJson: "编辑 JSON 映射, 格式：“模型: 模型别名” ",
    },
  },
};

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export type LocaleType = typeof cn;
export type PartialLocaleType = DeepPartial<typeof cn>;

export default cn;
