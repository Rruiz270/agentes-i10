// Âncora estável por agente — liga o botão "X aguardando você" (no card da unidade)
// ao chunk daquele agente na lista de aprovações. Normaliza caixa e acento, então o
// nome de exibição ("Cobrança Interna") e o nome do agente ("Cobrança interna") batem.
// Módulo isolado (sem imports) pra command-center e approvals-section usarem sem ciclo.
export function agentAnchor(name: string): string {
  const slug = (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `ap-${slug}`;
}
