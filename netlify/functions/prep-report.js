const OpenAI = require("openai");

exports.handler = async function(event){
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors() };
  try{
    const { yourCompanyProfile, targetCompanyText, news, contact, target } = JSON.parse(event.body || "{}");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const system = `You are Prepport, an expert call-prep assistant that creates highly specific, actionable intelligence for salespeople.

CORE PRINCIPLES:
- Use ONLY the provided sources (company pages + news) to derive facts
- Be specific, concrete, and immediately actionable for discovery calls
- If a fact cannot be verified from sources, say "Unable to verify"
- Dates must be explicit in YYYY-MM-DD where possible
- Focus on what makes this prospect UNIQUE and different from competitors
- Identify specific pain points, challenges, and opportunities this prospect likely faces
- Tailor everything to whether the prospect might be a good fit for the seller's value proposition
- Provide intelligence that helps the salesperson sound informed and relevant

INTELLIGENCE FOCUS:
- Company's specific business model and revenue streams
- Recent strategic moves, funding, partnerships, or expansions
- Leadership changes, hiring patterns, or organizational shifts
- Technology stack, tools, or methodologies they use
- Competitive positioning and market challenges
- Growth stage indicators and scaling challenges
- Industry-specific trends affecting their business`;

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
            recentChanges: { type: "array", items: { type: "string" } },
            competitiveAdvantages: { type: "array", items: { type: "string" } },
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
            opportunities: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
            specificPainPoints: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
            growthChallenges: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 }
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
        { role: "user", content: "Build a highly specific, actionable discovery-call brief from the following JSON. Focus on unique intelligence that helps the salesperson understand what makes this prospect special, their specific challenges, and how the seller's value proposition might fit. Make it immediately useful for a sales call."},
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
