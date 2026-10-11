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

  const toggle = (field, id, checked) => {
    setForm((current) => ({
      ...current,
      [field]: checked
        ? [...current[field], id]
        : current[field].filter((value) => value !== id),
    }));
  };

  const previewImportedHomework = () => {
    try {
      const parsed = JSON.parse(importText);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Use a homework object containing title and questions.');
      if (!parsed.title || !Array.isArray(parsed.questions) || !parsed.questions.length) throw new Error('Homework needs a title and at least one question.');
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
          {visibleQuestions.length ? visibleQuestions.map((question) => (
            <label className="check question-choice" key={question.id}>
              <input
                type="checkbox"
                checked={form.questionIds.includes(question.id)}
                onChange={(event) => toggle('questionIds', question.id, event.target.checked)}
              />
              <span>
                {question.text}
                <small>{question.topic?.name || 'General'} · Difficulty {question.difficulty}</small>
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
