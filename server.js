const express = require('express');
const axios = require('axios');
const app = express();

// Middleware لمعالجة الـ JSON بأمان
app.use(express.json());

// استدعاء المتغيرات بأمان لمنع الـ Crash إذا كانت مفقودة
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || "ShieldSecureToken2026";
const GRAPH_API_TOKEN = process.env.GRAPH_API_TOKEN || "";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "";

console.log('⚙️ إعدادات المحرك الحالية:');
console.log(`- Verify Token: ${WEBHOOK_VERIFY_TOKEN ? "✅ موجود" : "❌ مفقود"}`);
console.log(`- API Token: ${GRAPH_API_TOKEN ? "✅ موجود" : "❌ مفقود"}`);
console.log(`- Phone ID: ${PHONE_NUMBER_ID ? "✅ موجود" : "❌ مفقود"}`);

// 1. مسار التحقق من الـ Webhook (GET)
app.get('/webhook', (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      console.log('✅ Meta قامت بالتحقق من السيرفر بنجاح!');
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  } catch (err) {
    console.error('❌ خطأ في مسار GET:', err.message);
    return res.sendStatus(500);
  }
});

// 2. مسار استقبال الرسائل والرد (POST)
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const from = message.from; 
        const msgBody = message.text ? message.text.body.toLowerCase() : '';
        
        console.log(`📥 رسالة واردة من [${from}]: "${msgBody}"`);

        if (msgBody.includes('استفسار') || msgBody.includes('اسعار') || msgBody.includes('تأمين')) {
          console.log("🚀 جاري محاولة الرد بنص عادي...");
          
          if (!GRAPH_API_TOKEN || !PHONE_NUMBER_ID) {
            console.error("❌ لا يمكن الرد: الـ Token أو الـ Phone ID مفقودين في إعدادات Railway!");
            return res.sendStatus(200);
          }

          try {
            const response = await axios({
              method: 'POST',
              url: `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
              headers: {
                Authorization: `Bearer ${GRAPH_API_TOKEN}`,
                'Content-Type': 'application/json',
              },
              data: {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: from,
                type: 'text',
                text: { body: '🛡️ نظام انشورنس شيلد قيد التشغيل والربط سليم!' }
              }
            });
            console.log('✅ تم قبول الرد من Meta بنجاح:', response.data);
          } catch (axiosError) {
            console.error('❌ Meta رفضت الإرسال. التفاصيل:');
            console.error(JSON.stringify(axiosError.response?.data || axiosError.message, null, 2));
          }
        }
      }
      return res.sendStatus(200);
    }
    return res.sendStatus(404);
  } catch (globalError) {
    console.error('⚠️ خطأ عام غير متوقع منع الانهيار:', globalError.message);
    return res.sendStatus(200); // نرد بـ 200 لمنع فيسبوك من تكرار الطلب المضروب
  }
});

// تشغيل السيرفر على المنفذ الصحيح
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`\n🟢 المحرك المدرع مستيقظ الآن على منفذ ${PORT} ومستعد للاستقبال...\n`);
});
