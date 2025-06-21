require('dotenv').config();
const { GoogleSpreadsheet } = require('google-spreadsheet');

async function testConnection() {
    try {
        console.log('🔍 Probando conexión con Google Sheets...');
        
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_ID);
        
        // Versión corregida para google-spreadsheet v3
        await doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
        
        await doc.loadInfo();
        
        console.log('✅ ¡Conexión exitosa!');
        console.log('📊 Título del sheet:', doc.title);
        console.log('📈 Número de hojas:', doc.sheetCount);
        
        // Probar crear una hoja de prueba
        try {
            const testSheet = await doc.addSheet({ title: 'test-conexion' });
            console.log('✅ Hoja de prueba creada');
            
            // Agregar encabezados
            await testSheet.setHeaderRow(['fecha', 'mensaje', 'estado']);
            
            // Agregar fila de prueba
            await testSheet.addRow(['2025-06-21', 'Conexión funcionando', 'OK']);
            
            console.log('✅ Datos de prueba agregados');
            
        } catch (sheetError) {
            console.log('⚠️ Hoja ya existe o error menor:', sheetError.message);
        }
        
    } catch (error) {
        console.error('❌ Error de conexión:');
        console.error('Mensaje:', error.message);
        
        if (error.message.includes('permission')) {
            console.log('\n💡 SOLUCIÓN: Compartir el Google Sheet');
            console.log('📧 Email a agregar:', process.env.GOOGLE_CLIENT_EMAIL);
        }
        
        if (error.message.includes('parse')) {
            console.log('\n💡 SOLUCIÓN: Verificar GOOGLE_PRIVATE_KEY en .env');
        }
        
        if (error.message.includes('not found')) {
            console.log('\n💡 SOLUCIÓN: Verificar GOOGLE_SHEETS_ID en .env');
        }
    }
}

testConnection();