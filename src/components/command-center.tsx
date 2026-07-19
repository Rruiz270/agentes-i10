"use client";

import { useEffect, useState } from "react";

export type Unit = {
  key: string;
  code: string; // designação de 2 letras
  name: string;
  role: string;
  autonomy: "AUTÔNOMO" | "APRENDIZ" | "ATIVO";
  state: "vigiando" | "trabalhando" | "aguardando" | "alerta" | "ocioso";
  accent: "cyan" | "mint" | "amber" | "violet" | "danger";
  pending: number;
  last: string;
};

export type Tel = { t: string; tag: string; cls: string; text: string };

const ACT: Record<string, string[]> = {
  guardiao: ["varrendo typecheck", "analisando lint", "validando schema Neon", "aguardando próximo ciclo"],
  cobranca: ["cruzando tarefas vencidas", "montando lembretes", "notificando o time", "ciclo concluído"],
  leads: ["lendo conversas WhatsApp", "detectando silêncios >48h", "redigindo follow-up", "aguardando seu OK"],
  higiene: ["escaneando pool 'Novo'", "medindo rotDays por estágio", "propondo distribuição", "aguardando seu OK"],
  pauta: ["lendo engajamento da semana", "consultando calendário", "rascunhando pauta", "aguardando seu OK"],
  supervisor: ["coletando STATUS da frota", "consolidando sinais", "montando briefing", "em vigília"],
};

const STATE_LABEL: Record<string, string> = {
  vigiando: "VIGIANDO", trabalhando: "TRABALHANDO", aguardando: "AGUARDANDO VOCÊ",
  alerta: "ALERTA", ocioso: "OCIOSO",
};

export default function CommandCenter({
  units, tel, online, fails, pending, lastAgo,
}: {
  units: Unit[]; tel: Tel[]; online: number; fails: number; pending: number; lastAgo: string;
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
            <div className="cc-subtitle">Central de Agentes · frota do CRM i10</div>
          </div>
        </div>
        <div className="cc-hstatus">
          <span className="cc-online"><span className="cc-beat" />{online} UNIDADES ONLINE</span>
          <span className="cc-clock">{clock}</span>
        </div>
      </header>

      <div className="cc-metrics">
        <div className="cc-metric"><span className="cc-mk">FROTA</span><span className="cc-mv">{units.length}</span></div>
        <div className={`cc-metric ${fails ? "alert" : ""}`}><span className="cc-mk">ALERTAS</span><span className="cc-mv">{fails}</span></div>
        <div className={`cc-metric ${pending ? "warn" : ""}`}><span className="cc-mk">AGUARDANDO VOCÊ</span><span className="cc-mv">{pending}</span></div>
        <div className="cc-metric"><span className="cc-mk">ÚLTIMO SINAL</span><span className="cc-mv sm">{lastAgo}</span></div>
      </div>

      <div className="cc-grid">
        {units.map((u, i) => (
          <div
            key={u.key}
            className={`unit a-${u.accent} s-${u.state}`}
            style={{ animationDelay: `${0.15 + i * 0.11}s` }}
          >
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
            <div className="unit-state">
              <span className="unit-ring" />
              {STATE_LABEL[u.state]}
            </div>
            <div className="unit-activity">
              <span className="unit-caret" />{ACT[u.key] ? ACT[u.key][tick % ACT[u.key].length] : u.last}
            </div>
            <div className="unit-signal" aria-hidden>
              {Array.from({ length: 9 }).map((_, k) => <span key={k} style={{ animationDelay: `${k * 0.11}s` }} />)}
            </div>
            {u.pending > 0 && (
              <a className="unit-alert" href="#aprovacoes">{u.pending} aguardando você ▸</a>
            )}
          </div>
        ))}
      </div>

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
