# Telegram Sotuv Manager Bot

Ushbu bot Node.js va Telegraf kutubxonasi yordamida yaratilgan. Bot mijozlardan buyurtma olish, xizmatlar va narxlar haqida ma'lumot berish hamda adminni yangi buyurtmalardan xabardor qilish vazifalarini bajaradi.

## Imkoniyatlar

- **Xizmatlar:** Bot, Veb-sayt va SMM xizmatlari haqida ma'lumot.
- **Narxlar:** Xizmatlar narxlari va buyurtma berish tugmasi.
- **Buyurtma berish:** Bosqichma-bosqich ism, telefon va qiziqtirgan xizmatni so'rash.
- **Bog'lanish:** Kontakt ma'lumotlari.
- **Savollar:** FAQ (Ko'p beriladigan savollar).
- **Admin Panel:** Jami foydalanuvchilar va buyurtmalar sonini ko'rish.

## Texnik talablar

- [Node.js](https://nodejs.org/) (v16 yoki undan yuqori)
- NPM (paket menejeri)

## O'rnatish va Ishga tushirish

1.  **Repositoryni yuklab oling yoki nusxa oling.**
2.  **Kerakli kutubxonalarni o'rnating:**
    ```bash
    npm install
    ```
3.  **Muhit o'zgaruvchilarini sozlang:**
    `.env.example` faylini `.env` deb qayta nomlang va ichiga o'zingizning ma'lumotlaringizni yozing:
    - `BOT_TOKEN`: BotFather orqali olingan token.
    - `ADMIN_CHAT_ID`: O'zingizning Telegram ID'ingiz (buni @userinfobot orqali bilib olishingiz mumkin).

4.  **Botni ishga tushiring:**
    ```bash
    node index.js
    ```

## Admin komandalari

- `/admin` - Bot statistikasi (faqat .env fayldagi admin uchun ishlaydi).

## Tuzilishi

- `index.js` - Botning asosiy kodi va logikasi.
- `data.json` - Foydalanuvchilar va buyurtmalar statistikasi saqlanadigan fayl.
- `.env` - Maxfiy kalitlar va sozlamalar.
