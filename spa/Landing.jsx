import { ArrowDown, ArrowRight, ClipboardCheck, FileCheck2, ShieldCheck, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { demoAccounts, setDemoIdentity } from "@/lib/demo-session";

export function homeFor(account) {
  if (account.id === "demo-auditee") return "/auditee/dashboard";
  if (account.id === "demo-manager") return "/dashboard/approvals";
  return "/dashboard";
}

const accountIcons = [ClipboardCheck, FileCheck2, UserRound];

export default function Landing({ account }) {
  const navigate = useNavigate();
  return (
    <div className="orion-landing">
      <header className="orion-site-header">
        <Link to="/" className="orion-brand"><ShieldCheck aria-hidden="true" /> <span>Kuldetek<span> / </span>Auditing</span></Link>
        <a href="#accounts" className="orion-quiet-action">{account ? "Switch account" : "Sign in"} <ArrowDown size={16} aria-hidden="true" /></a>
      </header>
      <main className="orion-site-main">
        <section className="orion-hero">
          <div>
            <p className="orion-eyebrow">Cybersecurity audit workspace</p>
            <h1>From audit plan<br />to signed-off report.</h1>
            <p className="orion-hero-copy">Plan engagements, capture evidence and move findings through review. Kuldetek gives auditors, reviewers and auditees one place to see what comes next.</p>
            <a className="orion-primary-action" href="#accounts">Explore the demo <ArrowRight size={18} aria-hidden="true" /></a>
            {account && <Link className="orion-resume" to={homeFor(account)}>Resume as {account.name}</Link>}
          </div>
          <div className="orion-preview" aria-label="Sample engagement preview">
            <div className="orion-preview-bar"><span>Engagement overview</span><span className="orion-preview-pill">Sample audit</span></div>
            <p className="orion-eyebrow">ORA / 001</p>
            <h2>Identity &amp; access review</h2>
            <p className="orion-preview-copy">Follow an engagement from scope through fieldwork and approval.</p>
            <ol className="orion-timeline">
              <li><span>01</span><strong>Scope &amp; plan</strong><small>Complete</small></li>
              <li><span>02</span><strong>Fieldwork &amp; evidence</strong><small>In progress</small></li>
              <li><span>03</span><strong>Report &amp; approval</strong><small>Upcoming</small></li>
            </ol>
          </div>
        </section>
        <section className="orion-accounts" id="accounts" aria-labelledby="account-title">
          <div className="orion-accounts-heading">
            <div><p className="orion-eyebrow">Demo access</p><h2 id="account-title">Choose a workspace</h2></div>
            <p>Use a fictional account. No password or setup required.</p>
          </div>
          <div className="orion-account-grid">
            {demoAccounts.map((identity, index) => {
              const Icon = accountIcons[index];
              return (
                <button className="orion-account" key={identity.id} type="button" onClick={() => {
                  setDemoIdentity(identity.id);
                  navigate(homeFor(identity), { replace: true });
                }}>
                  <span className="orion-account-icon"><Icon size={21} aria-hidden="true" /></span>
                  <span className="orion-account-role">{identity.role}</span>
                  <strong>{identity.name}</strong>
                  <span className="orion-account-description">{identity.description}</span>
                  <span className="orion-account-cta">Continue as {identity.name.split(" ")[0]} <ArrowRight size={16} aria-hidden="true" /></span>
                </button>
              );
            })}
          </div>
        </section>
      </main>
      <footer className="orion-site-footer"><span>Kuldetek Auditing</span><span>Portfolio demo · fictional records stored in this browser</span></footer>
    </div>
  );
}
