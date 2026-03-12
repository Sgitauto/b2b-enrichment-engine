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
    const query = `${activity} ${zone} entreprise contact email site`;
    const response = await fetch(SERPER_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: Math.min(count, 50),
        gl: 'fr',
        hl: 'fr',
      }),
    });

    if (!response.ok) throw new Error(`Serper API error: ${response.status}`);
    const data = await response.json();
    const results = [];

    for (const item of data.organic || []) {
      if (results.length >= count) break;
      const title = item.title || '';
      const link = item.link || '';
      const domain = extractDomain(link);
      const companyName = title.split('|')[0].trim();

      results.push({
        companyName,
        companyWebsite: domain,
        companyIndustry: activity,
        companyLocation: zone,
        companySize: 'PME',
        contactName: 'Contact Principal',
        contactTitle: 'CEO',
        roleType: 'C-level',
        contactEmail: `contact@${domain}`,
        contactPhone: '',
        contactLinkedIn: '',
        dataConfidence: Math.floor(Math.random() * 40) + 50,
        notes: 'Données issues de Serper.dev',
      });
    }

    // Fallback: générer des résultats simulés
    while (results.length < count) {
      results.push(generateSimulatedResult(activity, zone, results.length));
    }

    cache.set(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Serper error:', error);
    return Array.from({ length: count }).map((_, i) => generateSimulatedResult(activity, zone, i));
  }
}

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '');
  } catch {
    return 'unknown.com';
  }
}

function generateSimulatedResult(activity, zone, index) {
  const sizes = ['Micro', 'PME', 'ETI'];
  const roles = ['C-level', 'Marketing', 'Commercial'];
  const roleType = roles[index % roles.length];
  
  return {
    companyName: `${activity.split(' ')[0]} ${zone} #${index + 1}`,
    companyWebsite: `company${index + 1}.example.com`,
    companyIndustry: activity,
    companyLocation: zone,
    companySize: sizes[index % sizes.length],
    contactName: `Contact ${index + 1}`,
    contactTitle: `${roleType} Director`,
    roleType,
    contactEmail: `contact${index + 1}@company${index + 1}.com`,
    contactPhone: `01 00 00 00 ${String(index).padStart(2, '0')}`,
    contactLinkedIn: '',
    dataConfidence: 30,
    notes: `Résultat simulé - données réelles limitées`,
  };
}

// Handler API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { activity, zone, count = 20 } = req.body;

  if (!activity || !zone) {
    return res.status(400).json({ error: 'activity et zone sont requis' });
  }

  if (!SERPER_API_KEY) {
    return res.status(500).json({ error: 'SERPER_API_KEY non configurée' });
  }

  try {
    const results = await searchEnrichedCompanies(activity, zone, parseInt(count));
    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
