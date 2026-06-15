const express = require('express');
const axios = require('axios');
const app = express();

// Middleware لمعالجة البيانات الواردة بصيغة JSON
app.use(express.json());

// استدعاء المتغيرات من بيئة Railway
const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PHONE_NUMBER_ID } = process.env;

// التحقق من المتغيرات البيئية عند إقلاع الخادم
if (!WEBHOOK_VERIFY_TOKEN || !GRAPH_API_TOKEN || !PHONE_NUMBER_ID) {
  console.error('⚠️ تحذير: بعض المتغيرات البيئية مفقودة. تأكد من إضافتها في Railway.');
}

/**
 * 1. مسار التحقق من الـ Webhook (GET)
 * للتحقق من الاتصال الأولي بين خوادم Meta وسيرفرك.
 */
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ تم التحقق من الـ Webhook بنجاح من قبل Meta.');
    res.status(200).send(challenge);
  } else {
    console.error('❌ فشل التحقق من الـ Webhook. الرمز غير متطابق.');
    res.sendStatus(403);
  }
});

/**
 * 2. مسار استقبال الرسائل والرد الآلي (POST)
 * واجهة التفاعل الأساسية لعملاء "انشورنس شيلد"
 */
app.post('/webhook', async (req, res) => {
  const body = req.body;

  // التأكد من أن الإشارة قادمة من تطبيق واتساب للأعمال
  if (body.object === 'whatsapp_business_account') {
    
    // التحقق من الهيكل الداخلي لتجنب الانهيار إذا وصلت بيانات فارغة
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from; // رقم العميل
      
      // استخراج النص وتوحيد حالة الأحرف لتسهيل المطابقة
      const msgBody = message.text ? message.text.body.toLowerCase() : '';
      
      console.log(`\n📥 رسالة جديدة من [${from}]: "${msgBody}"`);

      // التحقق من الكلمات المفتاحية
      if (msgBody.includes('استفسار') || msgBody.includes('اسعار') || msgBody.includes('تأمين') || msgBody.includes('مرحبا')) {
        
        console.log("🚀 كلمة مفتاحية متطابقة! جاري إرسال القائمة التفاعلية...");
        
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
                header: { type: 'text', text: 'انشورنس شيلد' }, 
                body: { text: 'مرحباً بك في منصة الشيلد الآمنة. يرجى اختيار نوع التأمين المراد الاستفسار عنه:' },
                footer: { text: 'خدمة عملاء مؤتمتة' },
                action: {
                  button: 'الخدمات المتاحة', // 🛡️ تم التعديل إلى 15 حرفاً لتجاوز خطأ 400 الصارم من Meta
                  sections: [
                    {
                      title: 'خدمات التأمين',
                      rows: [
                        { id: 'medical_insurance', title: 'تأمين طبي', description: 'استفسار عن أسعار وخدمات التأمين' },
                        { id: 'vehicle_insurance', title: 'تأمين مركبات', description: 'استفسار عن تأمين السيارات' }
                      ]
                    }
                  ]
                }
              }
            }
          });
          
          console.log('✅ تم إرسال القائمة التفاعلية بنجاح!');
          
        } catch (error) {
          // تفكيك الخطأ لطباعة السبب الدقيق من Meta
          console.error('❌ فشل Axios. الرد من Meta:');
          console.error(JSON.stringify(error.response?.data || error.message, null, 2));
        }
      } else {
        console.log('⚠️ الرسالة لا تحتوي على الكلمات المفتاحية المبرمجة. تم التجاهل.');
      }
    }
    
    // إرسال 200 OK للمنصة دائماً لإبلاغها بالاستلام وإيقاف تكرار الإرسال
    res.sendStatus(200);
  } else {
    // رفض أي إشارات غير قادمة من واتساب
    res.sendStatus(404);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`\n🟢 سيرفر [Insurance Shield] مستيقظ ويعمل بكفاءة على المنفذ ${PORT}...\n`);
});
