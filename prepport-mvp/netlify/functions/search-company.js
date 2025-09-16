export async function handler(event){
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors() };
  try{
    const { companyName } = JSON.parse(event.body || "{}");
    if(!companyName) return resp(400, { error: "companyName required" });
    const apiKey = process.env.TAVILY_API_KEY;
    if(!apiKey){
      return resp(200, { news: [] }); // No key? Return empty and let LLM rely on site content.
    }
    const payload = {
      query: companyName + " funding OR press release OR raises OR launches OR partnership",
      search_depth: "advanced",
      include_answer: False,
      max_results: 5,
      days: 365
    };
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization": "Bearer " + apiKey },
      body: JSON.stringify(payload)
    });
    if(!res.ok) return resp(200, { news: [] });
    const data = await res.json();
    const news = (data.results || []).map(r => ({
      title: r.title, url: r.url, date: (r.published_date || "").slice(0,10), snippet: r.content
    }));
    return resp(200, { news });
  }catch(e){
    return resp(200, { news: [] });
  }
}

function cors(){ return {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};}
function resp(code, body){ return { statusCode: code, headers: cors(), body: JSON.stringify(body) }; }
