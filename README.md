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
- **API Key 顯示**：可選擇顯示或隱藏當前 API Key，支援完整顯示或環境變量狀態
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
- **API Key Display**: Toggle visibility to show/hide current API key, supports full display or environment variable status
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

### 1. Install dependencies / 安裝依賴
```bash
npm install
```

### 2. Configure API Key / 設定 API Key

#### Getting Your Session Token / 獲取 Session Token

1. Open `image.z.ai` or `audio.z.ai` in browser / 在瀏覽器中打開 `image.z.ai` 或 `audio.z.ai`
2. Press F12 → Application tab / 按 F12 → 應用程式分頁
3. Expand Cookies → Click website URL / 展開 Cookies → 點擊網站 URL
4. Copy the `session` cookie value (starts with "ey") / 複製 `session` cookie 的值（以 "ey" 開頭）

#### Method 1: Environment Variable (Recommended) / 方法 1：環境變量（推薦）

**For Local Development / 本地開發：**

Create a `.dev.vars` file in the project root / 在專案根目錄建立 `.dev.vars` 檔案：
```bash
# .dev.vars
DEFAULT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**For Production / 生產環境：**

Set the environment variable in Cloudflare dashboard / 在 Cloudflare 控制台設定環境變量：
1. Go to Cloudflare Dashboard → Workers & Pages → Your Worker → Settings → Variables
2. Click "Add Variable" / 點擊「新增變數」
3. Name: `DEFAULT_API_KEY`
4. Value: Paste your session token / 貼上您的 session token
5. Click "Encrypt" (recommended) / 點擊「加密」（推薦）
6. Click "Save" / 點擊「儲存」

**Advantages / 優點：**
- All requests automatically authenticated / 所有請求自動驗證
- No need to pass Authorization header / 不需要傳遞 Authorization header
- Secure server-side storage / 安全的伺服器端儲存
- Easy to manage in production / 生產環境易於管理

#### Method 2: Web UI API Key Input / 方法 2：Web UI API Key 輸入

1. Access the web UI at `http://localhost:8787/` / 訪問 Web UI `http://localhost:8787/`
2. Enter your session token in the "API Key" field / 在「API Key」欄位輸入您的 session token
3. Click "儲存" (Save) / 點擊「儲存」
4. The API key will be saved in localStorage / API Key 將儲存在 localStorage 中

**Features / 功能：**
- Persistent storage across page refreshes / 重新整理頁面後仍然有效
- Clear button to revert to environment variable / 清除按鈕可恢復使用環境變量
- Status indicator shows current authentication state / 狀態指示器顯示當前驗證狀態

#### Method 3: Authorization Header / 方法 3：Authorization Header

Pass the token in the Authorization header / 在 Authorization header 中傳遞 token：
```bash
-H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Priority / 優先順序：**
1. Authorization header (if provided) / Authorization header（如果提供）
2. Web UI API Key (if set) / Web UI API Key（如果已設定）
3. Environment variable `DEFAULT_API_KEY` / 環境變量 `DEFAULT_API_KEY`

### 3. Run locally / 本地執行
```bash
wrangler dev
```

### 4. Deploy to Cloudflare / 部署到 Cloudflare
```bash
wrangler deploy
```

## Authentication / 身份驗證

### Service Requirements / 服務需求

- **Chat**: Optional (use "free" for anonymous) / 可選（使用 "free" 進行匿名訪問）
- **Image**: Required (session token) / 必需（session token）
- **Audio**: Required (session token) / 必需（session token）

### Authentication Methods / 驗證方式

There are three ways to provide authentication / 有三種方式提供身份驗證：

1. **Environment Variable** (Recommended for production) / 環境變量（生產環境推薦）
2. **Web UI API Key Input** (Easy for testing) / Web UI API Key 輸入（測試方便）
3. **Authorization Header** (For API clients) / Authorization Header（API 客戶端）

See the "Setup / 安裝設定" section above for detailed instructions. / 詳細說明請參閱上方的「Setup / 安裝設定」章節。

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
- **API Key Display**: Toggle visibility to show/hide current API key, supports full display or environment variable status
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
- **API Key visibility can be toggled in Web UI** / **Web UI 中可切換 API Key 顯示/隱藏**
- When using environment variable, API Key display shows "環境變量 API Key（已設定）" in green / 使用環境變量時，API Key 顯示為綠色的「環境變量 API Key（已設定）」
- When using custom API Key, the full key is displayed in gray / 使用自定義 API Key 時，顯示完整的 key（灰色）
- Multiple images can be generated simultaneously (1-4 images) / 可同時生成多張圖片（1-4 張）
- Adult content generation is optional and requires explicit enablement / 成人內容生成為可選功能，需要明確啟用

---

## Roo Code 使用說明 / Roo Code Usage Guide

### 在 Roo Code 中使用此 API / Using this API in Roo Code

#### 1. 設定環境變量 / Set Environment Variables

在 Roo Code 的專案設定中，將 API 端點和 API Key 設定為環境變量：

```bash
# 在 Roo Code 專案中設定環境變量
ZAI_API_BASE_URL=http://localhost:8787
ZAI_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 2. 聊天對話範例 / Chat Example

```javascript
// 在 Roo Code 中使用聊天 API
const response = await fetch(`${process.env.ZAI_API_BASE_URL}/v1/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.ZAI_API_KEY}`
  },
  body: JSON.stringify({
    model: 'GLM-4.6',
    messages: [
      { role: 'user', content: '請用繁體中文回答：什麼是人工智慧？' }
    ],
    stream: false
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

#### 3. 圖像生成範例 / Image Generation Example

```javascript
// 在 Roo Code 中生成圖像
const response = await fetch(`${process.env.ZAI_API_BASE_URL}/v1/images/generations`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.ZAI_API_KEY}`
  },
  body: JSON.stringify({
    prompt: '一隻可愛的橘色貓咪在陽光下睡覺，風格為水彩畫',
    ratio: '16:9',
    resolution: '2K',
    adult_content: false
  })
});

const data = await response.json();
console.log('生成的圖片 URL:', data.data[0].url);
```

#### 4. 音頻合成範例 / Audio Synthesis Example

```javascript
// 在 Roo Code 中生成音頻
const response = await fetch(`${process.env.ZAI_API_BASE_URL}/v1/audio/speech`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.ZAI_API_KEY}`
  },
  body: JSON.stringify({
    input: '你好，這是一個測試音頻。',
    voice: 'Lila',
    speed: 1.0,
    volume: 1
  })
});

const audioBuffer = await response.arrayBuffer();
// 保存音頻文件
fs.writeFileSync('output.wav', Buffer.from(audioBuffer));
```

#### 5. 語音克隆範例 / Voice Cloning Example

```javascript
// 上傳語音樣本
const uploadResponse = await fetch(`${process.env.ZAI_API_BASE_URL}/v1/audio/voices/upload`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.ZAI_API_KEY}`
  },
  body: formData // 包含音頻文件
});

const uploadData = await uploadResponse.json();
const voiceId = uploadData.voice_id;

// 克隆語音
const cloneResponse = await fetch(`${process.env.ZAI_API_BASE_URL}/v1/audio/voices/clone`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.ZAI_API_KEY}`
  },
  body: JSON.stringify({
    voice_id: voiceId,
    name: '我的自定義語音',
    text: '這是語音克隆的測試文字。'
  })
});

const cloneData = await cloneResponse.json();
console.log('克隆的語音 ID:', cloneData.voice_id);
```

#### 6. 使用 OpenAI SDK 相容模式 / Using OpenAI SDK Compatible Mode

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: process.env.ZAI_API_BASE_URL + '/v1',
  apiKey: process.env.ZAI_API_KEY,
  dangerouslyAllowBrowser: true // 僅用於瀏覽器環境
});

// 聊天對話
const chatResponse = await openai.chat.completions.create({
  model: 'GLM-4.6',
  messages: [
    { role: 'user', content: '你好！' }
  ]
});

console.log(chatResponse.choices[0].message.content);

// 圖像生成
const imageResponse = await openai.images.generate({
  model: 'glm-image',
  prompt: '美麗的風景畫',
  n: 1,
  size: '1024x1024'
});

console.log(imageResponse.data[0].url);
```

#### 7. 串流聊天對話範例 / Streaming Chat Example

```javascript
// 使用串流模式獲得即時回應
const response = await fetch(`${process.env.ZAI_API_BASE_URL}/v1/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.ZAI_API_KEY}`
  },
  body: JSON.stringify({
    model: 'GLM-4.6',
    messages: [
      { role: 'user', content: '請詳細解釋量子計算的原理' }
    ],
    stream: true
  })
});

// 處理串流回應
const reader = response.body.getReader();
const decoder = new TextDecoder();
let fullContent = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;
      
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices[0]?.delta?.content;
        if (content) {
          fullContent += content;
          process.stdout.write(content); // 即時輸出到終端
        }
      } catch (e) {
        // 忽略解析錯誤
      }
    }
  }
}

console.log('\n完整回應:', fullContent);
```

#### 8. 視覺模型（圖片輸入）範例 / Vision Model Example

```javascript
// 使用視覺模型分析圖片
const response = await fetch(`${process.env.ZAI_API_BASE_URL}/v1/chat/completions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.ZAI_API_KEY}`
  },
  body: JSON.stringify({
    model: 'GLM-4.6-V',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '請描述這張圖片的內容，並分析其中的主要元素。'
          },
          {
            type: 'image_url',
            image_url: {
              url: 'https://example.com/image.jpg'
            }
          }
        ]
      }
    ]
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

#### 9. 多張圖片生成範例 / Multiple Images Generation Example

```javascript
// 一次生成多張圖片
const response = await fetch(`${process.env.ZAI_API_BASE_URL}/v1/images/generations`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.ZAI_API_KEY}`
  },
  body: JSON.stringify({
    prompt: '四季風景：春天的花朵、夏天的海灘、秋天的楓葉、冬天的雪景',
    ratio: '16:9',
    resolution: '2K',
    adult_content: false,
    n: 4  // 生成 4 張圖片
  })
});

const data = await response.json();
console.log(`成功生成 ${data.data.length} 張圖片:`);
data.data.forEach((img, index) => {
  console.log(`圖片 ${index + 1}: ${img.url}`);
});
```

#### 10. 自定義語音使用範例 / Custom Voice Usage Example

```javascript
// 獲取可用的語音列表
const listResponse = await fetch(`${process.env.ZAI_API_BASE_URL}/v1/audio/voices`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${process.env.ZAI_API_KEY}`
  }
});

const voices = await listResponse.json();
console.log('可用的語音:', voices.voices);

// 使用自定義語音生成音頻
const customVoiceId = voices.voices.find(v => v.name === '我的自定義語音')?.id;

if (customVoiceId) {
  const response = await fetch(`${process.env.ZAI_API_BASE_URL}/v1/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ZAI_API_KEY}`
    },
    body: JSON.stringify({
      input: '這是使用自定義語音生成的音頻。',
      voice: customVoiceId,
      speed: 1.0,
      volume: 1
    })
  });

  const audioBuffer = await response.arrayBuffer();
  fs.writeFileSync('custom-voice-output.wav', Buffer.from(audioBuffer));
}
```

#### 11. 完整錯誤處理範例 / Complete Error Handling Example

```javascript
async function safeApiCall(endpoint, options) {
  try {
    const response = await fetch(`${process.env.ZAI_API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ZAI_API_KEY}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `API 請求失敗 (${response.status}): ${errorData.error || response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('API 呼叫錯誤:', error.message);
    
    // 根據錯誤類型進行處理
    if (error.message.includes('401')) {
      console.error('認證失敗，請檢查 API Key');
    } else if (error.message.includes('429')) {
      console.error('請求過於頻繁，請稍後再試');
    } else if (error.message.includes('500')) {
      console.error('伺服器錯誤，請稍後再試');
    }
    
    throw error;
  }
}

// 使用範例
try {
  const result = await safeApiCall('/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: 'GLM-4.6',
      messages: [{ role: 'user', content: '你好' }]
    })
  });
  console.log(result.choices[0].message.content);
} catch (error) {
  // 錯誤已在 safeApiCall 中處理
}
```

#### 12. 對話歷史管理範例 / Conversation History Management Example

```javascript
class ChatSession {
  constructor(apiBaseUrl, apiKey) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
    this.messages = [];
    this.model = 'GLM-4.6';
  }

  async sendMessage(content, options = {}) {
    // 添加用戶訊息
    this.messages.push({ role: 'user', content });

    try {
      const response = await fetch(`${this.apiBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: options.model || this.model,
          messages: this.messages,
          stream: options.stream || false
        })
      });

      if (!response.ok) {
        throw new Error(`API 錯誤: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message;

      // 添加助手回應到歷史
      this.messages.push(assistantMessage);

      return assistantMessage.content;
    } catch (error) {
      // 移除失敗的用戶訊息
      this.messages.pop();
      throw error;
    }
  }

  clearHistory() {
    this.messages = [];
  }

  getHistory() {
    return [...this.messages];
  }
}

// 使用範例
const chat = new ChatSession(process.env.ZAI_API_BASE_URL, process.env.ZAI_API_KEY);

const response1 = await chat.sendMessage('我的名字是小明');
console.log('回應 1:', response1);

const response2 = await chat.sendMessage('你記得我的名字嗎？');
console.log('回應 2:', response2); // 應該記得名字是小明

console.log('對話歷史:', chat.getHistory());
```

#### 13. 批次處理範例 / Batch Processing Example

```javascript
// 批次生成多個音頻文件
async function batchGenerateAudio(texts, voice = 'Lila') {
  const results = [];
  
  for (let i = 0; i < texts.length; i++) {
    try {
      const response = await fetch(`${process.env.ZAI_API_BASE_URL}/v1/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ZAI_API_KEY}`
        },
        body: JSON.stringify({
          input: texts[i],
          voice: voice,
          speed: 1.0,
          volume: 1
        })
      });

      const audioBuffer = await response.arrayBuffer();
      const filename = `audio_${i + 1}.wav`;
      fs.writeFileSync(filename, Buffer.from(audioBuffer));
      
      results.push({ success: true, filename, text: texts[i] });
      console.log(`✓ 已生成: ${filename}`);
      
      // 避免請求過於頻繁
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      results.push({ success: false, error: error.message, text: texts[i] });
      console.error(`✗ 生成失敗: ${texts[i]}`);
    }
  }
  
  return results;
}

// 使用範例
const texts = [
  '歡迎使用我們的服務',
  '請選擇您需要的功能',
  '感謝您的使用'
];

const results = await batchGenerateAudio(texts);
console.log('批次處理結果:', results);
```

#### 14. 進階：圖片上傳與分析範例 / Advanced: Image Upload and Analysis Example

```javascript
// 上傳本地圖片並分析
async function analyzeLocalImage(imagePath, prompt) {
  // 讀取圖片文件
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  
  const response = await fetch(`${process.env.ZAI_API_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ZAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'GLM-4.6-V',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt || '請詳細描述這張圖片的內容'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// 使用範例
const analysis = await analyzeLocalImage(
  './photo.jpg',
  '請分析這張照片中的物體、顏色和構圖'
);
console.log('圖片分析結果:', analysis);
```

#### 15. 進階：多模態對話範例 / Advanced: Multimodal Conversation Example

```javascript
class MultimodalChat {
  constructor(apiBaseUrl, apiKey) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
    this.messages = [];
  }

  async sendTextMessage(content) {
    this.messages.push({ role: 'user', content });
    return await this._getResponse();
  }

  async sendImageMessage(imageUrl, textPrompt = '請描述這張圖片') {
    this.messages.push({
      role: 'user',
      content: [
        { type: 'text', text: textPrompt },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    });
    return await this._getResponse();
  }

  async sendLocalImage(imagePath, textPrompt = '請描述這張圖片') {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    this.messages.push({
      role: 'user',
      content: [
        { type: 'text', text: textPrompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
      ]
    });
    return await this._getResponse();
  }

  async _getResponse() {
    const response = await fetch(`${this.apiBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'GLM-4.6-V',
        messages: this.messages
      })
    });

    const data = await response.json();
    const assistantMessage = data.choices[0].message;
    this.messages.push(assistantMessage);
    return assistantMessage.content;
  }

  clearHistory() {
    this.messages = [];
  }
}

// 使用範例
const chat = new MultimodalChat(process.env.ZAI_API_BASE_URL, process.env.ZAI_API_KEY);

await chat.sendTextMessage('你好，我準備了一些圖片給你看');
console.log('回應 1:', await chat.sendLocalImage('./cat.jpg', '這是什麼動物？'));
console.log('回應 2:', await chat.sendLocalImage('./dog.jpg', '這張圖片裡有什麼？'));
console.log('回應 3:', await chat.sendTextMessage('這兩張圖片有什麼不同？'));
```

### Roo Code 最佳實踐 / Roo Code Best Practices

1. **使用環境變量**：將 API Key 和端點 URL 儲存在環境變量中，不要硬編碼在程式碼中
2. **錯誤處理**：始始處理 API 錯誤響應，檢查 `response.ok` 或 `data.error`
3. **串流處理**：對於聊天對話，使用 `stream: true` 來獲得即時回應
4. **速率限制**：注意 API 的速率限制，避免過於頻繁的請求
5. **快取結果**：對於圖像和音頻生成，考慮快取結果以節省 API 配額

### 範例專案結構 / Example Project Structure

```
roo-code-zai-project/
├── .env                    # 環境變量
├── package.json
├── src/
│   ├── chat.js            # 聊天功能
│   ├── image.js           # 圖像生成
│   ├── audio.js           # 音頻合成
│   └── voice.js           # 語音克隆
└── README.md
```

### 故障排除 / Troubleshooting

**問題：API 請求失敗，返回 401 錯誤**
- 檢查 API Key 是否正確
- 確認 session token 是否過期
- 驗證 Authorization header 格式

**問題：圖像生成失敗**
- 確認使用有效的 session token（不能使用 "free"）
- 檢查 prompt 是否符合內容政策

**問題：音頻生成無聲音**
- 檢查 volume 參數（範圍 0-10）
- 確認 voice 名稱正確
- 驗證輸入文字不為空

## License / 授權

MIT
