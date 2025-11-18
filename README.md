# AI Tab Classifier

一个智能的Chrome浏览器扩展，使用AI自动分析和分类您的标签页，帮助您更好地组织浏览器标签。

## ✨ 功能特性

- 🤖 **AI智能分类**: 使用AI自动分析标签页内容并按主题分组
- 🎨 **多彩分组**: 自动为不同主题分配不同颜色
- 🔐 **隐私安全**: API密钥本地存储，不经过第三方服务器
- 🌐 **多平台支持**: 支持OpenAI、Anthropic (Claude)、DeepSeek、Google Gemini等多种AI平台
- ⚙️ **灵活配置**: 支持自定义API端点和模型

## 📦 安装方法

### 方式一：开发者模式安装（推荐）

1. 打开Chrome浏览器，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择本项目的文件夹

### 方式二：生成图标后安装

由于扩展需要图标文件，请先生成图标：

```bash
cd ai-tab-classifier
# 使用在线工具或设计软件创建以下尺寸的图标：
# - icon16.png (16x16)
# - icon48.png (48x48)
# - icon128.png (128x128)
# 并将它们放在 icons/ 目录下
```

或者使用临时方案：创建任意PNG图片并重命名为上述文件名。

## 🚀 使用方法

### 1. 配置API

首次使用需要配置AI API：

1. 点击浏览器工具栏中的扩展图标
2. 选择API提供商（OpenAI、Anthropic、DeepSeek、Gemini或自定义）
3. 输入您的API Key
4. 选择合适的模型（如 `gpt-3.5-turbo`、`claude-3-haiku-20240307`、`deepseek-chat` 或 `gemini-2.5-flash-lite`）
5. 点击"保存配置"

### 2. 开始分类

1. 打开多个标签页（建议5个以上效果更明显）
2. 点击扩展图标
3. 点击"开始分类标签页"按钮
4. 等待AI分析完成（通常需要5-10秒）
5. 标签页将自动按主题分组并显示不同颜色

### 3. 管理分组

- **查看分组**: 分类完成后会显示每个分组的名称和标签数量
- **取消分组**: 点击"取消所有分组"按钮可以移除所有分组
- **重新分类**: 可以随时重新点击"开始分类标签页"重新分组

## 🔑 获取API Key

### OpenAI
1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 注册/登录账户
3. 进入 API Keys 页面创建新的API Key

### Anthropic (Claude)
1. 访问 [Anthropic Console](https://console.anthropic.com/)
2. 注册/登录账户
3. 在API Keys页面创建新的API Key

### DeepSeek
1. 访问 [DeepSeek Platform](https://platform.deepseek.com/)
2. 注册/登录账户
3. 在API Keys页面创建新的API Key

### Google Gemini
1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 登录Google账户
3. 点击"Get API Key"创建新的API Key

### 自定义API
如果您使用兼容OpenAI格式的API（如国内的第三方服务），选择"自定义"并填入：
- API端点（如 `https://api.example.com/v1/chat/completions`）
- 您的API Key
- 模型名称

## 📋 支持的AI模型

### OpenAI
- `gpt-3.5-turbo` (推荐，速度快且经济)
- `gpt-4`
- `gpt-4-turbo`

### Anthropic
- `claude-3-haiku-20240307` (推荐，速度快)
- `claude-3-sonnet-20240229`
- `claude-3-opus-20240229`

### DeepSeek
- `deepseek-chat` (推荐，性价比高)
- `deepseek-coder`

### Google Gemini
- `gemini-2.5-flash-lite` (推荐，速度快且免费)
- `gemini-2.5-flash`
- `gemini-2.5-pro`

## 🎯 分类示例

扩展会将标签页智能分为不同主题，例如：

- 🛍️ **购物** (红色): 淘宝、京东、亚马逊等
- 📰 **新闻** (蓝色): 新闻网站、博客等
- 💻 **开发** (绿色): GitHub、Stack Overflow、技术文档等
- 🎬 **娱乐** (紫色): YouTube、Netflix、游戏网站等
- 📚 **学习** (黄色): 在线课程、教育网站等
- 🏢 **工作** (灰色): 办公软件、邮箱等

## 🛠️ 技术栈

- Chrome Extensions Manifest V3
- JavaScript (原生)
- Chrome APIs (tabs, tabGroups, storage)
- OpenAI/Anthropic API

## 📝 文件结构

```
ai-tab-classifier/
├── manifest.json          # 扩展配置文件
├── popup.html            # 弹出页面HTML
├── popup.css             # 弹出页面样式
├── popup.js              # 弹出页面逻辑
├── background.js         # 后台服务worker
├── icons/                # 图标目录
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # 说明文档
```

## ⚠️ 注意事项

1. **API费用**: 使用AI API会产生费用，请注意控制使用频率
2. **隐私保护**: 标签页的标题和URL会发送给AI进行分析
3. **标签数量**: 建议一次分类的标签页数量在100个以内，过多可能导致API响应超时
4. **网络要求**: 需要能访问您选择的AI API服务

## 🐛 故障排除

### API请求失败
- 检查API Key是否正确
- 确认网络连接正常
- 检查API服务是否可访问
- 查看是否有足够的API配额

### 分组不准确
- 尝试使用更强大的模型（如GPT-4或Claude-3-Opus）
- 确保标签页标题清晰明确
- 减少一次分类的标签页数量

### 扩展无法加载
- 确保所有必需的文件都存在
- 检查图标文件是否正确放置
- 查看Chrome扩展页面的错误信息

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📧 联系方式

如有问题或建议，请创建Issue。

---

**享受智能的标签管理体验！** 🚀
