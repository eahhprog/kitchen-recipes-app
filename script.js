const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwMP_UeBzoWLs_1tueD8PfJ5FWDzIUbDqXxU_WYH38qLqDLbNWCI0GPqGSQqQbuosQq/exec'; // Твой URL из Apps Script
const TG = window.Telegram.WebApp;
TG.expand();

let userRole = null;

// Авторизация
async function login() {
  const login = document.getElementById('login').value;
  const password = document.getElementById('password').value;
  const hashedPass = CryptoJS.SHA256(password).toString(); // Хэш пароля

  // Читаем пользователей
  const response = await fetch(`${SHEET_URL}?sheet=Users&action=read`);
  const users = await response.json();

  for (let user of users.slice(1)) { // Пропустить заголовок
    if (user[0] === login && user[1] === hashedPass) {
      userRole = user[2]; // Роль
      document.getElementById('auth').style.display = 'none';
      document.getElementById('main').style.display = 'block';
      loadRecipes();
      return;
    }
  }
  alert('Неверный логин/пароль');
}

// Загрузка рецептов
async function loadRecipes() {
  const response = await fetch(`${SHEET_URL}?sheet=Recipes&action=read`);
  const recipes = await response.json();
  let html = '';
  recipes.slice(1).forEach((rec, index) => {
    html += `<div>${rec[1]} <button onclick="editRecipe(${rec[0]})" ${userRole === 'povar' ? 'disabled' : ''}>Редактировать</button></div>`;
  });
  document.getElementById('recipes').innerHTML = html;
}

// Добавление рецепта (только если роль позволяет, например, су-шеф и выше)
async function addRecipe() {
  if (userRole === 'povar') return alert('Нет прав');
  const data = [Date.now(), document.getElementById('name').value, document.getElementById('ingredients').value, document.getElementById('layout').value, document.getElementById('login').value];
  await fetch(`${SHEET_URL}?sheet=Recipes&action=add`, { method: 'POST', body: JSON.stringify(data) });
  loadRecipes();
}

// Редактирование (аналогично, с action=update)
async function editRecipe(id) {
  if (userRole !== 'admin' && userRole !== 'shef') return alert('Нет прав');
  // ... (добавь форму для редактирования, аналогично add)
}

// Показ формы добавления
function showAddForm() { document.getElementById('addForm').style.display = 'block'; }
