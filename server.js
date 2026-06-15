const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || "ShieldSecureToken2026";
const GRAPH_API_TOKEN = process.env.GRAPH_API_TOKEN || "";
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "";

console.log('⚙️ تشغيل المحرك المطهر لـ [Insurance Shield]...');

// 1. مسار التحقق (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Meta متصلة بنجاح.');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 2. مسار الاستقبال والرد (POST)
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
        
        // تطهير رقم الهاتف: إزالة علامة + أو أي مسافات لضمان قبول Meta
        let rawFrom = message.from; 
        const cleanFrom = rawFrom.replace('+', '').trim();
        
        const msgBody = message.text ? message.text.body.toLowerCase() : '';
        
        console.log(`\n📥 إشارة مستلمة من الرقم: ${cleanFrom} | النص: "${msgBody}"`);

        if (msgBody.includes('استفسار') || msgBody.includes('اسعار') || msgBody.includes('تأمين') || msgBody.includes('مرحبا')) {
          console.log(`🚀 جاري إرسال الرد التجريبي المباشر إلى: ${cleanFrom} ...`);
          
          try {
            const result = await axios({
              method: 'POST',
              url: `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
              headers: {
                'Authorization': `Bearer ${GRAPH_API_TOKEN}`,
                'Content-Type': 'application/json'
              },
              data: {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: cleanFrom, // الرقم المظهر النظيف
                type: 'text',
                text: { body: '🛡️ منصة انشورنس شيلد ترحب بك! الاتصال البرمجي شغال بنسبة 100% والرد سليم.' }
              }
            });
            
            console.log('✅ نجاح ساحق! Meta قبلت الرسالة وأرسلتها لهاتفك:', result.data);
          } catch (axiosError) {
            console.error('❌ حائط صد من Meta! الطلب رُفض صراحة.');
            if (axiosError.response) {
              console.error('📊 كود الخطأ من فيسبوك:', axiosError.response.status);
              console.error('📝 تفاصيل الرفض الحرفية:', JSON.stringify(axiosError.response.data, null, 2));
            } else {
              console.error('🚨 خطأ في الشبكة/الطلب:', axiosError.message);
            }
          }
        }
      }
      return res.sendStatus(200);
    }
    return res.sendStatus(404);
  } catch (globalError) {
    console.error('⚠️ خطأ استثنائي غير متوقع:', globalError.message);
    return res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🟢 السيرفر المطهر جاهز تماماً على المنفذ ${PORT}`);
});
