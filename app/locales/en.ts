import { getClientConfig } from "../config/client";
import { SubmitKey } from "../store/config";
import { LocaleType } from "./index";

// if you are adding a new translation, please use PartialLocaleType instead of LocaleType

const isApp = !!getClientConfig()?.isApp;
const en: LocaleType = {
  WIP: "Coming Soon...",
  Error: {
    Unauthorized: isApp
      ? "Invalid API Key, please check it in [Settings](/#/settings) page."
      : "Unauthorized access, please enter access code in [auth](/#/auth) page, or enter your OpenAI API Key.",
  },
  Auth: {
    Title: "Need Access Code",
    Tips: "Please enter access code below",
    SubTips: "Or enter your OpenAI or Google API Key",
    Input: "access code",
    Confirm: "Confirm",
    Later: "Later",
  },
  ChatItem: {
    ChatItemCount: (count: number) => `${count} messages`,
  },
  Chat: {
    SubTitle: (count: number) => `${count} messages`,
    EditMessage: {
      Title: "Edit All Messages",
      Topic: {
        Title: "Topic",
        SubTitle: "Change the current topic",
      },
    },
    Actions: {
      ChatList: "Go To Chat List",
      CompressedHistory: "Compressed History Memory Prompt",
      Export: "Export All Messages as Markdown",
      Copy: "Copy",
      Stop: "Stop",
      Retry: "Retry",
      Pin: "Pin",
      PinToastContent: "Pinned 1 messages to contextual prompts",
      PinToastAction: "View",
      Delete: "Delete",
      Edit: "Edit",
      EditToInput: "Edit to Input",
      EditNoMessage: "No message to edit",
      FullScreen: "FullScreen",
      RefreshTitle: "Refresh Title",
      RefreshToast: "Title refresh request sent",
      FailTitleToast:
        "Title generation failed, please manually click 🔄 after checking the compression model settings",
      Speech: "Play",
      StopSpeech: "Stop",
    },
    Commands: {
      new: "Start a new chat",
      newm: "Start a new chat with mask",
      next: "Next Chat",
      prev: "Previous Chat",
      clear: "Clear Context",
      fork: "Copy Chat",
      del: "Delete Chat",
      search: "Search Chat",
      edit: "Edit Chat",
      resend: "Resend Chat",
      private: "Switch Private Mode",
      pin: "Pin Current Session",
    },
    InputActions: {
      Collapse: "Fold Ribbon",
      Expand: "Expand Ribbon",
      Stop: "Stop",
      ToBottom: "To Latest",
      Theme: {
        auto: "Auto",
        light: "Light Theme",
        dark: "Dark Theme",
      },
      PrivateMode: {
        On: "Open Private Mode",
        OnToast:
          "Private mode is now enabled, and a new private session has been created.",
        Off: "Close Private Mode",
        Info: "In Private Mode Currently",
        Return: "↩ Back to Chat Page",
      },
      ModelAtSelector: {
        SelectModel: "Select Model",
        AvailableModels: (count: number | undefined) =>
          `${count ?? 0} Available Models`,
        NoAvailableModels: "No Available Models For Matching",
      },
      MoveCursorToStart: "Double Click to Move Cursor to Start",
      MoveCursorToEnd: "Double Click to Move Cursor to End",
      Prompt: "Prompts",
      Masks: "Masks",
      Clear: "Clear Context",
      Settings: "Settings",
      UploadImage: "Upload Images",
      UnsupportedModelForUploadImage:
        "Current model does not support image uploads.",
      RenameFile: "Rename this file",
      CloudBackup: "Backup by Cloud",
      Continue: {
        Title: "Complete Chat",
        isContinueToast: "Currently completing chat...",
        ContinuePrompt:
          "Please continue to elaborate on the incomplete content above, maintaining a consistent train of thought and style. Proceed directly with the output without repeating existing information or adding summaries or introductions. Automatically determine a reasonable ending point based on the content type (writing, problem-solving, code, etc.).",
      },
      Translate: {
        Title: "Translate between ZH-EN",
        BlankToast: "Input content is empty, no translation will be performed",
        isTranslatingToast: "Currently translating ...",
        FailTranslateToast:
          "This translation failed; please check the translation model settings and try again.",
        SuccessTranslateToast:
          "This translation has been completed and replaced the input text.",
        Undo: "Undo Translate",
        UndoToast: "Undo Translate Success",
        SystemPrompt:
          "Please act as a professional Chinese-English interpreter. First, identify the language of the input text and then accurately translate it into the other language (translate Chinese into English and English into Chinese). Ensure the translation is natural, fluent, idiomatic, and uses beautiful and elegant expressions. The text may contain redundant line breaks within paragraphs or pagination issues due to copying problems; please intelligently remove these based on context to produce a coherent and smooth translation. Regardless of the content you receive, you should only provide the translated text—do not include the original text, any explanations, or any other information.",
        UserPrompt: "Translate the following text: \n",
      },
      OCR: {
        Title: "OCR",
        Screenshot: "Screenshot OCR",
        ImportImage: "ImportImage OCR",
        BlankToast: "No image input detected, no OCR will be performed",
        isDetectingToast: "Currently OCR ...",
        FailDetectToast:
          "This OCR failed; please check the OCR model settings and try again.",
        SuccessDetectToast:
          "This OCR has been completed and replaced the input image.",
        DetectSystemPrompt:
          "You are a professional OCR text recognition tool. Please strictly adhere to the following rules:\n\
1.Only output the actual text present in the image, without adding any explanations, comments, or extra content.\n\
2.Maintain the original format, line breaks, indentation, punctuation, etc., exactly as they are.\n\
3.For text that is difficult to recognize, use [...] to indicate it, and do not guess or supplement.\n\
4.If it is a table, maintain the original table structure as much as possible.\n\
5.If it is code, keep the original code format.\n\
6.If it includes mathematical formulas, use LaTeX format and wrap it with $$.\n\
7.If the content contains multiple languages, accurately recognize and maintain the original languages.\n\
8.If there are punctuation marks, maintain their original usage.\n\
9.If there are special symbols or formulas, ensure accurate conversion to their corresponding formats.\n\
10.Do not make any modifications, polishing, or reorganization of the text content.",
        DetectPrompt:
          "Please help me OCR this image, according to the above rules, and ensure the accuracy of the output results without any additional content.",
      },
      ImprovePrompt: {
        Title: "improve prompt",
        BlankToast: "Input content is empty, no optimization will be performed",
        isImprovingToast: "Currently optimizing ...",
        FailImprovingToast:
          "This optimization failed; please check the optimization model settings and try again.",
        SuccessImprovingToast:
          "This optimization has been completed and replaced the input content.",
        Undo: "Undo Optimization",
        UndoToast: "Undo Optimization Success",
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
        Title: "Privatize the input",
        BlankToast:
          "Input content is empty, no privacy mosaic will be performed",
        isPrivacyToast: "Currently privacy mosaic ...",
        FailPrivacyToast:
          "This privacy mosaic failed; please check the privacy model settings and try again.",
        SuccessPrivacyToast:
          "This privacy mosaic has been completed and replaced the input content.",
        Undo: "Undo Privatize",
        UndoToast: "Undo Privatize Success",
      },
      UploadFile: {
        Title: ((canUploadImage: boolean = false) =>
          canUploadImage
            ? "Upload Image or Plain Text File"
            : "Upload Plain Text File") as any,
        FileTooLarge: "Only support to upload single file with 1M.",
        TooManyFile: "Exceeds the maximum number of files allowed for upload.",
        UnsupportedFileType: "Unsupported File Type.",
        UnsupportToUploadImage:
          "No image uploads for the model's lack of visual capabilities configuration.",
        FailToRead: "File content reading failed.",
        TooManyTokenToPasteAsFile:
          "The amount of text pasted is excessive; it has been automatically attached as a file.",
        DuplicateFile: (filename: string) =>
          `The file "${filename}" already exists. Please do not upload it again.`,
      },
    },
    Rename: "Rename Chat",
    Typing: "Typing…",
    Input: (submitKey: string, isMobileScreen: boolean = false) => {
      if (isMobileScreen) {
        return "/ to search prompts, : to use commands\nInput your question...";
      }
      var inputHints = `${submitKey} to send`;
      if (submitKey === String(SubmitKey.Enter)) {
        inputHints += ", Shift + Enter to wrap";
      }
      return (
        inputHints +
        "\n@ to select models,/ to search prompts, : to use commands\nCtrl + Shift + ; to quickly copy the last code block\nCtrl + Shift + L to regenerate AI response"
      );
    },
    Send: "Send",
    StartSpeak: "Start Speak",
    StopSpeak: "Stop Speak",
    Config: {
      Reset: "Reset to Default",
      SaveAs: "Save as Mask",
    },
    IsContext: "Contextual Prompt",
    ShortcutKey: {
      Title: "Keyboard Shortcuts",
      newChat: "Open New Chat",
      focusInput: "Focus Input Field",
      copyLastMessage: "Copy Last Reply",
      copyLastCode: "Copy Last Code Block",
      resendLastMessage: "Resend Last Message",
      showShortcutKey: "Show Shortcuts",
      moveCursorToStart: "Move Cursor to Start",
      moveCursorToEnd: "Move Cursor to End",
      searchChat: "Search Chat History",
    },
  },
  Export: {
    Title: "Export Messages",
    Copy: "Copy All",
    Download: "Download",
    MessageFromYou: "Message From You",
    MessageFromChatGPT: "Message From ChatGPT",
    Share: "Share to ShareGPT",
    Format: {
      Title: "Export Format",
      SubTitle: "Markdown or PNG Image",
    },
    IncludeContext: {
      Title: "Including Context",
      SubTitle: "Export context prompts in mask or not",
    },
    UseDisplayName: {
      Title: "Use DisplayName",
      SubTitle:
        "Use DisplayName in exported messages, if the model does not define an alias, the original name will be used",
    },
    ShareSessionTitle: {
      Title: "Session Title",
      SubTitle: "Support to Set Session Title to override original title",
    },
    Steps: {
      Select: "Select",
      Preview: "Preview",
    },
    Image: {
      Toast: "Capturing Image...",
      Modal: "Long press or right click to save image",
    },
    Artifacts: {
      Title: "Share Artifacts",
      Error: "Share Error",
    },
  },
  Select: {
    Search: "Search",
    All: "Select All",
    Latest: "Select Latest",
    Clear: "Clear",
    HideUserContinueMsg: "Hide User Continue Msg",
  },
  Memory: {
    Title: "Memory Prompt",
    EmptyContent: "Nothing yet.",
    Send: "Send Memory",
    Copy: "Copy Memory",
    Reset: "Reset Session",
    ResetConfirm:
      "Resetting will clear the current conversation history and historical memory. Are you sure you want to reset?",
  },
  Home: {
    // PlusChat: "Plus",
    FakeChat: "Mirror",
    NewChat: "New Chat",
    DeleteChat: "Confirm to delete the selected conversation?",
    DeleteToast: "Chat Deleted",
    Revert: "Revert",
  },
  Settings: {
    Title: "Settings",
    SubTitle: "All Settings",
    ShowPassword: "ShowPassword",
    Danger: {
      Reset: {
        Title: "Reset All Settings",
        SubTitle: "Reset all setting items to default",
        Action: "Reset",
        Confirm: "Confirm to reset all settings to default?",
      },
      ClearChat: {
        Title: "Clear Chat History",
        SubTitle: "Clear all chat history and keep settings",
        Action: "Clear",
        Confirm: "Confirm to clear all chat history?",
      },
      ClearALL: {
        Title: "Clear All Data",
        SubTitle: "Clear all chat history and settings to empty state",
        Action: "Clear",
        Confirm: "Confirm to clear all messages and settings?",
      },
    },
    Lang: {
      Name: "Language", // ATTENTION: if you wanna add a new translation, please do not translate this value, leave it as `Language`
      All: "All Languages",
    },
    Avatar: "Avatar",
    FontSize: {
      Title: "Font Size",
      SubTitle: "Adjust font size of chat content",
    },
    InjectSystemPrompts: {
      Title: "Inject System Prompts",
      SubTitle: "Inject a global system prompt for every request",
    },
    InputTemplate: {
      Title: "Input Template",
      SubTitle: "Newest message will be filled to this template",
    },

    Update: {
      Version: (x: string) => `Version: ${x}`,
      IsLatest: "Latest version",
      CheckUpdate: "Check Update",
      IsChecking: "Checking update...",
      FoundUpdate: (x: string) => `Found new version: ${x}`,
      GoToUpdate: "Update",
    },
    Personalization: {
      Title: "Personalization Settings",
      SubTitle: "Click to expand personalization settings",
      CloseSubTile: "Click to close personalization settings",
    },
    SendKey: "Send Key",
    Theme: "Theme",
    TightBorder: "Tight Border",
    SendPreviewBubble: {
      Title: "Send Preview Bubble",
      SubTitle: "Preview markdown in bubble",
    },
    AutoGenerateTitle: {
      Title: "Auto Generate Title",
      SubTitle: "Generate a suitable title based on the conversation content",
    },
    Sync: {
      CloudState: "Last Update",
      NotSyncYet: "Not sync yet",
      Success: "Sync Success",
      Fail: "Sync Fail",

      Config: {
        Modal: {
          Title: "Config Sync",
          Check: "Check Connection",
        },
        SyncType: {
          Title: "Sync Type",
          SubTitle: "Choose your favorite sync service",
        },
        Proxy: {
          Title: "Enable CORS Proxy",
          SubTitle: "Enable a proxy to avoid cross-origin restrictions",
        },
        ProxyUrl: {
          Title: "Proxy Endpoint",
          SubTitle:
            "Only applicable to the built-in CORS proxy for this project",
        },

        WebDav: {
          Endpoint: "WebDAV Endpoint",
          UserName: "User Name",
          Password: "Password",
        },

        UpStash: {
          Endpoint: "UpStash Redis REST Url",
          UserName: "Backup Name",
          Password: "UpStash Redis REST Token",
        },
      },

      LocalState: "Local Data",
      Overview: (overview: any) => {
        return `${overview.chat} chats，${overview.message} messages，${overview.prompt} prompts，${overview.mask} masks`;
      },
      ImportFailed: "Failed to import from file",
    },
    Mask: {
      Splash: {
        Title: "Mask Splash Screen",
        SubTitle: "Show a mask splash screen before starting new chat",
      },
      Builtin: {
        Title: "Hide Builtin Masks",
        SubTitle: "Hide builtin masks in mask list",
      },
    },
    Prompt: {
      Disable: {
        Title: "Disable auto-completion",
        SubTitle: "Input / to trigger auto-completion",
      },
      List: "Prompt List",
      ListCount: (builtin: number, custom: number) =>
        `${builtin} built-in, ${custom} user-defined`,
      Edit: "Edit",
      Modal: {
        Title: "Prompt List",
        Add: "Add One",
        Search: "Search Prompts",
      },
      EditModal: {
        Title: "Edit Prompt",
      },
      CustomUserContinuePrompt: {
        Title: "Prompt for AI Conversation Completion",
        SubTitle:
          "Custom prompt for conversation completion, used to guide the model in completing conversations",
        Enable: "Show Continue Completion Message",
        Edit: "Edit Prompt",
        Modal: {
          Title: "Continue Completion Prompt",
        },
      },
    },
    HistoryCount: {
      Title: "Attached Messages Count",
      SubTitle: "Number of sent messages attached per request",
    },
    CompressThreshold: {
      Title: "History Compression Threshold",
      SubTitle:
        "Will compress if uncompressed messages length exceeds the value",
    },

    Usage: {
      Title: "Account Balance",
      SubTitle(used: any, total: any) {
        return `Used this month $${used}, subscription $${total}`;
      },
      IsChecking: "Checking...",
      Check: "Check",
      NoAccess: "Enter API Key to check balance",
    },
    Access: {
      AccessCode: {
        Title: "Access Code",
        SubTitle: "Access control Enabled",
        Placeholder: "Enter Code",
      },
      CustomEndpoint: {
        Title: "Custom Endpoint",
        SubTitle: "Use custom Azure or OpenAI service",
      },
      Provider: {
        Title: "Model Provider",
        SubTitle: "Select Azure or OpenAI",
      },
      OpenAI: {
        ApiKey: {
          Title: "OpenAI API Key",
          SubTitle: "User custom OpenAI Api Key",
          Placeholder: "sk-xxx",
        },

        Endpoint: {
          Title: "OpenAI Endpoint",
          SubTitle: "Must start with http(s):// or use /api/openai as default",
        },
        AvailableModels: {
          Title: "Available Models",
          SubTitle: "Click to get the list of available models.",
          Action: "One-click model extraction.",
          Confirm:
            "Confirm fetching the list of available models and entering the custom model name?",
        },
      },
      Azure: {
        ApiKey: {
          Title: "Azure Api Key",
          SubTitle: "Check your api key from Azure console",
          Placeholder: "Azure Api Key",
        },

        Endpoint: {
          Title: "Azure Endpoint",
          SubTitle: "Example: ",
        },

        ApiVerion: {
          Title: "Azure Api Version",
          SubTitle: "Check your api version from azure console",
        },
      },
      Anthropic: {
        ApiKey: {
          Title: "Anthropic API Key",
          SubTitle:
            "Use a custom Anthropic Key to bypass password access restrictions",
          Placeholder: "Anthropic API Key",
        },

        Endpoint: {
          Title: "Endpoint Address",
          SubTitle: "Example:",
        },

        ApiVerion: {
          Title: "API Version (claude api version)",
          SubTitle: "Select and input a specific API version",
        },
      },
      CustomModel: {
        Title: "Custom Models",
        SubTitle: "Custom model options, seperated by comma",
      },
      Google: {
        ApiKey: {
          Title: "API Key",
          SubTitle: "Obtain your API Key from Google AI",
          Placeholder: "Enter your Google AI Studio API Key",
        },

        Endpoint: {
          Title: "Endpoint Address",
          SubTitle: "Example:",
        },

        ApiVersion: {
          Title: "API Version (specific to gemini-pro)",
          SubTitle: "Select a specific API version",
        },
      },
    },

    ModelSettings: {
      Title: "Model Settings",
      SubTitle: "Click to expand model settings",
      CloseSubTile: "Click to close model settings",
    },
    Model: "Model",
    StreamUsageEnable: {
      Title: "Enable API Stream Usage Options",
      SubTitle:
        "Whether to enable native streaming usage statistics requires API support for the stream_options parameter; otherwise, statistics will be based on the default tiktoken.",
    },
    CompressModel: {
      Title: "Summary Model",
      SubTitle: "Model used to compress history and generate title",
    },
    TextProcessModel: {
      Title: "text process model",
      SubTitle: "BasicModel used to translate/polish/.. the input text",
    },
    OCRModel: {
      Title: "ocr model",
      SubTitle: "Model used to extract text from input image",
    },
    // Params: {
    //   SessionInfo: "Session Info",
    //   temperature: "temperature",
    //   top_p: "top_p",
    //   max_tokens: "max_tokens",
    //   presence_penalty: "presence_penalty",
    //   frequency_penalty: "frequency_penalty",
    //   current_history: "current_history",
    // },
    Params: {
      SessionInfo: "Session Information",
      current_history: "Current History",
      temperature: {
        name: "Randomness (Temperature)",
        tip: "Controls the randomness of generated text (0–2). Higher values increase creativity, while lower values reduce hallucinations.",
      },
      top_p: {
        name: "Sampling Probability (Top-p)",
        tip: "Controls the diversity of generated text (0–1). Lower values make the content more focused. Typically used as an alternative to temperature.",
      },
      max_tokens: {
        name: "Maximum Response Length",
        tip: "Maximum length of generated text. For reasoning, visual dialogue, or code generation, a higher limit is recommended.",
      },
      presence_penalty: {
        name: "Topic Novelty",
        tip: "Encourages the model to explore new topics (-2 to 2). Higher values promote topic changes but may reduce coherence.",
      },
      frequency_penalty: {
        name: "Repetition Penalty",
        tip: "Reduces the likelihood of repeating words (-2 to 2). Higher values help avoid repetitive language.",
      },
      reasoning_effort: {
        name: "Reason Effort",
        tip: "Modified model inference effort program, currently only grok",
      },
    },
    Temperature: {
      Title: "Temperature",
      SubTitle: "A larger value makes the more random output",
    },
    TopP: {
      Title: "Top P",
      SubTitle: "Do not alter this value together with temperature",
    },
    MaxTokens: {
      Title: "Max Tokens",
      SubTitle: "Maximum length of input tokens and generated tokens",
    },
    PresencePenalty: {
      Title: "Presence Penalty",
      SubTitle:
        "A larger value increases the likelihood to talk about new topics",
    },
    FrequencyPenalty: {
      Title: "Frequency Penalty",
      SubTitle:
        "A larger value decreasing the likelihood to repeat the same line",
    },
    ReasoningEffort: {
      Title: "Reasoning Effort",
      SubTitle:
        "Effort and thought time of the constrained inference model, only for models and vendors that support this parameter (currently only grok)",
    },
    ParameterOverride: {
      Title: "Parameter Override",
      SubTitle: "Override model parameters with custom JSON configuration",
      ValidJson: "✓ Valid JSON",
      InvalidJson: "✗ Invalid JSON format",
      EnableInfo: "Parameter Override Enabled",
      EmptyParam: "No parameters specified",
    },
    DocumentUploadWarning:
      "⚠️The current Chat model does not support upload image or visual support is not configured.",
    TTS: {
      Enable: {
        Title: "Enable TTS",
        SubTitle: "Enable text-to-speech service",
      },
      Autoplay: {
        Title: "Enable Autoplay",
        SubTitle:
          "Automatically generate speech and play, you need to enable the text-to-speech switch first",
      },
      Model: "Model",
      Voice: {
        Title: "Voice",
        SubTitle: "The voice to use when generating the audio",
      },
      Speed: {
        Title: "Speed",
        SubTitle: "The speed of the generated audio",
      },
      Engine: "TTS Engine",
    },
  },
  Store: {
    DefaultTopic: "New Conversation",
    PrivateTopic: "Temporary Chat Window, Records Not Saved",
    BotHello: "Hello! How can I assist you today?",
    Error: "Something went wrong, please try again later.",
    Prompt: {
      History: (content: string) =>
        "This is a summary of the chat history as a recap: " + content,
      old_Topic:
        "Please generate a four to five word title summarizing our conversation without any lead-in, punctuation, quotation marks, periods, symbols, bold text, or additional text. Remove enclosing quotation marks.",
      Topic:
        "Create a concise, 3-8 words title with an emoji as a title for the prompt in the given language. Suitable Emojis for the summary can be used to enhance understanding but avoid quotation marks or special formatting. RESPOND ONLY WITH THE TITLE TEXT.\nExamples of titles:\n📉 Stock Market Trends\n🍪 Perfect Chocolate Chip Recipe\n🎵 Evolution of Music Streaming\n🎮 Video Game Development Insights",
      Summarize:
        "Summarize the discussion briefly in 200 words or less to use as a prompt for future context.",
    },
  },
  Copy: {
    Success: "Copied to clipboard",
    Failed: "Copy failed, please grant permission to access clipboard",
  },
  Download: {
    Success: "Content downloaded to your directory.",
    Failed: "Download failed.",
  },
  Context: {
    Toast: (x: any) => `With ${x} contextual prompts`,
    Edit: "Current Chat Settings",
    Add: "Add a Prompt",
    Clear: "Context Cleared",
    Revert: "Revert",
  },
  Discovery: {
    Name: "Discovery",
  },
  FineTuned: {
    Sysmessage: "You are an assistant that",
  },
  SearchChat: {
    Name: "Search",
    Page: {
      Title: "Search Chat History",
      Search: "Enter search query to search chat history",
      NoResult: "No results found",
      NoData: "No data",
      Loading: "Loading...",

      SubTitle: (count: number) => `Found ${count} results`,
    },
    Item: {
      View: "View",
    },
  },
  Mask: {
    Name: "Mask",
    Page: {
      Title: "Prompt Template",
      SubTitle: (count: number) => `${count} prompt templates`,
      Search: "Search Templates",
      Create: "Create",
    },
    Item: {
      Info: (count: number) => `${count} prompts`,
      Chat: "Chat",
      View: "View",
      Edit: "Edit",
      Delete: "Delete",
      DeleteConfirm: "Confirm to delete?",
    },
    EditModal: {
      Title: (readonly: boolean) =>
        `Edit Prompt Template ${readonly ? "(readonly)" : ""}`,
      Download: "Download",
      Clone: "Clone",
    },
    Config: {
      Avatar: "Bot Avatar",
      Name: "Bot Name",
      Sync: {
        Title: "Use Global Config",
        SubTitle: "Use global config in this chat",
        Confirm: "Confirm to override custom config with global config?",
      },
      HideContext: {
        Title: "Hide Context Prompts",
        SubTitle: "Do not show in-context prompts in chat",
      },
      Artifacts: {
        Title: "Enable Artifacts",
        SubTitle: "Can render HTML page when enable artifacts.",
      },
      CodeFold: {
        Title: "Enable CodeFold",
        SubTitle:
          "Automatically collapse/expand overly long code blocks when CodeFold is enabled",
      },
      FloatingButton: {
        Title: "Enable Floating Button",
        SubTitle:
          "View current session information and access shortcut functions from the floating ball when enabled.",
      },
      Share: {
        Title: "Share This Mask",
        SubTitle: "Generate a link to this mask",
        Action: "Copy Link",
      },
    },
  },
  NewChat: {
    Return: "Return",
    Skip: "Just Start",
    Title: "Pick a Mask",
    SubTitle: "Chat with the Soul behind the Mask",
    More: "Find More",
    Less: "Fold Code",
    NotShow: "Never Show Again",
    ConfirmNoShow: "Confirm to disable？You can enable it in settings later.",
    Searching: "Searching...",
    Search: "Search Results",
    NoSearch: "No Search Results",
    SearchFormat: (SearchTime?: number) =>
      SearchTime !== undefined
        ? `(Search for ${Math.round(SearchTime / 1000)} s)`
        : "",
    Thinking: "Thinking...",
    Think: "Content of Thought",
    NoThink: "No Thought",
    ThinkFormat: (thinkingTime?: number) =>
      thinkingTime !== undefined
        ? `(Thinking for ${Math.round(thinkingTime / 1000)} s)`
        : "",
    ArtifactsInfo:
      "You can enable/disable 'Artifacts Preview' and 'Code Fold' in settings. If the preview fails, please refresh the page.",
  },

  UI: {
    Confirm: "Confirm",
    Cancel: "Cancel",
    Close: "Close",
    Create: "Create",
    Edit: "Edit",
    Export: "Export",
    Import: "Import",
    Sync: "Sync",
    Config: "Config",
    SearchModel: "Search Model",
    SelectALL: "All Models",
    NoPresetRule: "No preset rules",
  },
  Exporter: {
    Description: {
      Title: "Only messages after clearing the context will be displayed",
    },
    Model: "Model",
    Messages: "Messages",
    Topic: "Topic",
    Time: "Time",
  },
  CustomProvider: {
    Title: "Custom AI Provider",
    AddButton: "Add Provider",
    Count: "Total {count} provider configurations",
    SearchPlaceholder: "Search AI providers or available models...",
    Loading: "Loading AI providers...",
    NoProviders: "No matching AI providers found",
    Edit: "Edit",
    Delete: "Delete",
    ConfirmDeleteProvider: "Are you sure you want to delete this AI provider?",
    Return: "Back",
    BasicInfo: "Basic Information",
    ModelConfig: "Model Configuration",
    APIConfig: "API Configuration",
    AdvancedConfig: "Advanced Settings",
    Name: "Name",
    NamePlaceholder: "e.g., OpenAI Official",
    Type: "Type",
    CustomAPI: "Custom API",
    DescriptionPlaceholder: "Add description (optional)",
    ApiKeyPlaceholder: "Enter your API Key",
    Show: "Show",
    Hide: "Hide",
    Previous: "Previous",
    Next: "Next",
    SaveChanges: "Save Changes",
    AddProvider: "Add Provider",
    DefaultOpenAIDescription: "Default OpenAI API Configuration",
    CustomAPIService: "Custom API Endpoint",
    CustomHostedDescription: "Self-hosted API Service",
    AdvancedOptions: "Advanced Options",
    NoAdvancedOptions: "No additional advanced options available.",
    TypeSubtitle: "Select your AI service provider type",
    NameSubtitle: "Set a recognizable name for your AI provider",
    ApiUrlSubtitle: "Base API URL. For OpenAI, use: https://api.openai.com",
    ApiKeySubtitle:
      "Your API key will be securely stored locally and used for API requests",
    ApiNameRequired: "API name is required",
    ApiUrlRequired: "API URL is required",
    ApiKeyRequired: "API key is required",
    ApiConfigRequired: "Please fill in API Key and API URL first",
    ModelNameRequired: "Please fill in Model Name first",
    SearchModel: "Search models...",
    Select: {
      All: "Select All",
      Clear: "Clear",
    },
    AddModels: "Add Models",
    RefreshModels: "Refresh Models",
    LoadingModels: "Loading model list...",
    ModelExists: "Duplicate model exists",
    NoModelsFound: "No models found",
    NoModelsFoundHint:
      "Verify API information and try refreshing the model list",
    NoModels: "No models available",
    NoSelectedModels: "No selected models",
    ModelsCount: "{count} models",
    ProviderUpdated: "Provider updated",
    ProviderAdded: "Provider added",
    ProviderEnabled: "Provider enabled",
    ProviderDisabled: "Provider disabled",
    ToggleEnable: "Click to enable",
    ToggleDisable: "Click to disable",
    Status: {
      Enabled: "Enabled",
      Disabled: "Disabled",
    },
    EmptyTitle: "No AI Providers",
    EmptyDescription: 'Click the "Add Provider" button to create one',
    EmptySearchDescription: "Try different keywords or clear search filters",
    ParsingPlaceholder:
      "Please provide a sample request or the text containing the API information you would like me to parse.",
    IntelligentParsing: "IntelligentParsing",
    KeyListView: "Key List View",
    NormalView: "Normal View",
    AddKey: "Add Key",
    ClearInput: "Clear Input",
    RefreshBalance: "Refresh Balance",
    RemoveInvalidKey: "Remove Invalid Key",
    NoKeysAdded: "No API Keys Added Yet",
    NewKeyPlaceholder: "Enter a new API key",
    EditModel: {
      EditModelFeature: "Edit model's features",
      ModelID: "Model ID: ",
      DisplayName: "Display Name: ",
      Description: "Description: ",
      VisionSupport: "Enable Vision:",
      Cancel: "Cancel",
      Save: "Save",
      ErrorJson: "Invalid format. Please provide a valid JSON object.",
      SuccessJson: "Model alias mapping has been successfully applied.",
      CardView: "Card View",
      JsonView: "JSON View",
      ApplyJson: "Apply JSON Mapping",
      EditJson: 'Edit JSON mapping (format: "Model: Model Alias")',
    },
  },
  URLCommand: {
    Code: "Detected access code from url, confirm to apply? ",
    Settings: "Detected settings from url, confirm to apply?",
  },
};

export default en;
