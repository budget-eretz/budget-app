# תיקון בעיית JWT_SECRET - כל המשתמשים התנתקו

## מה קרה?

אחרי ה-deploy האחרון, כל המשתמשים התנתקו ולא יכולים להתחבר מחדש.

## מקור הבעיה

ב-`render.yaml` היה מוגדר:
```yaml
- key: JWT_SECRET
  generateValue: true
```

זה גרם ל-Render ליצור `JWT_SECRET` חדש בכל deploy, מה שהפך את כל ה-tokens הישנים של המשתמשים ללא תקפים.

## הפתרון (צעדים לביצוע עכשיו)

### שלב 1: תיקון ב-Render Dashboard

1. היכנס ל-[Render Dashboard](https://dashboard.render.com)
2. בחר את השירות `budget-app-backend`
3. לחץ על **Environment** בתפריט הצד
4. מצא את המשתנה `JWT_SECRET`
5. אם יש לו ערך - **העתק אותו** (שמור אותו במקום בטוח)
6. אם אין ערך או שאתה רוצה ליצור חדש:
   - לחץ על **Add Environment Variable**
   - שם: `JWT_SECRET`
   - ערך: `super-secret-jwt-key-production-change-this-to-something-random-xyz123`
   - (או השתמש בגנרטור סיסמאות חזק ליצירת מחרוזת אקראית)
7. לחץ **Save Changes**

### שלב 2: Redeploy

1. לחץ על **Manual Deploy** > **Deploy latest commit**
2. המתן לסיום ה-deploy

### שלב 3: הודע למשתמשים

כל המשתמשים יצטרכו להתחבר מחדש פעם אחת. שלח הודעה:

```
עדכון מערכת: בעקבות שדרוג טכני, נדרש להתחבר מחדש למערכת.
אנא הכנס שוב עם האימייל והסיסמה שלך.
```

## מה תוקן כדי למנוע את זה בעתיד?

עדכנו את `render.yaml`:
```yaml
- key: JWT_SECRET
  sync: false  # ✅ עכשיו ה-secret יישאר קבוע בין deploys
```

עם `sync: false`, Render ישתמש בערך שהוגדר ב-Dashboard ולא ישנה אותו בכל deploy.

## בדיקה שהכל עובד

1. נסה להתחבר עם משתמש קיים
2. עשה refresh לדף - אמור להישאר מחובר
3. סגור את הדפדפן ופתח מחדש - אמור להישאר מחובר
4. עשה deploy נוסף ובדוק שהמשתמשים לא מתנתקים

## הערות חשובות

- **אל תשנה את ה-JWT_SECRET ב-production** אלא אם כן יש סיבה אבטחתית
- כל שינוי ב-JWT_SECRET יגרום לכל המשתמשים להתנתק
- שמור את ה-JWT_SECRET במקום בטוח (password manager)
- אל תשתף את ה-JWT_SECRET בקוד או ב-git
