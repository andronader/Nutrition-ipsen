// /api/_lib/ai-provider.js
// طبقة موحّدة لاستدعاء أي مزوّد AI — بتخلي التطبيق يشتغل مع Claude أو Gemini من غير ما تغيّر كود.
//
// التحكم عن طريق متغيرات البيئة في Vercel:
//   AI_PROVIDER = "gemini"    → يستخدم Google Gemini (فيه Tier مجاني حقيقي ومستمر، من غير بطاقة ائتمان)
//   AI_PROVIDER = "anthropic" → يستخدم Claude (لازم رصيد مدفوع بعد أول 5$ تجريبية)
//   لو المتغير مش موجود، الافتراضي "gemini" (الخيار المجاني) عشان تقدر تجرب المشروع دلوقتي من غير أي تكلفة
//
// المفاتيح المطلوبة حسب المزوّد المختار:
//   GEMINI_API_KEY     (من https://aistudio.google.com/apikey — مجاني، من غير بطاقة)
//   ANTHROPIC_API_KEY   (من https://console.anthropic.com)

const GEMINI_MODEL    = 'gemini-2.5-flash';       // ضمن الـ tier المجاني في Gemini
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

/**
 * @param {Object} opts
 * @param {string} opts.systemPrompt
 * @param {Array<{role:'user'|'assistant', content:string}>} opts.messages
 * @param {number} [opts.maxTokens]
 * @returns {Promise<{text:string}>}
 */
export async function callAI({ systemPrompt, messages, maxTokens = 1200 }) {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

  if (provider === 'gemini') {
    return callGemini({ systemPrompt, messages, maxTokens });
  }
  return callAnthropic({ systemPrompt, messages, maxTokens });
}

async function callAnthropic({ systemPrompt, messages, maxTokens }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY غير مضبوط في إعدادات Vercel');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error('خطأ من Claude API: ' + errText.slice(0, 300));
  }

  const data = await response.json();
  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  if (!text) throw new Error('لم يتم استلام رد نصي من Claude');
  return { text };
}

async function callGemini({ systemPrompt, messages, maxTokens }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY غير مضبوط في إعدادات Vercel');

  // Gemini بيستخدم role: "model" بدل "assistant"
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error('خطأ من Gemini API: ' + errText.slice(0, 300));
  }

  const data = await response.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('\n')
    .trim();

  if (!text) {
    const blockReason = data.promptFeedback?.blockReason;
    throw new Error(blockReason ? `تم رفض الطلب من Gemini (${blockReason})` : 'لم يتم استلام رد نصي من Gemini');
  }
  return { text };
}
