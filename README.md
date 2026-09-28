# יומן הניגונים שלי 🎵

אפליקציה לתיעוד ניגונים — אקורדים, הקלטות וסיפורים.

🔗 **[atz1800.github.io/niggunim](https://atz1800.github.io/niggunim)**

## מה יש באפליקציה

- 🎙️ **הקלטה ישירה** — כפתור הקלטה מהירה במסך הראשי, או מתוך הוספה/עריכה (עם השהיה ומד עוצמה; המסך נשאר דלוק)
- 🏷️ **תגיות** חופשיות + חסידות/מקור, מחבר ומילים
- 🎸 **העברת טון** לאקורדים בלחיצה
- ★ **מועדפים**, סינון לפי תגית ומיון (חדש/ישן/שם/נוגן לאחרונה)
- ▶ **נגן ברצף** — "נגן הכל" או ניגון מהרשימה, עם שליטה ממסך הנעילה
- 🎧 **שיתוף עם ההקלטה עצמה** (בטלפון) או כטקסט / WhatsApp
- 💾 **גיבוי ושחזור** — JSON מהיר, או ZIP מלא עם כל ההקלטות
- 📴 עובד גם בלי רשת (PWA)

## טכנולוגיות

- React 19 + Vite 8 (PWA עם תמיכה באופליין)
- Firebase 12 — Auth (Google), Firestore (עם מטמון מקומי), Storage (הקלטות)
- GitHub Pages + GitHub Actions

> הקלטות ישנות שנשמרו בעבר ב-Google Drive מועברות אוטומטית ל-Firebase Storage
> בפעם הראשונה שפותחים אותן (דורש אישור גישה חד-פעמי ל-Drive).

## פיתוח מקומי

נדרש Node 22.12 ומעלה.

```bash
npm install
npm run dev      # שרת פיתוח
npm run lint     # ESLint
npm test         # בדיקות יחידה (Vitest)
npm run build    # בנייה לפרודקשן
```

נדרש קובץ `.env` עם משתני Firebase (ראה `.env.example`).

## פריסה

- כל PR עובר lint, בדיקות ו-build.
- כל push ל-`main` נפרס אוטומטית ל-GitHub Pages.
- כללי האבטחה (`firestore.rules`, `storage.rules`) נפרסים אוטומטית אם מוגדר הסוד
  `FIREBASE_SERVICE_ACCOUNT` (JSON של Service Account עם הרשאת Firebase Rules Admin).
  אחרת יש לפרוס ידנית:

```bash
npx firebase-tools deploy --only firestore:rules,storage
```
