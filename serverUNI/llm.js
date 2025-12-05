require('dotenv').config();
const fetch = require("node-fetch");

async function askChatGPT(systemPrompt, userQuestion) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("❌ Ошибка: Не найден OPENAI_API_KEY в файле .env");
    return "Ошибка сервера: Отсутствует API ключ.";
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuestion }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("OpenAI Error:", data.error);
      return `Ошибка OpenAI: ${data.error.message}`;
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("OpenAI: неожиданный ответ:", data);
      return "Ошибка: неожиданный ответ от OpenAI.";
    }

    return data.choices[0].message.content;

  } catch (err) {
    console.error("Ошибка сети или API:", err.message);
    return "Произошла ошибка при связи с сервисом ИИ 😢";
  }
}

module.exports = { askChatGPT };
