import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AppNav({ parent = false }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const links = parent
    ? [['/parent','Overview'],['/parent/children','Children'],['/parent/homework/new','Create homework'],['/parent/questions','Question bank'],['/parent/questions/import','Import questions']]
    : [['/','Home'],['/homework','Homework'],['/practice','Practice'],['/subjects','Subjects'],['/progress','Progress'],['/achievements','Achievements']];
  return <nav className="app-nav" aria-label="Main navigation">
    <Link className="nav-brand" to={parent ? '/parent' : '/'}><span className="mark">✦</span>BrightPath</Link>
    <div className="nav-links">{links.map(([href,label])=><Link className={location.pathname===href?'active':''} key={href} to={href}>{label}</Link>)}</div>
    <div className="nav-account"><span>{user?.firstName}</span><button className="outline" onClick={logout}>Sign out</button></div>
  </nav>;
}
