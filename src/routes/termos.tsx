import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalLayout, LegalList, LegalSection } from "@/components/legal-layout";
import { COMPANY } from "@/lib/legal";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — NutriConnect" },
      {
        name: "description",
        content:
          "Regras de uso do NutriConnect: conta, conteúdo, acompanhamento com profissionais, pagamentos e responsabilidades.",
      },
    ],
  }),
  component: Termos,
});

const SUMMARY = {
  en: [
    "NutriConnect is a social network about food with tools to meet health professionals; it does not provide health care itself.",
    "Content and Nina (AI) are educational and do not replace a professional. In an emergency, call SAMU (192) or CVV (188).",
    "Accounts are for people aged 18+; children only use the learning path through an adult's account.",
    "Your posts stay yours; respect the Community Guidelines or content may be removed.",
    "Professionals must have an active council registration; appointments, payments and refunds follow the rules in sections 7 and 8.",
    "You can close your account at any time.",
  ],
  es: [
    "NutriConnect es una red social sobre alimentación con herramientas para encontrar profesionales de salud; no presta servicios de salud.",
    "El contenido y Nina (IA) son educativos y no sustituyen a un profesional. En una emergencia, llama al SAMU (192) o al CVV (188).",
    "Las cuentas son para mayores de 18 años; los niños solo usan la ruta de aprendizaje con la cuenta de un adulto.",
    "Lo que publicas sigue siendo tuyo; respeta las Normas de la Comunidad o el contenido puede retirarse.",
    "Los profesionales deben tener registro activo en su consejo; consultas, pagos y reembolsos siguen las secciones 7 y 8.",
    "Puedes cerrar tu cuenta cuando quieras.",
  ],
  fr: [
    "NutriConnect est un réseau social sur l'alimentation avec des outils pour trouver des professionnels de santé ; il ne fournit pas lui-même de soins.",
    "Les contenus et Nina (IA) sont éducatifs et ne remplacent pas un professionnel. En cas d'urgence, appelez le SAMU (192) ou le CVV (188).",
    "Les comptes sont réservés aux plus de 18 ans ; les enfants utilisent seulement le parcours via le compte d'un adulte.",
    "Vos publications restent les vôtres ; respectez les Règles de la communauté, sinon le contenu peut être retiré.",
    "Les professionnels doivent être inscrits à leur ordre ; consultations, paiements et remboursements suivent les sections 7 et 8.",
    "Vous pouvez fermer votre compte à tout moment.",
  ],
};

function Termos() {
  const operator = COMPANY.legalName || COMPANY.name;
  return (
    <LegalLayout
      title="Termos de Uso"
      intro="Ao criar uma conta ou usar o NutriConnect, você concorda com estes Termos e com a Política de Privacidade. Leia com atenção. Se não concordar, não use a plataforma."
      summary={SUMMARY}
    >
      <LegalSection id="servico" title="1. O que é o NutriConnect">
        <p>
          O NutriConnect, operado por {operator}
          {COMPANY.cnpj && <> (CNPJ {COMPANY.cnpj})</>}, é uma rede social sobre alimentação, com
          receitas, comunidades, desafios, uma trilha de aprendizado e ferramentas para que usuários
          e profissionais de saúde (nutrição, medicina, psicologia, educação física, fisioterapia e
          enfermagem) se encontrem, façam consultas (inclusive por vídeo, no próprio site) e
          acompanhem os atendimentos.
        </p>
        <p>
          <strong>O NutriConnect não presta serviços de saúde.</strong> Os atendimentos são
          realizados por profissionais independentes, que respondem pelo que orientam, prescrevem e
          registram, nos termos da lei e do código de ética do seu conselho. Nós fornecemos a
          tecnologia, verificamos o registro profissional por análise documental e intermediamos o
          agendamento e o pagamento.
        </p>
      </LegalSection>

      <LegalSection id="saude" title="2. Conteúdo educativo e Nina (IA)">
        <p>
          Receitas, dicas, trilhas, publicações e respostas da assistente Nina têm caráter{" "}
          <strong>educativo</strong>. Elas não substituem avaliação, diagnóstico ou tratamento por
          um(a) profissional de saúde, e não devem ser usadas em urgências. A Nina é uma
          inteligência artificial: pode errar, não conhece seu histórico clínico e não prescreve
          dietas. Em caso de doença, gestação, uso de medicamentos ou suspeita de transtorno
          alimentar, procure um profissional. Em crise emocional, ligue para o CVV (188) ou, em
          emergência, para o SAMU (192).
        </p>
      </LegalSection>

      <LegalSection id="conta" title="3. Quem pode usar e sua conta">
        <LegalList
          items={[
            "Contas são para pessoas com 18 anos ou mais. Responsáveis podem criar perfis infantis na trilha, que usam a conta do adulto e não têm rede social.",
            "Informe dados verdadeiros e mantenha-os atualizados. Cada pessoa pode ter uma conta.",
            "Você é responsável pela segurança da sua senha e pelo que acontece na sua conta. Avise-nos se suspeitar de uso indevido.",
            "Profissionais devem ter registro ativo no conselho da categoria e enviar a documentação pedida na verificação. Informar registro falso é infração grave e pode ser comunicado ao conselho.",
          ]}
        />
      </LegalSection>

      <LegalSection id="conteudo" title="4. Seu conteúdo">
        <p>
          O conteúdo que você publica continua sendo seu. Ao publicá-lo, você nos autoriza, de forma
          gratuita e não exclusiva, a hospedá-lo, exibi-lo e distribuí-lo na plataforma conforme sua
          configuração de privacidade, apenas enquanto ele estiver publicado. Você declara ter os
          direitos sobre textos e imagens que envia e responde pelo conteúdo que publica.
        </p>
      </LegalSection>

      <LegalSection id="condutas" title="5. O que não é permitido">
        <p>
          Resumidamente (detalhes nas{" "}
          <Link to="/diretrizes" className="text-primary underline">
            Diretrizes da Comunidade
          </Link>
          ):
        </p>
        <LegalList
          items={[
            "ofensas, assédio, discriminação, ameaças ou discurso de ódio;",
            "spam, golpes, venda enganosa, promessas de cura ou de resultado garantido;",
            "estímulo a dietas extremas, jejuns perigosos, transtornos alimentares ou abandono de tratamento;",
            "conteúdo sexual, violento ou que explore ou exponha crianças e adolescentes;",
            "publicar dados pessoais ou de saúde de outras pessoas sem autorização;",
            "fingir ser outra pessoa ou profissional, ou usar registro profissional que não é seu;",
            "tentar burlar a segurança, extrair dados em massa ou usar a plataforma para fins ilegais.",
          ]}
        />
      </LegalSection>

      <LegalSection id="moderacao" title="6. Moderação, denúncias e remoção">
        <p>
          Qualquer pessoa pode denunciar um conteúdo ou perfil pelo botão de denúncia ou pelo{" "}
          <Link to="/contato" className="text-primary underline">
            Fale conosco
          </Link>
          . Publicações e comentários passam por uma análise automática por IA antes de irem ao ar,
          que confere o assunto (alimentação, nutrição e saúde) e se a foto combina com o texto.
          Conteúdos reprovados nessa análise não são publicados. Já os denunciados por várias
          pessoas ficam ocultos enquanto a equipe os analisa. Quando ocultarmos ou removermos algo,
          avisaremos o autor, e você pode pedir revisão por uma pessoa.
        </p>
        <p>
          Conteúdo ilícito que nos for notificado de forma específica (com a indicação clara do
          material e do motivo) será analisado e, se for o caso, removido. Também atendemos ordens
          judiciais. Podemos advertir, suspender ou encerrar contas que violem estes Termos,
          garantindo, sempre que possível, o direito de explicação.
        </p>
      </LegalSection>

      <LegalSection id="profissionais" title="7. Regras para profissionais">
        <LegalList
          items={[
            "Manter o registro ativo e atuar dentro do que o conselho da categoria permite, inclusive no atendimento on-line, cumprindo as exigências próprias da profissão para o atendimento a distância (por exemplo, o cadastro e-Psi exigido pelo Conselho Federal de Psicologia).",
            "Avaliar, a cada caso, se o atendimento por vídeo é adequado e indicar atendimento presencial ou de urgência quando necessário.",
            "Divulgar-se de forma ética: sem promessas de resultado, sem “antes e depois” sensacionalista, sem garantias de cura, sem preços de choque e sem expor pacientes.",
            "Guardar sigilo e manter os registros do atendimento pelos prazos do seu conselho.",
            "Usar os dados dos pacientes apenas para o atendimento, sem repassá-los a terceiros.",
            "Responder pelas orientações, prescrições e condutas que adotar.",
          ]}
        />
      </LegalSection>

      <LegalSection id="pagamentos" title="8. Consultas, pagamentos e cancelamentos">
        <LegalList
          items={[
            "O preço de cada consulta é definido pelo(a) profissional e mostrado antes da contratação. O NutriConnect retém uma taxa de plataforma sobre pagamentos feitos pela plataforma, informada ao profissional.",
            "O horário fica reservado por um tempo limitado enquanto o pagamento é feito; passado esse tempo, é liberado.",
            "O pagamento é processado pelo Stripe e recebido pelo NutriConnect, que repassa o valor ao(à) profissional, descontada a taxa de plataforma. Não guardamos os dados do seu cartão.",
            "Cancelamentos feitos pelo(a) profissional dão direito ao estorno integral. Cancelamentos feitos pelo paciente com antecedência mínima de 24 horas (ou outro prazo informado na hora do agendamento) também dão direito ao estorno; depois disso, o estorno depende do(a) profissional.",
            "Quando aplicável, vale o direito de arrependimento de 7 dias para contratações feitas à distância (art. 49 do Código de Defesa do Consumidor). Para exercê-lo, fale conosco.",
          ]}
        />
        <p>
          <strong>Videoconsulta.</strong> A sala abre 30 minutos antes do horário e só o paciente e
          o(a) profissional daquela consulta podem entrar. A chamada é criptografada e não é gravada
          pela plataforma. É proibido gravar, fotografar ou transmitir a consulta sem a autorização
          expressa da outra pessoa. O(a) profissional só pode registrar uma imagem da câmera do
          paciente (por exemplo, postura ou uma ferida) depois que o paciente autorizar na tela. A
          videoconsulta não é serviço de urgência: em emergências, ligue 192 (SAMU).
        </p>
      </LegalSection>

      <LegalSection id="disponibilidade" title="9. Disponibilidade e responsabilidade">
        <p>
          Trabalhamos para manter a plataforma disponível e segura, mas podem ocorrer interrupções
          para manutenção ou por falhas fora do nosso controle. Respondemos pelos danos que a lei
          nos atribui, inclusive pelas falhas na prestação do nosso serviço, nos termos do Código de
          Defesa do Consumidor. Não respondemos pelo conteúdo publicado por usuários, nem pelos atos
          clínicos dos profissionais, que são independentes.
        </p>
      </LegalSection>

      <LegalSection id="propriedade" title="10. Propriedade intelectual">
        <p>
          A marca, o design, o código, os personagens e os textos do NutriConnect pertencem a nós ou
          a quem nos licenciou. Você pode usar a plataforma, mas não copiar, vender ou criar obras
          derivadas sem autorização.
        </p>
      </LegalSection>

      <LegalSection id="encerramento" title="11. Encerramento da conta">
        <p>
          Você pode excluir sua conta a qualquer momento em Configurações → Conta. Seus dados serão
          tratados conforme a Política de Privacidade. Podemos suspender ou encerrar contas que
          violem estes Termos ou a lei.
        </p>
      </LegalSection>

      <LegalSection id="mudancas" title="12. Mudanças nestes Termos">
        <p>
          Podemos atualizar estes Termos. Quando a mudança for relevante, avisaremos e pediremos um
          novo aceite. Continuar usando a plataforma após o aviso significa concordar com a nova
          versão.
        </p>
      </LegalSection>

      <LegalSection id="lei" title="13. Lei aplicável e contato">
        <p>
          Estes Termos seguem as leis do Brasil. Fica eleito o foro do domicílio do consumidor para
          resolver conflitos. Dúvidas:{" "}
          <a className="text-primary underline" href={`mailto:${COMPANY.supportEmail}`}>
            {COMPANY.supportEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
