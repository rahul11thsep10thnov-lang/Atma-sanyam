// Parametric question templates for MOCK_AI mode. Every question is built
// from random numbers with the answer computed in code, so the pipeline can
// be exercised end to end with realistic, *correct* questions in English,
// Hindi (Devanagari) and Hinglish — without calling an AI provider.

import type { DifficultyLevel } from '../questionSchema.js';

export type Lang = 'en' | 'hi' | 'hi-Latn';
export type Rng = () => number;

export interface TemplateOutput {
  question: string;
  answer: number;
  /** Rendered answer, e.g. "₹450" or "25%". Distractors reuse the same format. */
  format: (n: number) => string;
  explanation: string;
  computation: string;
  /** Integer answers get integer distractors. */
  integer: boolean;
}

type Template = (rng: Rng, d: DifficultyLevel, lang: Lang) => TemplateOutput;

export const int = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
const pick = <T>(rng: Rng, xs: readonly T[]) => xs[Math.floor(rng() * xs.length)]!;
const L = (lang: Lang, en: string, hi: string, hl: string) => (lang === 'en' ? en : lang === 'hi' ? hi : hl);
const rs = (n: number) => `₹${fmt(n)}`;
const pct = (n: number) => `${fmt(n)}%`;
export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

const percentage: Template = (rng, d, lang) => {
  if (d === 'easy') {
    const p = pick(rng, [5, 10, 12, 15, 20, 25, 30, 40, 45, 60, 75]);
    const n = int(rng, 2, 40) * 20;
    const a = (n * p) / 100;
    return {
      question: L(lang, `What is ${p}% of ${n}?`, `${n} का ${p}% कितना होगा?`, `${n} ka ${p}% kitna hoga?`),
      answer: a,
      format: fmt,
      explanation: L(
        lang,
        `${p}% of ${n} = ${n} × ${p}/100 = ${fmt(a)}.`,
        `${n} का ${p}% = ${n} × ${p}/100 = ${fmt(a)} होगा।`,
        `${n} ka ${p}% = ${n} × ${p}/100 = ${fmt(a)} hoga.`
      ),
      computation: `${n}*${p}/100`,
      integer: Number.isInteger(a),
    };
  }
  if (d === 'medium') {
    const p = pick(rng, [10, 20, 25, 50]);
    const n = int(rng, 4, 60) * 20;
    const m = (n * (100 + p)) / 100;
    return {
      question: L(
        lang,
        `When a number is increased by ${p}%, it becomes ${fmt(m)}. What is the number?`,
        `किसी संख्या में ${p}% की वृद्धि करने पर वह ${fmt(m)} हो जाती है। वह संख्या क्या है?`,
        `Kisi sankhya ko ${p}% badhane par wah ${fmt(m)} ho jaati hai. Wah sankhya kya hai?`
      ),
      answer: n,
      format: fmt,
      explanation: L(
        lang,
        `If the number is x, then x × (100 + ${p})/100 = ${fmt(m)}, so x = ${fmt(m)} × 100/${100 + p} = ${n}.`,
        `माना संख्या x है, तो x × (100 + ${p})/100 = ${fmt(m)}, इसलिए x = ${fmt(m)} × 100/${100 + p} = ${n} है।`,
        `Maana sankhya x hai, to x × (100 + ${p})/100 = ${fmt(m)}, isliye x = ${fmt(m)} × 100/${100 + p} = ${n} hai.`
      ),
      computation: `${fmt(m)}*100/${100 + p}`,
      integer: true,
    };
  }
  const p = pick(rng, [20, 25, 40, 50]);
  const q = pick(rng, [10, 20, 30, 60, 80]);
  const x = int(rng, 3, 30) * 10;
  const y = (p * x) / q;
  return {
    question: L(
      lang,
      `If ${p}% of A is equal to ${q}% of B and A = ${x}, find B.`,
      `यदि A का ${p}%, B के ${q}% के बराबर है और A = ${x} है, तो B ज्ञात कीजिए।`,
      `Agar A ka ${p}%, B ke ${q}% ke barabar hai aur A = ${x} hai, to B ka maan kya hai?`
    ),
    answer: y,
    format: fmt,
    explanation: L(
      lang,
      `${p}/100 × ${x} = ${q}/100 × B, so B = ${p} × ${x}/${q} = ${fmt(y)}.`,
      `${p}/100 × ${x} = ${q}/100 × B, अतः B = ${p} × ${x}/${q} = ${fmt(y)} होगा।`,
      `${p}/100 × ${x} = ${q}/100 × B, isliye B = ${p} × ${x}/${q} = ${fmt(y)} hoga.`
    ),
    computation: `${p}*${x}/${q}`,
    integer: Number.isInteger(y),
  };
};

const profitLoss: Template = (rng, d, lang) => {
  if (d === 'easy') {
    const cp = int(rng, 4, 90) * 50;
    const p = pick(rng, [10, 20, 25, 30, 40]);
    const sp = (cp * (100 + p)) / 100;
    return {
      question: L(
        lang,
        `An article bought for ${rs(cp)} is sold at a profit of ${p}%. What is its selling price?`,
        `${rs(cp)} में खरीदी गई वस्तु को ${p}% लाभ पर बेचा जाता है। उसका विक्रय मूल्य क्या है?`,
        `${rs(cp)} me khareedi gayi vastu ko ${p}% laabh par becha jata hai. Uska vikray mulya kya hai?`
      ),
      answer: sp,
      format: rs,
      explanation: L(
        lang,
        `Selling price = ${cp} × (100 + ${p})/100 = ${fmt(sp)}.`,
        `विक्रय मूल्य = ${cp} × (100 + ${p})/100 = ${fmt(sp)} रुपये।`,
        `Vikray mulya = ${cp} × (100 + ${p})/100 = ${fmt(sp)} rupaye.`
      ),
      computation: `${cp}*(100+${p})/100`,
      integer: true,
    };
  }
  if (d === 'medium') {
    const p = pick(rng, [10, 20, 25, 50]);
    const cp = int(rng, 4, 80) * 40;
    const sp = (cp * (100 + p)) / 100;
    return {
      question: L(
        lang,
        `A shopkeeper sells an item for ${rs(sp)} and makes a profit of ${p}%. What was the cost price?`,
        `एक दुकानदार एक वस्तु ${rs(sp)} में बेचकर ${p}% लाभ कमाता है। वस्तु का क्रय मूल्य क्या था?`,
        `Ek dukaandaar ek vastu ${rs(sp)} me bechkar ${p}% laabh kamata hai. Vastu ka kray mulya kya tha?`
      ),
      answer: cp,
      format: rs,
      explanation: L(
        lang,
        `Cost price = ${fmt(sp)} × 100/(100 + ${p}) = ${cp}.`,
        `क्रय मूल्य = ${fmt(sp)} × 100/(100 + ${p}) = ${cp} रुपये।`,
        `Kray mulya = ${fmt(sp)} × 100/(100 + ${p}) = ${cp} rupaye.`
      ),
      computation: `${fmt(sp)}*100/(100+${p})`,
      integer: true,
    };
  }
  const discount = pick(rng, [10, 20, 25]);
  const profit = pick(rng, [20, 25, 50]);
  const cp = int(rng, 3, 40) * 60;
  const mp = (cp * (100 + profit)) / (100 - discount);
  if (!Number.isInteger(mp)) return profitLoss(rng, 'medium', lang);
  return {
    question: L(
      lang,
      `The marked price of a watch is ${rs(mp)}. After a discount of ${discount}%, the seller still gains ${profit}%. Find the cost price.`,
      `एक घड़ी का अंकित मूल्य ${rs(mp)} है। ${discount}% छूट देने के बाद भी विक्रेता को ${profit}% लाभ होता है। क्रय मूल्य ज्ञात कीजिए।`,
      `Ek ghadi ka ankit mulya ${rs(mp)} hai. ${discount}% chhoot dene ke baad bhi vikreta ko ${profit}% laabh hota hai. Kray mulya kya hai?`
    ),
    answer: cp,
    format: rs,
    explanation: L(
      lang,
      `Selling price = ${fmt(mp)} × ${100 - discount}/100 = ${fmt((mp * (100 - discount)) / 100)}; cost price = that × 100/${100 + profit} = ${cp}.`,
      `विक्रय मूल्य = ${fmt(mp)} × ${100 - discount}/100 = ${fmt((mp * (100 - discount)) / 100)}; क्रय मूल्य = इसका 100/${100 + profit} = ${cp} रुपये।`,
      `Vikray mulya = ${fmt(mp)} × ${100 - discount}/100 = ${fmt((mp * (100 - discount)) / 100)}; kray mulya = iska 100/${100 + profit} = ${cp} rupaye.`
    ),
    computation: `${fmt(mp)}*(100-${discount})/(100+${profit})`,
    integer: true,
  };
};

const simpleInterest: Template = (rng, d, lang) => {
  const p = int(rng, 2, 50) * 500;
  const r = pick(rng, [4, 5, 6, 8, 10, 12]);
  const t = int(rng, 2, 6);
  const si = (p * r * t) / 100;
  if (d === 'easy') {
    return {
      question: L(
        lang,
        `Find the simple interest on ${rs(p)} at ${r}% per annum for ${t} years.`,
        `${rs(p)} पर ${r}% वार्षिक दर से ${t} वर्ष का साधारण ब्याज ज्ञात कीजिए।`,
        `${rs(p)} par ${r}% saalana dar se ${t} saal ka saadharan byaaj kitna hoga?`
      ),
      answer: si,
      format: rs,
      explanation: L(
        lang,
        `Simple interest = P × R × T/100 = ${p} × ${r} × ${t}/100 = ${fmt(si)}.`,
        `साधारण ब्याज = P × R × T/100 = ${p} × ${r} × ${t}/100 = ${fmt(si)} रुपये।`,
        `Saadharan byaaj = P × R × T/100 = ${p} × ${r} × ${t}/100 = ${fmt(si)} rupaye.`
      ),
      computation: `${p}*${r}*${t}/100`,
      integer: Number.isInteger(si),
    };
  }
  if (d === 'medium') {
    return {
      question: L(
        lang,
        `A sum of ${rs(p)} earns ${rs(si)} as simple interest in ${t} years. What is the rate of interest per annum?`,
        `${rs(p)} की राशि पर ${t} वर्ष में ${rs(si)} साधारण ब्याज मिलता है। वार्षिक ब्याज दर क्या है?`,
        `${rs(p)} ki raashi par ${t} saal me ${rs(si)} saadharan byaaj milta hai. Saalana byaaj dar kya hai?`
      ),
      answer: r,
      format: pct,
      explanation: L(
        lang,
        `Rate = SI × 100/(P × T) = ${fmt(si)} × 100/(${p} × ${t}) = ${r}.`,
        `दर = SI × 100/(P × T) = ${fmt(si)} × 100/(${p} × ${t}) = ${r} प्रतिशत।`,
        `Dar = SI × 100/(P × T) = ${fmt(si)} × 100/(${p} × ${t}) = ${r} pratishat.`
      ),
      computation: `${fmt(si)}*100/(${p}*${t})`,
      integer: true,
    };
  }
  const years = pick(rng, [5, 8, 10, 20, 25]);
  const rate = 100 / years;
  return {
    question: L(
      lang,
      `At what rate of simple interest per annum does a sum double itself in ${years} years?`,
      `साधारण ब्याज की किस वार्षिक दर से कोई राशि ${years} वर्ष में दोगुनी हो जाएगी?`,
      `Saadharan byaaj ki kis saalana dar se koi raashi ${years} saal me doguni ho jayegi?`
    ),
    answer: rate,
    format: pct,
    explanation: L(
      lang,
      `Doubling means the interest equals the principal, so R × ${years} = 100 and R = 100/${years} = ${fmt(rate)}.`,
      `दोगुनी होने का अर्थ है ब्याज = मूलधन, इसलिए R × ${years} = 100 और R = 100/${years} = ${fmt(rate)} प्रतिशत।`,
      `Doguni hone ka matlab byaaj = mooldhan, isliye R × ${years} = 100 aur R = 100/${years} = ${fmt(rate)} pratishat.`
    ),
    computation: `100/${years}`,
    integer: Number.isInteger(rate),
  };
};

const average: Template = (rng, d, lang) => {
  if (d === 'easy') {
    const start = int(rng, 1, 60);
    const n = pick(rng, [5, 7, 9, 11]);
    const avg = start + (n - 1) / 2;
    return {
      question: L(
        lang,
        `What is the average of ${n} consecutive natural numbers starting from ${start}?`,
        `${start} से आरंभ होने वाली ${n} क्रमागत प्राकृत संख्याओं का औसत क्या है?`,
        `${start} se shuru hone wali ${n} lagataar prakritik sankhyaon ka ausat kya hai?`
      ),
      answer: avg,
      format: fmt,
      explanation: L(
        lang,
        `For consecutive numbers the average is the middle term: ${start} + (${n} − 1)/2 = ${fmt(avg)}.`,
        `क्रमागत संख्याओं का औसत बीच वाला पद होता है: ${start} + (${n} − 1)/2 = ${fmt(avg)}।`,
        `Lagataar sankhyaon ka ausat beech wala pad hota hai: ${start} + (${n} − 1)/2 = ${fmt(avg)}.`
      ),
      computation: `${start}+(${n}-1)/2`,
      integer: Number.isInteger(avg),
    };
  }
  const n = d === 'medium' ? 5 : pick(rng, [8, 10, 12]);
  const a = int(rng, 20, 60);
  const b = a + (d === 'medium' ? int(rng, 1, 4) : -int(rng, 1, 3));
  const removed = n * a - (n - 1) * b;
  if (removed <= 0) return average(rng, 'easy', lang);
  return {
    question: L(
      lang,
      `The average of ${n} numbers is ${a}. If one number is removed, the average of the rest becomes ${b}. Which number was removed?`,
      `${n} संख्याओं का औसत ${a} है। एक संख्या हटाने पर शेष संख्याओं का औसत ${b} हो जाता है। हटाई गई संख्या कौन सी है?`,
      `${n} sankhyaon ka ausat ${a} hai. Ek sankhya hatane par baaki sankhyaon ka ausat ${b} ho jata hai. Hatayi gayi sankhya kaun si hai?`
    ),
    answer: removed,
    format: fmt,
    explanation: L(
      lang,
      `Total before = ${n} × ${a} = ${n * a}; total after = ${n - 1} × ${b} = ${(n - 1) * b}; removed number = ${n * a} − ${(n - 1) * b} = ${removed}.`,
      `पहले का योग = ${n} × ${a} = ${n * a}; बाद का योग = ${n - 1} × ${b} = ${(n - 1) * b}; हटाई गई संख्या = ${n * a} − ${(n - 1) * b} = ${removed}।`,
      `Pehle ka yog = ${n} × ${a} = ${n * a}; baad ka yog = ${n - 1} × ${b} = ${(n - 1) * b}; hatayi gayi sankhya = ${n * a} − ${(n - 1) * b} = ${removed}.`
    ),
    computation: `${n}*${a}-${n - 1}*${b}`,
    integer: true,
  };
};

const ratio: Template = (rng, d, lang) => {
  const a = int(rng, 1, 5);
  const b = a + int(rng, 1, 4);
  const c = d === 'hard' ? b + int(rng, 1, 3) : 0;
  const parts = a + b + c;
  const amount = parts * int(rng, 5, 60) * 10;
  const larger = (amount * (c || b)) / parts;
  const ratioText = c ? `${a}:${b}:${c}` : `${a}:${b}`;
  return {
    question: L(
      lang,
      `${rs(amount)} is divided in the ratio ${ratioText}. What is the largest share?`,
      `${rs(amount)} को ${ratioText} के अनुपात में बाँटा जाता है। सबसे बड़ा भाग कितना है?`,
      `${rs(amount)} ko ${ratioText} ke anupaat me baanta jata hai. Sabse bada hissa kitna hai?`
    ),
    answer: larger,
    format: rs,
    explanation: L(
      lang,
      `Total parts = ${parts}; largest share = ${amount} × ${c || b}/${parts} = ${fmt(larger)}.`,
      `कुल भाग = ${parts}; सबसे बड़ा भाग = ${amount} × ${c || b}/${parts} = ${fmt(larger)} रुपये।`,
      `Kul bhaag = ${parts}; sabse bada hissa = ${amount} × ${c || b}/${parts} = ${fmt(larger)} rupaye.`
    ),
    computation: `${amount}*${c || b}/${parts}`,
    integer: true,
  };
};

const speed: Template = (rng, d, lang) => {
  if (d === 'easy') {
    const v = int(rng, 3, 20) * 5;
    const t = int(rng, 2, 6);
    return {
      question: L(
        lang,
        `A bus covers ${v * t} km in ${t} hours. What is its speed in km/h?`,
        `एक बस ${t} घंटे में ${v * t} किमी की दूरी तय करती है। उसकी चाल (किमी/घंटा) क्या है?`,
        `Ek bus ${t} ghante me ${v * t} km ki doori tay karti hai. Uski chaal (km/h) kya hai?`
      ),
      answer: v,
      format: fmt,
      explanation: L(
        lang,
        `Speed = distance/time = ${v * t}/${t} = ${v}.`,
        `चाल = दूरी/समय = ${v * t}/${t} = ${v} किमी/घंटा।`,
        `Chaal = doori/samay = ${v * t}/${t} = ${v} km/h.`
      ),
      computation: `${v * t}/${t}`,
      integer: true,
    };
  }
  const kmh = int(rng, 4, 20) * 18;
  const ms = (kmh * 5) / 18;
  if (d === 'medium') {
    return {
      question: L(
        lang,
        `A speed of ${kmh} km/h is equal to how many metres per second?`,
        `${kmh} किमी/घंटा की चाल कितने मीटर/सेकंड के बराबर है?`,
        `${kmh} km/h ki chaal kitne meter/second ke barabar hai?`
      ),
      answer: ms,
      format: fmt,
      explanation: L(
        lang,
        `Multiply by 5/18: ${kmh} × 5/18 = ${ms}.`,
        `5/18 से गुणा करें: ${kmh} × 5/18 = ${ms} मीटर/सेकंड।`,
        `5/18 se guna karein: ${kmh} × 5/18 = ${ms} m/s.`
      ),
      computation: `${kmh}*5/18`,
      integer: true,
    };
  }
  const t = int(rng, 6, 20);
  const len = ms * t;
  return {
    question: L(
      lang,
      `A train running at ${kmh} km/h crosses a pole in ${t} seconds. What is the length of the train in metres?`,
      `${kmh} किमी/घंटा की चाल से चलती एक रेलगाड़ी एक खंभे को ${t} सेकंड में पार करती है। रेलगाड़ी की लंबाई (मीटर में) कितनी है?`,
      `${kmh} km/h ki chaal se chalti ek train ek khambhe ko ${t} second me paar karti hai. Train ki lambai (meter me) kitni hai?`
    ),
    answer: len,
    format: fmt,
    explanation: L(
      lang,
      `Speed = ${kmh} × 5/18 = ${ms} m/s; length = ${ms} × ${t} = ${len}.`,
      `चाल = ${kmh} × 5/18 = ${ms} मीटर/सेकंड; लंबाई = ${ms} × ${t} = ${len} मीटर।`,
      `Chaal = ${kmh} × 5/18 = ${ms} m/s; lambai = ${ms} × ${t} = ${len} meter.`
    ),
    computation: `${kmh}*5/18*${t}`,
    integer: true,
  };
};

const timeWork: Template = (rng, _d, lang) => {
  const pairs = [
    [10, 15],
    [12, 24],
    [20, 30],
    [15, 30],
    [6, 12],
    [18, 36],
    [30, 60],
    [24, 40],
    [36, 45],
  ] as const;
  const [a, b] = pick(rng, pairs);
  const t = (a * b) / (a + b);
  return {
    question: L(
      lang,
      `A can finish a job in ${a} days and B can finish it in ${b} days. In how many days will they finish it working together?`,
      `A किसी काम को ${a} दिन में और B उसे ${b} दिन में पूरा कर सकता है। दोनों मिलकर उसे कितने दिन में पूरा करेंगे?`,
      `A kisi kaam ko ${a} din me aur B use ${b} din me poora kar sakta hai. Dono milkar use kitne din me poora karenge?`
    ),
    answer: t,
    format: fmt,
    explanation: L(
      lang,
      `Together they do 1/${a} + 1/${b} of the work per day, so time = ${a} × ${b}/(${a} + ${b}) = ${fmt(t)}.`,
      `दोनों मिलकर एक दिन में 1/${a} + 1/${b} काम करते हैं, इसलिए समय = ${a} × ${b}/(${a} + ${b}) = ${fmt(t)} दिन।`,
      `Dono milkar ek din me 1/${a} + 1/${b} kaam karte hain, isliye samay = ${a} × ${b}/(${a} + ${b}) = ${fmt(t)} din.`
    ),
    computation: `${a}*${b}/(${a}+${b})`,
    integer: Number.isInteger(t),
  };
};

const simplification: Template = (rng, d, lang) => {
  const a = int(rng, 10, 99);
  const b = int(rng, 2, 12);
  const c = int(rng, 2, 12);
  const e = d === 'easy' ? 0 : int(rng, 2, 9);
  const f = d === 'hard' ? pick(rng, [2, 4, 5]) : 1;
  const g = int(rng, 1, 20) * f;
  const value = a + b * c - (e ? e * e : 0) + g / f;
  const expr = `${a} + ${b} × ${c}${e ? ` − ${e}²` : ''}${f > 1 ? ` + ${g} ÷ ${f}` : ` + ${g}`}`;
  const computation = `${a}+${b}*${c}${e ? `-${e}^2` : ''}+${g}/${f}`;
  return {
    question: L(lang, `Simplify: ${expr}`, `सरल कीजिए: ${expr}`, `Saral kijiye: ${expr}`),
    answer: value,
    format: fmt,
    explanation: L(
      lang,
      `Following BODMAS: ${b} × ${c} = ${b * c}${e ? `, ${e}² = ${e * e}` : ''}${f > 1 ? `, ${g} ÷ ${f} = ${g / f}` : ''}; so the value is ${fmt(value)}.`,
      `BODMAS के अनुसार: ${b} × ${c} = ${b * c}${e ? `, ${e}² = ${e * e}` : ''}${f > 1 ? `, ${g} ÷ ${f} = ${g / f}` : ''}; अतः मान ${fmt(value)} है।`,
      `BODMAS ke anusaar: ${b} × ${c} = ${b * c}${e ? `, ${e}² = ${e * e}` : ''}${f > 1 ? `, ${g} ÷ ${f} = ${g / f}` : ''}; isliye maan ${fmt(value)} hai.`
    ),
    computation,
    integer: Number.isInteger(value),
  };
};

const series: Template = (rng, d, lang) => {
  const start = int(rng, 1, 15);
  const step = int(rng, 2, 9);
  const terms: number[] = [start];
  for (let i = 1; i < 5; i++) {
    const prev = terms[i - 1]!;
    terms.push(d === 'easy' ? prev + step : d === 'medium' ? prev + step * i : prev * 2 + step);
  }
  const next = d === 'easy' ? terms[4]! + step : d === 'medium' ? terms[4]! + step * 5 : terms[4]! * 2 + step;
  const rule =
    d === 'easy'
      ? L(lang, `each term adds ${step}`, `हर पद में ${step} जुड़ता है`, `har pad me ${step} judta hai`)
      : d === 'medium'
        ? L(lang, `the differences grow by ${step} each time`, `अंतर हर बार ${step} बढ़ता है`, `antar har baar ${step} badhta hai`)
        : L(lang, `each term is double the previous plus ${step}`, `हर पद पिछले का दोगुना जमा ${step} है`, `har pad pichhle ka dugna plus ${step} hai`);
  const computation = d === 'easy' ? `${terms[4]}+${step}` : d === 'medium' ? `${terms[4]}+${step}*5` : `${terms[4]}*2+${step}`;
  return {
    question: L(
      lang,
      `What comes next in the series: ${terms.join(', ')}, ?`,
      `श्रृंखला में अगली संख्या क्या होगी: ${terms.join(', ')}, ?`,
      `Series me agli sankhya kya hogi: ${terms.join(', ')}, ?`
    ),
    answer: next,
    format: fmt,
    explanation: L(
      lang,
      `The rule is that ${rule}, so the next term is ${next}.`,
      `नियम यह है कि ${rule}, इसलिए अगला पद ${next} है।`,
      `Niyam yeh hai ki ${rule}, isliye agla pad ${next} hai.`
    ),
    computation,
    integer: true,
  };
};

const TEMPLATES: Record<string, Template> = {
  percentage,
  'profit-loss': profitLoss,
  'simple-interest': simpleInterest,
  average,
  ratio,
  'ratio-proportion': ratio,
  'time-speed-distance': speed,
  'time-and-work': timeWork,
  simplification,
  'number-system': simplification,
  series,
};

/** Template for a chapter slug (or name), falling back to a number series. */
export function templateFor(chapterSlug: string): { template: Template; exact: boolean } {
  const key = chapterSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const t = TEMPLATES[key];
  return t ? { template: t, exact: true } : { template: series, exact: false };
}

/** Three distinct, plausible wrong answers around the correct value. */
export function distractors(rng: Rng, answer: number, integer: boolean): number[] {
  const out = new Set<string>();
  const result: number[] = [];
  const candidates = [
    answer * 1.1,
    answer * 0.9,
    answer + (integer ? int(rng, 1, 9) : 0.5),
    answer - (integer ? int(rng, 1, 9) : 0.5),
    answer * 1.25,
    answer * 0.8,
    answer * 2,
    answer / 2,
    answer + 10,
    answer - 10,
  ];
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
  }
  for (const c of candidates) {
    const v = integer ? Math.round(c) : Math.round(c * 100) / 100;
    if (v <= 0 || Math.abs(v - answer) < 1e-9 || out.has(String(v))) continue;
    out.add(String(v));
    result.push(v);
    if (result.length === 3) break;
  }
  let k = 1;
  while (result.length < 3) {
    const v = answer + 11 * k++;
    if (!out.has(String(v))) result.push(v);
  }
  return result;
}
