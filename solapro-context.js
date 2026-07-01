// /api/_lib/solapro-context.js
// دوال مشتركة بين solapro-plan.js (توليد الخطة الأولى) وsolapro-chat.js (المحادثة المستمرة)

const SOLAPRO_FACTS = `بيانات سولابرو الغذائية (لكل 5 scoops): 226 kcal، بروتين 6.74 جم، كربوهيدرات 23.9 جم (منها سكريات 6.7 جم)، دهون 3.5 جم.
المكونات المميزة: Milk Protein Concentrate 80% + Soy Protein Isolate، DHA من Algae Oil، Probiotics (Lactobacillus acidophilus)، Taurine، L-Carnitine، Arginine، فيتامينات ومعادن كاملة، FOS (prebiotic).`;

const CORE_RULES = `قواعد إلزامية:
- استخدم سولابرو دائماً كجزء أساسي من أي خطة أو نصيحة بالكمية المحسوبة (لا تغيّرها إلا لو كان هناك تعارض طبي واضح، واذكر السبب).
- لو الطفل عنده تقزم (Stunting/قصر قامة لعمره): **لا تنصح أبداً بتقليل السعرات أو الوزن**، حتى لو كان BMI مرتفعًا — المشكلة قصر القامة مش زيادة دهون. ركّز على دعم النمو الطولي: بروتين كافٍ، زنك، فيتامين د، وأكد على أن L-Arginine الموجود في سولابرو يدعم إفراز هرمون النمو ومحور IGF-1.
- إذا ذُكرت حالة سكر/سكري: وزّع وجبات سولابرو والطعام على فترات لتقليل تأثير السكريات، واقترح أطعمة منخفضة المؤشر الجلايسيمي، ونبّه أن سولابرو يحتوي سكريات ويجب متابعة السكر التراكمي مع الطبيب.
- إذا ذُكرت حساسية: تحقق هل تتعارض مع مكونات سولابرو (بروتين لبن/صويا) أو مع أي طعام مقترح، واستبعد أي طعام مسبب للحساسية، ونبّه بوضوح.
- اكتب بالعربية المصرية البسيطة، بصيغة عملية وودودة تناسب أم بتتكلم مع اختصاصي تغذية، في نقاط واضحة بدون حشو.
- لو سُئلت عن أي حاجة برة نطاق تغذية الطفل وسولابرو (زي تشخيص أمراض غير غذائية أو صرف أدوية)، وضّحي إن ده محتاج استشارة الطبيب المعالج مباشرة.`;

function buildSystemPrompt() {
  return `أنتِ اختصاصية تغذية أطفال ودودة تتحدثين مباشرة مع أم طفل عبر تطبيق NutriPed التابع لشركة Ipsen Egypt. مهمتك مساعدتها تفهم وتطبّق خطة تغذية طفلها اللي تمزج بين منتج سولابرو (لبن طبي تسوّقه الشركة) والطعام الطبيعي المناسب لعمره.

${SOLAPRO_FACTS}

${CORE_RULES}`;
}

function buildChildContextBlock(ctx = {}) {
  const {
    ageMonths, gender, weight, height,
    diagnosis, allergiesOrMeds, feeding,
    totalCalories, totalProtein,
    solaproPct, solaproScoops, solaproKcal, solaproProtein, solaproSugar,
    foodCalories, foodProtein, actualFoodIntake,
    isStunted, stuntSeverity,
  } = ctx;

  return `بيانات الطفل والزيارة الحالية (مرجعية، لا تُعاد حسابها):
- العمر: ${ageMonths ?? '—'} شهر | النوع: ${gender || '—'}
- الوزن: ${weight ?? '—'} كجم | الطول: ${height ?? '—'} سم
- نوع الرضاعة الحالي: ${feeding || '—'}
- التشخيص/الحالة المذكورة: ${diagnosis || 'لا يوجد'}
- أدوية/حساسية مذكورة: ${allergiesOrMeds || 'لا يوجد'}
${isStunted ? `- ⚠️ الطفل يعاني من تقزم (Stunting) بدرجة ${stuntSeverity === 'severe' ? 'شديدة' : stuntSeverity === 'moderate' ? 'متوسطة' : 'بسيطة'} — لا تنصحي بتقليل السعرات، ركّزي على دعم النمو الطولي واذكري دور L-Arginine في سولابرو` : ''}

الاحتياج اليومي الكلي:
- السعرات: ${totalCalories ?? '—'} kcal | البروتين: ${totalProtein ? Number(totalProtein).toFixed(1) : '—'} جم

توزيع سولابرو/الطعام الطبيعي (محسوب مسبقاً، استخدمه كما هو):
- نسبة سولابرو الافتراضية من السعرات: ${solaproPct ?? '—'}%
${actualFoodIntake != null ? `- الطفل يتناول فعليًا تقريبًا ${actualFoodIntake} kcal/يوم من الطعام الطبيعي (تم تعديل كمية سولابرو على هذا الأساس ليكمل الفرق الناقص فقط إن كان أقل من النسبة الافتراضية)` : ''}
- كمية سولابرو: ${solaproScoops ?? '—'} scoop/يوم (~${solaproKcal ?? '—'} kcal، بروتين ${solaproProtein ?? '—'} جم، سكريات ${solaproSugar ?? '—'} جم)
- المتبقي من الطعام الطبيعي: ${foodCalories ?? '—'} kcal، بروتين ${foodProtein ?? '—'} جم`;
}

export { buildSystemPrompt, buildChildContextBlock, SOLAPRO_FACTS, CORE_RULES };
