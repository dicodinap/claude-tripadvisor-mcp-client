import { MCPClient } from "./mcp-client";
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    toolsUsed?: string[];
}

class InteractiveChat {
    private client: MCPClient;
    private rl: readline.Interface;
    private conversationHistory: ConversationMessage[] = [];
    private maxHistoryLength: number = 20; // Mantener últimas 20 interacciones

    constructor() {
        this.client = new MCPClient();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async initialize() {
        try {
            console.log("🚀 Iniciando conexión con el servidor Tripadvisor MCP...");
            await this.client.connectToTripadvisorServer(process.env.TRIPADVISOR_API_KEY!);
            console.log("✅ Conectado exitosamente al servidor Tripadvisor");
            console.log("🤖 Claude está listo para ayudarte con información de viajes");
            console.log("💡 Puedes preguntar sobre hoteles, restaurantes, atracciones turísticas, etc.");
            console.log("📝 Comandos especiales:");
            console.log("   - 'historial' - Ver el historial de conversación");
            console.log("   - 'limpiar' - Limpiar el historial");
            console.log("   - 'salir' - Terminar la conversación\n");
        } catch (error) {
            console.error("❌ Error al conectar:", error);
            throw error;
        }
    }

    private askQuestion(question: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }

    private addToHistory(role: 'user' | 'assistant', content: string, toolsUsed?: string[]) {
        const message: ConversationMessage = {
            role,
            content,
            timestamp: new Date(),
            toolsUsed
        };

        this.conversationHistory.push(message);

        // Mantener solo las últimas interacciones para no sobrecargar el contexto
        if (this.conversationHistory.length > this.maxHistoryLength) {
            this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
        }
    }

    private formatHistoryForClaude() {
        return this.conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    private showConversationHistory() {
        console.log("\n📚 === HISTORIAL DE CONVERSACIÓN ===");
        if (this.conversationHistory.length === 0) {
            console.log("No hay conversaciones previas.");
            return;
        }

        this.conversationHistory.forEach((msg, index) => {
            const time = msg.timestamp.toLocaleTimeString();
            const role = msg.role === 'user' ? '🧑 Tú' : '🤖 Claude';
            console.log(`\n[${time}] ${role}:`);
            console.log(msg.content);
            if (msg.toolsUsed && msg.toolsUsed.length > 0) {
                console.log(`🔧 Herramientas usadas: ${msg.toolsUsed.join(', ')}`);
            }
        });
        console.log("\n=== FIN DEL HISTORIAL ===\n");
    }

    private clearHistory() {
        this.conversationHistory = [];
        console.log("🧹 Historial de conversación limpiado.");
    }

    async startChat() {
        await this.initialize();

        while (true) {
            try {
                const userInput = await this.askQuestion("\n🧑 Tú: ");
                
                // Comandos especiales
                if (userInput.toLowerCase().trim() === 'salir') {
                    console.log("\n👋 ¡Hasta luego! Cerrando conexión...");
                    break;
                }

                if (userInput.toLowerCase().trim() === 'historial') {
                    this.showConversationHistory();
                    continue;
                }

                if (userInput.toLowerCase().trim() === 'limpiar') {
                    this.clearHistory();
                    continue;
                }

                if (userInput.trim() === '') {
                    console.log("⚠️  Por favor, escribe una pregunta válida.");
                    continue;
                }

                // Agregar mensaje del usuario al historial
                this.addToHistory('user', userInput);

                console.log("\n🤔 Claude está pensando...");
                
                // Obtener respuesta de Claude con contexto del historial
                const response = await this.client.chatWithClaudeWithHistory(
                    userInput, 
                    this.formatHistoryForClaude()
                );
                
                console.log("\n🤖 Claude:", response.message);

                // Agregar respuesta de Claude al historial
                this.addToHistory('assistant', response.message, response.toolsUsed);

                // Mostrar herramientas usadas si las hay
                if (response.toolsUsed && response.toolsUsed.length > 0) {
                    console.log(`\n🔧 Herramientas utilizadas: ${response.toolsUsed.join(', ')}`);
                }
                
            } catch (error) {
                console.error("\n❌ Error durante la conversación:", error);
                console.log("🔄 Puedes intentar con otra pregunta.");
            }
        }

        await this.cleanup();
    }

    async cleanup() {
        try {
            await this.client.disconnect();
            this.rl.close();
            console.log("✅ Conexión cerrada correctamente.");
        } catch (error) {
            console.error("❌ Error al cerrar la conexión:", error);
        }
    }
}

// Función principal para ejecutar el chat interactivo
async function main() {
    const chat = new InteractiveChat();
    
    try {
        await chat.startChat();
    } catch (error) {
        console.error("❌ Error fatal:", error);
        process.exit(1);
    }
}

// Manejar interrupciones del usuario (Ctrl+C)
process.on('SIGINT', async () => {
    console.log("\n\n🛑 Interrupción detectada. Cerrando aplicación...");
    process.exit(0);
});

// Ejecutar solo si este archivo es el punto de entrada
if (require.main === module) {
    main().catch(console.error);
}

export { InteractiveChat };