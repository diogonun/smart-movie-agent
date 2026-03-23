require("dotenv").config();
const express = require("express");

const app = express();

const PORT = process.env.PORT;
const API_KEY = process.env.API_KEY;

/**
 * API Key implementada de maneira simples
 * TODO: substituir por melhores práticas de API Security
 * Aceita:
 * - header: x-api-key
 * - ou query param: apiKey
 */
function validateApiKey(req, res, next) {
  const apiKeyFromHeader = req.header("x-api-key");
  const apiKeyFromQuery = req.query.apiKey;

  const providedApiKey = apiKeyFromHeader || apiKeyFromQuery;

  if (!providedApiKey) {
    return res.status(401).json({
      success: false,
      error: "API key ausente. Envie em 'x-api-key' ou 'apiKey'."
    });
  }

  if (providedApiKey !== API_KEY) {
    return res.status(403).json({
      success: false,
      error: "API key inválida."
    });
  }

  next();
}

/**
 * Healthcheck
 */
app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "smart-movie-agent",
    message: "API online."
  });
});

/**
 * Endpoint principal
 * 
 * Exemplo:
 * GET /smartMovieAgent?message=quero%20um%20filme
 */
app.get("/smartMovieAgent", validateApiKey, (req, res) => {
  const userMessage = req.query.message;

  if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
    return res.status(400).json({
      success: false,
      error: "Parâmetro 'message' é obrigatório e deve ser uma string."
    });
  }

  // vou inserir aqui lógica


  // Resposta fake/estática, apenas para montar a casca
  return res.status(200).json({
    success: true,
    endpoint: "smartMovieAgent",
    receivedMessage: userMessage,
    timestamp: new Date().toISOString(),
    agentResponse: {
      intent: "movie_recommendation",
      reply: "Aqui futuramente virá a resposta inteligente do agente.",
      recommendedMovie: {
        title: "The Example Movie",
        year: 2024,
        genre: "Sci-Fi",
        rating: 8.7
      },
      metadata: {
        source: "fake-static-response",
        language: "pt-BR",
        version: "1.0.0"
      }
    }
  });
});

/**
 * 404
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Rota não encontrada."
  });
});

/**
 * Erro genérico
 */
app.use((err, req, res, next) => {
  console.error("Erro interno:", err);

  res.status(500).json({
    success: false,
    error: "Erro interno do servidor."
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
