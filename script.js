
const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const modal = document.getElementById('modal');
const modalMessage = document.getElementById('modalMessage');
const themeButton = document.getElementById('themeButton');
const upsell = document.getElementById('upsell');
const toast = document.getElementById('toast');

let expression = '';
let lastAnswer = '0';
let waitingForNewInput = false;
let currentPlan = localStorage.getItem('calcpro-plan') || 'FREE';
let toastTimer;
let thinkingInterval;

applyPlan();
updateThemeIcon();

document.querySelectorAll('.key').forEach(button => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    const value = button.dataset.value;

    if (button.classList.contains('premium') && !hasAccess(button.dataset.plan)) {
      openPremium(button.dataset.feature, button.dataset.plan);
      return;
    }

    if (action === 'clear') return clearCalculator();
    if (action === 'parentheses') return addParenthesis();
    if (action === 'percent') return addPercent();
    if (action === 'equals') return calculate();
    if (value !== undefined) addValue(value);
  });
});

function addValue(value) {
  const isNumber = /^\d$/.test(value);
  const isOperator = ['+','-','*','/'].includes(value);

  if (waitingForNewInput && isNumber) {
    expression = '';
    waitingForNewInput = false;
  }

  if (isNumber) expression += value;

  if (value === '.') {
    if (waitingForNewInput) {
      expression = '';
      waitingForNewInput = false;
    }
    const currentNumber = expression.split(/[+\-*/()]/).pop();
    if (currentNumber.includes('.')) return showToast('One decimal point is already expensive enough.');
    expression += currentNumber === '' ? '0.' : '.';
  }

  if (isOperator) {
    waitingForNewInput = false;
    if (expression === '' && value !== '-') expression = lastAnswer + value;
    else if (expression === '' && value === '-') expression = '-';
    else if (['+','-','*','/'].includes(expression.at(-1))) expression = expression.slice(0,-1) + value;
    else expression += value;
  }

  updateDisplay();
}

function addParenthesis() {
  const opens = (expression.match(/\(/g) || []).length;
  const closes = (expression.match(/\)/g) || []).length;
  const last = expression.at(-1);

  if (!expression || ['+','-','*','/','('].includes(last)) expression += '(';
  else if (opens > closes) expression += ')';
  else expression += '*(';
  updateDisplay();
}

function addPercent() {
  const match = expression.match(/(\d*\.?\d+)$/);
  if (!match) return showToast('Percentage machine is confused.');
  expression = expression.slice(0, -match[1].length) + `(${match[1]}/100)`;
  updateDisplay();
}

function clearCalculator() {
  stopThinking();
  expression = '';
  lastAnswer = '0';
  waitingForNewInput = false;
  expressionEl.innerHTML = '&nbsp;';
  resultEl.textContent = '0';
  resultEl.classList.remove('thinking');
  upsell.classList.add('hidden');
}

async function calculate() {
  if (!expression) return;
  if (['+','-','*','/'].includes(expression.at(-1))) return showToast('Finish the equation first, mathematician.');

  const cleanExpression = expression.replace(/\s+/g,'');

  if (currentPlan !== 'ULTRA') {
    startThinking();
    await wait(currentPlan === 'PRO' ? 1800 : 2800);
    stopThinking();
    if (currentPlan === 'FREE') upsell.classList.remove('hidden');
  }

  try {
    if (cleanExpression === '6+7') {
      expressionEl.textContent = `${pretty(expression)} =`;
      resultEl.textContent = 'Hello World';
      waitingForNewInput = true;
      setTimeout(() => upsell.classList.add('hidden'), 1600);
      return;
    }

    const answer = safeEvaluate(expression);

    expressionEl.textContent = `${pretty(expression)} =`;
    resultEl.classList.remove('thinking');
    resultEl.textContent = formatNumber(answer);
    lastAnswer = String(answer);
    expression = String(answer);
    waitingForNewInput = true;
    setTimeout(() => upsell.classList.add('hidden'), 1600);
  } catch (err) {
    stopThinking();
    resultEl.textContent = 'Error';
    showToast(err.message);
  }
}

function startThinking() {
  stopThinking();
  resultEl.classList.add('thinking');
  const frames = ['Thinking.', 'Thinking..', 'Thinking...'];
  let index = 0;
  resultEl.textContent = frames[index];
  thinkingInterval = setInterval(() => {
    index = (index + 1) % frames.length;
    resultEl.textContent = frames[index];
  }, 500);
}

function stopThinking() {
  clearInterval(thinkingInterval);
  thinkingInterval = null;
  resultEl.classList.remove('thinking');
}

function safeEvaluate(input) {
  if (!/^[0-9+\-*/().\s]+$/.test(input)) throw new Error('That equation looks suspicious.');
  const opens = (input.match(/\(/g) || []).length;
  const closes = (input.match(/\)/g) || []).length;
  if (opens !== closes) throw new Error('Your parentheses need emotional closure.');
  const answer = Function(`"use strict"; return (${input});`)();
  if (!Number.isFinite(answer)) throw new Error('Division by zero requires the GALAXY plan.');
  return answer;
}

function formatNumber(n) {
  const rounded = Math.round((n + Number.EPSILON) * 1e10) / 1e10;
  return new Intl.NumberFormat('en-US', {maximumFractionDigits:10}).format(rounded);
}

function pretty(s) {
  return s.replaceAll('*',' × ').replaceAll('/',' ÷ ').replaceAll('+',' + ').replaceAll('-',' − ').replace(/\s+/g,' ').trim();
}

function updateDisplay() {
  stopThinking();
  expressionEl.textContent = expression ? pretty(expression) : ' ';
  const preview = expression.match(/-?\d*\.?\d+$/);
  if (preview) resultEl.textContent = preview[0];
  else if (!expression) resultEl.textContent = '0';
}

function hasAccess(plan) {
  if (currentPlan === 'ULTRA') return true;
  return currentPlan === 'PRO' && plan === 'PRO';
}

function openPremium(feature, plan) {
  modalMessage.textContent = `${feature} is apparently too powerful for the FREE plan. Upgrade to ${plan} to continue doing advanced mathematics.`;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
}

function closePremium() {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
}

document.getElementById('closeModal').addEventListener('click', closePremium);
document.getElementById('maybeLater').addEventListener('click', closePremium);
modal.addEventListener('click', e => { if (e.target === modal) closePremium(); });

document.querySelectorAll('[data-subscribe]').forEach(button => {
  button.addEventListener('click', () => {
    currentPlan = button.dataset.subscribe;
    localStorage.setItem('calcpro-plan', currentPlan);
    applyPlan();
    closePremium();
    showToast(currentPlan === 'ULTRA' ? 'ULTRA unlocked. Your calculator has achieved consciousness.' : 'PRO unlocked. You may now subtract responsibly.');
  });
});

function applyPlan() {
  document.body.classList.remove('pro','ultra');
  if (currentPlan === 'PRO') document.body.classList.add('pro');
  if (currentPlan === 'ULTRA') document.body.classList.add('ultra');
}

themeButton.addEventListener('click', () => {
  if (!hasAccess('PRO')) return openPremium('Theme Toggle','PRO');
  document.body.classList.toggle('dark');
  updateThemeIcon();
});

function updateThemeIcon() {
  themeButton.textContent = document.body.classList.contains('dark') ? '☀' : '☾';
}

document.addEventListener('keydown', e => {
  if (!modal.classList.contains('hidden')) {
    if (e.key === 'Escape') closePremium();
    return;
  }

  const key = e.key;
  if (/^\d$/.test(key)) clickKey(`[data-value="${key}"]`);
  else if (['+','-','*','.'].includes(key)) clickKey(`[data-value="${key}"]`);
  else if (key === '/') { e.preventDefault(); clickKey('[data-value="/"]'); }
  else if (key === '%') clickKey('[data-action="percent"]');
  else if (key === 'Enter' || key === '=') { e.preventDefault(); clickKey('[data-action="equals"]'); }
  else if (key === 'Escape') clickKey('[data-action="clear"]');
  else if (key === 'Backspace') { expression = expression.slice(0,-1); updateDisplay(); }
  else if (key === '(' || key === ')') addParenthesis();
});

function clickKey(selector) {
  const button = document.querySelector(selector);
  if (button) button.click();
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2600);
}

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
