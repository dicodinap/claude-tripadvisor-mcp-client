import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Anthropic  } from "@anthropic-ai/sdk";
import * as dotenv from 'dotenv';

// Cargar variables de entorno desde .env
dotenv.config();

interface ChatResponse {
    message: string;
    toolsUsed: string[];
}

interface HistoryMessage {
    role: 'user' | 'assistant';
    content: string;
}

class MCPClient {
    
    private client: Client;
    private claudeClient: Anthropic | null = null;
    private transport: StdioClientTransport | null = null;
    private availableTools: any[] = [];

    constructor() {
       

        this.client = new Client({
            name: "client",
            version: "1.0.0",
            

        },
            { capabilities: {
                logging: { 
                    messageLevel: "info"
                }
            }, });

        // Inicializar claudeClient aquí o en connect()
        this.claudeClient = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }

    // Método específico para Tripadvisor MCP
    async connectToTripadvisorServer(tripadvisorApiKey: string) {
        try {
            const dockerArgs = [
                "run",
                "--rm",
                "-i",
                "-e", `TRIPADVISOR_API_KEY=${tripadvisorApiKey}`,
                "tripadvisor-mcp-server"
            ];

            this.transport = new StdioClientTransport({
                command: "docker",
                args: dockerArgs,
            });

            await this.client.connect(this.transport);
            console.log("Connected to Tripadvisor MCP server");

            const tools = await this.client.listTools();
            console.log("Available tools:", tools);
            this.availableTools = tools.tools || [];
            
        } catch (error) {
            console.error("Error connecting to Tripadvisor server:", error);
        }
    }

    // Obtener herramientas disponibles en formato compatible con Claude
    getClaudeTools() {
        return this.availableTools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema
        }));
    }

    // Ejecutar una herramienta MCP
    async executeTool(toolName: string, arguments_: any) {
        try {
            const result = await this.client.callTool({
                name: toolName,
                arguments: arguments_
            });
            return result;
        } catch (error) {
            console.error(`Error executing tool ${toolName}:`, error);
            throw error;
        }
    }

    // Método mejorado para chatear con Claude usando historial y mejor procesamiento
    async chatWithClaudeWithHistory(userMessage: string, conversationHistory: HistoryMessage[] = []): Promise<ChatResponse> {
        if (!this.claudeClient) {
            throw new Error("Claude client not initialized");
        }

        try {
            const claudeTools = this.getClaudeTools();
            const toolsUsed: string[] = [];
            
            // Construir el contexto de la conversación
            const systemPrompt = `Eres un asistente experto en viajes que ayuda a los usuarios a encontrar información sobre hoteles, restaurantes y atracciones turísticas. 

Tienes acceso a herramientas del servidor MCP de Tripadvisor que te permiten buscar información real y actualizada.

INSTRUCCIONES IMPORTANTES:
1. Cuando uses las herramientas MCP, procesa los resultados y presenta la información de manera clara y organizada
2. Incluye detalles relevantes como precios, ubicaciones, calificaciones y descripciones
3. Si hay errores en las herramientas, explica el problema de manera amigable
4. Mantén un tono conversacional y útil
5. Usa el contexto de conversaciones anteriores para dar respuestas más personalizadas
6. Organiza la información en listas o secciones cuando sea apropiado
7. Incluye recomendaciones basadas en la información obtenida

`;

            const messages = [
                // Agregar historial de conversación (solo las últimas 10 para no sobrecargar)
                ...conversationHistory.slice(-10),
                {
                    role: "user" as const,
                    content: systemPrompt + userMessage
                }
            ];

            const response = await this.claudeClient.messages.create({
                model: "claude-3-5-haiku-latest",
                max_tokens: 4000,
                messages: messages,
                tools: claudeTools
            });

            // Procesar la respuesta de Claude
            let finalResponse = "";
            
            for (const content of response.content) {
                if (content.type === "text") {
                    finalResponse += content.text;
                } else if (content.type === "tool_use") {
                    // Claude quiere usar una herramienta
                    console.log(`🔧 Ejecutando herramienta: ${content.name}`);
                    toolsUsed.push(content.name);
                    
                    try {
                        const toolResult = await this.executeTool(content.name, content.input);
                        
                        // Enviar el resultado de la herramienta de vuelta a Claude para procesamiento
                        const followUpResponse = await this.claudeClient.messages.create({
                            model: "claude-3-5-haiku-latest",
                            max_tokens: 4000,
                            messages: [
                                ...messages,
                                {
                                    role: "assistant",
                                    content: response.content
                                },
                                {
                                    role: "user",
                                    content: [
                                        {
                                            type: "tool_result",
                                            tool_use_id: content.id,
                                            content: JSON.stringify(toolResult.content)
                                        }
                                    ]
                                }
                            ],
                            tools: claudeTools
                        });
                        
                        // Procesar la respuesta final de Claude
                        for (const followUpContent of followUpResponse.content) {
                            if (followUpContent.type === "text") {
                                finalResponse += followUpContent.text;
                            } else if (followUpContent.type === "tool_use") {
                                // Si Claude quiere usar más herramientas, procesarlas también
                                console.log(`🔧 Ejecutando herramienta adicional: ${followUpContent.name}`);
                                toolsUsed.push(followUpContent.name);
                                
                                try {
                                    const additionalToolResult = await this.executeTool(followUpContent.name, followUpContent.input);
                                    
                                    // Procesar resultado adicional
                                    const finalFollowUpResponse = await this.claudeClient.messages.create({
                                        model: "claude-3-5-haiku-latest",
                                        max_tokens: 4000,
                                        messages: [
                                            ...messages,
                                            {
                                                role: "assistant",
                                                content: response.content
                                            },
                                            {
                                                role: "user",
                                                content: [
                                                    {
                                                        type: "tool_result",
                                                        tool_use_id: content.id,
                                                        content: JSON.stringify(toolResult.content)
                                                    }
                                                ]
                                            },
                                            {
                                                role: "assistant",
                                                content: followUpResponse.content
                                            },
                                            {
                                                role: "user",
                                                content: [
                                                    {
                                                        type: "tool_result",
                                                        tool_use_id: followUpContent.id,
                                                        content: JSON.stringify(additionalToolResult.content)
                                                    }
                                                ]
                                            }
                                        ],
                                        tools: claudeTools
                                    });
                                    
                                    for (const finalContent of finalFollowUpResponse.content) {
                                        if (finalContent.type === "text") {
                                            finalResponse += finalContent.text;
                                        }
                                    }
                                    
                                } catch (additionalToolError) {
                                    console.error(`Error ejecutando herramienta adicional ${followUpContent.name}:`, additionalToolError);
                                    finalResponse += `\n\n⚠️ Hubo un problema al obtener información adicional con ${followUpContent.name}.`;
                                }
                            }
                        }
                        
                    } catch (toolError) {
                        console.error(`Error ejecutando herramienta ${content.name}:`, toolError);
                        
                        // Informar a Claude sobre el error para que pueda responder apropiadamente
                        const errorResponse = await this.claudeClient.messages.create({
                            model: "claude-3-5-haiku-latest",
                            max_tokens: 4000,
                            messages: [
                                ...messages,
                                {
                                    role: "assistant",
                                    content: response.content
                                },
                                {
                                    role: "user",
                                    content: [
                                        {
                                            type: "tool_result",
                                            tool_use_id: content.id,
                                            content: `Error: ${toolError}`,
                                            is_error: true
                                        }
                                    ]
                                }
                            ]
                        });
                        
                        for (const errorContent of errorResponse.content) {
                            if (errorContent.type === "text") {
                                finalResponse += errorContent.text;
                            }
                        }
                    }
                }
            }
            
            return {
                message: finalResponse || "Lo siento, no pude generar una respuesta en este momento.",
                toolsUsed: toolsUsed
            };
            
        } catch (error) {
            console.error("Error in chat with Claude:", error);
            return {
                message: `Lo siento, hubo un error al procesar tu solicitud: ${error}`,
                toolsUsed: []
            };
        }
    }

    // Mantener el método original para compatibilidad
    async chatWithClaude(userMessage: string): Promise<string> {
        const response = await this.chatWithClaudeWithHistory(userMessage, []);
        return response.message;
    }

    // Método para cerrar la conexión
    async disconnect() {
        if (this.transport) {
            await this.transport.close();
        }
    }
}

export { MCPClient };