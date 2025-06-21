const { GoogleSpreadsheet } = require('google-spreadsheet');

// Configuración
const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

console.log('🔧 Configuración Google Sheets:');
console.log('📋 SHEET_ID:', SHEET_ID ? '✅ OK' : '❌ FALTA');
console.log('📧 CLIENT_EMAIL:', CLIENT_EMAIL ? '✅ OK' : '❌ FALTA');
console.log('🔑 PRIVATE_KEY:', PRIVATE_KEY ? '✅ OK' : '❌ FALTA');

// Cache para documento
let docCache = null;
let lastConnected = null;

// Función para conectar (con cache)
async function getDoc() {
    try {
        // Si ya tenemos conexión reciente (menos de 5 minutos), usar cache
        if (docCache && lastConnected && (Date.now() - lastConnected) < 300000) {
            return docCache;
        }

        if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
            throw new Error('❌ Faltan variables de entorno de Google Sheets');
        }

        console.log('🔄 Conectando a Google Sheets...');
        const doc = new GoogleSpreadsheet(SHEET_ID);
        
        await doc.useServiceAccountAuth({
            client_email: CLIENT_EMAIL,
            private_key: PRIVATE_KEY,
        });
        
        await doc.loadInfo();
        console.log('✅ Conectado a Google Sheets:', doc.title);
        
        // Actualizar cache
        docCache = doc;
        lastConnected = Date.now();
        
        return doc;
    } catch (error) {
        console.error('❌ Error en Google Sheets:', error.message);
        // Limpiar cache en caso de error
        docCache = null;
        lastConnected = null;
        throw error;
    }
}

// Función para crear hojas si no existen
async function ensureSheets(doc) {
    const requiredSheets = [
        { name: 'ingresos', headers: ['fecha', 'telefono', 'monto', 'descripcion'] },
        { name: 'gastos', headers: ['fecha', 'telefono', 'monto', 'descripcion', 'tipo'] },
        { name: 'parejas', headers: ['telefono', 'nombre_pareja', 'telefono_pareja', 'fecha_config'] }
    ];
    
    for (const sheetConfig of requiredSheets) {
        let sheet = doc.sheetsByTitle[sheetConfig.name];
        if (!sheet) {
            console.log(`📄 Creando hoja "${sheetConfig.name}"`);
            sheet = await doc.addSheet({ 
                title: sheetConfig.name,
                headerValues: sheetConfig.headers
            });
        }
    }
}

// Función addIncome mejorada
async function addIncome(phone, amount, description) {
    try {
        console.log(`💰 [${new Date().toISOString()}] Guardando ingreso: ${amount} para ${phone}`);
        
        const doc = await getDoc();
        await ensureSheets(doc);
        
        const sheet = doc.sheetsByTitle['ingresos'];
        
        // Agregar fila con timestamp detallado
        const newRow = await sheet.addRow({
            fecha: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR'),
            telefono: phone,
            monto: amount,
            descripcion: description
        });
        
        console.log(`✅ [${new Date().toISOString()}] Ingreso guardado - Row ID: ${newRow.rowNumber}`);
        return true;
        
    } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] Error guardando ingreso:`, error);
        throw error;
    }
}

// Función addExpense mejorada
async function addExpense(phone, amount, description, type) {
    try {
        console.log(`🛍️ [${new Date().toISOString()}] Guardando gasto: ${amount} (${type}) para ${phone}`);
        
        const doc = await getDoc();
        await ensureSheets(doc);
        
        const sheet = doc.sheetsByTitle['gastos'];
        
        // Agregar fila con timestamp detallado
        const newRow = await sheet.addRow({
            fecha: new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString('es-AR'),
            telefono: phone,
            monto: amount,
            descripcion: description,
            tipo: type
        });
        
        console.log(`✅ [${new Date().toISOString()}] Gasto guardado - Row ID: ${newRow.rowNumber}`);
        return true;
        
    } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] Error guardando gasto:`, error);
        throw error;
    }
}

// Función getMonthlyExpenses mejorada
async function getMonthlyExpenses(phone) {
    try {
        console.log(`📊 [${new Date().toISOString()}] Obteniendo gastos para ${phone}...`);
        
        const doc = await getDoc();
        await ensureSheets(doc);
        
        const sheet = doc.sheetsByTitle['gastos'];
        const rows = await sheet.getRows();
        
        console.log(`📊 Total filas en gastos: ${rows.length}`);
        
        // Obtener datos de pareja para incluir gastos compartidos
        const partnerData = await getPartnerData(phone);
        const phoneNumbers = [phone];
        
        if (partnerData && partnerData.partnerPhone) {
            phoneNumbers.push(partnerData.partnerPhone.replace('whatsapp:', ''));
        }
        
        console.log(`📱 Buscando gastos para teléfonos: ${phoneNumbers.join(', ')}`);
        
        // Filtrar gastos del mes actual para el usuario y su pareja
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyExpenses = rows.filter(row => {
            // Verificar si el teléfono coincide
            const rowPhone = row.telefono;
            const phoneMatch = phoneNumbers.some(num => rowPhone.includes(num) || num.includes(rowPhone));
            
            if (!phoneMatch) return false;
            
            // Verificar fecha
            try {
                const rowDate = new Date(row.fecha.split(' ')[0]); // Solo la parte de fecha
                const isCurrentMonth = rowDate.getMonth() === currentMonth && 
                                     rowDate.getFullYear() === currentYear;
                
                return isCurrentMonth;
            } catch (dateError) {
                console.error('Error parsing date:', row.fecha);
                return false;
            }
        }).map(row => ({
            date: row.fecha,
            phone: row.telefono,
            amount: parseInt(row.monto || 0),
            description: row.descripcion || 'Sin descripción',
            type: row.tipo || 'individual'
        }));
        
        console.log(`✅ [${new Date().toISOString()}] Gastos encontrados: ${monthlyExpenses.length}`);
        monthlyExpenses.forEach(expense => {
            console.log(`  • $${expense.amount} - ${expense.description} (${expense.type})`);
        });
        
        return monthlyExpenses;
        
    } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] Error obteniendo gastos:`, error);
        return [];
    }
}

// Nueva función para agregar pareja
async function addPartner(phone, partnerName, partnerPhone) {
    try {
        console.log(`👫 [${new Date().toISOString()}] Configurando pareja: ${partnerName} (${partnerPhone}) para ${phone}`);
        
        const doc = await getDoc();
        await ensureSheets(doc);
        
        const sheet = doc.sheetsByTitle['parejas'];
        
        // Verificar si ya existe configuración para este teléfono
        const rows = await sheet.getRows();
        const existingRow = rows.find(row => row.telefono === phone);
        
        if (existingRow) {
            // Actualizar fila existente
            existingRow.nombre_pareja = partnerName;
            existingRow.telefono_pareja = partnerPhone;
            existingRow.fecha_config = new Date().toLocaleDateString('es-AR');
            await existingRow.save();
            console.log('✅ Configuración de pareja actualizada');
        } else {
            // Crear nueva fila
            await sheet.addRow({
                telefono: phone,
                nombre_pareja: partnerName,
                telefono_pareja: partnerPhone,
                fecha_config: new Date().toLocaleDateString('es-AR')
            });
            console.log('✅ Nueva configuración de pareja creada');
        }
        
        return true;
        
    } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] Error configurando pareja:`, error);
        throw error;
    }
}

// Nueva función para obtener datos de pareja
async function getPartnerData(phone) {
    try {
        console.log(`👫 [${new Date().toISOString()}] Obteniendo datos de pareja para ${phone}...`);
        
        const doc = await getDoc();
        await ensureSheets(doc);
        
        const parejasSheet = doc.sheetsByTitle['parejas'];
        const ingresosSheet = doc.sheetsByTitle['ingresos'];
        
        // Buscar configuración de pareja
        const parejasRows = await parejasSheet.getRows();
        const partnerConfig = parejasRows.find(row => row.telefono === phone);
        
        if (!partnerConfig) {
            console.log('ℹ️ No hay configuración de pareja');
            return null;
        }
        
        const partnerName = partnerConfig.nombre_pareja;
        const partnerPhone = partnerConfig.telefono_pareja;
        
        // Buscar último sueldo de la pareja
        const ingresosRows = await ingresosSheet.getRows();
        const partnerIncomes = ingresosRows.filter(row => {
            const rowPhone = row.telefono;
            return rowPhone.includes(partnerPhone.replace('+', '')) || 
                   partnerPhone.includes(rowPhone);
        });
        
        let partnerSalary = null;
        if (partnerIncomes.length > 0) {
            // Tomar el último ingreso
            const lastIncome = partnerIncomes[partnerIncomes.length - 1];
            partnerSalary = parseInt(lastIncome.monto || 0);
        }
        
        console.log(`✅ Datos de pareja: ${partnerName}, sueldo: ${partnerSalary || 'No registrado'}`);
        
        return {
            partnerName,
            partnerPhone,
            partnerSalary
        };
        
    } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] Error obteniendo datos de pareja:`, error);
        return null;
    }
}

// Test de conexión mejorado
async function testConnection() {
    try {
        console.log('🔍 [TEST] Probando conexión completa...');
        console.log('📋 SHEET_ID:', SHEET_ID ? '✅ Configurado' : '❌ Falta');
        console.log('📧 CLIENT_EMAIL:', CLIENT_EMAIL ? '✅ Configurado' : '❌ Falta');
        console.log('🔑 PRIVATE_KEY:', PRIVATE_KEY ? '✅ Configurado' : '❌ Falta');
        
        const doc = await getDoc();
        console.log('✅ Conexión exitosa a:', doc.title);
        
        await ensureSheets(doc);
        console.log('✅ Hojas verificadas/creadas');
        
        // Listar hojas existentes
        console.log('📄 Hojas disponibles:');
        Object.keys(doc.sheetsByTitle).forEach(title => {
            console.log(`  • ${title}`);
        });
        
        return true;
    } catch (error) {
        console.error('❌ [TEST] Falló:', error.message);
        return false;
    }
}

// Función para debugging - obtener estadísticas
async function getStats() {
    try {
        const doc = await getDoc();
        await ensureSheets(doc);
        
        const ingresosRows = await doc.sheetsByTitle['ingresos'].getRows();
        const gastosRows = await doc.sheetsByTitle['gastos'].getRows();
        const parejasRows = await doc.sheetsByTitle['parejas'].getRows();
        
        console.log('📊 ESTADÍSTICAS:');
        console.log(`  • Ingresos registrados: ${ingresosRows.length}`);
        console.log(`  • Gastos registrados: ${gastosRows.length}`);
        console.log(`  • Parejas configuradas: ${parejasRows.length}`);
        
        return {
            ingresos: ingresosRows.length,
            gastos: gastosRows.length,
            parejas: parejasRows.length
        };
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        return null;
    }
}

module.exports = {
    addIncome,
    addExpense,
    getMonthlyExpenses,
    addPartner,
    getPartnerData,
    testConnection,
    getStats
};