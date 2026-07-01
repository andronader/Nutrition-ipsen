// /api/solapro-plan.js
// Vercel Serverless Function — أول رسالة في محادثة "خطة نمو الطفل وتغذيته"
// يشتغل مع Gemini (مجاني) أو Claude حسب متغير AI_PROVIDER — راجع api/_lib/ai-provider.js

import { buildSystemPrompt, buildChildContextBlock } from './_lib/solapro-context.js';
import { callAI } from './_lib/ai-provider.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ctx = req.body || {};
  if (!ctx.totalCalories) {
    return res.status(400).json({ error: 'بيانات الزيارة ناقصة (السعرات)' });
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = `${buildChildContextBlock(ctx)}

المطلوب: اكتبي للأم خطة نمو وتغذية يومية مفصّلة لطفلها (مواعيد سولابرو + وجبات الطعام الطبيعي) تراعي أي حالة خاصة مذكورة أعلاه، وابدئي بترحيب قصير بسيط.
في النهاية أضيفي سطر: "هذه خطة استرشادية ولا تغني عن استشارة الطبيب المعالج"، وادعِ الأم للسؤال عن أي حاجة في الخطة.`;

  try {
    const { text } = await callAI({
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 1500,
    });
    return res.status(200).json({ plan: text });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
