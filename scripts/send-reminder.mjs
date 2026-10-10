import { createHash, randomUUID } from "node:crypto";
// Sends ONE reminder per scheduled day at 20:00 Finland time.
// GitHub Actions scheduled runs may be delayed; delivery is not guaranteed to the minute.
const manual = process.env.MANUAL_SEND === 'true';
const helsinkiHour = Number(new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Helsinki', hour: '2-digit', hourCycle: 'h23'
}).format(new Date()));
if (!manual && helsinkiHour !== 20) {
  console.log('Not 20:00 in Finland; skipping.');
  process.exit(0);
}
const appId = process.env.ONESIGNAL_APP_ID;
const apiKey = process.env.ONESIGNAL_API_KEY;
if (!appId || !apiKey) {
  console.error('Missing GitHub Actions secrets ONESIGNAL_APP_ID or ONESIGNAL_API_KEY');
  process.exit(1);
}
const dateInFinland = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());
const h = createHash('sha256').update('finnish-az-sefr-daily-' + dateInFinland).digest('hex');
const dedup = `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
// Curated Finnish vocabulary: one different word each day, with a Persian meaning.
// Keep these translations aligned with the words taught in data.js.
const dailyWords = [
  ['Ovi','در','🚪'],['Ikkuna','پنجره','🪟'],['Peili','آینه','🪞'],
  ['Lusikka','قاشق','🥄'],['Haarukka','چنگال','🍴'],['Lautanen','بشقاب','🍽️'],
  ['Lasi','لیوان','🥛'],['Veitsi','چاقو','🔪'],['Paita','پیراهن','👕'],
  ['Housut','شلوار','👖'],['Kengät','کفش','👟'],['Takki','کاپشن','🧥'],
  ['Maito','شیر','🥛'],['Leipä','نان','🍞'],['Juusto','پنیر','🧀'],
  ['Muna','تخم‌مرغ','🥚'],['Kurkku','خیار','🥒'],['Sipuli','پیاز','🧅'],
  ['Peruna','سیب‌زمینی','🥔'],['Porkkana','هویج','🥕'],['Tomaatti','گوجه‌فرنگی','🍅']
];
const dayIndex = Math.floor(Date.parse(`${dateInFinland}T00:00:00Z`) / 86400000);
const [wordFi, wordFa, wordEmoji] = dailyWords[dayIndex % dailyWords.length];
const payload = {
  app_id: appId,
  target_channel: 'push',
  included_segments: [manual ? 'Test Users' : 'Subscribed Users'],
  idempotency_key: manual ? randomUUID() : dedup,
  name: manual ? 'Finnish az Sefr test notification' : 'Finnish az Sefr daily practice',
  headings: { en: `🇫🇮 کلمه امروز: ${wordFi}` },
  contents: { en: `${wordEmoji} ${wordFi} یعنی «${wordFa}». امروز این کلمه رو مرور کن!` },
  web_url: 'https://finnishazsefr.github.io/finnish-az-sefr/',
  chrome_web_icon: 'https://finnishazsefr.github.io/finnish-az-sefr/icon-192.png'
};
const response = await fetch('https://api.onesignal.com/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Authorization': `Key ${apiKey}` },
  body: JSON.stringify(payload)
});
const body = await response.text();
if (!response.ok) { console.error('OneSignal API error:', response.status, body); process.exit(1); }
console.log('Push submitted:', response.status, body.slice(0, 500));
