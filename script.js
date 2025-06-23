// Configuração do servidor
const SERVER_URL = window.location.origin;
const socket = io(SERVER_URL);

// Dados dos pets
const PETS = {
  dog: { emoji: '🐕', name: 'Cachorro', mood: 'Feliz', description: 'Leal e brincalhão' },
  cat: { emoji: '🐱', name: 'Gato', mood: 'Elegante', description: 'Independente e elegante' },
  rabbit: { emoji: '🐰', name: 'Coelho', mood: 'Tranquilo', description: 'Fofo e tranquilo' },
  bird: { emoji: '🐦', name: 'Pássaro', mood: 'Livre', description: 'Livre e cantante' },
  hamster: { emoji: '🐹', name: 'Hamster', mood: 'Ativo', description: 'Pequeno e ativo' },
  fish: { emoji: '🐠', name: 'Peixe', mood: 'Calmo', description: 'Calmo e observador' }
};

// Estados de humor
const MOODS = {
  happy: { emoji: '😊', text: 'Feliz', color: '#4caf50' },
  excited: { emoji: '🤗', text: 'Empolgado', color: '#ff9800' },
  sleepy: { emoji: '😴', text: 'Sonolento', color: '#9c27b0' },
  hungry: { emoji: '🍽️', text: 'Faminto', color: '#f44336' },
  playful: { emoji: '🎾', text: 'Brincalhão', color: '#2196f3' }
};

// Praças disponíveis
const PLAZAS = {
  praca: { name: '🏛️ Praça dos Pets', description: 'Conheça novos amigos', emoji: '🏛️' },
  gatos: { name: '🐱 Clube dos Gatos', description: 'Exclusivo para gatos', emoji: '🐱' },
  cachorros: { name: '🐕 Parque dos Cachorros', description: 'Exclusivo para cachorros', emoji: '🐕' }
};

// Estado da aplicação
let currentUser = null;
let currentPet = null;
let currentMood = 'happy';
let currentPlaza = 'praca';
let relationships = [];
let settings = {
  notifications: true,
  sound: true,
  darkMode: false
};
let onlineUsers = [];
let isConnected = false;

// Elementos DOM
const loadingScreen = document.getElementById('loading-screen');
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const petSelection = document.getElementById('pet-selection');
const homeScreen = document.getElementById('home-screen');
const plazaScreen = document.getElementById('plaza-screen');
const settingsModal = document.getElementById('settings-modal');
const notificationsContainer = document.getElementById('notifications-container');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupEventListeners();
  setupSocketEvents();
  loadSettings();
});

function initializeApp() {
  // Verificar conexão com servidor
  checkServerStatus().then(() => {
    // Simular loading
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
      
      // Verificar se usuário já está logado
      const savedUser = localStorage.getItem('sentipet_user');
      const savedPet = localStorage.getItem('sentipet_pet');
      
      if (savedUser && savedPet) {
        currentUser = savedUser;
        currentPet = savedPet;
        authenticateUser();
      } else {
        showAuthScreen();
      }
    }, 2000);
  }).catch(() => {
    showNotification('Erro ao conectar com o servidor. Verifique sua conexão.', 'error');
    loadingScreen.classList.add('hidden');
    showAuthScreen();
  });
}

async function checkServerStatus() {
  try {
    const response = await fetch(`${SERVER_URL}/api/status`);
    const data = await response.json();
    console.log('Servidor online:', data);
    return data;
  } catch (error) {
    console.error('Erro ao conectar com servidor:', error);
    throw error;
  }
}

function setupSocketEvents() {
  // Conexão
  socket.on('connect', () => {
    console.log('Conectado ao servidor');
    isConnected = true;
    showNotification('Conectado ao Sentipet! 🐾', 'success');
  });

  socket.on('disconnect', () => {
    console.log('Desconectado do servidor');
    isConnected = false;
    showNotification('Desconectado do servidor', 'warning');
  });

  // Autenticação
  socket.on('authenticated', (data) => {
    if (data.success) {
      showMainScreen();
    } else {
      showNotification('Erro na autenticação: ' + data.error, 'error');
      showAuthScreen();
    }
  });

  // Usuários online/offline
  socket.on('user_online', (data) => {
    showNotification(`${data.username} entrou online! ${data.petEmoji}`, 'info');
    updateOnlineUsers();
  });

  socket.on('user_offline', (data) => {
    showNotification(`${data.username} ficou offline`, 'info');
    updateOnlineUsers();
  });

  // Sala
  socket.on('user_joined_room', (data) => {
    showNotification(`${data.username} entrou na sala! ${data.petEmoji}`, 'info');
    updateOnlineUsers();
  });

  socket.on('user_left_room', (data) => {
    showNotification(`${data.username} saiu da sala`, 'info');
    updateOnlineUsers();
  });

  socket.on('room_users', (users) => {
    onlineUsers = users;
    updateUsersList();
  });

  // Mensagens
  socket.on('new_message', (messageData) => {
    addMessageToChat(messageData.username, messageData.message, messageData.userId === currentUser?.id);
  });

  // Interações com pet
  socket.on('pet_interaction_update', (data) => {
    if (data.userId !== currentUser?.id) {
      showNotification(`${data.username} ${getInteractionText(data.action)}! ${data.petEmoji}`, 'info');
    }
  });

  // Relacionamentos
  socket.on('relationship_request', (data) => {
    showRelationshipRequest(data);
  });

  socket.on('relationship_accepted', (data) => {
    showNotification(`${data.byUsername} aceitou seu pedido de relacionamento! 💕`, 'success');
    loadRelationships();
  });

  socket.on('relationship_rejected', (data) => {
    showNotification(`${data.byUsername} rejeitou seu pedido de relacionamento 😔`, 'warning');
  });

  socket.on('relationship_created', (data) => {
    showNotification('Novo relacionamento criado! 💕', 'success');
    loadRelationships();
  });
}

function setupEventListeners() {
  // Login
  document.getElementById('loginBtn').addEventListener('click', handleLogin);
  document.getElementById('username').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  // Seleção de pet
  document.querySelectorAll('.pet-option').forEach(option => {
    option.addEventListener('click', () => selectPet(option.dataset.pet));
  });

  // Interações com pet
  document.querySelectorAll('.interaction-btn').forEach(btn => {
    btn.addEventListener('click', () => interactWithPet(btn.dataset.action));
  });

  // Navegação para praças
  document.querySelectorAll('.plaza-btn').forEach(btn => {
    btn.addEventListener('click', () => enterPlaza(btn.dataset.plaza));
  });

  // Voltar para home
  document.getElementById('back-to-home').addEventListener('click', () => {
    leaveCurrentRoom();
    showHomeScreen();
  });

  // Chat
  document.getElementById('chat-form').addEventListener('submit', handleChatSubmit);

  // Configurações
  document.getElementById('settingsBtn').addEventListener('click', showSettings);
  document.querySelector('.modal-close').addEventListener('click', hideSettings);
  document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target.id === 'settings-modal') hideSettings();
  });

  // Toggles de configuração
  document.getElementById('notifications-toggle').addEventListener('change', updateSettings);
  document.getElementById('sound-toggle').addEventListener('change', updateSettings);
  document.getElementById('dark-mode-toggle').addEventListener('change', updateSettings);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

async function handleLogin() {
  const username = document.getElementById('username').value.trim();
  const validation = document.querySelector('.input-validation');
  
  if (!username) {
    validation.textContent = 'Por favor, digite um nome de usuário';
    return;
  }
  
  if (username.length < 3) {
    validation.textContent = 'Nome deve ter pelo menos 3 caracteres';
    return;
  }
  
  if (username.length > 20) {
    validation.textContent = 'Nome deve ter no máximo 20 caracteres';
    return;
  }
  
  // Simular loading
  const loginBtn = document.getElementById('loginBtn');
  loginBtn.classList.add('loading');
  
  try {
    // Verificar se username já existe
    const response = await fetch(`${SERVER_URL}/api/users`);
    const users = await response.json();
    const existingUser = users.find(u => u.username === username);
    
    if (existingUser) {
      validation.textContent = 'Username já está em uso';
      loginBtn.classList.remove('loading');
      return;
    }
    
    currentUser = { username, id: null };
    showNotification('Bem-vindo ao Sentipet! 🐾', 'success');
    showMainScreen();
    
  } catch (error) {
    showNotification('Erro ao verificar usuário', 'error');
  } finally {
    loginBtn.classList.remove('loading');
  }
}

function selectPet(petType) {
  // Remover seleção anterior
  document.querySelectorAll('.pet-option').forEach(option => {
    option.classList.remove('selected');
  });
  
  // Selecionar novo pet
  document.querySelector(`[data-pet="${petType}"]`).classList.add('selected');
  
  setTimeout(() => {
    currentPet = petType;
    localStorage.setItem('sentipet_pet', petType);
    showNotification(`Você escolheu um ${PETS[petType].name}! 🎉`, 'success');
    registerUser();
  }, 500);
}

async function registerUser() {
  try {
    const response = await fetch(`${SERVER_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: currentUser.username,
        petType: currentPet
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('sentipet_user', JSON.stringify(currentUser));
      authenticateUser();
    } else {
      showNotification('Erro ao registrar usuário', 'error');
    }
  } catch (error) {
    showNotification('Erro ao conectar com servidor', 'error');
  }
}

function authenticateUser() {
  if (!isConnected) {
    showNotification('Aguardando conexão com servidor...', 'warning');
    return;
  }
  
  socket.emit('authenticate', {
    userId: currentUser.id,
    username: currentUser.username,
    petType: currentPet
  });
}

function showAuthScreen() {
  authScreen.classList.remove('hidden');
  mainScreen.classList.add('hidden');
}

function showMainScreen() {
  authScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
  
  if (!currentPet) {
    showPetSelection();
  } else {
    showHomeScreen();
  }
}

function showPetSelection() {
  petSelection.classList.remove('hidden');
  homeScreen.classList.add('hidden');
  plazaScreen.classList.add('hidden');
}

function showHomeScreen() {
  petSelection.classList.add('hidden');
  homeScreen.classList.remove('hidden');
  plazaScreen.classList.add('hidden');
  
  updateHomeScreen();
}

function showPlazaScreen() {
  petSelection.classList.add('hidden');
  homeScreen.classList.add('hidden');
  plazaScreen.classList.remove('hidden');
  
  updatePlazaScreen();
}

function updateHomeScreen() {
  if (!currentUser || !currentPet) return;
  
  // Atualizar informações do usuário
  document.getElementById('current-user').textContent = currentUser.username;
  document.getElementById('current-pet').textContent = PETS[currentPet].name;
  document.getElementById('current-pet-emoji').textContent = PETS[currentPet].emoji;
  
  // Atualizar pet principal
  document.getElementById('pet-avatar').textContent = PETS[currentPet].emoji;
  document.getElementById('pet-name').textContent = PETS[currentPet].name;
  document.getElementById('pet-mood').textContent = `Está ${MOODS[currentMood].text.toLowerCase()} hoje!`;
  
  // Atualizar humor
  document.getElementById('current-mood').textContent = MOODS[currentMood].emoji;
  document.getElementById('mood-text').textContent = MOODS[currentMood].text;
  
  // Carregar relacionamentos
  loadRelationships();
}

function interactWithPet(action) {
  const petName = PETS[currentPet].name;
  let message = '';
  let newMood = currentMood;
  
  switch (action) {
    case 'play':
      message = `Você brincou com ${petName}! 🎾`;
      newMood = 'playful';
      break;
    case 'feed':
      message = `Você alimentou ${petName}! 🍖`;
      newMood = 'happy';
      break;
    case 'pet':
      message = `Você acariciou ${petName}! 🤗`;
      newMood = 'excited';
      break;
    case 'hug':
      message = `Você abraçou ${petName}! 🫂`;
      newMood = 'happy';
      break;
  }
  
  currentMood = newMood;
  showNotification(message, 'success');
  
  // Animar o botão
  const btn = document.querySelector(`[data-action="${action}"]`);
  btn.style.transform = 'scale(0.95)';
  setTimeout(() => {
    btn.style.transform = '';
  }, 150);
  
  // Atualizar tela
  updateHomeScreen();
  
  // Enviar para servidor se estiver em uma sala
  if (currentPlaza && isConnected) {
    socket.emit('pet_interaction', {
      action,
      roomId: currentPlaza
    });
  }
  
  // Salvar interação
  saveInteraction(action, message);
}

function enterPlaza(plazaId) {
  if (!isConnected) {
    showNotification('Aguardando conexão com servidor...', 'warning');
    return;
  }
  
  currentPlaza = plazaId;
  socket.emit('join_room', plazaId);
  showPlazaScreen();
}

function leaveCurrentRoom() {
  if (currentPlaza && isConnected) {
    socket.emit('leave_room', currentPlaza);
  }
}

function updatePlazaScreen() {
  const plaza = PLAZAS[currentPlaza];
  
  // Atualizar informações da praça
  document.getElementById('plaza-name').textContent = plaza.name;
  
  // Carregar mensagens
  loadChatMessages();
}

async function loadChatMessages() {
  try {
    const response = await fetch(`${SERVER_URL}/api/rooms/${currentPlaza}/messages`);
    const messages = await response.json();
    
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    
    messages.forEach(msg => {
      addMessageToChat(msg.username, msg.message, msg.userId === currentUser?.id);
    });
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error);
  }
}

function updateOnlineUsers() {
  if (currentPlaza) {
    document.getElementById('online-count').textContent = `${onlineUsers.length} online`;
  }
}

function updateUsersList() {
  const usersList = document.getElementById('users-list');
  usersList.innerHTML = '';
  
  onlineUsers.forEach(user => {
    if (user.id !== currentUser?.id) {
      const userItem = document.createElement('div');
      userItem.className = 'user-item';
      userItem.innerHTML = `
        <span class="user-pet">${user.petEmoji}</span>
        <span class="user-name">${user.username}</span>
        <button class="relationship-btn" onclick="requestRelationship('${user.id}', '${user.username}')">💕</button>
      `;
      usersList.appendChild(userItem);
    }
  });
}

function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('message-input');
  const message = input.value.trim();
  
  if (!message || !isConnected) return;
  
  socket.emit('send_message', {
    roomId: currentPlaza,
    message
  });
  
  input.value = '';
}

function addMessageToChat(user, message, own) {
  const chatMessages = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${own ? 'own' : 'other'}`;
  
  messageDiv.innerHTML = `
    <div class="message-header">${user}</div>
    <div class="message-content">${message}</div>
  `;
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function requestRelationship(targetUserId, targetUsername) {
  if (!isConnected) return;
  
  const type = prompt(`Que tipo de relacionamento você quer com ${targetUsername}?\n1 - Amigo\n2 - Crush\n3 - Namoro`);
  
  if (type) {
    let relationshipType = 'friend';
    switch (type) {
      case '2': relationshipType = 'crush'; break;
      case '3': relationshipType = 'dating'; break;
    }
    
    socket.emit('request_relationship', {
      targetUserId,
      type: relationshipType
    });
    
    showNotification(`Solicitação enviada para ${targetUsername}! 💕`, 'success');
  }
}

function showRelationshipRequest(data) {
  const accepted = confirm(`${data.fromUsername} ${data.fromPetEmoji} quer ser seu ${getRelationshipTypeText(data.type)}!\n\nAceitar?`);
  
  if (isConnected) {
    socket.emit('respond_relationship', {
      fromUserId: data.fromUserId,
      accepted,
      type: data.type
    });
  }
}

function getRelationshipTypeText(type) {
  switch (type) {
    case 'friend': return 'amigo';
    case 'crush': return 'crush';
    case 'dating': return 'namorado';
    default: return 'amigo';
  }
}

function getInteractionText(action) {
  switch (action) {
    case 'play': return 'brincou';
    case 'feed': return 'alimentou';
    case 'pet': return 'acariciou';
    case 'hug': return 'abraçou';
    default: return 'interagiu';
  }
}

function loadRelationships() {
  const relationshipsList = document.getElementById('relationships-list');
  
  if (relationships.length === 0) {
    relationshipsList.innerHTML = `
      <div class="no-relationships">
        <p>Você ainda não tem relacionamentos</p>
        <p>Vá para as praças e conheça outros pets! 🐾</p>
      </div>
    `;
  } else {
    relationshipsList.innerHTML = relationships.map(rel => `
      <div class="relationship-item">
        <span class="relationship-pet">${rel.petEmoji}</span>
        <span class="relationship-name">${rel.username}</span>
        <span class="relationship-type">${getRelationshipTypeText(rel.type)}</span>
      </div>
    `).join('');
  }
}

function saveInteraction(action, message) {
  const interactions = JSON.parse(localStorage.getItem('sentipet_interactions') || '[]');
  interactions.push({
    action,
    message,
    timestamp: new Date().toISOString(),
    pet: currentPet
  });
  localStorage.setItem('sentipet_interactions', JSON.stringify(interactions));
}

function showSettings() {
  settingsModal.classList.remove('hidden');
  setTimeout(() => {
    settingsModal.classList.add('show');
  }, 10);
}

function hideSettings() {
  settingsModal.classList.remove('show');
  setTimeout(() => {
    settingsModal.classList.add('hidden');
  }, 300);
}

function updateSettings() {
  settings.notifications = document.getElementById('notifications-toggle').checked;
  settings.sound = document.getElementById('sound-toggle').checked;
  settings.darkMode = document.getElementById('dark-mode-toggle').checked;
  
  localStorage.setItem('sentipet_settings', JSON.stringify(settings));
  
  // Aplicar tema escuro
  if (settings.darkMode) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  
  showNotification('Configurações salvas! ⚙️', 'success');
}

function loadSettings() {
  const savedSettings = localStorage.getItem('sentipet_settings');
  if (savedSettings) {
    settings = JSON.parse(savedSettings);
    
    document.getElementById('notifications-toggle').checked = settings.notifications;
    document.getElementById('sound-toggle').checked = settings.sound;
    document.getElementById('dark-mode-toggle').checked = settings.darkMode;
    
    if (settings.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }
}

function handleLogout() {
  if (confirm('Tem certeza que deseja sair?')) {
    leaveCurrentRoom();
    localStorage.removeItem('sentipet_user');
    localStorage.removeItem('sentipet_pet');
    currentUser = null;
    currentPet = null;
    showNotification('Até logo! 👋', 'success');
    showAuthScreen();
  }
}

function showNotification(message, type = 'info') {
  if (!settings.notifications) return;
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  notificationsContainer.appendChild(notification);
  
  // Remover notificação após 3 segundos
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notificationsContainer.contains(notification)) {
        notificationsContainer.removeChild(notification);
      }
    }, 300);
  }, 3000);
  
  // Tocar som se habilitado
  if (settings.sound) {
    console.log('🔊 Som de notificação');
  }
}

// Validação de entrada
document.getElementById('username').addEventListener('input', (e) => {
  const validation = document.querySelector('.input-validation');
  const username = e.target.value.trim();
  
  if (username.length > 0 && username.length < 3) {
    validation.textContent = 'Nome deve ter pelo menos 3 caracteres';
  } else if (username.length > 20) {
    validation.textContent = 'Nome deve ter no máximo 20 caracteres';
  } else {
    validation.textContent = '';
  }
}); 