const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// استدعاء المتغيرات من بيئة Railway
const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PHONE_NUMBER_ID } = process.env;

// 1. مسار التحقق من الـ Webhook (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 2. مسار استقبال الرسائل والرد الآلي (POST)
app.post('/webhook', async (req, res) => {
  const body = req.body;

  console.log("إشارة جديدة وصلت:", JSON.stringify(req.body, null, 2));
  
  // التأكد من أن الإشارة قادمة من واتساب
  if (body.object === 'whatsapp_business_account') {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from; // رقم هاتف العميل
      
      // استخراج النص الذي أرسله العميل
      const msgBody = message.text ? message.text.body.toLowerCase() : '';

      // التحقق من الكلمات المفتاحية
      if (msgBody.includes('استفسار') || msgBody.includes('اسعار') || msgBody.includes('تأمين') || msgBody.includes('مرحبا')) {
        
        // إرسال القائمة التفاعلية
        try {
          await axios({
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
              type: 'interactive',
              interactive: {
                type: 'list',
                header: { type: 'text', text: 'انشورنس شيلد | Insurance Shield' },
                body: { text: 'مرحباً بك في منصة الشيلد الآمنة. يرجى اختيار نوع التأمين المراد الاستفسار عنه:' },
                footer: { text: 'خدمة عملاء مؤتمتة ذكية' },
                action: {
                  button: 'الخدمات المتاحة',
                  sections: [
                    {
                      title: 'خدمات التأمين المتاحة',
                      rows: [
                        { id: 'medical_insurance', title: 'تأمين طبي', description: 'استفسار عن أسعار وخدمات التأمين الطبي' },
                        { id: 'vehicle_insurance', title: 'تأمين مركبات', description: 'استفسار عن تأمين السيارات والمركبات' }
                      ]
                    }
                  ]
                }
              }
            },
          });
        } catch (error) {
          console.error('خطأ في إرسال الرسالة:', error.response ? error.response.data : error.message);
        }
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running beautifully on port ${PORT}`);
});
