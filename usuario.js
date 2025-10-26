document.addEventListener('DOMContentLoaded', async () => {
    // Single entry point for the advisor UI (no chatbot)
    const token = localStorage.getItem('accessToken');
    if (!token) {
        // show a visible message and redirect shortly so the user understands why nothing loads
        // (advisor-status element is added to the page by usuario.html)
        try { setTimeout(() => { window.location.href = 'login.html'; }, 1200); } catch (e) { /* ignore */ }
        // If the DOM is available, show a message; otherwise the redirect will occur.
        document.addEventListener('DOMContentLoaded', () => {
            const el = document.getElementById('advisor-status');
            if (el) {
                el.style.display = 'block';
                el.style.color = '#b03a2e';
                el.textContent = 'No has iniciado sesión: redirigiendo a la página de login...';
            }
        });
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

    // helper to show status to the user in-page (visible box)
    function setStatus(message, color = '#333') {
        try {
            const el = document.getElementById('advisor-status');
            if (el) {
                el.style.display = 'block';
                el.style.color = color;
                el.textContent = message;
                return;
            }
            // fallback: surface the message in debug data and console so user can still see it
            console.warn('advisor-status element not found, falling back to debug panel. Message:', message);
            debugData.statusMessage = message;
            debugData.statusColor = color;
            try { renderDebug(); } catch (e) { /* ignore */ }
        } catch (e) {
            console.warn('Could not set status element', e);
            try { debugData.statusMessage = String(message); renderDebug(); } catch (err) { /* ignore */ }
        }
    }

    // debug container to store and show raw responses for diagnosis
    const debugData = { token, user: null, accounts: null, transactions: null, advise: null };

    function renderDebug() {
        try {
            const out = document.getElementById('debug-output');
            if (!out) return;
            out.textContent = JSON.stringify(debugData, null, 2);
        } catch (e) { console.warn('renderDebug failed', e); }
    }

    // toggle debug panel button (if present)
    try {
        const btn = document.getElementById('toggle-debug');
        if (btn) btn.addEventListener('click', () => {
            const panel = document.getElementById('debug-panel');
            if (!panel) return;
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            // refresh content when shown
            if (panel.style.display === 'block') renderDebug();
        });
    } catch (e) { /* ignore */ }

    // bootstrap button to create demo Nessie customer/account/transactions
    try {
        const boot = document.getElementById('bootstrap-nessie');
        if (boot) boot.addEventListener('click', async () => {
            console.log('bootstrap button clicked');
            debugData.last_action = 'bootstrap-click';
            renderDebug();
            setStatus('Creando datos demo en el backend...', '#0c5460');
            boot.disabled = true;
            try {
                const r = await fetch('http://localhost:8000/auth/nessie/bootstrap', { method: 'POST', headers });
                if (r.ok) {
                    const j = await r.json();
                    debugData.bootstrap = j;
                    debugData.last_action = 'bootstrap-ok';
                    renderDebug();
                    setStatus('Datos demo creados. Refrescando...', '#0c5460');
                    await loadFinancialData();
                } else {
                    setStatus('No se pudo crear datos demo: ' + r.status, '#a67c00');
                    debugData.bootstrap = { error: true, status: r.status };
                    debugData.last_action = 'bootstrap-failed-status';
                    renderDebug();
                }
            } catch (err) {
                console.error('bootstrap error', err);
                setStatus('Error creando datos demo: ' + (err && err.message), '#b03a2e');
                debugData.bootstrap = { error: true, message: err && err.message };
                debugData.last_action = 'bootstrap-exception';
                renderDebug();
            } finally {
                boot.disabled = false;
            }
        });
    } catch (e) { /* ignore */ }

    async function fetchUser() {
        try {
            const res = await fetch('http://localhost:8000/auth/me', { headers });
            if (!res.ok) throw new Error('no-user');
            return await res.json();
        } catch (err) {
            console.warn('Could not fetch user; using fallback user', err);
            return { first_name: 'Usuario', customer_id: undefined };
        }
    }

    async function fetchAccounts(customerId) {
        if (!customerId) throw new Error('No customer ID available');
        try {
            const res = await fetch(`http://localhost:8000/nessie/customers/${customerId}/accounts`, { headers });
            if (!res.ok) throw new Error(`Account fetch failed: ${res.status}`);
            const accounts = await res.json();
            if (!accounts || !accounts.length) {
                throw new Error('No accounts found');
            }
            debugData.accounts = accounts;
            renderDebug();
            return accounts;
        } catch (err) {
            console.error('Could not fetch accounts:', err);
            setStatus('Error al obtener cuentas: ' + err.message, '#b03a2e');
            throw err;
        }
    }

    async function processTransactions(transactions) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        let balance = 0;
        let monthlyIncome = 0;
        let monthlyExpenses = 0;
        const processedTx = [];

        transactions.forEach(tx => {
            const amount = Number(tx.amount) || 0;
            const txDate = new Date(tx.transaction_date || tx.created_at || tx.date || now);
            const isWithdrawal = tx.type?.toLowerCase() === 'withdrawal';

            // Update balance (withdrawals are negative)
            const adjustedAmount = isWithdrawal ? -amount : amount;
            balance += adjustedAmount;

            // Track monthly totals for recent transactions
            if (txDate >= thirtyDaysAgo) {
                if (isWithdrawal) {
                    monthlyExpenses += amount;
                } else {
                    monthlyIncome += amount;
                }
            }

            processedTx.push({
                amount: adjustedAmount,
                description: tx.description || '',
                date: txDate,
                type: tx.type || ''
            });
        });

        return {
            balance,
            monthlyIncome,
            monthlyExpenses,
            transactions: processedTx
        };
    }

    async function loadFinancialData() {
        let data = {};
        let transactions = [];
        setStatus('Cargando datos del usuario...', '#0c5460');
        debugData.user = await fetchUser();
        try {
            const welcomeEl = document.getElementById('welcome-message');
            if (welcomeEl) {
                welcomeEl.textContent = `¡Hola, ${debugData.user.first_name || 'Usuario'}!`;
            }
            debugData.welcome_message = `¡Hola, ${debugData.user.first_name || 'Usuario'}!`;
            renderDebug();
        } catch (e) {
            debugData.welcome_error = String(e);
            renderDebug();
        }

        async function processTransactions(transactions) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        let balance = 0;
        let monthlyIncome = 0;
        let monthlyExpenses = 0;
        const processedTx = [];

        transactions.forEach(tx => {
            const amount = Number(tx.amount) || 0;
            const txDate = new Date(tx.transaction_date || tx.created_at || tx.date || now);
            const isWithdrawal = tx.type?.toLowerCase() === 'withdrawal';

            // Update balance (withdrawals are negative)
            const adjustedAmount = isWithdrawal ? -amount : amount;
            balance += adjustedAmount;

            // Track monthly totals for recent transactions
            if (txDate >= thirtyDaysAgo) {
                if (isWithdrawal) {
                    monthlyExpenses += amount;
                } else {
                    monthlyIncome += amount;
                }
            }

            processedTx.push({
                amount: adjustedAmount,
                description: tx.description || '',
                date: txDate,
                type: tx.type || ''
            });
        });

        return {
            balance,
            monthlyIncome,
            monthlyExpenses,
            transactions: processedTx
        };
    }

    try {
        setStatus('Obteniendo transacciones desde el backend...', '#0c5460');
        // Get transactions and calculate totals
        const response = await fetch('http://localhost:8000/nessie/transactions', { headers });
        if (!response.ok) throw new Error('Failed to fetch transactions');
        const result = await response.json();
        transactions = result.transactions || [];
        debugData.transactions_raw = transactions;
        // Calculate balance and monthly totals from transactions
        // Obtener balance real del backend
        data.monthlyIncome = 0;
        data.monthlyExpenses = 0;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        transactions.forEach(tx => {
            const txAmount = Math.abs(Number(tx.amount) || 0);
            const txType = (tx.type || '').toLowerCase();
            const txDate = new Date(tx.transaction_date || tx.created_at || tx.date);
            // Ingresos y egresos del mes
            if (txDate >= thirtyDaysAgo) {
                if (txType === 'deposit') {
                    data.monthlyIncome += txAmount;
                } else if (txType === 'withdrawal') {
                    data.monthlyExpenses += txAmount;
                }
            }
        });
        // Obtener balance real del backend
        try {
            const balRes = await fetch('http://localhost:8000/nessie/balance', { headers });
            if (balRes.ok) {
                const balData = await balRes.json();
                data.balance = balData.balance;
                // Unificar saldo en perfil si existe el elemento
                const perfilBalance = document.getElementById('perfil-balance');
                if (perfilBalance) {
                    perfilBalance.textContent = formatCurrency(balData.balance);
                }
            } else {
                data.balance = 0;
            }
        } catch (e) {
            data.balance = 0;
        }
        debugData.computed = {
            balance: data.balance,
            monthlyIncome: data.monthlyIncome,
            monthlyExpenses: data.monthlyExpenses
        };
        renderDebug();
    } catch (err) {
        console.warn('Error fetching backend nessie data:', err);
        debugData.transactions = { error: true, message: err && err.message };
        debugData.balance = { error: true, message: err && err.message };
        renderDebug();
        setStatus('Error al obtener datos de Nessie: usando datos de ejemplo.', '#a67c00');
    }

        // compute monthly income/expenses from transactions if possible
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        let monthlyIncome = 0;
        let monthlyExpenses = 0;
        const txForAnalysis = [];

        transactions.forEach(t => {
            // Normalize transaction date and amount
            const dateStr = t.transaction_date || t.created_at || t.createdAt || t.date;
            const txDate = dateStr ? new Date(dateStr) : null;
            let amount = Number(t.amount) || 0;
            if (!txDate || txDate < thirtyDaysAgo) return;
            
            // Properly handle transaction types and signs
            const isWithdrawal = t.type?.toLowerCase() === 'withdrawal';
            const isDeposit = t.type?.toLowerCase() === 'deposit';
            
            // For withdrawals: make amount negative if it isn't already
            if (isWithdrawal) {
                amount = -Math.abs(amount);
            } else if (isDeposit) {
                amount = Math.abs(amount);
            }
            
            txForAnalysis.push({ 
                amount,
                description: (t.description || t.payee || ''),
                date: txDate,
                type: t.type || ''
            });
            
            if (amount > 0) {
                monthlyIncome += amount;
            } else {
                monthlyExpenses += Math.abs(amount);
            }
        });

        // Only use fallback if we have no transactions
        if (txForAnalysis.length === 0) {
            data.monthlyIncome = sampleData.monthlyIncome;
            data.monthlyExpenses = sampleData.monthlyExpenses;
        } else {
            data.monthlyIncome = monthlyIncome;
            data.monthlyExpenses = monthlyExpenses;
        }
    data.transactions = txForAnalysis;
    // expose simplified transactions to debug
    debugData.transactions = txForAnalysis;
    renderDebug();

    // Populate UI
    setStatus('Analizando gastos hormiga...', '#0c5460');
        // Usar el endpoint /nessie/balance para mostrar el saldo real
        let realBalance = 0;
        try {
            const balRes = await fetch('http://localhost:8000/nessie/balance', { headers });
            if (balRes.ok) {
                const balData = await balRes.json();
                realBalance = balData.balance;
            }
        } catch (e) {
            realBalance = 0;
        }
        document.querySelectorAll('.saldo-actual').forEach(el => {
            el.textContent = formatCurrency(realBalance);
        });
        document.getElementById('monthly-income').textContent = formatCurrency(data.monthlyIncome);
        document.getElementById('monthly-expenses').textContent = formatCurrency(data.monthlyExpenses);

        // classify transactions into categories for 'gastos hormiga'
        const categories = {
            'Café y bebidas': ['cafe','coffee','starbucks','cafeteria','espresso','latte'],
            'Comida para llevar': ['uber eats','ubereats','domicilio','delivery','pizza','taqueria','comida','restaurante','domino'],
            'Suscripciones': ['netflix','spotify','hulu','suscripcion','subscription','prime','amazon prime','apple music','youtube premium'],
            'Transporte': ['uber','taxi','cab','lyft','metro','bus','transporte'],
            'Supermercado': ['walmart','soriana','super','supermercado','mercado','bodega','chedraui'],
            'Compras impulsivas': ['mercadolibre','liverpool','compra','shopping','tienda']
        };

        const catTotals = {};
        // initialize categories
        Object.keys(categories).forEach(k => catTotals[k] = { total: 0, count: 0 });
        catTotals['Otros'] = { total: 0, count: 0 };

        data.transactions.forEach(tx => {
            const desc = (tx.description || '').toLowerCase();
            const amt = Math.abs(Number(tx.amount) || 0);
            let matched = false;
            for (const [cat, keys] of Object.entries(categories)) {
                for (const key of keys) {
                    if (desc.includes(key)) {
                        catTotals[cat].total += amt;
                        catTotals[cat].count += 1;
                        matched = true;
                        break;
                    }
                }
                if (matched) break;
            }
            if (!matched) {
                catTotals['Otros'].total += amt;
                catTotals['Otros'].count += 1;
            }
        });

        // select top 'hormiga' categories: frequent and relatively small average
        const catArray = Object.entries(catTotals).map(([k,v]) => ({ category: k, total: v.total, count: v.count, avg: v.count? v.total / v.count : 0 }));
        const hormigaCandidates = catArray
            .filter(c => c.count > 0)
            .sort((a,b) => b.count - a.count)
            .filter(c => c.avg < Math.max(800, data.monthlyExpenses * 0.1))
            .slice(0,4);

        const antExpensesList = document.getElementById('ant-expenses');
        if (hormigaCandidates.length > 0) {
            antExpensesList.innerHTML = hormigaCandidates.map(item => `
                <li style="margin-bottom: 0.5rem; padding: 0.5rem; background: white; border-radius: 4px; display:flex; justify-content: space-between;">
                    <span><strong>${item.category}</strong><br><small style=\"color:#666;\">${item.count} veces este mes • promedio ${formatCurrency(item.avg)}</small></span>
                    <span style=\"color:#856404; font-weight:700;\">${formatCurrency(item.total)}</span>
                </li>
            `).join('');
        } else {
            // fallback heuristic similar to before
            const heuristic = [
                { category: 'Café y bebidas', amount: Math.round(data.monthlyExpenses * 0.05), frequency: 'varias veces al mes' },
                { category: 'Comida para llevar', amount: Math.round(data.monthlyExpenses * 0.08), frequency: 'varias veces al mes' },
                { category: 'Suscripciones', amount: Math.round(data.monthlyExpenses * 0.03), frequency: 'mensual' },
                { category: 'Compras impulsivas', amount: Math.round(data.monthlyExpenses * 0.06), frequency: 'promedio mensual' }
            ];
            antExpensesList.innerHTML = heuristic.map(expense => `
                <li style="margin-bottom: 0.5rem; padding: 0.5rem; background: white; border-radius: 4px; display:flex; justify-content: space-between;">
                    <span><strong>${expense.category}</strong><br><small style=\"color:#666;\">${expense.frequency}</small></span>
                    <span style=\"color:#856404; font-weight:700;\">${formatCurrency(expense.amount)}</span>
                </li>
            `).join('');
        }

        // potential savings: assume user could cut 50% of these small frequent expenses
    const potentialSavings = (hormigaCandidates.length > 0 ? hormigaCandidates.reduce((s,i) => s + i.total, 0) : 0) || Math.round(data.monthlyExpenses * 0.05);
    document.getElementById('potential-savings').textContent = formatCurrency(Math.round(potentialSavings * 0.5));

    // Now try to get recommendations from backend/gemini
    setStatus('Gastos analizados. Solicitando recomendaciones al servidor...', '#0c5460');
        const currentSavings = data.balance;
        const investmentOptions = document.getElementById('investment-options');
        try {
            // Ensure we have the investment-options element
            if (!investmentOptions) {
                console.error('investment-options element not found');
                setStatus('Error al mostrar recomendaciones: elemento no encontrado', '#b03a2e');
                return;
            }

            const res = await fetch('http://localhost:8000/gemini/advise', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    total_usd: Math.max(0, currentSavings || 0), // Ensure non-negative
                    monthly_income: Math.max(0, data.monthlyIncome || 0),
                    monthly_expenses: Math.max(0, data.monthlyExpenses || 0),
                    transactions: data.transactions && data.transactions.length ? 
                        data.transactions.map(t => ({
                            ...t,
                            amount: Number(t.amount) || 0,
                            type: t.type || 'unknown'
                        })).slice(0,50) : null,
                    risk_profile: 'moderado'
                })
            });
            if (res.ok) {
                setStatus('Recomendaciones recibidas del servidor.', '#0c5460');
                const advise = await res.json();
                debugData.advise = advise;
                renderDebug();

                // Get investment options element
                const investmentOptions = document.getElementById('investment-options');
                if (!investmentOptions) {
                    console.error('investment-options element not found');
                    debugData.advise_error = 'investment-options element not found';
                    renderDebug();
                    return;
                }

                // Display Gemini's text response first if available
                if (advise.narrative) {
                    investmentOptions.innerHTML = `
                        <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 1rem;">
                            <p style="white-space: pre-wrap; margin: 0;">${advise.narrative}</p>
                        </div>
                    `;
                }

                // Then display specific recommendations if available
                // Handle Gemini's narrative response
                if (advise.narrative) {
                    investmentOptions.innerHTML = `
                        <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 1rem;">
                            <p style="white-space: pre-wrap; color: #2c3e50; margin: 0;">${advise.narrative}</p>
                        </div>
                    `;
                    return;
                }
                
                // Handle structured recommendations
                if (Array.isArray(advise.recommendations) && advise.recommendations.length > 0) {
                    investmentOptions.innerHTML = `
                        <div style="display: grid; grid-template-columns: 1fr; gap: 1rem;">
                            ${advise.recommendations.map(r => `
                                <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    <h4 style="color:#0c5460; margin-bottom:0.5rem;">${r.title || r.name || 'Recomendación'}</h4>
                                    <p style="color: #2c3e50;">${r.summary || r.description || ''}</p>
                                    ${r.suggested_amount ? `
                                        <p style="margin-top: 0.5rem;">
                                            <strong style="color: #0c5460;">Propuesta:</strong> 
                                            <span style="color: #2c3e50; font-weight: 600;">${formatCurrency(r.suggested_amount)}</span>
                                        </p>` : ''}
                                    ${r.risk ? `
                                        <p style="margin-top: 0.5rem;">
                                            <strong style="color: #0c5460;">Riesgo:</strong> 
                                            <span style="color: #2c3e50;">${r.risk}</span>
                                        </p>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `;
                } else if (advise.text) {
                    investmentOptions.innerHTML = `
                        <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <p style="white-space:pre-wrap; color: #2c3e50;">${advise.text}</p>
                        </div>
                    `;
                } else if (advise.error || !advise.recommendations) {
                    investmentOptions.innerHTML = `
                        <div style="background: #fff3cd; color: #856404; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                            <p>No se pudieron cargar las recomendaciones específicas. Se muestran sugerencias generales.</p>
                        </div>
                    `;
                    throw new Error('invalid-advise-format');
                }
            } else {
                throw new Error('advise-failed');
            }
        } catch (err) {
            console.warn('Gemini advise failed, showing local fallback', err);
            debugData.advise = { error: 'advise-failed', message: err && err.message };
            renderDebug();
            setStatus('No se pudieron obtener recomendaciones del servidor. Mostrando sugerencias locales.', '#a67c00');
            investmentOptions.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                    <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h4 style="color: #0c5460; margin-bottom: 0.5rem;">Reserva líquida (CETES / Cuenta Ahorro)</h4>
                        <p>Propósito: Fondo de emergencia (corto plazo)</p>
                        <p>Propuesta: ${formatCurrency(Math.round(currentSavings * 0.2))}</p>
                        <p>Riesgo: Bajo • Liquidez: Alta</p>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h4 style="color: #0c5460; margin-bottom: 0.5rem;">Fondo balanceado</h4>
                        <p>Propósito: Crecimiento con protección</p>
                        <p>Propuesta: ${formatCurrency(Math.round(currentSavings * 0.5))}</p>
                        <p>Riesgo: Moderado • Plazo sugerido: 3-5 años</p>
                    </div>
                    <div style="background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h4 style="color: #0c5460; margin-bottom: 0.5rem;">Cartera de crecimiento (acciones)</h4>
                        <p>Propósito: Alto rendimiento (largo plazo)</p>
                        <p>Propuesta: ${formatCurrency(Math.round(currentSavings * 0.3))}</p>
                        <p>Riesgo: Alto • Plazo sugerido: 5+ años</p>
                    </div>
                </div>
                <p style="margin-top: 1rem; font-style: italic; color: #0c5460;">
                    Basado en un saldo aproximado de ${formatCurrency(currentSavings)} y perfil moderado. Estas no son recomendaciones legales; son sugerencias educativas.
                </p>
            `;
        }
    }

    // Add reload button functionality
    try {
        const reloadBtn = document.getElementById('reload-data');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                setStatus('Recargando datos...', '#0c5460');
                loadFinancialData();
            });
        }
    } catch (e) { /* ignore */ }

    // Load on start
    loadFinancialData();

    // Set up periodic refresh every 30 seconds
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadFinancialData();
        }
    }, 30000);
});
