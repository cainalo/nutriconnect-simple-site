// Textos e listas da página pública, compartilhados pelas versões de cada design (landing.tsx e
// landing-designs.tsx).
import {
  Activity,
  Apple,
  Award,
  BadgeCheck,
  Brain,
  Dumbbell,
  HeartPulse,
  MapIcon,
  Stethoscope,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { Names } from "@/lib/appearance-data";

export const FEATURES: { icon: LucideIcon; title: Names; text: Names; tone: string }[] = [
  {
    icon: Users,
    tone: "bg-[#f08a4b]/15 text-[#c4581f]",
    title: [
      "Uma rede que acolhe",
      "A welcoming network",
      "Una red que acoge",
      "Un réseau bienveillant",
    ],
    text: [
      "Receitas, experiências e perguntas de gente real, em comunidades temáticas e sem julgamento.",
      "Recipes, experiences and questions from real people, in themed communities, without judgment.",
      "Recetas, experiencias y preguntas de gente real, en comunidades temáticas y sin juicios.",
      "Recettes, expériences et questions de vraies personnes, en communautés thématiques, sans jugement.",
    ],
  },
  {
    icon: MapIcon,
    tone: "bg-[#78b873]/20 text-[#3f7a3b]",
    title: ["Aprender brincando", "Learn by playing", "Aprender jugando", "Apprendre en jouant"],
    text: [
      "Trilhas curtas com a Nina, níveis de Semente a Mestre, ofensivas e perfis para crianças.",
      "Short tracks with Nina, levels from Seed to Master, streaks and kid profiles.",
      "Rutas cortas con Nina, niveles de Semilla a Maestro, rachas y perfiles infantiles.",
      "Des parcours courts avec Nina, des niveaux de Graine à Maître, des séries et des profils enfants.",
    ],
  },
  {
    icon: Award,
    tone: "bg-[#e8b21c]/20 text-[#9a7409]",
    title: [
      "Hábitos em boa companhia",
      "Habits in good company",
      "Hábitos en buena compañía",
      "Des habitudes bien accompagnées",
    ],
    text: [
      "Desafios com check-in diário e um tema por semana que movimenta a conversa.",
      "Challenges with daily check-ins and a weekly theme that gets everyone talking.",
      "Desafíos con registro diario y un tema por semana que anima la conversación.",
      "Des défis avec validation quotidienne et un thème par semaine qui anime les échanges.",
    ],
  },
  {
    icon: BadgeCheck,
    tone: "bg-[#6aa6e6]/20 text-[#2f6aa8]",
    title: [
      "Profissionais verificados",
      "Verified professionals",
      "Profesionales verificados",
      "Professionnels vérifiés",
    ],
    text: [
      "Nutrição, medicina, psicologia, educação física, fisioterapia e enfermagem, com registro conferido.",
      "Nutrition, medicine, psychology, fitness, physiotherapy and nursing, with checked registration.",
      "Nutrición, medicina, psicología, educación física, fisioterapia y enfermería, con registro verificado.",
      "Nutrition, médecine, psychologie, sport, kinésithérapie et soins infirmiers, inscription vérifiée.",
    ],
  },
  {
    icon: Video,
    tone: "bg-[#2fb48c]/15 text-[#16805f]",
    title: [
      "Consulta por vídeo no site",
      "Video visits on the site",
      "Consulta por video en el sitio",
      "Téléconsultation sur le site",
    ],
    text: [
      "Agende, pague com segurança e entre na sala do NutriConnect, sem instalar nada. Nada é gravado.",
      "Book, pay securely and join the NutriConnect room, nothing to install. Nothing is recorded.",
      "Agenda, paga con seguridad y entra a la sala de NutriConnect, sin instalar nada. Nada se graba.",
      "Réservez, payez en sécurité et entrez dans la salle NutriConnect, sans rien installer. Rien n'est enregistré.",
    ],
  },
  {
    icon: HeartPulse,
    tone: "bg-[#b48ad6]/20 text-[#7a4ba3]",
    title: [
      "Acompanhamento de verdade",
      "Real follow-up",
      "Seguimiento de verdad",
      "Un vrai suivi",
    ],
    text: [
      "Plano, diário, metas, evolução e exames num só lugar, junto de quem cuida de você.",
      "Plan, diary, goals, progress and test results in one place, with the people who care for you.",
      "Plan, diario, metas, evolución y exámenes en un solo lugar, junto a quien te cuida.",
      "Plan, journal, objectifs, évolution et examens au même endroit, avec ceux qui vous suivent.",
    ],
  },
];

export const PROFESSIONS: { icon: LucideIcon; label: Names }[] = [
  { icon: Apple, label: ["Nutrição", "Nutrition", "Nutrición", "Nutrition"] },
  { icon: Stethoscope, label: ["Medicina", "Medicine", "Medicina", "Médecine"] },
  { icon: Brain, label: ["Psicologia", "Psychology", "Psicología", "Psychologie"] },
  { icon: Dumbbell, label: ["Educação física", "Fitness", "Educación física", "Sport"] },
  { icon: Activity, label: ["Fisioterapia", "Physiotherapy", "Fisioterapia", "Kinésithérapie"] },
  { icon: HeartPulse, label: ["Enfermagem", "Nursing", "Enfermería", "Soins infirmiers"] },
];

export const STEPS: { title: Names; text: Names }[] = [
  {
    title: [
      "Crie sua conta grátis",
      "Create a free account",
      "Crea tu cuenta gratis",
      "Créez un compte gratuit",
    ],
    text: [
      "Conte seus objetivos e escolha o visual do seu jeito.",
      "Share your goals and make it look your way.",
      "Cuenta tus objetivos y elige el estilo a tu manera.",
      "Indiquez vos objectifs et choisissez votre style.",
    ],
  },
  {
    title: [
      "Participe e aprenda",
      "Join in and learn",
      "Participa y aprende",
      "Participez et apprenez",
    ],
    text: [
      "Entre em comunidades, siga a trilha com a Nina e topa um desafio.",
      "Join communities, follow the track with Nina and take on a challenge.",
      "Entra en comunidades, sigue la ruta con Nina y acepta un desafío.",
      "Rejoignez des communautés, suivez le parcours avec Nina et relevez un défi.",
    ],
  },
  {
    title: [
      "Conte com um profissional",
      "Count on a professional",
      "Cuenta con un profesional",
      "Comptez sur un professionnel",
    ],
    text: [
      "Quando quiser, agende uma consulta e seja acompanhado(a) entre os encontros.",
      "Whenever you want, book a visit and get follow-up between appointments.",
      "Cuando quieras, agenda una consulta y recibe seguimiento entre encuentros.",
      "Quand vous voulez, prenez rendez-vous et soyez suivi(e) entre les séances.",
    ],
  },
];

export const FAQ: { q: Names; a: Names }[] = [
  {
    q: [
      "O NutriConnect é gratuito?",
      "Is NutriConnect free?",
      "¿NutriConnect es gratis?",
      "NutriConnect est-il gratuit ?",
    ],
    a: [
      "Sim. A rede, as trilhas, as comunidades e os desafios são gratuitos. Você só paga se marcar uma consulta, pelo valor que o(a) profissional define.",
      "Yes. The network, tracks, communities and challenges are free. You only pay if you book a visit, at the price the professional sets.",
      "Sí. La red, las rutas, las comunidades y los desafíos son gratis. Solo pagas si agendas una consulta, al precio que define el profesional.",
      "Oui. Le réseau, les parcours, les communautés et les défis sont gratuits. Vous ne payez que si vous réservez une consultation, au tarif fixé par le professionnel.",
    ],
  },
  {
    q: [
      "Como sei que o profissional é de verdade?",
      "How do I know the professional is real?",
      "¿Cómo sé que el profesional es real?",
      "Comment savoir si le professionnel est réel ?",
    ],
    a: [
      "Antes de atender, cada profissional envia o registro no conselho da profissão e a equipe confere. Só quem passa ganha o selo de verificado.",
      "Before seeing patients, each professional submits their council registration and our team checks it. Only those approved get the verified badge.",
      "Antes de atender, cada profesional envía su registro y el equipo lo verifica. Solo quien aprueba recibe el sello.",
      "Avant de consulter, chaque professionnel transmet son inscription et l'équipe la vérifie. Seuls ceux validés obtiennent le badge.",
    ],
  },
  {
    q: [
      "A consulta por vídeo é segura?",
      "Are video visits secure?",
      "¿La videoconsulta es segura?",
      "La téléconsultation est-elle sûre ?",
    ],
    a: [
      "Sim. O áudio e o vídeo vão direto entre você e o(a) profissional, criptografados, e nada é gravado. Só vocês dois entram na sala.",
      "Yes. Audio and video go straight between you and the professional, encrypted, and nothing is recorded. Only the two of you can join.",
      "Sí. El audio y el video van directo entre tú y el profesional, cifrados, y nada se graba. Solo ustedes dos entran a la sala.",
      "Oui. L'audio et la vidéo passent directement entre vous et le professionnel, chiffrés, et rien n'est enregistré. Vous seuls entrez dans la salle.",
    ],
  },
  {
    q: [
      "A Nina substitui um profissional?",
      "Does Nina replace a professional?",
      "¿Nina reemplaza a un profesional?",
      "Nina remplace-t-elle un professionnel ?",
    ],
    a: [
      "Não. A Nina é uma assistente educativa: tira dúvidas do dia a dia e indica o profissional certo quando o caso pede.",
      "No. Nina is an educational assistant: she answers everyday questions and points you to the right professional when needed.",
      "No. Nina es una asistente educativa: resuelve dudas del día a día e indica al profesional adecuado cuando hace falta.",
      "Non. Nina est une assistante éducative : elle répond aux questions du quotidien et oriente vers le bon professionnel si besoin.",
    ],
  },
];

/** Frases de abertura e chamadas, nos 4 idiomas. */
export const COPY = {
  badge: [
    "Rede social de alimentação e saúde",
    "A food and health social network",
    "Red social de alimentación y salud",
    "Le réseau social de l'alimentation et de la santé",
  ] as Names,
  h1a: [
    "Comer melhor é mais fácil",
    "Eating better is easier",
    "Comer mejor es más fácil",
    "Mieux manger, c'est plus facile",
  ] as Names,
  h1b: ["junto", "together", "juntos", "ensemble"] as Names,
  lead: [
    "Uma comunidade acolhedora para trocar receitas e experiências, aprender com trilhas divertidas e contar com profissionais de saúde verificados — com consulta por vídeo no próprio site.",
    "A welcoming community to share recipes and experiences, learn with fun tracks and count on verified health professionals — with video visits right on the site.",
    "Una comunidad acogedora para compartir recetas y experiencias, aprender con rutas divertidas y contar con profesionales de la salud verificados, con consulta por video en el propio sitio.",
    "Une communauté bienveillante pour partager recettes et expériences, apprendre avec des parcours ludiques et compter sur des professionnels de santé vérifiés — avec téléconsultation sur le site.",
  ] as Names,
  start: ["Começar grátis", "Start for free", "Empezar gratis", "Commencer gratuitement"] as Names,
  presentation: [
    "Ver a apresentação",
    "See the presentation",
    "Ver la presentación",
    "Voir la présentation",
  ] as Names,
  freeNote: [
    "Gratuito para participar. Você só paga se marcar uma consulta.",
    "Free to join. You only pay if you book a visit.",
    "Gratis para participar. Solo pagas si agendas una consulta.",
    "Gratuit pour participer. Vous ne payez que pour une consultation.",
  ] as Names,
  featuresTitle: [
    "Tudo o que ajuda a mudar um hábito",
    "Everything that helps change a habit",
    "Todo lo que ayuda a cambiar un hábito",
    "Tout ce qui aide à changer une habitude",
  ] as Names,
  howTitle: ["Como funciona", "How it works", "Cómo funciona", "Comment ça marche"] as Names,
  profBadge: [
    "Para profissionais de saúde",
    "For health professionals",
    "Para profesionales de la salud",
    "Pour les professionnels de santé",
  ] as Names,
  profTitle: [
    "Seu consultório on-line, junto de quem quer cuidar da saúde",
    "Your online practice, close to people who want to take care of themselves",
    "Tu consultorio en línea, cerca de quien quiere cuidarse",
    "Votre cabinet en ligne, au plus près de ceux qui veulent prendre soin d'eux",
  ] as Names,
  profCta: [
    "Criar conta e enviar meu registro",
    "Sign up and submit my registration",
    "Crear cuenta y enviar mi registro",
    "Créer un compte et envoyer mon inscription",
  ] as Names,
  faqTitle: [
    "Perguntas frequentes",
    "Frequently asked questions",
    "Preguntas frecuentes",
    "Questions fréquentes",
  ] as Names,
  finalTitle: [
    "Sua jornada começa agora",
    "Your journey starts now",
    "Tu camino empieza ahora",
    "Votre parcours commence maintenant",
  ] as Names,
  finalCreate: [
    "Criar minha conta",
    "Create my account",
    "Crear mi cuenta",
    "Créer mon compte",
  ] as Names,
  haveAccount: [
    "Já tenho conta",
    "I already have an account",
    "Ya tengo cuenta",
    "J'ai déjà un compte",
  ] as Names,
  login: ["Entrar", "Log in", "Entrar", "Se connecter"] as Names,
  signup: ["Criar conta", "Sign up", "Crear cuenta", "Créer un compte"] as Names,
  navFeatures: ["Recursos", "Features", "Recursos", "Fonctionnalités"] as Names,
  navPros: [
    "Para profissionais",
    "For professionals",
    "Para profesionales",
    "Pour les pros",
  ] as Names,
  navFaq: ["Dúvidas", "FAQ", "Preguntas", "FAQ"] as Names,
};
