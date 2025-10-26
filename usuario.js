document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    let user;
    let account;

    // Fetch user and account data
    try {
        const userRes = await fetch('http://localhost:8000/auth/me', { headers });
        if (!userRes.ok) throw new Error('Failed to fetch user data');
        user = await userRes.json();
        
        const accountRes = await fetch(`http://localhost:8000/nessie/customers/${user.customer_id}/accounts`, { headers });
        if (!accountRes.ok) throw new Error('Failed to fetch accounts');
        const accounts = await accountRes.json();
        if (accounts.length > 0) {
            account = accounts[0];
            await fetchTransactions();
        } else {
            document.getElementById('transaction-list').innerHTML = '<p>No se encontró una cuenta para este usuario.</p>';
        }

        document.getElementById('welcome-message').textContent = `¡Hola, ${user.first_name}!`;

    } catch (error) {
        console.error('Error fetching initial data:', error);
        localStorage.removeItem('accessToken');
        // window.location.href = 'login.html';
    }

    // Fetch and display transactions
    async function fetchTransactions() {
        if (!account) return;
        try {
            const transRes = await fetch(`http://localhost:8000/nessie/accounts/${account._id}/transfers`, { headers });
            if (!transRes.ok) throw new Error('Failed to fetch transactions');
            const transactions = await transRes.json();
            const transactionList = document.getElementById('transaction-list');
            transactionList.innerHTML = ''; // Clear list
            if (transactions.length > 0) {
                transactions.forEach(t => {
                    const item = document.createElement('div');
                    item.className = 'transaction-item';
                    item.innerHTML = `
                        <span>${new Date(t.transaction_date).toLocaleDateString()}</span>
                        <span>${t.description}</span>
                        <span class="amount ${t.type === 'deposit' ? 'deposit' : 'withdrawal'}">$${t.amount.toFixed(2)}</span>
                    `;
                    transactionList.appendChild(item);
                });
            } else {
                transactionList.innerHTML = '<p>No hay transacciones todavía.</p>';
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
        }
    }

    // Handle new transaction
    const transactionForm = document.getElementById('transaction-form');
    transactionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!account) {
            alert('No hay una cuenta asociada para realizar transacciones.');
            return;
        }
        const description = document.getElementById('trans-description').value;
        const amount = parseFloat(document.getElementById('trans-amount').value);

        try {
            const res = await fetch(`http://localhost:8000/nessie/accounts/${account._id}/transfers`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    medium: 'balance',
                    payee_id: account._id, // Self-transfer for simplicity
                    amount: amount,
                    transaction_date: new Date().toISOString().split('T')[0],
                    description: description
                })
            });
            if (res.ok) {
                transactionForm.reset();
                await fetchTransactions();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (error) {
            console.error('Error creating transaction:', error);
        }
    });

    // Handle Gemini Chat
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        appendMessage(message, 'user');
        chatInput.value = '';

        try {
            const res = await fetch('http://localhost:8000/gemini/chat', {
                method: 'POST',
                headers,
                body: JSON.stringify({ message: message })
            });
            const data = await res.json();
            appendMessage(data.response, 'bot');
        } catch (error) {
            console.error('Error with chat:', error);
            appendMessage('Lo siento, no pude conectar con el asistente.', 'bot');
        }
    });

    function appendMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}`;
        messageElement.textContent = text;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});
