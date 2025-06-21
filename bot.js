const { addIncome, addExpense, getMonthlyExpenses, addPartner, getPartnerData } = require('./sheets');

// Estados de usuario (en memoria pero más robustos)
const userStates = {};

// Configuración de usuarios y parejas
const userConfig = {};

// Función para limpiar el estado del usuario
function resetUserState(userPhone) {
    userStates[userPhone] = { 
        step: 'menu',
        lastActivity: new Date()
    };
}

// Función para validar montos
function isValidAmount(text) {
    // Remover espacios, puntos y comas
    const cleanText = text.replace(/[\s.,]/g, '');
    
    // Verificar que solo contenga números
    if (!/^\d+$/.test(cleanText)) {
        return false;
    }
    
    // Convertir a número
    const amount = parseInt(cleanText);
    
    // Verificar que sea un monto razonable (entre 1000 y 100 millones)
    return amount >= 1000 && amount <= 100000000;
}

// Función para formatear números con puntos
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Función para limpiar y convertir monto
function parseAmount(text) {
    const cleanText = text.replace(/[\s.,]/g, '');
    return parseInt(cleanText);
}

async function handleMessage(from, body) {
    const userPhone = from.replace('whatsapp:', '');
    const message = body.trim().toLowerCase();
    
    console.log(`📱 Mensaje de ${userPhone}: "${body}"`);
    
    // Obtener o inicializar estado del usuario
    if (!userStates[userPhone]) {
        resetUserState(userPhone);
    }
    
    const userState = userStates[userPhone];
    console.log(`🔄 Estado actual: ${userState.step}`);
    
    try {
        // Si el usuario escribe "menu" en cualquier momento, resetear
        if (message === 'menu' || message === 'menú') {
            console.log(`🔄 Usuario ${userPhone} solicitó menú principal`);
            resetUserState(userPhone);
            return await getMainMenu(userPhone);
        }

        // Si el usuario escribe "estado" para debug
        if (message === 'estado') {
            return `🔍 DEBUG INFO:
Estado: ${userState.step}
Datos temporales: ${JSON.stringify(userState, null, 2)}
Escribe "menu" para resetear.`;
        }
        
        // Manejar según el estado actual
        switch (userState.step) {
            case 'menu':
                return await handleMenuOption(userPhone, message);
                
            case 'waiting_salary':
                return await handleSalaryInput(userPhone, body.trim());
                
            case 'waiting_shared_expense_amount':
                return await handleSharedExpenseAmount(userPhone, body.trim());
                
            case 'waiting_shared_expense_description':
                return await handleSharedExpenseDescription(userPhone, body.trim());
                
            case 'waiting_individual_expense_amount':
                return await handleIndividualExpenseAmount(userPhone, body.trim());
                
            case 'waiting_individual_expense_description':
                return await handleIndividualExpenseDescription(userPhone, body.trim());
                
            case 'waiting_partner_name':
                return await handlePartnerName(userPhone, body.trim());
                
            case 'waiting_partner_phone':
                return await handlePartnerPhone(userPhone, body.trim());
                
            default:
                console.log(`❌ Estado desconocido: ${userState.step}, reseteando`);
                resetUserState(userPhone);
                return await getMainMenu(userPhone);
        }
    } catch (error) {
        console.error('❌ Error handling message:', error);
        resetUserState(userPhone);
        return `❌ Disculpa, hubo un error. 

${await getMainMenu(userPhone)}`;
    }
}

async function getMainMenu(userPhone) {
    try {
        // Obtener datos de la pareja si existe
        const partnerData = await getPartnerData(userPhone);
        
        let menuText = `🏦 *GESTOR FINANCIERO PERSONAL*\n\n`;
        
        // Mostrar info de pareja si existe
        if (partnerData && partnerData.partnerName) {
            menuText += `👫 *PAREJA:* ${partnerData.partnerName}\n`;
            if (partnerData.partnerSalary) {
                menuText += `💰 *Su sueldo:* $${formatNumber(partnerData.partnerSalary)}\n`;
            }
            menuText += `\n`;
        }

        menuText += `1️⃣ Ingresar Sueldo
2️⃣ Ingresar Gasto Compartido  
3️⃣ Ingresar Gasto Individual
4️⃣ Ver Gastos del Mes
5️⃣ Configurar Pareja
6️⃣ Resumen Financiero

*Envía el número de la opción* 👆`;

        return menuText;
    } catch (error) {
        console.error('Error getting main menu:', error);
        return `🏦 *GESTOR FINANCIERO PERSONAL*

1️⃣ Ingresar Sueldo
2️⃣ Ingresar Gasto Compartido  
3️⃣ Ingresar Gasto Individual
4️⃣ Ver Gastos del Mes
5️⃣ Configurar Pareja
6️⃣ Resumen Financiero

*Envía el número de la opción* 👆`;
    }
}

async function handleMenuOption(userPhone, option) {
    console.log(`🎯 Procesando opción "${option}" para ${userPhone}`);
    
    switch (option) {
        case '1':
            userStates[userPhone].step = 'waiting_salary';
            console.log(`✅ Cambiando estado a: waiting_salary`);
            return `💰 *INGRESAR SUELDO*

Por favor ingresa tu sueldo del mes.

*Ejemplos válidos:*
• 1400000
• 1.400.000
• 1,400,000

Escribe solo el número:`;

        case '2':
            userStates[userPhone].step = 'waiting_shared_expense_amount';
            console.log(`✅ Cambiando estado a: waiting_shared_expense_amount`);
            return `👥 *GASTO COMPARTIDO*

¿Cuánto gastaron entre los dos?

*Ejemplos:*
• 50000 (supermercado)
• 25000 (cena)
• 150000 (servicios)

Escribe el monto:`;

        case '3':
            userStates[userPhone].step = 'waiting_individual_expense_amount';
            console.log(`✅ Cambiando estado a: waiting_individual_expense_amount`);
            return `🛍️ *GASTO INDIVIDUAL*

¿Cuánto gastaste solo/a?

*Ejemplos:*
• 15000 (almuerzo)
• 80000 (ropa)
• 30000 (transporte)

Escribe el monto:`;

        case '4':
            console.log(`📊 Obteniendo gastos para ${userPhone}`);
            const expenses = await getMonthlyExpenses(userPhone);
            return formatExpensesReport(expenses);

        case '5':
            userStates[userPhone].step = 'waiting_partner_name';
            console.log(`✅ Cambiando estado a: waiting_partner_name`);
            return `👫 *CONFIGURAR PAREJA*

¿Cómo se llama tu pareja?

Ejemplo: Maria, Juan, etc.

Escribe el nombre:`;

        case '6':
            console.log(`📈 Generando resumen para ${userPhone}`);
            const summary = await getMonthlyExpenses(userPhone);
            return await formatMonthlySummary(userPhone, summary);

        default:
            console.log(`❌ Opción inválida: "${option}"`);
            return `❌ *Opción no válida.*

Por favor elige un número del 1 al 6.

${await getMainMenu(userPhone)}`;
    }
}

async function handleSalaryInput(userPhone, text) {
    console.log(`💰 Procesando sueldo: "${text}" para ${userPhone}`);
    
    if (!isValidAmount(text)) {
        return `❌ *Monto inválido*

Por favor ingresa un monto válido.

*Ejemplos correctos:*
• 1400000
• 850000  
• 2500000

Escribe solo números (sin letras):`;
    }
    
    const amount = parseAmount(text);
    console.log(`💰 Monto procesado: ${amount}`);
    
    try {
        const success = await addIncome(userPhone, amount, 'Sueldo');
        console.log(`💰 Resultado guardado: ${success}`);
        
        if (success) {
            resetUserState(userPhone);
            return `✅ *SUELDO REGISTRADO*

💰 Monto: $${formatNumber(amount)}
📅 Fecha: ${new Date().toLocaleDateString('es-AR')}

${await getMainMenu(userPhone)}`;
        } else {
            throw new Error('addIncome retornó false');
        }
    } catch (error) {
        console.error('❌ Error guardando sueldo:', error);
        resetUserState(userPhone);
        return `❌ *Error al guardar*

Hubo un problema guardando tu sueldo.

${await getMainMenu(userPhone)}`;
    }
}

async function handleSharedExpenseAmount(userPhone, text) {
    console.log(`👥 Procesando gasto compartido: "${text}"`);
    
    if (!isValidAmount(text)) {
        return `❌ *Monto inválido*

Por favor ingresa un monto válido.

*Ejemplos:* 50000, 25000, 150000

Escribe solo números:`;
    }
    
    const amount = parseAmount(text);
    userStates[userPhone].amount = amount;
    userStates[userPhone].step = 'waiting_shared_expense_description';
    
    console.log(`👥 Monto guardado temporalmente: ${amount}, esperando descripción`);
    
    return `💡 *DESCRIPCIÓN DEL GASTO*

Monto: $${formatNumber(amount)}

¿En qué gastaron?

*Ejemplos:*
• Supermercado
• Cena restaurante  
• Servicios casa
• Transporte

Escribe la descripción:`;
}

async function handleSharedExpenseDescription(userPhone, description) {
    const amount = userStates[userPhone].amount;
    console.log(`👥 Guardando gasto compartido: ${amount} - ${description}`);
    
    try {
        const success = await addExpense(userPhone, amount, description, 'compartido');
        console.log(`👥 Resultado guardado: ${success}`);
        
        if (success) {
            resetUserState(userPhone);
            return `✅ *GASTO COMPARTIDO REGISTRADO*

💰 Monto: $${formatNumber(amount)}
📝 Descripción: ${description}
👥 Tipo: Compartido
📅 Fecha: ${new Date().toLocaleDateString('es-AR')}

${await getMainMenu(userPhone)}`;
        } else {
            throw new Error('addExpense retornó false');
        }
    } catch (error) {
        console.error('❌ Error guardando gasto compartido:', error);
        resetUserState(userPhone);
        return `❌ *Error al guardar*

${await getMainMenu(userPhone)}`;
    }
}

async function handleIndividualExpenseAmount(userPhone, text) {
    console.log(`🛍️ Procesando gasto individual: "${text}"`);
    
    if (!isValidAmount(text)) {
        return `❌ *Monto inválido*

*Ejemplos:* 15000, 80000, 30000

Escribe solo números:`;
    }
    
    const amount = parseAmount(text);
    userStates[userPhone].amount = amount;
    userStates[userPhone].step = 'waiting_individual_expense_description';
    
    console.log(`🛍️ Monto guardado temporalmente: ${amount}`);
    
    return `💡 *DESCRIPCIÓN DEL GASTO*

Monto: $${formatNumber(amount)}

¿En qué gastaste?

*Ejemplos:*
• Almuerzo trabajo
• Ropa personal
• Transporte
• Entretenimiento

Escribe la descripción:`;
}

async function handleIndividualExpenseDescription(userPhone, description) {
    const amount = userStates[userPhone].amount;
    console.log(`🛍️ Guardando gasto individual: ${amount} - ${description}`);
    
    try {
        const success = await addExpense(userPhone, amount, description, 'individual');
        console.log(`🛍️ Resultado guardado: ${success}`);
        
        if (success) {
            resetUserState(userPhone);
            return `✅ *GASTO INDIVIDUAL REGISTRADO*

💰 Monto: $${formatNumber(amount)}
📝 Descripción: ${description}
🛍️ Tipo: Individual
📅 Fecha: ${new Date().toLocaleDateString('es-AR')}

${await getMainMenu(userPhone)}`;
        } else {
            throw new Error('addExpense retornó false');
        }
    } catch (error) {
        console.error('❌ Error guardando gasto individual:', error);
        resetUserState(userPhone);
        return `❌ *Error al guardar*

${await getMainMenu(userPhone)}`;
    }
}

async function handlePartnerName(userPhone, name) {
    if (!name || name.length < 2) {
        return `❌ *Nombre inválido*

Por favor ingresa un nombre válido.

*Ejemplo:* Maria, Juan, etc.`;
    }
    
    userStates[userPhone].partnerName = name;
    userStates[userPhone].step = 'waiting_partner_phone';
    
    console.log(`👫 Nombre de pareja guardado: ${name}`);
    
    return `📱 *NÚMERO DE ${name.toUpperCase()}*

¿Cuál es el número de WhatsApp de ${name}?

*Formato:* +549XXXXXXXXX
*Ejemplo:* +5491123456789

Escribe el número:`;
}

async function handlePartnerPhone(userPhone, phone) {
    const partnerName = userStates[userPhone].partnerName;
    
    // Validar formato básico de teléfono
    if (!phone.includes('+549') || phone.length < 13) {
        return `❌ *Número inválido*

El formato debe ser: +549XXXXXXXXX

*Ejemplo:* +5491123456789

Intenta nuevamente:`;
    }
    
    try {
        const success = await addPartner(userPhone, partnerName, phone);
        console.log(`👫 Pareja configurada: ${success}`);
        
        if (success) {
            resetUserState(userPhone);
            return `✅ *PAREJA CONFIGURADA*

👫 Nombre: ${partnerName}
📱 Teléfono: ${phone}

Ahora ${partnerName} puede usar el bot y verán los gastos compartidos.

${await getMainMenu(userPhone)}`;
        } else {
            throw new Error('addPartner retornó false');
        }
    } catch (error) {
        console.error('❌ Error configurando pareja:', error);
        resetUserState(userPhone);
        return `❌ *Error al configurar pareja*

${await getMainMenu(userPhone)}`;
    }
}

function formatExpensesReport(expenses) {
    console.log(`📊 Formateando reporte de ${expenses ? expenses.length : 0} gastos`);
    
    if (!expenses || expenses.length === 0) {
        return `📊 *GASTOS DEL MES*

❌ No hay gastos registrados este mes.

Prueba agregando algunos gastos primero.

🔄 Escribe *menu* para volver al inicio.`;
    }
    
    let report = `📊 *GASTOS DEL MES*\n\n`;
    let totalShared = 0;
    let totalIndividual = 0;
    
    // Agrupar por tipo
    const sharedExpenses = expenses.filter(e => e.type === 'compartido');
    const individualExpenses = expenses.filter(e => e.type === 'individual');
    
    if (sharedExpenses.length > 0) {
        report += `👥 *GASTOS COMPARTIDOS:*\n`;
        sharedExpenses.forEach(expense => {
            const amount = formatNumber(expense.amount);
            report += `• $${amount} - ${expense.description}\n`;
            totalShared += expense.amount;
        });
        report += `\n`;
    }
    
    if (individualExpenses.length > 0) {
        report += `🛍️ *GASTOS INDIVIDUALES:*\n`;
        individualExpenses.forEach(expense => {
            const amount = formatNumber(expense.amount);
            report += `• $${amount} - ${expense.description}\n`;
            totalIndividual += expense.amount;
        });
        report += `\n`;
    }
    
    report += `📈 *TOTALES:*\n`;
    report += `👥 Compartidos: $${formatNumber(totalShared)}\n`;
    report += `🛍️ Individuales: $${formatNumber(totalIndividual)}\n`;
    report += `💯 **Total General: $${formatNumber(totalShared + totalIndividual)}**\n\n`;
    
    report += `🔄 Escribe *menu* para volver al inicio.`;
    
    return report;
}

async function formatMonthlySummary(userPhone, expenses) {
    try {
        const partnerData = await getPartnerData(userPhone);
        
        let summary = `📈 *RESUMEN FINANCIERO DEL MES*\n\n`;
        
        // Info de pareja
        if (partnerData && partnerData.partnerName) {
            summary += `👫 *PAREJA:* ${partnerData.partnerName}\n\n`;
        }
        
        // Calcular totales
        let totalShared = 0;
        let totalIndividual = 0;
        
        if (expenses && expenses.length > 0) {
            expenses.forEach(expense => {
                if (expense.type === 'compartido') {
                    totalShared += expense.amount;
                } else {
                    totalIndividual += expense.amount;
                }
            });
        }
        
        summary += `💰 *GASTOS:*\n`;
        summary += `👥 Compartidos: $${formatNumber(totalShared)}\n`;
        summary += `🛍️ Individuales: $${formatNumber(totalIndividual)}\n`;
        summary += `💯 Total: $${formatNumber(totalShared + totalIndividual)}\n\n`;
        
        // Si hay gastos compartidos, calcular división
        if (totalShared > 0) {
            const sharedPerPerson = totalShared / 2;
            summary += `🔄 *DIVISIÓN DE GASTOS COMPARTIDOS:*\n`;
            summary += `• Cada uno debe: $${formatNumber(sharedPerPerson)}\n\n`;
        }
        
        summary += `🔄 Escribe *menu* para volver al inicio.`;
        
        return summary;
    } catch (error) {
        console.error('Error formatting monthly summary:', error);
        return formatExpensesReport(expenses);
    }
}

module.exports = { handleMessage };