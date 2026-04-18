import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import cors from "cors";
import {
  handleIncomingText,
  handleMenuOption,
  notifyClientBooking,
  notifyOwnerBooking,
} from "./whatsapp.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

app.get("/", (req, res) => {
  res.status(200).send("Servidor WhatsApp funcionando");
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso!");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;
    const type = message.type;

    if (type === "text") {
      const text = message.text?.body || "";
      console.log(`Mensagem de ${from}: ${text}`);
      await handleIncomingText(from, text);
    }

    if (type === "interactive") {
      const listId =
        message.interactive?.list_reply?.id ||
        message.interactive?.button_reply?.id;

      if (listId) {
        console.log(`Opção clicada por ${from}: ${listId}`);
        await handleMenuOption(from, listId);
      }
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Erro no webhook:", error.response?.data || error.message);
    return res.sendStatus(500);
  }
});

app.post("/booking-webhook", async (req, res) => {
  try {
   const authHeader = (req.headers.authorization || "").trim();
const expectedToken = `Bearer ${(process.env.BOOKING_WEBHOOK_TOKEN || "").trim()}`;

console.log("HEADER RECEBIDO:", `[${authHeader}]`);
console.log("TOKEN ESPERADO:", `[${expectedToken}]`);

    if (authHeader !== expectedToken) {
  return res.status(401).json({ error: "Não autorizado" });
}

    const {
      customerName,
      customerPhone,
      service,
      date,
      time,
      vehicle,
      status,
    } = req.body;

    if (!customerPhone || !service || !date || !time) {
      return res.status(400).json({
        error: "Campos obrigatórios: customerPhone, service, date, time",
      });
    }

    if (status && status !== "confirmed") {
      return res.status(200).json({
        ok: true,
        message: "Status recebido sem envio de notificação.",
      });
    }

    await notifyClientBooking({
      customerPhone,
      customerName,
      service,
      date,
      time,
    });

    await notifyOwnerBooking({
      customerName,
      customerPhone,
      service,
      date,
      time,
      vehicle,
    });

    return res.status(200).json({
      ok: true,
      message: "Notificações enviadas com sucesso.",
    });
  } catch (error) {
    console.error(
      "Erro no booking-webhook:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      error: "Erro ao processar agendamento",
    });
  }
});

app.get("/debug-token-raw", (req, res) => {
  const token = process.env.WHATSAPP_TOKEN || "";
  res.json({
    startsWith: token.slice(0, 15),
    endsWith: token.slice(-15),
    length: token.length,
    hasSpaces: /\s/.test(token),
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

app.get("/debug-token", (req, res) => {
  const token = process.env.WHATSAPP_TOKEN || "";
  res.json({
    exists: !!token,
    startsWith: token.slice(0, 10),
    length: token.length,
  });
});