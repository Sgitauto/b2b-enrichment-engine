import fetch from 'node-fetch';

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_URL = 'https://google.serper.dev/search';
const cache = new Map();

function inferEmails(contactName, domain) {
  const [first, ...lastParts] = contactName.toLowerCase().split(/\s+/);
  const last = lastParts.join('.');
  return [
    `${first}.${last}@${domain}`,
    `${first}@${domain}`,
    `${last}@${domain}`,
    `${first.charAt(0)}.${last}@${domain}`,
    `contact@${domain}`,
  ];
}

async function searchEnrichedCompanies(businessType, location, count = 20) {
  const cacheKey = `${businessType}|${location}|${count}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const query = `${businessType} companies in ${location} CMO email contact`;
    const response = await fetch(SERPER_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: Math.min(count * 2, 100) }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();
    const companies = [];
    const processedDomains = new Set();

    for (const result of (data.searchResults || []).slice(0, count * 3)) {
      if (!result.link) continue;
      if (result.link.includes('linkedin.com/search') || result.link.includes('indeed.com')) continue;

      try {
        const url = new URL(result.link);
        const domain = url.hostname.replace('www.', '');

        if (processedDomains.has(domain)) continue;
        processedDomains.add(domain);

        const enriched = {
          company_name: result.title || domain,
          company_website: result.link,
          industry: businessType,
          location: location,
          contact_name: 'CMO',
          contact_title: 'Chief Marketing Officer',
          contact_email: `cmo@${domain}`,
          contact_phone: 'N/A',
          contact_linkedin: `https://linkedin.com/search/results/people/?keywords=CMO ${domain}`,
          data_confidence: 60,
          notes: 'Inferred from search results - Email pattern predicted',
        };

        companies.push(enriched);

        if (companies.length >= count) break;
      } catch (err) {
        continue;
      }
    }

    cache.set(cacheKey, companies);
    return companies;
  } catch (error) {
    console.error('Search enrichment error:', error);
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { businessType, location, listSize } = req.body;

  if (!businessType || !location) {
    return res.status(400).json({ error: 'Missing required fields: businessType and location' });
  }

  try {
    const count = Math.min(listSize || 20, 300);
    const companies = await searchEnrichedCompanies(businessType, location, count);

    return res.status(200).json({
      success: true,
      companies: companies,
      count: companies.length,
      message: companies.length === 0 ? 'No companies found - insufficient data' : `Found ${companies.length} companies`,
    });
  } catch (error) {
    console.error('API handler error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
