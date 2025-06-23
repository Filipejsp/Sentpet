# 🐾 Sentipet - Rede Social de Pets

Uma rede social fofa onde você pode se conectar através dos pets! Escolha seu pet, entre nas praças e desenvolva relacionamentos com outros pets do mundo.

## ✨ Funcionalidades

- **🐕 Escolha seu Pet**: Cachorro, Gato, Coelho, Pássaro, Hamster ou Peixe
- **🏛️ Praças Sociais**: 
  - Praça dos Pets (geral)
  - Clube dos Gatos (exclusivo)
  - Parque dos Cachorros (exclusivo)
- **💬 Chat em Tempo Real**: Converse com outros pets usando Socket.IO
- **💕 Sistema de Relacionamentos**: Amizade, Crush e Namoro
- **🎮 Interações**: Brincar, alimentar, acariciar e abraçar seu pet
- **📱 Interface Responsiva**: Funciona em desktop e mobile
- **🌙 Modo Escuro**: Tema escuro opcional
- **🔔 Notificações**: Notificações em tempo real

## 🚀 Como Usar

### Para Desenvolvedores

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Iniciar servidor**:
   ```bash
   npm start
   ```

3. **Acessar**:
   - Local: http://localhost:3000
   - Status: http://localhost:3000/api/status

### Para Usuários Finais

1. **Acesse o app** no navegador
2. **Digite seu nome** de usuário
3. **Escolha seu pet** favorito
4. **Entre nas praças** para conhecer outros pets
5. **Interaja** com seu pet e outros usuários
6. **Desenvolva relacionamentos** com outros pets

## 📱 Como Compartilhar com Amigos

### Opção 1: Servidor Local (Teste)
1. Execute `node server.js` no seu computador
2. Compartilhe seu IP local com amigos na mesma rede
3. Eles acessam: `http://SEU_IP:3000`

### Opção 2: Servidor Online (Produção)
1. **Deploy no Heroku**:
   ```bash
   heroku create sentipet-app
   git push heroku main
   ```

2. **Deploy no Railway**:
   - Conecte seu repositório GitHub
   - Configure as variáveis de ambiente
   - Deploy automático

3. **Deploy no Vercel**:
   - Conecte seu repositório
   - Configure o build command
   - Deploy

### Opção 3: APK Mobile (Futuro)
Para criar um APK:
1. Use **Capacitor** ou **Cordova**
2. Configure para Android
3. Build do APK
4. Compartilhe o arquivo .apk

## 🔧 Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO
- **Estilo**: CSS Gradients, Animations
- **Responsivo**: Mobile-first design

## 📊 API Endpoints

- `GET /api/status` - Status do servidor
- `POST /api/register` - Registrar usuário
- `GET /api/users` - Listar usuários online
- `GET /api/rooms/:roomId/messages` - Mensagens da sala
- `POST /api/relationships` - Criar relacionamento

## 🎮 Eventos Socket.IO

- `authenticate` - Autenticar usuário
- `join_room` - Entrar em sala
- `send_message` - Enviar mensagem
- `pet_interaction` - Interação com pet
- `request_relationship` - Solicitar relacionamento

## 🌐 Estrutura do Projeto

```
sentipet/
├── index.html          # Interface principal
├── style.css           # Estilos CSS
├── script.js           # Lógica frontend
├── server.js           # Servidor backend
├── package.json        # Dependências
└── README.md           # Documentação
```

## 🎯 Próximas Funcionalidades

- [ ] **Sistema de Níveis**: Pets evoluem com interações
- [ ] **Loja de Itens**: Comprar acessórios para pets
- [ ] **Eventos Especiais**: Festas e encontros
- [ ] **Chat Privado**: Mensagens diretas
- [ ] **Fotos de Pets**: Upload de imagens
- [ ] **Sistema de Conquistas**: Badges e troféus
- [ ] **Push Notifications**: Notificações push
- [ ] **PWA**: App instalável

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🐾 Sobre

Sentipet foi criado com ❤️ para conectar pessoas através dos pets mais fofos do mundo!

---

**Desenvolvido por**: Sentipet Team  
**Versão**: 1.0.0  
**Status**: 🟢 Online 