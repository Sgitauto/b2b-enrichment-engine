import fetch from 'node-fetch';

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_URL = 'https://google.serper.dev/search';
const cache = new Map();

// Inférence de patterns d'email
function inferEmails(contactName, domain) {
  const [first, ...lastParts] = contactName.toLowerCase().split(/\s+/);
  const last = lastParts.join('.');
  return [
    `${first}.${last}@${domain}`,
    `${first}@${domain}`,
    `${last}@${domain}`,
    `${first.charAt(0)}.${last}@${domain}`,
    `${last}@${domain}`,
    `contact@${domain}`,
  ];
}

// Fonction principale de recherche
async function searchEnrichedCompanies(activity, zone, count = 20) {
  const cacheKey = `${activity}|${zone}|${count}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const query = `${activity} companies ${zone} contact email`;
    const response = await fetch(SERPER_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: count * 2 }),
    });

    if (!response.ok) throw new Error(`Serper error: ${response.status}`);
    const data = await response.json();

    const companies = [];
    for (const result of (data.searchResults || []).slice(0, count)) {
      if (!result.link || result.link.includes('linkedin.com/search')) continue;

      try {
        const domain = new URL(result.link).hostname.replace('www.', '');
        const enriched = {
          name: result.title || 'N/A',
          website: result.link,
          industry: activity,
          location: zone,
          contactName: 'N/A',
          contactTitle: 'CMO',
          contactEmail: `contact@${domain}`,
          contactPhone: 'N/A',
          contactLinkedIn: `https://linkedin.com/search/results/people/?keywords=${encodeURIComponent(activity)} CMO`,
          confidence: 65,
          notes: 'Inferred from search results',
        };
        companies.push(enriched);
      } catch (err) {
        continue;
      }
    }

    cache.set(cacheKey, companies);
    return companies.slice(0, count);
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

// Handler API
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { companyType, zone, maxResults } = req.body;
  if (!companyType || !zone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const results = await searchEnrichedCompanies(companyType, zone, Math.min(maxResults || 50, 300));
  return res.status(200).json({ results });
}
