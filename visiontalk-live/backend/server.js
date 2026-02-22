import express from "express";
import WebSocket from "ws";
import { GeminiLiveClient } from "@google/genai";

const app = express();
const server = app.listen(8080);
const wss = new WebSocket.Server({ server });

const client = new GeminiLiveClient({
    model: "gemini-2.0-flash-live",
    systemInstruction: `
  You are a real-time tutor.
  Stop speaking if interrupted.
  Explain clearly using the visible image.
  `
});

wss.on("connection", ws => {
    client.startSession();

    ws.on("message", async msg => {
        const data = JSON.parse(msg);

        if (data.type === "audio") {
            client.sendAudio(data.chunk);
        }

        if (data.type === "image") {
            client.sendImage(data.frame);
        }
    });

    client.onResponse(audioChunk => {
        ws.send(JSON.stringify({
            type: "audio",
            chunk: audioChunk
        }));
    });
});