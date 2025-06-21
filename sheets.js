const { GoogleSpreadsheet } = require('google-spreadsheet');

// Configuración
const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

console.log('🔧 Configuración Google Sheets:');
console.log('📋 SHEET_ID:', SHEET_ID ? '✅ OK' : '❌ FALTA');
console.log('📧 CLIENT_EMAIL:', CLIENT_EMAIL ? '✅ OK' : '❌ FALTA');
console.log('🔑 PRIVATE_KEY:', PRIVATE_KEY ? '✅ OK' : '❌ FALTA');

// Función para conectar
async function getDoc() {
    try {
        if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
            throw new Error('Faltan variables de entorno de Google Sheets');
        }

        const doc = new GoogleSpreadsheet(SHEET_ID);
        
        await doc.useServiceAccountAuth({
            client_email: CLIENT_EMAIL,
            private_key: PRIVATE_KEY,
        });
        
        await doc.loadInfo();
        console.log('✅ Conectado a Google Sheets:', doc.title);
        return doc;
    } catch (error) {
        console.error('❌ Error en Google Sheets:', error.message);
        throw error;
    }
}

// Función addIncome
async function addIncome(phone, amount, description) {
    try {
        console.log(`💰 Intentando guardar ingreso: ${amount} para ${phone}`);
        
        const doc = await getDoc();
        
        // Buscar hoja ingresos
        let sheet = doc.sheetsByTitle['ingresos'];
        if (!sheet) {
            console.log('📄 Creando hoja "ingresos"');
            sheet = await doc.addSheet({ 
                title: 'ingresos',
                headerValues: ['fecha', 'telefono', 'monto', 'descripcion']
            });
        }
        
        // Guardar datos
        const newRow = await sheet.addRow({
            fecha: new Date().toLocaleDateString('es-AR'),
            telefono: phone,
            monto: amount,
            descripcion: description
        });
        
        console.log('✅ Ingreso guardado exitosamente');
        return true;
        
    } catch (error) {
        console.error('❌ Error guardando ingreso:', error);
        throw error;
    }
}

// Función addExpense
async function addExpense(phone, amount, description, type) {
    try {
        console.log(`🛍️ Intentando guardar gasto: ${amount} para ${phone}`);
        
        const doc = await getDoc();
        
        // Buscar hoja gastos
        let sheet = doc.sheetsByTitle['gastos'];
        if (!sheet) {
            console.log('📄 Creando hoja "gastos"');
            sheet = await doc.addSheet({ 
                title: 'gastos',
                headerValues: ['fecha', 'telefono', 'monto', 'descripcion', 'tipo']
            });
        }
        
        // Guardar datos
        await sheet.addRow({
            fecha: new Date().toLocaleDateString('es-AR'),
            telefono: phone,
            monto: amount,
            descripcion: description,
            tipo: type
        });
        
        console.log('✅ Gasto guardado exitosamente');
        return true;
        
    } catch (error) {
        console.error('❌ Error guardando gasto:', error);
        throw error;
    }
}

// Función getMonthlyExpenses
async function getMonthlyExpenses() {
    try {
        console.log('📊 Obteniendo gastos del mes...');
        
        const doc = await getDoc();
        
        const sheet = doc.sheetsByTitle['gastos'];
        if (!sheet) {
            console.log('ℹ️ No existe hoja de gastos');
            return [];
        }
        
        const rows = await sheet.getRows();
        
        // Filtrar gastos del mes actual
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyExpenses = rows.filter(row => {
            const rowDate = new Date(row.fecha);
            return rowDate.getMonth() === currentMonth && 
                   rowDate.getFullYear() === currentYear;
        }).map(row => ({
            date: row.fecha,
            phone: row.telefono,
            amount: parseInt(row.monto || 0),
            description: row.descripcion,
            type: row.tipo
        }));
        
        console.log(`✅ Encontrados ${monthlyExpenses.length} gastos del mes`);
        return monthlyExpenses;
        
    } catch (error) {
        console.error('❌ Error obteniendo gastos:', error);
        return [];
    }
}

// EXPORTS CRÍTICO
module.exports = {
    addIncome,
    addExpense,
    getMonthlyExpenses
};