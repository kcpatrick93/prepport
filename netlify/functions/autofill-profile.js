
import OpenAI from "openai";

export async function handler(event){
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors() };
  try{
    const { website } = JSON.parse(event.body || "{}");
    if(!website) return resp(400, { error: "website required" });
    const urls = dedupe(candidateUrls(website)).slice(0,5);
    const texts = [];
    for(const url of urls){
      try{
        const t = await fetchJina(url);
        if(t && t.length > 200) texts.push({url, text: t.slice(0,20000)});
      }catch{}
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `Summarise the SELLER company from the provided web page text.
Return strict JSON with fields:
- name (string)
- website (string)
- valueProposition (1-2 sentence string, plain English)
- keyBenefits (array of 3-6 short benefit phrases, no punctuation at end)`;

    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        website: { type: "string" },
        valueProposition: { type: "string" },
        keyBenefits: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 }
      },
      required: ["name","website","valueProposition","keyBenefits"]
    };

    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_schema", json_schema: { name: "seller_profile", schema, strict: true } },
      messages: [
        { role: "system", content: "You extract crisp website copy and convert it to sales-friendly company profiles." },
        { role: "user", content: prompt },
        { role: "user", content: JSON.stringify({ website, sources: texts }) }
      ]
    });
    const data = JSON.parse(res.choices[0].message.content);
    return resp(200, { profile: data });
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
function candidateUrls(base){
  try{
    const u = new URL(base);
    const roots = [u.origin, u.origin + "/"];
    const hints = ["/about", "/solutions", "/products", "/platform"];
    const list = new Set();
    roots.forEach(r => list.add(r));
    hints.forEach(h => list.add(u.origin + h));
    return Array.from(list);
  }catch{ return [base]; }
}
function dedupe(arr){ return Array.from(new Set(arr)); }
async function fetchJina(url){
  const target = /^https?:\/\//i.test(url) ? url : "https://" + url.replace(/^\/*/,''); 
  const via = "https://r.jina.ai/http/" + target.replace(/^https?:\/\//, '');
  const res = await fetch(via, { timeout: 15000 });
  if(!res.ok) throw new Error("fetch failed " + res.status);
  return await res.text();
}
