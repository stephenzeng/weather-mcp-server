import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const server = new McpServer({
  name: "Weather MCP Server",
  version: "1.0.0",
});

const getCurrentWeatherByCity = server.tool(
  "get-current-weather-by-city",
  "Get current weather information by city",
  {
    city: z.string().describe("Name of the city"),
  },
  async (params: { city: string }) => {
    const response = await fetch(
      `https://goweather.xyz/weather/${params.city}`
    );
    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: `${data?.description}, ${data?.temperature}, ${data?.wind}.`,
        },
      ],
    };
  }
);

/*
const getWeatherForecastByCity = server.tool(
  "get-weather-forecast-by-city",
  "Get weather forecast information by city",
  {
    city: z.string().describe("Name of the city"),
  },
  async (params: { city: string }) => {
    const response = await fetch(
      `https://goweather.xyz/weather/${params.city}`
    );
    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: data?.forecast,
        },
      ],
    };
  }
);
*/

const app = express();
app.use(express.json());

const transport: StreamableHTTPServerTransport =
  new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // set to undefined for stateless servers
  });

// Setup routes for the server
const setupServer = async () => {
  await server.connect(transport);
};

app.post("/mcp", async (req: Request, res: Response) => {
  console.log("Received MCP request:", req.body);
  try {
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

app.get("/mcp", async (req: Request, res: Response) => {
  console.log("Received GET MCP request");
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    })
  );
});

app.delete("/mcp", async (req: Request, res: Response) => {
  console.log("Received DELETE MCP request");
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    })
  );
});

// Start the server
const PORT = process.env.PORT || 3000;
setupServer()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`MCP Streamable HTTP Server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to set up the server:", error);
    process.exit(1);
  });
