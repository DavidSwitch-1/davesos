import { useState, useEffect, useCallback } from 'react';
import { supabase, fetchRows, upsertRow, deleteRow, updateRow } from '../lib/supabase';

export function useAppData(userId) {
  const [tasks,       setTasks]       = useState([]);
  const [wins,        setWins]        = useState([]);
  const [radar,       setRadar]       = useState([]);
  const [delegations, setDelegations] = useState([]);
  const [checkins,    setCheckins]    = useState([]);
  const [energyLog,   setEnergyLog]   = useState([]);
  const [settings,    setSettings]    = useState({ biz_a: 'Swi-tch', biz_b: 'Throwdown' });
  const [focusStats,  setFocusStats]  = useState({ sessions: 0, minutes: 0 });
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      setLoading(true);
      const [t, w, r, d, c, e] = await Promise.all([
        fetchRows('tasks',       userId),
        fetchRows('wins',        userId),
        fetchRows('radar',       userId),
        fetchRows('delegations', userId),
        fetchRows('checkins',    userId),
        fetchRows('energy_log',  userId),
      ]);
      setTasks(t);  setWins(w);  setRadar(r);
      setDelegations(d);  setCheckins(c);  setEnergyLog(e);

      const { data: s } = await supabase
        .from('user_settings').select('*').eq('id', userId).single();
      if (s) setSettings(s);

      const fs = JSON.parse(localStorage.getItem('davesos_fs') || '{"sessions":0,"minutes":0}');
      setFocusStats(fs);
      setLoading(false);
    }
    load();
  }, [userId]);

  const addTask = useCallback(async (task) => {
    const row = { ...task, user_id: userId };
    const saved = await upsertRow('tasks', row);
    if (saved) setTasks(prev => [saved, ...prev]);
    return saved;
  }, [userId]);

  const updateTask = useCallback(async (id, updates) => {
    const updated = await updateRow('tasks', id, updates);
    if (updated) setTasks(prev => prev.map(t => t.id === id ? updated : t));
  }, []);

  const deleteTask = useCallback(async (id) => {
    await deleteRow('tasks', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const addWin = useCallback(async (text) => {
    const row = { text, user_id: userId };
    const saved = await upsertRow('wins', row);
    if (saved) setWins(prev => [saved, ...prev]);
  }, [userId]);

  const deleteWin = useCallback(async (id) => {
    await deleteRow('wins', id);
    setWins(prev => prev.filter(w => w.id !== id));
  }, []);

  const addRadar = useCallback(async (item) => {
    const row = { ...item, user_id: userId };
    const saved = await upsertRow('radar', row);
    if (saved) setRadar(prev => [saved, ...prev]);
  }, [userId]);

  const updateRadar = useCallback(async (id, updates) => {
    const updated = await updateRow('radar', id, updates);
    if (updated) setRadar(prev => prev.map(r => r.id === id ? updated : r));
  }, []);

  const deleteRadar = useCallback(async (id) => {
    await deleteRow('radar', id);
    setRadar(prev => prev.filter(r => r.id !== id));
  }, []);

  const addDelegation = useCallback(async (item) => {
    const row = { ...item, user_id: userId };
    const saved = await upsertRow('delegations', row);
    if (saved) setDelegations(prev => [saved, ...prev]);
  }, [userId]);

  const updateDelegation = useCallback(async (id, updates) => {
    const updated = await updateRow('delegations', id, updates);
    if (updated) setDelegations(prev => prev.map(d => d.id === id ? updated : d));
  }, []);

  const deleteDelegation = useCallback(async (id) => {
    await deleteRow('delegations', id);
    setDelegations(prev => prev.filter(d => d.id !== id));
  }, []);

  const addCheckin = useCallback(async (entry) => {
    const row = { ...entry, user_id: userId };
    const saved = await upsertRow('checkins', row);
    if (saved) setCheckins(prev => [saved, ...prev]);
  }, [userId]);

  const logEnergy = useCallback(async (score) => {
    const row = { score, hour: new Date().getHours(), user_id: userId };
    const saved = await upsertRow('energy_log', row);
    if (saved) setEnergyLog(prev => [saved, ...prev.slice(0, 99)]);
    localStorage.setItem('davesos_energy_ts', Date.now());
  }, [userId]);

  const saveSettings = useCallback(async (updates) => {
    const updated = { ...settings, ...updates, id: userId };
    await upsertRow('user_settings', updated);
    setSettings(updated);
  }, [settings, userId]);

  const addFocusSession = useCallback((minutes) => {
    setFocusStats(prev => {
      const updated = { sessions: prev.sessions + 1, minutes: prev.minutes + minutes };
      localStorage.setItem('davesos_fs', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    tasks, wins, radar, delegations, checkins, energyLog, settings, focusStats, loading,
    addTask, updateTask, deleteTask,
    addWin, deleteWin,
    addRadar, updateRadar, deleteRadar,
    addDelegation, updateDelegation, deleteDelegation,
    addCheckin,
    logEnergy,
    saveSettings,
    addFocusSession,
  };
}
