import React, { useState } from 'react';
import { api } from '../api/client.js';
import AppNav from '../components/AppNav.jsx';

const example = `[
  {
    "subject": "Maths",
    "yearGroup": "Year 6",
    "topic": "Geometry",
    "skill": "Area",
    "type": "TYPED_ANSWER",
    "text": "What is the area of a rectangle measuring 8 cm by 6 cm?",
    "correctAnswer": "48",
    "difficulty": 3,
    "points": 2,
    "explanation": "Width × height = 8 × 6 = 48."
  }
]`;

function errorMessage(error) {
  if (!error.response) return 'The backend is not reachable. Keep the backend terminal running and try again.';
  if (error.response.status === 401) return 'Your parent session has expired. Sign in again, then return to this page.';
  const data = error.response.data;
  if (data?.errors?.length) {
    return data.errors.map(row => `Row ${Number(row.index) + 1}: ${(row.issues || []).map(issue => issue.message || String(issue)).join(', ')}`).join(' | ');
  }
  return data?.detail || data?.error || `Import failed (HTTP ${error.response.status}).`;
}

export default function ImportQuestions() {
  const [text, setText] = useState(example);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const previewJson = () => {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Provide a non-empty JSON array.');
      setPreview(parsed);
      setMessage(`Preview ready: ${parsed.length} question${parsed.length === 1 ? '' : 's'}.`);
    } catch (error) {
      setPreview(null);
      setMessage(error.message || 'The JSON is not valid.');
    }
  };

  const importNow = async () => {
    if (!preview) return setMessage('Preview the JSON successfully before importing.');
    setBusy(true);
    try {
      const response = await api.post('/import/json', preview);
      setMessage(`Imported ${response.data.inserted} question${response.data.inserted === 1 ? '' : 's'} successfully.`);
      setPreview(null);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return <main className="dashboard">
    <AppNav parent />
    <p className="eyebrow">QUESTION BANK · IMPORT</p>
    <h1>Import questions.</h1>
    <p className="muted">Use friendly subject, topic and skill names. Missing catalog items are created automatically.</p>
    <div className="card creator">
      <label>JSON questions<textarea className="json-area" value={text} onChange={event => { setText(event.target.value); setPreview(null); }} /></label>
      <button type="button" onClick={previewJson}>Preview JSON</button>
      <button type="button" className="outline" disabled={!preview || busy} onClick={importNow}>{busy ? 'Importing…' : 'Import previewed questions'}</button>
      {message && <p className="form-error" role="status">{message}</p>}
    </div>
  </main>;
}
