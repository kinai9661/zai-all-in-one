// ============================================
// UNIFIED Z.AI API WORKER
// ============================================
// Combines Text/Chat, Image Generation, and Audio Generation

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    VERSION: "1.0.0",
    
    // Text/Chat API
    CHAT_BASE_URL: "https://chat.z.ai",
    CHAT_SECRET_KEY: "key-@@@@)))()((9))-xxxx&&&%%%%%", // Public key from Z.ai frontend
    CHAT_FALLBACK_TOKEN: "", // No fallback - user must provide token
    
    // Image API
    IMAGE_BASE_URL: "https://image.z.ai",
    IMAGE_API_ENDPOINT: "/api/proxy/images/generate",
    IMAGE_FALLBACK_COOKIES: "", // No fallback - user must provide cookies
    
    // Audio API
    AUDIO_BASE_URL: "https://audio.z.ai",
    AUDIO_API_ENDPOINT: "/api/v1/z-audio/tts/create",
    AUDIO_FALLBACK_TOKEN: "", // No fallback - user must provide token
    
    // Model mappings for chat
    MODEL_MAPPING: {
        "GLM-4.7": "glm-4.7",
        "GLM-4.5": "0727-360B-API",
        "GLM-4.6": "GLM-4-6-API-V1",
        "GLM-4.5-V": "glm-4.5v",
        "GLM-4.6-V": "glm-4.6v",
        "GLM-4.5-Air": "0727-106B-API",
        "0808-360B-DR": "0808-360B-DR"
    },
    MODEL_LIST: [
        "GLM-4.7", "GLM-4.7-thinking", "GLM-4.5", "GLM-4.6",
        "GLM-4.5-thinking", "GLM-4.6-thinking", "GLM-4.5-V",
        "GLM-4.6-V", "GLM-4.5-Air", "0808-360B-DR"
    ],
    VISION_MODELS: ["glm-4.5v", "glm-4.6v"],
    VISION_MCP_SERVERS: ["vlm-image-search", "vlm-image-recognition", "vlm-image-processing"],
    
    // Image options
    IMAGE_RATIOS: ["1:1", "3:4", "4:3", "16:9", "9:16", "21:9", "9:21"],
    IMAGE_RESOLUTIONS: ["1K", "2K"],
    
    // Audio voices
    AUDIO_VOICES: {
        "alloy": { name: "Lila", id: "system_001" },
        "echo": { name: "Lila", id: "system_001" },
        "fable": { name: "Lila", id: "system_001" },
        "onyx": { name: "Lila", id: "system_001" },
        "nova": { name: "Lila", id: "system_001" },
        "shimmer": { name: "Lila", id: "system_001" },
        "lila": { name: "Lila", id: "system_001" }
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}
__name(generateUUID, "generateUUID");

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID, Accept-Language"
    };
}
__name(corsHeaders, "corsHeaders");

// ============================================
// MAIN WORKER
// ============================================

var worker_default = {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // Store environment variables globally for use in handlers
        if (env) {
            globalThis.ENV = env;
        }
        
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders() });
        }
        
        if (url.pathname === "/" || url.pathname === "/index.html") {
            return handleWebUI();
        }
        
        // Text/Chat endpoints
        if (url.pathname === "/v1/chat/completions") {
            return handleChat(request);
        }
        
        // Image endpoints
        if (url.pathname === "/v1/images/generations") {
            return handleImageGeneration(request);
        }
        
        // Audio endpoints
        if (url.pathname === "/v1/audio/speech") {
            return handleAudioGeneration(request);
        }
        
        if (url.pathname === "/v1/audio/voices/upload") {
            return handleVoiceUpload(request);
        }
        
        if (url.pathname === "/v1/audio/voices/clone") {
            return handleVoiceClone(request);
        }
        
        if (url.pathname === "/v1/audio/voices") {
            return handleVoiceList(request);
        }
        
        // Models endpoint
        if (url.pathname === "/v1/models") {
            return handleModels();
        }
        
        return new Response(JSON.stringify({ error: "Not Found" }), {
            status: 404,
            headers: { ...corsHeaders(), "Content-Type": "application/json" }
        });
    }
};

function handleModels() {
    const models = CONFIG.MODEL_LIST.map((id) => ({
        id,
        object: "model",
        owned_by: "z.ai"
    }));
    
    models.push({
        id: "glm-image",
        object: "model",
        owned_by: "zhipu-ai"
    });
    
    models.push({
        id: "tts-1",
        object: "model",
        owned_by: "zhipu-ai"
    });
    
    models.push({
        id: "tts-1-hd",
        object: "model",
        owned_by: "zhipu-ai"
    });
    
    return new Response(JSON.stringify({ object: "list", data: models }), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
    });
}
__name(handleModels, "handleModels");

// ============================================
// TEXT/CHAT HANDLERS (from worker.js)
// ============================================

async function hmacSha256Hex(key, data) {
    const encoder = new TextEncoder();
    const keyData = typeof key === "string" ? encoder.encode(key) : key;
    const cryptoKey = await crypto.subtle.importKey(
        "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
    return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha256Hex, "hmacSha256Hex");

async function generateSignature(userID, requestID, userContent, timestamp) {
    const requestInfo = `requestId,${requestID},timestamp,${timestamp},user_id,${userID}`;
    const contentBase64 = btoa(unescape(encodeURIComponent(userContent)));
    const signData = `${requestInfo}|${contentBase64}|${timestamp}`;
    const period = Math.floor(timestamp / (5 * 60 * 1000));
    const firstHmac = await hmacSha256Hex(CONFIG.CHAT_SECRET_KEY, String(period));
    const signature = await hmacSha256Hex(firstHmac, signData);
    return signature;
}
__name(generateSignature, "generateSignature");

function parseModelName(model) {
    let baseModel = model;
    let enableThinking = false;
    let enableSearch = false;
    while (true) {
        if (baseModel.endsWith("-thinking")) {
            enableThinking = true;
            baseModel = baseModel.slice(0, -9);
        } else if (baseModel.endsWith("-search")) {
            enableSearch = true;
            baseModel = baseModel.slice(0, -7);
        } else {
            break;
        }
    }
    return { baseModel, enableThinking, enableSearch };
}
__name(parseModelName, "parseModelName");

function getTargetModel(model) {
    const { baseModel } = parseModelName(model);
    return CONFIG.MODEL_MAPPING[baseModel] || model;
}
__name(getTargetModel, "getTargetModel");

function decodeJWT(token) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        return payload;
    } catch {
        return null;
    }
}
__name(decodeJWT, "decodeJWT");

var cachedFeVersion = "prod-fe-1.0.148";
async function fetchFeVersion() {
    try {
        const resp = await fetch("https://chat.z.ai/");
        const html = await resp.text();
        const match = html.match(/prod-fe-[\.\d]+/);
        if (match) {
            cachedFeVersion = match[0];
        }
    } catch (e) {
        console.error("Failed to fetch FE version:", e);
    }
    return cachedFeVersion;
}
__name(fetchFeVersion, "fetchFeVersion");

async function getAnonymousToken() {
    const resp = await fetch(`${CONFIG.CHAT_BASE_URL}/api/v1/auths/`);
    if (!resp.ok) throw new Error(`Auth failed: ${resp.status}`);
    const data = await resp.json();
    return data.token;
}
__name(getAnonymousToken, "getAnonymousToken");

function extractLatestUserContent(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
            const content = messages[i].content;
            if (typeof content === "string") return content;
            if (Array.isArray(content)) {
                return content.filter((p) => p.type === "text").map((p) => p.text).join("");
            }
        }
    }
    return "";
}
__name(extractLatestUserContent, "extractLatestUserContent");

function formatMessageContent(content, targetModel) {
    if (typeof content === "string") {
        return content;
    }
    if (!Array.isArray(content)) {
        return content;
    }
    const isVisionModel = CONFIG.VISION_MODELS.includes(targetModel);
    if (isVisionModel) {
        return content.map((part) => {
            if (part.type === "text") {
                return { type: "text", text: part.text };
            }
            if (part.type === "image_url") {
                const imageUrl = part.image_url?.url || part.image_url;
                return {
                    type: "image_url",
                    image_url: { url: imageUrl }
                };
            }
            return part;
        });
    }
    return content.filter((p) => p.type === "text").map((p) => p.text).join("");
}
__name(formatMessageContent, "formatMessageContent");

async function uploadImageToZai(imageData, token, filename = "image.png") {
    const boundary = "----WebKitFormBoundary" + generateUUID().replace(/-/g, "");
    let imageBytes;
    let contentType = "image/png";
    
    if (typeof imageData === "string") {
        if (imageData.startsWith("data:")) {
            const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                contentType = matches[1];
                const base64 = matches[2];
                const binaryString = atob(base64);
                imageBytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    imageBytes[i] = binaryString.charCodeAt(i);
                }
            }
        } else if (imageData.startsWith("http")) {
            const imgResp = await fetch(imageData);
            if (!imgResp.ok) throw new Error("Failed to fetch image from URL");
            contentType = imgResp.headers.get("content-type") || "image/png";
            imageBytes = new Uint8Array(await imgResp.arrayBuffer());
        }
    }
    
    if (!imageBytes) {
        throw new Error("Invalid image data - must be base64 data URL or http(s) URL");
    }
    
    const ext = contentType.split("/")[1] || "png";
    if (!filename.includes(".")) {
        filename = `${filename}.${ext}`;
    }
    
    const formDataParts = [];
    const encoder = new TextEncoder();
    
    formDataParts.push(encoder.encode(`--${boundary}\r\n`));
    formDataParts.push(encoder.encode(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`));
    formDataParts.push(encoder.encode(`Content-Type: ${contentType}\r\n\r\n`));
    formDataParts.push(imageBytes);
    formDataParts.push(encoder.encode(`\r\n--${boundary}--\r\n`));
    
    let totalLength = 0;
    for (const part of formDataParts) {
        totalLength += part.length;
    }
    const body = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of formDataParts) {
        body.set(part, offset);
        offset += part.length;
    }
    
    const uploadResp = await fetch(`${CONFIG.CHAT_BASE_URL}/api/v1/files/`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
            "Origin": "https://chat.z.ai",
            "Referer": "https://chat.z.ai/"
        },
        body: body
    });
    
    if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        if (uploadResp.status === 401) {
            throw new Error("Image upload requires a logged-in user token");
        }
        throw new Error(`Upload failed: ${uploadResp.status} ${errText}`);
    }
    
    return await uploadResp.json();
}
__name(uploadImageToZai, "uploadImageToZai");

async function processMessagesForVision(messages, token, targetModel) {
    const isVisionModel = CONFIG.VISION_MODELS.includes(targetModel);
    if (!isVisionModel) return { messages, files: [] };
    
    const files = [];
    const processedMessages = [];
    
    for (const msg of messages) {
        if (!Array.isArray(msg.content)) {
            processedMessages.push(msg);
            continue;
        }
        
        const newContent = [];
        for (const part of msg.content) {
            if (part.type === "image_url") {
                const imageUrl = part.image_url?.url || part.image_url;
                
                if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("data:") && imageUrl.match(/^[a-f0-9-]{36}$/i)) {
                    newContent.push(part);
                    continue;
                }
                
                try {
                    console.log("Uploading image to z.ai...");
                    const fileInfo = await uploadImageToZai(imageUrl, token);
                    console.log("Upload success:", fileInfo.id);
                    
                    files.push({
                        type: "image",
                        file: fileInfo,
                        id: fileInfo.id,
                        url: `/api/v1/files/${fileInfo.id}/content`,
                        name: encodeURIComponent(fileInfo.filename),
                        status: "uploaded",
                        size: fileInfo.meta?.size || 0,
                        media: "image"
                    });
                    
                    newContent.push({
                        type: "image_url",
                        image_url: { url: fileInfo.id }
                    });
                } catch (e) {
                    console.error("Image upload failed:", e.message);
                    newContent.push({ type: "text", text: "[Image upload failed]" });
                }
            } else {
                newContent.push(part);
            }
        }
        
        processedMessages.push({
            role: msg.role,
            content: newContent
        });
    }
    
    return { messages: processedMessages, files };
}
__name(processMessagesForVision, "processMessagesForVision");

async function handleChat(request) {
    try {
        let token = request.headers.get("Authorization")?.replace("Bearer ", "") || "";
        const body = await request.json();
        const model = body.model || "GLM-4.6";
        const targetModel = getTargetModel(model);
        const isVisionModel = CONFIG.VISION_MODELS.includes(targetModel);
        
        if (!token || token === "free") {
            if (isVisionModel) {
                token = CONFIG.CHAT_FALLBACK_TOKEN;
            } else {
                token = await getAnonymousToken();
            }
        }
        
        const payload = decodeJWT(token);
        if (!payload) {
            return new Response(JSON.stringify({ error: "Invalid token" }), {
                status: 401,
                headers: { ...corsHeaders(), "Content-Type": "application/json" }
            });
        }
        
        const messages = body.messages || [];
        const stream = body.stream !== false;
        const userID = payload.id;
        const chatID = generateUUID();
        const timestamp = Date.now();
        const requestID = generateUUID();
        const latestUserContent = extractLatestUserContent(messages);
        const { enableThinking, enableSearch } = parseModelName(model);
        const signature = await generateSignature(userID, requestID, latestUserContent, timestamp);
        const feVersion = await fetchFeVersion();
        
        const upstreamUrl = new URL(`${CONFIG.CHAT_BASE_URL}/api/v2/chat/completions`);
        upstreamUrl.searchParams.set("timestamp", timestamp);
        upstreamUrl.searchParams.set("requestId", requestID);
        upstreamUrl.searchParams.set("user_id", userID);
        upstreamUrl.searchParams.set("version", "0.0.1");
        upstreamUrl.searchParams.set("platform", "web");
        upstreamUrl.searchParams.set("token", token);
        upstreamUrl.searchParams.set("current_url", `https://chat.z.ai/c/${chatID}`);
        upstreamUrl.searchParams.set("pathname", `/c/${chatID}`);
        upstreamUrl.searchParams.set("signature_timestamp", timestamp);
        
        const messageID = generateUUID();
        
        let processedMessages = messages;
        let files = [];
        if (isVisionModel) {
            const result = await processMessagesForVision(messages, token, targetModel);
            processedMessages = result.messages;
            files = result.files;
        }
        
        const upstreamBody = {
            stream: true,
            model: targetModel,
            messages: processedMessages.map((m) => ({
                role: m.role,
                content: formatMessageContent(m.content, targetModel)
            })),
            signature_prompt: latestUserContent,
            params: {},
            features: {
                image_generation: false,
                web_search: false,
                auto_web_search: enableSearch && !isVisionModel,
                preview_mode: true,
                flags: [],
                enable_thinking: enableThinking
            },
            chat_id: chatID,
            id: generateUUID(),
            current_user_message_id: messageID,
            current_user_message_parent_id: null,
            background_tasks: {
                title_generation: true,
                tags_generation: true
            },
            extra: {},
            variables: {}
        };
        
        if (isVisionModel && files.length > 0) {
            upstreamBody.files = files;
            upstreamBody.mcp_servers = CONFIG.VISION_MCP_SERVERS;
        }
        
        const upstreamResp = await fetch(upstreamUrl.toString(), {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "X-FE-Version": feVersion,
                "X-Signature": signature,
                "Content-Type": "application/json",
                "Origin": "https://chat.z.ai",
                "Referer": `https://chat.z.ai/c/${chatID}`
            },
            body: JSON.stringify(upstreamBody)
        });
        
        if (!upstreamResp.ok) {
            const errText = await upstreamResp.text();
            return new Response(JSON.stringify({
                error: `Upstream error ${upstreamResp.status}: ${errText.substring(0, 200)}`
            }), {
                status: upstreamResp.status,
                headers: { ...corsHeaders(), "Content-Type": "application/json" }
            });
        }
        
        const completionID = `chatcmpl-${generateUUID().substring(0, 29)}`;
        if (stream) {
            return handleStreamResponse(upstreamResp, completionID, model);
        } else {
            return handleNonStreamResponse(upstreamResp, completionID, model);
        }
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { ...corsHeaders(), "Content-Type": "application/json" }
        });
    }
}
__name(handleChat, "handleChat");

async function handleStreamResponse(upstreamResp, completionID, model) {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    
    (async () => {
        const reader = upstreamResp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let thinkingFilter = { hasSeenFirst: false, buffer: "" };
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const payload = line.slice(6);
                    if (payload === "[DONE]") break;
                    
                    try {
                        const upstream = JSON.parse(payload);
                        const data = upstream.data || {};
                        
                        if (data.phase === "done" || data.done) break;
                        
                        if (data.phase === "thinking" && data.delta_content) {
                            let content = data.delta_content;
                            if (!thinkingFilter.hasSeenFirst) {
                                thinkingFilter.hasSeenFirst = true;
                                const idx = content.indexOf("> ");
                                if (idx !== -1) content = content.substring(idx + 2);
                                else continue;
                            }
                            content = content.replace(/\n> /g, "\n");
                            if (content) {
                                const chunk = {
                                    id: completionID,
                                    object: "chat.completion.chunk",
                                    created: Math.floor(Date.now() / 1000),
                                    model,
                                    choices: [{ index: 0, delta: { reasoning_content: content }, finish_reason: null }]
                                };
                                await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                            }
                            continue;
                        }
                        
                        let content = "";
                        let reasoningContent = "";
                        
                        if (data.phase === "answer" && data.delta_content) {
                            content = data.delta_content;
                        } else if (data.phase === "answer" && data.edit_content) {
                            if (data.edit_content.includes("</details>")) {
                                const startIdx = data.edit_content.indexOf("> ");
                                const endIdx = data.edit_content.indexOf("\n</details>");
                                if (startIdx !== -1 && endIdx !== -1) {
                                    reasoningContent = data.edit_content.substring(startIdx + 2, endIdx).replace(/\n> /g, "\n");
                                }
                                const detailsEnd = data.edit_content.indexOf("</details>\n");
                                if (detailsEnd !== -1) {
                                    content = data.edit_content.substring(detailsEnd + 11);
                                }
                            }
                        } else if ((data.phase === "other" || data.phase === "tool_call") && data.edit_content) {
                            content = data.edit_content;
                        }
                        
                        if (reasoningContent) {
                            const chunk = {
                                id: completionID,
                                object: "chat.completion.chunk",
                                created: Math.floor(Date.now() / 1000),
                                model,
                                choices: [{ index: 0, delta: { reasoning_content: reasoningContent }, finish_reason: null }]
                            };
                            await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                        }
                        
                        if (content) {
                            const chunk = {
                                id: completionID,
                                object: "chat.completion.chunk",
                                created: Math.floor(Date.now() / 1000),
                                model,
                                choices: [{ index: 0, delta: { content }, finish_reason: null }]
                            };
                            await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                        }
                    } catch (e) {
                        // Skip malformed JSON
                    }
                }
            }
            
            const finalChunk = {
                id: completionID,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model,
                choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
            };
            await writer.write(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
            await writer.write(encoder.encode("data: [DONE]\n\n"));
        } catch (e) {
            console.error("Stream error:", e);
        } finally {
            await writer.close();
        }
    })();
    
    return new Response(readable, {
        headers: {
            ...corsHeaders(),
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache"
        }
    });
}
__name(handleStreamResponse, "handleStreamResponse");

async function handleNonStreamResponse(upstreamResp, completionID, model) {
    const reader = upstreamResp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let chunks = [];
    let reasoningChunks = [];
    let thinkingFilter = { hasSeenFirst: false };
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);
            if (payload === "[DONE]") break;
            
            try {
                const upstream = JSON.parse(payload);
                const data = upstream.data || {};
                
                if (data.phase === "done" || data.done) break;
                
                if (data.phase === "thinking" && data.delta_content) {
                    let content = data.delta_content;
                    if (!thinkingFilter.hasSeenFirst) {
                        thinkingFilter.hasSeenFirst = true;
                        const idx = content.indexOf("> ");
                        if (idx !== -1) content = content.substring(idx + 2);
                        else continue;
                    }
                    content = content.replace(/\n> /g, "\n");
                    if (content) reasoningChunks.push(content);
                    continue;
                }
                
                let content = "";
                if (data.phase === "answer" && data.delta_content) {
                    content = data.delta_content;
                } else if (data.phase === "answer" && data.edit_content) {
                    if (data.edit_content.includes("</details>")) {
                        const startIdx = data.edit_content.indexOf("> ");
                        const endIdx = data.edit_content.indexOf("\n</details>");
                        if (startIdx !== -1 && endIdx !== -1) {
                            reasoningChunks.push(data.edit_content.substring(startIdx + 2, endIdx).replace(/\n> /g, "\n"));
                        }
                        const detailsEnd = data.edit_content.indexOf("</details>\n");
                        if (detailsEnd !== -1) {
                            content = data.edit_content.substring(detailsEnd + 11);
                        }
                    }
                } else if ((data.phase === "other" || data.phase === "tool_call") && data.edit_content) {
                    content = data.edit_content;
                }
                
                if (content) chunks.push(content);
            } catch (e) {
                // Skip malformed JSON
            }
        }
    }
    
    const fullContent = chunks.join("");
    const fullReasoning = reasoningChunks.join("");
    
    const response = {
        id: completionID,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
            index: 0,
            message: {
                role: "assistant",
                content: fullContent,
                ...fullReasoning && { reasoning_content: fullReasoning }
            },
            finish_reason: "stop"
        }]
    };
    
    return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
    });
}
__name(handleNonStreamResponse, "handleNonStreamResponse");

// ============================================
// IMAGE GENERATION HANDLER (from image-worker-final.js)
// ============================================

async function handleImageGeneration(request) {
    try {
        const body = await request.json();
        
        let cookies = CONFIG.IMAGE_FALLBACK_COOKIES;
        
        // Try to get API key from environment variable first
        if (globalThis.ENV?.DEFAULT_API_KEY) {
            cookies = globalThis.ENV.DEFAULT_API_KEY;
            // Auto-add "session=" prefix if not present
            if (cookies && !cookies.startsWith('session=')) {
                cookies = 'session=' + cookies;
            }
        }
        
        // Then try Authorization header
        const authHeader = request.headers.get("Authorization");
        if (authHeader) {
            let token = authHeader.replace(/^Bearer\s+/i, '');
            // Auto-add "session=" prefix if not present
            if (token && !token.startsWith('session=')) {
                token = 'session=' + token;
            }
            cookies = token;
        }
        
        if (!cookies || cookies === "YOUR_COOKIES_HERE") {
            return new Response(JSON.stringify({
                error: "No authentication cookies provided"
            }), {
                status: 401,
                headers: { ...corsHeaders(), "Content-Type": "application/json" }
            });
        }
        
        const upstreamBody = {
            prompt: body.prompt || "A beautiful image",
            ratio: body.ratio || body.aspect_ratio || "1:1",
            resolution: body.resolution || "1K",
            rm_label_watermark: body.remove_watermark !== false && body.rm_label_watermark !== false
        };
        
        // Add adult content parameter if provided
        if (body.adult_content === true) {
            upstreamBody.adult_content = true;
        }
        
        if (!CONFIG.IMAGE_RATIOS.includes(upstreamBody.ratio)) {
            upstreamBody.ratio = "1:1";
        }
        if (!CONFIG.IMAGE_RESOLUTIONS.includes(upstreamBody.resolution)) {
            upstreamBody.resolution = "1K";
        }
        
        const requestId = generateUUID().replace(/-/g, '').substring(0, 20);
        
        const upstreamResp = await fetch(`${CONFIG.IMAGE_BASE_URL}${CONFIG.IMAGE_API_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': 'en',
                'X-Request-ID': requestId,
                'Cookie': cookies,
                'Origin': CONFIG.IMAGE_BASE_URL,
                'Referer': `${CONFIG.IMAGE_BASE_URL}/`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify(upstreamBody)
        });
        
        if (!upstreamResp.ok) {
            const errText = await upstreamResp.text();
            return new Response(JSON.stringify({
                error: `Upstream error ${upstreamResp.status}`,
                message: errText,
                hint: upstreamResp.status === 401 ? "Cookies expired - get fresh cookies from browser" : null
            }), {
                status: upstreamResp.status,
                headers: { ...corsHeaders(), "Content-Type": "application/json" }
            });
        }
        
        const data = await upstreamResp.json();
        
        if (data.code !== 200) {
            return new Response(JSON.stringify({
                error: data.message || "Image generation failed",
                details: data
            }), {
                status: 400,
                headers: { ...corsHeaders(), "Content-Type": "application/json" }
            });
        }
        
        const imageUrl = data.data?.image?.image_url || data.data?.url || data.data?.image_url;
        
        if (!imageUrl) {
            return new Response(JSON.stringify({
                error: "No image URL in response",
                raw_response: data
            }), {
                status: 500,
                headers: { ...corsHeaders(), "Content-Type": "application/json" }
            });
        }
        
        return new Response(JSON.stringify({
            created: Math.floor(Date.now() / 1000),
            model: "glm-image",
            data: [{
                url: imageUrl,
                revised_prompt: body.prompt
            }]
        }), {
            headers: { ...corsHeaders(), "Content-Type": "application/json" }
        });
        
    } catch (e) {
        return new Response(JSON.stringify({ 
            error: e.message,
            stack: e.stack 
        }), {
            status: 500,
            headers: { ...corsHeaders(), "Content-Type": "application/json" }
        });
    }
}
__name(handleImageGeneration, "handleImageGeneration");

// ============================================
// AUDIO GENERATION HANDLERS (from audio-worker.js)
// ============================================

async function handleAudioGeneration(request) {
    try {
        const body = await request.json();
        
        let token = CONFIG.AUDIO_FALLBACK_TOKEN;
        
        // Try to get API key from environment variable first
        if (globalThis.ENV?.DEFAULT_API_KEY) {
            token = globalThis.ENV.DEFAULT_API_KEY;
        }
        
        // Then try Authorization header
        const authHeader = request.headers.get("Authorization");
        if (authHeader) {
            token = authHeader.replace(/^Bearer\s+/i, '');
        }
        
        if (!token || token === "YOUR_TOKEN_HERE") {
            return new Response(JSON.stringify({
                error: "No authentication token provided"
            }), {
                status: 401,
                headers: { ...corsHeaders(), "Content-Type": "application/json" }
            });
        }
        
        // Extract user_id from token
        const payload = decodeJWT(token);
        const userId = payload?.sub || payload?.id || payload?.user_id;
        
        if (!userId) {
            return new Response(JSON.stringify({ 
                error: "Invalid token: cannot extract user ID"
            }), {
                status: 401,
                headers: { ...corsHeaders(), "Content-Type": "application/json" }
            });
        }
        
        const input = body.input || body.text || "";
        const voice = body.voice || "alloy";
        const speed = Math.max(0.5, Math.min(2.0, body.speed || 1.0));
        const volume = Math.max(0, Math.min(10, Math.round(body.volume || 1)));
        
        const voiceConfig = CONFIG.AUDIO_VOICES[voice.toLowerCase()] || CONFIG.AUDIO_VOICES["lila"];
        
        const upstreamBody = {
            voice_name: voiceConfig.name,
            voice_id: body.voice_id || voiceConfig.id,
            user_id: userId,
            input_text: input,
            speed: speed,
            volume: volume
        };
        
        console.log('=== REQUEST TO Z.AI ===');
        console.log('Input text:', input);
        console.log('Input text length:', input.length);
        console.log('Full body:', JSON.stringify(upstreamBody, null, 2));
        
        const upstreamResp = await fetch(`${CONFIG.AUDIO_BASE_URL}${CONFIG.AUDIO_API_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                'Authorization': `Bearer ${token}`,
                'Accept-Language': 'en-US',
                'Origin': CONFIG.AUDIO_BASE_URL,
                'Referer': `${CONFIG.AUDIO_BASE_URL}/`
            },
            body: JSON.stringify(upstreamBody)
        });
        
        if (!upstreamResp.ok) {
            const errText = await upstreamResp.text();
            return new Response(JSON.stringify({
                error: `Upstream error ${upstreamResp.status}`,
                message: errText
            }), {
                status: upstreamResp.status,
                headers: { ...corsHeaders(), "Content-Type": "application/json" }
            });
        }
        
        const reader = upstreamResp.body.getReader();
        const decoder = new TextDecoder();
        let audioChunks = [];
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6).trim();
                    
                    if (jsonStr === '[DONE]') {
                        continue;
                    }
                    
                    if (!jsonStr) {
                        continue;
                    }
                    
                    try {
                        const data = JSON.parse(jsonStr);
                        
                        if (data.audio) {
                            audioChunks.push(data.audio);
                            console.log(`Chunk ${data.sequence}: ${data.audio.length} chars`);
                        }
                    } catch (e) {
                        console.log('Skipping malformed JSON chunk');
                    }
                }
            }
        }
        
        console.log('Stream ended, total chunks:', audioChunks.length);
        
        if (audioChunks.length === 0) {
            return new Response(JSON.stringify({
                error: "No audio data in response"
            }), {
                status: 500,
                headers: { ...corsHeaders(), "Content-Type": "application/json" }
            });
        }
        
        const decodedChunks = [];
        
        for (let i = 0; i < audioChunks.length; i++) {
            const cleanBase64 = audioChunks[i].replace(/[^A-Za-z0-9+/=]/g, '');
            
            // Use native atob() which is available in Cloudflare Workers
            const binaryString = atob(cleanBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let j = 0; j < binaryString.length; j++) {
                bytes[j] = binaryString.charCodeAt(j);
            }
            
            if (i === 0) {
                decodedChunks.push(bytes);
                console.log(`Chunk ${i}: ${bytes.length} bytes (with header)`);
            } else {
                // Find the "data" chunk in this WAV file
                let dataStart = -1;
                for (let j = 0; j < bytes.length - 4; j++) {
                    if (bytes[j] === 0x64 && bytes[j+1] === 0x61 && 
                        bytes[j+2] === 0x74 && bytes[j+3] === 0x61) { // "data"
                        dataStart = j + 8; // Skip "data" marker and 4-byte size
                        break;
                    }
                }
                
                if (dataStart === -1) {
                    console.error(`Chunk ${i}: Could not find data marker, using offset 44`);
                    dataStart = 44;
                }
                
                const dataOnly = bytes.slice(dataStart);
                decodedChunks.push(dataOnly);
                console.log(`Chunk ${i}: ${dataOnly.length} bytes (data only, started at byte ${dataStart})`);
            }
        }
        
        // If only one chunk, return it as-is (no merging needed)
        if (decodedChunks.length === 1) {
            console.log('Single chunk, returning as-is');
            return new Response(decodedChunks[0], {
                headers: {
                    ...corsHeaders(),
                    "Content-Type": "audio/wav",
                    "Content-Length": decodedChunks[0].length.toString()
                }
            });
        }
        
        let totalSize = 0;
        for (const chunk of decodedChunks) {
            totalSize += chunk.length;
        }
        
        const mergedAudio = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of decodedChunks) {
            mergedAudio.set(chunk, offset);
            offset += chunk.length;
        }
        
        // Update WAV header with correct file size
        const fileSize = mergedAudio.length - 8;
        mergedAudio[4] = fileSize & 0xFF;
        mergedAudio[5] = (fileSize >> 8) & 0xFF;
        mergedAudio[6] = (fileSize >> 16) & 0xFF;
        mergedAudio[7] = (fileSize >> 24) & 0xFF;
        
        // Find the "data" chunk position in the merged file
        let dataChunkPos = -1;
        for (let j = 0; j < mergedAudio.length - 4; j++) {
            if (mergedAudio[j] === 0x64 && mergedAudio[j+1] === 0x61 && 
                mergedAudio[j+2] === 0x74 && mergedAudio[j+3] === 0x61) { // "data"
                dataChunkPos = j;
                break;
            }
        }
        
        if (dataChunkPos === -1) {
            console.error('Could not find data chunk marker in merged file!');
            dataChunkPos = 36; // Fallback
        }
        
        // Update data chunk size (4 bytes after "data" marker)
        const dataSize = mergedAudio.length - (dataChunkPos + 8);
        mergedAudio[dataChunkPos + 4] = dataSize & 0xFF;
        mergedAudio[dataChunkPos + 5] = (dataSize >> 8) & 0xFF;
        mergedAudio[dataChunkPos + 6] = (dataSize >> 16) & 0xFF;
        mergedAudio[dataChunkPos + 7] = (dataSize >> 24) & 0xFF;
        
        console.log('Final merged audio:', mergedAudio.length, 'bytes');
        console.log('WAV Header check:');
        console.log('  RIFF:', String.fromCharCode(mergedAudio[0], mergedAudio[1], mergedAudio[2], mergedAudio[3]));
        console.log('  File size:', fileSize);
        console.log('  WAVE:', String.fromCharCode(mergedAudio[8], mergedAudio[9], mergedAudio[10], mergedAudio[11]));
        console.log('  Data chunk position:', dataChunkPos);
        console.log('  Data size:', dataSize);
        console.log('  Sample rate:', mergedAudio[24] | (mergedAudio[25] << 8) | (mergedAudio[26] << 16) | (mergedAudio[27] << 24));
        console.log('  Channels:', mergedAudio[22] | (mergedAudio[23] << 8));
        console.log('  Bits per sample:', mergedAudio[34] | (mergedAudio[35] << 8));
        
        return new Response(mergedAudio, {
            headers: {
                ...corsHeaders(),
                "Content-Type": "audio/wav",
                "Content-Length": mergedAudio.length.toString()
            }
        });
        
    } catch (e) {
        return new Response(JSON.stringify({ 
            error: e.message,
            stack: e.stack 
        }), {
            status: 500,
            headers: { ...corsHeaders(), "Content-Type": "application/json" }
        });
    }
}
__name(handleAudioGeneration, "handleAudioGeneration");

async function handleVoiceUpload(request) {
    try {
        let token = CONFIG.AUDIO_FALLBACK_TOKEN;
        
        // Try to get API key from environment variable first
        if (globalThis.ENV?.DEFAULT_API_KEY) {
            token = globalThis.ENV.DEFAULT_API_KEY;
        }
        
        // Then try Authorization header
        const authHeader = request.headers.get("Authorization");
        if (authHeader) {
            token = authHeader.replace(/^Bearer\s+/i, '');
        }
        
        const contentType = request.headers.get('Content-Type');
        
        const upstreamResp = await fetch(`${CONFIG.AUDIO_BASE_URL}/api/v1/z-audio/voices/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': contentType,
                'Origin': CONFIG.AUDIO_BASE_URL,
                'Referer': `${CONFIG.AUDIO_BASE_URL}/`
            },
            body: request.body
        });
        
        const data = await upstreamResp.json();
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders(), "Content-Type": "application/json" }
        });
        
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { ...corsHeaders(), "Content-Type": "application/json" }
        });
    }
}
__name(handleVoiceUpload, "handleVoiceUpload");

async function handleVoiceClone(request) {
    try {
        const body = await request.json();
        
        let token = CONFIG.AUDIO_FALLBACK_TOKEN;
        
        // Try to get API key from environment variable first
        if (globalThis.ENV?.DEFAULT_API_KEY) {
            token = globalThis.ENV.DEFAULT_API_KEY;
        }
        
        // Then try Authorization header
        const authHeader = request.headers.get("Authorization");
        if (authHeader) {
            token = authHeader.replace(/^Bearer\s+/i, '');
        }
        
        // Extract user_id from token
        const payload = decodeJWT(token);
        const userId = payload?.sub || payload?.id || payload?.user_id;
        
        if (!userId) {
            return new Response(JSON.stringify({
                error: "Invalid token: cannot extract user ID"
            }), {
                status: 401,
                headers: { ...corsHeaders(), "Content-Type": "application/json" }
            });
        }
        
        const upstreamBody = {
            voice_name: body.voice_name || body.name,
            voice_file_id: body.voice_file_id || body.file_id,
            input_text: body.input_text || body.text || "The morning sun shines warmly, and the gentle breeze brushes your face.",
            origin_audio_text: body.origin_audio_text || body.original_text || "",
            user_id: userId
        };
        
        const upstreamResp = await fetch(`${CONFIG.AUDIO_BASE_URL}/api/v1/z-audio/voices/clone`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Origin': CONFIG.AUDIO_BASE_URL,
                'Referer': `${CONFIG.AUDIO_BASE_URL}/`
            },
            body: JSON.stringify(upstreamBody)
        });
        
        const data = await upstreamResp.json();
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders(), "Content-Type": "application/json" }
        });
        
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { ...corsHeaders(), "Content-Type": "application/json" }
        });
    }
}
__name(handleVoiceClone, "handleVoiceClone");

async function handleVoiceList(request) {
    try {
        let token = CONFIG.AUDIO_FALLBACK_TOKEN;
        
        // Try to get API key from environment variable first
        if (globalThis.ENV?.DEFAULT_API_KEY) {
            token = globalThis.ENV.DEFAULT_API_KEY;
        }
        
        // Then try Authorization header
        const authHeader = request.headers.get("Authorization");
        if (authHeader) {
            token = authHeader.replace(/^Bearer\s+/i, '');
        }
        
        // Extract user_id from token
        const payload = decodeJWT(token);
        const userId = payload?.sub || payload?.id || payload?.user_id;
        
        if (!userId) {
            return new Response(JSON.stringify({
                error: "Invalid token: cannot extract user ID"
            }), {
                status: 401,
                headers: { ...corsHeaders(), "Content-Type": "application/json" }
            });
        }
        
        // Add user_id as query parameter
        const url = `${CONFIG.AUDIO_BASE_URL}/api/v1/z-audio/voices/list?user_id=${userId}`;
        
        const upstreamResp = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Origin': CONFIG.AUDIO_BASE_URL,
                'Referer': `${CONFIG.AUDIO_BASE_URL}/`
            }
        });
        
        const data = await upstreamResp.json();
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders(), "Content-Type": "application/json" }
        });
        
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { ...corsHeaders(), "Content-Type": "application/json" }
        });
    }
}
__name(handleVoiceList, "handleVoiceList");

// ============================================
// WEB UI WITH TABS
// ============================================

function handleWebUI() {
    const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Z All-in-One API (v${CONFIG.VERSION})</title>
    <style>
        :root {
            --bg: #0a0e1a;
            --panel: #151b2e;
            --panel-hover: #1a2235;
            --text: #e2e8f0;
            --accent: #10b981;
            --accent-hover: #059669;
            --accent-light: rgba(16, 185, 129, 0.1);
            --border: #2d3748;
            --tab-inactive: #64748b;
            --success: #10b981;
            --error: #ef4444;
            --warning: #f59e0b;
        }
        * { box-sizing: border-box; }
        body { 
            margin: 0; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; 
            background: linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%); 
            color: var(--text); 
            min-height: 100vh; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            padding: 20px; 
        }
        .container { max-width: 1200px; width: 100%; }
        .header-section {
            text-align: center;
            margin-bottom: 30px;
            padding: 30px 20px;
            background: var(--panel);
            border-radius: 12px;
            border: 1px solid var(--border);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        h1 { 
            color: var(--accent); 
            margin: 0 0 10px 0; 
            font-size: 32px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        .badge { 
            background: linear-gradient(135deg, var(--accent) 0%, #059669 100%);
            color: #000; 
            padding: 4px 12px; 
            border-radius: 6px; 
            font-size: 11px; 
            font-weight: 700;
            margin-left: 10px; 
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .subtitle { 
            color: #94a3b8; 
            margin: 0 0 20px 0; 
            font-size: 15px;
            font-weight: 400;
        }
        .token-section {
            background: var(--panel);
            border: 2px solid var(--border);
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }
        .token-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 15px;
        }
        .token-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--accent);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .token-status {
            font-size: 12px;
            padding: 4px 10px;
            border-radius: 4px;
            font-weight: 600;
        }
        .token-status.active {
            background: var(--accent-light);
            color: var(--success);
        }
        .token-status.inactive {
            background: rgba(239, 68, 68, 0.1);
            color: var(--error);
        }
        .token-input-group {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
        .token-input-group input {
            flex: 1;
            margin-bottom: 0;
        }
        .token-input-group button {
            width: auto;
            padding: 10px 24px;
            white-space: nowrap;
        }
        .token-guide {
            font-size: 12px;
            color: #94a3b8;
            padding: 12px;
            background: rgba(100, 116, 139, 0.1);
            border-radius: 6px;
            border-left: 3px solid var(--accent);
            line-height: 1.6;
        }
        .token-guide strong {
            color: var(--accent);
            font-weight: 600;
        }
        .token-guide code {
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 11px;
        }
        
        /* Tabs */
        .tabs { 
            display: flex; 
            gap: 10px; 
            margin-bottom: 25px; 
            border-bottom: 2px solid var(--border);
            padding-bottom: 0;
            background: var(--panel);
            padding: 10px 10px 0 10px;
            border-radius: 12px 12px 0 0;
        }
        .tab { 
            padding: 14px 28px; 
            background: transparent; 
            border: none;
            color: var(--tab-inactive); 
            cursor: pointer; 
            font-size: 15px;
            font-weight: 600;
            border-bottom: 3px solid transparent;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            bottom: -2px;
            border-radius: 8px 8px 0 0;
        }
        .tab:hover { 
            color: var(--text);
            background: var(--panel-hover);
            transform: translateY(-2px);
        }
        .tab.active { 
            color: var(--accent); 
            border-bottom-color: var(--accent);
            background: var(--accent-light);
        }
        
        /* Tab content */
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        
        /* Cards */
        .card { 
            background: var(--panel); 
            border: 1px solid var(--border); 
            border-radius: 12px; 
            padding: 25px; 
            margin: 15px 0; 
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
        }
        .card:hover {
            border-color: var(--accent);
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.1);
        }
        .card h3 {
            margin: 0 0 18px 0;
            font-size: 17px;
            color: var(--accent);
            font-weight: 600;
        }
        
        /* Form elements */
        .label { 
            font-size: 13px; 
            color: #cbd5e1; 
            margin-bottom: 8px; 
            display: block;
            font-weight: 600;
            letter-spacing: 0.3px;
        }
        input, select, textarea { 
            width: 100%; 
            background: var(--bg); 
            border: 2px solid var(--border); 
            color: var(--text); 
            padding: 12px 14px; 
            border-radius: 8px; 
            font-family: 'Courier New', monospace; 
            font-size: 13px;
            margin-bottom: 18px;
            transition: all 0.3s ease;
        }
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-light);
            transform: translateY(-1px);
        }
        textarea { 
            resize: vertical; 
            font-family: system-ui, sans-serif;
            line-height: 1.6;
        }
        
        /* Buttons */
        button { 
            background: linear-gradient(135deg, var(--accent) 0%, #059669 100%);
            color: #000; 
            border: none; 
            padding: 14px 28px; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: 700; 
            width: 100%; 
            font-size: 15px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        button:hover { 
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }
        button:active {
            transform: translateY(0);
        }
        .btn-secondary { 
            background: linear-gradient(135deg, #64748b 0%, #475569 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(100, 116, 139, 0.3);
        }
        .btn-secondary:hover {
            box-shadow: 0 6px 20px rgba(100, 116, 139, 0.4);
        }
        
        /* Output */
        .output { 
            background: #000; 
            border-radius: 8px; 
            padding: 18px; 
            margin-top: 20px; 
            white-space: pre-wrap; 
            font-family: 'Courier New', monospace; 
            font-size: 13px; 
            max-height: 400px; 
            overflow-y: auto; 
            border: 2px solid var(--border);
            box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
            line-height: 1.6;
        }
        
        /* Info text */
        .info { 
            font-size: 12px; 
            color: #64748b; 
            margin-top: -12px;
            margin-bottom: 18px;
            line-height: 1.5;
        }
        
        /* Media */
        audio, img { 
            width: 100%; 
            margin-top: 15px; 
            border-radius: 8px;
        }
        img {
            border: 2px solid var(--border);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        
        /* Voice grid */
        .voice-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); 
            gap: 14px; 
            margin-bottom: 18px;
        }
        .voice-card { 
            background: var(--bg); 
            border: 2px solid var(--border); 
            border-radius: 8px; 
            padding: 14px; 
            cursor: pointer; 
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .voice-card:hover { 
            border-color: var(--accent); 
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.2);
        }
        .voice-card.selected { 
            border-color: var(--accent); 
            background: var(--accent-light);
            box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
        }
        .voice-name { 
            font-weight: 700; 
            margin-bottom: 6px; 
            font-size: 14px;
            color: var(--text);
        }
        .voice-desc { 
            font-size: 11px; 
            color: #94a3b8; 
            line-height: 1.4;
        }
        .voice-badge { 
            display: inline-block; 
            background: linear-gradient(135deg, var(--accent) 0%, #059669 100%);
            color: #000; 
            padding: 3px 8px; 
            border-radius: 4px; 
            font-size: 9px; 
            margin-left: 6px; 
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Slider */
        .slider-container { 
            margin-bottom: 18px; 
        }
        .slider-value { 
            float: right; 
            color: var(--accent); 
            font-weight: 700; 
            font-size: 14px;
        }
        input[type="range"] { 
            width: 100%; 
            margin-top: 8px;
            height: 6px;
            border-radius: 3px;
            background: var(--border);
            outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: var(--accent);
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
            transition: all 0.3s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.6);
        }
        
        /* Two column layout */
        .two-col { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px; 
        }
        @media (max-width: 768px) { 
            .two-col { 
                grid-template-columns: 1fr; 
            } 
        }
        
        /* File input */
        input[type="file"] { 
            padding: 10px; 
            font-family: system-ui, sans-serif;
            cursor: pointer;
        }
        
        /* Status messages */
        .status {
            margin-top: 12px;
            padding: 10px 14px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            border-left: 4px solid;
        }
        .status.success {
            background: rgba(16, 185, 129, 0.15);
            color: var(--success);
            border-color: var(--success);
        }
        .status.error {
            background: rgba(239, 68, 68, 0.15);
            color: var(--error);
            border-color: var(--error);
        }
        
        /* Media container improvements */
        #imageContainer, #audioContainer {
            margin-top: 20px;
            padding: 20px;
            background: var(--panel);
            border-radius: 12px;
            border: 2px solid var(--border);
        }
        
        /* Download button styling */
        .download-btn {
            display: inline-block;
            margin: 15px 0;
            padding: 12px 24px;
            background: linear-gradient(135deg, var(--accent) 0%, #059669 100%);
            color: #000;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 700;
            font-size: 14px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .download-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header-section">
            <h1>🚀 Z All-in-One API <span class="badge">v${CONFIG.VERSION}</span></h1>
            <p class="subtitle">聊天 + 圖像 + 音頻 - 完整的 Z.ai API 套件</p>
        </div>
        
        <!-- API Key Section -->
        <div class="token-section">
            <div class="token-header">
                <div class="token-title">
                    🔑 API Key
                </div>
                <div class="token-status inactive" id="apiKeyStatus">未設定</div>
            </div>
            <div class="token-input-group">
                <input type="text" id="apiKey" placeholder="輸入您的 API Key（用於圖像和音頻）">
                <button onclick="setApiKey()">設定 API Key</button>
                <button onclick="clearApiKey()" class="btn-secondary" style="width: auto; padding: 10px 20px;">清除</button>
                <button onclick="toggleApiKeyVisibility()" id="toggleKeyBtn" class="btn-secondary" style="width: auto; padding: 10px 20px;">👁️ 顯示</button>
            </div>
            <div class="token-display" id="apiKeyDisplay" style="display: none; margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; font-family: monospace; font-size: 12px; word-break: break-all; color: #94a3b8;">
                <div style="margin-bottom: 5px; color: #cbd5e1; font-weight: 600;">當前 API Key：</div>
                <span id="apiKeyValue">未設定</span>
            </div>
            <div class="token-guide">
                <strong>📖 如何獲取您的 API Key：</strong><br>
                1. 在瀏覽器中打開 <code>image.z.ai</code> 或 <code>audio.z.ai</code> 並登入<br>
                2. 按 <code>F12</code> 開啟開發者工具 → 前往 <strong>應用程式</strong> 分頁<br>
                3. 在左側邊欄展開 <strong>Cookies</strong> → 點擊網站 URL<br>
                4. 找到 <code>session</code> cookie 並複製其 <strong>值</strong>（以 "ey" 開頭）<br>
                5. 將其貼上並點擊「設定 API Key」<br><br>
                <strong>💡 環境變量設定：</strong><br>
                您也可以在 Cloudflare Workers 環境變量中設定 <code>DEFAULT_API_KEY</code>，這樣所有請求都會自動使用該 key。
            </div>
        </div>
        
        <!-- API Endpoint Section -->
        <div class="card">
            <div class="label">API 端點地址</div>
            <input type="text" id="apiUrl" readonly onclick="this.select()" value="">
            <script>document.getElementById('apiUrl').value = window.location.origin + '/v1';</script>
            <div class="info">點擊上方輸入框可複製 API 地址</div>
        </div>
        
        <div class="tabs">
            <button class="tab active" onclick="switchTab('text')">💬 文字聊天</button>
            <button class="tab" onclick="switchTab('image')">🎨 圖像生成</button>
            <button class="tab" onclick="switchTab('audio')">🎵 音頻合成</button>
        </div>
        
        <!-- TEXT CHAT TAB -->
        <div id="text" class="tab-content active">
            <div class="card">
                <div class="label">Session Token（可選 - 使用 "free" 匿名訪問）</div>
                <input type="text" id="textToken" placeholder='輸入 "free" 匿名訪問或貼上您的 token'>
                <div class="info">使用 "free" 進行匿名聊天，或貼上您的 session token 進行認證訪問。</div>
            </div>
            
            <div class="card">
                <div class="label">模型</div>
                <select id="textModel">
                    ${CONFIG.MODEL_LIST.map((m) => `<option value="${m}">${m}</option>`).join("")}
                </select>
                
                <div class="label">訊息</div>
                <textarea id="textPrompt" rows="4" placeholder="輸入您的訊息...">你好！請簡單介紹一下你自己。</textarea>
                
                <button onclick="sendTextRequest()">發送訊息</button>
            </div>
            
            <div class="output" id="textOutput">準備聊天...</div>
        </div>
        
        <!-- IMAGE GENERATION TAB -->
        <div id="image" class="tab-content">
            <div class="card">
                <div class="label">提示詞</div>
                <textarea id="imagePrompt" rows="3" placeholder="描述您想要生成的圖像...">美麗的日落，山脈上充滿鮮豔的色彩</textarea>
                
                <div class="label">寬高比</div>
                <select id="imageRatio">
                    <option value="1:1">1:1 (正方形)</option>
                    <option value="3:4">3:4 (直向)</option>
                    <option value="4:3">4:3 (橫向)</option>
                    <option value="16:9">16:9 (寬螢幕)</option>
                    <option value="9:16">9:16 (手機)</option>
                    <option value="21:9">21:9 (超寬)</option>
                    <option value="9:21">9:21 (長條)</option>
                </select>
                
                <div class="label">解析度</div>
                <select id="imageResolution">
                    <option value="1K">1K</option>
                    <option value="2K">2K</option>
                </select>
                
                <div class="label">生成數量</div>
                <select id="imageCount">
                    <option value="1">1 張</option>
                    <option value="2">2 張</option>
                    <option value="3">3 張</option>
                    <option value="4">4 張</option>
                </select>
                
                <div style="margin-bottom: 18px;">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: #cbd5e1; font-size: 13px; font-weight: 600;">
                        <input type="checkbox" id="adultContent" style="width: auto; margin: 0;">
                        啟用成人圖片生成
                    </label>
                    <div class="info">⚠️ 啟用後將生成成人內容，請謹慎使用</div>
                </div>
                
                <button onclick="generateImage()">生成圖像</button>
            </div>
            
            <div class="output" id="imageOutput">準備生成...</div>
            <div id="imageContainer"></div>
        </div>
        
        <!-- AUDIO SYNTHESIS TAB -->
        <div id="audio" class="tab-content">
            <div class="tabs" style="margin-bottom: 0; border-bottom: 1px solid var(--border);">
                <button class="tab active" onclick="switchAudioTab('synthesis')">語音合成</button>
                <button class="tab" onclick="switchAudioTab('cloning')">語音克隆</button>
            </div>
            
            <!-- Voice Synthesis Sub-Tab -->
            <div id="synthesis" class="tab-content active">
                <div class="card">
                    <div class="label">文字轉語音</div>
                    <textarea id="audioText" rows="3" placeholder="輸入要轉換為語音的文字...">你好！這是 Z.ai 音頻生成 API 的測試。</textarea>
                    
                    <div class="label">選擇語音</div>
                    <div class="voice-grid" id="voiceGrid">
                        <!-- Voices will be loaded dynamically from API -->
                    </div>
                    
                    <div class="slider-container">
                        <div class="label">語速 <span class="slider-value" id="speedValue">1.0</span></div>
                        <input type="range" id="audioSpeed" min="0.5" max="2.0" step="0.1" value="1.0"
                               oninput="document.getElementById('speedValue').textContent = this.value">
                    </div>
                    
                    <div class="slider-container">
                        <div class="label">音量 <span class="slider-value" id="volumeValue">1</span></div>
                        <input type="range" id="audioVolume" min="0" max="10" step="1" value="1"
                               oninput="document.getElementById('volumeValue').textContent = this.value">
                    </div>
                    
                    <button onclick="generateAudio()">生成語音</button>
                </div>
            </div>
            
            <!-- Voice Cloning Sub-Tab -->
            <div id="cloning" class="tab-content">
                <div class="two-col">
                    <div class="card">
                        <h3>步驟 1：上傳語音樣本</h3>
                        <div class="label">音頻文件（最少 3 秒）</div>
                        <input type="file" id="voiceFile" accept="audio/*">
                        <div class="info">上傳您想要克隆的清晰語音樣本</div>
                        
                        <button onclick="uploadVoice()" class="btn-secondary">上傳語音樣本</button>
                        
                        <div id="uploadStatus" class="status" style="display: none;"></div>
                    </div>
                    
                    <div class="card">
                        <h3>步驟 2：克隆語音</h3>
                        <div class="label">語音名稱</div>
                        <input type="text" id="voiceName" placeholder="我的自定義語音">
                        
                        <div class="label">樣本文本（用於克隆）</div>
                        <textarea id="cloneText" rows="3" placeholder="輸入與您的音頻樣本匹配的文字..."></textarea>
                        <div class="info">這應該與您的音頻文件中說的內容相符</div>
                        
                        <div class="label">測試文本（用於生成）</div>
                        <textarea id="testText" rows="3">早晨的陽光溫暖地照耀著，微風輕輕拂過你的臉龐。</textarea>
                        
                        <button onclick="cloneVoice()">克隆語音</button>
                        
                        <div id="cloneStatus" class="status" style="display: none;"></div>
                    </div>
                </div>
            </div>
            
            <div class="output" id="audioOutput">準備生成...</div>
            <div id="audioContainer"></div>
        </div>
    </div>
    
    <script>
        // Set API URL immediately
        window.addEventListener('DOMContentLoaded', function() {
            document.getElementById('apiUrl').value = window.location.origin + '/v1';
            
            // Check if environment variable API key is configured
            const statusEl = document.getElementById('apiKeyStatus');
            const apiKeyInput = document.getElementById('apiKey');
            
            // Try to fetch API status to check if env var is set
            fetch('/v1/models')
                .then(response => {
                    // If we can reach the API, env var might be configured
                    // This is a simple check - actual API calls will verify
                    statusEl.textContent = '✓ 環境變量已設定';
                    statusEl.className = 'token-status active';
                    apiKeyInput.placeholder = '環境變量 API Key 已設定（可覆蓋）';
                    apiKeyInput.disabled = true;
                })
                .catch(err => {
                    // If fetch fails, env var might not be set
                    statusEl.textContent = '未設定';
                    statusEl.className = 'token-status inactive';
                });
            
            // Load API key from localStorage on page load (for override)
            const savedToken = localStorage.getItem('zai_api_key');
            if (savedToken) {
                apiKey = savedToken;
                apiKeyInput.value = savedToken;
                apiKeyInput.disabled = false;
                
                // Update status
                statusEl.textContent = '✓ 已設定（覆蓋）';
                statusEl.className = 'token-status active';
                
                // Load voices with saved token
                loadVoicesFromAPI();
            }
        });
        
        let selectedVoice = { name: 'Lila', id: 'system_001' };
        let uploadedFileId = null;
        let apiKey = '';
        let useEnvVar = true; // Flag to use environment variable
        
        // Set API key function
        function setApiKey() {
            let token = document.getElementById('apiKey').value.trim();
            
            if (!token) {
                alert('請輸入 API Key');
                return;
            }
            
            // If token starts with "ey" (JWT format), add "session=" prefix
            // If it already has "session=", keep it as is
            if (token.startsWith('ey')) {
                token = 'session=' + token;
            } else if (!token.startsWith('session=')) {
                // If it doesn't start with "ey" or "session=", try to extract the JWT part
                const match = token.match(/session=([^;]+)/);
                if (match) {
                    token = 'session=' + match[1];
                } else {
                    alert('無效的 token 格式。Token 應以 "ey" (JWT) 或 "session=" 開頭');
                    return;
                }
            }
            
            apiKey = token;
            useEnvVar = false; // Use user-provided token instead of env var
            document.getElementById('apiKey').value = token;
            
            // Save to localStorage
            localStorage.setItem('zai_api_key', token);
            
            // Update status
            const statusEl = document.getElementById('apiKeyStatus');
            statusEl.textContent = '✓ 已設定（覆蓋環境變量）';
            statusEl.className = 'token-status active';
            
            // Update display if visible
            if (apiKeyVisible) {
                const valueEl = document.getElementById('apiKeyValue');
                valueEl.textContent = token;
                valueEl.style.color = '#94a3b8';
            }
            
            // Reload voices automatically
            loadVoicesFromAPI();
            
            alert('✅ API Key 設定成功！語音列表已更新。');
        }
        
        // Clear API key function (revert to env var)
        function clearApiKey() {
            apiKey = '';
            useEnvVar = true;
            document.getElementById('apiKey').value = '';
            localStorage.removeItem('zai_api_key');
            
            // Update status
            const statusEl = document.getElementById('apiKeyStatus');
            statusEl.textContent = '✓ 環境變量已設定';
            statusEl.className = 'token-status active';
            document.getElementById('apiKey').placeholder = '環境變量 API Key 已設定（可覆蓋）';
            document.getElementById('apiKey').disabled = true;
            
            // Update display if visible
            if (apiKeyVisible) {
                const valueEl = document.getElementById('apiKeyValue');
                valueEl.textContent = '環境變量 API Key（已設定）';
                valueEl.style.color = '#4ade80';
            }
            
            // Reload voices with env var
            loadVoicesFromAPI();
            
            alert('✅ 已清除自定義 API Key，將使用環境變量。');
        }
        
        // Toggle API key visibility
        let apiKeyVisible = false;
        function toggleApiKeyVisibility() {
            apiKeyVisible = !apiKeyVisible;
            const displayEl = document.getElementById('apiKeyDisplay');
            const valueEl = document.getElementById('apiKeyValue');
            const btnEl = document.getElementById('toggleKeyBtn');
            
            if (apiKeyVisible) {
                displayEl.style.display = 'block';
                btnEl.textContent = '🙈 隱藏';
                
                // Show current API key
                if (useEnvVar) {
                    valueEl.textContent = '環境變量 API Key（已設定）';
                    valueEl.style.color = '#4ade80';
                } else if (apiKey) {
                    valueEl.textContent = apiKey;
                    valueEl.style.color = '#94a3b8';
                } else {
                    valueEl.textContent = '未設定';
                    valueEl.style.color = '#ef4444';
                }
            } else {
                displayEl.style.display = 'none';
                btnEl.textContent = '👁️ 顯示';
            }
        }
        
        // Load voices when page loads
        window.addEventListener('DOMContentLoaded', function() {
            // Only load if not already loaded by token restoration
            if (!apiKey) {
                loadVoicesFromAPI();
            }
        });
        
        // Tab switching
        function switchTab(tab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById(tab).classList.add('active');
            
            // Reload voices when switching to audio tab
            if (tab === 'audio') {
                loadVoicesFromAPI();
            }
        }
        
        // Audio sub-tab switching
        function switchAudioTab(tab) {
            const audioTabs = document.querySelectorAll('#audio .tabs .tab');
            const audioContents = document.querySelectorAll('#audio > .tab-content');
            audioTabs.forEach(t => t.classList.remove('active'));
            audioContents.forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById(tab).classList.add('active');
        }
        
        // Voice selection
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.voice-card');
            if (card) {
                document.querySelectorAll('.voice-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedVoice = {
                    name: card.dataset.voice,
                    id: card.dataset.id
                };
                
                // Log selected voice details for debugging
                console.log('🎤 Selected Voice:');
                console.log('  Name:', selectedVoice.name);
                console.log('  ID:', selectedVoice.id);
                console.log('  Full data:', selectedVoice);
            }
        });
        
        // Load voices from API
        async function loadVoicesFromAPI() {
            const grid = document.getElementById('voiceGrid');
            const token = apiKey || '';
            
            // Show loading state
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 20px;">載入語音中...</div>';
            
            try {
                const headers = {};
                if (token) {
                    // Extract just the JWT part if it has "session=" prefix
                    const cleanToken = token.replace('session=', '');
                    headers['Authorization'] = 'Bearer ' + cleanToken;
                }
                
                const response = await fetch('/v1/audio/voices', { headers });
                
                if (!response.ok) {
                    throw new Error('載入語音失敗: ' + response.status);
                }
                
                const data = await response.json();
                console.log('Voices API response:', data);
                
                // Clear grid
                grid.innerHTML = '';
                
                // Always add official voices first
                const officialVoices = [
                    { voice_name: 'Lila', voice_id: 'system_001', input_text: 'Cheerful, standard pronunciation female voice' },
                    { voice_name: 'Ethan', voice_id: 'system_002', input_text: 'Sunny, standard pronunciation male voice' },
                    { voice_name: 'Chloe', voice_id: 'system_003', input_text: 'Gentle, elegant, intelligent female voice' }
                ];
                
                let firstVoice = true;
                
                // Add official voices
                officialVoices.forEach((voice) => {
                    const card = document.createElement('div');
                    card.className = 'voice-card' + (firstVoice ? ' selected' : '');
                    card.dataset.voice = voice.voice_name;
                    card.dataset.id = voice.voice_id;
                    
                    const desc = voice.input_text || 'Official voice';
                    
                    card.innerHTML = '<div class="voice-name">' + voice.voice_name + ' <span class="voice-badge">OFFICIAL</span></div>' +
                                    '<div class="voice-desc">' + desc + '</div>';
                    grid.appendChild(card);
                    
                    if (firstVoice) {
                        selectedVoice = { name: voice.voice_name, id: voice.voice_id };
                        console.log('Selected voice:', selectedVoice);
                        firstVoice = false;
                    }
                });
                
                // Add custom voices from API
                if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                    console.log('找到 ' + data.data.length + ' 個自定義語音');
                    
                    data.data.forEach((voice) => {
                        const card = document.createElement('div');
                        card.className = 'voice-card';
                        card.dataset.voice = voice.voice_name;
                        card.dataset.id = voice.voice_id;
                        
                        // Use input_text as description or default text
                        const desc = voice.input_text ? voice.input_text.substring(0, 50) + '...' : 'Custom cloned voice';
                        
                        card.innerHTML = '<div class="voice-name">' + voice.voice_name + '</div>' +
                                        '<div class="voice-desc">' + desc + '</div>';
                        grid.appendChild(card);
                    });
                }
                
            } catch (e) {
                console.error('載入語音失敗:', e);
                
                // On error, still show official voices
                grid.innerHTML = '';
                const officialVoices = [
                    { voice_name: 'Lila', voice_id: 'system_001', input_text: 'Cheerful, standard pronunciation female voice' },
                    { voice_name: 'Ethan', voice_id: 'system_002', input_text: 'Sunny, standard pronunciation male voice' },
                    { voice_name: 'Chloe', voice_id: 'system_003', input_text: 'Gentle, elegant, intelligent female voice' }
                ];
                
                officialVoices.forEach((voice, index) => {
                    const card = document.createElement('div');
                    card.className = 'voice-card' + (index === 0 ? ' selected' : '');
                    card.dataset.voice = voice.voice_name;
                    card.dataset.id = voice.voice_id;
                    
                    card.innerHTML = '<div class="voice-name">' + voice.voice_name + ' <span class="voice-badge">OFFICIAL</span></div>' +
                                    '<div class="voice-desc">' + voice.input_text + '</div>';
                    grid.appendChild(card);
                    
                    if (index === 0) {
                        selectedVoice = { name: voice.voice_name, id: voice.voice_id };
                    }
                });
                
                // Show error message below voices
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'grid-column: 1/-1; text-align: center; color: #ef4444; padding: 10px; font-size: 11px;';
                errorDiv.textContent = '⚠️ 無法載入自定義語音: ' + e.message;
                grid.appendChild(errorDiv);
            }
        }
        
        // Upload voice sample
        async function uploadVoice() {
            const fileInput = document.getElementById('voiceFile');
            const token = apiKey || '';
            const statusDiv = document.getElementById('uploadStatus');
            
            if (!fileInput.files[0]) {
                statusDiv.textContent = '❌ 請選擇音頻文件';
                statusDiv.className = 'status error';
                statusDiv.style.display = 'block';
                return;
            }
            
            if (!token) {
                statusDiv.textContent = '❌ 請先設定您的 API Key';
                statusDiv.className = 'status error';
                statusDiv.style.display = 'block';
                return;
            }
            
            statusDiv.textContent = '⏳ 上傳中...';
            statusDiv.className = 'status';
            statusDiv.style.display = 'block';
            
            try {
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                
                const headers = {};
                // Extract just the JWT part
                const cleanToken = token.replace('session=', '');
                headers['Authorization'] = 'Bearer ' + cleanToken;
                
                const response = await fetch('/v1/audio/voices/upload', {
                    method: 'POST',
                    headers: headers,
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok && data.code === 200) {
                    uploadedFileId = data.data.voice_file_id;
                    const transcript = data.data.text;
                    
                    statusDiv.textContent = '✅ 上傳成功！';
                    statusDiv.className = 'status success';
                    document.getElementById('cloneText').value = transcript;
                    document.getElementById('audioOutput').textContent = '✅ 語音樣本上傳成功！';
                } else {
                    statusDiv.textContent = '❌ 上傳失敗: ' + (data.message || '未知錯誤');
                    statusDiv.className = 'status error';
                }
            } catch (e) {
                statusDiv.textContent = '❌ 錯誤: ' + e.message;
                statusDiv.className = 'status error';
            }
        }
        
        // Clone voice
        async function cloneVoice() {
            const statusDiv = document.getElementById('cloneStatus');
            const token = apiKey || '';
            const voiceName = document.getElementById('voiceName').value;
            const cloneText = document.getElementById('cloneText').value;
            const testText = document.getElementById('testText').value;
            
            if (!token) {
                statusDiv.textContent = '❌ 請先設定您的 API Key';
                statusDiv.className = 'status error';
                statusDiv.style.display = 'block';
                return;
            }
            
            if (!uploadedFileId) {
                statusDiv.textContent = '❌ 請先上傳語音樣本';
                statusDiv.className = 'status error';
                statusDiv.style.display = 'block';
                return;
            }
            
            if (!voiceName) {
                statusDiv.textContent = '❌ 請輸入語音名稱';
                statusDiv.className = 'status error';
                statusDiv.style.display = 'block';
                return;
            }
            
            statusDiv.textContent = '⏳ 克隆語音中...';
            statusDiv.className = 'status';
            statusDiv.style.display = 'block';
            
            try {
                const headers = { 'Content-Type': 'application/json' };
                // Extract just the JWT part
                const cleanToken = token.replace('session=', '');
                headers['Authorization'] = 'Bearer ' + cleanToken;
                
                const response = await fetch('/v1/audio/voices/clone', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        voice_name: voiceName,
                        voice_file_id: uploadedFileId,
                        input_text: testText,
                        origin_audio_text: cloneText
                    })
                });
                
                const data = await response.json();
                
                if (response.ok && data.code === 200) {
                    statusDiv.textContent = '✅ 語音克隆成功！';
                    statusDiv.className = 'status success';
                    
                    const audioUrl = data.data.show_audio;
                    
                    // Play sample
                    const audioContainer = document.getElementById('audioContainer');
                    audioContainer.innerHTML = '';
                    const audio = document.createElement('audio');
                    audio.controls = true;
                    audio.src = audioUrl;
                    audioContainer.appendChild(audio);
                    
                    document.getElementById('audioOutput').textContent = '✅ 語音 "' + voiceName + '" 克隆成功！';
                    
                    // Reload voices list to include the new voice
                    await loadVoicesFromAPI();
                    
                    // Switch to synthesis tab after 2 seconds
                    setTimeout(() => {
                        const synthTab = document.querySelector('#audio .tabs .tab:first-child');
                        if (synthTab) synthTab.click();
                    }, 2000);
                } else {
                    statusDiv.textContent = '❌ 克隆失敗: ' + (data.message || '未知錯誤');
                    statusDiv.className = 'status error';
                }
            } catch (e) {
                statusDiv.textContent = '❌ 錯誤: ' + e.message;
                statusDiv.className = 'status error';
            }
        }
        
        // TEXT CHAT
        async function sendTextRequest() {
            const model = document.getElementById('textModel').value;
            const prompt = document.getElementById('textPrompt').value;
            const token = document.getElementById('textToken').value.trim();
            const output = document.getElementById('textOutput');
            
            output.textContent = '發送請求中...';
            
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (token) {
                    headers['Authorization'] = 'Bearer ' + token;
                }
                
                const response = await fetch('/v1/chat/completions', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        model,
                        messages: [{ role: 'user', content: prompt }],
                        stream: true
                    })
                });
                
                if (!response.ok) {
                    const err = await response.text();
                    output.textContent = '錯誤: ' + err;
                    return;
                }
                
                output.textContent = '';
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\\n');
                    buffer = lines.pop();
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                            try {
                                const data = JSON.parse(line.slice(6));
                                const delta = data.choices?.[0]?.delta;
                                if (delta?.content) output.textContent += delta.content;
                                if (delta?.reasoning_content) output.textContent += delta.reasoning_content;
                            } catch {}
                        }
                    }
                }
            } catch (e) {
                output.textContent = '錯誤: ' + e.message;
            }
        }
        
        // IMAGE GENERATION
        async function generateImage() {
            const prompt = document.getElementById('imagePrompt').value;
            const ratio = document.getElementById('imageRatio').value;
            const resolution = document.getElementById('imageResolution').value;
            const count = parseInt(document.getElementById('imageCount').value);
            const adultContent = document.getElementById('adultContent').checked;
            const token = apiKey || '';
            const output = document.getElementById('imageOutput');
            const imageContainer = document.getElementById('imageContainer');
            
            if (!token) {
                output.textContent = '❌ 請先設定您的 API Key';
                return;
            }
            
            output.textContent = '⏳ 生成圖像中...';
            imageContainer.innerHTML = '';
            
            try {
                const headers = { 'Content-Type': 'application/json' };
                headers['Authorization'] = 'Bearer ' + token;
                
                const requestBody = {
                    prompt,
                    ratio,
                    resolution,
                    remove_watermark: true
                };
                
                // Add adult content parameter if enabled
                if (adultContent) {
                    requestBody.adult_content = true;
                }
                
                // Generate multiple images
                const promises = [];
                for (let i = 0; i < count; i++) {
                    promises.push(
                        fetch('/v1/images/generations', {
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify(requestBody)
                        })
                    );
                }
                
                const responses = await Promise.all(promises);
                let successCount = 0;
                
                // Create a grid container for multiple images
                if (count > 1) {
                    imageContainer.style.display = 'grid';
                    imageContainer.style.gridTemplateColumns = count > 2 ? 'repeat(2, 1fr)' : 'repeat(' + count + ', 1fr)';
                    imageContainer.style.gap = '20px';
                }
                
                for (let i = 0; i < responses.length; i++) {
                    const response = responses[i];
                    const data = await response.json();
                    
                    if (response.ok && data.data?.[0]?.url) {
                        successCount++;
                        const imgWrapper = document.createElement('div');
                        imgWrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center;';
                        
                        const img = document.createElement('img');
                        img.src = data.data[0].url;
                        img.style.cssText = 'width: 100%; border-radius: 8px; border: 2px solid var(--border);';
                        
                        const label = document.createElement('div');
                        label.textContent = '圖片 ' + (i + 1);
                        label.style.cssText = 'margin-top: 10px; color: #94a3b8; font-size: 12px;';
                        
                        imgWrapper.appendChild(img);
                        imgWrapper.appendChild(label);
                        imageContainer.appendChild(imgWrapper);
                    }
                }
                
                if (successCount > 0) {
                    output.textContent = '✅ 成功生成 ' + successCount + ' 張圖像！';
                } else {
                    output.textContent = '❌ 圖像生成失敗';
                }
            } catch (e) {
                output.textContent = '❌ 錯誤: ' + e.message;
            }
        }
        
        // AUDIO GENERATION
        async function generateAudio() {
            const text = document.getElementById('audioText').value;
            const speed = parseFloat(document.getElementById('audioSpeed').value);
            const volume = parseInt(document.getElementById('audioVolume').value);
            const token = apiKey || '';
            const output = document.getElementById('audioOutput');
            const audioContainer = document.getElementById('audioContainer');
            
            if (!token) {
                output.textContent = '❌ 請先設定您的 API Key';
                return;
            }
            
            output.textContent = '⏳ 生成音頻中...';
            audioContainer.innerHTML = '';
            
            try {
                const headers = { 'Content-Type': 'application/json' };
                // Extract just the JWT part
                const cleanToken = token.replace('session=', '');
                headers['Authorization'] = 'Bearer ' + cleanToken;
                
                const response = await fetch('/v1/audio/speech', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ 
                        input: text,
                        voice: selectedVoice.name,
                        voice_id: selectedVoice.id,
                        speed: speed,
                        volume: volume,
                        model: "tts-1"
                    })
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    
                    const audio = document.createElement('audio');
                    audio.controls = true;
                    audio.src = url;
                    audioContainer.appendChild(audio);
                    
                    // Add download button
                    const downloadBtn = document.createElement('a');
                    downloadBtn.href = url;
                    downloadBtn.download = 'audio-' + Date.now() + '.wav';
                    downloadBtn.textContent = '⬇️ 下載音頻';
                    downloadBtn.className = 'download-btn';
                    audioContainer.appendChild(downloadBtn);
                    
                    output.textContent = '✅ 音頻生成成功！\\n\\n語音: ' + selectedVoice.name + ' | 語速: ' + speed + 'x | 音量: ' + volume;
                    audio.play();
                } else {
                    const error = await response.json();
                    output.textContent = '❌ 錯誤: ' + (error.error || error.message || '未知錯誤');
                }
            } catch (e) {
                output.textContent = '❌ 錯誤: ' + e.message;
            }
        }
    </script>
</body>
</html>`;
    return new Response(html, { 
        headers: { "Content-Type": "text/html;charset=UTF-8" } 
    });
}
__name(handleWebUI, "handleWebUI");

export {
    worker_default as default
};
