// /api/solapro-chat.js
// Vercel Serverless Function — محادثة مستمرة (سؤال وجواب) مع نفس سياق الطفل
// يشتغل مع Gemini (مجاني) أو Claude حسب متغير AI_PROVIDER — راجع api/_lib/ai-provider.js

import { buildSystemPrompt, buildChildContextBlock } from './_lib/solapro-context.js';
import { callAI } from './_lib/ai-provider.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { context, history, message } = req.body || {};

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'الرسالة مفقودة' });
  }
  if (!Array.isArray(history)) {
    return res.status(400).json({ error: 'سجل المحادثة غير صالح' });
  }
  // حد أقصى بسيط لطول المحادثة يُرسل مع كل طلب (حماية من إساءة الاستخدام/التكلفة)
  const trimmedHistory = history.slice(-20);

  const ctx = context || {};
  const systemPrompt = `${buildSystemPrompt()}

${buildChildContextBlock(ctx)}

استمري في المحادثة مع الأم بناءً على السياق أعلاه وردودك السابقة. ردودك تكون قصيرة وعملية ومباشرة، من غير تكرار كل بيانات الطفل في كل مرة إلا لو اتسألتِ عنها.`;

  const messages = [];
  for (const turn of trimmedHistory) {
    if (!turn || !turn.role || !turn.content) continue;
    const role = turn.role === 'assistant' ? 'assistant' : 'user';
    messages.push({ role, content: String(turn.content).slice(0, 4000) });
  }
  messages.push({ role: 'user', content: message.slice(0, 2000) });

  // لازم تبدأ المحادثة بدور user
  while (messages.length && messages[0].role !== 'user') messages.shift();

  try {
    const { text } = await callAI({ systemPrompt, messages, maxTokens: 800 });
    return res.status(200).json({ reply: text });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
