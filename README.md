# Z All-in-One API

OpenAI-compatible API wrapper for Z.ai services (Chat, Image, Audio).

---

## 繁體中文介紹

Z All-in-One API 是一個將 Z.ai 服務（聊天、圖像、音頻）包裝成 OpenAI 相容 API 的 Cloudflare Worker。

### 服務內容
- **聊天**: https://chat.z.ai - GLM 模型（文字與視覺）
- **圖像**: https://image.z.ai - 圖像生成
- **音頻**: https://audio.z.ai - 文字轉語音與語音克隆

### Web 介面功能
- **繁體中文介面**：完整的中文使用者介面，方便使用
- **API Key 管理**：安全的 token 儲存，使用 localStorage
- **API 端點顯示**：顯示當前 API 地址，支援點擊複製
- **多張圖片生成**：一次可生成 1-4 張圖片
- **成人內容選項**：可選擇是否生成成人圖片

---

### Services Wrapped
- **Chat**: https://chat.z.ai - GLM models (text & vision)
- **Image**: https://image.z.ai - Image generation
- **Audio**: https://audio.z.ai - Text-to-speech & voice cloning

### Web Interface
- **Traditional Chinese UI**: Full Chinese interface for easy use
- **API Key Management**: Secure token storage with localStorage
- **API Endpoint Display**: Shows current API address with copy functionality

## Features

### 1. Chat Completion
- **Endpoint**: `/v1/chat/completions`
- **Models**:
  - GLM-4.7
  - GLM-4.7-thinking
  - GLM-4.5
  - GLM-4.6
  - GLM-4.5-thinking
  - GLM-4.6-thinking
  - GLM-4.5-V (vision)
  - GLM-4.6-V (vision)
  - GLM-4.5-Air
  - 0808-360B-DR
- **Features**:
  - Streaming support
  - Vision models (image input)
  - Thinking mode (reasoning)
  - Anonymous access (use "free" as token)

### 2. Image Generation
- **Endpoint**: `/v1/images/generations`
- **Model**: glm-image
- **Aspect Ratios**: 1:1, 3:4, 4:3, 16:9, 9:16, 21:9, 9:21
- **Resolutions**: 1K, 2K
- **Options**:
  - Custom prompts
  - Watermark removal
  - Multiple aspect ratios
  - **Multiple images**: Generate 1-4 images at once
  - **Adult content**: Optional adult image generation

### 3. Audio Synthesis
- **Endpoint**: `/v1/audio/speech`
- **Models**: tts-1, tts-1-hd
- **Official Voices**:
  - Lila (system_001) - Cheerful female
  - Ethan (system_002) - Sunny male
  - Chloe (system_003) - Gentle female
- **Options**:
  - Speed: 0.5x - 2.0x
  - Volume: 0-10
  - Custom voice cloning

### 4. Voice Cloning
- **Upload Endpoint**: `/v1/audio/voices/upload`
- **Clone Endpoint**: `/v1/audio/voices/clone`
- **List Endpoint**: `/v1/audio/voices`
- **Requirements**:
  - Audio file (min 3 seconds)
  - Voice name
  - Sample text transcription

## Setup / 安裝設定

1. Install dependencies / 安裝依賴：
```bash
npm install
```

2. Configure environment variables / 設定環境變量：

Create a `.dev.vars` file for local development / 建立本地開發用的 `.dev.vars` 檔案：
```bash
# .dev.vars
DEFAULT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

For production deployment, set the environment variable in Cloudflare dashboard / 生產環境部署時，在 Cloudflare 控制台設定環境變量：
- Go to Cloudflare Dashboard → Workers & Pages → Your Worker → Settings → Variables
- Add `DEFAULT_API_KEY` with your session token value

3. Run locally / 本地執行：
```bash
wrangler dev
```

4. Deploy to Cloudflare / 部署到 Cloudflare：
```bash
wrangler deploy
```

## Authentication / 身份驗證

### Getting Your Token / 獲取您的 Token

1. Open `image.z.ai` or `audio.z.ai` in browser / 在瀏覽器中打開 `image.z.ai` 或 `audio.z.ai`
2. Press F12 → Application tab / 按 F12 → 應用程式分頁
3. Expand Cookies → Click website URL / 展開 Cookies → 點擊網站 URL
4. Copy the `session` cookie value (starts with "ey") / 複製 `session` cookie 的值（以 "ey" 開頭）

### Using Tokens / 使用 Token

There are two ways to provide authentication / 有兩種方式提供身份驗證：

#### Method 1: Environment Variable (Recommended) / 方法 1：環境變量（推薦）

Set `DEFAULT_API_KEY` in your Cloudflare Worker environment variables / 在 Cloudflare Worker 環境變量中設定 `DEFAULT_API_KEY`：

```bash
# In .dev.vars for local development
DEFAULT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Or in Cloudflare Dashboard for production
# Settings → Variables → Add Variable
# Name: DEFAULT_API_KEY
# Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Advantages / 優點：**
- All requests automatically authenticated / 所有請求自動驗證
- No need to pass Authorization header / 不需要傳遞 Authorization header
- Secure server-side storage / 安全的伺服器端儲存

#### Method 2: Authorization Header / 方法 2：Authorization Header

Pass the token in the Authorization header / 在 Authorization header 中傳遞 token：

```bash
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Priority / 優先順序：**
1. Authorization header (if provided) / Authorization header（如果提供）
2. Environment variable `DEFAULT_API_KEY` / 環境變量 `DEFAULT_API_KEY`

### Service Requirements / 服務需求

- **Chat**: Optional (use "free" for anonymous) / 可選（使用 "free" 進行匿名訪問）
- **Image**: Required (session token) / 必需（session token）
- **Audio**: Required (session token) / 必需（session token）

Token is saved in localStorage and persists across page refreshes. / Token 會儲存在 localStorage 中，重新整理頁面後仍然有效。

## API Usage / API 使用方式

### Chat Example / 聊天範例
```bash
curl http://localhost:8787/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer free" \
  -d '{
    "model": "GLM-4.6",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

### Image Example / 圖像生成範例
```bash
curl http://localhost:8787/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer session=eyJhbGc..." \
  -d '{
    "prompt": "A beautiful sunset",
    "ratio": "16:9",
    "resolution": "2K",
    "adult_content": false
  }'
```

**Parameters / 參數**:
- `prompt` (required): Image description / 圖像描述
- `ratio` (optional): Aspect ratio (default: "1:1") / 寬高比（預設："1:1"）
- `resolution` (optional): Image resolution (default: "1K") / 解析度（預設："1K"）
- `adult_content` (optional): Enable adult content (default: false) / 啟用成人內容（預設：false）
- `remove_watermark` (optional): Remove watermark (default: true) / 移除浮水印（預設：true）

### Audio Example / 音頻範例
```bash
curl http://localhost:8787/v1/audio/speech \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "input": "Hello world",
    "voice": "Lila",
    "speed": 1.0,
    "volume": 1
  }' \
  --output audio.wav
```

## Web Interface

Access the web UI at `http://localhost:8787/` for:
- **Traditional Chinese Interface**: Full Chinese UI for easy navigation
- **API Key Management**: Secure token storage with localStorage
- **API Endpoint Display**: Shows current API address with copy functionality
- **Interactive Testing**: Test all services directly in browser
- **Voice Selection**: Choose from official and custom voices
- **Voice Cloning**: Upload and clone custom voices
- **Real-time Preview**: See results instantly
- **Multiple Image Generation**: Generate 1-4 images at once
- **Adult Content Toggle**: Optional adult image generation

## Models List Endpoint / 模型列表端點

```bash
curl http://localhost:8787/v1/models
```

Returns all available models for chat, image, and audio. / 返回聊天、圖像和音頻的所有可用模型。

## Notes / 注意事項

- Chat supports vision models (GLM-4.5-V, GLM-4.6-V) with image URLs / 聊天支援視覺模型（GLM-4.5-V, GLM-4.6-V），可使用圖片 URL
- Image generation requires valid session token / 圖像生成需要有效的 session token
- Audio supports custom voice cloning with uploaded samples / 音頻支援使用上傳的樣本進行自定義語音克隆
- All endpoints support CORS for web applications / 所有端點都支援 CORS，適用於網頁應用程式
- **Environment variable `DEFAULT_API_KEY` provides server-side authentication** / **環境變量 `DEFAULT_API_KEY` 提供伺服器端驗證**
- Authorization header overrides environment variable / Authorization header 會覆蓋環境變量
- Tokens are stored locally in browser (not on server) / Token 儲存在瀏覽器本地（不在伺服器上）
- Web UI is fully localized in Traditional Chinese / Web 介面已完全本地化為繁體中文
- API Key is saved in localStorage and persists across page refreshes / API Key 儲存在 localStorage 中，重新整理頁面後仍然有效
- Multiple images can be generated simultaneously (1-4 images) / 可同時生成多張圖片（1-4 張）
- Adult content generation is optional and requires explicit enablement / 成人內容生成為可選功能，需要明確啟用

## License / 授權

MIT
