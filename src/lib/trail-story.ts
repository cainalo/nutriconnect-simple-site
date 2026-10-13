// História da trilha, como num RPG: cada unidade é um capítulo de uma aventura e cada parada guarda um
// inimigo (um mito ou um mau hábito, nunca um alimento ou um corpo). Concluir os 3 níveis da parada
// derrota o inimigo; concluir todas as paradas fecha o capítulo. As cenas (cutscenes) são montadas
// aqui e tocadas pela camada HeroCinematic (lib/cinematic). Os textos vêm nos 4 idiomas do site.
import {
  AlarmClock,
  Bug,
  Candy,
  Crown,
  EyeOff,
  Flame,
  FlaskConical,
  Gem,
  Gift,
  Moon,
  Palette,
  Scissors,
  Smartphone,
  Spade,
  Sun,
  Tornado,
  UtensilsCrossed,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { Names } from "@/lib/appearance-data";
import type { CharacterAction } from "@/lib/characters/poses";
import type { CharacterId, ProfileKind, SceneId, Stop, Unit } from "@/lib/trail-types";

const n = (pt: string, en: string, es: string, fr: string): Names => [pt, en, es, fr];

/* ─────────────────────────────── Tipos das cenas ─────────────────────────────── */

/** Cenários das cenas: os quatro biomas da trilha e alguns lugares só da história. */
export type Backdrop = SceneId | "castle" | "village" | "market" | "camp" | "dawn";

/** Movimento de câmera de um plano. */
export type Camera = "wide" | "push" | "pull" | "pan-left" | "pan-right" | "enemy" | "heroes";

export type Fx =
  "flash" | "impact" | "sparkles" | "rays" | "confetti" | "embers" | "slash" | "clear";

export type Slot = "far-left" | "left" | "center" | "right" | "far-right";

/** Texto já traduzido ou nos 4 idiomas. */
export type Txt = string | Names;

export interface CastMember {
  id: CharacterId;
  at: Slot;
  action?: CharacterAction;
  /** De onde entra na primeira vez que aparece. */
  enter?: "left" | "right";
}

export type EnemyState = "appear" | "idle" | "taunt" | "hurt" | "defeated" | "flee";

export interface Line {
  /** Quem fala: um personagem, o inimigo do plano ou o narrador. */
  who: CharacterId | "enemy" | "narrator";
  text: Txt;
}

export interface Shot {
  bg: Backdrop;
  camera?: Camera;
  /** 0 (céu limpo) a 1 (névoa densa). */
  fog?: number;
  cast?: CastMember[];
  enemy?: { def: EnemyDef; state: EnemyState; at?: Slot };
  /** Cartão de título no meio da tela (abertura de capítulo, vitória...). */
  title?: { kicker?: Txt; text: Txt; sub?: Txt };
  emblem?: string;
  /** Selos extras (conquistas ganhas no mesmo momento). */
  badges?: { icon: string; title: string }[];
  lines?: Line[];
  fx?: Fx[];
  music?: Mood;
  /** Duração do plano sem falas (ms). */
  hold?: number;
}

export type Mood = "mystery" | "battle" | "calm" | "victory" | "fanfare";

export interface Cutscene {
  id: string;
  /** Rótulo para leitores de tela e para a lista de cenas. */
  label: Txt;
  shots: Shot[];
}

/* ───────────────────────────────── Inimigos ───────────────────────────────── */

export type EnemyShape =
  "ghost" | "blob" | "golem" | "serpent" | "spiky" | "whirl" | "mimic" | "wizard";

export interface EnemyDef {
  id: string;
  name: Names;
  shape: EnemyShape;
  color: string;
  color2: string;
  /** Símbolo que o inimigo carrega. */
  prop: LucideIcon;
  boss?: boolean;
  /** A provocação quando aparece. */
  taunt: Names;
  /** Quem dá o golpe final e a frase que vence o mito. */
  hero: CharacterId;
  defeat: Names;
}

/** Vilão de cada perfil: aparece na abertura e foge no fim dos capítulos. */
export const VILLAINS: Record<ProfileKind, EnemyDef> = {
  adult: {
    id: "doutor-milagre",
    name: n("Doutor Milagre", "Doctor Miracle", "Doctor Milagro", "Docteur Miracle"),
    shape: "wizard",
    color: "#6d3fa0",
    color2: "#c084fc",
    prop: FlaskConical,
    boss: true,
    taunt: n(
      "Esqueçam o que sabem! Com os meus milagres, ninguém mais precisa pensar no que come. Muahaha!",
      "Forget what you know! With my miracles, no one needs to think about food ever again. Mwahaha!",
      "¡Olviden lo que saben! Con mis milagros, nadie necesita pensar en lo que come. ¡Muajaja!",
      "Oubliez ce que vous savez ! Avec mes miracles, plus besoin de réfléchir à ce qu'on mange. Mouahaha !",
    ),
    hero: "nina",
    defeat: n("", "", "", ""),
  },
  kid: {
    id: "rei-cinzento",
    name: n("Rei Cinzento", "The Grey King", "El Rey Gris", "Le Roi Gris"),
    shape: "wizard",
    color: "#64748b",
    color2: "#cbd5e1",
    prop: Crown,
    boss: true,
    taunt: n(
      "Tudo cinza! Tudo sem graça! Ninguém vai querer provar nada novo! Ha-ha-ha!",
      "All grey! All boring! Nobody will want to try anything new! Ha-ha-ha!",
      "¡Todo gris! ¡Todo aburrido! ¡Nadie querrá probar nada nuevo! ¡Ja-ja-ja!",
      "Tout gris ! Tout fade ! Personne ne voudra goûter de nouveautés ! Ha-ha-ha !",
    ),
    hero: "cadu",
    defeat: n("", "", "", ""),
  },
};

const enemy = (
  id: string,
  name: Names,
  shape: EnemyShape,
  color: string,
  color2: string,
  prop: LucideIcon,
  taunt: Names,
  hero: CharacterId,
  defeat: Names,
  boss = false,
): EnemyDef => ({ id, name, shape, color, color2, prop, taunt, hero, defeat, boss });

/** O inimigo de cada parada (pelo id da parada). */
export const STOP_ENEMIES: Record<string, EnemyDef> = {
  // Capítulo 1 · O Campo das Origens
  "lesson-1-1": enemy(
    "corta-tudo",
    n("Fantasma Corta-Tudo", "The Cut-It-All Ghost", "Fantasma Corta-Todo", "Fantôme Coupe-Tout"),
    "ghost",
    "#7c6fb0",
    "#c7bff0",
    Scissors,
    n(
      "Corta o carboidrato! Corta a gordura! Corta tudo e pronto!",
      "Cut the carbs! Cut the fat! Cut everything and done!",
      "¡Corta los carbohidratos! ¡Corta la grasa! ¡Córtalo todo y listo!",
      "Coupez les glucides ! Coupez le gras ! Coupez tout, et voilà !",
    ),
    "nina",
    n(
      "Nenhum corpo funciona sem os três macronutrientes. Equilíbrio vence corte!",
      "No body works without all three macronutrients. Balance beats cutting!",
      "Ningún cuerpo funciona sin los tres macronutrientes. ¡El equilibrio vence al recorte!",
      "Aucun corps ne fonctionne sans les trois macronutriments. L'équilibre bat la coupe !",
    ),
  ),
  "lesson-1-2": enemy(
    "sombra-sem-cor",
    n("Sombra Sem-Cor", "The Colorless Shade", "Sombra Sin-Color", "Ombre Sans-Couleur"),
    "blob",
    "#6b7280",
    "#d1d5db",
    Palette,
    n(
      "Prato bege todo dia, pra que cor? Vitamina é só em pílula!",
      "A beige plate every day, who needs color? Vitamins come in pills!",
      "Plato beige todos los días, ¿para qué color? ¡Las vitaminas vienen en pastillas!",
      "Une assiette beige tous les jours, à quoi bon la couleur ? Les vitamines, c'est en pilule !",
    ),
    "mila",
    n(
      "Cada cor traz vitaminas e minerais diferentes. Prato colorido, sombra derrotada!",
      "Each color brings different vitamins and minerals. Colorful plate, shade defeated!",
      "Cada color trae vitaminas y minerales distintos. ¡Plato colorido, sombra vencida!",
      "Chaque couleur apporte d'autres vitamines et minéraux. Assiette colorée, ombre vaincue !",
    ),
  ),
  "lesson-1-3": enemy(
    "duna-seca",
    n("Duna Seca", "The Dry Dune", "Duna Seca", "Dune Sèche"),
    "golem",
    "#c2894b",
    "#f1d3a1",
    Sun,
    n(
      "Água só quando der sede... e fibra é coisa de passarinho!",
      "Water only when you're thirsty... and fiber is bird food!",
      "Agua solo cuando hay sed... ¡y la fibra es comida de pájaros!",
      "De l'eau seulement quand on a soif... et les fibres, c'est pour les oiseaux !",
    ),
    "cadu",
    n(
      "Água ao longo do dia e fibras no prato: essa duna desmorona!",
      "Water through the day and fiber on the plate: this dune crumbles!",
      "Agua durante el día y fibra en el plato: ¡esta duna se derrumba!",
      "De l'eau toute la journée et des fibres dans l'assiette : cette dune s'effondre !",
    ),
  ),
  // Capítulo 2 · O Mercado das Máscaras
  "lesson-2-1": enemy(
    "mimico",
    n(
      "Mímico Ultraprocessado",
      "The Ultra-Processed Mimic",
      "Mímico Ultraprocesado",
      "Mimique Ultra-Transformé",
    ),
    "mimic",
    "#c0267a",
    "#f9a8d4",
    Gift,
    n(
      "Pareço comida, tenho cheiro de comida... mas fui montado numa fábrica! Adivinha?",
      "I look like food, I smell like food... but I was assembled in a factory! Guess what?",
      "Parezco comida, huelo a comida... ¡pero me armaron en una fábrica! ¿Adivinas?",
      "J'ai l'air d'un aliment, l'odeur d'un aliment... mais on m'a assemblé en usine ! Devine ?",
    ),
    "lipe",
    n(
      "Desmascarado! Comida de verdade em primeiro lugar; ultraprocessado, só de vez em quando.",
      "Unmasked! Real food first; ultra-processed only once in a while.",
      "¡Desenmascarado! Comida de verdad primero; ultraprocesados, solo de vez en cuando.",
      "Démasqué ! De vrais aliments d'abord ; l'ultra-transformé, seulement de temps en temps.",
    ),
  ),
  "lesson-2-2": enemy(
    "serpente-mil-nomes",
    n(
      "Serpente dos Mil Nomes",
      "The Thousand-Name Serpent",
      "Serpiente de Mil Nombres",
      "Serpent aux Mille Noms",
    ),
    "serpent",
    "#5f8f2e",
    "#d9f99d",
    Candy,
    n(
      "Xarope, maltodextrina, dextrose... Me chame do que quiser, sssó não me chame de açúcar!",
      "Syrup, maltodextrin, dextrose... Call me anything, jussst don't call me sugar!",
      "Jarabe, maltodextrina, dextrosa... Llámame como quieras, ¡pero no me llamesss azúcar!",
      "Sirop, maltodextrine, dextrose... Appelle-moi comme tu veux, sssauf sucre !",
    ),
    "mila",
    n(
      "Achei você em todos os seus nomes! Lista de ingredientes lida, serpente vencida.",
      "Found you under every name! Ingredient list read, serpent defeated.",
      "¡Te encontré en todos tus nombres! Lista de ingredientes leída, serpiente vencida.",
      "Je t'ai trouvé sous tous tes noms ! Liste d'ingrédients lue, serpent vaincu.",
    ),
  ),
  "lesson-2-3": enemy(
    "ilusionista-porcao",
    n(
      "Ilusionista da Porção",
      "The Portion Illusionist",
      "Ilusionista de la Porción",
      "Illusionniste de la Portion",
    ),
    "whirl",
    "#4338ca",
    "#a5b4fc",
    Spade,
    n(
      "Só 90 calorias! ...por porção de meio biscoito. Truque perfeito!",
      "Only 90 calories! ...per serving of half a cookie. Perfect trick!",
      "¡Solo 90 calorías! ...por porción de media galleta. ¡Truco perfecto!",
      "Seulement 90 calories ! ...par portion d'un demi-biscuit. Tour parfait !",
    ),
    "tito",
    n(
      "Conferimos a porção, o %VD e comparamos os produtos. Fim do truque!",
      "We checked the serving size, the %DV and compared products. Trick's over!",
      "Revisamos la porción, el %VD y comparamos productos. ¡Se acabó el truco!",
      "On a vérifié la portion, les %AR et comparé les produits. Fin du tour !",
    ),
  ),
  // Capítulo 3 · A Cozinha do Castelo
  "lesson-3-1": enemy(
    "golem-desequilibrado",
    n("Golem Desequilibrado", "The Unbalanced Golem", "Gólem Desequilibrado", "Golem Déséquilibré"),
    "golem",
    "#9a4a2f",
    "#f0b598",
    UtensilsCrossed,
    n(
      "Meu prato é só massa! E um pouco mais de massa. Salada? Nunca ouvi falar!",
      "My plate is all pasta! And a bit more pasta. Salad? Never heard of it!",
      "¡Mi plato es solo pasta! Y un poco más de pasta. ¿Ensalada? ¡Ni idea!",
      "Mon assiette, c'est que des pâtes ! Et encore des pâtes. De la salade ? Connais pas !",
    ),
    "tito",
    n(
      "Metade de vegetais, um quarto de carboidrato, um quarto de proteína. Golem no chão!",
      "Half veggies, a quarter carbs, a quarter protein. Golem down!",
      "Mitad verduras, un cuarto de carbohidratos, un cuarto de proteína. ¡Gólem al suelo!",
      "Moitié légumes, un quart de féculents, un quart de protéines. Golem à terre !",
    ),
  ),
  "lesson-3-2": enemy(
    "barao-do-sal",
    n("Barão do Sal", "Baron Salt", "Barón de la Sal", "Baron du Sel"),
    "spiky",
    "#64748b",
    "#e2e8f0",
    Gem,
    n(
      "Sem mim nada tem sabor! Mais um saleiro, por favor... e mais um caldo pronto!",
      "Without me nothing has flavor! Another salt shaker, please... and another bouillon cube!",
      "¡Sin mí nada tiene sabor! Otro salero, por favor... ¡y otro caldo en cubo!",
      "Sans moi, rien n'a de goût ! Encore une salière, s'il vous plaît... et un bouillon cube !",
    ),
    "cadu",
    n(
      "Ervas, alho, limão e especiarias dão sabor de verdade. Sal com moderação, barão derrotado!",
      "Herbs, garlic, lemon and spices bring real flavor. Salt in moderation, baron defeated!",
      "Hierbas, ajo, limón y especias dan sabor de verdad. Sal con moderación, ¡barón vencido!",
      "Herbes, ail, citron et épices donnent du vrai goût. Le sel avec modération : baron vaincu !",
    ),
  ),
  "lesson-3-3": enemy(
    "relogio-da-pressa",
    n("Relógio da Pressa", "The Rush Clock", "Reloj de la Prisa", "Horloge de la Hâte"),
    "whirl",
    "#d9692a",
    "#fed7aa",
    AlarmClock,
    n(
      "Tique-taque! Não dá tempo de cozinhar, pede qualquer coisa e pronto!",
      "Tick-tock! No time to cook, just order anything!",
      "¡Tic-tac! No hay tiempo para cocinar, ¡pide cualquier cosa y listo!",
      "Tic-tac ! Pas le temps de cuisiner, commande n'importe quoi !",
    ),
    "lipe",
    n(
      "Lista de compras, cardápio da semana e comida adiantada no domingo. Agora o tempo é nosso!",
      "Shopping list, weekly menu and Sunday meal prep. Now time is on our side!",
      "Lista de compras, menú semanal y comida adelantada el domingo. ¡Ahora el tiempo es nuestro!",
      "Liste de courses, menu de la semaine et cuisine du dimanche. Le temps est à nous !",
    ),
  ),
  // Capítulo 4 · O Lago do Espelho
  "lesson-4-1": enemy(
    "eco-da-ansiedade",
    n("Eco da Ansiedade", "The Echo of Anxiety", "Eco de la Ansiedad", "Écho de l'Anxiété"),
    "ghost",
    "#2f6f9f",
    "#bae6fd",
    Tornado,
    n(
      "Ansioso? Come! Entediado? Come! Eu sou a resposta pra tudo... tudo... tudo...",
      "Anxious? Eat! Bored? Eat! I'm the answer to everything... thing... thing...",
      "¿Ansioso? ¡Come! ¿Aburrido? ¡Come! Soy la respuesta a todo... todo... todo...",
      "Anxieux ? Mange ! Ennuyé ? Mange ! Je suis la réponse à tout... tout... tout...",
    ),
    "nina",
    n(
      "Fome física chega aos poucos e aceita várias comidas. Agora sabemos ouvir a diferença!",
      "Physical hunger builds slowly and accepts many foods. Now we can hear the difference!",
      "El hambre física llega de a poco y acepta muchas comidas. ¡Ahora sabemos notar la diferencia!",
      "La vraie faim monte doucement et accepte bien des aliments. On sait faire la différence !",
    ),
  ),
  "lesson-4-2": enemy(
    "vulto-da-distracao",
    n(
      "Vulto da Distração",
      "The Distraction Phantom",
      "Sombra de la Distracción",
      "Spectre de la Distraction",
    ),
    "mimic",
    "#334155",
    "#94a3b8",
    Smartphone,
    n(
      "Come olhando a tela! Nem sente o gosto, nem percebe que já acabou!",
      "Eat while staring at the screen! You won't taste it or notice it's gone!",
      "¡Come mirando la pantalla! ¡Ni sientes el sabor ni notas que ya terminó!",
      "Mange devant l'écran ! Tu ne sentiras pas le goût et tu ne verras pas que c'est fini !",
    ),
    "mila",
    n(
      "Comer devagar, com atenção ao sabor e à saciedade. A tela pode esperar!",
      "Eat slowly, paying attention to flavor and fullness. The screen can wait!",
      "Comer despacio, atentos al sabor y a la saciedad. ¡La pantalla puede esperar!",
      "Manger lentement, attentif au goût et à la satiété. L'écran peut attendre !",
    ),
  ),
  "lesson-4-3": {
    ...VILLAINS.adult,
    taunt: n(
      "A culpa é a minha arma favorita! Comeu um doce? Que vergonha... compre o meu chá detox!",
      "Guilt is my favorite weapon! Had a sweet? Shame on you... buy my detox tea!",
      "¡La culpa es mi arma favorita! ¿Comiste un dulce? Qué vergüenza... ¡compra mi té detox!",
      "La culpabilité est mon arme préférée ! Un dessert ? Quelle honte... achète mon thé détox !",
    ),
    hero: "nina",
    defeat: n(
      "Comida não é pecado e nenhum chá faz milagre. Sem culpa, a névoa não tem onde se esconder!",
      "Food isn't a sin and no tea works miracles. Without guilt, the fog has nowhere to hide!",
      "La comida no es pecado y ningún té hace milagros. ¡Sin culpa, la niebla no tiene dónde esconderse!",
      "Manger n'est pas un péché et aucun thé ne fait de miracle. Sans culpabilité, le brouillard n'a plus d'abri !",
    ),
  },

  // Infantil · Capítulo 1 · O Pomar sem Cor
  "kid-1-1": enemy(
    "ladrao-de-cores",
    n("Ladrão de Cores", "The Color Thief", "Ladrón de Colores", "Voleur de Couleurs"),
    "blob",
    "#6b7280",
    "#e5e7eb",
    Palette,
    n(
      "Peguei todas as cores! Agora seu prato vai ser cinza, cinza e cinza!",
      "I took all the colors! Now your plate will be grey, grey and grey!",
      "¡Me llevé todos los colores! ¡Ahora tu plato será gris, gris y gris!",
      "J'ai pris toutes les couleurs ! Ton assiette sera grise, grise et grise !",
    ),
    "cadu",
    n(
      "Uma fruta vermelha, um legume laranja, uma verdura verde... devolve as cores!",
      "A red fruit, an orange veggie, a green leaf... give the colors back!",
      "Una fruta roja, una verdura naranja, una hoja verde... ¡devuelve los colores!",
      "Un fruit rouge, un légume orange, une feuille verte... rends les couleurs !",
    ),
  ),
  "kid-1-2": enemy(
    "nunca-provei",
    n(
      "Monstrinho Nunca-Provei",
      "The Never-Tried-It Monster",
      "Monstruito Nunca-Probé",
      "Petit Monstre Jamais-Goûté",
    ),
    "spiky",
    "#16a34a",
    "#bbf7d0",
    EyeOff,
    n(
      "Eca! Nunca provei e não gostei! Nem vou provar!",
      "Yuck! Never tried it and I don't like it! Not gonna try!",
      "¡Puaj! ¡Nunca lo probé y no me gusta! ¡Ni lo voy a probar!",
      "Beurk ! Jamais goûté et je n'aime pas ! Je ne goûterai pas !",
    ),
    "mila",
    n(
      "Provar um pedacinho é coragem de herói! Às vezes a gente só gosta na terceira vez.",
      "Trying a tiny bite is hero courage! Sometimes we only like it the third time.",
      "¡Probar un pedacito es valentía de héroe! A veces nos gusta recién la tercera vez.",
      "Goûter un petit morceau, c'est du courage de héros ! Parfois on aime à la troisième fois.",
    ),
  ),
  "kid-1-3": enemy(
    "dragaozinho-da-sede",
    n(
      "Dragãozinho da Sede",
      "The Thirst Dragonling",
      "Dragoncito de la Sed",
      "Petit Dragon de la Soif",
    ),
    "serpent",
    "#dc2626",
    "#fecaca",
    Flame,
    n(
      "Fuuu! Vou secar a sua boca! E nada de água, só bebida docinha!",
      "Whoosh! I'll dry your mouth! And no water, only sweet drinks!",
      "¡Fuuu! ¡Te voy a secar la boca! ¡Y nada de agua, solo bebidas dulces!",
      "Fouuu ! Je vais te dessécher ! Et pas d'eau, que des boissons sucrées !",
    ),
    "tito",
    n(
      "Água é a super bebida! Um gole de cada vez e o fogo do dragão se apaga.",
      "Water is the super drink! One sip at a time and the dragon's fire goes out.",
      "¡El agua es la súper bebida! Un sorbo a la vez y el fuego del dragón se apaga.",
      "L'eau est la super boisson ! Une gorgée à la fois et le feu du dragon s'éteint.",
    ),
  ),
  // Infantil · Capítulo 2 · A Vila dos Campeões
  "kid-2-1": enemy(
    "bocejo-gigante",
    n("Bocejo Gigante", "The Giant Yawn", "Bostezo Gigante", "Bâillement Géant"),
    "ghost",
    "#8b5cf6",
    "#ddd6fe",
    Moon,
    n(
      "Uaaah... Pular o café da manhã é ótimo... pra ficar com soooono!",
      "Yaaawn... Skipping breakfast is great... for feeling sleeeepy!",
      "Uaaah... Saltarse el desayuno es genial... ¡para tener sueeeño!",
      "Ouaaah... Sauter le petit-déjeuner, c'est génial... pour avoir sommeeeil !",
    ),
    "tito",
    n(
      "Café da manhã de campeão: fruta, leite ou iogurte e um pão. Acorda, bocejo!",
      "A champion's breakfast: fruit, milk or yogurt and some bread. Wake up, yawn!",
      "Desayuno de campeón: fruta, leche o yogur y un pan. ¡Despierta, bostezo!",
      "Petit-déjeuner de champion : fruit, lait ou yaourt et du pain. Réveille-toi, bâillement !",
    ),
  ),
  "kid-2-2": enemy(
    "furacao-apressado",
    n("Furacão Apressado", "The Hasty Hurricane", "Huracán Apurado", "Ouragan Pressé"),
    "whirl",
    "#0891b2",
    "#a5f3fc",
    Wind,
    n(
      "Engole rápido! Nem mastiga! Mais rápido, mais rápido!",
      "Gulp it down! Don't chew! Faster, faster!",
      "¡Traga rápido! ¡Ni mastiques! ¡Más rápido, más rápido!",
      "Avale vite ! Ne mâche pas ! Plus vite, plus vite !",
    ),
    "lipe",
    n(
      "Mastigar devagar, sentir o sabor e ouvir a barriguinha. Calma, furacão!",
      "Chew slowly, taste the flavor and listen to your tummy. Easy, hurricane!",
      "Masticar despacio, sentir el sabor y escuchar la pancita. ¡Calma, huracán!",
      "Mâcher doucement, sentir le goût et écouter son ventre. Du calme, ouragan !",
    ),
  ),
  "kid-2-3": enemy(
    "rei-dos-germes",
    n("Rei dos Germes", "The Germ King", "Rey de los Gérmenes", "Roi des Microbes"),
    "spiky",
    "#65a30d",
    "#d9f99d",
    Bug,
    n(
      "Hehehe, mãos sujas são o meu castelo! Ninguém lava, ninguém lava!",
      "Hehehe, dirty hands are my castle! Nobody washes, nobody washes!",
      "¡Jejeje, las manos sucias son mi castillo! ¡Nadie se lava, nadie se lava!",
      "Hihihi, les mains sales sont mon château ! Personne ne se lave !",
    ),
    "nina",
    n(
      "Água, sabão e vinte segundinhos esfregando... e o Rei dos Germes vai pelo ralo!",
      "Water, soap and twenty seconds of scrubbing... and the Germ King goes down the drain!",
      "Agua, jabón y veinte segunditos frotando... ¡y el Rey de los Gérmenes se va por el desagüe!",
      "De l'eau, du savon et vingt secondes à frotter... et le Roi des Microbes file dans l'évier !",
    ),
    true,
  ),
};

export const enemyOfStop = (stopId: string): EnemyDef | undefined => STOP_ENEMIES[stopId];

/* ──────────────────────────────── Capítulos ──────────────────────────────── */

interface StoryLine {
  who: CharacterId | "narrator" | "villain";
  text: Names;
}

export interface Chapter {
  unitId: string;
  number: number;
  title: Names;
  bg: Backdrop;
  intro: StoryLine[];
  outro: StoryLine[];
  /** Último capítulo: o vilão é vencido de vez (em vez de fugir). */
  last?: boolean;
}

const line = (who: StoryLine["who"], text: Names): StoryLine => ({ who, text });

export const CHAPTERS: Record<string, Chapter> = {
  "unit-1": {
    unitId: "unit-1",
    number: 1,
    title: n(
      "O Campo das Origens",
      "The Fields of Origin",
      "El Campo de los Orígenes",
      "Les Champs des Origines",
    ),
    bg: "meadow",
    intro: [
      line(
        "narrator",
        n(
          "No Campo das Origens nascem as três fontes do reino: a da energia, a das vitaminas e a da água.",
          "The Fields of Origin hold the kingdom's three springs: energy, vitamins and water.",
          "En el Campo de los Orígenes nacen las tres fuentes del reino: la de la energía, la de las vitaminas y la del agua.",
          "Dans les Champs des Origines naissent les trois sources du royaume : l'énergie, les vitamines et l'eau.",
        ),
      ),
      line(
        "nina",
        n(
          "A névoa apagou as três fontes. Para acendê-las de novo, vamos entender do que o corpo precisa de verdade.",
          "The fog put out all three springs. To light them again, let's learn what the body truly needs.",
          "La niebla apagó las tres fuentes. Para encenderlas de nuevo, entendamos lo que el cuerpo necesita de verdad.",
          "Le brouillard a éteint les trois sources. Pour les rallumer, comprenons ce dont le corps a vraiment besoin.",
        ),
      ),
      line(
        "tito",
        n(
          "E tem monstro de mito rondando cada fonte. Fica do meu lado que eu sou grandão!",
          "And there's a myth monster guarding each spring. Stay by my side, I'm a big guy!",
          "Y hay un monstruo de mito rondando cada fuente. ¡Quédate a mi lado, que soy grandote!",
          "Et un monstre-mythe rôde autour de chaque source. Reste près de moi, je suis costaud !",
        ),
      ),
    ],
    outro: [
      line(
        "narrator",
        n(
          "As três fontes voltam a brilhar, e o Campo das Origens fica verde outra vez.",
          "The three springs shine again, and the Fields of Origin turn green once more.",
          "Las tres fuentes vuelven a brillar y el Campo de los Orígenes se pone verde otra vez.",
          "Les trois sources brillent à nouveau et les Champs des Origines reverdissent.",
        ),
      ),
      line(
        "villain",
        n(
          "Tsc! Foi só um campinho. O meu Mercado das Máscaras você não desvenda tão fácil!",
          "Tsk! That was just a little field. You won't see through my Market of Masks so easily!",
          "¡Bah! Fue solo un campito. ¡Mi Mercado de las Máscaras no lo descifrarás tan fácil!",
          "Peuh ! Ce n'était qu'un petit champ. Mon Marché des Masques ne se laissera pas percer si vite !",
        ),
      ),
      line(
        "nina",
        n(
          "Ele fugiu, mas agora você sabe: nenhum nutriente é vilão. O segredo é o equilíbrio.",
          "He fled, but now you know: no nutrient is a villain. Balance is the secret.",
          "Huyó, pero ahora lo sabes: ningún nutriente es villano. El secreto es el equilibrio.",
          "Il a fui, mais tu le sais désormais : aucun nutriment n'est méchant. Le secret, c'est l'équilibre.",
        ),
      ),
    ],
  },
  "unit-2": {
    unitId: "unit-2",
    number: 2,
    title: n(
      "O Mercado das Máscaras",
      "The Market of Masks",
      "El Mercado de las Máscaras",
      "Le Marché des Masques",
    ),
    bg: "market",
    intro: [
      line(
        "narrator",
        n(
          "No Mercado das Máscaras nada é o que parece: as embalagens gritam promessas e escondem segredos.",
          "In the Market of Masks nothing is what it seems: packages shout promises and hide secrets.",
          "En el Mercado de las Máscaras nada es lo que parece: los envases gritan promesas y esconden secretos.",
          "Au Marché des Masques, rien n'est ce qu'il paraît : les emballages crient des promesses et cachent des secrets.",
        ),
      ),
      line(
        "lipe",
        n(
          'Aquele biscoito diz "integral" na frente... mas o primeiro ingrediente é farinha branca!',
          'That cookie says "whole grain" on the front... but the first ingredient is white flour!',
          'Esa galleta dice "integral" adelante... ¡pero el primer ingrediente es harina blanca!',
          "Ce biscuit dit « complet » sur le devant... mais le premier ingrédient, c'est de la farine blanche !",
        ),
      ),
      line(
        "nina",
        n(
          "Nossa arma aqui é a leitura. Rótulo, ingredientes e tabela: quem sabe ler não cai em máscara.",
          "Our weapon here is reading. Label, ingredients and the nutrition table: readers don't fall for masks.",
          "Nuestra arma aquí es la lectura. Etiqueta, ingredientes y tabla: quien sabe leer no cae en máscaras.",
          "Ici, notre arme, c'est la lecture. Étiquette, ingrédients et tableau : qui sait lire ne tombe pas dans le piège.",
        ),
      ),
    ],
    outro: [
      line(
        "narrator",
        n(
          "As máscaras caem uma a uma, e as barracas voltam a vender comida que mostra a própria cara.",
          "The masks fall one by one, and the stalls go back to selling food that shows its true face.",
          "Las máscaras caen una a una y los puestos vuelven a vender comida que muestra su cara.",
          "Les masques tombent un à un, et les étals revendent des aliments à visage découvert.",
        ),
      ),
      line(
        "villain",
        n(
          "Vocês leram os meus rótulos?! Ninguém lê rótulos! Na cozinha do castelo, quem manda ainda sou eu!",
          "You read my labels?! Nobody reads labels! In the castle kitchen, I'm still in charge!",
          "¡¿Leyeron mis etiquetas?! ¡Nadie lee etiquetas! ¡En la cocina del castillo todavía mando yo!",
          "Vous avez lu mes étiquettes ?! Personne ne lit les étiquettes ! Dans la cuisine du château, c'est encore moi qui commande !",
        ),
      ),
      line(
        "nina",
        n(
          "Próxima parada: a Cozinha do Castelo. Hora de montar o prato com tudo o que você aprendeu.",
          "Next stop: the Castle Kitchen. Time to build a plate with everything you've learned.",
          "Próxima parada: la Cocina del Castillo. Hora de armar el plato con todo lo que aprendiste.",
          "Prochaine étape : la Cuisine du Château. Composons l'assiette avec tout ce que tu as appris.",
        ),
      ),
    ],
  },
  "unit-3": {
    unitId: "unit-3",
    number: 3,
    title: n(
      "A Cozinha do Castelo",
      "The Castle Kitchen",
      "La Cocina del Castillo",
      "La Cuisine du Château",
    ),
    bg: "kitchen",
    intro: [
      line(
        "narrator",
        n(
          "A cozinha do castelo de Sabória está fria há tempos: panelas paradas, temperos esquecidos, pratos sem graça.",
          "The castle kitchen of Saboria has been cold for ages: idle pots, forgotten spices, dull plates.",
          "La cocina del castillo de Saboria lleva tiempo fría: ollas quietas, especias olvidadas, platos sin gracia.",
          "La cuisine du château de Saboria est froide depuis longtemps : casseroles immobiles, épices oubliées, assiettes fades.",
        ),
      ),
      line(
        "cadu",
        n(
          "Bora acender esse fogão! Prato bonito, temperado e planejado.",
          "Let's light this stove! A beautiful, well-seasoned, planned plate.",
          "¡A encender esta cocina! Plato lindo, condimentado y planificado.",
          "Allumons ce fourneau ! Une belle assiette, bien assaisonnée et planifiée.",
        ),
      ),
      line(
        "nina",
        n(
          "Aqui a batalha é na prática: montar o prato, temperar com sabor e planejar a semana.",
          "Here the battle is hands-on: build the plate, season with flavor and plan the week.",
          "Aquí la batalla es práctica: armar el plato, condimentar con sabor y planificar la semana.",
          "Ici, la bataille est concrète : composer l'assiette, assaisonner avec goût et planifier la semaine.",
        ),
      ),
    ],
    outro: [
      line(
        "narrator",
        n(
          "O fogo volta a crepitar, e o cheiro de alho e ervas sobe pelas torres do castelo.",
          "The fire crackles again, and the smell of garlic and herbs rises through the castle towers.",
          "El fuego vuelve a crepitar y el olor a ajo y hierbas sube por las torres del castillo.",
          "Le feu crépite à nouveau et l'odeur d'ail et d'herbes monte dans les tours du château.",
        ),
      ),
      line(
        "villain",
        n(
          "Comida caseira, temperada e planejada?! Meus atalhos perderam a graça... Vou me esconder no Lago do Espelho!",
          "Homemade, seasoned, planned food?! My shortcuts are losing their charm... I'll hide in the Mirror Lake!",
          "¡¿Comida casera, condimentada y planificada?! Mis atajos perdieron la gracia... ¡Me esconderé en el Lago del Espejo!",
          "Des repas maison, assaisonnés et planifiés ?! Mes raccourcis ne font plus effet... Je file au Lac du Miroir !",
        ),
      ),
      line(
        "nina",
        n(
          "Falta a parte mais profunda da jornada: a nossa relação com a comida.",
          "The deepest part of the journey remains: our relationship with food.",
          "Falta la parte más profunda del viaje: nuestra relación con la comida.",
          "Reste la partie la plus profonde du voyage : notre relation à la nourriture.",
        ),
      ),
    ],
  },
  "unit-4": {
    unitId: "unit-4",
    number: 4,
    title: n("O Lago do Espelho", "The Mirror Lake", "El Lago del Espejo", "Le Lac du Miroir"),
    bg: "lake",
    last: true,
    intro: [
      line(
        "narrator",
        n(
          "No Lago do Espelho a névoa é mais densa. Aqui os monstros não estão no prato, e sim nos pensamentos.",
          "At the Mirror Lake the fog is thickest. Here the monsters aren't on the plate, but in our thoughts.",
          "En el Lago del Espejo la niebla es más densa. Aquí los monstruos no están en el plato, sino en los pensamientos.",
          "Au Lac du Miroir, le brouillard est le plus épais. Ici, les monstres ne sont pas dans l'assiette, mais dans nos pensées.",
        ),
      ),
      line(
        "mila",
        n(
          "Esse lago mostra como a gente se sente quando come... às vezes dá até um friozinho.",
          "This lake shows how we feel when we eat... sometimes it gives me the chills.",
          "Este lago muestra cómo nos sentimos al comer... a veces da hasta un escalofrío.",
          "Ce lac montre ce qu'on ressent en mangeant... parfois, ça donne des frissons.",
        ),
      ),
      line(
        "nina",
        n(
          "Sem culpa e sem pressa. Vamos aprender a ouvir o corpo e fazer as pazes com a comida.",
          "No guilt and no rush. Let's learn to listen to the body and make peace with food.",
          "Sin culpa y sin prisa. Aprendamos a escuchar al cuerpo y a hacer las paces con la comida.",
          "Sans culpabilité ni précipitation. Apprenons à écouter le corps et à faire la paix avec la nourriture.",
        ),
      ),
    ],
    outro: [
      line(
        "narrator",
        n(
          "A última névoa se desfaz sobre o lago. Pela primeira vez em muito tempo, Sabória inteira amanhece clara.",
          "The last fog dissolves over the lake. For the first time in ages, all of Saboria wakes up bright.",
          "La última niebla se deshace sobre el lago. Por primera vez en mucho tiempo, toda Saboria amanece clara.",
          "Le dernier brouillard se dissipe sur le lac. Pour la première fois depuis longtemps, tout Saboria s'éveille dans la clarté.",
        ),
      ),
      line(
        "villain",
        n(
          "Impossível! Sem medo, sem culpa, sem confusão... ninguém mais compra os meus milagres!",
          "Impossible! No fear, no guilt, no confusion... nobody buys my miracles anymore!",
          "¡Imposible! Sin miedo, sin culpa, sin confusión... ¡nadie compra más mis milagros!",
          "Impossible ! Sans peur, sans culpabilité, sans confusion... plus personne n'achète mes miracles !",
        ),
      ),
      line(
        "nina",
        n(
          "Mitos sempre tentam voltar. Mas agora você tem o que nenhum milagre vende: conhecimento e paz com a comida.",
          "Myths always try to come back. But now you have what no miracle sells: knowledge and peace with food.",
          "Los mitos siempre intentan volver. Pero ahora tienes lo que ningún milagro vende: conocimiento y paz con la comida.",
          "Les mythes essaient toujours de revenir. Mais tu as ce qu'aucun miracle ne vend : le savoir et la paix avec la nourriture.",
        ),
      ),
    ],
  },
  "kid-unit-1": {
    unitId: "kid-unit-1",
    number: 1,
    title: n(
      "O Pomar sem Cor",
      "The Colorless Orchard",
      "El Huerto sin Color",
      "Le Verger sans Couleur",
    ),
    bg: "orchard",
    intro: [
      line(
        "narrator",
        n(
          "O pomar da vila acordou todo cinza. As frutas estão tristes e ninguém quer provar nada.",
          "The village orchard woke up all grey. The fruits are sad and nobody wants to try anything.",
          "El huerto del pueblo amaneció todo gris. Las frutas están tristes y nadie quiere probar nada.",
          "Le verger du village s'est réveillé tout gris. Les fruits sont tristes et personne ne veut rien goûter.",
        ),
      ),
      line(
        "mila",
        n(
          "Cada cor de fruta tem um superpoder! Vamos devolver uma por uma?",
          "Every fruit color has a superpower! Shall we bring them back one by one?",
          "¡Cada color de fruta tiene un superpoder! ¿Las devolvemos una por una?",
          "Chaque couleur de fruit a un superpouvoir ! On les ramène une par une ?",
        ),
      ),
      line(
        "cadu",
        n(
          "E quem estiver com sede já pega a garrafinha de água. Aventura dá sede!",
          "And if you're thirsty, grab your water bottle. Adventures make you thirsty!",
          "¡Y quien tenga sed, que agarre su botellita de agua! ¡La aventura da sed!",
          "Et si tu as soif, prends ta gourde d'eau. L'aventure, ça donne soif !",
        ),
      ),
    ],
    outro: [
      line(
        "narrator",
        n(
          "O vermelho, o laranja, o amarelo, o verde e o roxo voltam a brilhar no pomar!",
          "Red, orange, yellow, green and purple shine in the orchard again!",
          "¡El rojo, el naranja, el amarillo, el verde y el morado vuelven a brillar en el huerto!",
          "Le rouge, l'orange, le jaune, le vert et le violet brillent à nouveau dans le verger !",
        ),
      ),
      line(
        "villain",
        n(
          "Grrr! As minhas nuvens cinzentas sumiram! Mas eu ainda tenho a Vila dos Campeões!",
          "Grrr! My grey clouds are gone! But I still have the Champions' Village!",
          "¡Grrr! ¡Mis nubes grises desaparecieron! ¡Pero todavía tengo el Pueblo de los Campeones!",
          "Grrr ! Mes nuages gris ont disparu ! Mais il me reste le Village des Champions !",
        ),
      ),
      line(
        "cadu",
        n(
          "Pode vir! A gente está cheio de energia colorida!",
          "Bring it on! We're full of colorful energy!",
          "¡Que venga! ¡Estamos llenos de energía de colores!",
          "Qu'il vienne ! On est pleins d'énergie colorée !",
        ),
      ),
    ],
  },
  "kid-unit-2": {
    unitId: "kid-unit-2",
    number: 2,
    title: n(
      "A Vila dos Campeões",
      "The Champions' Village",
      "El Pueblo de los Campeones",
      "Le Village des Champions",
    ),
    bg: "village",
    last: true,
    intro: [
      line(
        "narrator",
        n(
          "Na Vila dos Campeões todo mundo acordou bocejando, comendo correndo e esquecendo de lavar as mãos.",
          "In the Champions' Village everyone woke up yawning, eating in a rush and forgetting to wash their hands.",
          "En el Pueblo de los Campeones todos despertaron bostezando, comiendo apurados y olvidando lavarse las manos.",
          "Au Village des Champions, tout le monde s'est réveillé en bâillant, en mangeant trop vite et sans se laver les mains.",
        ),
      ),
      line(
        "tito",
        n(
          "Campeão de verdade começa o dia bem alimentado e cuida do próprio corpo!",
          "A real champion starts the day well fed and takes care of their body!",
          "¡Un campeón de verdad empieza el día bien alimentado y cuida su cuerpo!",
          "Un vrai champion commence la journée bien nourri et prend soin de son corps !",
        ),
      ),
      line(
        "nina",
        n(
          "Vamos ajudar a vila? Cada hábito bom que você aprende espanta um monstrinho.",
          "Shall we help the village? Every good habit you learn scares away a little monster.",
          "¿Ayudamos al pueblo? Cada buen hábito que aprendes espanta a un monstruito.",
          "On aide le village ? Chaque bonne habitude apprise fait fuir un petit monstre.",
        ),
      ),
    ],
    outro: [
      line(
        "narrator",
        n(
          "A vila acorda cheia de energia, mastigando com calma e com as mãos bem limpinhas.",
          "The village wakes up full of energy, chewing calmly and with squeaky-clean hands.",
          "El pueblo despierta lleno de energía, masticando con calma y con las manos bien limpitas.",
          "Le village s'éveille plein d'énergie, mâchant tranquillement, les mains bien propres.",
        ),
      ),
      line(
        "villain",
        n(
          "Não acredito! Cores, energia e mãos limpas... Eu desisto! Bom, por hoje...",
          "I can't believe it! Colors, energy and clean hands... I give up! Well, for today...",
          "¡No lo puedo creer! Colores, energía y manos limpias... ¡Me rindo! Bueno, por hoy...",
          "Je n'y crois pas ! Des couleurs, de l'énergie et des mains propres... J'abandonne ! Enfin, pour aujourd'hui...",
        ),
      ),
      line(
        "cadu",
        n(
          "Você é um verdadeiro campeão da Vila Arco-Íris!",
          "You're a true champion of Rainbow Village!",
          "¡Eres un verdadero campeón del Pueblo Arcoíris!",
          "Tu es un vrai champion du Village Arc-en-ciel !",
        ),
      ),
    ],
  },
};

export const chapterOf = (unitId: string): Chapter | undefined => CHAPTERS[unitId];

/* ──────────────────────────────── Prólogo ──────────────────────────────── */

const PROLOGUE: Record<ProfileKind, { bg: Backdrop; world: Names; lines: StoryLine[] }> = {
  adult: {
    bg: "castle",
    world: n(
      "Sabória e a Névoa dos Mitos",
      "Saboria and the Fog of Myths",
      "Saboria y la Niebla de los Mitos",
      "Saboria et le Brouillard des Mythes",
    ),
    lines: [
      line(
        "narrator",
        n(
          "Sabória era um reino onde comer bem era simples: comida de verdade, mesa cheia e ninguém com medo do prato.",
          "Saboria was a kingdom where eating well was simple: real food, a full table and nobody afraid of their plate.",
          "Saboria era un reino donde comer bien era simple: comida de verdad, mesa llena y nadie con miedo al plato.",
          "Saboria était un royaume où bien manger était simple : de vrais aliments, une table pleine et personne n'avait peur de son assiette.",
        ),
      ),
      line(
        "narrator",
        n(
          "Até que chegou o Doutor Milagre, vendendo atalhos e dietas mágicas, e espalhou uma névoa de mitos que confundiu todo mundo.",
          "Then came Doctor Miracle, selling shortcuts and magic diets, and spread a fog of myths that confused everyone.",
          "Hasta que llegó el Doctor Milagro, vendiendo atajos y dietas mágicas, y esparció una niebla de mitos que confundió a todos.",
          "Puis vint le Docteur Miracle, vendeur de raccourcis et de régimes magiques, qui répandit un brouillard de mythes et sema la confusion.",
        ),
      ),
      line("villain", VILLAINS.adult.taunt),
      line(
        "nina",
        n(
          "Cada coisa que você aprende abre uma clareira nessa névoa. Topa entrar nessa jornada com a gente?",
          "Everything you learn opens a clearing in that fog. Will you join us on this journey?",
          "Cada cosa que aprendes abre un claro en esa niebla. ¿Te animas a este viaje con nosotros?",
          "Chaque chose apprise ouvre une éclaircie dans ce brouillard. Tu nous rejoins dans cette aventure ?",
        ),
      ),
      line(
        "lipe",
        n(
          "A turma está pronta! Cada mito derrotado devolve a cor a um pedaço do reino.",
          "The crew is ready! Every myth defeated brings color back to a piece of the kingdom.",
          "¡El equipo está listo! Cada mito vencido le devuelve el color a un pedazo del reino.",
          "L'équipe est prête ! Chaque mythe vaincu rend sa couleur à un bout du royaume.",
        ),
      ),
    ],
  },
  kid: {
    bg: "village",
    world: n(
      "A Aventura da Vila Arco-Íris",
      "The Rainbow Village Adventure",
      "La Aventura del Pueblo Arcoíris",
      "L'Aventure du Village Arc-en-ciel",
    ),
    lines: [
      line(
        "narrator",
        n(
          "Na Vila Arco-Íris as frutas brilhavam em todas as cores e a criançada tinha energia de sobra.",
          "In Rainbow Village the fruits shone in every color and the kids had energy to spare.",
          "En el Pueblo Arcoíris las frutas brillaban de todos los colores y los chicos tenían energía de sobra.",
          "Au Village Arc-en-ciel, les fruits brillaient de toutes les couleurs et les enfants débordaient d'énergie.",
        ),
      ),
      line(
        "narrator",
        n(
          "Mas o Rei Cinzento soprou uma nuvem sem graça e roubou as cores e a energia da vila!",
          "But the Grey King blew a dull cloud and stole the village's colors and energy!",
          "¡Pero el Rey Gris sopló una nube aburrida y se robó los colores y la energía del pueblo!",
          "Mais le Roi Gris a soufflé un nuage tout fade et a volé les couleurs et l'énergie du village !",
        ),
      ),
      line("villain", VILLAINS.kid.taunt),
      line(
        "cadu",
        n(
          "Ei, não tão rápido! Com a nossa turma e com você, as cores vão voltar!",
          "Hey, not so fast! With our crew and you, the colors will come back!",
          "¡Eh, no tan rápido! ¡Con nuestro equipo y contigo, los colores van a volver!",
          "Hé, pas si vite ! Avec notre équipe et toi, les couleurs vont revenir !",
        ),
      ),
    ],
  },
};

/* ─────────────────────────────── Frases gerais ─────────────────────────────── */

const T = {
  journey: n(
    "Uma jornada NutriConnect",
    "A NutriConnect journey",
    "Un viaje NutriConnect",
    "Une aventure NutriConnect",
  ),
  chapter: n("Capítulo {n}", "Chapter {n}", "Capítulo {n}", "Chapitre {n}"),
  chapterDone: n(
    "Capítulo {n} concluído",
    "Chapter {n} complete",
    "Capítulo {n} completado",
    "Chapitre {n} terminé",
  ),
  enemyKicker: n("Um inimigo surge", "An enemy appears", "Aparece un enemigo", "Un ennemi surgit"),
  bossKicker: n("O chefão aparece", "The boss appears", "Aparece el jefe", "Le boss apparaît"),
  battlePlan: n(
    "Conhecimento é a nossa magia: vença os 3 níveis desta parada e esse mito não resiste!",
    "Knowledge is our magic: clear the 3 levels of this stop and this myth won't stand a chance!",
    "El conocimiento es nuestra magia: supera los 3 niveles de esta parada y este mito no resiste.",
    "Le savoir est notre magie : réussis les 3 niveaux de cette étape et ce mythe ne tiendra pas !",
  ),
  kidPlan: n(
    "Vamos vencer juntos! É só completar os 3 níveis desta parada.",
    "Let's beat it together! Just complete the 3 levels of this stop.",
    "¡Vamos a vencerlo juntos! Solo completa los 3 niveles de esta parada.",
    "On va le battre ensemble ! Il suffit de réussir les 3 niveaux de cette étape.",
  ),
  defeated: n(
    "{name} foi derrotado!",
    "{name} has been defeated!",
    "¡{name} fue derrotado!",
    "{name} est vaincu !",
  ),
  victory: n("Vitória!", "Victory!", "¡Victoria!", "Victoire !"),
  victoryLine: n(
    "Mais um pedaço do reino livre da névoa. A jornada continua!",
    "Another piece of the kingdom free from the fog. The journey goes on!",
    "Otro pedazo del reino libre de la niebla. ¡El viaje continúa!",
    "Un autre bout du royaume libéré du brouillard. L'aventure continue !",
  ),
  kidVictoryLine: n(
    "Mais uma cor de volta para a vila. Você é demais!",
    "Another color back in the village. You're awesome!",
    "Otro color de vuelta en el pueblo. ¡Eres genial!",
    "Une couleur de plus revenue au village. Tu es génial !",
  ),
  finalWin: n("A névoa se foi", "The fog is gone", "La niebla se fue", "Le brouillard a disparu"),
  fleeLine: n(
    "Isso não acaba aqui!",
    "This isn't over!",
    "¡Esto no termina aquí!",
    "Ce n'est pas fini !",
  ),
};

const fill = (names: Names, vars: Record<string, string | number>): Names =>
  names.map((s) =>
    s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? "")),
  ) as unknown as Names;

/** Nome traduzido de dentro de um texto de 4 idiomas (para montar frases com o nome do inimigo). */
const withName = (names: Names, name: Names): Names =>
  names.map((s, i) => s.replace("{name}", name[i])) as unknown as Names;

/* ─────────────────────────────── Roteiros ─────────────────────────────── */

const fromLines = (lines: StoryLine[]): Line[] =>
  lines.map((l) =>
    l.who === "villain" ? { who: "enemy" as const, text: l.text } : { who: l.who, text: l.text },
  );

const TEAM: CharacterId[] = ["nina", "lipe", "mila", "tito", "cadu"];

/** A turma posicionada no palco (o primeiro no centro). */
function team(lead: CharacterId, action: CastMember["action"] = "idle", enter?: "left" | "right") {
  const others = TEAM.filter((id) => id !== lead);
  const slots: Slot[] = ["left", "right", "far-left", "far-right"];
  return [
    { id: lead, at: "center" as Slot, action, enter },
    ...others.map((id, i) => ({
      id,
      at: slots[i],
      action,
      enter: enter ?? (i % 2 ? "right" : "left"),
    })),
  ] as CastMember[];
}

/** Heróis à esquerda, deixando a direita para o inimigo. */
function squad(lead: CharacterId, action: CastMember["action"] = "idle"): CastMember[] {
  const second = lead === "nina" ? "tito" : "nina";
  return [
    { id: second, at: "far-left", action, enter: "left" },
    { id: lead, at: "left", action, enter: "left" },
  ];
}

export function prologueScene(kind: ProfileKind): Cutscene {
  const p = PROLOGUE[kind];
  const villain = VILLAINS[kind];
  const [l1, l2, l3, ...rest] = fromLines(p.lines);
  return {
    id: `prologue:${kind}`,
    label: p.world,
    shots: [
      {
        bg: p.bg,
        camera: "pull",
        music: "calm",
        title: { kicker: T.journey, text: p.world },
        hold: 3800,
        fx: ["sparkles"],
      },
      { bg: p.bg, camera: "pan-right", lines: [l1] },
      { bg: p.bg, camera: "push", fog: 0.85, music: "mystery", lines: [l2] },
      {
        bg: p.bg,
        camera: "enemy",
        fog: 0.85,
        enemy: { def: villain, state: "appear", at: "center" },
        fx: ["flash"],
        lines: [l3],
      },
      {
        bg: p.bg,
        camera: "heroes",
        fog: 0.5,
        music: "calm",
        cast: team(kind === "kid" ? "cadu" : "nina", "wave"),
        lines: rest,
      },
    ],
  };
}

export function chapterIntroScene(chapter: Chapter): Cutscene {
  const lines = fromLines(chapter.intro);
  const [first, ...talk] = lines;
  const speakers = talk
    .map((l) => l.who)
    .filter((w): w is CharacterId => w !== "enemy" && w !== "narrator");
  const lead = speakers[speakers.length - 1] ?? "nina";
  return {
    id: `intro:${chapter.unitId}`,
    label: fill(T.chapter, { n: chapter.number }),
    shots: [
      {
        bg: chapter.bg,
        camera: "pull",
        fog: 0.75,
        music: "mystery",
        title: { kicker: fill(T.chapter, { n: chapter.number }), text: chapter.title },
        hold: 3600,
      },
      { bg: chapter.bg, camera: "pan-left", fog: 0.75, lines: [first] },
      {
        bg: chapter.bg,
        camera: "heroes",
        fog: 0.6,
        cast: team(lead, "talk"),
        lines: talk,
      },
    ],
  };
}

export function encounterScene(stop: Stop, unit: Unit, kind: ProfileKind): Cutscene | null {
  const def = enemyOfStop(stop.id);
  if (!def) return null;
  const chapter = chapterOf(unit.id);
  const bg = chapter?.bg ?? unit.scene;
  return {
    id: `encounter:${stop.id}`,
    label: def.name,
    shots: [
      {
        bg,
        camera: "enemy",
        fog: 0.7,
        music: "battle",
        enemy: { def, state: "appear", at: "right" },
        cast: squad(def.hero, "think"),
        fx: ["flash", "impact"],
        title: { kicker: def.boss ? T.bossKicker : T.enemyKicker, text: def.name },
        hold: 2600,
      },
      {
        bg,
        camera: "enemy",
        fog: 0.7,
        enemy: { def, state: "taunt", at: "right" },
        cast: squad(def.hero, "think"),
        lines: [{ who: "enemy", text: def.taunt }],
      },
      {
        bg,
        camera: "heroes",
        fog: 0.6,
        enemy: { def, state: "idle", at: "right" },
        cast: squad(def.hero, "point"),
        lines: [{ who: def.hero, text: kind === "kid" ? T.kidPlan : T.battlePlan }],
      },
    ],
  };
}

export function defeatScene(stop: Stop, unit: Unit, kind: ProfileKind): Cutscene | null {
  const def = enemyOfStop(stop.id);
  if (!def) return null;
  const chapter = chapterOf(unit.id);
  const bg = chapter?.bg ?? unit.scene;
  return {
    id: `defeat:${stop.id}`,
    label: def.name,
    shots: [
      {
        bg,
        camera: "wide",
        fog: 0.6,
        music: "battle",
        enemy: { def, state: "taunt", at: "right" },
        cast: squad(def.hero, "point"),
        lines: [{ who: def.hero, text: def.defeat }],
      },
      {
        bg,
        camera: "enemy",
        fog: 0.4,
        enemy: { def, state: "hurt", at: "right" },
        cast: squad(def.hero, "point"),
        fx: ["slash", "impact", "flash"],
        hold: 1500,
      },
      {
        bg,
        camera: "enemy",
        fog: 0,
        enemy: { def, state: "defeated", at: "right" },
        cast: squad(def.hero, "cheer"),
        fx: ["clear", "sparkles"],
        lines: [{ who: "narrator", text: withName(T.defeated, def.name) }],
      },
      {
        bg,
        camera: "heroes",
        fog: 0,
        music: "fanfare",
        cast: team(def.hero, "cheer"),
        emblem: stop.icon,
        title: { kicker: T.victory, text: stop.title },
        fx: ["rays", "confetti"],
        lines: [{ who: def.hero, text: kind === "kid" ? T.kidVictoryLine : T.victoryLine }],
      },
    ],
  };
}

export function chapterFinaleScene(chapter: Chapter, kind: ProfileKind): Cutscene {
  const villain = VILLAINS[kind];
  const [narration, villainLine, closing] = fromLines(chapter.outro);
  const closer =
    closing && closing.who !== "enemy" && closing.who !== "narrator" ? closing.who : "nina";
  return {
    id: `finale:${chapter.unitId}`,
    label: fill(T.chapterDone, { n: chapter.number }),
    shots: [
      {
        bg: chapter.bg,
        camera: "pull",
        fog: 0,
        music: "calm",
        fx: ["clear", "rays"],
        lines: narration ? [narration] : [],
        hold: 2400,
      },
      ...(villainLine
        ? [
            {
              bg: chapter.bg,
              camera: "enemy" as Camera,
              enemy: {
                def: villain,
                state: chapter.last ? ("defeated" as EnemyState) : ("flee" as EnemyState),
                at: "right" as Slot,
              },
              cast: squad(closer, "point"),
              lines: [villainLine],
              fx: chapter.last ? (["flash", "sparkles"] as Fx[]) : undefined,
            },
          ]
        : []),
      {
        bg: chapter.last ? "dawn" : chapter.bg,
        camera: "heroes",
        music: "fanfare",
        cast: team(closer, "cheer"),
        title: {
          kicker: fill(T.chapterDone, { n: chapter.number }),
          text: chapter.last ? T.finalWin : chapter.title,
        },
        fx: ["rays", "confetti"],
        lines: closing ? [closing] : [],
      },
    ],
  };
}

/* ───────────────────────────── Cenas já vistas ───────────────────────────── */

const seenKey = (scope: string) => `nc_story_seen:${scope}`;

export function loadSeen(scope: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(scope));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markSeen(scope: string, ids: string[]) {
  try {
    const all = loadSeen(scope);
    ids.forEach((id) => all.add(id));
    localStorage.setItem(seenKey(scope), JSON.stringify([...all]));
  } catch {
    // Sem armazenamento: a cena só toca de novo na próxima vez.
  }
}
