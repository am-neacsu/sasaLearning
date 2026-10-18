import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import AppNav from '../components/AppNav.jsx';

export default function ParentAssignedHomework() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const load = () => api.get('/homework').then((response) => setItems(response.data.homework || [])).catch((error) => setMessage(error.response?.data?.error || 'Could not load assigned homework.'));
  useEffect(() => { load(); }, []);
  const save = async () => { try { await api.patch(`/homework/${editing.id}`, { title: editing.title, description: editing.description }); setMessage('Homework updated.'); setEditing(null); load(); } catch (error) { setMessage(error.response?.data?.error || error.response?.data?.detail || 'Could not update homework.'); } };
  const remove = async (item) => { if (!window.confirm(`${item.isArchived ? 'Permanently delete' : 'Delete'} "${item.title}" for all assigned children? This cannot be undone.`)) return; try { await api.delete(`/homework/${item.id}`); setMessage('Homework deleted.'); load(); } catch (error) { setMessage(error.response?.data?.error || error.response?.data?.detail || 'This homework cannot be deleted.'); } };
  const canArchive = (homework) => !homework.isArchived;
  const archiveAssignment = async (homework, assignment) => { if (!window.confirm(`Archive "${homework.title}" for ${assignment.student?.user?.firstName || 'this child'}? Results and points will be preserved.`)) return; try { await api.post(`/homework/assignments/${assignment.id}/archive`); setMessage('This child homework was archived; results and points were preserved.'); load(); } catch (error) { setMessage(error.response?.data?.error || 'Could not archive this child homework.'); } };
  const grouped = items.reduce((groups, homework) => {
    homework.assignments.forEach((assignment) => {
      const childId = assignment.studentId;
      if (!groups[childId]) groups[childId] = { name: assignment.student?.user?.firstName || 'Student', homework: [] };
      groups[childId].homework.push({ homework, assignment });
    });
    return groups;
  }, {});

  return <main className="dashboard"><AppNav parent/><p className="eyebrow">PARENT · HOMEWORK</p><h1>Assigned homework.</h1><p className="muted">Homework is organised separately for each child so you can track individual progress.</p>{message&&<p className="form-error" role="status">{message}</p>}{Object.keys(grouped).length?Object.entries(grouped).map(([childId, child])=><section className="card analytics-card" key={childId}><div className="section-heading"><h2>{child.name}</h2><span>{child.homework.length} assignment{child.homework.length===1?'':'s'}</span></div><div className="assignment-list">{child.homework.map(({ homework, assignment })=><article className="list-row" key={assignment.id}><div><strong>{homework.title}</strong><small>{homework.subject?.name} · {assignment.answers?.length||0}/{homework.questions.length} answered</small></div><strong>{assignment.status.replace('_',' ')}</strong><div className="parent-links"><button onClick={()=>setEditing({...homework})}>Edit</button>{assignment.isArchived?<button className="outline" disabled>Archived</button>:<button className="outline" onClick={()=>archiveAssignment(homework, assignment)}>Archive</button>}</div></article>)}</div></section>):<p className="muted">No homework has been assigned yet.</p>}{editing&&<section className="card creator"><h2>Edit homework</h2><label>Title<input value={editing.title} onChange={(e)=>setEditing({...editing,title:e.target.value})}/></label><label>Description<textarea value={editing.description||''} onChange={(e)=>setEditing({...editing,description:e.target.value})}/></label><div className="parent-links"><button onClick={save}>Save</button><button className="outline" onClick={()=>setEditing(null)}>Cancel</button></div></section>}</main>;
}
