import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import path from "node:path";

const API_URL = String(process.env.BOT_API_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/+$/, "");
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.resolve(process.cwd(), ".auth");
const GROUP_JID = String(process.env.WHATSAPP_GROUP_JID || "").trim();
const TRIGGER = String(process.env.WHATSAPP_TRIGGER || "!crickuru").trim().toLowerCase();

function messageText(message) {
  const content = message?.message || {};
  return String(content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption || "").trim();
}

function wasTriggered(message, text, ownJid) {
  const mentions = message?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  return text.toLowerCase().startsWith(TRIGGER) || mentions.some((jid) => String(jid).split(":")[0] === String(ownJid).split(":")[0]);
}

async function askAssistant(message) {
  const prompt = message.replace(new RegExp(`^${TRIGGER}\\s*`, "i"), "").trim();
  if (!prompt) return "Tag me with a question about a Warriors player, career totals, recent cross-team form, or the latest team matches.";
  const response = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: prompt }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Assistant unavailable");
  return payload.answer || "No answer available.";
}

export async function startWhatsAppBot() {
  if (!GROUP_JID) throw new Error("Set WHATSAPP_GROUP_JID before enabling the WhatsApp adapter");
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const socket = makeWASocket({ auth: state, printQRInTerminal: false, markOnlineOnConnect: false });
  socket.ev.on("creds.update", saveCreds);
  socket.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("Scan this WhatsApp QR from the account that should operate the CricKuru bot:");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") console.log(`CricKuru WhatsApp bot connected for group ${GROUP_JID}`);
    if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      setTimeout(() => startWhatsAppBot().catch((error) => console.error("WhatsApp reconnect failed:", error)), 5000);
    }
  });
  socket.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const message of messages) {
      const group = message.key.remoteJid;
      if (message.key.fromMe || group !== GROUP_JID || !group.endsWith("@g.us")) continue;
      const text = messageText(message);
      if (!text || !wasTriggered(message, text, socket.user?.id || "")) continue;
      try {
        const answer = await askAssistant(text);
        await socket.sendMessage(group, { text: `CricKuru Bot: ${answer}` }, { quoted: message });
      } catch (error) {
        console.error("WhatsApp answer failed:", error.message);
        await socket.sendMessage(group, { text: "CricKuru Bot is temporarily unavailable. Please try again shortly." }, { quoted: message });
      }
    }
  });
}
