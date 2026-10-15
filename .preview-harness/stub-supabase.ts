const chain: any = new Proxy(function () {}, {
  get: (_t, p) => (p === "then" ? (r: any) => r({ data: [], error: null }) : chain),
  apply: () => chain,
});
export const supabase = chain;
