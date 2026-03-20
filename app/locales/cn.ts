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
    Actions: {
      Share: "分享",
      Rename: "重命名",
      Pin: "置顶聊天",
      Unpin: "取消置顶",
      Delete: "删除",
    },
    DeleteConfirm: {
      Title: "确认删除此会话？",
      LastMessage: "最后一条消息：",
    },
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
      CopyError: "复制错误内容",
      Download: "下载",
      Preview: "预览",
      ShowCode: "代码",
      PreviewFullscreen: "点击预览全屏",
      ViewImage: "点击查看大图",
      Stop: "停止",
      Retry: "重试",
      Pin: "固定",
      PinToastContent: "已将 1 条对话固定至预设提示词",
      PinToastAction: "查看",
      Delete: "删除",
      Edit: "编辑",
      EditToInput: "编辑为输入",
      EditNoMessage: "没有消息可以编辑",
      Save: "保存",
      Cancel: "取消",
      FullScreen: "全屏",
      ExitFullScreen: "退出全屏",
      RefreshTitle: "刷新标题",
      RefreshToast: "已发送刷新标题请求",
      FailTitleToast: "标题生成失败，检查压缩模型设置后点击🔄手动刷新标题",
      Speech: "朗读",
      StopSpeech: "停止",
      Quote: "引用至输入框提问",
      QuoteTooltip: "点击跳转到原消息",
      // Python execution
      Run: "运行",
      RunCode: "运行代码",
      Rerun: "重新运行",
      Running: "运行中...",
      ExecutionResult: "执行结果",
      ExecutionSuccess: "执行成功",
      ExecutionFailed: "执行失败",
      CopyOutput: "复制输出结果",
      ExitCode: "退出码",
      Stdout: "标准输出",
      Stderr: "错误输出",
      Stdin: "标准输入",
      StdinPlaceholder: "程序需要输入时在此填写，多行输入用换行分隔",
      StdinHint: "检测到代码中有 input() 调用，请在下方输入框填写输入内容",
      ShowStdin: "显示输入框",
      HideStdin: "隐藏输入框",
      ExecutionTimeout: "执行超时 (30秒)",
      CodeBlocked: "代码包含危险操作，禁止执行",
      BlockedNetwork: "代码包含网络请求操作，禁止执行",
      BlockedFilesystem: "代码包含文件系统操作，禁止执行",
      BlockedSystem: "代码包含系统调用操作，禁止执行",
      NoOutput: "(无输出)",
      NoOutputHint: "代码中未检测到输出语句 (如 print)",
      SignalError: (signal: string) =>
        `进程被信号终止: ${signal}（可能是超时或内存超限）`,
    },
    Commands: {
      new: "新建聊天",
      newm: "从角色新建聊天",
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
      Masks: "所有角色",
      Clear: "清除聊天",
      Settings: "对话设置",
      UploadImage: "上传图片",
      UnsupportedModelForUploadImage: "当前模型不支持上传图片",
      RenameFile: "重命名文件",
      CloudBackup: "云备份",
      Tools: "工具箱",
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
          "请严格遵循以下规则进行中英互译：\n\
1. 自动识别输入文本的语言（中文或英文）\n\
2. 如果文本是中文，请将其翻译成英文\n\
3. 如果文本是英文或其他语种，请将其翻译成中文\n\
4. 翻译时确保准确、自然、流畅和地道，使用优美高雅的表达方式\n\
5. 智能处理文本中的冗余换行和数字页码问题，根据上下文进行整理\n\
6. 你只能输出翻译后的内容，不要添加任何解释、说明或其他任何内容\n\
7. 如果输入文本已经是目标语言（如英文输入并要求翻成英文），直接返回原文",
        UserPrompt: "请翻译以下内容（严格遵守语言识别规则）: \n",
      },
      OCR: {
        Title: "提取文字",
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
        Title: "优化输入",
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
      ClearInput: {
        Title: "清空输入",
        BlankToast: "输入内容为空",
        SuccessClearChatToast: "已清空输入，点击撤销并恢复文本",
        Undo: "撤销清空",
        UndoToast: "已撤销清空输入",
      },
      ReplaceText: {
        Title: "替换文本",
        BlankToast: "输入内容为空",
        SearchText: "查找文本",
        SearchPlaceholder: "要查找的文本",
        ReplaceText: "替换文本",
        ReplacePlaceholder: "要替换成的文本，如：***",
        EmptySearchToast: "查找文本不能为空",
        isReplacingToast: "正在替换中...",
        SuccessClearChatToast: "已清空输入，点击撤销并恢复文本",
        Undo: "撤销替换",
        UndoToast: "已撤销替换操作",
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
    Navigator: {
      Title: "对话导航",
      Empty: "暂无消息",
      Search: "搜索消息...",
      NoResults: "无匹配结果",
    },
    Typing: "正在输入…",
    GoToCustomProviderConfig: "点击跳转对应的渠道配置",
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
      SaveAs: "存为角色",
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
    Share: "创建分享链接",
    ShareError: "分享失败，请检查网络连接或稍后再试",
    ShareNotFound: "分享链接不存在",
    ShareNotFoundDesc: "请检查链接是否正确或已过期",
    MessageFromYou: "用户",
    MessageFromChatGPT: "ChatGPT",
    Format: {
      Title: "导出格式",
      SubTitle: "可以导出 Markdown 文本或者 PNG 图片",
    },
    IncludeContext: {
      Title: "包含角色上下文",
      SubTitle: "是否在消息中展示角色上下文",
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
    DualModelSource: {
      Title: "导出模型",
      SubTitle: "双模型模式下选择导出哪个模型的对话",
      Primary: "主模型",
      Secondary: "副模型",
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
      Expired: "分享链接已过期或请求ID不存在",
      SetExpiration: "设置分享过期时间",
      ExpirationLabel: "过期时间:",
      Warning: "⚠️ 分享链接将公开，拿到链接的任何人都可以访问",
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
    Tabs: {
      General: "通用配置",
      ModelService: "模型服务",
      Sync: "数据备份",
      QuickInput: "快捷输入",
      Voice: "语音设置",
    },
    Danger: {
      Fix: {
        title: "修复错误",
        SubTitle: "清除输入框以修复渲染错误",
        Action: "修复错误",
        Confirm: "确认清除输入框？",
      },
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
      Name: "当前语言", // ATTENTION: if you wanna add a new translation, please do not translate this value, leave it as `Language`
      All: "所有语言",
    },
    Avatar: "头像",
    FontSize: {
      Title: "字体基准 (px)",
      SubTitle:
        "整体程序风格的字体基准（1em）, 参考聊天标题的字体大小，如自定义css中有设置则以自定义css为准",
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
    CustomCSS: {
      Title: "自定义CSS",
      SubTitleEnabled: "自定义CSS样式已启用",
      SubTitleDisabled: "自定义CSS样式已禁用",
      Edit: "编辑CSS",
      Enable: "启用自定义CSS",
      More: "获取更多主题",
      Hint: "您可以自定义全局CSS样式，例如修改主题色，设置AI消息框最大宽度等，完整的变量列表可参考应用的globals.scss文件。",
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
      Fetching: "正在获取云端数据...",
      Merging: "合并本地数据",
      Uploading: "正在上传云端...",

      Config: {
        Modal: {
          Title: "配置云同步(检查可用性有bug，可尝试直接同步)",
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
        return `${overview.chat} 次对话，${overview.message} 条消息，${overview.prompt} 条提示词，${overview.mask} 个角色，${overview.provider} 个自定义渠道`;
      },
      ImportFailed: "导入失败",
    },
    Mask: {
      Splash: {
        Title: "角色启动页",
        SubTitle: "新建聊天时，展示角色启动页",
      },
      Builtin: {
        Title: "隐藏内置角色",
        SubTitle: "在所有角色列表中隐藏内置角色",
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
        SubTitle: "是否使用自定义 API 接口服务",
        Advanced: "高级自定义接口",
      },
      Provider: {
        Title: "模型服务商",
        SubTitle: "切换不同的服务商",
      },
      OpenAI: {
        ApiKey: {
          Title: "接口密钥",
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
          Placeholder: "Google AI Studio API",
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
    Expansion: {
      Title: "快捷输入",
      SubTitle: "输入时自动替换文本的扩展规则",
      Manage: "管理规则",
      Rules: "扩展规则管理",
      AddRule: "添加新规则",
      AddRuleHint: "创建一个新的文本替换规则",
      EditRule: "编辑规则",
      Trigger: "触发文本",
      Replacement: "替换内容",
      ReplacementHint: "使用 $|$ 标记光标位置",
      Description: "描述",
      Enabled: "启用",
      BuiltinRules: "内置规则",
      UserRules: "用户规则",
      NoUserRules: "暂无用户自定义规则",
      EnabledTitle: "启用快捷输入",
      EnabledSubTitle: "是否启用自动文本替换功能",
      TriggerPrefixTitle: "触发前缀",
      TriggerPrefixSubTitle: "内置规则的触发前缀字符",
      SelectAll: "全选",
      UnselectAll: "取消全选",
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
    EnableStream: {
      Title: "是否流式输出",
      SubTitle: "是否使用流式输出，非流式输出会在最后一次请求时返回所有内容",
    },
    RequestTimeout: {
      Title: "请求超时",
      SubTitle: "请求超时的时间，单位为秒",
    },
    Temperature: {
      Title: "随机性",
      SubTitle:
        "temperature，控制生成文本的随机性 (0-2), 值越大创造性越高, 低温抑制知识幻觉",
    },
    TopP: {
      Title: "核采样",
      SubTitle: "top_p，与随机性类似，但不要和随机性一起更改",
    },
    MaxTokens: {
      Title: "单次回复限制",
      SubTitle:
        "max_tokens，生成文本的最大长度, 思考模型、视觉对话、代码生成建议设置高回复限制",
    },
    PresencePenalty: {
      Title: "话题新鲜度",
      SubTitle: "presence_penalty，值越大，越有可能扩展到新话题",
    },
    FrequencyPenalty: {
      Title: "频率惩罚度",
      SubTitle: "frequency_penalty，值越大，越有可能降低重复字词",
    },
    ReasoningEffort: {
      Title: "推理努力程度",
      SubTitle:
        "reasoning_effort，约束推理模型的努力程度和思考时间，仅适用于支持该参数的模型和供应商",
    },
    ParameterOverride: {
      Title: "参数覆盖",
      SubTitle: "用于覆盖请求参数(body)，使用 json 格式",
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
  Formula: {
    CopyLatex: "复制为 LaTeX",
    CopyMathML: "复制为 MathML（Word 格式）",
    CopyRaw: "复制为纯公式",
    ViewLarge: "查看放大公式",
    CopySuccess: "公式已复制",
    CopyFailed: "复制失败",
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
    Name: "角色",
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
        `编辑预设角色 ${readonly ? "（只读）" : ""}`,
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
        Title: "分享此角色",
        SubTitle: "生成此角色的直达链接",
        Action: "复制链接",
      },
    },
  },
  NewChat: {
    Return: "返回",
    Skip: "直接开始",
    NotShow: "不再展示",
    ConfirmNoShow: "确认禁用？禁用后可以随时在设置中重新启用。",
    Title: "挑选一个角色",
    SubTitle: "现在开始，与角色背后的灵魂思维碰撞",
    More: "展开",
    Less: "折叠",
    ShowCode: "显示代码",
    Preview: "预览",
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
    Replace: "替换",
    MermaidError: "Mermaid 渲染失败，请检查语法",
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
    ApiKeyPlaceholder:
      "输入 API Key，支持逗号或空格分隔多个密钥；支持用于过滤匹配（包括响应错误）",
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
    SearchModel: "搜索或添加模型（支持逗号/空格分隔多个模型，支持正则）",
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
    IncompleteData: "提供商信息不完整",
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
    ClearDisabledKeys: "清除禁用密钥",
    ClearSelectKeys: "清除选中密钥",
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
    advancedSettings: {
      title: "高级设置",
      subtitle: "配置自定义API路径",
    },
    chatPath: {
      title: "聊天路径",
      subtitle: "自定义聊天完成请求的API端点路径",
    },
    speechPath: {
      title: "语音路径",
      subtitle: "自定义文本转语音请求的API端点路径",
    },
    imagePath: {
      title: "图像路径",
      subtitle: "自定义图像生成请求的API端点路径",
    },
    listModelPath: {
      title: "模型列表路径",
      subtitle: "自定义获取模型列表的API端点路径",
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
