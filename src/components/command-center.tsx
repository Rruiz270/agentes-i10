"use client";

import { useEffect, useState } from "react";

export type Unit = {
  key: string;
  code: string;
  name: string;
  role: string;
  autonomy: "AUTÔNOMO" | "APRENDIZ" | "ATIVO";
  state: "vigiando" | "trabalhando" | "aguardando" | "alerta" | "ocioso";
  accent: "cyan" | "mint" | "amber" | "violet" | "danger";
  pending: number;
  last: string;
  acts?: string[];
};

export type Fleet = { code: string; label: string; sub: string; units: Unit[] };
export type Tel = { t: string; tag: string; cls: string; text: string };

const STATE_LABEL: Record<string, string> = {
  vigiando: "VIGIANDO", trabalhando: "TRABALHANDO", aguardando: "AGUARDANDO VOCÊ",
  alerta: "ALERTA", ocioso: "OCIOSO",
};

function Unidade({ u, i, tick }: { u: Unit; i: number; tick: number }) {
  const acts = u.acts && u.acts.length ? u.acts : [u.last];
  return (
    <div className={`unit a-${u.accent} s-${u.state}`} style={{ animationDelay: `${0.15 + i * 0.09}s` }}>
      <div className="unit-top">
        <div className="unit-code">{u.code}</div>
        <div className="unit-id">
          <div className="unit-name">{u.name}</div>
          <div className="unit-role">{u.role}</div>
        </div>
        <div className={`unit-auto au-${u.autonomy === "AUTÔNOMO" ? "auto" : u.autonomy === "APRENDIZ" ? "learn" : "on"}`}>
          {u.autonomy}
        </div>
      </div>
      <div className="unit-state"><span className="unit-ring" />{STATE_LABEL[u.state]}</div>
      <div className="unit-activity"><span className="unit-caret" />{acts[tick % acts.length]}</div>
      <div className="unit-signal" aria-hidden>
        {Array.from({ length: 9 }).map((_, k) => <span key={k} style={{ animationDelay: `${k * 0.11}s` }} />)}
      </div>
      {u.pending > 0 && <a className="unit-alert" href="#aprovacoes">{u.pending} aguardando você ▸</a>}
    </div>
  );
}

export default function CommandCenter({
  fleets, tel, online, fails, pending, lastAgo,
}: {
  fleets: Fleet[]; tel: Tel[]; online: number; fails: number; pending: number; lastAgo: string;
}) {
  const [clock, setClock] = useState("--:--:--");
  const [tick, setTick] = useState(0);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString("pt-BR", { hour12: false });
    setClock(fmt());
    const c = setInterval(() => setClock(fmt()), 1000);
    const a = setInterval(() => setTick((n) => n + 1), 2800);
    const b = setTimeout(() => setBooted(true), 1400);
    return () => { clearInterval(c); clearInterval(a); clearTimeout(b); };
  }, []);

  return (
    <div className={`cc ${booted ? "booted" : ""}`}>
      <div className="cc-scan" aria-hidden />
      <header className="cc-head">
        <div className="cc-brand">
          <span className="cc-logo"><i>i</i><b>10</b></span>
          <div>
            <div className="cc-title">CENTRO DE COMANDO</div>
            <div className="cc-subtitle">Central de Agentes · frota multi-projeto</div>
          </div>
        </div>
        <div className="cc-hstatus">
          <span className="cc-online"><span className="cc-beat" />{online} UNIDADES ONLINE</span>
          <span className="cc-clock">{clock}</span>
        </div>
      </header>

      <div className="cc-metrics">
        <div className="cc-metric"><span className="cc-mk">PROJETOS</span><span className="cc-mv">{fleets.length}</span></div>
        <div className={`cc-metric ${fails ? "alert" : ""}`}><span className="cc-mk">ALERTAS</span><span className="cc-mv">{fails}</span></div>
        <div className={`cc-metric ${pending ? "warn" : ""}`}><span className="cc-mk">AGUARDANDO VOCÊ</span><span className="cc-mv">{pending}</span></div>
        <div className="cc-metric"><span className="cc-mk">ÚLTIMO SINAL</span><span className="cc-mv sm">{lastAgo}</span></div>
      </div>

      {fleets.map((f) => {
        const fp = f.units.reduce((s, u) => s + u.pending, 0);
        return (
          <div className="cc-fleet" key={f.code}>
            <div className="cc-fleet-h">
              <span className="cc-fleet-code">{f.code}</span>
              <div className="cc-fleet-id"><b>{f.label}</b><span>{f.sub}</span></div>
              <span className="cc-fleet-count">{f.units.length} unidades{fp ? ` · ${fp} aguardando` : ""}</span>
            </div>
            <div className="cc-grid">
              {f.units.map((u, i) => <Unidade key={u.key} u={u} i={i} tick={tick} />)}
            </div>
          </div>
        );
      })}

      <div className="cc-tel">
        <div className="cc-tel-head"><span className="cc-beat sm" />TELEMETRIA · fluxo de execuções</div>
        <div className="cc-tel-body">
          {tel.length === 0 ? (
            <div className="cc-tel-line"><span className="tt">--:--</span> aguardando primeiro sinal do Mac mini…</div>
          ) : (
            tel.map((l, i) => (
              <div className="cc-tel-line" key={i} style={{ animationDelay: `${i * 0.05}s` }}>
                <span className="tt">{l.t}</span>
                <span className={`tg ${l.cls}`}>{l.tag}</span>
                {l.text}
              </div>
            ))
          )}
          <div className="cc-tel-cursor">▊</div>
        </div>
      </div>
    </div>
  );
}
