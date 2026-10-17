import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import AppNav from '../components/AppNav.jsx';

export default function ParentHomework() {
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState({
    title: '',
    subjectId: '',
    topicIds: [],
    questionIds: [],
    studentIds: [],
  });
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState('manual');
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importBusy, setImportBusy] = useState(false);
  const [selectionMode, setSelectionMode] = useState('manual');
  const [questionCount, setQuestionCount] = useState(10);
  const [history, setHistory] = useState({});
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/catalog/subjects'),
      api.get('/parent/students'),
      api.get('/questions'),
    ])
      .then(([subjectsResponse, studentsResponse, questionsResponse]) => {
        setSubjects(subjectsResponse.data.subjects || []);
        setStudents(studentsResponse.data.students || []);
        setQuestions(questionsResponse.data.questions || []);
      })
      .catch(() => setMessage('Could not load homework options.'));
  }, []);

  const subjectQuestions = useMemo(
    () => questions.filter((question) => !form.subjectId || question.subjectId === form.subjectId),
    [questions, form.subjectId],
  );

  const topics = useMemo(() => {
    const topicMap = new Map();
    subjectQuestions.forEach((question) => {
      if (question.topic && !topicMap.has(question.topic.id)) {
        topicMap.set(question.topic.id, question.topic);
      }
    });
    return [...topicMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [subjectQuestions]);

  const visibleQuestions = subjectQuestions.filter(
    (question) => !form.topicIds.length || form.topicIds.includes(question.topicId),
  );

  const selectSubject = (subjectId) => {
    setForm((current) => ({
      ...current,
      subjectId,
      topicIds: [],
      questionIds: [],
    }));
  };

  const selectAllTopics = () => {
    setForm((current) => ({ ...current, topicIds: [] }));
  };

  const toggleTopic = (topicId) => {
    setForm((current) => {
      const topicIds = current.topicIds.includes(topicId)
        ? current.topicIds.filter((id) => id !== topicId)
        : [...current.topicIds, topicId];
      const questionIds = topicIds.length
        ? current.questionIds.filter((questionId) => {
          const question = subjectQuestions.find((item) => item.id === questionId);
          return question && topicIds.includes(question.topicId);
        })
        : current.questionIds;
      return { ...current, topicIds, questionIds };
    });
  };

  const loadHistory = async (studentIds) => {
    if (!studentIds.length) return setHistory({});
    try {
      const response = await api.get('/questions/history', { params: { studentIds: studentIds.join(',') } });
      setHistory(response.data.history || {});
    } catch { setHistory({}); }
  };

  const selectRandomQuestions = async () => {
    if (!form.subjectId || !form.studentIds.length) return setMessage('Choose a subject and at least one child first.');
    setSelecting(true);
    try {
      const response = await api.post('/questions/select', { subjectId: form.subjectId, topicIds: form.topicIds, count: Number(questionCount), studentIds: form.studentIds });
      setForm((current) => ({ ...current, questionIds: response.data.questions.map((question) => question.id) }));
      setHistory(response.data.history || {});
      setMessage(`Selected ${response.data.selected} of ${response.data.available} available questions.`);
      if (response.data.selected < Number(questionCount)) setMessage(`Only ${response.data.selected} questions are available in the selected categories.`);
    } catch (error) { setMessage(error.response?.data?.error || 'Could not select questions.'); }
    finally { setSelecting(false); }
  };

  const toggle = (field, id, checked) => {
    setForm((current) => {
      const next = { ...current, [field]: checked ? [...current[field], id] : current[field].filter((value) => value !== id) };
      if (field === 'studentIds') loadHistory(next.studentIds);
      return next;
    });
  };

  const previewImportedHomework = () => {
    try {
      const parsed = JSON.parse(importText);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Use a homework object containing title and questions.');
      if (!parsed.title || !Array.isArray(parsed.questions) || !parsed.questions.length) throw new Error('Homework needs a title and at least one question.');
      if (!form.studentIds.length) throw new Error('Select at least one child before previewing or importing.');
      setImportPreview(parsed);
      setMessage(`Preview ready: ${parsed.questions.length} question${parsed.questions.length === 1 ? '' : 's'}.`);
    } catch (error) {
      setImportPreview(null);
      setMessage(error.message || 'The JSON is not valid.');
    }
  };

  const importHomework = async () => {
    if (!importPreview) return;
    setImportBusy(true);
    try {
      const response = await api.post('/import/homework-json', { ...importPreview, studentIds: form.studentIds });
      setMessage(response.data.message || 'Homework imported and assigned successfully.');
      setImportPreview(null);
      setImportText('');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Could not import homework.');
    } finally {
      setImportBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/homework', {
        title: form.title,
        subjectId: form.subjectId,
        questionIds: form.questionIds,
        studentIds: form.studentIds,
      });
      setMessage('Homework created and assigned.');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Could not create homework.');
    }
  };

  return (
    <main className="dashboard">
      <AppNav parent />
      <p className="eyebrow">PARENT · HOMEWORK</p>
      <h1>Create homework.</h1>
      <p className="muted">Create homework manually or upload a complete homework page with mixed categories and difficulties.</p>
      <div className="page-actions">
        <button type="button" className={mode === 'manual' ? '' : 'outline'} onClick={() => setMode('manual')}>Create manually</button>
        <button type="button" className={mode === 'import' ? '' : 'outline'} onClick={() => setMode('import')}>Upload homework JSON</button>
      </div>
      {mode === 'import' ? (
        <section className="card creator">
          <p className="muted">Upload a homework object containing a title and questions. Categories, skills and difficulties are created automatically.</p>
          <label>Homework JSON<textarea className="json-area" value={importText} onChange={(event) => { setImportText(event.target.value); setImportPreview(null); }} placeholder={'{"title":"Mixed Maths Practice","subject":"Maths","questions":[...]}'}/></label>
          <button type="button" onClick={previewImportedHomework}>Preview homework</button>
          {importPreview && <div className="import-preview"><strong>{importPreview.title}</strong><span>{importPreview.questions.length} questions · {new Set(importPreview.questions.map((question) => question.topic || question.category)).size} categories</span><small>Select at least one child below before importing.</small></div>}
          <fieldset>
            <legend>Assign to</legend>
            {students.map((student) => <label className="check" key={student.id}><input type="checkbox" checked={form.studentIds.includes(student.id)} onChange={(event) => toggle('studentIds', student.id, event.target.checked)}/>{student.user.firstName}</label>)}
          </fieldset>
          <button type="button" disabled={!importPreview || !form.studentIds.length || importBusy} onClick={importHomework}>{importBusy ? 'Importing…' : 'Import and assign homework'}</button>
          {message && <p className="form-error" role="status">{message}</p>}
        </section>
      ) : <form className="card creator" onSubmit={submit}>
        <label>
          Title
          <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </label>
        <label>
          Subject
          <select required value={form.subjectId} onChange={(event) => selectSubject(event.target.value)}>
            <option value="">Choose subject</option>
            {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>

        {form.subjectId && (
          <section className="category-picker">
            <div className="picker-heading">
              <h2>Categories</h2>
              <span>{form.topicIds.length ? `${form.topicIds.length} selected` : 'All categories selected'}</span>
            </div>
            <p className="muted category-help">Select as many categories as you need.</p>
            <div className="category-cards">
              <button
                type="button"
                className={!form.topicIds.length ? 'category-card selected' : 'category-card'}
                onClick={selectAllTopics}
              >
                <strong>All categories</strong>
                <small>{subjectQuestions.length} questions</small>
              </button>
              {topics.map((topic) => (
                <button
                  type="button"
                  className={form.topicIds.includes(topic.id) ? 'category-card selected' : 'category-card'}
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                >
                  <strong>{topic.name}</strong>
                  <small>{subjectQuestions.filter((question) => question.topicId === topic.id).length} questions</small>
                </button>
              ))}
            </div>
          </section>
        )}

        <fieldset>
          <legend>Assign to</legend>
          {students.map((student) => (
            <label className="check" key={student.id}>
              <input
                type="checkbox"
                checked={form.studentIds.includes(student.id)}
                onChange={(event) => toggle('studentIds', student.id, event.target.checked)}
              />
              {student.user.firstName}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>
            Questions {form.topicIds.length > 0 && <span className="legend-note">from selected categories</span>}
          </legend>
          <div className="question-selection-tools">
            <label>Selection mode<select value={selectionMode} onChange={(event) => setSelectionMode(event.target.value)}><option value="manual">Choose manually</option><option value="random">Choose a number automatically</option></select></label>
            {selectionMode === 'random' && <div className="random-selection"><label>Number of questions<input type="number" min="1" max={Math.max(1, visibleQuestions.length)} value={questionCount} onChange={(event) => setQuestionCount(event.target.value)} /></label><button type="button" onClick={selectRandomQuestions} disabled={selecting || !form.studentIds.length}>{selecting ? 'Selecting…' : 'Select questions'}</button></div>}
          </div>
          <div className="question-legend"><span className="question-status correct">✓ Correct previously</span><span className="question-status incorrect">! Incorrect previously</span><span className="question-status unanswered">○ Not answered</span></div>
          {visibleQuestions.length ? visibleQuestions.map((question) => (
            <label className="check question-choice" key={question.id}>
              <input
                type="checkbox"
                checked={form.questionIds.includes(question.id)}
                onChange={(event) => toggle('questionIds', question.id, event.target.checked)}
              />
              <span>
                {question.text}
                <small>{question.topic?.name || 'General'} · Difficulty {question.difficulty} · <em className={`question-status ${history[question.id]?.toLowerCase() || 'unanswered'}`}>{history[question.id] === 'CORRECT' ? 'Correct previously' : history[question.id] === 'INCORRECT' ? 'Incorrect previously' : 'Not answered'}</em></small>
              </span>
            </label>
          )) : <p className="muted">No questions are available in these categories yet.</p>}
        </fieldset>

        {message && <p className="form-error">{message}</p>}
        <button disabled={!form.studentIds.length || !form.questionIds.length}>Create and assign</button>
      </form>}
      {mode === 'manual' && message && <p className="form-error" role="status">{message}</p>}
    </main>
  );
}
