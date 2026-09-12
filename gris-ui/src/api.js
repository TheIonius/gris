const API_BASE = '/api';

export function getApiKey() {
  if (typeof window === 'undefined') return '';
  return window.GRIS_API_KEY || localStorage.getItem('gris_api_key') || '';
}

export function setApiKey(key) {
  if (typeof window !== 'undefined') {
    if (key) {
      localStorage.setItem('gris_api_key', key);
    } else {
      localStorage.removeItem('gris_api_key');
    }
  }
}

function getAuthHeaders(custom = {}) {
  const headers = { ...custom };
  const key = getApiKey();
  if (key) {
    headers['X-API-KEY'] = key;
  }
  return headers;
}

export async function fetchModels() {
  const res = await fetch(`${API_BASE}/models`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.statusText}`);
  return res.json();
}

export async function fetchScenarios() {
  const res = await fetch(`${API_BASE}/scenarios`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Failed to fetch scenarios: ${res.statusText}`);
  return res.json();
}

export async function fetchScenario(id) {
  const res = await fetch(`${API_BASE}/scenarios/${id}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Failed to fetch scenario ${id}: ${res.statusText}`);
  return res.json();
}

export async function submitScenario(data) {
  const res = await fetch(`${API_BASE}/scenarios`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Submission failed: ${res.statusText}`);
  }
  return res.json();
}

export async function askScenario(prompt, execute = false) {
  const res = await fetch(`${API_BASE}/ask`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prompt, execute }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `NL Parse failed: ${res.statusText}`);
  }
  return res.json();
}

export async function runParameterSweep(data) {
  const res = await fetch(`${API_BASE}/sweeps`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Sensitivity sweep failed: ${res.statusText}`);
  }
  return res.json();
}

export function subscribeScenarioEvents(id, { onProgress, onComplete, onError } = {}) {
  const key = getApiKey();
  const url = key ? `${API_BASE}/scenarios/${id}/stream?apiKey=${encodeURIComponent(key)}` : `${API_BASE}/scenarios/${id}/stream`;
  const eventSource = new EventSource(url);

  const handleData = (event, isComplete) => {
    try {
      const data = JSON.parse(event.data);
      if (isComplete || data.status === 'COMPLETED' || data.status === 'FAILED' || data.status === 'CANCELLED') {
        eventSource.close();
        if (onComplete) onComplete(data);
      } else {
        if (onProgress) onProgress(data);
      }
    } catch (err) {
      console.error('Error parsing SSE event data:', err);
    }
  };

  eventSource.addEventListener('status', (e) => handleData(e, false));
  eventSource.addEventListener('progress', (e) => handleData(e, false));
  eventSource.addEventListener('complete', (e) => handleData(e, true));

  eventSource.onerror = (err) => {
    eventSource.close();
    if (onError) onError(err);
  };

  return () => {
    eventSource.close();
  };
}

export async function abortScenario(id) {
  const res = await fetch(`${API_BASE}/scenarios/${id}/abort`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Failed to abort scenario ${id}`);
}

export async function deleteScenario(id) {
  const res = await fetch(`${API_BASE}/scenarios/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Failed to delete scenario ${id}`);
}

export async function clearAllScenarios() {
  const res = await fetch(`${API_BASE}/scenarios`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to clear scenario history');
}



