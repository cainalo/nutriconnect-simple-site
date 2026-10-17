// Dicas extras da "Dica do dia" (Funções), com tema. Fontes: Guia Alimentar para a População
// Brasileira e regras de rotulagem da Anvisa.
import type { Names } from "@/lib/appearance-data";

export type TipTheme = "cozinha" | "compras" | "rotulo" | "habito" | "agua";

export const MORE_TIPS: { theme: TipTheme; text: Names }[] = [
  {
    theme: "cozinha",
    text: [
      "Cozinhe uma panela de feijão no fim de semana e congele em porções: rende a semana inteira.",
      "Cook a pot of beans on the weekend and freeze it in portions: it lasts the whole week.",
      "Cocina una olla de frijoles el fin de semana y congélala en porciones: rinde toda la semana.",
      "Cuisinez une marmite de haricots le week-end et congelez-la en portions : ça dure toute la semaine.",
    ],
  },
  {
    theme: "cozinha",
    text: [
      "Ervas e temperos naturais (alho, cebola, salsinha, limão) deixam a comida saborosa com menos sal.",
      "Natural herbs and seasonings (garlic, onion, parsley, lemon) add flavor with less salt.",
      "Hierbas y condimentos naturales (ajo, cebolla, perejil, limón) dan sabor con menos sal.",
      "Herbes et aromates (ail, oignon, persil, citron) donnent du goût avec moins de sel.",
    ],
  },
  {
    theme: "cozinha",
    text: [
      "Talos de couve, brócolis e beterraba vão bem em refogados, sopas e bolinhos.",
      "Kale, broccoli and beet stems are great in stir-fries, soups and fritters.",
      "Los tallos de col, brócoli y remolacha van bien en salteados, sopas y buñuelos.",
      "Les tiges de chou, de brocoli et de betterave vont bien dans les poêlées, soupes et galettes.",
    ],
  },
  {
    theme: "cozinha",
    text: [
      "Assar legumes com um fio de azeite realça o doce natural deles.",
      "Roasting vegetables with a drizzle of olive oil brings out their natural sweetness.",
      "Asar verduras con un chorrito de aceite realza su dulzor natural.",
      "Rôtir les légumes avec un filet d'huile d'olive fait ressortir leur douceur.",
    ],
  },
  {
    theme: "cozinha",
    text: [
      "Deixar o feijão de molho por 8 a 12 horas ajuda no cozimento e na digestão.",
      "Soaking beans for 8–12 hours helps cooking and digestion.",
      "Remojar los frijoles 8 a 12 horas ayuda a la cocción y a la digestión.",
      "Faire tremper les haricots 8 à 12 heures aide à la cuisson et à la digestion.",
    ],
  },
  {
    theme: "cozinha",
    text: [
      "Sobrou arroz? Vira bolinho, arroz de forno ou recheio de abobrinha.",
      "Leftover rice? Turn it into fritters, baked rice or zucchini stuffing.",
      "¿Sobró arroz? Conviértelo en buñuelos, arroz al horno o relleno de calabacín.",
      "Un reste de riz ? Faites-en des galettes, un gratin ou une farce de courgette.",
    ],
  },
  {
    theme: "compras",
    text: [
      "Faça a lista de compras a partir do cardápio da semana: você gasta menos e desperdiça menos.",
      "Build your shopping list from the week's menu: you spend less and waste less.",
      "Haz la lista de compras a partir del menú de la semana: gastas y desperdicias menos.",
      "Faites la liste de courses à partir du menu de la semaine : moins de dépenses, moins de gaspillage.",
    ],
  },
  {
    theme: "compras",
    text: [
      "Feiras no fim do dia costumam ter preços menores para frutas e verduras.",
      "Street markets near closing often have lower prices on produce.",
      "Las ferias al final del día suelen tener precios más bajos para frutas y verduras.",
      "Les marchés en fin de journée ont souvent des prix plus bas sur les fruits et légumes.",
    ],
  },
  {
    theme: "compras",
    text: [
      "Frutas da estação são mais baratas e saborosas. Veja o Calendário da feira.",
      "Seasonal fruit is cheaper and tastier. Check the Market calendar.",
      "Las frutas de temporada son más baratas y sabrosas. Mira el Calendario de feria.",
      "Les fruits de saison sont moins chers et plus savoureux. Voyez le Calendrier du marché.",
    ],
  },
  {
    theme: "compras",
    text: [
      "Compre feijão, arroz, lentilha e aveia a granel ou em pacotes maiores: o preço por quilo cai.",
      "Buy beans, rice, lentils and oats in bulk or bigger packs: the price per kilo drops.",
      "Compra frijoles, arroz, lentejas y avena a granel o en paquetes grandes: el precio por kilo baja.",
      "Achetez haricots, riz, lentilles et avoine en vrac ou en grands paquets : le prix au kilo baisse.",
    ],
  },
  {
    theme: "compras",
    text: [
      "Ovos são uma das proteínas mais baratas e versáteis da cozinha.",
      "Eggs are among the cheapest and most versatile proteins in the kitchen.",
      "Los huevos son de las proteínas más baratas y versátiles de la cocina.",
      "Les œufs sont parmi les protéines les moins chères et les plus polyvalentes.",
    ],
  },
  {
    theme: "compras",
    text: [
      "Congelados de verdade (frutas e legumes só congelados, sem molho) são práticos e nutritivos.",
      "Plain frozen produce (just frozen, no sauce) is practical and nutritious.",
      "Las verduras y frutas congeladas sin salsa son prácticas y nutritivas.",
      "Les fruits et légumes surgelés nature sont pratiques et nutritifs.",
    ],
  },
  {
    theme: "rotulo",
    text: [
      "Lupa preta na frente da embalagem avisa excesso de açúcar adicionado, sódio ou gordura saturada.",
      "A black magnifying glass on the front warns of high added sugar, sodium or saturated fat.",
      "La lupa negra en el frente avisa exceso de azúcar añadida, sodio o grasa saturada.",
      "La loupe noire sur le devant signale un excès de sucres ajoutés, sodium ou graisses saturées.",
    ],
  },
  {
    theme: "rotulo",
    text: [
      "Lista de ingredientes muito longa, com nomes que você não usaria em casa, é sinal de ultraprocessado.",
      "A very long ingredient list with names you wouldn't use at home signals ultra-processed food.",
      "Una lista de ingredientes muy larga, con nombres que no usarías en casa, indica ultraprocesado.",
      "Une longue liste d'ingrédients aux noms inconnus en cuisine signale un ultra-transformé.",
    ],
  },
  {
    theme: "rotulo",
    text: [
      "Compare produtos pela tabela por 100 g: assim a porção da embalagem não engana.",
      "Compare products using the per-100 g column: the package's serving size can't fool you.",
      "Compara productos por la columna de 100 g: así la porción del envase no engaña.",
      "Comparez les produits par la colonne pour 100 g : la portion de l'emballage ne trompe plus.",
    ],
  },
  {
    theme: "rotulo",
    text: [
      "Açúcar tem muitos nomes no rótulo: xarope de glicose, maltodextrina, açúcar invertido, dextrose.",
      "Sugar has many names on labels: glucose syrup, maltodextrin, invert sugar, dextrose.",
      "El azúcar tiene muchos nombres: jarabe de glucosa, maltodextrina, azúcar invertido, dextrosa.",
      "Le sucre a plusieurs noms : sirop de glucose, maltodextrine, sucre inverti, dextrose.",
    ],
  },
  {
    theme: "rotulo",
    text: [
      '"Integral" de verdade tem farinha integral como primeiro ingrediente.',
      'Truly "whole-grain" bread lists whole-grain flour as the first ingredient.',
      'Lo "integral" de verdad tiene harina integral como primer ingrediente.',
      "Un vrai pain « complet » a la farine complète comme premier ingrédient.",
    ],
  },
  {
    theme: "rotulo",
    text: [
      "Use o Leitor de rótulos do app para ver na hora a lupa e os ingredientes de um produto.",
      "Use the app's Label reader to see a product's warnings and ingredients right away.",
      "Usa el Lector de etiquetas de la app para ver al instante la lupa y los ingredientes.",
      "Utilisez le Lecteur d'étiquettes de l'app pour voir tout de suite la loupe et les ingrédients.",
    ],
  },
  {
    theme: "habito",
    text: [
      "Tenha horários regulares para as refeições: o corpo se organiza e a fome fica mais previsível.",
      "Keep regular mealtimes: your body settles and hunger becomes more predictable.",
      "Ten horarios regulares de comida: el cuerpo se organiza y el hambre es más previsible.",
      "Gardez des horaires réguliers : le corps s'organise et la faim devient plus prévisible.",
    ],
  },
  {
    theme: "habito",
    text: [
      "Deixe frutas lavadas à vista na cozinha: quem vê, come.",
      "Keep washed fruit in sight in the kitchen: out of sight, out of mind works both ways.",
      "Deja frutas lavadas a la vista en la cocina: lo que se ve, se come.",
      "Laissez des fruits lavés bien en vue : ce qu'on voit, on le mange.",
    ],
  },
  {
    theme: "habito",
    text: [
      "Comece o prato pela salada: ela ocupa espaço e traz fibras.",
      "Start your plate with salad: it takes up room and brings fiber.",
      "Empieza el plato por la ensalada: ocupa espacio y aporta fibra.",
      "Commencez l'assiette par la salade : elle prend de la place et apporte des fibres.",
    ],
  },
  {
    theme: "habito",
    text: [
      "Cozinhar junto com a família ou amigos torna a comida mais gostosa e o hábito mais fácil.",
      "Cooking with family or friends makes food tastier and the habit easier.",
      "Cocinar con familia o amigos hace la comida más rica y el hábito más fácil.",
      "Cuisiner en famille ou entre amis rend la nourriture meilleure et l'habitude plus facile.",
    ],
  },
  {
    theme: "habito",
    text: [
      "Um passo de cada vez: escolha uma mudança pequena por semana e mantenha.",
      "One step at a time: pick one small change a week and stick with it.",
      "Un paso a la vez: elige un cambio pequeño por semana y mantenlo.",
      "Un pas à la fois : choisissez un petit changement par semaine et tenez-le.",
    ],
  },
  {
    theme: "habito",
    text: [
      "Dormir bem ajuda a regular a fome. Telas antes de dormir atrapalham o sono.",
      "Good sleep helps regulate hunger. Screens before bed get in the way.",
      "Dormir bien ayuda a regular el hambre. Las pantallas antes de dormir lo dificultan.",
      "Bien dormir aide à réguler la faim. Les écrans avant le coucher perturbent le sommeil.",
    ],
  },
  {
    theme: "habito",
    text: [
      "Lanche planejado (fruta, castanhas, iogurte natural) evita chegar com muita fome na refeição.",
      "A planned snack (fruit, nuts, plain yogurt) keeps you from arriving starving at meals.",
      "Un snack planeado (fruta, frutos secos, yogur natural) evita llegar con mucha hambre.",
      "Un en-cas prévu (fruit, noix, yaourt nature) évite d'arriver affamé au repas.",
    ],
  },
  {
    theme: "agua",
    text: [
      "Leve uma garrafinha de água com você: fica mais fácil beber ao longo do dia.",
      "Carry a water bottle: it's easier to drink throughout the day.",
      "Lleva una botellita de agua: es más fácil beber durante el día.",
      "Ayez une gourde sur vous : c'est plus facile de boire toute la journée.",
    ],
  },
  {
    theme: "agua",
    text: [
      "Água com rodelas de limão, hortelã ou gengibre é refrescante e sem açúcar.",
      "Water with lemon slices, mint or ginger is refreshing and sugar-free.",
      "Agua con rodajas de limón, menta o jengibre es refrescante y sin azúcar.",
      "Une eau au citron, à la menthe ou au gingembre est rafraîchissante et sans sucre.",
    ],
  },
  {
    theme: "agua",
    text: [
      "Em dias quentes ou com atividade física, aumente a água: o corpo perde mais pelo suor.",
      "On hot or active days, drink more: your body loses more through sweat.",
      "En días calurosos o con actividad física, bebe más: el cuerpo pierde más por el sudor.",
      "Les jours chauds ou actifs, buvez plus : le corps perd davantage par la sueur.",
    ],
  },
  {
    theme: "agua",
    text: [
      "Sopas, frutas e verduras também hidratam e contam para o seu dia.",
      "Soups, fruits and vegetables also hydrate and count toward your day.",
      "Sopas, frutas y verduras también hidratan y cuentan para tu día.",
      "Soupes, fruits et légumes hydratent aussi et comptent pour la journée.",
    ],
  },
  {
    theme: "agua",
    text: [
      "Café e chá contam como líquido, mas com açúcar viram outra coisa: prefira sem ou com pouco.",
      "Coffee and tea count as fluids, but sugar changes things: prefer them unsweetened or lightly sweetened.",
      "Café y té cuentan como líquido, pero con azúcar cambian: prefiérelos sin o con poco.",
      "Café et thé comptent comme boisson, mais le sucre change tout : préférez-les peu ou pas sucrés.",
    ],
  },
];
