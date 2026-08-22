const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
const defaultProfile = { goal: 1500, salary: 2500, transactions: [] };

const getCurrentAccount = async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session ? {
    id: session.user.id,
    username: session.user.user_metadata.username || session.user.email
  } : null;
};

const getCurrentProfile = async () => {
  const account = await getCurrentAccount();
  if (!account) return defaultProfile;

  const [{ data: profile }, { data: transactions }] = await Promise.all([
    supabaseClient.from('profiles').select('goal, salary').eq('id', account.id).single(),
    supabaseClient.from('transactions').select('id, type, source, name, category, amount, date').eq('user_id', account.id).order('date', { ascending: false })
  ]);

  return {
    goal: Number(profile?.goal) || defaultProfile.goal,
    salary: Number(profile?.salary) || defaultProfile.salary,
    transactions: Array.isArray(transactions) ? transactions : []
  };
};

const saveState = async (transactions, goalValue, monthlySalary) => {
  const account = await getCurrentAccount();
  if (!account) return;

  await supabaseClient.from('profiles').upsert({
    id: account.id,
    username: account.username,
    goal: goalValue,
    salary: monthlySalary
  });

  await supabaseClient.from('transactions').delete().eq('user_id', account.id);
  if (transactions.length) {
    await supabaseClient.from('transactions').insert(
      transactions.map(({ id, ...transaction }) => ({ ...transaction, user_id: account.id }))
    );
  }
};

const ensureActiveAccount = async () => {
  const isAuthPage = window.location.pathname.includes('/accounts/');
  const account = await getCurrentAccount();

  if (!isAuthPage && !account) {
    window.location.href = 'accounts/account.html';
    return false;
  }

  return true;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(value);

const getExpenseTotal = (transactions) =>
  transactions
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount), 0);

const getSavingsTotal = (transactions) =>
  transactions
    .filter((item) => item.type === 'saving')
    .reduce((sum, item) => sum + Number(item.amount), 0);

const getSalarySavingsTotal = (transactions) =>
  transactions
    .filter((item) => item.type === 'saving' && item.source === 'salary')
    .reduce((sum, item) => sum + Number(item.amount), 0);

const getSourceLabel = (source) => source === 'salary' ? 'Sueldo mensual' : 'Otro ingreso';

const initIndexPage = async () => {
  const transactionForm = document.getElementById('transactionForm');
  const typeSelect = document.getElementById('type');
  const sourceSelect = document.getElementById('source');
  const sourceLabel = document.getElementById('sourceLabel');
  const nameInput = document.getElementById('name');
  const categoryInput = document.getElementById('category');
  const amountInput = document.getElementById('amount');
  const dateInput = document.getElementById('date');
  const salaryInput = document.getElementById('salaryInput');

  const profile = await getCurrentProfile();
  let goalValue = profile.goal;
  let monthlySalary = profile.salary;
  let transactions = profile.transactions;

  const renderList = (type, listEl, counterEl) => {
    const items = transactions.filter((item) => item.type === type);
    counterEl.textContent = items.length;

    listEl.innerHTML = items.length
      ? items
          .map((item) => {
            const amount = Number(item.amount);
            const isNegative = amount < 0;
            const sign = type === 'expense' || isNegative ? '-' : '+';
            const formattedAmount = formatCurrency(Math.abs(amount));
            const amountClass = type === 'expense' || isNegative ? 'expense' : 'saving';

            return `
              <li class="transaction-item ${type}">
                <div>
                  <strong>${item.name}</strong>
                  <small>${item.category || 'Sin categoría'} · ${item.date} · ${getSourceLabel(item.source)}</small>
                </div>
                <div class="item-meta">
                  <span class="amount ${amountClass}">${sign}${formattedAmount}</span>
                  <button class="delete-btn" type="button" data-id="${item.id}">Eliminar</button>
                </div>
              </li>
            `;
          })
          .join('')
      : `<li class="empty-state">No hay ${type === 'expense' ? 'gastos' : 'ahorros'} registrados.</li>`;
  };

  const renderSummary = () => {
    const totalExpenses = getExpenseTotal(transactions);
    const totalSavings = getSavingsTotal(transactions);
    const salarySavings = getSalarySavingsTotal(transactions);
    const availableBalance = monthlySalary - totalExpenses - salarySavings;

    document.getElementById('monthlyIncome').textContent = formatCurrency(monthlySalary);
    document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('totalSavings').textContent = formatCurrency(totalSavings);
    document.getElementById('availableBalance').textContent = formatCurrency(availableBalance);

    const progress = goalValue > 0 ? Math.min((totalSavings / goalValue) * 100, 100) : 0;
    const progressBar = document.getElementById('goalProgressBar');
    const goalStatus = document.getElementById('goalStatus');
    const goalMessage = document.getElementById('goalMessage');

    progressBar.style.width = `${progress}%`;
    goalStatus.textContent = `${Math.round(progress)}%`;

    if (totalSavings < 0) {
      goalMessage.textContent = `Has usado ${formatCurrency(Math.abs(totalSavings))} de tus ahorros.`;
    } else if (totalSavings >= goalValue) {
      goalMessage.textContent = `¡Meta cumplida! Ya ahorraste ${formatCurrency(totalSavings)}.`;
    } else {
      goalMessage.textContent = `Te falta ${formatCurrency(goalValue - totalSavings)} para alcanzar tu meta.`;
    }

    salaryInput.value = monthlySalary;
  };

  const toggleSourceField = () => {
    const isSaving = typeSelect.value === 'saving';
    sourceLabel.textContent = isSaving ? 'Origen del ahorro' : 'Origen del gasto';
  };

  const render = () => {
    renderSummary();
    renderList('expense', document.getElementById('expenseList'), document.getElementById('expenseCount'));
    renderList('saving', document.getElementById('savingList'), document.getElementById('savingCount'));
  };

  typeSelect.addEventListener('change', toggleSourceField);

  transactionForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const type = typeSelect.value;
    const source = sourceSelect.value;
    const name = nameInput.value.trim();
    const category = categoryInput.value.trim();
    const amount = Number(amountInput.value);
    const date = dateInput.value || new Date().toISOString().slice(0, 10);

    if (!name || !amount || amount <= 0) {
      return;
    }

    transactions.unshift({
      id: Date.now(),
      type,
      source,
      name,
      category,
      amount,
      date
    });

    saveState(transactions, goalValue, monthlySalary);
    transactionForm.reset();
    dateInput.value = new Date().toISOString().slice(0, 10);
    typeSelect.value = 'expense';
    sourceSelect.value = 'salary';
    render();
  });

  document.getElementById('updateSalaryBtn').addEventListener('click', () => {
    const value = Number(salaryInput.value);

    if (value >= 0) {
      monthlySalary = value;
      saveState(transactions, goalValue, monthlySalary);
      render();
    }
  });

  document.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('.delete-btn');
    if (!deleteButton) return;

    const itemId = Number(deleteButton.dataset.id);
    transactions = transactions.filter((item) => item.id !== itemId);
    saveState(transactions, goalValue, monthlySalary);
    render();
  });

  dateInput.value = new Date().toISOString().slice(0, 10);
  toggleSourceField();
  render();
};

const initSavingsPage = async () => {
  const savingForm = document.getElementById('savingForm');
  const savingGoalInput = document.getElementById('savingGoalInput');
  const savingNameInput = document.getElementById('savingName');
  const savingCategoryInput = document.getElementById('savingCategory');
  const savingAmountInput = document.getElementById('savingAmount');
  const savingDateInput = document.getElementById('savingDate');

  const profile = await getCurrentProfile();
  let transactions = profile.transactions;
  let goalValue = profile.goal;
  let monthlySalary = profile.salary;

  const renderSavings = () => {
    const savings = transactions.filter((item) => item.type === 'saving');
    const totalSavings = savings.reduce((sum, item) => sum + Number(item.amount), 0);
    const remainingGoal = goalValue - totalSavings;

    document.getElementById('monthlyIncome').textContent = formatCurrency(monthlySalary);
    document.getElementById('totalSavings').textContent = formatCurrency(totalSavings);
    document.getElementById('savingGoalValue').textContent = formatCurrency(goalValue);
    document.getElementById('remainingGoal').textContent = formatCurrency(Math.max(remainingGoal, 0));
    document.getElementById('savingCount').textContent = savings.length;
    savingGoalInput.value = goalValue;

    const list = document.getElementById('savingList');
    list.innerHTML = savings.length
      ? savings
          .map(
            (item) => `
              <li class="transaction-item saving">
                <div>
                  <strong>${item.name}</strong>
                  <small>${item.category || 'Sin categoría'} · ${item.date}</small>
                </div>
                <div class="item-meta">
                  <span class="amount ${item.amount >= 0 ? 'saving' : 'expense'}">${item.amount >= 0 ? '+' : '-'}${formatCurrency(Math.abs(item.amount))}</span>
                  <button class="delete-btn" type="button" data-id="${item.id}">Eliminar</button>
                </div>
              </li>
            `
          )
          .join('')
      : '<li class="empty-state">No hay ahorros registrados.</li>';
  };

  document.getElementById('updateGoalBtn').addEventListener('click', () => {
    const value = Number(savingGoalInput.value);

    if (value >= 0) {
      goalValue = value;
      saveState(transactions, goalValue, monthlySalary);
      renderSavings();
    }
  });

  savingForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = savingNameInput.value.trim();
    const category = savingCategoryInput.value.trim();
    const amount = Number(savingAmountInput.value);
    const date = savingDateInput.value || new Date().toISOString().slice(0, 10);

    if (!name || !amount || amount <= 0) {
      return;
    }

    transactions.unshift({
      id: Date.now(),
      type: 'saving',
      source: 'use',
      name,
      category,
      amount: -amount,
      date
    });

    saveState(transactions, goalValue, monthlySalary);
    savingForm.reset();
    savingDateInput.value = new Date().toISOString().slice(0, 10);
    renderSavings();
  });

  document.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('.delete-btn');
    if (!deleteButton) return;

    const itemId = Number(deleteButton.dataset.id);
    transactions = transactions.filter((item) => item.id !== itemId);
    saveState(transactions, goalValue, monthlySalary);
    renderSavings();
  });

  savingDateInput.value = new Date().toISOString().slice(0, 10);
  renderSavings();
};

const initSessionPage = async () => {
  const currentUser = await getCurrentAccount();
  if (!currentUser) {
    return;
  }

  const profile = await getCurrentProfile();
  const monthGroups = new Map();

  const addToMonth = (date, item) => {
    const key = new Date(date).toISOString().slice(0, 7);
    if (!monthGroups.has(key)) {
      monthGroups.set(key, { label: new Date(date).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }), expenses: 0, savings: 0, entries: [] });
    }

    const group = monthGroups.get(key);
    const amount = Number(item.amount);

    if (item.type === 'expense') {
      group.expenses += amount;
    }

    if (item.type === 'saving') {
      group.savings += amount;
    }

    group.entries.push(item);
  };

  profile.transactions.forEach((item) => {
    if (item.date) {
      addToMonth(item.date, item);
    }
  });

  const userName = document.getElementById('sessionUser');
  const totalExpenses = document.getElementById('sessionTotalExpenses');
  const totalSavings = document.getElementById('sessionTotalSavings');
  const totalGoal = document.getElementById('sessionGoal');
  const monthList = document.getElementById('sessionMonths');
  const logoutBtn = document.getElementById('logoutBtn');

  if (userName) userName.textContent = currentUser.username;
  if (totalExpenses) totalExpenses.textContent = formatCurrency(getExpenseTotal(profile.transactions));
  if (totalSavings) totalSavings.textContent = formatCurrency(getSavingsTotal(profile.transactions));
  if (totalGoal) totalGoal.textContent = formatCurrency(Number(profile.goal) || 1500);

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      window.location.href = 'account.html';
    });
  }

  const monthEntries = [...monthGroups.entries()].sort(([a], [b]) => b.localeCompare(a));

  if (monthList) {
    monthList.innerHTML = monthEntries.length
      ? monthEntries
          .map(([key, group]) => `
            <article class="month-card">
              <h3>${group.label}</h3>
              <div class="month-summary">
                <span>Gastos: <strong class="amount expense">${formatCurrency(group.expenses)}</strong></span>
                <span>Ahorros: <strong class="amount saving">${formatCurrency(group.savings)}</strong></span>
              </div>
              <ul>
                ${group.entries
                  .map(
                    (entry) => `
                      <li>
                        <span>${entry.name}</span>
                        <span class="amount ${entry.type === 'expense' || Number(entry.amount) < 0 ? 'expense' : 'saving'}">
                          ${entry.type === 'expense' || Number(entry.amount) < 0 ? '-' : '+'}${formatCurrency(Math.abs(Number(entry.amount)))}
                        </span>
                      </li>
                    `
                  )
                  .join('')}
              </ul>
            </article>
          `)
          .join('')
      : '<p class="empty">Todavía no hay movimientos para mostrar.</p>';
  }
};

ensureActiveAccount().then((isActive) => {
  if (!isActive) return;

  if (document.getElementById('transactionForm')) initIndexPage();
  if (document.getElementById('savingForm')) initSavingsPage();
  if (document.getElementById('sessionRoot')) initSessionPage();
});
