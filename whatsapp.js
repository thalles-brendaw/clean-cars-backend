import axios from "axios";

function getApi() {
  const token = (process.env.WHATSAPP_TOKEN || "").trim();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();

  return axios.create({
    baseURL: `https://graph.facebook.com/v25.0/${phoneNumberId}`,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

export async function sendTextMessage(to, body) {
  const api = getApi();

  return api.post("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
}

export async function sendMainMenu(to) {
  const api = getApi();

  return api.post("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: {
        text: "Olá, seja bem-vindo ao Clean Cars 🚗\n\nComo podemos ajudar você?",
      },
      footer: {
        text: "Selecione uma opção",
      },
      action: {
        button: "Ver opções",
        sections: [
          {
            title: "Atendimento",
            rows: [
              {
                id: "menu_values",
                title: "Valores",
                description: "Ver preços e serviços",
              },
              {
                id: "menu_schedule",
                title: "Agendar horário",
                description: "Receber o link do agendamento",
              },
              {
                id: "menu_address",
                title: "Endereço e horário",
                description: "Ver localização e funcionamento",
              },
              {
                id: "menu_human",
                title: "Falar com atendente",
                description: "Encaminhar para atendimento",
              },
            ],
          },
        ],
      },
    },
  });
}

export async function sendScheduleLink(to) {
  const bookingLink = `${process.env.BOOKING_LINK}?phone=${to}`;

  return sendTextMessage(
    to,
    `Perfeito 🚗\n\nPara agendar seu horário, acesse o link abaixo:\n\n${bookingLink}\n\nEscolha o serviço, veja os horários disponíveis e finalize seu agendamento.`
  );
}

export async function notifyClientBooking({
  customerPhone,
  customerName,
  service,
  date,
  time,
}) {
  const nome = customerName || "cliente";

  return sendTextMessage(
    customerPhone,
    `Olá, ${nome}! Seu agendamento foi confirmado com sucesso ✅\n\nServiço: ${service}\nData: ${date}\nHorário: ${time}\n\nAguardamos você na Clean Cars 🚗`
  );
}

export async function notifyOwnerBooking({
  customerName,
  customerPhone,
  service,
  date,
  time,
  vehicle,
}) {
  const ownerPhone = (process.env.OWNER_WHATSAPP || "").trim();

  if (!ownerPhone) {
    throw new Error("OWNER_WHATSAPP não configurado no .env");
  }

  return sendTextMessage(
    ownerPhone,
    `📅 Novo agendamento recebido!\n\nCliente: ${customerName || "Não informado"}\nTelefone: ${customerPhone}\nVeículo: ${vehicle || "Não informado"}\nServiço: ${service}\nData: ${date}\nHorário: ${time}`
  );
}

export async function handleMenuOption(from, optionId) {
  if (optionId === "menu_values") {
    return sendTextMessage(
      from,
      `Confira nossos serviços:\n\nLavagem simples — R$ 30\nLavagem completa — R$ 50\nHigienização interna — R$ 80\nPolimento técnico — sob consulta`
    );
  }

  if (optionId === "menu_schedule") {
    return sendScheduleLink(from);
  }

  if (optionId === "menu_address") {
    return sendTextMessage(
      from,
      `Endereço:\nRua Exemplo, 123 - Centro\n\nHorário de funcionamento:\nSegunda a sábado, das 08:00 às 18:00.`
    );
  }

  if (optionId === "menu_human") {
    return sendTextMessage(
      from,
      `Certo, vou encaminhar seu atendimento. Aguarde um momento.\n\nSe preferir, você também pode agendar por aqui:\n${process.env.BOOKING_LINK}`
    );
  }

  return sendMainMenu(from);
}

export async function handleIncomingText(from, text) {
  const msg = (text || "").trim().toLowerCase();

  if (
    msg === "oi" ||
    msg === "ola" ||
    msg === "olá" ||
    msg === "menu" ||
    msg === "bom dia" ||
    msg === "boa tarde" ||
    msg === "boa noite"
  ) {
    return sendMainMenu(from);
  }

  if (
    msg === "1" ||
    msg === "valores" ||
    msg === "valor" ||
    msg === "preço" ||
    msg === "precos" ||
    msg === "preços"
  ) {
    return handleMenuOption(from, "menu_values");
  }

  if (
    msg === "2" ||
    msg === "agendar" ||
    msg === "agendamento" ||
    msg === "agendar horario" ||
    msg === "agendar horário"
  ) {
    return handleMenuOption(from, "menu_schedule");
  }

  if (
    msg === "3" ||
    msg === "endereço" ||
    msg === "endereco" ||
    msg === "horário" ||
    msg === "horario" ||
    msg === "localização" ||
    msg === "localizacao"
  ) {
    return handleMenuOption(from, "menu_address");
  }

  if (
    msg === "4" ||
    msg === "atendente" ||
    msg === "falar com atendente" ||
    msg === "humano"
  ) {
    return handleMenuOption(from, "menu_human");
  }

  return sendMainMenu(from);
}