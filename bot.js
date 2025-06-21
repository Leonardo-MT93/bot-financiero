const { addIncome, addExpense, getMonthlyExpenses } = require('./sheets');

// Estados de usuario (temporal, en memoria)
const userStates = {};

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
    
    // Verificar que sea un monto razonable (entre 1 y 100 millones)
    return amount >= 1 && amount <= 100000000;
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
    
    // Obtener o inicializar estado del usuario
    if (!userStates[userPhone]) {
        userStates[userPhone] = { step: 'menu' };
    }
    
    const userState = userStates[userPhone];
    
    try {
        // Si el usuario escribe "menu" en cualquier momento, resetear
        if (message === 'menu') {
            userStates[userPhone] = { step: 'menu' };
            return getMainMenu();
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
                userStates[userPhone] = { step: 'menu' };
                return getMainMenu();
        }
    } catch (error) {
        console.error('Error handling message:', error);
        userStates[userPhone] = { step: 'menu' };
        return 'Disculpa, hubo un error. Intenta nuevamente escribiendo *menu*.';
    }
}

function getMainMenu() {
    return `🏦 *GESTOR FINANCIERO PERSONAL*

1️⃣ Ingresar Sueldo
2️⃣ Ingresar Gasto Compartido  
3️⃣ Ingresar Gasto Individual
4️⃣ Ver Gastos
5️⃣ Configurar Pareja
6️⃣ Resumen del Mes

Envía el número de la opción 👆`;
}

async function handleMenuOption(userPhone, option) {
    switch (option) {
        case '1':
            userStates[userPhone].step = 'waiting_salary';
            return `💰 *INGRESAR SUELDO*

Por favor ingresa tu sueldo del mes.

Ejemplos válidos:
• 1400000
• 1.400.000
• 1,400,000

Escribe solo el número:`;

        case '2':
            userStates[userPhone].step = 'waiting_shared_expense_amount';
            return `👥 *GASTO COMPARTIDO*

¿Cuánto gastaron entre los dos?

Ejemplos:
• 50000 (supermercado)
• 25000 (cena)
• 150000 (servicios)

Escribe el monto:`;

        case '3':
            userStates[userPhone].step = 'waiting_individual_expense_amount';
            return `🛍️ *GASTO INDIVIDUAL*

¿Cuánto gastaste solo/a?

Ejemplos:
• 15000 (almuerzo)
• 80000 (ropa)
• 30000 (transporte)

Escribe el monto:`;

        case '4':
            const expenses = await getMonthlyExpenses();
            return formatExpensesReport(expenses);

        case '5':
            userStates[userPhone].step = 'waiting_partner_name';
            return `👫 *CONFIGURAR PAREJA*

¿Cómo se llama tu pareja?`;

        case '6':
            const summary = await getMonthlyExpenses();
            return formatMonthlySummary(summary);

        default:
            return `❌ Opción no válida. 

${getMainMenu()}`;
    }
}

async function handleSalaryInput(userPhone, text) {
    if (!isValidAmount(text)) {
        return `❌ Por favor ingresa un monto válido.

Ejemplos:
• 1400000
• 850000  
• 2500000

Escribe solo números (sin letras ni símbolos):`;
    }
    
    const amount = parseAmount(text);
    
    try {
        await addIncome(userPhone, amount, 'Sueldo');
        userStates[userPhone] = { step: 'menu' };
        
        return `✅ *SUELDO REGISTRADO*

💰 Monto: $${formatNumber(amount)}
📅 Fecha: ${new Date().toLocaleDateString('es-AR')}

${getMainMenu()}`;
    } catch (error) {
        console.error('Error adding income:', error);
        return `❌ Error al guardar. Intenta nuevamente o escribe *menu*.`;
    }
}

async function handleSharedExpenseAmount(userPhone, text) {
    if (!isValidAmount(text)) {
        return `❌ Por favor ingresa un monto válido.

Ejemplos: 50000, 25000, 150000

Escribe solo números:`;
    }
    
    const amount = parseAmount(text);
    userStates[userPhone].amount = amount;
    userStates[userPhone].step = 'waiting_shared_expense_description';
    
    return `💡 *DESCRIPCIÓN DEL GASTO*

Monto: $${formatNumber(amount)}

¿En qué gastaron?

Ejemplos:
• Supermercado
• Cena restaurante  
• Servicios casa
• Transporte

Escribe la descripción:`;
}

async function handleSharedExpenseDescription(userPhone, description) {
    const amount = userStates[userPhone].amount;
    
    try {
        await addExpense(userPhone, amount, description, 'compartido');
        userStates[userPhone] = { step: 'menu' };
        
        return `✅ *GASTO COMPARTIDO REGISTRADO*

💰 Monto: $${formatNumber(amount)}
📝 Descripción: ${description}
👥 Tipo: Compartido
📅 Fecha: ${new Date().toLocaleDateString('es-AR')}

${getMainMenu()}`;
    } catch (error) {
        console.error('Error adding expense:', error);
        return `❌ Error al guardar. Intenta nuevamente o escribe *menu*.`;
    }
}

async function handleIndividualExpenseAmount(userPhone, text) {
    if (!isValidAmount(text)) {
        return `❌ Por favor ingresa un monto válido.

Ejemplos: 15000, 80000, 30000

Escribe solo números:`;
    }
    
    const amount = parseAmount(text);
    userStates[userPhone].amount = amount;
    userStates[userPhone].step = 'waiting_individual_expense_description';
    
    return `💡 *DESCRIPCIÓN DEL GASTO*

Monto: $${formatNumber(amount)}

¿En qué gastaste?

Ejemplos:
• Almuerzo trabajo
• Ropa personal
• Transporte
• Entretenimiento

Escribe la descripción:`;
}

async function handleIndividualExpenseDescription(userPhone, description) {
    const amount = userStates[userPhone].amount;
    
    try {
        await addExpense(userPhone, amount, description, 'individual');
        userStates[userPhone] = { step: 'menu' };
        
        return `✅ *GASTO INDIVIDUAL REGISTRADO*

💰 Monto: $${formatNumber(amount)}
📝 Descripción: ${description}
🛍️ Tipo: Individual
📅 Fecha: ${new Date().toLocaleDateString('es-AR')}

${getMainMenu()}`;
    } catch (error) {
        console.error('Error adding expense:', error);
        return `❌ Error al guardar. Intenta nuevamente o escribe *menu*.`;
    }
}

async function handlePartnerName(userPhone, name) {
    userStates[userPhone].partnerName = name;
    userStates[userPhone].step = 'waiting_partner_phone';
    
    return `📱 *NÚMERO DE ${name.toUpperCase()}*

¿Cuál es el número de WhatsApp de ${name}?

Formato: +54911XXXXXXXX
Ejemplo: +5491123456789

Escribe el número:`;
}

async function handlePartnerPhone(userPhone, phone) {
    const partnerName = userStates[userPhone].partnerName;
    
    // Aquí podrías guardar en Google Sheets la configuración de pareja
    userStates[userPhone] = { step: 'menu' };
    
    return `✅ *PAREJA CONFIGURADA*

👫 Nombre: ${partnerName}
📱 Teléfono: ${phone}

Ahora ${partnerName} puede usar el bot con el mismo número y verán los gastos compartidos.

${getMainMenu()}`;
}

function formatExpensesReport(expenses) {
    if (!expenses || expenses.length === 0) {
        return `📊 *GASTOS DEL MES*

No hay gastos registrados este mes.

${getMainMenu()}`;
    }
    
    let report = `📊 *GASTOS DEL MES*\n\n`;
    let totalShared = 0;
    let totalIndividual = 0;
    
    expenses.forEach(expense => {
        const amount = formatNumber(expense.amount);
        report += `💰 $${amount} - ${expense.description}\n`;
        report += `📅 ${expense.date} | ${expense.type === 'compartido' ? '👥' : '🛍️'} ${expense.type}\n\n`;
        
        if (expense.type === 'compartido') {
            totalShared += expense.amount;
        } else {
            totalIndividual += expense.amount;
        }
    });
    
    report += `📈 *RESUMEN:*\n`;
    report += `👥 Compartidos: $${formatNumber(totalShared)}\n`;
    report += `🛍️ Individuales: $${formatNumber(totalIndividual)}\n`;
    report += `💯 Total: $${formatNumber(totalShared + totalIndividual)}\n\n`;
    
    report += getMainMenu();
    
    return report;
}

function formatMonthlySummary(expenses) {
    // Similar a formatExpensesReport pero con más análisis
    return formatExpensesReport(expenses);
}

module.exports = { handleMessage };