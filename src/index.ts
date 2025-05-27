import { MCPClient } from "./mcp-client";
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function main() {
    const client = new MCPClient();
    
    try {
        // Conectar al servidor Tripadvisor
        await client.connectToTripadvisorServer(process.env.TRIPADVISOR_API_KEY!);
        console.log("Connected to Tripadvisor server");

        // Ejemplo de uso: buscar hoteles en Madrid
        const userQuery = "Busca los mejores hoteles en Madrid, España. Quiero ver las opciones disponibles con sus precios y ubicaciones.";
        
        console.log("\n=== Consulta del usuario ===");
        console.log(userQuery);
        
        console.log("\n=== Procesando con Claude y herramientas MCP ===");
        const response = await client.chatWithClaude(userQuery);
        
        console.log("\n=== Respuesta de Claude ===");
        console.log(response);

        // Otro ejemplo: buscar restaurantes
        const restaurantQuery = "¿Puedes encontrar los mejores restaurantes en Barcelona? Me interesan especialmente los de comida mediterránea.";
        
        console.log("\n\n=== Segunda consulta ===");
        console.log(restaurantQuery);
        
        console.log("\n=== Procesando segunda consulta ===");
        const restaurantResponse = await client.chatWithClaude(restaurantQuery);
        
        console.log("\n=== Segunda respuesta ===");
        console.log(restaurantResponse);

    } catch (error) {
        console.error("Error en la aplicación:", error);
    } finally {
        // Cerrar la conexión
        await client.disconnect();
        console.log("\nConexión cerrada.");
    }
}

main().catch(console.error);