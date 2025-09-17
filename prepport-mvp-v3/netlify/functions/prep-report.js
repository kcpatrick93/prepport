const OpenAI = require("openai");

exports.handler = async function(event){
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors() };
  try{
    const { yourCompanyProfile, targetCompanyText, news, contact, target } = JSON.parse(event.body || "{}");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const system = `You are Prepport, a universal call-prep assistant for salespeople.
- Use ONLY the provided sources (company pages + news) to derive facts.
- Be concise, specific, and practical for a discovery call.
- If a fact cannot be verified from sources, say "Unable to verify".
- Dates must be explicit in YYYY-MM-DD where possible.
- Tailor output to whether the prospect might be a good fit for the seller's value proposition.
- Focus on business intelligence that helps any salesperson understand their prospect better.`;

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
            industry: { type: "string" },
            businessModel: { type: "string" },
            keyMetrics: { type: "array", items: { type: "string" } },
            funding: {
              type: "object",
              properties: {
                lastRound: { type: "string" },
                date: { type: "string" },
                investors: { type: "array", items: { type: "string" } },
                totalRaised: { type: "string" }
              },
              additionalProperties: false
            }
          },
          required: ["whatTheyDo"],
          additionalProperties: false
        },
        leadWithIntelligence: {
          type: "object",
          properties: {
            openingStatement: { type: "string" },
            bullets: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 }
          },
          required: ["openingStatement","bullets"],
          additionalProperties: false
        },
        questions: {
          type: "object",
          properties: {
            step4: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 }
          },
          required: ["step4"],
          additionalProperties: false
        },
        painPoints: {
          type: "object",
          properties: {
            potentialChallenges: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
            opportunities: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 }
          },
          additionalProperties: false
        },
        sources: {
          type: "object",
          properties: {
            pages: { type: "array", items: { type: "object", properties: { url:{type:"string"}, excerpt:{type:"string"} } } },
            news: { type: "array", items: { type: "object", properties: { title:{type:"string"}, url:{type:"string"}, date:{type:"string"} } } }
          },
          additionalProperties: false
        }
      },
      required: ["summary","leadWithIntelligence","questions","sources"],
      additionalProperties: false
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_schema", json_schema: { name: "meeting_prep", schema, strict: true } },
      messages: [
        { role: "system", content: system },
        { role: "user", content: "Build a grounded discovery-call brief from the following JSON. Focus on universal business intelligence that helps any salesperson understand their prospect better."},
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
