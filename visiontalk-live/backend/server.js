require("dotenv").config();

const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");
const { GoogleGenAI, Modality } = require("@google/genai");

const PORT = Number(process.env.PORT) || 8080;
const MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-live-2.5-flash-preview";
const rawApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
const API_KEY = rawApiKey.trim().replace(/^['"]|['"]$/g, "");

if (!API_KEY) {
    console.error("Missing API key. Set GOOGLE_API_KEY or GEMINI_API_KEY.");
    process.exit(1);
}

const app = express();
const server = app.listen(PORT, () => {
    console.log(`VisionTalk backend listening on port ${PORT}`);
});
const wss = new WebSocketServer({ server });
const ai = new GoogleGenAI({ apiKey: API_KEY });

app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

function sendJson(ws, payload) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
    }
}

wss.on("connection", async ws => {
    let session;

    try {
        session = await ai.live.connect({
            model: MODEL,
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: "You are a real-time tutor. Stop speaking if interrupted. Explain clearly using the visible image."
            },
            callbacks: {
                onmessage: message => {
                    if (message.serverContent?.interrupted) {
                        sendJson(ws, { type: "interrupted" });
                    }

                    if (message.data) {
                        sendJson(ws, { type: "audio", chunk: message.data });
                    }

                    if (message.text) {
                        sendJson(ws, { type: "text", text: message.text });
                    }
                },
                onerror: error => {
                    sendJson(ws, { type: "error", error: error?.message || "Gemini live session error" });
                }
            }
        });
    } catch (error) {
        sendJson(ws, { type: "error", error: "Failed to start Gemini live session." });
        ws.close(1011, "Failed to start live session");
        console.error("Live session startup error:", error);
        return;
    }

    sendJson(ws, { type: "ready" });

    ws.on("message", raw => {
        let data;
        try {
            data = JSON.parse(raw.toString());
        } catch {
            sendJson(ws, { type: "error", error: "Invalid JSON message." });
            return;
        }

        try {
            switch (data.type) {
            case "audio":
                if (typeof data.chunk !== "string" || !data.chunk) {
                    sendJson(ws, { type: "error", error: "Audio chunk is missing." });
                    return;
                }
                session.sendRealtimeInput({
                    audio: {
                        mimeType: data.mimeType || "audio/pcm;rate=16000",
                        data: data.chunk
                    }
                });
                break;
            case "image":
                if (typeof data.frame !== "string" || !data.frame) {
                    sendJson(ws, { type: "error", error: "Image frame is missing." });
                    return;
                }
                session.sendRealtimeInput({
                    media: {
                        mimeType: data.mimeType || "image/jpeg",
                        data: data.frame
                    }
                });
                break;
            case "text":
                if (typeof data.text !== "string" || !data.text.trim()) {
                    sendJson(ws, { type: "error", error: "Text input is missing." });
                    return;
                }
                session.sendClientContent({
                    turns: [{ role: "user", parts: [{ text: data.text }] }],
                    turnComplete: data.turnComplete !== false
                });
                break;
            case "audio_end":
                session.sendRealtimeInput({ audioStreamEnd: true });
                break;
            default:
                sendJson(ws, { type: "error", error: `Unsupported message type: ${data.type}` });
            }
        } catch (error) {
            sendJson(ws, { type: "error", error: "Failed to process message." });
            console.error("Message processing error:", error);
        }
    });

    ws.on("close", () => {
        session.close();
    });

    ws.on("error", error => {
        console.error("WebSocket error:", error);
        session.close();
    });
});

function shutdown(signal) {
    console.log(`Received ${signal}. Shutting down...`);
    wss.clients.forEach(client => {
        try {
            client.close(1001, "Server shutting down");
        } catch (error) {
            console.error("Failed to close client connection:", error);
        }
    });
    server.close(() => {
        process.exit(0);
    });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
