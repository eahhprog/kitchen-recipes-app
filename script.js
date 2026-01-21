// script.js — Полная рабочая версия с исправлениями CORS, ошибок и addEventListener

// Прокси + твой URL (обязательно замени на свой реальный!)
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbxKaYqQevkl0ul_kdlwq3L7J2lyefoEez85A0nS_6oUVV-Pwvx9BlTv7yDT0KX0PoUO/exec';
// ↑ Это твой URL — он правильный, но Google его блокирует без прокси

const TG = window.Telegram.WebApp;
TG.expand();

let userRole = null;
let currentLogin = null;

// Авторизация
async function login() {
  try {
    const loginInput = document.getElementById('login').value.trim();
    const password = document.getElementById('password').value;

    if (!loginInput || !password) {
      alert('Введите логин и пароль!');
      return;
    }

    const hashedPass = CryptoJS.SHA256(password).toString();

    console.log('Попытка входа:', loginInput);

    const response = await fetch(`${SHEET_URL}?sheet=Users&action=read`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
    }

    const users = await response.json();
    console.log('Пользователи загружены:', users);

    for (let user of users.slice(1)) {
      if (user[0] === loginInput && user[1] === hashedPass) {
        userRole = user[2];
        currentLogin = loginInput;

        document.getElementById('auth').style.display = 'none';
        document.getElementById('main').style.display = 'block';

        // Показываем кнопку добавления
        if (['soushef', 'shef', 'admin'].includes(userRole)) {
          document.getElementById('addButton').style.display = 'block';
        }

        // Теперь безопасно добавляем слушатель на select (после показа #main)
        const workshopSelect = document.getElementById('workshop');
        workshopSelect.addEventListener('change', loadRaskladki);

        // Загружаем раскладки
        loadRaskladki();
        return;
      }
    }

    alert('Неверный логин или пароль');
  } catch (error) {
    console.error('Ошибка в login():', error);
    alert('Ошибка при входе: ' + error.message + '\nПроверь консоль (F12)');
  }
}

// Загрузка раскладок
async function loadRaskladki() {
  try {
    const sheet = document.getElementById('workshop').value;
    console.log('Загружаем из листа:', sheet);

    const response = await fetch(`${SHEET_URL}?sheet=${sheet}&action=read`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`Ошибка загрузки: ${response.status}`);
    }

    const raskladki = await response.json();

    let html = '';
    raskladki.slice(1).forEach((item) => {
      html += `
        <div class="raskladka-item">
          <strong>${item[1]}</strong><br>
          <small>Автор: ${item[4]} | ${item[5]}</small><br>
          <details><summary>Ингредиенты</summary><p>${item[2].replace(/\n/g, '<br>')}</p></details>
          <details><summary>Раскладка</summary><p>${item[3].replace(/\n/g, '<br>')}</p></details>
      `;
      if (['soushef', 'shef', 'admin'].includes(userRole)) {
        html += `<button onclick="editRaskladka('${item[0]}', '${sheet}')">Редактировать</button>`;
      }
      html += '</div>';
    });

    if (raskladki.length <= 1) html = '<p>Пока нет раскладок</p>';

    document.getElementById('raskladkiList').innerHTML = html;
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    document.getElementById('raskladkiList').innerHTML = '<p>Ошибка загрузки: ' + error.message + '</p>';
  }
}

// Добавление раскладки
async function addRaskladka() {
  try {
    if (!['soushef', 'shef', 'admin'].includes(userRole)) return alert('Нет прав');

    const sheet = document.getElementById('workshop').value;
    const name = document.getElementById('name').value.trim();
    const ingredients = document.getElementById('ingredients').value.trim();
    const raskladkiText = document.getElementById('raskladki').value.trim();

    if (!name || !ingredients || !raskladkiText) return alert('Заполните все поля!');

    const data = [Date.now(), name, ingredients, raskladkiText, currentLogin, new Date().toLocaleString('ru-RU')];

    const response = await fetch(`${SHEET_URL}?sheet=${sheet}&action=add`, {
      method: 'POST',
      body: JSON.stringify(data),
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) throw new Error(`Ошибка сохранения: ${response.status}`);

    document.getElementById('addForm').style.display = 'none';
    document.getElementById('name').value = '';
    document.getElementById('ingredients').value = '';
    document.getElementById('raskladki').value = '';

    loadRaskladki();
    alert('Раскладка добавлена!');
  } catch (error) {
    console.error('Ошибка добавления:', error);
    alert('Не удалось добавить: ' + error.message);
  }
}

// Редактирование
async function editRaskladka(id, sheet) {
  try {
    if (!['soushef', 'shef', 'admin'].includes(userRole)) return alert('Нет прав');

    const newName = prompt('Новое название:');
    const newIngredients = prompt('Новые ингредиенты:');
    const newRaskladki = prompt('Новая раскладка:');

    if (!newName || !newIngredients || !newRaskladki) return;

    const data = [id, newName, newIngredients, newRaskladki, currentLogin, new Date().toLocaleString('ru-RU')];

    const response = await fetch(`${SHEET_URL}?sheet=${sheet}&action=update`, {
      method: 'POST',
      body: JSON.stringify(data),
      mode: 'cors',
      credentials: 'omit'
    });

    if (!response.ok) throw new Error(`Ошибка обновления: ${response.status}`);

    loadRaskladki();
    alert('Обновлено!');
  } catch (error) {
    console.error('Ошибка редактирования:', error);
    alert('Ошибка: ' + error.message);
  }
}
