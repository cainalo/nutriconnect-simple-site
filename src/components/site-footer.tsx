import { Link } from "@tanstack/react-router";
import { useTr } from "@/components/settings-ui";
import { COMPANY } from "@/lib/legal";

const link = "inline-flex min-h-6 items-center hover:text-foreground";

/** Rodapé das páginas públicas: documentos legais e identificação de quem opera o site. */
export function SiteFooter() {
  const tr = useTr();
  const identification = [
    COMPANY.legalName,
    COMPANY.cnpj && `CNPJ ${COMPANY.cnpj}`,
    COMPANY.address,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <footer className="border-t bg-card/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        <nav className="flex flex-wrap gap-x-5 gap-y-1 font-medium">
          <Link to="/termos" className={link}>
            {tr(["Termos de Uso", "Terms of Use", "Términos de Uso", "Conditions d'utilisation"])}
          </Link>
          <Link to="/privacidade" className={link}>
            {tr([
              "Política de Privacidade",
              "Privacy Policy",
              "Política de Privacidad",
              "Politique de confidentialité",
            ])}
          </Link>
          <Link to="/diretrizes" className={link}>
            {tr([
              "Diretrizes da Comunidade",
              "Community Guidelines",
              "Normas de la Comunidad",
              "Règles de la communauté",
            ])}
          </Link>
          <Link to="/contato" className={link}>
            {tr(["Fale conosco", "Contact us", "Contáctanos", "Nous contacter"])}
          </Link>
          <Link to="/sobre" className={link}>
            {tr(["Sobre", "About", "Acerca de", "À propos"])}
          </Link>
        </nav>
        <p>
          © {new Date().getFullYear()} {COMPANY.name}.{" "}
          {tr([
            "O conteúdo da plataforma é educativo e não substitui a consulta com um(a) profissional de saúde.",
            "The platform's content is educational and does not replace an appointment with a health professional.",
            "El contenido de la plataforma es educativo y no sustituye la consulta con un profesional de salud.",
            "Le contenu de la plateforme est éducatif et ne remplace pas la consultation d'un professionnel de santé.",
          ])}
        </p>
        {identification && <p>{identification}</p>}
      </div>
    </footer>
  );
}
