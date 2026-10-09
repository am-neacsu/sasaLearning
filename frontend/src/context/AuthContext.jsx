import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';
const AuthContext=createContext(null);
export function AuthProvider({children}) { const [user,setUser]=useState(null); const [loading,setLoading]=useState(true); useEffect(()=>{api.get('/auth/me').then(r=>setUser(r.data.user)).catch(()=>{localStorage.removeItem('brightpath_token');setUser(null)}).finally(()=>setLoading(false))},[]); const login=async(credentials)=>{const r=await api.post('/auth/login',credentials);if(r.data.token)localStorage.setItem('brightpath_token',r.data.token);setUser(r.data.user);return r.data.user}; const logout=async()=>{try{await api.post('/auth/logout')}catch{} localStorage.removeItem('brightpath_token');setUser(null)}; return <AuthContext.Provider value={{user,loading,login,logout}}>{children}</AuthContext.Provider> }
export function useAuth(){return useContext(AuthContext)}
