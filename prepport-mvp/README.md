# Prepport — MVP

Grounded call-prep in minutes. Static frontend + Netlify Functions. No API keys in the browser.

## Quick start

1. **Clone/upload** this folder to a new repo.
2. On Netlify:
   - New site → Import from Git
   - Set build settings:
     - Publish directory: `public`
     - Functions directory: `netlify/functions`
   - Add environment variables:
     - `OPENAI_API_KEY` = your key
     - (optional) `TAVILY_API_KEY` = for recent-news search
3. Deploy. Open the site and click **Generate call prep**.

## How it works

- `crawl-company.js` uses Jina Reader to fetch readable text for the homepage and a few likely subpages.
- `search-company.js` queries Tavily (if key set) for the last 12 months.
- `prep-report.js` sends only the crawled text + news to OpenAI and forces a strict JSON response.
- The frontend renders the concise summary, “lead with intelligence”, and a short list of sharp questions.

## Local development

```bash
npm i
npx netlify dev
```
Open `http://localhost:8888`

## Notes

- We intentionally avoid scraping LinkedIn (ToS). Provide title manually for now.
- You can swap Jina Reader for Firecrawl later if you need more reliability.
- Keep the OpenAI model on `gpt-4o-mini` to stay cheap; upgrade only if needed.
