app.post('/webhook', async (req, res) => {
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
      
      console.log(`📥 استلمنا نص: "${msgBody}" من رقم: ${from}`);

      if (msgBody.includes('استفسار') || msgBody.includes('اسعار') || msgBody.includes('تأمين')) {
        
        console.log("🚀 محاولة الرد برسالة نصية عادية تجريبية...");
        
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
              text: { body: '🛡️ تم استلام طلبك بنجاح في نظام انشورنس شيلد التجريبي!' }
            }
          });
          
          console.log('✅ عظيم! Meta قبلت الطلب والرد خرج من السيرفر بنجاح:', response.data);
          
        } catch (error) {
          console.error('❌ كود الـ الرد اترفض من Meta! السبب الحقيقي هو:');
          if (error.response) {
            // هيرمي لك هنا الـ Error Code بتاع فيسبوك بالظبط
            console.error(JSON.stringify(error.response.data, null, 2));
          } else {
            console.error(error.message);
          }
        }
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});
