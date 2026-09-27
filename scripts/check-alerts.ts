/**
 * Proves a lead alert would actually arrive.
 *
 * Run before trusting the pipeline: npm run check:alerts
 *
 * Sends a clearly-marked test message through every configured channel and
 * writes nothing to the database. A lead that is saved but never delivered is
 * the worst failure this system has — it looks like success everywhere except
 * the one place that matters.
 */

import { alertChannels } from "../lib/leads/alerts";

async function telegram(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    console.log("telegram  ✗  not configured (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)");
    return;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chat,
      text: "UAEvia test alert — if you can read this, new leads will reach you here.",
      disable_web_page_preview: true,
    }),
  });

  if (res.ok) {
    console.log("telegram  ✓  sent — check the chat");
    return;
  }

  const body = (await res.text()).slice(0, 300);
  console.log(`telegram  ✗  HTTP ${res.status}: ${body}`);
  if (res.status === 401) console.log("             the bot token is wrong");
  if (res.status === 400 && body.includes("chat not found")) {
    console.log("             the chat id is wrong, or you have not messaged the bot yet —");
    console.log("             open the bot in Telegram and send it /start first");
  }
}

async function email(): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_ALERT_EMAIL;
  const from = process.env.LEAD_ALERT_FROM;
  if (!key || !to || !from) {
    console.log("email     ✗  not configured (RESEND_API_KEY, LEAD_ALERT_EMAIL, LEAD_ALERT_FROM)");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "UAEvia test alert",
      text: "If you can read this, new leads will reach you here.",
    }),
  });

  console.log(
    res.ok ? `email     ✓  sent to ${to}` : `email     ✗  HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`,
  );
}

async function main(): Promise<void> {
  const configured = alertChannels();
  console.log(
    configured.length > 0
      ? `Configured: ${configured.join(", ")}\n`
      : "Nothing is configured. A lead would be saved and nobody would be told.\n",
  );

  await telegram();
  await email();
}

void main();
