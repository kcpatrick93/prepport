import OpenAI from "openai";

export async function handler(event){
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors() };
  try{
    const { yourCompanyProfile, targetCompanyText, news, contact, target } = JSON.parse(event.body || "{}");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const system = `You are Prepport, a call-prep assistant for B2B sellers.
- Use ONLY the provided sources (company pages + news) to derive facts.
- Be concise, specific, and practical for a discovery call.
- If a fact cannot be verified from sources, say "Unable to verify".
- Dates must be explicit in YYYY-MM-DD where possible.
- Tailor output to whether the prospect might be a good fit for the seller's value proposition.`;

    const user = {
      yourCompanyProfile,
      target,
      contact,
      sources: {
        pages: (targetCompanyText||[]).map(p => ({ url: p.url, excerpt: p.text?.slice(0, 16000) })),
        news: (news||[])
      }
    };

    const schema = {
      type: "object",
      properties: {
        summary: {
          type: "object",
          properties: {
            whatTheyDo: { type: "string" },
            founded: { type: "string" },
            size: { type: "string" },
            hq: { type: "string" },
            funding: {
              type: "object",
              properties: {
                lastRound: { type: "string" },
                date: { type: "string" },
                investors: { type: "array", items: { type: "string" } }
              }
            }
          },
          required: ["whatTheyDo"]
        },
        leadWithIntelligence: {
          type: "object",
          properties: {
            openingStatement: { type: "string" },
            bullets: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 }
          },
          required: ["openingStatement","bullets"]
        },
        questions: {
          type: "object",
          properties: {
            step4: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 }
          },
          required: ["step4"]
        },
        sources: {
          type: "object",
          properties: {
            pages: { type: "array", items: { type: "object", properties: { url:{type:"string"}, excerpt:{type:"string"} } } },
            news: { type: "array", items: { type: "object", properties: { title:{type:"string"}, url:{type:"string"}, date:{type:"string"} } } }
          }
        }
      },
      required: ["summary","leadWithIntelligence","questions","sources"]
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_schema", json_schema: { name: "meeting_prep", schema, strict: True } },
      messages: [
        { role: "system", content: system },
        { role: "user", content: "Build a grounded discovery-call brief from the following JSON."},
        { role: "user", content: JSON.stringify(user) }
      ]
    });

    const text = completion.choices[0].message.content;
    return resp(200, JSON.parse(text));
  }catch(e){
    return resp(500, { error: e.message || String(e) });
  }
}

function cors(){ return {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};}
function resp(code, body){ return { statusCode: code, headers: cors(), body: JSON.stringify(body) }; }
