require('dotenv').config();
const { Telegraf, Scenes, session, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

// Bot token va Admin ID ni .env dan olamiz
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

if (!BOT_TOKEN) {
    console.error('Xatolik: BOT_TOKEN topilmadi! .env faylni tekshiring.');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Ma'lumotlarni saqlash funksiyalari
const DATA_PATH = path.join(__dirname, 'data.json');

function getData() {
    try {
        if (!fs.existsSync(DATA_PATH)) {
            return { users: [], orders: [], orders_count: 0 };
        }
        const content = fs.readFileSync(DATA_PATH, 'utf-8');
        const data = JSON.parse(content);
        if (!data.orders) data.orders = []; // Ensure orders array exists
        return data;
    } catch (e) {
        return { users: [], orders: [], orders_count: 0 };
    }
}

function saveData(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// Userni statistikaga qo'shish (ID va Username bilan)
function trackUser(chatId, username) {
    const data = getData();
    // Foydalanuvchi ob'ektini qidiramiz
    const userIndex = data.users.findIndex(u => (typeof u === 'object' ? u.id : u) === chatId);
    
    const userData = {
        id: chatId,
        username: username ? `@${username}` : 'username yo\'q'
    };

    if (userIndex === -1) {
        // Yangi foydalanuvchi
        data.users.push(userData);
        saveData(data);
    } else if (typeof data.users[userIndex] !== 'object') {
        // Eski formatdagi foydalanuvchini yangilash
        data.users[userIndex] = userData;
        saveData(data);
    }
}

// --- BUYURTMA BERISH WIZARD (SCENE) ---
const orderScene = new Scenes.WizardScene(
    'order_wizard',
    // 1-qadam: Ismni so'rash
    (ctx) => {
        ctx.reply('Ismingiz nima?');
        ctx.wizard.state.orderData = {};
        return ctx.wizard.next();
    },
    // 2-qadam: Telefonni so'rash
    (ctx) => {
        ctx.wizard.state.orderData.name = ctx.message.text;
        ctx.reply('Telefon raqamingizni kiriting:');
        return ctx.wizard.next();
    },
    // 3-qadam: Xizmatni so'rash
    (ctx) => {
        ctx.wizard.state.orderData.phone = ctx.message.text;
        ctx.reply('Qaysi xizmat kerak?', Markup.keyboard([
            ['Telegram bot yasash', 'Veb-sayt yasash'],
            ['Orqaga']
        ]).oneTime().resize());
        return ctx.wizard.next();
    },
    // 4-qadam: Izohni so'rash
    (ctx) => {
        const choice = ctx.message.text;
        if (choice === 'Orqaga') {
            ctx.reply('Asosiy menyu:', getMainMenu());
            return ctx.scene.leave();
        }
        ctx.wizard.state.orderData.service = choice;
        ctx.reply('Qo\'shimcha izoh bormi? (Agar yo\'q bo\'lsa "Yo\'q" deb yozing)');
        return ctx.wizard.next();
    },
    // 5-qadam: Yakunlash va Adminga yuborish
    async (ctx) => {
        ctx.wizard.state.orderData.comment = ctx.message.text;
        const { name, phone, service, comment } = ctx.wizard.state.orderData;
        const date = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });

        // Buyurtmani saqlash
        const data = getData();
        const newOrder = {
            id: data.orders_count + 1,
            name,
            phone,
            username: ctx.from.username || 'yo\'q',
            service,
            comment,
            date
        };
        data.orders.push(newOrder);
        data.orders_count++;
        saveData(data);

        // Mijozga javob
        ctx.reply('Buyurtmangiz qabul qilindi! Tez orada aloqaga chiqamiz.', getMainMenu());

        // Adminga xabar yuborish
        if (ADMIN_CHAT_ID) {
            const username = ctx.from.username ? `@${ctx.from.username}` : 'mavjud emas';
            const adminMsg = `🆕 YANGI BUYURTMA!\n\n` +
                `👤 Ism: ${name}\n` +
                `📞 Tel: ${phone}\n` +
                `🔗 Username: ${username}\n` +
                `🛠 Xizmat: ${service}\n` +
                `📝 Izoh: ${comment}\n\n` +
                `🆔 User ID: ${ctx.from.id}`;
            
            try {
                await ctx.telegram.sendMessage(ADMIN_CHAT_ID, adminMsg);
            } catch (err) {
                console.error('Admin xabar yuborishda xatolik:', err);
            }
        }

        return ctx.scene.leave();
    }
);

const stage = new Scenes.Stage([orderScene]);
bot.use(session());
bot.use(stage.middleware());

// --- ASOSIY MENYU ---
function getMainMenu() {
    return Markup.keyboard([
        ['Xizmatlarimiz', 'Narxlar'],
        ['Buyurtma berish'],
        ['Bog\'lanish', 'Savollar']
    ]).resize();
}

// --- KOMANDALAR ---

// /start komandasi
bot.start((ctx) => {
    trackUser(ctx.chat.id, ctx.from.username);
    ctx.reply(`Assalomu alaykum, ${ctx.from.first_name}! SMM Botimizga xush kelibsiz.`, getMainMenu());
});

// /admin komandasi
bot.command('admin', (ctx) => {
    if (ctx.chat.id.toString() === ADMIN_CHAT_ID) {
        ctx.reply('Admin paneliga xush kelibsiz:', Markup.keyboard([
            ['📊 Statistika'],
            ['📦 Buyurtmalar'],
            ['👥 Foydalanuvchilar'],
            ['🔙 Orqaga']
        ]).resize());
    } else {
        ctx.reply('Kechirasiz, siz admin emassiz.');
    }
});

bot.hears('📊 Statistika', (ctx) => {
    if (ctx.chat.id.toString() === ADMIN_CHAT_ID) {
        const data = getData();
        ctx.reply(`📊 Statistika:\n\n👥 Foydalanuvchilar: ${data.users.length} ta\n📦 Buyurtmalar: ${data.orders_count} ta`);
    } else {
        ctx.reply('Kechirasiz, siz admin emassiz.');
    }
});

bot.hears('📦 Buyurtmalar', (ctx) => {
    if (ctx.chat.id.toString() === ADMIN_CHAT_ID) {
        const data = getData();
        if (!data.orders || data.orders.length === 0) {
            return ctx.reply('Sizda hali buyurtmalar yo\'q.');
        }

        let ordersMsg = `📦 Oxirgi buyurtmalar:\n\n`;
        // Oxirgi 10 ta buyurtmani ko'rsatish
        const recentOrders = data.orders.slice(-10).reverse();
        
        recentOrders.forEach((order, index) => {
            ordersMsg += `🔹 Buyurtma #${order.id}\n`;
            ordersMsg += `👤 Mijoz: ${order.name}\n`;
            ordersMsg += `📞 Tel: ${order.phone}\n`;
            ordersMsg += `🛠 Xizmat: ${order.service}\n`;
            ordersMsg += `📅 Sana: ${order.date}\n`;
        });

        ctx.reply(ordersMsg);
    } else {
        ctx.reply('Kechirasiz, siz admin emassiz.');
    }
});

bot.hears('👥 Foydalanuvchilar', (ctx) => {
    if (ctx.chat.id.toString() === ADMIN_CHAT_ID) {
        const data = getData();
        let userList = `👥 Jami foydalanuvchilar: ${data.users.length} ta\n\n`;
        
        // Oxirgi 20 ta foydalanuvchini ko'rsatish
        const recentUsers = data.users.slice(-20).reverse();
        recentUsers.forEach((user, index) => {
            const displayInfo = typeof user === 'object' 
                ? `${user.username} (ID: ${user.id})` 
                : `ID: ${user} (eski foydalanuvchi)`;
            userList += `${index + 1}. ${displayInfo}\n`;
        });

        ctx.reply(userList || 'Foydalanuvchilar hali yo\'q.');
    } else {
        ctx.reply('Kechirasiz, siz admin emassiz.');
    } 
});

bot.hears('🔙 Orqaga', (ctx) => {
    ctx.reply('Asosiy menyu:', getMainMenu());
});

// --- TUGMALAR ISHLASHI ---

// 1-tugma: Xizmatlarimiz
bot.hears('Xizmatlarimiz', (ctx) => {
    ctx.reply('Xizmatlarimiz ro\'yxati:', Markup.inlineKeyboard([
        [Markup.button.callback('Telegram bot yasash', 'service_bot')],
        [Markup.button.callback('Veb-sayt yasash', 'service_web')],
    ]));
});

// Xizmatlar tafsiloti (Inline buttons)
bot.action('service_bot', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('🤖 Telegram bot yasash\n\nSizning biznesingiz uchun bot yasab beramiz. Bot orqali savdolarni avtomatlashtirish, mijozlar navbatini boshqarish va boshqa ishlarni qilish mumkin.');
});

bot.action('service_web', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('🌐 Veb-sayt yasash\n\nZamonaviy veb-sayt yasab beramiz. Landing page, online do\'kon yoki korporativ saytlar - barchasini yuqori sifatda tayyorlaymiz.');
});


// 2-tugma: Narxlar
bot.hears('Narxlar', (ctx) => {
    const prices = `💰 Xizmat narxlari:\n\n` +
        `• Telegram bot: 150 dollardan\n` +
        `• Veb-sayt: 300 dollardan\n`;

    ctx.reply(prices, Markup.inlineKeyboard([
        [Markup.button.callback('Buyurtma berish', 'start_order')]
    ]));
});

bot.action('start_order', (ctx) => {
    ctx.answerCbQuery();
    ctx.scene.enter('order_wizard');
});

// 3-tugma: Buyurtma berish
bot.hears('Buyurtma berish', (ctx) => {
    ctx.scene.enter('order_wizard');
});

// 4-tugma: Bog'lanish
bot.hears('Bog\'lanish', (ctx) => {
    const contacts = `☎️ Bog'lanish ma'lumotlari:\n\n` +
        `• Telegram: @username\n` +
        `• Telefon: +998901234567\n` +
        `• Ish vaqti: 09:00 — 18:00`;
    ctx.reply(contacts);
});

// 5-tugma: Savollar
bot.hears('Savollar', (ctx) => {
    ctx.reply('Ko\'p beriladigan savollar:', Markup.inlineKeyboard([
        [Markup.button.callback('Qancha vaqtda tayyor bo\'ladi?', 'faq_time')],
        [Markup.button.callback('To\'lov qanday?', 'faq_payment')],
        [Markup.button.callback('Kafolat bormi?', 'faq_warranty')]
    ]));
});

bot.action('faq_time', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('⌛️ Qancha vaqtda tayyor bo\'ladi?\n\nJavob: 3 kundan 14 kungacha (loyihaning murakkabligiga qarab).');
});

bot.action('faq_payment', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('💳 To\'lov qanday?\n\nJavob: Yarmi oldindan (kelishuvdan so\'ng), yarmi loyiha topshirilgach.');
});

bot.action('faq_warranty', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('✅ Kafolat bormi?\n\nJavob: Ha, 30 kun davomida har qanday texnik xatoliklarni bepul tuzatib beramiz.');
});

// Botni ishga tushirish
bot.launch().then(() => {
    console.log('Bot muvaffaqiyatli ishga tushdi!');
});

// To'xtatish (graceful stop)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
