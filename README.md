# 🏦 Bot WhatsApp - Gestor Financiero Dual

Un bot de WhatsApp inteligente para gestión financiera personal y de pareja, desarrollado con Node.js, Twilio y Google Sheets.

## 📱 Características

- **💰 Gestión de gastos** individuales y compartidos
- **📊 Resúmenes financieros** automáticos
- **💳 Control de tarjetas** y fechas de cierre
- **🔔 Alertas** de presupuesto y pagos
- **👥 Modo pareja** para gastos compartidos
- **📈 Reportes** por categoría y período
- **☁️ Base de datos** en Google Sheets (gratis)

## 🚀 Demo

![Bot Demo](https://via.placeholder.com/600x400/4CAF50/white?text=WhatsApp+Bot+Demo)

### Flujo de conversación:
```
Bot: 🏦 GESTOR FINANCIERO PERSONAL
     1️⃣ Ingresar Sueldo
     2️⃣ Ingresar Gasto Compartido  
     3️⃣ Ingresar Gasto Individual
     4️⃣ Ver Gastos
     ...

Usuario: 3

Bot: 💳 INGRESAR GASTO INDIVIDUAL
     Formato: [monto] [descripción] [categoría]
     Ejemplo: 2500 café comida

Usuario: 1500 almuerzo comida

Bot: ✅ Gasto registrado!
     💰 $1,500 - Almuerzo (Comida)
     📅 21/06/2025
     📊 Total del día: $3,200
```

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **WhatsApp**: Twilio WhatsApp API
- **Base de datos**: Google Sheets API
- **Hosting**: Railway (gratuito)
- **Autenticación**: Google Service Account

## 📋 Prerequisitos

- Node.js 18+
- Cuenta de Twilio (gratuita)
- Cuenta de Google Cloud (gratuita)
- Cuenta de Railway/Heroku (opcional para deploy)

## ⚡ Instalación Rápida

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/gestor-financiero-bot.git
cd gestor-financiero-bot
npm install
```

### 2. Configurar Google Sheets

1. **Crear proyecto en Google Cloud Console**
   - Ve a [console.cloud.google.com](https://console.cloud.google.com)
   - Crear nuevo proyecto: `gestor-financiero-bot`

2. **Habilitar Google Sheets API**
   - APIs y servicios → Biblioteca
   - Buscar "Google Sheets API" → Habilitar

3. **Crear Service Account**
   - APIs y servicios → Credenciales
   - Crear credenciales → Cuenta de servicio
   - Descargar JSON key

4. **Crear Google Sheet**
   - Nuevo sheet en [sheets.google.com](https://sheets.google.com)
   - Compartir con email del service account
   - Copiar ID del sheet (desde URL)

### 3. Configurar Twilio

1. **Crear cuenta en [twilio.com](https://twilio.com)**
2. **Activar WhatsApp Sandbox**
   - Console → Messaging → Try it out → WhatsApp
   - Enviar "join [código]" al número proporcionado
3. **Copiar credenciales** (Account SID, Auth Token, WhatsApp From)

### 4. Configurar variables de entorno

Crear archivo `.env`:
```env
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
PORT=3000

# Google Sheets
GOOGLE_SHEETS_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
GOOGLE_CLIENT_EMAIL=bot-financiero@proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXX\n-----END PRIVATE KEY-----\n"
```

### 5. Ejecutar localmente
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🌐 Deploy en Railway

1. **Conectar GitHub a Railway**
   - [railway.app](https://railway.app) → New Project → GitHub Repo

2. **Configurar variables de entorno**
   - Settings → Variables → Agregar todas las del `.env`

3. **Configurar webhook en Twilio**
   - URL: `https://tu-app.railway.app/webhook`

## 📊 Estructura del Proyecto

```
gestor-financiero-bot/
├── server.js              # Servidor Express + webhook
├── bot.js                 # Lógica del bot y menús
├── sheets.js              # Conexión Google Sheets
├── package.json
├── .env                   # Variables de entorno
└── README.md
```

## 🎯 Funcionalidades Principales

### 💰 Gestión de Gastos
- Registro rápido: `1500 café comida`
- Gastos compartidos con porcentajes
- Categorización automática
- Historial completo

### 📊 Reportes y Resúmenes
- Resumen mensual automático
- Gastos por categoría
- Comparativas período anterior
- Balance disponible

### 👥 Modo Pareja
- Vinculación de cuentas
- Gastos compartidos 50/50
- Vista combinada de finanzas
- Notificaciones cruzadas

### 🔔 Alertas Inteligentes
- Límites de presupuesto
- Fechas de cierre de tarjetas
- Recordatorios de pagos
- Gastos inusuales

## 📱 Comandos del Bot

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `1` | Configurar sueldo | `850000` |
| `2` | Gasto compartido | `45000 alquiler vivienda` |
| `3` | Gasto individual | `2500 café comida` |
| `4` | Ver gastos | Submenú con opciones |
| `6` | Resumen del mes | Balance y estadísticas |

### 📋 Categorías Disponibles
- `comida` - Alimentación y restaurantes
- `transporte` - Uber, combustible, transporte público
- `entretenimiento` - Cine, streaming, salidas
- `salud` - Farmacia, médicos, gimnasio
- `vivienda` - Alquiler, servicios, mantenimiento
- `compras` - Ropa, tecnología, varios
- `otros` - Gastos misceláneos

## 🔧 Configuración Avanzada

### Personalizar Categorías
Editar en `bot.js`:
```javascript
const validCategories = ['comida', 'transporte', 'tu-categoria'];
```

### Cambiar Formato de Moneda
Modificar funciones de formato en `utils/formatters.js`

### Agregar Nuevas Funcionalidades
1. Crear nueva función en `bot.js`
2. Agregar opción al menú principal
3. Implementar lógica de estados

## 🐛 Troubleshooting

### Error: "Cannot find module 'google-spreadsheet'"
```bash
npm install google-spreadsheet@3.3.0
```

### Error: "No permission to access spreadsheet"
- Verificar que el Google Sheet esté compartido con el service account
- Comprobar email del service account en `.env`

### Error: "Unauthorized" en Twilio
- Verificar `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN`
- Confirmar que WhatsApp Sandbox esté activo

### Bot no responde
- Verificar webhook URL en Twilio Console
- Comprobar que el servidor esté accesible públicamente
- Revisar logs del servidor

## 📈 Próximas Funcionalidades

- [ ] **📊 Gráficos** por WhatsApp
- [ ] **🤖 IA** para categorización automática
- [ ] **💱 Multi-moneda** con conversión automática
- [ ] **📧 Reportes** por email semanales
- [ ] **🔗 Integración bancaria** (API Mercado Pago)
- [ ] **📱 App móvil** complementaria
- [ ] **🎯 Metas** de ahorro
- [ ] **📊 Dashboard web** para análisis

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver [LICENSE](LICENSE) para detalles.

## 👨‍💻 Autor

**Tu Nombre**
- GitHub: [@Leonardo-MT](https://github.com/Leonardo-MT93)
- LinkedIn: [Leonardo Tolaba](https://www.linkedin.com/in/leonardo-manuel-tolaba/)
- Email: leonardotolaba.20@gmail.com

## ⭐ Agradecimientos

- [Twilio](https://twilio.com) por la API de WhatsApp
- [Google Sheets API](https://developers.google.com/sheets) por la base de datos gratuita
- [Render](https://render.com) por el hosting gratuito

---

### 💡 ¿Te gustó el proyecto?

Si este bot te fue útil, ¡dale una ⭐ al repositorio!

También puedes:
- 🐛 Reportar bugs en [Issues](https://github.com/LEONARDO-MT/gestor-financiero-bot/issues)
- 💡 Sugerir mejoras
- 🤝 Contribuir con código
- 📢 Compartir con amigos

---

**¡Construido con ❤️ para hacer las finanzas más simples!**