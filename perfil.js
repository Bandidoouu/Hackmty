document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { window.location.href = 'login.html'; return; }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // Inyectar CSS para ocultar/retirar cualquier UI de "activar cuenta"
    const injectHideStyles = () => {
        if (document.getElementById('hide-activation-style')) return;
        const style = document.createElement('style');
        style.id = 'hide-activation-style';
        style.textContent = `
            /* Inglés */
            #activation-prompt, .activation-prompt, .activate-account,
            [data-activation], [id*="activate"], [class*="activate"],
            [data-action="activate-account"], .btn-activate, .btn-activate-account,
            a[href*="activate"], a[href*="activate-account"], button[onclick*="activate"],
            /* Español */
            #activar-cuenta, .activar-cuenta, .activar-cuenta-financiera,
            [id*="activar"], [class*="activar"], [data-action*="activar"],
            a[href*="activar"], button[onclick*="activar"] {
                display: none !important; visibility: hidden !important; pointer-events: none !important;
            }
        `;
        document.head.appendChild(style);
    };
    injectHideStyles();

    // Eliminar cualquier UI de "activar cuenta" y observar DOM por si aparece después
    const removeActivationUI = () => {
        const selectors = [
            // Inglés
            '#activation-prompt', '.activation-prompt', '.activate-account',
            '[data-activation]', '[id*="activate"]', '[class*="activate"]',
            '[data-action="activate-account"]', '.btn-activate', '.btn-activate-account',
            'a[href*="activate"]', 'a[href*="activate-account"]', 'button[onclick*="activate"]',
            // Español
            '#activar-cuenta', '.activar-cuenta', '.activar-cuenta-financiera',
            '[id*="activar"]', '[class*="activar"]', '[data-action*="activar"]',
            'a[href*="activar"]', 'button[onclick*="activar"]'
        ];
        // 1) Por selectores
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                try { el.remove(); } catch { el.style.display = 'none'; el.style.visibility = 'hidden'; }
            });
        });
        // 2) Por texto visible (robusto)
        const phrases = [
            'activar cuenta', 'activar mi cuenta', 'activar tu cuenta', 'activar cuenta financiera',
            'activate account', 'activate my account', 'activate your account', 'activate financial account'
        ];
        const candidates = document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"], .btn, .button');
        candidates.forEach(el => {
            const txt = (el.textContent || el.value || '').trim().toLowerCase();
            if (!txt) return;
            if (phrases.some(p => txt.includes(p))) {
                try { el.remove(); } catch { el.style.display = 'none'; el.style.visibility = 'hidden'; }
            }
        });
    };
    removeActivationUI();
    const mo = new MutationObserver(() => removeActivationUI());
    mo.observe(document.body, { childList: true, subtree: true });

    // Bloquear clics a elementos de activación si alguno escapara
    const preventActivationClicks = (e) => {
        const el = e.target.closest
            ? e.target.closest('a, button, [role="button"], input[type="button"], input[type="submit"]')
            : null;
        if (!el) return;
        const txt = (el.textContent || el.value || '').trim().toLowerCase();
        const hasActAttr =
            (el.id && (/activate|activar/i).test(el.id)) ||
            (el.className && (/activate|activar/i).test(String(el.className))) ||
            (el.getAttribute('data-action') && (/activate|activar/i).test(el.getAttribute('data-action'))) ||
            (el.getAttribute('href') && (/activate|activar/i).test(el.getAttribute('href'))) ||
            (el.getAttribute('onclick') && (/activate|activar/i).test(el.getAttribute('onclick')));
        if (hasActAttr || (txt && (/activar cuenta|activate account|activar mi cuenta|activar cuenta financiera/i).test(txt))) {
            e.preventDefault();
            e.stopPropagation();
            try { el.remove(); } catch { /* ignore */ }
        }
    };
    document.addEventListener('click', preventActivationClicks, true);

    // Avatar flotante (creación/actualización + menú)
    const hideAvatarMenu = () => {
        const menu = document.getElementById('user-avatar-menu');
        if (menu) menu.remove();
    };

    const toggleAvatarMenu = () => {
        const existing = document.getElementById('user-avatar-menu');
        if (existing) { hideAvatarMenu(); return; }
        const menu = document.createElement('div');
        menu.id = 'user-avatar-menu';
        menu.style.cssText = 'position:fixed;top:68px;right:16px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;min-width:180px;box-shadow:0 10px 20px rgba(0,0,0,.12);z-index:1001;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;';
        menu.innerHTML = `
            <div style="padding:12px 14px;border-bottom:1px solid #f3f4f6;">
                <div style="font-weight:700;font-size:14px;">${user?.first_name || ''} ${user?.last_name || ''}</div>
                <div style="font-size:12px;color:#6b7280;">${user?.email || ''}</div>
            </div>
            <button id="menu-open-profile" style="width:100%;text-align:left;background:none;border:none;padding:10px 14px;font-size:14px;cursor:pointer;">Ver perfil</button>
            <button id="menu-logout" style="width:100%;text-align:left;background:none;border:none;padding:10px 14px;font-size:14px;cursor:pointer;">Cerrar sesión</button>
        `;
        document.body.appendChild(menu);
        document.getElementById('menu-open-profile')?.addEventListener('click', () => { window.location.href = 'perfil.html'; });
        document.getElementById('menu-logout')?.addEventListener('click', () => { localStorage.removeItem('accessToken'); window.location.href = 'login.html'; });
    };

    const ensureUserAvatar = (u) => {
        const getInitials = (obj) => {
            const f = (obj?.first_name || '').trim()[0] || '';
            const l = (obj?.last_name || '').trim()[0] || '';
            const base = (f + l) || (obj?.email || '?');
            return base.substring(0, 2).toUpperCase();
        };
        let btn = document.getElementById('user-avatar-floating');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'user-avatar-floating';
            btn.type = 'button';
            btn.setAttribute('aria-label', 'Menú de usuario');
            btn.style.cssText = 'position:fixed;top:16px;right:16px;width:44px;height:44px;border:none;border-radius:9999px;background:#1f2937;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,.15);cursor:pointer;z-index:1000;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;overflow:hidden;';
            document.body.appendChild(btn);
            btn.addEventListener('click', (e) => { e.stopPropagation(); toggleAvatarMenu(); });
            document.addEventListener('click', () => hideAvatarMenu());
            document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') hideAvatarMenu(); });
        }
        const imgUrl = u?.avatar_url || u?.profile_image_url;
        if (imgUrl) {
            btn.style.backgroundImage = `url("${imgUrl}")`;
            btn.style.backgroundSize = 'cover';
            btn.style.backgroundPosition = 'center';
            btn.textContent = '';
        } else {
            btn.style.backgroundImage = '';
            btn.textContent = getInitials(u);
        }
    };

    // Crear el avatar inmediatamente como círculo (evita ver un botón cuadrado al inicio)
    // Refuerzo de forma circular desde el primer render
    ensureUserAvatar({ first_name: '', last_name: '', email: '?' });

    let user, account;

    // Helpers de parseo robusto para respuestas del backend
    const safeJson = async (res) => {
        const text = await res.text();
        try { return { data: text ? JSON.parse(text) : null, text }; }
        catch { return { data: null, text }; }
    };
    const getIdFrom = (obj) => {
        if (!obj) return null;
        // múltiples formas posibles
        return obj._id || obj.id || obj.customer_id || obj.customerId || obj.customer?._id || obj.data?._id || obj.objectCreated?._id || null;
    };
    const idFromLocation = (res) => {
        const loc = res.headers.get('Location') || res.headers.get('location') || '';
        if (!loc) return null;
        const parts = loc.split('/').filter(Boolean);
        return parts[parts.length - 1] || null;
    };

    const getCustomerId = () =>
        (user?.customer_id && String(user.customer_id)) ||
        localStorage.getItem('customerIdOverride') ||
        localStorage.getItem('shadowCustomerId') || null;

    // ===== Shadow (fallback local) =====
    const SHADOW_KEYS = {
        customerId: 'shadowCustomerId',
        account: 'shadowAccount',
        transactions: 'shadowTransactions'
    };
    const isShadowMode = () => !!localStorage.getItem(SHADOW_KEYS.customerId);
    const getShadowAccount = () => {
        const raw = localStorage.getItem(SHADOW_KEYS.account);
        return raw ? JSON.parse(raw) : null;
    };
    const saveShadowAccount = (acc) => {
        localStorage.setItem(SHADOW_KEYS.account, JSON.stringify(acc));
    };
    const ensureShadowAccount = () => {
        // Crea un customer/account local si no existe
        if (!isShadowMode()) {
            const cid = `local-cust-${crypto?.randomUUID?.() || Date.now()}`;
            localStorage.setItem(SHADOW_KEYS.customerId, cid);
        }
        let acc = getShadowAccount();
        if (!acc) {
            acc = {
                _id: `local-acc-${crypto?.randomUUID?.() || Date.now()}`,
                type: 'Checking',
                nickname: 'Cuenta (local)',
                rewards: 0,
                balance: 0
            };
            saveShadowAccount(acc);
        }
        if (!localStorage.getItem(SHADOW_KEYS.transactions)) {
            localStorage.setItem(SHADOW_KEYS.transactions, JSON.stringify([]));
        }
        return acc;
    };
    const getShadowTransactions = () => {
        const raw = localStorage.getItem(SHADOW_KEYS.transactions);
        return raw ? JSON.parse(raw) : [];
    };
    const addShadowTransaction = (t) => {
        const tx = getShadowTransactions();
        tx.unshift(t);
        localStorage.setItem(SHADOW_KEYS.transactions, JSON.stringify(tx));
        // actualizar balance (restar en withdrawal)
        const acc = getShadowAccount();
        const delta = (t.type === 'withdrawal' ? -1 : 1) * Number(t.amount || 0);
        acc.balance = Number(acc.balance || 0) + delta;
        saveShadowAccount(acc);
        return acc.balance;
    };

    // Fallback para publicar transferencias en backend:
    // intenta /transfers y si falla con 404/405 prueba /transactions
    const postTransfer = async (accountId, desc, amount, type) => {
        const today = new Date().toISOString().split('T')[0];
        // Payload típico de transfers
        const transferBody = {
            medium: 'balance',
            payee_id: accountId,
            amount: Math.abs(amount),
            transaction_date: today,
            description: desc
        };
        let res = await fetch(`http://localhost:8000/nessie/accounts/${accountId}/transfers`, {
            method: 'POST', headers, body: JSON.stringify(transferBody)
        });
        if (res.ok) return { ok: true };
        if (res.status !== 404 && res.status !== 405) {
            const { text } = await safeJson(res);
            return { ok: false, status: res.status, text };
        }
        // Payload alterno de transactions (si el backend original lo usa)
        const txBody = {
            type: type, // 'deposit' | 'withdrawal'
            medium: 'balance',
            amount: Math.abs(amount),
            description: desc,
            transaction_date: today
        };
        res = await fetch(`http://localhost:8000/nessie/accounts/${accountId}/transactions`, {
            method: 'POST', headers, body: JSON.stringify(txBody)
        });
        if (res.ok) return { ok: true };
        const { text } = await safeJson(res);
        return { ok: false, status: res.status, text };
    };

    // Enlazar el formulario/botón de transacción de forma robusta
    const wireTransactionForm = () => {
        const bind = () => {
            const form = document.getElementById('transaction-form') || document.querySelector('form#transaction-form, form[data-form="transaction"]');
            if (!form) return false;

            const onSubmit = async (e) => {
                e.preventDefault();

                if (!account) {
                    const ok = await createFinancialAccount();
                    await fetchProfileData();
                    if (!ok || !account) { alert('No se pudo preparar la cuenta.'); return; }
                }

                const descEl = document.getElementById('trans-description') || form.querySelector('#trans-description,[name="description"]');
                const amtEl = document.getElementById('trans-amount') || form.querySelector('#trans-amount,[name="amount"]');
                const typeEl = document.getElementById('trans-type') || form.querySelector('#trans-type,[name="type"]');

                const description = (descEl?.value || '').trim();
                const amountRaw = parseFloat(amtEl?.value || 'NaN');
                if (!description) { alert('Agrega una descripción.'); return; }
                if (!Number.isFinite(amountRaw) || amountRaw === 0) { alert('Ingresa un monto válido.'); return; }

                // Determinar tipo: usa trans-type si existe; si no, infiere con el signo
                const type = (typeEl?.value === 'withdrawal' || typeEl?.value === 'deposit')
                    ? typeEl.value
                    : (amountRaw < 0 ? 'withdrawal' : 'deposit');

                // Shadow/local mode
                if (isShadowMode() || String(account?._id || '').startsWith('local-')) {
                    const t = { transaction_date: new Date().toISOString().split('T')[0], description, type, amount: Math.abs(amountRaw) };
                    const newBalance = addShadowTransaction(t);
                    form.reset();
                    document.getElementById('account-balance').textContent = `$${Number(newBalance).toFixed(2)}`;
                    await fetchTransactions();
                    return;
                }

                // Backend real con fallback de endpoints
                const res = await postTransfer(account._id, description, amountRaw, type);
                if (res.ok) {
                    form.reset();
                    await fetchProfileData();
                } else {
                    console.error('Post transfer failed:', res.status, res.text);
                    alert(`Error al crear la transacción (${res.status || '??'}): ${res.text || 'Revisa el backend.'}`);
                }
            };

            // Evitar múltiples bindings
            if (!form.dataset.wired) {
                form.addEventListener('submit', onSubmit);
                form.dataset.wired = '1';
            }

            // Si el botón no es type="submit", forzar envío
            const addBtn = form.querySelector('#add-transaction, [data-action="add-transaction"], button:not([type]), button[type="button"]');
            if (addBtn && !addBtn.dataset.wired) {
                addBtn.addEventListener('click', (e) => { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); });
                addBtn.dataset.wired = '1';
            }

            return true;
        };

        if (!bind()) {
            // Observar DOM hasta que aparezca el form
            const obs = new MutationObserver(() => { if (bind()) obs.disconnect(); });
            obs.observe(document.body, { childList: true, subtree: true });
        }
    };

    // Crea cliente y cuenta con fallback robusto; retorna true si quedó lista
    const createFinancialAccount = async () => {
        try {
            // Evitar intentar backend si ya estamos en shadow
            if (isShadowMode()) return true;

            // 1) Endpoint combinado (si existe en tu backend)
            let res = await fetch('http://localhost:8000/nessie/create-customer-and-account', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    user_id: user?.id || user?._id || null,
                    email: user?.email || null,
                    first_name: user?.first_name || 'User',
                    last_name: user?.last_name || 'N/A',
                    address: user?.address || {
                        street_number: '1',
                        street_name: 'Default',
                        city: 'Monterrey',
                        state: 'NL',
                        zip: '64000'
                    },
                    account: { type: 'Checking', nickname: 'Cuenta', rewards: 0, balance: 0 }
                })
            });

            if (res.ok) {
                const { data, text } = await safeJson(res);
                let cid = getIdFrom(data) || idFromLocation(res);
                if (!cid) {
                    console.warn('No customer id in combined response. raw:', text);
                } else {
                    localStorage.setItem('customerIdOverride', String(cid));
                    await persistCustomerIdToUser(cid);
                }
                // aunque no haya body, si es 200/201 asumimos éxito
                return true;
            }

            if (res.status !== 404 && res.status !== 405) {
                const { text } = await safeJson(res);
                console.error('Combined endpoint failed:', res.status, text);
                throw new Error(`Fallo endpoint combinado (${res.status})`);
            }

            // 2) Crear customer
            const customerPayload = {
                first_name: user?.first_name || 'User',
                last_name: user?.last_name || 'N/A',
                address: user?.address || {
                    street_number: '1',
                    street_name: 'Default',
                    city: 'Monterrey',
                    state: 'NL',
                    zip: '64000'
                },
                email: user?.email || undefined
            };
            res = await fetch('http://localhost:8000/nessie/customers', {
                method: 'POST',
                headers,
                body: JSON.stringify(customerPayload)
            });
            if (!res.ok) {
                const { text } = await safeJson(res);
                console.error('Create customer failed:', res.status, text);
                throw new Error(`Fallo creando customer (${res.status})`);
            }
            // soporta 201 sin body
            const { data: custData } = await safeJson(res);
            let customerId = getIdFrom(custData) || idFromLocation(res);
            if (!customerId) {
                // Intentar leer el último customer por email si el backend lo permite (fallback)
                try {
                    const q = encodeURIComponent(user?.email || '');
                    const r = await fetch(`http://localhost:8000/nessie/customers/find?email=${q}`, { headers });
                    if (r.ok) {
                        const { data } = await safeJson(r);
                        customerId = getIdFrom(Array.isArray(data) ? data[0] : data);
                    }
                } catch {}
            }
            if (!customerId) throw new Error('Customer creado sin ID.');
            localStorage.setItem('customerIdOverride', String(customerId));
            await persistCustomerIdToUser(customerId);

            // 3) Crear account
            const accountPayload = { type: 'Checking', nickname: 'Cuenta', rewards: 0, balance: 0 };
            res = await fetch(`http://localhost:8000/nessie/customers/${customerId}/accounts`, {
                method: 'POST',
                headers,
                body: JSON.stringify(accountPayload)
            });
            if (!res.ok) {
                const { text } = await safeJson(res);
                console.error('Create account failed:', res.status, text);
                throw new Error(`Fallo creando account (${res.status})`);
            }

            return true;
        } catch (error) {
            console.error('Error creating financial account (frontend):', error);
            // Activa fallback local para no bloquear la UI
            ensureShadowAccount();
            return true;
        }
    };

    const fetchProfileData = async () => {
        try {
            // 1) User
            const userRes = await fetch('http://localhost:8000/auth/me', { headers });
            if (!userRes.ok) throw new Error('Failed to fetch user data');
            user = await userRes.json();

            // Proteger asignaciones si no existen los nodos en el DOM
            const nameEl = document.getElementById('user-name');
            const emailEl = document.getElementById('user-email');
            if (nameEl) nameEl.textContent = `${user.first_name} ${user.last_name}`;
            if (emailEl) emailEl.textContent = user.email;

            // Actualizar avatar con datos reales
            ensureUserAvatar(user);

            // Estado de carga
            const balanceEl = document.getElementById('account-balance');
            if (balanceEl) balanceEl.textContent = 'Cargando…';

            // 2) Customer/Account
            let customerId = getCustomerId();

            // Si ya estamos en modo shadow, solo cargar de localStorage
            if (isShadowMode()) {
                account = ensureShadowAccount();
            } else {
                if (!customerId) {
                    const created = await createFinancialAccount();
                    customerId = getCustomerId();
                    if (!created || !customerId) {
                        // Activar shadow fallback para no bloquear al usuario
                        account = ensureShadowAccount();
                    }
                }
                if (!account && !isShadowMode()) {
                    // Intentar obtener cuentas reales
                    const accountsRes = await fetch(`http://localhost:8000/nessie/customers/${customerId}/accounts`, { headers });
                    if (!accountsRes.ok) {
                        await logHttpError('Fetch accounts', accountsRes);
                        // Fallback local
                        account = ensureShadowAccount();
                    } else {
                        const accounts = await accountsRes.json();
                        if (Array.isArray(accounts) && accounts.length > 0) {
                            account = accounts[0];
                        } else {
                            // Crear en backend; si no, shadow
                            const created = await createFinancialAccount();
                            if (!created) account = ensureShadowAccount();
                            else {
                                const recheck = await fetch(`http://localhost:8000/nessie/customers/${getCustomerId()}/accounts`, { headers });
                                if (recheck.ok) {
                                    const accs2 = await recheck.json();
                                    account = accs2?.[0] || ensureShadowAccount();
                                } else {
                                    await logHttpError('Recheck accounts', recheck);
                                    account = ensureShadowAccount();
                                }
                            }
                        }
                    }
                }
            }

            // Pintar balance desde la fuente actual (shadow o backend)
            const currentBalance = isShadowMode()
                ? Number(getShadowAccount()?.balance || 0)
                : Number(account?.balance || 0);
            document.getElementById('account-balance').textContent = `$${currentBalance.toFixed(2)}`;

            // 3) Transacciones
            await fetchTransactions();

        } catch (error) {
            console.error('Error loading profile data:', error);
            const tbody = document.getElementById('transactions-tbody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="color: red;">${error.message}</td></tr>`;
            const balanceEl = document.getElementById('account-balance');
            if (balanceEl) balanceEl.textContent = 'N/A';
        }
    };

    // Helper: tbody de transacciones robusto (id o fallback)
    const getTransactionsTbody = () =>
        document.getElementById('transactions-tbody') ||
        document.querySelector('#transactions-table tbody, [data-transactions-tbody]');

    const fetchTransactions = async () => {
        if (!account) return;
        try {
            const tbody = getTransactionsTbody();
            if (!tbody) return;
            tbody.innerHTML = '';

            if (isShadowMode() || String(account?._id || '').startsWith('local-')) {
                const transactions = getShadowTransactions();
                if (transactions.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4">No hay transacciones para mostrar.</td></tr>';
                    return;
                }
                transactions.forEach(t => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${new Date(t.transaction_date).toLocaleDateString()}</td>
                        <td>${t.description}</td>
                        <td class="transaction-type ${t.type}">${t.type}</td>
                        <td class="transaction-amount ${t.type === 'deposit' ? 'deposit' : 'withdrawal'}">$${Number(t.amount).toFixed(2)}</td>
                    `;
                    tbody.appendChild(row);
                });
                return;
            }

            // Backend real
            const transRes = await fetch(`http://localhost:8000/nessie/accounts/${account._id}/transfers`, { headers });
            if (!transRes.ok) throw new Error('Failed to fetch transactions');
            const transactions = await transRes.json();

            tbody.innerHTML = '';
            if (transactions.length > 0) {
                transactions.forEach(t => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${new Date(t.transaction_date).toLocaleDateString()}</td>
                        <td>${t.description}</td>
                        <td class="transaction-type ${t.type}">${t.type}</td>
                        <td class="transaction-amount ${t.type === 'deposit' ? 'deposit' : 'withdrawal'}">$${t.amount.toFixed(2)}</td>
                    `;
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="4">No hay transacciones para mostrar.</td></tr>';
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    };

    // Handle new transaction form submission
    // REEMPLAZADO: se elimina el binding directo para evitar fallos cuando no existe #transaction-form.
    // Usamos wireTransactionForm() (ya definido en el archivo) que enlaza de forma robusta incluso si
    // el botón no es type="submit" o el form aparece tarde.
    // -- binding directo eliminado --

    // Carga inicial + wiring del formulario
    wireTransactionForm();
    fetchProfileData();
});
