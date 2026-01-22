# Z All-in-One API

OpenAI-compatible API wrapper for Z.ai services (Chat, Image, Audio).

### Services Wrapped
- **Chat**: https://chat.z.ai - GLM models (text & vision)
- **Image**: https://image.z.ai - Image generation
- **Audio**: https://audio.z.ai - Text-to-speech & voice cloning

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

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run locally:
```bash
wrangler dev
```

3. Deploy to Cloudflare:
```bash
wrangler deploy
```

## Authentication

### Getting Your Token

1. Open `image.z.ai` or `audio.z.ai` in browser
2. Press F12 → Application tab
3. Expand Cookies → Click website URL
4. Copy the `session` cookie value (starts with "ey")

### Using Tokens

- **Chat**: Optional (use "free" for anonymous)
- **Image**: Required (session token)
- **Audio**: Required (session token)

Token is saved in localStorage and persists across page refreshes.

## API Usage

### Chat Example
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

### Image Example
```bash
curl http://localhost:8787/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer session=eyJhbGc..." \
  -d '{
    "prompt": "A beautiful sunset",
    "ratio": "16:9",
    "resolution": "2K"
  }'
```

### Audio Example
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
- Token management
- Interactive testing
- Voice selection
- Voice cloning
- Real-time preview

## Models List Endpoint

```bash
curl http://localhost:8787/v1/models
```

Returns all available models for chat, image, and audio.

## Notes

- Chat supports vision models (GLM-4.5-V, GLM-4.6-V) with image URLs
- Image generation requires valid session token
- Audio supports custom voice cloning with uploaded samples
- All endpoints support CORS for web applications
- Tokens are stored locally in browser (not on server)

## License

MIT
