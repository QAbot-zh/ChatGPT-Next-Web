<div align="center">
<img src="./docs/images/icon.svg" alt="预览"/>

<h1 align="center">NextraChat</h1>

基于 ChatGPTNextWeb 的增强版本，侧重维护 OpenAI 兼容渠道、模型管理和更完整的对话工作流。

[当前主文档](./README.md) / [原项目](https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FQAbot-zh%2FChatGPT-Next-Web&env=OPENAI_API_KEY&env=CODE&project-name=chatgpt-next-web&repository-name=ChatGPT-Next-Web)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/ZBUEFA)

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/QAbot-zh/ChatGPT-Next-Web)

![主界面](./docs/images/cover.png)

</div>

## 当前增强功能速览

> 这一节用于同步当前仓库的新功能；更完整的功能、环境变量和部署说明请优先查看 [README.md](./README.md)。

### 对话与消息工作流

- **双模型对话模式**：左右分栏同时查看主模型和副模型回复，支持独立副模型配置。
- **树形会话 / 分支导航**：直接重试、补充要求后重试会形成分支；支持列表、结构和图形化树状导航，可在 user/assistant 消息上切换分支，并删除失败节点及其后续子树。
- **重试增强**：支持「直接重试」和「补充要求后重试」，重试时保留引用、图片和文件附件。
- **继续补全**：一键要求模型续写上文，可自定义继续补全提示词，并可隐藏继续补全产生的 user 消息。
- **上下文管理**：清除上下文会显示分隔提示；默认历史消息数为 `10`，历史压缩阈值为 `2000`。

### 模型、渠道与设置

- **自定义 AI 提供商**：支持 OpenAI/DeepSeek/SiliconFlow 类型渠道，单渠道多密钥、余额查询、模型拉取与测试、模型别名和视觉能力配置。
- **服务器代理**：自定义渠道可通过服务端代理请求，规避浏览器 CORS 限制，可用 `DISABLE_CUSTOM_PROXY` 禁用。
- **模型选择器增强**：支持模型描述、标签筛选、搜索和 `@` 快捷切换。
- **参数注入**：支持前端「参数覆盖」和服务端 `MODEL_PARAMS` 按模型注入请求参数。
- **TTS 朗读**：支持 OpenAI TTS 与 Edge TTS，可配置模型、音色、语速和自动朗读。

### 展示、工具与分享

- **Artifacts 与代码块预览**：HTML、SVG、Mermaid 代码块支持预览、下载和分享；长代码块支持折叠、复制、下载和编辑。
- **Python 在线运行**：基于 Piston 执行 Python 代码块，支持 stdin、无输出提示、危险操作检测和输出复制。
- **Mermaid 增强**：渲染失败时显示错误详情，并提供官方文档和编辑器入口。
- **公式与思考过程**：公式支持 LaTeX/MathML/Word HTML 复制；`<think>` / `reasoning_content` 支持折叠、计时和复制。
- **分享与导出**：聊天记录和 Artifacts 可上传到 Cloudflare KV 生成分享链接，双模型会话支持选择导出主/副模型内容。
- **云备份**：支持通过文件服务器进行设置、提示词、角色、自定义渠道和会话数据的同步备份。

## 开始使用

1. 准备好你的 [OpenAI API Key](https://platform.openai.com/account/api-keys);
2. 点击右侧按钮开始部署：
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FQAbot-zh%2FChatGPT-Next-Web&env=OPENAI_API_KEY&env=CODE&env=GOOGLE_API_KEY&project-name=chatgpt-next-web&repository-name=ChatGPT-Next-Web)，直接使用 Github 账号登录即可，记得在环境变量页填入 API Key 和[页面访问密码](#配置页面访问密码) CODE；
3. 部署完毕后，即可开始使用；
4. （可选）[绑定自定义域名](https://vercel.com/docs/concepts/projects/domains/add-a-domain)：Vercel 分配的域名 DNS 在某些区域被污染了，绑定自定义域名即可直连。

## 保持更新

如果你按照上述步骤一键部署了自己的项目，可能会发现总是提示“存在更新”的问题，这是由于 Vercel 会默认为你创建一个新项目而不是 fork 本项目，这会导致无法正确地检测更新。
推荐你按照下列步骤重新部署：

- 删除掉原先的仓库；
- 使用页面右上角的 fork 按钮，fork 本项目；
- 在 Vercel 重新选择并部署，[请查看详细教程](./docs/vercel-cn.md#如何新建项目)。

### 打开自动更新

> 如果你遇到了 Upstream Sync 执行错误，请手动 Sync Fork 一次！

当你 fork 项目之后，由于 Github 的限制，需要手动去你 fork 后的项目的 Actions 页面启用 Workflows，并启用 Upstream Sync Action，启用之后即可开启每小时定时自动更新：

![自动更新](./docs/images/enable-actions.jpg)

![启用自动更新](./docs/images/enable-actions-sync.jpg)

### 手动更新代码

如果你想让手动立即更新，可以查看 [Github 的文档](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork) 了解如何让 fork 的项目与上游代码同步。

你可以 star/watch 本项目或者 follow 作者来及时获得新功能更新通知。

## 配置页面访问密码

> 配置密码后，用户需要在设置页手动填写访问码才可以正常聊天，否则会通过消息提示未授权状态。

> **警告**：请务必将密码的位数设置得足够长，最好 7 位以上，否则[会被爆破](https://github.com/Yidadaa/ChatGPT-Next-Web/issues/518)。

本项目提供有限的权限控制功能，请在 Vercel 项目控制面板的环境变量页增加名为 `CODE` 的环境变量，值为用英文逗号分隔的自定义密码：

```
code1,code2,code3
```

增加或修改该环境变量后，请**重新部署**项目使改动生效。

## 环境变量

> 本项目大多数配置项都通过环境变量来设置，教程：[如何修改 Vercel 环境变量](./docs/vercel-cn.md)。
> 增强版完整环境变量表格与示例请优先查看 [README.md#环境变量](./README.md#环境变量)。

### `OPENAI_API_KEY` （必填项）

OpanAI 密钥，你在 openai 账户页面申请的 api key，使用英文逗号隔开多个 key，这样可以随机轮询这些 key。

### `CODE` （可选）

访问密码，可选，可以使用逗号隔开多个密码。

**警告**：如果不填写此项，则任何人都可以直接使用你部署后的网站，可能会导致你的 token 被急速消耗完毕，建议填写此选项。

### `BASE_URL` （可选）

> Default: `https://api.openai.com`

> Examples: `http://your-openai-proxy.com`

OpenAI 接口代理 URL，如果你手动配置了 openai 接口代理，请填写此选项。

> 如果遇到 ssl 证书问题，请将 `BASE_URL` 的协议设置为 http。

### `OPENAI_ORG_ID` （可选）

指定 OpenAI 中的组织 ID。

### `AZURE_URL` （可选）

> 形如：https://{azure-resource-url}/openai/deployments/{deploy-name}

Azure 部署地址。

### `AZURE_API_KEY` （可选）

Azure 密钥。

### `AZURE_API_VERSION` （可选）

Azure Api 版本，你可以在这里找到：[Azure 文档](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#chat-completions)。

### `GOOGLE_API_KEY` (optional)

Google Gemini Pro 密钥.

### `GOOGLE_URL` (optional)

Google Gemini Pro Api Url.

### `ANTHROPIC_API_KEY` (optional)

anthropic claude Api Key.

### `ANTHROPIC_API_VERSION` (optional)

anthropic claude Api version.

### `ANTHROPIC_URL` (optional)

anthropic claude Api Url.

### `HIDE_USER_API_KEY` （可选）

如果你不想让用户自行填入 API Key，将此环境变量设置为 1 即可。

### `DISABLE_GPT4` （可选）

如果你不想让用户使用 GPT-4，将此环境变量设置为 1 即可。

### `ENABLE_BALANCE_QUERY` （可选）

如果你想启用余额查询功能，将此环境变量设置为 1 即可。

### `DISABLE_FAST_LINK` （可选）

如果你想禁用从链接解析预制设置，将此环境变量设置为 1 即可。

### `DISABLE_CUSTOM_PROXY` （可选）

如果你想禁用自定义渠道的服务器代理功能，将此环境变量设置为 1 即可。

> 自定义渠道代理功能允许用户通过服务器转发请求到第三方 API，解决浏览器跨域限制问题。如果你不希望用户使用此功能，可以通过此环境变量禁用。

### `DISABLE_VERCEL_INSIGHTS` （可选）

如果你想禁用 Vercel Analytics 和 Speed Insights，将此环境变量设置为 1 即可。Cloudflare Pages 部署建议配置该变量，避免请求 `/_vercel/insights/script.js` 和 `/_vercel/speed-insights/script.js`。

### `WHITE_WEBDEV_ENDPOINTS` (可选)

如果你想增加允许访问的webdav服务地址，可以使用该选项，格式要求：
- 每一个地址必须是一个完整的 endpoint
> `https://xxxx/xxx`
- 多个地址以`,`相连

### `CUSTOM_MODELS` （可选）

> 示例：`+qwen-7b-chat,+glm-6b,-gpt-3.5-turbo,gpt-4-1106-preview=gpt-4-turbo` 表示增加 `qwen-7b-chat` 和 `glm-6b` 到模型列表，而从列表中删除 `gpt-3.5-turbo`，并将 `gpt-4-1106-preview` 模型名字展示为 `gpt-4-turbo`。
> 如果你想先禁用所有模型，再启用指定模型，可以使用 `-all,+gpt-3.5-turbo`，则表示仅启用 `gpt-3.5-turbo`

用来控制模型列表，使用 `+` 增加一个模型，使用 `-` 来隐藏一个模型，使用 `模型名=展示名` 来自定义模型的展示名，用英文逗号隔开。

### `DEFAULT_INPUT_TEMPLATE` （可选）
自定义默认的 template，用于初始化『设置』中的『用户输入预处理』配置项

## 自定义渠道代理

自定义渠道支持通过服务器代理转发请求，解决浏览器直接调用第三方 API 时的跨域（CORS）限制问题。

### 使用方法

1. 进入「自定义渠道」设置页面
2. 编辑或新建渠道
3. 勾选「服务器代理」选项
4. 保存配置

也可以在渠道列表页面直接点击「代理/直连」按钮快速切换。

### 工作原理

```
浏览器 → /api/custom-proxy/[path] → 服务端 → 第三方 API
                    ↑
          X-Proxy-Target: https://api.xxx.com
```

启用代理后，请求会通过服务端转发，避免浏览器的跨域限制。

### 服务端控制

管理员可以通过环境变量 `DISABLE_CUSTOM_PROXY=1` 禁用此功能。

## 开发

点击下方按钮，开始二次开发：

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/QAbot-zh/ChatGPT-Next-Web)

在开始写代码之前，需要在项目根目录新建一个 `.env.local` 文件，里面填入环境变量：

```
OPENAI_API_KEY=<your api key here>

# 中国大陆用户，可以使用本项目自带的代理进行开发，你也可以自由选择其他代理地址
BASE_URL=https://b.nextweb.fun/api/proxy
```

### 本地开发

1. 安装 nodejs 18 和 yarn，具体细节请询问 ChatGPT；
2. 执行 `yarn install && yarn dev` 即可。⚠️ 注意：此命令仅用于本地开发，不要用于部署！
3. 如果你想本地部署，请使用 `yarn install && yarn build && yarn start` 命令，你可以配合 pm2 来守护进程，防止被杀死，详情询问 ChatGPT。

## 部署

### 容器部署 （推荐）

> Docker 版本需要在 20 及其以上，否则会提示找不到镜像。

> ⚠️ 注意：docker 版本在大多数时间都会落后最新的版本 1 到 2 天，所以部署后会持续出现“存在更新”的提示，属于正常现象。

```shell
docker pull yidadaa/chatgpt-next-web

docker run -d -p 3000:3000 \
   -e OPENAI_API_KEY=sk-xxxx \
   -e CODE=页面访问密码 \
   yidadaa/chatgpt-next-web
```

你也可以指定 proxy：

```shell
docker run -d -p 3000:3000 \
   -e OPENAI_API_KEY=sk-xxxx \
   -e CODE=页面访问密码 \
   --net=host \
   -e PROXY_URL=http://127.0.0.1:7890 \
   yidadaa/chatgpt-next-web
```

如果你的本地代理需要账号密码，可以使用：

```shell
-e PROXY_URL="http://127.0.0.1:7890 user password"
```

如果你需要指定其他环境变量，请自行在上述命令中增加 `-e 环境变量=环境变量值` 来指定。

### 本地部署

在控制台运行下方命令：

```shell
bash <(curl -s https://raw.githubusercontent.com/QAbot-zh/ChatGPT-Next-Web/main/scripts/setup.sh)
```

⚠️ 注意：如果你安装过程中遇到了问题，请使用 docker 部署。

## 鸣谢

### 捐赠者

> 见英文版。

### 贡献者

[见项目贡献者列表](https://github.com/QAbot-zh/ChatGPT-Next-Web/graphs/contributors)

### 相关项目

- [one-api](https://github.com/songquanpeng/one-api): 一站式大模型额度管理平台，支持市面上所有主流大语言模型

## 开源协议

[MIT](https://opensource.org/license/mit/)
