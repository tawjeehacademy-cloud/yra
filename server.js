require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// متغيرات البيئة التي سنضيفها لاحقاً في Railway
const { 
    WEBHOOK_VERIFY_TOKEN, 
    GRAPH_API_TOKEN, 
    PHONE_NUMBER_ID 
} = process.env;

const PORT = process.env.PORT || 3000;

// 1. نقطة التحقق (Verification Endpoint) - تطلبها ميتا مرة واحدة عند ربط الـ Webhook
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        console.log('Webhook verified successfully!');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// 2. نقطة الاستقبال (Receiving Messages Endpoint)
app.post('/webhook', async (req, res) => {
    const body = req.body;

    // التأكد من أن الطلب قادم من واجهة واتساب
    if (body.object === 'whatsapp_business_account') {
        try {
            // استخراج تفاصيل الرسالة من هيكل JSON المعقد لميتا
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0];
            const value = changes?.value;
            const message = value?.messages?.[0];

            if (message && message.type === 'text') {
                const senderPhone = message.from;
                const messageText = message.text.body.trim();

                // التحقق مما إذا كان العميل قد أرسل كلمة استفسار
                if (messageText.includes('استفسار')) {
                    await sendInteractiveCarMenu(senderPhone);
                }
            }
        } catch (error) {
            console.error('Error parsing message:', error.message);
        }
        
        // يجب دائماً الرد بـ 200 OK بسرعة حتى لا تقوم ميتا بإعادة إرسال نفس الرسالة
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// 3. دالة إرسال القائمة التفاعلية (Interactive Message Payload)
async function sendInteractiveCarMenu(to) {
    const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
    
    // بناء هيكل JSON الخاص بالقائمة التفاعلية
    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "interactive",
        interactive: {
            type: "list",
            header: {
                type: "text",
                text: "انشورانس شيلد 🛡️"
            },
            body: {
                text: "مرحباً بك! لاختيار أفضل تسعير مبدئي لسيارتك، يرجى تحديد نوع المركبة من القائمة أدناه:"
            },
            footer: {
                text: "التأمين الأفضل في دولة الإمارات"
            },
            action: {
                button: "اختر نوع السيارة",
                sections: [
                    {
                        title: "السيارات الأكثر شيوعاً",
                        rows: [
                            { id: "car_nissan", title: "نيسان (Nissan)", description: "باترول، صني، ألتيما، إكس تريل..." },
                            { id: "car_toyota", title: "تويوتا (Toyota)", description: "لاند كروزر، كامري، يارس..." },
                            { id: "car_lexus", title: "لكزس (Lexus)", description: "LX, RX, ES, IS..." }
                        ]
                    },
                    {
                        title: "السيارات الأوروبية",
                        rows: [
                            { id: "car_mercedes", title: "مرسيدس (Mercedes)", description: "S-Class, G-Class, C-Class..." },
                            { id: "car_bmw", title: "بي إم دبليو (BMW)", description: "X5, X7, Series 5, Series 7..." }
                        ]
                    }
                ]
            }
        }
    };

    try {
        await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${GRAPH_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`Menu sent successfully to ${to}`);
    } catch (error) {
        console.error('Failed to send menu:', error.response?.data || error.message);
    }
}

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`Server is running securely on port ${PORT}`);
});