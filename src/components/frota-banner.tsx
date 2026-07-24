import { FROTA_OFFLINE_MIN } from "@/lib/fleet-data";

// DEAD-MAN SWITCH — o painel roda na Vercel (sempre no ar), mas a frota roda no
// Mac mini. Se o ping de vida (a cada 5 min) some por mais de 15 min, o mini caiu
// ou perdeu a rede — e a frota está PARADA. Esta faixa avisa na hora.
export default function FrotaBanner({ minAtras }: { minAtras: number | null }) {
  const offline = minAtras === null || minAtras > FROTA_OFFLINE_MIN;
  if (!offline) return null;
  const quando = minAtras === null ? "sem nenhum sinal registrado" : `há ${minAtras} min sem sinal`;
  return (
    <div className="frota-wrap" role="alert">
      <div className="frota">
        <span className="frota-badge"><span className="frota-dot" />FROTA OFFLINE</span>
        <div className="frota-body">
          <b>O Mac mini parou de reportar — a frota de agentes está pausada.</b>
          <span>Nenhum ping de vida {quando}. Nada é executado enquanto o mini estiver fora (rede/Tailscale caiu, ou a máquina dormiu/desligou).</span>
          <span className="frota-hint">Verifique o mini · garanta que ele nunca dorme (<code>sudo pmset -a sleep 0 disablesleep 1</code>).</span>
        </div>
      </div>
    </div>
  );
}
