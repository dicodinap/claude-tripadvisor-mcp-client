# Trip MCP Client TypeScript

Un cliente TypeScript que integra Claude con el servidor MCP de Tripadvisor para proporcionar información de viajes inteligente.

## 🚀 Características

- **Integración con Claude**: Utiliza Claude 3.5 Sonnet para procesar consultas de viajes
- **Servidor MCP Tripadvisor**: Acceso a datos de hoteles, restaurantes y atracciones
- **Chat Interactivo**: Interfaz de línea de comandos para conversaciones naturales
- **Ejecución de Herramientas**: Claude puede usar automáticamente las herramientas MCP según sea necesario

## 📋 Prerrequisitos

1. **Node.js** (versión 18 o superior)
2. **Docker** (para ejecutar el servidor MCP de Tripadvisor)
3. **API Key de Anthropic** (para Claude)
4. **API Key de Tripadvisor** (para acceder a los datos)

## 🛠️ Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/dicodinap/claude-tripadvisor-mcp-client.git
cd claude-tripadvisor-mcp-client
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
# Crea un archivo .env en la raíz del proyecto
echo "ANTHROPIC_API_KEY=tu_api_key_de_anthropic" > .env
echo "TRIPADVISOR_API_KEY=tu_api_key_de_tripadvisor" >> .env
```

4. Construye el servidor MCP de Tripadvisor (si no lo has hecho):
```bash
cd tripadvisor-mcp
docker build -t tripadvisor-mcp-server .
cd ..
```

## 🎯 Uso

### Modo Chat Interactivo (Recomendado)

Ejecuta el chat interactivo para tener conversaciones naturales con Claude:

```bash
npm run chat
```

Ejemplos de preguntas que puedes hacer:
- "Busca los mejores hoteles en Madrid con precios"
- "¿Cuáles son los restaurantes más populares en Barcelona?"
- "Encuentra atracciones turísticas en París"
- "Quiero hoteles de lujo en Roma, ¿qué opciones hay?"

### Modo Demo

Ejecuta ejemplos predefinidos:

```bash
npm run demo
```

### Modo Desarrollo

Para desarrollo con recarga automática:

```bash
npm run dev
```

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Usuario       │    │   Claude API    │    │ Tripadvisor MCP │
│                 │    │                 │    │    Server       │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ Pregunta             │                      │
          ▼                      │                      │
┌─────────────────┐              │                      │
│  MCPClient      │              │                      │
│                 │              │                      │
│ ┌─────────────┐ │              │                      │
│ │chatWithClaude│ ├──────────────┤                      │
│ └─────────────┘ │              │                      │
│                 │              │                      │
│ ┌─────────────┐ │              │                      │
│ │executeTool  │ ├──────────────┼──────────────────────┤
│ └─────────────┘ │              │                      │
└─────────────────┘              │                      │
          │                      │                      │
          │ Respuesta            │                      │
          ▼                      │                      │
```

## 🔧 Estructura del Proyecto

```
src/
├── mcp-client.ts          # Cliente principal MCP con integración Claude
├── interactive-chat.ts    # Chat interactivo por línea de comandos
├── index.ts              # Ejemplos de demostración
└── index.js              # Archivo de entrada compilado

tripadvisor-mcp/          # Servidor MCP de Tripadvisor
├── Dockerfile
├── package.json
└── src/
```

## 🔑 Métodos Principales

### MCPClient

- `connectToTripadvisorServer(apiKey)`: Conecta al servidor MCP
- `chatWithClaude(message)`: Envía mensaje a Claude con acceso a herramientas
- `executeTool(toolName, args)`: Ejecuta una herramienta MCP específica
- `getClaudeTools()`: Obtiene herramientas en formato compatible con Claude
- `disconnect()`: Cierra la conexión

## 🌟 Ejemplos de Uso

### Búsqueda de Hoteles
```typescript
const response = await client.chatWithClaude(
    "Busca hoteles de 4 estrellas en Madrid con precio menor a 200€"
);
```

### Búsqueda de Restaurantes
```typescript
const response = await client.chatWithClaude(
    "Encuentra restaurantes de comida italiana en Barcelona"
);
```

### Atracciones Turísticas
```typescript
const response = await client.chatWithClaude(
    "¿Qué atracciones turísticas hay cerca del Louvre en París?"
);
```

## 🐛 Solución de Problemas

### Error de Conexión Docker
```bash
# Verifica que Docker esté ejecutándose
docker --version

# Reconstruye la imagen si es necesario
cd tripadvisor-mcp
docker build -t tripadvisor-mcp-server .
```

### Error de API Keys
```bash
# Verifica que las variables de entorno estén configuradas
echo $ANTHROPIC_API_KEY
echo $TRIPADVISOR_API_KEY
```

### Error de Dependencias
```bash
# Reinstala las dependencias
rm -rf node_modules package-lock.json
npm install
```

## 📝 Notas

- El servidor MCP se ejecuta en un contenedor Docker para aislamiento
- Claude automáticamente decide qué herramientas usar según el contexto
- Las respuestas incluyen tanto texto de Claude como datos de Tripadvisor
- La aplicación maneja errores graciosamente y proporciona retroalimentación útil

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia ISC.