const SHEET_URL = 'https://script.google.com/macros/s/AKfycbxKaYqQevkl0ul_kdlwq3L7J2lyefoEez85A0nS_6oUVV-Pwvx9BlTv7yDT0KX0PoUO/exec'; // ← ВСТАВЬ СВОЙ URL!!!

const TG = window.Telegram.WebApp;
TG.expand();

let userRole = null;
let currentLogin = null;

// Авторизация
async function login() {
  const login = document.getElementById('login').value.trim();
  const password = document.getElementById('password').value;
  const hashedPass = CryptoJS.SHA256(password).toString();

  const response = await fetch(`${SHEET_URL}?sheet=Users&action=read`);
  const users = await response.json();

  for (let user of users.slice(1)) {
    if (user[0] === login && user[1] === hashedPass) {
      userRole = user[2];
      currentLogin = login;
      document.getElementById('auth').style.display = 'none';
      document.getElementById('main').style.display = 'block';

      // Показываем кнопку добавления только для нужных ролей
      if (['soushef', 'shef', 'admin'].includes(userRole)) {
        document.getElementById('addButton').style.display = 'block';
      }

      // Автоматически загружаем раскладки первого цеха после входа
      loadRaskladki();
      return;
    }
  }
  alert('Неверный логин или пароль');
}

// Загрузка раскладок для выбранного цеха
async function loadRaskladki() {
  const sheet = document.getElementById('workshop').value;
  const response = await fetch(`${SHEET_URL}?sheet=${sheet}&action=read`);
  const raskladki = await response.json();

  let html = '';
  raskladki.slice(1).forEach((item) => {
    html += `
      <div class="raskladka-item">
        <strong>${item[1]}</strong><br>
        <small>Автор: ${item[4]} | ${item[5]}</small><br>
        <details>
          <summary>Ингредиенты</summary>
          <p>${item[2].replace(/\n/g, '<br>')}</p>
        </details>
        <details>
          <summary>Раскладка</summary>
          <p>${item[3].replace(/\n/g, '<br>')}</p>
        </details>
    `;
    if (['soushef', 'shef', 'admin'].includes(userRole)) {
      html += `<button onclick="editRaskladka('${item[0]}', '${sheet}')">Редактировать</button>`;
    }
    html += '</div>';
  });

  if (raskladki.length <= 1) {
    html = '<p>В этом цехе пока нет раскладок</p>';
  }

  document.getElementById('raskladkiList').innerHTML = html;
}

// Показ формы добавления
function showAddForm() {
  document.getElementById('addForm').style.display = 'block';
  document.getElementById('name').focus();
}

// Добавление новой раскладки
async function addRaskladka() {
  if (!['soushef', 'shef', 'admin'].includes(userRole)) {
    return alert('Нет прав на добавление');
  }

  const sheet = document.getElementById('workshop').value;
  const name = document.getElementById('name').value.trim();
  const ingredients = document.getElementById('ingredients').value.trim();
  const raskladkiText = document.getElementById('raskladki').value.trim();

  if (!name || !ingredients || !raskladkiText) {
    return alert('Заполните все поля!');
  }

  const data = [
    Date.now(),           // ID
    name,                 // Название
    ingredients,          // Ингредиенты
    raskladkiText,        // Раскладка
    currentLogin,         // Автор
    new Date().toLocaleString('ru-RU')  // Дата
  ];

  await fetch(`${SHEET_URL}?sheet=${sheet}&action=add`, {
    method: 'POST',
    body: JSON.stringify(data)
  });

  document.getElementById('addForm').style.display = 'none';
  document.getElementById('name').value = '';
  document.getElementById('ingredients').value = '';
  document.getElementById('raskladki').value = '';
  loadRaskladki();
  alert('Раскладка добавлена!');
}

// Редактирование раскладки (через prompt для простоты)
async function editRaskladka(id, sheet) {
  if (!['soushef', 'shef', 'admin'].includes(userRole)) {
    return alert('Нет прав на редактирование');
  }

  const newName = prompt('Новое название:');
  const newIngredients = prompt('Новые ингредиенты:');
  const newRaskladki = prompt('Новая раскладка:');

  if (!newName || !newIngredients || !newRaskladki) return;

  const data = [
    id,
    newName,
    newIngredients,
    newRaskladki,
    currentLogin,
    new Date().toLocaleString('ru-RU')
  ];

  await fetch(`${SHEET_URL}?sheet=${sheet}&action=update`, {
    method: 'POST',
    body: JSON.stringify(data)
  });

  loadRaskladki();
  alert('Раскладка обновлена!');
}

// Слушатель изменения цеха — автоматическая перезагрузка списка
document.getElementById('workshop').addEventListener('change', loadRaskladki);
