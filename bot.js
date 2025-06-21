const { saveUserData, getUserData, saveGasto, getGastos, saveTarjeta, getTarjetas } = require('./sheets');

// Estado de conversación de cada usuario
const userStates = new Map();

async function handleMessage(from, message, profileName) {
    const phoneNumber = from.replace('whatsapp:', '');
    const userState = userStates.get(phoneNumber) || { step: 'menu' };
    
    try {
        let response = '';

        switch (userState.step) {
            case 'menu':
                response = await handleMainMenu(phoneNumber, message, profileName);
                break;
            
            case 'ingreso_sueldo':
                response = await handleIngresoSueldo(phoneNumber, message);
                break;
            
            case 'gasto_compartido':
                response = await handleGastoCompartido(phoneNumber, message, userState);
                break;
            
            case 'gasto_individual':
                response = await handleGastoIndividual(phoneNumber, message);
                break;
            
            case 'ver_gastos':
                response = await handleVerGastos(phoneNumber, message);
                break;
            
            case 'configurar_tarjetas':
                response = await handleConfigurarTarjetas(phoneNumber, message, userState);
                break;
            
            default:
                response = getMainMenuText(profileName);
                userStates.set(phoneNumber, { step: 'menu' });
        }

        return response;
    } catch (error) {
        console.error('❌ Error procesando mensaje:', error);
        return 'Disculpa, hubo un error. Intenta nuevamente escribiendo "menu".';
    }
}

async function handleMainMenu(phoneNumber, message, profileName) {
    const option = message.trim();
    
    switch (option) {
        case '1':
            userStates.set(phoneNumber, { step: 'ingreso_sueldo' });
            return '💰 *INGRESAR SUELDO*\n\nEscribe tu sueldo mensual (solo números):\nEjemplo: 850000';
        
        case '2':
            userStates.set(phoneNumber, { step: 'gasto_compartido', substep: 'monto' });
            return '👥 *GASTO COMPARTIDO*\n\nFormato: [monto] [descripción] [categoría]\nEjemplo: 45000 alquiler vivienda\n\nCategorías: vivienda, comida, transporte, servicios, entretenimiento, salud, otros';
        
        case '3':
            userStates.set(phoneNumber, { step: 'gasto_individual' });
            return '👤 *GASTO INDIVIDUAL*\n\nFormato: [monto] [descripción] [categoría]\nEjemplo: 2500 café comida\n\nCategorías: comida, transporte, entretenimiento, salud, compras, otros';
        
        case '4':
            userStates.set(phoneNumber, { step: 'ver_gastos' });
            return await getVerGastosMenu();
        
        case '5':
            userStates.set(phoneNumber, { step: 'configurar_tarjetas', substep: 'menu' });
            return getTarjetasMenu();
        
        case '6':
            return await getResumenMes(phoneNumber);
        
        case '7':
            return getAlertasMenu();
        
        case '8':
            return getConfiguracionMenu();
        
        default:
            return getMainMenuText(profileName);
    }
}

async function handleIngresoSueldo(phoneNumber, message) {
    const sueldo = parseFloat(message.replace(/[^\d]/g, ''));
    
    if (isNaN(sueldo) || sueldo <= 0) {
        return '❌ Por favor ingresa un monto válido.\nEjemplo: 850000';
    }
    
    await saveUserData(phoneNumber, { sueldo });
    userStates.set(phoneNumber, { step: 'menu' });
    
    return `✅ *Sueldo registrado!*\n💰 $${sueldo.toLocaleString()}\n\n${getMainMenuText()}`;
}

async function handleGastoIndividual(phoneNumber, message) {
    const gastoData = parseGastoMessage(message);
    
    if (!gastoData.success) {
        return gastoData.error;
    }
    
    await saveGasto(phoneNumber, {
        ...gastoData.data,
        tipo: 'individual',
        compartido: false
    });
    
    userStates.set(phoneNumber, { step: 'menu' });
    
    const { monto, descripcion, categoria } = gastoData.data;
    return `✅ *Gasto individual registrado!*\n💰 $${monto.toLocaleString()} - ${descripcion}\n📝 Categoría: ${categoria}\n📅 ${new Date().toLocaleDateString()}\n\n${getMainMenuText()}`;
}

async function handleGastoCompartido(phoneNumber, message) {
    const gastoData = parseGastoMessage(message);
    
    if (!gastoData.success) {
        return gastoData.error;
    }
    
    await saveGasto(phoneNumber, {
        ...gastoData.data,
        tipo: 'compartido',
        compartido: true,
        porcentaje: 50 // Por defecto 50/50
    });
    
    userStates.set(phoneNumber, { step: 'menu' });
    
    const { monto, descripcion, categoria } = gastoData.data;
    return `✅ *Gasto compartido registrado!*\n👥 $${monto.toLocaleString()} - ${descripcion}\n📝 Categoría: ${categoria}\n💡 Tu parte: $${(monto/2).toLocaleString()}\n📅 ${new Date().toLocaleDateString()}\n\n${getMainMenuText()}`;
}

async function handleVerGastos(phoneNumber, message) {
    const option = message.trim();
    
    switch (option) {
        case '4.1':
            return await getCuotasPendientes(phoneNumber);
        case '4.2':
            return await getGastosIndividuales(phoneNumber);
        case '4.3':
            return await getGastosCompartidos(phoneNumber);
        case '4.4':
            return await getGastosTotales(phoneNumber);
        case '4.5':
            return await getGastosPorCategoria(phoneNumber);
        case '4.6':
            return await getGastosRecientes(phoneNumber);
        case '0':
            userStates.set(phoneNumber, { step: 'menu' });
            return getMainMenuText();
        default:
            return getVerGastosMenu();
    }
}

// FUNCIONES DE UTILIDAD

function parseGastoMessage(message) {
    const parts = message.trim().split(' ');
    
    if (parts.length < 3) {
        return {
            success: false,
            error: '❌ Formato incorrecto.\n\n📝 Usa: [monto] [descripción] [categoría]\nEjemplo: 2500 café comida'
        };
    }
    
    const monto = parseFloat(parts[0].replace(/[^\d]/g, ''));
    const descripcion = parts.slice(1, -1).join(' ');
    const categoria = parts[parts.length - 1].toLowerCase();
    
    if (isNaN(monto) || monto <= 0) {
        return {
            success: false,
            error: '❌ Monto inválido. Usa solo números.\nEjemplo: 2500'
        };
    }
    
    if (!descripcion || descripcion.length < 2) {
        return {
            success: false,
            error: '❌ Descripción muy corta.\nEjemplo: café con medialunas'
        };
    }
    
    const validCategories = ['comida', 'transporte', 'entretenimiento', 'salud', 'compras', 'vivienda', 'servicios', 'otros'];
    if (!validCategories.includes(categoria)) {
        return {
            success: false,
            error: `❌ Categoría inválida.\n\n✅ Válidas: ${validCategories.join(', ')}`
        };
    }
    
    return {
        success: true,
        data: { monto, descripcion, categoria }
    };
}

function getMainMenuText(name = '') {
    return `🏦 *GESTOR FINANCIERO PERSONAL*\n${name ? `¡Hola ${name}! ` : ''}💰\n\n📋 *MENÚ PRINCIPAL:*\n\n1️⃣ Ingresar Sueldo\n2️⃣ Ingresar Gasto Compartido\n3️⃣ Ingresar Gasto Individual\n4️⃣ Ver Gastos\n5️⃣ Configurar Tarjetas\n6️⃣ Ver Resumen del Mes\n7️⃣ Alertas y Recordatorios\n8️⃣ Configuración\n\n*Escribe el número de la opción que deseas*`;
}

function getVerGastosMenu() {
    return `📊 *VER GASTOS*\n\n4️⃣.1️⃣ Ver Gastos en Cuotas Pendientes\n4️⃣.2️⃣ Ver Gastos Individuales\n4️⃣.3️⃣ Ver Gastos Compartidos\n4️⃣.4️⃣ Ver Gastos Totales\n4️⃣.5️⃣ Gastos por Categoría\n4️⃣.6️⃣ Gastos de Hoy/Esta Semana\n\n0️⃣ Volver al menú principal`;
}

function getTarjetasMenu() {
    return `💳 *CONFIGURAR TARJETAS*\n\n5️⃣.1️⃣ Agregar Tarjeta\n5️⃣.2️⃣ Ver Mis Tarjetas\n5️⃣.3️⃣ Editar Tarjeta\n5️⃣.4️⃣ Eliminar Tarjeta\n\n0️⃣ Volver al menú principal`;
}

async function getResumenMes(phoneNumber) {
    try {
        const gastos = await getGastos(phoneNumber);
        const userData = await getUserData(phoneNumber);
        
        const currentMonth = new Date().getMonth();
        const gastosDelMes = gastos.filter(g => new Date(g.fecha).getMonth() === currentMonth);
        
        const totalIndividual = gastosDelMes
            .filter(g => !g.compartido)
            .reduce((sum, g) => sum + g.monto, 0);
        
        const totalCompartido = gastosDelMes
            .filter(g => g.compartido)
            .reduce((sum, g) => sum + (g.monto * (g.porcentaje || 50) / 100), 0);
        
        const totalGastado = totalIndividual + totalCompartido;
        const sueldo = userData?.sueldo || 0;
        const disponible = sueldo - totalGastado;
        
        return `📊 *RESUMEN DEL MES*\n\n💰 Sueldo: $${sueldo.toLocaleString()}\n💸 Gastado: $${totalGastado.toLocaleString()}\n💳 Disponible: $${disponible.toLocaleString()}\n\n📈 Desglose:\n👤 Individual: $${totalIndividual.toLocaleString()}\n👥 Compartido: $${totalCompartido.toLocaleString()}\n\n📅 Total gastos: ${gastosDelMes.length}`;
    } catch (error) {
        return '❌ Error obteniendo resumen. Intenta más tarde.';
    }
}

function getAlertasMenu() {
    return `🔔 *ALERTAS Y RECORDATORIOS*\n\n7️⃣.1️⃣ Configurar Límite Diario\n7️⃣.2️⃣ Alertas de Tarjetas\n7️⃣.3️⃣ Recordatorios de Pagos\n7️⃣.4️⃣ Ver Alertas Activas\n\n0️⃣ Volver al menú principal`;
}

function getConfiguracionMenu() {
    return `⚙️ *CONFIGURACIÓN*\n\n8️⃣.1️⃣ Vincular Pareja\n8️⃣.2️⃣ Establecer Presupuesto\n8️⃣.3️⃣ Categorías Personalizadas\n8️⃣.4️⃣ Exportar Datos\n8️⃣.5️⃣ Resetear Datos\n\n0️⃣ Volver al menú principal`;
}

module.exports = { handleMessage };