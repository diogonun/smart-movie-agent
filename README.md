# 🎬 smartMovieAgent

![Node.js](https://img.shields.io/badge/node.js-18+-green)
![Express](https://img.shields.io/badge/express-4.x-blue)
![Groq](https://img.shields.io/badge/LLM-Groq-purple)
![Status](https://img.shields.io/badge/status-ready-success)

API HTTP em **Node.js + Express** que expõe um agente inteligente de recomendação de conteúdo audiovisual, com integração ao **Groq** e uso da **OMDb** como tool.

---

## 📌 Visão Geral

Este projeto implementa um agente capaz de:

* interpretar mensagens de usuários (PT ou EN)
* classificar intenção
* recomendar filmes/séries com contexto
* usar API externa quando necessário
* retornar resposta estruturada em JSON

---

## 🎯 Objetivo

O agente é especializado em recomendações de:

* filmes
* séries
* novelas
* documentários
* minisséries
* doramas
* conteúdos audiovisuais relacionados

Ele deve:

* identificar a intenção principal da mensagem
* responder sempre em **português do Brasil**
* entender mensagens em **português ou inglês**
* recomendar conteúdos com **títulos em inglês (não traduzidos)**
* evitar fallback desnecessário
* usar a **OMDb** quando fizer sentido
* retornar uma resposta estruturada em JSON

---

## 📦 Formato da resposta

```json
{
  "answer": "string",
  "intention": "recomendar_filme",
  "handled": true
}
```

### 🎯 Intenções possíveis

| Intenção           | Descrição                      |
| ------------------ | ------------------------------ |
| recomendar_filme   | Pedido de filme ou equivalente |
| recomendar_serie   | Série, novela, minissérie      |
| finalizar_conversa | Encerramento                   |
| fallback_generico  | Fora de escopo                 |

---

## 🧠 Como o agente funciona

1. Recebe mensagem via endpoint HTTP
2. Envia para o modelo Groq com:

   * prompt estruturado
   * regras de intenção
   * tool OMDb
3. O modelo decide:

   * responder direto
   * ou chamar a tool
4. Backend executa tool (se necessário)
5. Modelo gera resposta final
6. Backend valida e retorna JSON

---

## 🚀 Como rodar o projeto

### 1. Clone

```bash
git clone <SEU_REPO>
cd smart-movie-agent
```

### 2. Instale

```bash
npm install
```

### 3. Configure `.env`

```env
PORT=3000
API_KEY=sua-chave
GROQ_API_KEY=sua-chave-groq
OMDB_API_KEY=sua-chave-omdb
GROQ_MODEL=llama-3.3-70b-versatile
```

### 4. Execute

```bash
npm start
```

---

## 🔗 Endpoint

### `GET /smartMovieAgent`

#### Exemplo

```bash
curl -H "x-api-key: sua-chave" \
"http://localhost:3000/smartMovieAgent?message=quero%20um%20filme%20de%20acao"
```

---

## 🧪 Exemplos

<details>
<summary>🎥 Recomendação de filme</summary>

```json
{
  "answer": "Se você curte terror, eu recomendo Hereditary, The Conjuring, It e The Babadook. Hereditary é mais psicológico e intenso; The Conjuring funciona muito bem para quem gosta de suspense sobrenatural; It mistura terror com aventura; e The Babadook é ótimo para quem curte algo mais sombrio e simbólico.",
  "intention": "recomendar_filme",
  "handled": true
}
```

</details>

<details>
<summary>📺 Recomendação de série</summary>

```json
{
  "answer": "Se você gosta de suspense, eu recomendo Dark, Mindhunter, The Sinner e Sharp Objects. Dark é ótima para quem curte mistério mais complexo; Mindhunter aposta em investigação psicológica; The Sinner traz casos intrigantes; e Sharp Objects tem um clima mais denso e dramático.",
  "intention": "recomendar_serie",
  "handled": true
}
```

</details>

<details>
<summary>👋 Finalizar conversa</summary>

```json
{
  "answer": "Tudo certo. Quando quiser mais recomendações, é só me chamar.",
  "intention": "finalizar_conversa",
  "handled": true
}
```

</details>

<details>
<summary>⚠️ Fallback</summary>

```json
{
  "answer": "Posso te ajudar com recomendações de filmes e séries, mas não consigo responder esse tipo de pedido.",
  "intention": "fallback_generico",
  "handled": false
}
```

</details>

---

## 🧩 Prompt utilizado

<details>
<summary>Ver prompt completo</summary>

```text
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
  Use quando o usuário pedir filme ou equivalente.
- "recomendar_serie":
  Use para séries, novelas ou conteúdo seriado.
- "finalizar_conversa":
  Use quando o usuário encerrar.
- "fallback_generico":
  Use somente fora de escopo.

Regra crítica:
- Sempre tentar interpretar como recomendação antes de fallback.

Regras de resposta:
- Sempre sugerir 3 ou 4 títulos.
- Explicar brevemente cada sugestão.
- Nunca fazer perguntas no fallback.

Saída:
- JSON válido
- Sem campos extras
```

</details>

---

## 🔧 Tool: OMDb

```json
{
  "name": "search_omdb_titles",
  "description": "Busca títulos na OMDb",
  "parameters": {
    "query": "string",
    "type": "movie | series | episode",
    "year": "number"
  }
}
```

---

## 🧠 Decisões técnicas

### ✔ Saída estruturada (JSON)

Facilita integração e avaliação.

### ✔ Classificação + geração

O agente entende e responde simultaneamente.

### ✔ Evitar fallback

Sempre tenta interpretar antes de desistir.

### ✔ Multilíngue (entrada)

Input EN/PT → Output sempre PT-BR.

### ✔ Tool calling autônomo

Modelo decide quando usar OMDb.

### ✔ Fallback sem pergunta

Resposta direta e objetiva.

### ✔ 3–4 recomendações

Padroniza qualidade da resposta.

### ✔ Validação no backend

Garante consistência do output.

### ✔ Títulos em inglês

Os nomes das obras são mantidos em inglês para evitar ambiguidade e manter consistência com bases internacionais.

---

## 🔐 Segurança

API protegida por API Key:

* Header: `x-api-key`
* Query: `apiKey`

---

## ☁️ Deploy

Compatível com **Render**:

* Build: `npm install`
* Start: `npm start`

---

## 🔮 Melhorias futuras

* arquitetura em camadas
* testes automatizados
* segunda tool OMDb (detalhes)
* logging estruturado
* métricas de uso

---

## 👨‍💻 Autor

Projeto desenvolvido como teste técnico de agente inteligente para recomendação de filmes e séries.
