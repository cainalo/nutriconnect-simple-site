// Limpeza dos arquivos de uma conta no Storage, sem rede nem Deno (testada em
// tests/unit/account-cleanup.test.mjs). Lista a pasta <prefixo>/ em páginas, desce nas subpastas,
// apaga em lotes, confere cada erro e, no fim, lista de novo para confirmar que não sobrou nada.
// Qualquer falha volta como erro: quem chama NÃO apaga a conta e a pessoa pode tentar de novo
// (o que já foi apagado não volta, então a nova tentativa continua de onde parou).

export interface StorageItem {
  name: string;
  /** Pastas vêm sem id na listagem do Supabase Storage. */
  id: string | null;
}

export interface StorageBucketApi {
  list(
    prefix: string,
    opts: { limit: number; offset: number },
  ): Promise<{ data: StorageItem[] | null; error: { message: string } | null }>;
  remove(paths: string[]): Promise<{ data: unknown; error: { message: string } | null }>;
}

export const PAGE = 1000;
const REMOVE_BATCH = 100;

export class CleanupError extends Error {
  constructor(
    public bucket: string,
    public step: "listar" | "apagar" | "conferir",
    message: string,
  ) {
    super(`${bucket}: ${step}: ${message}`);
  }
}

/** Todos os arquivos abaixo de prefix (com subpastas), página por página. */
async function listAll(api: StorageBucketApi, bucket: string, prefix: string): Promise<string[]> {
  const files: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await api.list(prefix, { limit: PAGE, offset });
    if (error) throw new CleanupError(bucket, "listar", error.message);
    const items = data ?? [];
    for (const it of items) {
      const path = `${prefix}/${it.name}`;
      if (it.id) files.push(path);
      else files.push(...(await listAll(api, bucket, path)));
    }
    if (items.length < PAGE) return files;
  }
}

/** Apaga tudo abaixo de prefix e confirma que ficou vazio. Devolve quantos arquivos apagou. */
export async function emptyFolder(
  api: StorageBucketApi,
  bucket: string,
  prefix: string,
): Promise<number> {
  const files = await listAll(api, bucket, prefix);
  for (let i = 0; i < files.length; i += REMOVE_BATCH) {
    const { error } = await api.remove(files.slice(i, i + REMOVE_BATCH));
    if (error) throw new CleanupError(bucket, "apagar", error.message);
  }
  const left = await listAll(api, bucket, prefix);
  if (left.length) throw new CleanupError(bucket, "conferir", `${left.length} arquivo(s) ainda lá`);
  return files.length;
}
