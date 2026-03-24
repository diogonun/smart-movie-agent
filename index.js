require("dotenv").config();
const express = require("express");
const Groq = require("groq-sdk");

const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "troque-esta-chave";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OMDB_API_KEY = process.env.OMDB_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const groq = new Groq({
  apiKey: GROQ_API_KEY
});

function validateApiKey(req, res, next) {
  const apiKeyFromHeader = req.header("x-api-key");
  const apiKeyFromQuery = req.query.apiKey;
  const providedApiKey = apiKeyFromHeader || apiKeyFromQuery;

  if (!providedApiKey) {
    return res.status(401).json({
      error: "API key ausente. Envie em 'x-api-key' ou 'apiKey'."
    });
  }

  if (providedApiKey !== API_KEY) {
    return res.status(403).json({
      error: "API key inválida."
    });
  }

  next();
}

/**
 * Tool OMDb - busca textual
 */
async function searchOmdb({ query, type, year }) {
  const params = new URLSearchParams({
    apikey: OMDB_API_KEY,
    s: query
  });

  if (type) params.append("type", type);
  if (year) params.append("y", String(year));

  const url = `https://www.omdbapi.com/?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.Response === "False") {
    return {
      success: false,
      error: data.Error || "Nenhum resultado encontrado.",
      results: []
    };
  }

  return {
    success: true,
    totalResults: Number(data.totalResults || 0),
    results: (data.Search || []).slice(0, 6).map((item) => ({
      title: item.Title,
      year: item.Year,
      imdbID: item.imdbID,
      type: item.Type,
      poster: item.Poster
    }))
  };
}

const tools = [
  {
    type: "function",
    function: {
      name: "search_omdb_titles",
      description:
        "Busca títulos na OMDb para ajudar em recomendações e confirmação de obras reais. Use quando precisar sugerir obras concretas, validar um título, desambiguar nomes ou buscar opções compatíveis com um gênero, tema ou tipo de mídia.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Busca principal. Pode ser um gênero, título, tema, franquia ou descrição curta do que o usuário quer assistir."
          },
          type: {
            type: "string",
            enum: ["movie", "series", "episode"],
            description:
              "Tipo de mídia quando estiver claro. Para novelas e conteúdos seriados, prefira 'series'."
          },
          year: {
            type: "integer",
            description:
              "Ano quando mencionado explicitamente pelo usuário."
          }
        },
        required: ["query"],
        additionalProperties: false
      }
    }
  }
];


function buildSystemPrompt() {
    return `
  Você é o smartMovieAgent, um agente especialista em recomendação de conteúdo audiovisual.
  
  Seu trabalho é analisar a mensagem do usuário e responder APENAS em JSON válido, sem markdown, sem explicações extras, sem texto antes ou depois.
  
  Você deve sempre retornar exatamente este formato:
  {
    "answer": "string",
    "intention": "recomendar_filme" | "recomendar_serie" | "finalizar_conversa" | "fallback_generico",
    "handled": true | false
  }
  
  Regras de idioma:
  - O usuário pode escrever em português ou inglês.
  - Você DEVE sempre responder em português do Brasil.
  - Os títulos de filmes, séries e outras obras recomendadas devem ser apresentados em inglês, nunca traduzidos para o português.
  
  Regras de classificação:
  - "recomendar_filme":
    Use quando o usuário pedir filme, longa, documentário de filme, animação de cinema, ou quando for possível interpretar o pedido dentro desse contexto.
  - "recomendar_serie":
    Use quando o usuário pedir série, novela, minissérie, dorama, anime seriado, documentário seriado, ou quando fizer sentido adaptar (ex: novela → série).
  - "finalizar_conversa":
    Use quando o usuário quiser encerrar, agradecer, se despedir.
  - "fallback_generico":
    Use SOMENTE quando a mensagem estiver claramente fora do domínio de filmes/séries ou completamente impossível de interpretar.
  
  Regra CRÍTICA de decisão:
  - Se houver QUALQUER possibilidade razoável de interpretar a mensagem como pedido de recomendação de entretenimento audiovisual, você DEVE classificar como:
    → "recomendar_filme" (padrão)
    → ou "recomendar_serie" (se fizer mais sentido)
  - Evite ao máximo usar "fallback_generico".
  
  Regras para "handled":
  - true: quando você conseguiu interpretar e responder com segurança
  - false: apenas quando realmente não for possível interpretar o pedido
  
  Regras para o campo "answer":
  - Responda em português do Brasil.
  - Seja natural, curta e objetiva.
  - Quando a intenção for "recomendar_filme" ou "recomendar_serie":
    - Sempre recomende 3 ou 4 opções
    - Inclua justificativa breve para cada uma
  - IMPORTANTE:
    - NUNCA faça perguntas quando a intenção for "fallback_generico"
    - No fallback, apenas informe educadamente que seu escopo é filmes e séries
  
  Exemplo de fallback correto:
  "Posso te ajudar com recomendações de filmes e séries, mas não consigo responder esse tipo de pedido."
  
  Regras de uso da tool:
  - Use a tool quando precisar de títulos reais ou confirmação
  - Não use para despedidas
  - Não use em fallback
  
  Importante:
  - Saída deve ser JSON válido
  - Não incluir campos extras
  - "intention" deve ser exatamente um dos 4 valores
  - "handled" deve ser booleano real
  `;
  }


function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Não foi possível localizar JSON na resposta do modelo.");
    }
    return JSON.parse(match[0]);
  }
}


function sanitizeFinalResponse(obj) {
    const allowedIntentions = new Set([
      "recomendar_filme",
      "recomendar_serie",
      "finalizar_conversa",
      "fallback_generico"
    ]);
  
    let answer = typeof obj.answer === "string" ? obj.answer.trim() : "";
    let intention = typeof obj.intention === "string" ? obj.intention.trim() : "";
    let handled = typeof obj.handled === "boolean" ? obj.handled : false;
  
    if (!allowedIntentions.has(intention)) {
      intention = "fallback_generico";
      handled = false;
    }
  
    // fallback nunca pergunta
    if (intention === "fallback_generico") {
      answer =
        "Posso te ajudar com recomendações de filmes e séries, mas não consigo responder esse tipo de pedido.";
    }
  
    // fallback de segurança geral
    if (!answer) {
      if (intention === "finalizar_conversa") {
        answer =
          "Tudo certo. Quando quiser mais recomendações de filmes ou séries, é só me chamar.";
      } else if (intention === "fallback_generico") {
        answer =
          "Posso te ajudar com recomendações de filmes e séries, mas não consigo responder esse tipo de pedido.";
      } else {
        answer =
          "Aqui vão algumas sugestões que podem combinar com o que você procura.";
      }
    }
  
    return { answer, intention, handled };
  }


async function runSmartMovieAgent(userMessage) {
  const messages = [
    {
      role: "system",
      content: buildSystemPrompt()
    },
    {
      role: "user",
      content: userMessage
    }
  ];

  const firstResponse = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages,
    tools,
    tool_choice: "auto",
    temperature: 0.3
  });

  const firstMessage = firstResponse.choices?.[0]?.message;

  if (!firstMessage) {
    throw new Error("Resposta vazia do modelo.");
  }

  if (firstMessage.tool_calls && firstMessage.tool_calls.length > 0) {
    messages.push(firstMessage);

    for (const toolCall of firstMessage.tool_calls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments || "{}");

      let toolResult = {
        success: false,
        error: "Tool não implementada."
      };

      if (functionName === "search_omdb_titles") {
        toolResult = await searchOmdb(args);
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult)
      });
    }

    const secondResponse = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      temperature: 0.3
    });

    const finalContent = secondResponse.choices?.[0]?.message?.content || "";
    return sanitizeFinalResponse(extractJson(finalContent));
  }

  const finalContent = firstMessage.content || "";
  return sanitizeFinalResponse(extractJson(finalContent));
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "smart-movie-agent",
    message: "API online."
  });
});

app.get("/smartMovieAgent", validateApiKey, async (req, res) => {
  try {
    const userMessage = req.query.message;

    if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
      return res.status(400).json({
        error: "Parâmetro 'message' é obrigatório e deve ser uma string."
      });
    }

    const result = await runSmartMovieAgent(userMessage.trim());

    return res.status(200).json(result);
  } catch (error) {
    console.error("Erro no smartMovieAgent:", error);

    return res.status(500).json({
      answer: "Tive um problema ao processar sua mensagem. Tente pedir uma recomendação de filme ou série novamente.",
      intention: "fallback_generico",
      handled: false
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    answer: "Rota não encontrada.",
    intention: "fallback_generico",
    handled: false
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
