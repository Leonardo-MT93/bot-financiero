const { GoogleSpreadsheet } = require('google-spreadsheet');

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

let doc;

async function initSheet() {
    if (!doc) {
        doc = new GoogleSpreadsheet(SHEETS_ID);
        
        await doc.useServiceAccountAuth({
            client_email: CLIENT_EMAIL,
            private_key: PRIVATE_KEY,
        });
        
        await doc.loadInfo();
    }
    return doc;
}

async function saveUserData(phoneNumber, userData) {
    try {
        const doc = await initSheet();
        let userSheet = doc.sheetsByTitle['usuarios'];
        
        if (!userSheet) {
            userSheet = await doc.addSheet({ title: 'usuarios' });
            await userSheet.setHeaderRow(['telefono', 'nombre', 'sueldo', 'pareja_telefono', 'created_at']);
        }
        
        const rows = await userSheet.getRows();
        const existingRow = rows.find(row => row.telefono === phoneNumber);
        
        if (existingRow) {
            Object.assign(existingRow, userData);
            await existingRow.save();
        } else {
            await userSheet.addRow({
                telefono: phoneNumber,
                created_at: new Date().toISOString(),
                ...userData
            });
        }
    } catch (error) {
        console.error('Error guardando usuario:', error);
        throw error;
    }
}

async function getUserData(phoneNumber) {
    try {
        const doc = await initSheet();
        const userSheet = doc.sheetsByTitle['usuarios'];
        if (!userSheet) return null;
        
        const rows = await userSheet.getRows();
        const userRow = rows.find(row => row.telefono === phoneNumber);
        
        return userRow || null;
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        return null;
    }
}

async function saveGasto(phoneNumber, gastoData) {
    try {
        const doc = await initSheet();
        let gastosSheet = doc.sheetsByTitle['gastos'];
        
        if (!gastosSheet) {
            gastosSheet = await doc.addSheet({ title: 'gastos' });
            await gastosSheet.setHeaderRow(['telefono', 'fecha', 'tipo', 'monto', 'descripcion', 'categoria', 'compartido', 'porcentaje', 'created_at']);
        }
        
        await gastosSheet.addRow({
            telefono: phoneNumber,
            fecha: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            ...gastoData
        });
    } catch (error) {
        console.error('Error guardando gasto:', error);
        throw error;
    }
}

async function getGastos(phoneNumber) {
    try {
        const doc = await initSheet();
        const gastosSheet = doc.sheetsByTitle['gastos'];
        if (!gastosSheet) return [];
        
        const rows = await gastosSheet.getRows();
        return rows.filter(row => row.telefono === phoneNumber);
    } catch (error) {
        console.error('Error obteniendo gastos:', error);
        return [];
    }
}

module.exports = {
    saveUserData,
    getUserData,
    saveGasto,
    getGastos,
    initSheet
};