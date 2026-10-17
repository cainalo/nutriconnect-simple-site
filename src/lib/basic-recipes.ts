// Receitas caseiras de sempre (Geladeira): comparadas com o que a pessoa marcou, sem IA. Cada
// ingrediente tem uma palavra-chave em português (sem acento) usada na comparação.
import type { Names } from "@/lib/appearance-data";

export interface BasicRecipe {
  id: string;
  title: Names;
  /** [palavra-chave, nome em 4 idiomas] */
  ingredients: [string, Names][];
  steps: Names[];
  minutes: number;
}

export const BASIC_RECIPES: BasicRecipe[] = [
  {
    id: "omelete",
    title: [
      "Omelete de legumes",
      "Vegetable omelet",
      "Tortilla de verduras",
      "Omelette aux légumes",
    ],
    minutes: 15,
    ingredients: [
      ["ovo", ["Ovos", "Eggs", "Huevos", "Œufs"]],
      ["tomate", ["Tomate", "Tomato", "Tomate", "Tomate"]],
      ["cebola", ["Cebola", "Onion", "Cebolla", "Oignon"]],
    ],
    steps: [
      [
        "Bata os ovos com uma pitada de sal.",
        "Beat the eggs with a pinch of salt.",
        "Bate los huevos con una pizca de sal.",
        "Battez les œufs avec une pincée de sel.",
      ],
      [
        "Refogue cebola e tomate picados por 2 minutos.",
        "Sauté chopped onion and tomato for 2 minutes.",
        "Sofríe cebolla y tomate picados 2 minutos.",
        "Faites revenir oignon et tomate 2 minutes.",
      ],
      [
        "Junte os ovos, tampe e cozinhe em fogo baixo até firmar.",
        "Add the eggs, cover and cook on low until set.",
        "Agrega los huevos, tapa y cocina a fuego bajo hasta cuajar.",
        "Ajoutez les œufs, couvrez et cuisez à feu doux jusqu'à prise.",
      ],
    ],
  },
  {
    id: "arroz-feijao",
    title: ["Arroz com feijão", "Rice and beans", "Arroz con frijoles", "Riz et haricots"],
    minutes: 45,
    ingredients: [
      ["arroz", ["Arroz", "Rice", "Arroz", "Riz"]],
      ["feijao", ["Feijão", "Beans", "Frijoles", "Haricots"]],
      ["cebola", ["Cebola", "Onion", "Cebolla", "Oignon"]],
      ["alho", ["Alho", "Garlic", "Ajo", "Ail"]],
    ],
    steps: [
      [
        "Refogue alho e cebola, junte o arroz e 2 xícaras de água para cada xícara.",
        "Sauté garlic and onion, add the rice and 2 cups of water per cup.",
        "Sofríe ajo y cebolla, agrega el arroz y 2 tazas de agua por taza.",
        "Faites revenir ail et oignon, ajoutez le riz et 2 tasses d'eau par tasse.",
      ],
      [
        "Cozinhe o feijão (de molho antes) na pressão por cerca de 30 minutos.",
        "Pressure-cook the soaked beans for about 30 minutes.",
        "Cocina los frijoles remojados en olla exprés unos 30 minutos.",
        "Cuisez les haricots trempés à l'autocuiseur environ 30 minutes.",
      ],
      [
        "Tempere o feijão com alho e cebola refogados.",
        "Season the beans with sautéed garlic and onion.",
        "Sazona los frijoles con ajo y cebolla sofritos.",
        "Assaisonnez les haricots avec ail et oignon revenus.",
      ],
    ],
  },
  {
    id: "sopa",
    title: ["Sopa de legumes", "Vegetable soup", "Sopa de verduras", "Soupe de légumes"],
    minutes: 30,
    ingredients: [
      ["batata", ["Batata", "Potato", "Papa", "Pomme de terre"]],
      ["cenoura", ["Cenoura", "Carrot", "Zanahoria", "Carotte"]],
      ["abobrinha", ["Abobrinha", "Zucchini", "Calabacín", "Courgette"]],
      ["cebola", ["Cebola", "Onion", "Cebolla", "Oignon"]],
    ],
    steps: [
      [
        "Pique os legumes em cubos.",
        "Dice the vegetables.",
        "Corta las verduras en cubos.",
        "Coupez les légumes en dés.",
      ],
      [
        "Refogue a cebola, junte os legumes e cubra com água.",
        "Sauté the onion, add the vegetables and cover with water.",
        "Sofríe la cebolla, agrega las verduras y cubre con agua.",
        "Faites revenir l'oignon, ajoutez les légumes et couvrez d'eau.",
      ],
      [
        "Cozinhe por 20 minutos e acerte o sal.",
        "Simmer for 20 minutes and adjust the salt.",
        "Cocina 20 minutos y ajusta la sal.",
        "Laissez cuire 20 minutes et rectifiez le sel.",
      ],
    ],
  },
  {
    id: "panqueca-banana",
    title: ["Panqueca de banana", "Banana pancake", "Panqueque de plátano", "Pancake à la banane"],
    minutes: 10,
    ingredients: [
      ["banana", ["Banana", "Banana", "Plátano", "Banane"]],
      ["ovo", ["Ovos", "Eggs", "Huevos", "Œufs"]],
      ["aveia", ["Aveia", "Oats", "Avena", "Avoine"]],
    ],
    steps: [
      [
        "Amasse 1 banana e misture com 1 ovo e 2 colheres de aveia.",
        "Mash 1 banana and mix with 1 egg and 2 tablespoons of oats.",
        "Aplasta 1 plátano y mezcla con 1 huevo y 2 cucharadas de avena.",
        "Écrasez 1 banane et mélangez avec 1 œuf et 2 cuillères d'avoine.",
      ],
      [
        "Doure em frigideira untada, 2 minutos de cada lado.",
        "Cook in a greased pan, 2 minutes per side.",
        "Dora en sartén engrasada, 2 minutos por lado.",
        "Faites dorer à la poêle, 2 minutes de chaque côté.",
      ],
    ],
  },
  {
    id: "mingau",
    title: ["Mingau de aveia", "Oatmeal porridge", "Avena cocida", "Porridge d'avoine"],
    minutes: 10,
    ingredients: [
      ["aveia", ["Aveia", "Oats", "Avena", "Avoine"]],
      ["leite", ["Leite", "Milk", "Leche", "Lait"]],
      ["banana", ["Banana", "Banana", "Plátano", "Banane"]],
    ],
    steps: [
      [
        "Leve ao fogo 1 copo de leite com 3 colheres de aveia, mexendo.",
        "Heat 1 cup of milk with 3 tablespoons of oats, stirring.",
        "Calienta 1 vaso de leche con 3 cucharadas de avena, removiendo.",
        "Chauffez 1 verre de lait avec 3 cuillères d'avoine en remuant.",
      ],
      [
        "Quando engrossar, sirva com banana em rodelas.",
        "When it thickens, serve with sliced banana.",
        "Cuando espese, sirve con plátano en rodajas.",
        "Quand ça épaissit, servez avec de la banane en rondelles.",
      ],
    ],
  },
  {
    id: "farofa",
    title: ["Farofa de cenoura", "Carrot farofa", "Farofa de zanahoria", "Farofa à la carotte"],
    minutes: 15,
    ingredients: [
      [
        "farinha de mandioca",
        ["Farinha de mandioca", "Cassava flour", "Harina de yuca", "Farine de manioc"],
      ],
      ["cenoura", ["Cenoura", "Carrot", "Zanahoria", "Carotte"]],
      ["cebola", ["Cebola", "Onion", "Cebolla", "Oignon"]],
    ],
    steps: [
      [
        "Refogue cebola e cenoura ralada em um fio de óleo.",
        "Sauté onion and grated carrot in a little oil.",
        "Sofríe cebolla y zanahoria rallada con un poco de aceite.",
        "Faites revenir oignon et carotte râpée dans un peu d'huile.",
      ],
      [
        "Junte a farinha aos poucos, mexendo até tostar.",
        "Add the flour little by little, stirring until toasted.",
        "Agrega la harina poco a poco, removiendo hasta tostar.",
        "Ajoutez la farine peu à peu en remuant jusqu'à griller.",
      ],
    ],
  },
  {
    id: "frango-molho",
    title: [
      "Frango ao molho de tomate",
      "Chicken in tomato sauce",
      "Pollo en salsa de tomate",
      "Poulet sauce tomate",
    ],
    minutes: 35,
    ingredients: [
      ["frango", ["Frango", "Chicken", "Pollo", "Poulet"]],
      ["tomate", ["Tomate", "Tomato", "Tomate", "Tomate"]],
      ["cebola", ["Cebola", "Onion", "Cebolla", "Oignon"]],
      ["alho", ["Alho", "Garlic", "Ajo", "Ail"]],
    ],
    steps: [
      [
        "Doure o frango em pedaços.",
        "Brown the chicken pieces.",
        "Dora el pollo en trozos.",
        "Faites dorer le poulet en morceaux.",
      ],
      [
        "Junte alho, cebola e tomate picados, e um pouco de água.",
        "Add chopped garlic, onion and tomato, plus a little water.",
        "Agrega ajo, cebolla y tomate picados, y un poco de agua.",
        "Ajoutez ail, oignon et tomate hachés et un peu d'eau.",
      ],
      [
        "Cozinhe tampado por 20 minutos.",
        "Simmer covered for 20 minutes.",
        "Cocina tapado 20 minutos.",
        "Laissez mijoter à couvert 20 minutes.",
      ],
    ],
  },
  {
    id: "escondidinho",
    title: [
      "Escondidinho de mandioca com frango",
      "Cassava and chicken bake",
      "Pastel de yuca con pollo",
      "Gratin de manioc au poulet",
    ],
    minutes: 50,
    ingredients: [
      ["mandioca", ["Mandioca", "Cassava", "Yuca", "Manioc"]],
      ["frango", ["Frango", "Chicken", "Pollo", "Poulet"]],
      ["cebola", ["Cebola", "Onion", "Cebolla", "Oignon"]],
      ["leite", ["Leite", "Milk", "Leche", "Lait"]],
    ],
    steps: [
      [
        "Cozinhe a mandioca e amasse com um pouco de leite.",
        "Boil the cassava and mash it with a little milk.",
        "Cocina la yuca y aplástala con un poco de leche.",
        "Cuisez le manioc et écrasez-le avec un peu de lait.",
      ],
      [
        "Refogue o frango desfiado com cebola.",
        "Sauté shredded chicken with onion.",
        "Sofríe el pollo desmenuzado con cebolla.",
        "Faites revenir le poulet effiloché avec l'oignon.",
      ],
      [
        "Monte em camadas e leve ao forno por 15 minutos.",
        "Layer and bake for 15 minutes.",
        "Arma en capas y hornea 15 minutos.",
        "Montez en couches et enfournez 15 minutes.",
      ],
    ],
  },
  {
    id: "macarrao-brocolis",
    title: [
      "Macarrão com brócolis e alho",
      "Pasta with broccoli and garlic",
      "Pasta con brócoli y ajo",
      "Pâtes au brocoli et à l'ail",
    ],
    minutes: 20,
    ingredients: [
      ["macarrao", ["Macarrão", "Pasta", "Pasta", "Pâtes"]],
      ["brocolis", ["Brócolis", "Broccoli", "Brócoli", "Brocoli"]],
      ["alho", ["Alho", "Garlic", "Ajo", "Ail"]],
    ],
    steps: [
      [
        "Cozinhe o macarrão; nos 3 minutos finais, junte o brócolis.",
        "Cook the pasta; add the broccoli for the last 3 minutes.",
        "Cocina la pasta; en los 3 minutos finales, agrega el brócoli.",
        "Cuisez les pâtes ; ajoutez le brocoli les 3 dernières minutes.",
      ],
      [
        "Escorra e salteie com alho dourado no azeite.",
        "Drain and toss with garlic browned in olive oil.",
        "Escurre y saltea con ajo dorado en aceite.",
        "Égouttez et faites sauter avec de l'ail doré à l'huile.",
      ],
    ],
  },
  {
    id: "salada-grao",
    title: [
      "Salada de grão-de-bico",
      "Chickpea salad",
      "Ensalada de garbanzos",
      "Salade de pois chiches",
    ],
    minutes: 10,
    ingredients: [
      ["grao-de-bico", ["Grão-de-bico", "Chickpeas", "Garbanzos", "Pois chiches"]],
      ["tomate", ["Tomate", "Tomato", "Tomate", "Tomate"]],
      ["cebola", ["Cebola", "Onion", "Cebolla", "Oignon"]],
    ],
    steps: [
      [
        "Use grão-de-bico cozido e frio.",
        "Use cooked, cooled chickpeas.",
        "Usa garbanzos cocidos y fríos.",
        "Utilisez des pois chiches cuits et froids.",
      ],
      [
        "Misture com tomate e cebola picados, azeite, limão e sal.",
        "Mix with chopped tomato and onion, olive oil, lemon and salt.",
        "Mezcla con tomate y cebolla picados, aceite, limón y sal.",
        "Mélangez avec tomate et oignon hachés, huile, citron et sel.",
      ],
    ],
  },
  {
    id: "tapioca",
    title: ["Tapioca com queijo", "Tapioca with cheese", "Tapioca con queso", "Tapioca au fromage"],
    minutes: 10,
    ingredients: [
      ["tapioca", ["Goma de tapioca", "Tapioca flour", "Almidón de tapioca", "Tapioca"]],
      ["queijo", ["Queijo", "Cheese", "Queso", "Fromage"]],
    ],
    steps: [
      [
        "Espalhe a goma em frigideira quente, sem óleo.",
        "Spread the flour in a hot dry pan.",
        "Esparce el almidón en una sartén caliente sin aceite.",
        "Étalez la fécule dans une poêle chaude sans huile.",
      ],
      [
        "Quando firmar, recheie com queijo e dobre.",
        "Once set, fill with cheese and fold.",
        "Cuando cuaje, rellena con queso y dobla.",
        "Une fois pris, garnissez de fromage et pliez.",
      ],
    ],
  },
  {
    id: "cuscuz",
    title: [
      "Cuscuz nordestino com ovo",
      "Northeastern couscous with egg",
      "Cuscús nordestino con huevo",
      "Couscous du Nordeste à l'œuf",
    ],
    minutes: 25,
    ingredients: [
      [
        "flocao",
        [
          "Flocão de milho",
          "Corn flakes (flocão)",
          "Copos de maíz (flocão)",
          "Semoule de maïs (flocão)",
        ],
      ],
      ["ovo", ["Ovos", "Eggs", "Huevos", "Œufs"]],
    ],
    steps: [
      [
        "Hidrate o flocão com água e sal por 10 minutos.",
        "Moisten the corn flakes with water and salt for 10 minutes.",
        "Hidrata el flocão con agua y sal 10 minutos.",
        "Humidifiez le flocão avec eau et sel 10 minutes.",
      ],
      [
        "Cozinhe no vapor (cuscuzeira) por 10 minutos e sirva com ovo.",
        "Steam (couscous pot) for 10 minutes and serve with an egg.",
        "Cocina al vapor 10 minutos y sirve con huevo.",
        "Cuisez à la vapeur 10 minutes et servez avec un œuf.",
      ],
    ],
  },
  {
    id: "couve-refogada",
    title: [
      "Couve refogada com ovo",
      "Sautéed kale with egg",
      "Col salteada con huevo",
      "Chou kale sauté à l'œuf",
    ],
    minutes: 10,
    ingredients: [
      ["couve", ["Couve", "Kale", "Col rizada", "Chou kale"]],
      ["alho", ["Alho", "Garlic", "Ajo", "Ail"]],
      ["ovo", ["Ovos", "Eggs", "Huevos", "Œufs"]],
    ],
    steps: [
      [
        "Corte a couve bem fininha.",
        "Slice the kale very thin.",
        "Corta la col muy fina.",
        "Émincez finement le chou.",
      ],
      [
        "Refogue no alho por 2 minutos e sirva com ovo mexido.",
        "Sauté with garlic for 2 minutes and serve with scrambled egg.",
        "Saltea con ajo 2 minutos y sirve con huevo revuelto.",
        "Faites sauter à l'ail 2 minutes et servez avec un œuf brouillé.",
      ],
    ],
  },
  {
    id: "pure",
    title: ["Purê de batata", "Mashed potatoes", "Puré de papa", "Purée de pommes de terre"],
    minutes: 25,
    ingredients: [
      ["batata", ["Batata", "Potato", "Papa", "Pomme de terre"]],
      ["leite", ["Leite", "Milk", "Leche", "Lait"]],
    ],
    steps: [
      [
        "Cozinhe as batatas até ficarem macias.",
        "Boil the potatoes until soft.",
        "Cocina las papas hasta que estén blandas.",
        "Cuisez les pommes de terre jusqu'à tendreté.",
      ],
      [
        "Amasse e misture com leite quente e sal.",
        "Mash and mix with hot milk and salt.",
        "Aplasta y mezcla con leche caliente y sal.",
        "Écrasez et mélangez avec du lait chaud et du sel.",
      ],
    ],
  },
];
