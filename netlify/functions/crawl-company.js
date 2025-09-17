
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors() };
  try{
    const { website } = JSON.parse(event.body || "{}");
    if(!website) return resp(400, { error: "website required" });
    const urls = dedupe(candidateUrls(website)).slice(0,6);
    const pages = [];
    for(const url of urls){
      try{
        const text = await fetchJina(url);
        if(text && text.length > 200){
          pages.push({ url, text: text.slice(0, 40000) });
        }
      }catch{ /* ignore */ }
    }
    return resp(200, { pages });
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
    const hints = ["/about", "/company", "/solutions", "/products", "/platform", "/customers", "/press", "/news", "/blog"];
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
