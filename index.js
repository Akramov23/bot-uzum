import { Bot, InlineKeyboard } from "grammy";

// Bot tokeningizni kiriting
const BOT_TOKEN = "8917685422:AAGbjD0r5BL71ww9t8Sc_itkkRnMRyw9_BE"; 
const bot = new Bot(BOT_TOKEN);

// ==========================================
// 1. MA'LUMOTLAR BAZASI (Ma'lumotlar simulyatsiyasi)
// ==========================================
const database = {
  categories: [
    { id: "electronics", name: "📱 Elektronika" },
    { id: "clothes", name: "👕 Kiyim-kechak" },
    { id: "home", name: "🏠 Maishiy texnika" }
  ],
  products: {
    electronics: [
      { id: "p1", name: "Smartphone X12", price: 3500000, desc: "AMOLED ekran, 128GB xotira, 50MP kamera." },
      { id: "p2", name: "Wireless Earbuds Pro", price: 450000, desc: "Shovqinni pasaytirish (ANC), 24 soat avtonomiya." }
    ],
    clothes: [
      { id: "p3", name: "Qishki kurtka", price: 650000, desc: "Suv o'tkazmaydigan, issiq saqlovchi premium kurtka." },
      { id: "p4", name: "Krossovka Sport", price: 380000, desc: "Yengil va qulay, kunlik yugurish uchun." }
    ],
    home: [
      { id: "p5", name: "Qahva mashinasi", price: 1200000, desc: "Espresso va kapuchino tayyorlash uchun avtomat qurilma." },
      { id: "p6", name: "Aqlli changyutgich", price: 2100000, desc: "Lidar navigatsiya va namli tozalash funksiyasi." }
    ]
  }
};

// Foydalanuvchilar savatlarini saqlash (Xotirada): { userId: { productId: count } }
const carts = {};

// Narxni so'm formatiga o'tkazish
function formatPrice(price) {
  return price.toLocaleString("uz-UZ") + " so'm";
}

// Barcha mahsulotlarni ID bo'yicha qidirish yordamchi funksiyasi
function findProductById(productId) {
  for (const cat in database.products) {
    const found = database.products[cat].find((p) => p.id === productId);
    if (found) return found;
  }
  return null;
}

// ==========================================
// 2. BOT BUYRUQLARI VA INTERFEYS
// ==========================================

// /start buyrug'i
bot.command("start", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("🗂 Katalog", "view_categories")
    .text("🛒 Korzina", "view_cart")
    .row()
    .text("ℹ️ Biz haqimizda", "about_us");

  await ctx.reply(
    `Xush kelibsiz, ${ctx.from?.first_name}!\n\n` +
      `Uzum Market analog botiga xush kelibsiz. Quyidagi menyudan kerakli bo'limni tanlang:`,
    { reply_markup: keyboard }
  );
});

// Katalog bo'limi
bot.callbackQuery("view_categories", async (ctx) => {
  const keyboard = new InlineKeyboard();
  
  database.categories.forEach((cat) => {
    keyboard.text(cat.name, `cat_${cat.id}`).row();
  });
  keyboard.text("⬅️ Bosh menyu", "go_main");

  await ctx.editMessageText("🛍 Kerakli kategoriyani tanlang:", {
    reply_markup: keyboard,
  });
  await ctx.answerCallbackQuery();
});

// Kategoriyadagi mahsulotlar ro'yxati
bot.callbackQuery(/^cat_(.+)$/, async (ctx) => {
  const categoryId = ctx.match[1];
  const products = database.products[categoryId] || [];

  const keyboard = new InlineKeyboard();
  products.forEach((prod) => {
    keyboard.text(`${prod.name} - ${formatPrice(prod.price)}`, `prod_${prod.id}`).row();
  });
  keyboard.text("⬅️ Katalogga qaytish", "view_categories");

  await ctx.editMessageText("📦 Mahsulotni tanlang:", {
    reply_markup: keyboard,
  });
  await ctx.answerCallbackQuery();
});

// Mahsulot haqida batafsil ma'lumot
bot.callbackQuery(/^prod_(.+)$/, async (ctx) => {
  const productId = ctx.match[1];
  const product = findProductById(productId);

  if (!product) {
    await ctx.answerCallbackQuery({ text: "Mahsulot topilmadi!" });
    return;
  }

  const text = `📦 *${product.name}*\n\n` +
               `📝 *Tavsif:* ${product.desc}\n` +
               `💰 *Narxi:* ${formatPrice(product.price)}`;

  const keyboard = new InlineKeyboard()
    .text("➕ Savatga qo'shish", `add_to_cart_${product.id}`)
    .row()
    .text("⬅️ Katalogga qaytish", "view_categories")
    .text("🛒 Savatni ko'rish", "view_cart");

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
  await ctx.answerCallbackQuery();
});

// Savatga mahsulot qo'shish
bot.callbackQuery(/^add_to_cart_(.+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const productId = ctx.match[1];

  if (!carts[userId]) {
    carts[userId] = {};
  }

  carts[userId][productId] = (carts[userId][productId] || 0) + 1;

  await ctx.answerCallbackQuery({
    text: "✅ Mahsulot savatga qo'shildi!",
    show_alert: false,
  });
});

// Savatni ko'rish
bot.callbackQuery("view_cart", async (ctx) => {
  const userId = ctx.from.id;
  const userCart = carts[userId] || {};
  const productIds = Object.keys(userCart);

  if (productIds.length === 0) {
    const keyboard = new InlineKeyboard().text("🗂 Katalogga o'tish", "view_categories");
    await ctx.editMessageText("🛒 Savatingiz hozircha bo'sh.", {
      reply_markup: keyboard,
    });
    await ctx.answerCallbackQuery();
    return;
  }

  let text = "🛒 *Sizning savatingiz:* \n\n";
  let totalSum = 0;

  productIds.forEach((id, index) => {
    const product = findProductById(id);
    if (product) {
      const count = userCart[id];
      const sum = product.price * count;
      totalSum += sum;
      text += `${index + 1}. *${product.name}* \n   ${count} dona x ${formatPrice(product.price)} = ${formatPrice(sum)}\n\n`;
    }
  });

  text += `💳 *Jami summasi:* ${formatPrice(totalSum)}`;

  const keyboard = new InlineKeyboard()
    .text("🚖 Buyurtma berish", "checkout")
    .text("🗑 Savatni tozalash", "clear_cart")
    .row()
    .text("🗂 Katalogga qaytish", "view_categories");

  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
  await ctx.answerCallbackQuery();
});

// Savatni tozalash
bot.callbackQuery("clear_cart", async (ctx) => {
  const userId = ctx.from.id;
  carts[userId] = {};

  const keyboard = new InlineKeyboard().text("🗂 Katalogga o'tish", "view_categories");
  await ctx.editMessageText("🗑 Savatingiz tozalandi.", {
    reply_markup: keyboard,
  });
  await ctx.answerCallbackQuery();
});

// Buyurtmani rasmiylashtirish
bot.callbackQuery("checkout", async (ctx) => {
  const userId = ctx.from.id;
  
  // Savatni bo'shatish
  carts[userId] = {};

  const keyboard = new InlineKeyboard().text("⬅️ Bosh menyu", "go_main");
  await ctx.editMessageText(
    "🎉 *Buyurtmangiz qabul qilindi!*\n\nOperatorlarimiz tez orada siz bilan bog'lanishadi.",
    {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }
  );
  await ctx.answerCallbackQuery();
});

// Bosh menyuga qaytish
bot.callbackQuery("go_main", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("🗂 Katalog", "view_categories")
    .text("🛒 Korzina", "view_cart")
    .row()
    .text("ℹ️ Biz haqimizda", "about_us");

  await ctx.editMessageText(
    `Xush kelibsiz! Quyidagi menyudan kerakli bo'limni tanlang:`,
    { reply_markup: keyboard }
  );
  await ctx.answerCallbackQuery();
});

// Biz haqimizda bo'limi
bot.callbackQuery("about_us", async (ctx) => {
  const keyboard = new InlineKeyboard().text("⬅️ Bosh menyu", "go_main");
  await ctx.editMessageText(
    "ℹ️ *Uzum Market Bot Analog*\n\nUshbu bot orqali mahsulotlarni ko'rishingiz va savatga qo'shishingiz mumkin.\n\n📞 Aloqa: +998 90 123 45 67",
    {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }
  );
  await ctx.answerCallbackQuery();
});

// Botni ishga tushirish
bot.start();
console.log("🤖 Bot muvaffaqiyatli ishga tushdi!");