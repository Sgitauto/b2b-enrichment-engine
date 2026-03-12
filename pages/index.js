import React, { useState } from 'react';

const Home = () => {
  const [companyType, setCompanyType] = useState('');
  const [zone, setZone] = useState('');
  const [listSize, setListSize] = useState('50');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const sizeOptions = ['10', '20', '30', '40', '50', '75', '100', '150', '200', '250', '300'];

  const handleSearch = async () => {
    if (!companyType.trim() || !zone.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await fetch('/api/enrichment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyType, zone, maxResults: parseInt(listSize) })
      });

      if (!response.ok) throw new Error('Erreur API');
      const data = await response.json();
      setResults(data.results || []);
      if (data.results?.length === 0) {
        setError(`Aucun résultat trouvé. Seulement ${data.results?.length || 0} entreprise(s) pertinente(s)`);
      }
    } catch (err) {
      setError('Erreur: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (results.length === 0) return;
    const csv = [
      ['Company_Name', 'Company_Website', 'Company_Industry', 'Company_Location', 'Contact_Name', 'Contact_Title', 'Contact_Email', 'Contact_Phone', 'Contact_LinkedIn', 'Data_Confidence', 'Notes'].join(','),
      ...results.map(r => [
        r.name || '',
        r.website || '',
        r.industry || '',
        r.location || '',
        r.contactName || '',
        r.contactTitle || '',
        r.contactEmail || '',
        r.contactPhone || '',
        r.contactLinkedIn || '',
        r.confidence || 0,
        r.notes || ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enrichment_${Date.now()}.csv`;
    a.click();
  };

  const handleReset = () => {
    setCompanyType('');
    setZone('');
    setListSize('50');
    setResults([]);
    setError('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>🔍 B2B Lead Enrichment Engine</h1>
        <p>Trouvez et enrichissez les données de prospects B2B</p>
      </div>

      <div style={styles.inputSection}>
        <div style={styles.inputGroup}>
          <label>Type d'entreprise / Activité</label>
          <input
            type="text"
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value)}
            placeholder="ex: Agence de communication digitale"
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label>Zone géographique</label>
          <input
            type="text"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            placeholder="ex: Île-de-France, France"
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label>Nombre de résultats souhaités</label>
          <select value={listSize} onChange={(e) => setListSize(e.target.value)} style={styles.select}>
            {sizeOptions.map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>

        <button onClick={handleSearch} disabled={loading} style={{ ...styles.button, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Recherche en cours...' : 'Rechercher et enrichir'}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {results.length > 0 && (
        <div style={styles.resultsSection}>
          <h2>Résultats: {results.length} entreprise(s)</h2>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Site Web</th>
                  <th>Secteur</th>
                  <th>Localisation</th>
                  <th>Contact</th>
                  <th>Poste</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>LinkedIn</th>
                  <th>Confiance</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td><a href={r.website} target="_blank" rel="noopener noreferrer">{r.website ? '🔗' : '-'}</a></td>
                    <td>{r.industry}</td>
                    <td>{r.location}</td>
                    <td>{r.contactName}</td>
                    <td>{r.contactTitle}</td>
                    <td>{r.contactEmail}</td>
                    <td>{r.contactPhone}</td>
                    <td><a href={r.contactLinkedIn} target="_blank" rel="noopener noreferrer">{r.contactLinkedIn ? '👤' : '-'}</a></td>
                    <td>{r.confidence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.footer}>
            <button onClick={handleExport} style={styles.buttonSuccess}>📥 Exporter CSV</button>
            <button onClick={handleReset} style={styles.buttonSecondary}>🔄 Réinitialiser</button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: '1400px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' },
  header: { textAlign: 'center', marginBottom: '40px', backgroundColor: '#f0f4f8', padding: '30px', borderRadius: '8px' },
  inputSection: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '15px', marginBottom: '30px', alignItems: 'flex-end' },
  inputGroup: { display: 'flex', flexDirection: 'column' },
  input: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' },
  select: { padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' },
  button: { padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' },
  buttonSuccess: { padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' },
  buttonSecondary: { padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  error: { backgroundColor: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '4px', marginBottom: '20px' },
  resultsSection: { marginTop: '30px' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '20px' },
  footer: { display: 'flex', gap: '10px' }
};

export default Home;
