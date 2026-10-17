import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import AppNav from '../components/AppNav.jsx';

export default function ParentAssignedHomework() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const load = () => api.get('/homework').then((response) => setItems(response.data.homework || [])).catch((error) => setMessage(error.response?.data?.error || 'Could not load assigned homework.'));
  useEffect(() => { load(); }, []);
  const save = async () => { try { await api.patch(`/homework/${editing.id}`, { title: editing.title, description: editing.description }); setMessage('Homework updated.'); setEditing(null); load(); } catch (error) { setMessage(error.response?.data?.error || 'Could not update homework.'); } };
  const remove = async (item) => { if (!window.confirm(`Delete "${item.title}"?`)) return; try { await api.delete(`/homework/${item.id}`); setMessage('Homework deleted.'); load(); } catch (error) { setMessage(error.response?.data?.error || 'This homework cannot be deleted.'); } };
  return <main className="dashboard"><AppNav parent/><p className="eyebrow">PARENT · HOMEWORK</p><h1>Assigned homework.</h1><p className="muted">Review what has been assigned, update not-started homework, or remove it when appropriate.</p>{message&&<p className="form-error" role="status">{message}</p>}<section className="parent-grid">{items.length?items.map((item)=><article className="card child-card" key={item.id}>{editing?.id===item.id?<><label>Title<input value={editing.title} onChange={(e)=>setEditing({...editing,title:e.target.value})}/></label><label>Description<textarea value={editing.description||''} onChange={(e)=>setEditing({...editing,description:e.target.value})}/></label><div className="parent-links"><button onClick={save}>Save</button><button className="outline" onClick={()=>setEditing(null)}>Cancel</button></div></>:<><div className="section-heading"><h2>{item.title}</h2><span>{item.questions.length} questions</span></div><p className="muted">{item.subject?.name} · {new Date(item.createdAt).toLocaleDateString()}</p><div className="assignment-list">{item.assignments.map((assignment)=><div className="list-row" key={assignment.id}><span>{assignment.student?.user?.firstName||'Student'}<small>{assignment.answers?.length||0}/{item.questions.length} answered</small></span><strong>{assignment.status.replace('_',' ')}</strong></div>)}</div><div className="parent-links"><button onClick={()=>setEditing({...item})}>Edit</button><button className="outline" onClick={()=>remove(item)}>Delete</button></div></>}</article>):<p className="muted">No homework has been assigned yet.</p>}</section></main>;
}
