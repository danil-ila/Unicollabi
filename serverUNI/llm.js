require('dotenv').config();
const fetch = require('node-fetch');

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function askChatGPT(systemPrompt, userQuestion) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("❌ Ошибка: нет OPENAI_API_KEY в .env");
    throw new Error("Server configuration error");
  }

  const body = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userQuestion }
    ],
    temperature: 0.7,
    max_tokens: 1000
  };

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("OpenAI API error", res.status, text);
    throw new Error(`OpenAI API error ${res.status}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("Invalid JSON from OpenAI:", e, text);
    throw new Error("Invalid response from AI service");
  }

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error("Unexpected OpenAI response shape:", data);
    throw new Error("Unexpected response from AI");
  }

  return data.choices[0].message.content;
}

module.exports = { askChatGPT };
