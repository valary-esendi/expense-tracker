// Register form handler (if applicable)
document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullname = document.getElementById('fullname').value;
    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    
    console.log('Form Submitted:', { fullname, email, username, password }); // Debug log
    const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullname, email, username, password }),
    });

    const data = await response.json();
    console.log('Response:', data);
    alert(data.message);
    if (response.ok) {
        window.location.href = 'login.html';  // Redirect to login
    }
    else {
        alert(data.message || "Registration failed");
};

// Login handler (if applicable)
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    console.log('Form Submitted:', {username, password });
    const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    console.log('Response:', data);
    if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId); // Store userId for later use
        window.location.href = 'dashboard.html';  // Redirect to dashboard
    } else {
        alert(data.message);
    }
});

// Handle logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId'); // Clear userId upon logout
    window.location.href = 'login.html';  // Redirect to login
}

// Fetch and display transactions and calculate total expenses
async function fetchTransactions() {
    const token = localStorage.getItem('token');

    const response = await fetch('http://localhost:3001/api/transactions', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
    });

    const transactionsList = document.getElementById('transactions-list');
    const totalExpenseElement = document.getElementById('total-expense-amount'); // Total expenses display
    const categories = [];
    const amounts = [];

    if (response.ok) {
        const { transactions, totalExpenses } = await response.json(); // Destructure response
        transactionsList.innerHTML = '';

        transactions.forEach(transaction => {
            const li = document.createElement('li');
            li.textContent = `${transaction.date}: $${transaction.amount} - ${transaction.description} (${transaction.category})`;
            
            // Create a delete button for each transaction
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteTransaction(transaction.id);
            li.appendChild(deleteButton);
            transactionsList.appendChild(li);
            
            // Populate chart data
            const categoryIndex = categories.indexOf(transaction.category);

            if (categoryIndex >= 0) {
                amounts[categoryIndex] += transaction.amount; // Update existing category
            } else {
                categories.push(transaction.category); // Add new category
                amounts.push(transaction.amount); // Add new amount
            }
        });

        // Display the total expenses on the dashboard
        totalExpenseElement.textContent = `$${totalExpenses.toFixed(2)}`;

        // Update chart data
        updateChart(categories, amounts);
    } else {
        const transactions = await response.json();
        alert(transactions.message);
    }
}

// Function to update the chart
function updateChart(categories, amounts) {
    const ctx = document.getElementById('myChart').getContext('2d');
    const myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Transaction Amounts',
                data: amounts,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Add a transaction
document.getElementById('transaction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const amount = document.getElementById('amount').value;
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;

    const response = await fetch('http://localhost:3001/api/transactions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, description, category }), // Removed userId as it's derived from the token
    });

    const data = await response.json();
    alert(data.message);
    if (response.ok) {
        fetchTransactions();  // Refresh the transaction list
        document.getElementById('transaction-form').reset();  // Clear the form
    }
});

// Call fetchTransactions when the dashboard is loaded
if (window.location.pathname.endsWith('dashboard.html')) {
    fetchTransactions();
}

// Delete a transaction
async function deleteTransaction(id) {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:3001/api/transactions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();
    alert(data.message);
    if (response.ok) {
        fetchTransactions(); // Refresh the transaction list after deletion
    }
}});
