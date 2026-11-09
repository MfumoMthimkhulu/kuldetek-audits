export const demoAccounts = [
  { id: "demo-auditor", name: "Alex Morgan", role: "Auditor", initials: "AM", description: "Plan audits, record findings and prepare reports." },
  { id: "demo-manager", name: "Sam Rivera", role: "Audit reviewer", initials: "SR", description: "Review reports and work through the approval queue." },
  { id: "demo-auditee", name: "Jamie Patel", role: "Auditee", initials: "JP", description: "View assigned audits and respond to evidence requests." },
];

const key = "orion-demo-session-v1";
let enabled = false;
let accountId = null;
const listeners = new Set();

export function enableDemoSessions() {
  enabled = true;
  try { accountId = window.localStorage.getItem(key); } catch {}
  window.addEventListener("storage", event => {
    if (event.key !== key) return;
    accountId = event.newValue;
    listeners.forEach(listener => listener());
  });
}

export function getDemoIdentity() {
  if (!enabled) return undefined;
  return demoAccounts.find(account => account.id === accountId) ?? null;
}

export function subscribeDemoIdentity(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setDemoIdentity(id) {
  accountId = demoAccounts.some(account => account.id === id) ? id : null;
  try {
    if (accountId) window.localStorage.setItem(key, accountId);
    else window.localStorage.removeItem(key);
  } catch {}
  listeners.forEach(listener => listener());
}
