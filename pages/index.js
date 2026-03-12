import React, { useState } from 'react';
import fetch from 'node-fetch';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

export default function Home() {
  const [businessType, setBusinessType] = useState('');
  const [location, setLocation] = useState('');
  const [listSize, setListSize] = useState('20');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);
    setSummary('');

    try {
      const response = await fetch('/api/enrichment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType,
          location,
          listSize: parseInt(listSize)
        })
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data.companies || []);
      setSummary(`Found ${data.companies?.length || 0} relevant companies`);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
      setSummary('');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setBusinessType('');
    setLocation('');
    setListSize('20');
    setResults([]);
    setError('');
    setSummary('');
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;

    const headers = [
      'Company_Name', 'Company_Website', 'Company_Industry', 'Company_Location',
      'Contact_Name', 'Contact_Title', 'Contact_Email', 'Contact_Phone',
      'Contact_LinkedIn', 'Data_Confidence', 'Notes'
    ];

    const rows = results.map(r => [
      r.company_name || '',
      r.company_website || '',
      r.industry || '',
      r.location || '',
      r.contact_name || '',
      r.contact_title || '',
      r.contact_email || '',
      r.contact_phone || '',
      r.contact_linkedin || '',
      r.data_confidence || 0,
      r.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'b2b_leads.csv';
    link.click();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>B2B Lead Enrichment Engine</h1>
        <p>Recherche d'entreprises + Détails de contact avec Serper.dev API</p>
      </div>

      <form onSubmit={handleSearch} style={styles.form}>
        <div style={styles.inputGroup}>
          <label>Type d'entreprise / activité:</label>
          <input
            type="text"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            placeholder="Ex: SaaS, Marketing Agency, eCommerce"
            required
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label>Zone géographique:</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex: France, Paris, Europe"
            required
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label>Taille de la liste:</label>
          <select value={listSize} onChange={(e) => setListSize(e.target.value)} style={styles.input}>
            {[10, 20, 30, 40, 50, 75, 100, 150, 200, 250, 300].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        <div style={styles.buttonGroup}>
          <button type="submit" disabled={loading} style={{...styles.button, ...styles.primaryButton}}>
            {loading ? 'Recherche en cours...' : 'Rechercher et enrichir'}
          </button>
          <button type="button" onClick={handleReset} style={{...styles.button, ...styles.secondaryButton}}>
            Réinitialiser
          </button>
          {results.length > 0 && (
            <button type="button" onClick={handleExportCSV} style={{...styles.button, ...styles.exportButton}}>
              Exporter CSV
            </button>
          )}
        </div>
      </form>

      {error && <div style={styles.error}>{error}</div>}

      {results.length > 0 && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Company</th>
                <th>Website</th>
                <th>Industry</th>
                <th>Location</th>
                <th>Contact</th>
                <th>Title</th>
                <th>Email</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.company_name}</td>
                  <td><a href={r.company_website} target="_blank" rel="noopener noreferrer">{r.company_website}</a></td>
                  <td>{r.industry}</td>
                  <td>{r.location}</td>
                  <td>{r.contact_name}</td>
                  <td>{r.contact_title}</td>
                  <td><a href={`mailto:${r.contact_email}`}>{r.contact_email}</a></td>
                  <td>{r.data_confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary && <div style={styles.summary}>{summary}</div>}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f5f5'
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    borderBottom: '2px solid #007bff',
    paddingBottom: '20px'
  },
  form: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  inputGroup: {
    marginBottom: '15px'
  },
  input: {
    width: '100%',
    padding: '10px',
    marginTop: '5px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px'
  },
  button: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  primaryButton: {
    backgroundColor: '#007bff',
    color: 'white'
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
    color: 'white'
  },
  exportButton: {
    backgroundColor: '#28a745',
    color: 'white'
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '20px'
  },
  summary: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '12px',
    borderRadius: '4px',
    marginTop: '20px',
    textAlign: 'center'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'x',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  }
};
