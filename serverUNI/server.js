const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { askChatGPT } = require("./llm");

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, "data", "db.json");

function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Ошибка чтения db.json:", e);
    return null;
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Ошибка записи в db.json:", e);
  }
}

app.get("/users", (req, res) => {
  console.log("GET /users");
  const db = readDB();
  if (!db) return res.json([]);
  let users = db.users || [];

  if (req.query.age) {
    const age = Number(req.query.age);
    users = users.filter(u => u.age === age);
  }

  res.json(users);
});

app.post("/users", (req, res) => {
  console.log("POST /users", req.body);
  const db = readDB() || { users: [], universities: [] };
  const newUser = req.body;
  newUser.id = Date.now();
  db.users = db.users || [];
  db.users.push(newUser);
  writeDB(db);
  res.status(201).json(newUser);
});

app.delete("/users/:id", (req, res) => {
  console.log("DELETE /users/:id");
  const db = readDB();
  if (!db) return res.status(404).json({ message: "DB not found" });
  const id = Number(req.params.id);
  db.users = (db.users || []).filter(u => u.id !== id);
  writeDB(db);
  res.json({ message: "User deleted" });
});

app.put("/users/:id", (req, res) => {
  console.log("PUT /users/:id", req.body);
  const db = readDB();
  if (!db) return res.status(404).json({ message: "DB not found" });
  const id = Number(req.params.id);
  const idx = (db.users || []).findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ message: "User not found" });
  db.users[idx] = { ...db.users[idx], ...req.body };
  writeDB(db);
  res.json(db.users[idx]);
});

app.get("/universities", (req, res) => {
  const db = readDB();
  res.json(db && db.universities ? db.universities : []);
});

app.post("/ask", async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.json({ answer: "Пожалуйста, задайте вопрос." });
  }

  console.log("Вопрос пользователя:", question);

  const dbData = readDB();

  if (!dbData || !Array.isArray(dbData.universities)) {
    return res.json({ answer: "Ошибка: База данных университетов пуста или неверного формата." });
  }

  let universitiesContext;
  try {
    universitiesContext = JSON.stringify(dbData.universities);
  } catch (e) {
    console.error("Ошибка сериализации universities:", e);
    return res.json({ answer: "Ошибка при подготовке данных для ИИ." });
  }

  const systemPrompt = `
Ты — интеллектуальный ассистент "Uncollabi". Твоя цель — помогать абитуриентам выбирать вузы в Казахстане.

ВОТ ПОЛНЫЕ ДАННЫЕ О ВСЕХ УНИВЕРСИТЕТАХ В JSON ФОРМАТЕ:
${universitiesContext}

ИНСТРУКЦИИ:
1. Используй ТОЛЬКО предоставленные данные из JSON выше. Не придумывай факты, которых нет в базе.
2. Если пользователь просит сравнить вузы, делай это структурированно (например, по стоимости, программам, рейтингу).
3. Если данных не хватает для ответа, честно скажи об этом.
4. Отвечай дружелюбно, используй эмодзи, форматируй ответ (списки, жирный текст) для удобства чтения.
5. Твой ответ должен быть на русском языке.
`;

  try {
    const answer = await askChatGPT(systemPrompt, question);
    res.json({ answer });
  } catch (err) {
    console.error("Ошибка при обращении к LLM:", err);
    res.json({ answer: "Ошибка сервера: не удалось получить ответ от ChatGPT." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT} (ChatGPT Powered)`);
});
