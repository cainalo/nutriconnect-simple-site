#!/usr/bin/env python3
"""Procura segredos no código atual e em todo o histórico do Git SEM imprimir valores.

Mostra só a regra, o arquivo, o commit (no histórico) e, para tokens JWT do Supabase, o papel
("anon" é público; "service_role" seria segredo). Uso: python3 scripts/auditoria/varrer-segredos.py
"""
import base64, json, re, subprocess, sys

RULES = {
    "stripe_secret": re.compile(rb"\b(sk|rk)_(live|test)_[0-9A-Za-z]{16,}"),
    "stripe_webhook_secret": re.compile(rb"\bwhsec_[0-9A-Za-z]{16,}"),
    "supabase_secret_key": re.compile(rb"\bsb_secret_[0-9A-Za-z_-]{16,}"),
    "private_key_block": re.compile(rb"-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----"),
    "aws_access_key": re.compile(rb"\bAKIA[0-9A-Z]{16}\b"),
    "google_api_key": re.compile(rb"\bAIza[0-9A-Za-z_-]{35}\b"),
    "openai_or_anthropic_key": re.compile(rb"\b(sk-ant-[0-9A-Za-z_-]{20,}|sk-proj-[0-9A-Za-z_-]{20,})"),
    "github_token": re.compile(rb"\bgh[pousr]_[0-9A-Za-z]{30,}"),
    "jwt": re.compile(rb"\beyJ[0-9A-Za-z_-]{10,}\.eyJ[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}"),
    "vapid_private_assign": re.compile(rb"VAPID_PRIVATE_KEY\s*[=:]\s*['\"]?[0-9A-Za-z_-]{30,}"),
    "db_url_with_password": re.compile(rb"postgres(ql)?://[^:\s/]+:[^@\s]{6,}@"),
}
SKIP = re.compile(r"(^|/)(node_modules|\.git|dist|\.output|android/app/build)/|\.(png|jpg|jpeg|webp|gif|ico|woff2?|apk|zip|pdf)$")


def jwt_role(tok: bytes) -> str:
    try:
        part = tok.split(b".")[1]
        part += b"=" * (-len(part) % 4)
        return str(json.loads(base64.urlsafe_b64decode(part)).get("role", "?"))
    except Exception:
        return "?"


def scan(blob: bytes):
    for name, rx in RULES.items():
        for m in rx.finditer(blob):
            yield name, (jwt_role(m.group(0)) if name == "jwt" else "")


def main():
    found = {}
    files = subprocess.run(["git", "ls-files"], capture_output=True, text=True).stdout.split("\n")
    for f in filter(None, files):
        if SKIP.search(f):
            continue
        try:
            data = open(f, "rb").read()
        except OSError:
            continue
        for name, extra in scan(data):
            found.setdefault(("atual", name, f, extra), 0)
            found[("atual", name, f, extra)] += 1
    log = subprocess.run(["git", "log", "--all", "-p", "--format=@@COMMIT %h"], capture_output=True).stdout
    commit, path = "?", "?"
    for line in log.split(b"\n"):
        if line.startswith(b"@@COMMIT "):
            commit = line[9:].decode()
        elif line.startswith(b"+++ b/"):
            path = line[6:].decode(errors="replace")
        elif line.startswith(b"+") and not SKIP.search(path):
            for name, extra in scan(line):
                key = ("histórico", name, path, extra)
                found.setdefault(key, set()).add(commit) if isinstance(found.get(key, set()), set) else None
    secret = 0
    for (where, name, f, extra), v in sorted(found.items()):
        public = name == "jwt" and extra == "anon"
        secret += 0 if public else 1
        label = f"{where:9} {name:24} {f}" + (f"  papel={extra}" if extra else "")
        label += f"  ({len(v)} commit(s))" if isinstance(v, set) else f"  ({v}x)"
        print(("PÚBLICO  " if public else "VERIFICAR ") + label)
    print(f"\nAchados que exigem atenção: {secret}")
    return 1 if secret else 0


if __name__ == "__main__":
    sys.exit(main())
