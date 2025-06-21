require('dotenv').config();
const express = require('express');
const { handleMessage } = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear el body de Twilio
app.use(express.urlencoded({ extended: false }));

// Webhook endpoint para recibir mensajes de WhatsApp
app.post('/webhook', async (req, res) => {
    try {
        const from = req.body.From; // whatsapp:+5491112345678
        const body = req.body.Body; // Mensaje del usuario
        const profileName = req.body.ProfileName || 'Usuario';

        console.log(`📱 Mensaje de ${profileName} (${from}): ${body}`);

        // Procesar mensaje y generar respuesta
        const response = await handleMessage(from, body, profileName);
        
        // Responder con TwiML
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
                      <Response>
                          <Message>${response}</Message>
                      </Response>`;
        
        res.type('text/xml').send(twiml);
    } catch (error) {
        console.error('❌ Error en webhook:', error);
        res.status(500).send('Error interno');
    }
});

// Endpoint de salud
app.get('/health', (req, res) => {
    res.json({ status: 'Bot funcionando correctamente! 🤖' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📱 Webhook URL: https://tu-dominio.com/webhook`);
});