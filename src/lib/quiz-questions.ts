// Perguntas extras do Quiz relâmpago (Funções). Informações do Guia Alimentar para a População
// Brasileira, da OMS e das regras de rotulagem da Anvisa. Mesma estrutura das perguntas do card.
import type { Names } from "@/lib/appearance-data";

export interface QuizQuestion {
  q: Names;
  options: [Names, Names, Names];
  answer: 0 | 1 | 2;
  why: Names;
}

export const MORE_QUESTIONS: QuizQuestion[] = [
  {
    q: [
      "Quanto sal por dia a OMS recomenda, no máximo, para adultos?",
      "How much salt a day does the WHO recommend, at most, for adults?",
      "¿Cuánta sal al día recomienda la OMS, como máximo, para adultos?",
      "Combien de sel par jour l'OMS recommande-t-elle au maximum pour les adultes ?",
    ],
    options: [
      [
        "5 g (uma colher de chá)",
        "5 g (one teaspoon)",
        "5 g (una cucharadita)",
        "5 g (une cuillère à café)",
      ],
      ["15 g", "15 g", "15 g", "15 g"],
      ["Não há limite", "There is no limit", "No hay límite", "Il n'y a pas de limite"],
    ],
    answer: 0,
    why: [
      "A OMS recomenda menos de 5 g de sal por dia. Boa parte do sal vem de alimentos industrializados.",
      "The WHO recommends less than 5 g of salt a day. Much of it comes from packaged foods.",
      "La OMS recomienda menos de 5 g de sal al día. Buena parte viene de alimentos industrializados.",
      "L'OMS recommande moins de 5 g de sel par jour. Une bonne partie vient des produits industriels.",
    ],
  },
  {
    q: [
      "Qual destes alimentos tem mais água?",
      "Which of these foods has the most water?",
      "¿Cuál de estos alimentos tiene más agua?",
      "Lequel de ces aliments contient le plus d'eau ?",
    ],
    options: [
      ["Pão de forma", "Sliced bread", "Pan de molde", "Pain de mie"],
      ["Melancia", "Watermelon", "Sandía", "Pastèque"],
      ["Queijo", "Cheese", "Queso", "Fromage"],
    ],
    answer: 1,
    why: [
      "A melancia tem cerca de 92% de água. Frutas e verduras também ajudam a hidratar.",
      "Watermelon is about 92% water. Fruits and vegetables also help you stay hydrated.",
      "La sandía tiene cerca de un 92% de agua. Frutas y verduras también ayudan a hidratarse.",
      "La pastèque contient environ 92 % d'eau. Fruits et légumes aident aussi à s'hydrater.",
    ],
  },
  {
    q: [
      "Cenoura e abóbora são ricas em qual nutriente?",
      "Carrots and pumpkin are rich in which nutrient?",
      "¿En qué nutriente son ricas la zanahoria y la calabaza?",
      "Carottes et potiron sont riches en quel nutriment ?",
    ],
    options: [
      [
        "Betacaroteno (vira vitamina A)",
        "Beta-carotene (becomes vitamin A)",
        "Betacaroteno (se convierte en vitamina A)",
        "Bêta-carotène (devient vitamine A)",
      ],
      ["Vitamina B12", "Vitamin B12", "Vitamina B12", "Vitamine B12"],
      ["Cálcio", "Calcium", "Calcio", "Calcium"],
    ],
    answer: 0,
    why: [
      "A cor laranja vem do betacaroteno, que o corpo transforma em vitamina A, importante para a visão.",
      "The orange color comes from beta-carotene, which the body turns into vitamin A, important for vision.",
      "El color naranja viene del betacaroteno, que el cuerpo convierte en vitamina A, importante para la vista.",
      "La couleur orange vient du bêta-carotène, que le corps transforme en vitamine A, utile à la vue.",
    ],
  },
  {
    q: [
      "Qual destes é um alimento ultraprocessado?",
      "Which of these is an ultra-processed food?",
      "¿Cuál de estos es un alimento ultraprocesado?",
      "Lequel de ces aliments est ultra-transformé ?",
    ],
    options: [
      ["Ovo", "Egg", "Huevo", "Œuf"],
      ["Refrigerante", "Soda", "Refresco", "Soda"],
      ["Feijão cozido", "Cooked beans", "Frijoles cocidos", "Haricots cuits"],
    ],
    answer: 1,
    why: [
      "Refrigerantes são formulações industriais com açúcar, aditivos e aromatizantes. Ovo e feijão são comida de verdade.",
      "Sodas are industrial formulations with sugar, additives and flavorings. Eggs and beans are real food.",
      "Los refrescos son formulaciones industriales con azúcar, aditivos y saborizantes. Huevo y frijoles son comida de verdad.",
      "Les sodas sont des formulations industrielles avec sucre, additifs et arômes. Œuf et haricots sont de vrais aliments.",
    ],
  },
  {
    q: [
      "No rótulo, em que ordem aparecem os ingredientes?",
      "On a label, in what order are the ingredients listed?",
      "En la etiqueta, ¿en qué orden aparecen los ingredientes?",
      "Sur l'étiquette, dans quel ordre sont listés les ingrédients ?",
    ],
    options: [
      [
        "Em ordem alfabética",
        "Alphabetical order",
        "En orden alfabético",
        "Par ordre alphabétique",
      ],
      [
        "Do que tem mais para o que tem menos",
        "From the largest to the smallest amount",
        "De mayor a menor cantidad",
        "Du plus abondant au moins abondant",
      ],
      ["Em qualquer ordem", "Any order", "En cualquier orden", "Dans n'importe quel ordre"],
    ],
    answer: 1,
    why: [
      "A lista vai do ingrediente em maior quantidade para o de menor. Se açúcar aparece primeiro, é o principal.",
      "The list goes from the largest amount to the smallest. If sugar comes first, it's the main ingredient.",
      "La lista va del ingrediente en mayor cantidad al de menor. Si el azúcar aparece primero, es el principal.",
      "La liste va du plus abondant au moins abondant. Si le sucre est en premier, c'est l'ingrédient principal.",
    ],
  },
  {
    q: [
      "O que significa a lupa na frente das embalagens no Brasil?",
      "What does the magnifying glass on Brazilian food packages mean?",
      "¿Qué significa la lupa en el frente de los envases en Brasil?",
      "Que signifie la loupe sur le devant des emballages au Brésil ?",
    ],
    options: [
      ["Produto orgânico", "Organic product", "Producto orgánico", "Produit bio"],
      [
        "Alto teor de açúcar adicionado, sódio ou gordura saturada",
        "High in added sugar, sodium or saturated fat",
        "Alto contenido de azúcar añadida, sodio o grasa saturada",
        "Riche en sucres ajoutés, sodium ou graisses saturées",
      ],
      ["Produto sem glúten", "Gluten-free product", "Producto sin gluten", "Produit sans gluten"],
    ],
    answer: 1,
    why: [
      "A lupa (regra da Anvisa) avisa excesso de açúcar adicionado, sódio ou gordura saturada.",
      "The magnifying glass (an Anvisa rule) warns of high added sugar, sodium or saturated fat.",
      "La lupa (regla de Anvisa) avisa exceso de azúcar añadida, sodio o grasa saturada.",
      "La loupe (règle de l'Anvisa) signale un excès de sucres ajoutés, de sodium ou de graisses saturées.",
    ],
  },
  {
    q: [
      "Como o corpo produz a maior parte da vitamina D?",
      "How does the body make most of its vitamin D?",
      "¿Cómo produce el cuerpo la mayor parte de la vitamina D?",
      "Comment le corps fabrique-t-il la plupart de sa vitamine D ?",
    ],
    options: [
      [
        "Com a pele exposta ao sol",
        "With skin exposed to sunlight",
        "Con la piel expuesta al sol",
        "Avec la peau exposée au soleil",
      ],
      ["Bebendo água", "Drinking water", "Bebiendo agua", "En buvant de l'eau"],
      ["Comendo pão", "Eating bread", "Comiendo pan", "En mangeant du pain"],
    ],
    answer: 0,
    why: [
      "A pele produz vitamina D com a luz do sol. Poucos alimentos têm quantidades altas dela.",
      "Skin makes vitamin D in sunlight. Few foods contain much of it.",
      "La piel produce vitamina D con la luz del sol. Pocos alimentos tienen mucha.",
      "La peau fabrique la vitamine D au soleil. Peu d'aliments en contiennent beaucoup.",
    ],
  },
  {
    q: [
      "O que ajuda o corpo a absorver o ferro do feijão?",
      "What helps the body absorb the iron in beans?",
      "¿Qué ayuda al cuerpo a absorber el hierro de los frijoles?",
      "Qu'est-ce qui aide le corps à absorber le fer des haricots ?",
    ],
    options: [
      [
        "Uma fruta com vitamina C na mesma refeição",
        "A fruit with vitamin C in the same meal",
        "Una fruta con vitamina C en la misma comida",
        "Un fruit riche en vitamine C au même repas",
      ],
      ["Café logo depois", "Coffee right after", "Café justo después", "Un café juste après"],
      ["Refrigerante", "Soda", "Refresco", "Un soda"],
    ],
    answer: 0,
    why: [
      "A vitamina C (laranja, acerola, limão) aumenta a absorção do ferro vegetal. Café e chá junto da refeição atrapalham.",
      "Vitamin C (orange, acerola, lemon) boosts absorption of plant iron. Coffee and tea with the meal get in the way.",
      "La vitamina C (naranja, acerola, limón) aumenta la absorción del hierro vegetal. Café y té con la comida la dificultan.",
      "La vitamine C (orange, acérola, citron) augmente l'absorption du fer végétal. Café et thé pendant le repas la gênent.",
    ],
  },
  {
    q: [
      "Qual destes tem gordura considerada boa (insaturada)?",
      "Which of these has 'good' (unsaturated) fat?",
      "¿Cuál de estos tiene grasa considerada buena (insaturada)?",
      "Lequel contient de « bonnes » graisses (insaturées) ?",
    ],
    options: [
      ["Abacate", "Avocado", "Aguacate", "Avocat"],
      ["Salsicha", "Sausage", "Salchicha", "Saucisse"],
      ["Biscoito recheado", "Sandwich cookie", "Galleta rellena", "Biscuit fourré"],
    ],
    answer: 0,
    why: [
      "Abacate, azeite e castanhas têm principalmente gorduras insaturadas, que fazem bem ao coração.",
      "Avocado, olive oil and nuts have mostly unsaturated fats, which are good for the heart.",
      "Aguacate, aceite de oliva y frutos secos tienen sobre todo grasas insaturadas, buenas para el corazón.",
      "Avocat, huile d'olive et noix contiennent surtout des graisses insaturées, bonnes pour le cœur.",
    ],
  },
  {
    q: [
      "Qual peixe barato é rico em ômega-3?",
      "Which inexpensive fish is rich in omega-3?",
      "¿Qué pescado barato es rico en omega-3?",
      "Quel poisson bon marché est riche en oméga-3 ?",
    ],
    options: [
      ["Sardinha", "Sardine", "Sardina", "Sardine"],
      [
        "Filé de merluza empanado",
        "Breaded hake fillet",
        "Filete de merluza empanado",
        "Filet de merlu pané",
      ],
      ["Kani", "Imitation crab", "Kanikama", "Surimi"],
    ],
    answer: 0,
    why: [
      "Sardinha é rica em ômega-3, acessível e também tem cálcio (nas espinhas, na versão em lata).",
      "Sardines are rich in omega-3, affordable and also have calcium (in the bones, when canned).",
      "La sardina es rica en omega-3, accesible y también tiene calcio (en las espinas, en lata).",
      "La sardine est riche en oméga-3, abordable et apporte aussi du calcium (dans les arêtes, en conserve).",
    ],
  },
  {
    q: [
      "Fruta inteira ou suco: qual tem mais fibras?",
      "Whole fruit or juice: which has more fiber?",
      "Fruta entera o jugo: ¿cuál tiene más fibra?",
      "Fruit entier ou jus : lequel a le plus de fibres ?",
    ],
    options: [
      ["O suco coado", "Strained juice", "El jugo colado", "Le jus filtré"],
      ["A fruta inteira", "The whole fruit", "La fruta entera", "Le fruit entier"],
      ["São iguais", "They're the same", "Son iguales", "C'est pareil"],
    ],
    answer: 1,
    why: [
      "Na fruta inteira as fibras ficam, e ela sacia mais. Coar o suco tira boa parte delas.",
      "Whole fruit keeps its fiber and is more filling. Straining juice removes much of it.",
      "La fruta entera conserva la fibra y sacia más. Colar el jugo quita buena parte.",
      "Le fruit entier garde ses fibres et rassasie plus. Filtrer le jus en enlève une bonne partie.",
    ],
  },
  {
    q: [
      "Até que idade bebês não devem comer mel?",
      "Until what age should babies not eat honey?",
      "¿Hasta qué edad los bebés no deben comer miel?",
      "Jusqu'à quel âge les bébés ne doivent-ils pas manger de miel ?",
    ],
    options: [
      ["Até 1 ano", "Until 1 year old", "Hasta 1 año", "Jusqu'à 1 an"],
      ["Até 1 mês", "Until 1 month old", "Hasta 1 mes", "Jusqu'à 1 mois"],
      [
        "Podem desde o nascimento",
        "From birth is fine",
        "Pueden desde el nacimiento",
        "Dès la naissance",
      ],
    ],
    answer: 0,
    why: [
      "Antes de 1 ano, o mel pode causar botulismo infantil. Depois disso, com moderação, tudo bem.",
      "Before age 1, honey can cause infant botulism. After that, in moderation, it's fine.",
      "Antes de 1 año, la miel puede causar botulismo infantil. Después, con moderación, está bien.",
      "Avant 1 an, le miel peut provoquer un botulisme infantile. Ensuite, avec modération, c'est possible.",
    ],
  },
  {
    q: [
      "Por quanto tempo se recomenda o aleitamento materno exclusivo?",
      "How long is exclusive breastfeeding recommended?",
      "¿Por cuánto tiempo se recomienda la lactancia materna exclusiva?",
      "Pendant combien de temps l'allaitement exclusif est-il recommandé ?",
    ],
    options: [
      ["Até os 6 meses", "Until 6 months", "Hasta los 6 meses", "Jusqu'à 6 mois"],
      ["Até 1 mês", "Until 1 month", "Hasta 1 mes", "Jusqu'à 1 mois"],
      ["Até 3 anos", "Until 3 years", "Hasta los 3 años", "Jusqu'à 3 ans"],
    ],
    answer: 0,
    why: [
      "OMS e Ministério da Saúde recomendam só leite materno até os 6 meses, e mantê-lo até 2 anos ou mais com outros alimentos.",
      "WHO and Brazil's Ministry of Health recommend breast milk only until 6 months, continuing to 2 years or more with other foods.",
      "La OMS y el Ministerio de Salud recomiendan solo leche materna hasta los 6 meses, y mantenerla hasta 2 años o más con otros alimentos.",
      "L'OMS et le ministère brésilien de la Santé recommandent le lait maternel seul jusqu'à 6 mois, puis jusqu'à 2 ans ou plus avec d'autres aliments.",
    ],
  },
  {
    q: [
      "O que o Guia Alimentar recomenda sobre o jeito de comer?",
      "What does the Brazilian Dietary Guide say about how to eat?",
      "¿Qué recomienda la Guía Alimentaria sobre la forma de comer?",
      "Que recommande le Guide alimentaire sur la façon de manger ?",
    ],
    options: [
      [
        "Comer rápido, em pé",
        "Eat fast, standing up",
        "Comer rápido, de pie",
        "Manger vite, debout",
      ],
      [
        "Comer com calma e, sempre que possível, em companhia",
        "Eat calmly and, whenever possible, with others",
        "Comer con calma y, siempre que sea posible, en compañía",
        "Manger calmement et, si possible, en compagnie",
      ],
      ["Comer vendo TV", "Eat while watching TV", "Comer viendo la tele", "Manger devant la télé"],
    ],
    answer: 1,
    why: [
      "O Guia pede refeições em horários regulares, com atenção, em ambiente tranquilo e, se possível, com outras pessoas.",
      "The Guide asks for regular mealtimes, with attention, in a calm place and, when possible, with others.",
      "La Guía pide comidas en horarios regulares, con atención, en un ambiente tranquilo y, si es posible, con otras personas.",
      "Le Guide conseille des repas réguliers, attentifs, dans un endroit calme et, si possible, avec d'autres.",
    ],
  },
  {
    q: [
      "Como higienizar verduras que serão comidas cruas?",
      "How should you sanitize vegetables eaten raw?",
      "¿Cómo desinfectar verduras que se comerán crudas?",
      "Comment désinfecter les légumes mangés crus ?",
    ],
    options: [
      ["Só passar um pano", "Just wipe them", "Solo pasar un paño", "Juste les essuyer"],
      [
        "Lavar e deixar de molho em solução com água sanitária própria para alimentos",
        "Wash and soak in a food-safe bleach solution",
        "Lavar y dejar en remojo en una solución con lejía apta para alimentos",
        "Laver et faire tremper dans une solution chlorée adaptée aux aliments",
      ],
      [
        "Lavar só com detergente",
        "Wash with dish soap only",
        "Lavar solo con detergente",
        "Laver au liquide vaisselle",
      ],
    ],
    answer: 1,
    why: [
      "Lave em água corrente e deixe de molho na solução clorada indicada no rótulo (cerca de 10 a 15 minutos); depois enxágue.",
      "Rinse under running water, soak in the chlorine solution as the label says (about 10–15 minutes), then rinse.",
      "Lava con agua corriente, deja en remojo en la solución clorada según la etiqueta (unos 10 a 15 minutos) y enjuaga.",
      "Rincez à l'eau courante, faites tremper dans la solution chlorée selon l'étiquette (10 à 15 minutes), puis rincez.",
    ],
  },
  {
    q: [
      "Qual destes NÃO é uma leguminosa?",
      "Which of these is NOT a legume?",
      "¿Cuál de estos NO es una legumbre?",
      "Lequel de ces aliments n'est PAS une légumineuse ?",
    ],
    options: [
      ["Lentilha", "Lentil", "Lenteja", "Lentille"],
      ["Grão-de-bico", "Chickpea", "Garbanzo", "Pois chiche"],
      ["Arroz", "Rice", "Arroz", "Riz"],
    ],
    answer: 2,
    why: [
      "Arroz é um cereal. Feijão, lentilha, grão-de-bico e ervilha são leguminosas, ricas em proteína e fibra.",
      "Rice is a grain. Beans, lentils, chickpeas and peas are legumes, rich in protein and fiber.",
      "El arroz es un cereal. Frijoles, lentejas, garbanzos y guisantes son legumbres, ricas en proteína y fibra.",
      "Le riz est une céréale. Haricots, lentilles, pois chiches et petits pois sont des légumineuses, riches en protéines et fibres.",
    ],
  },
  {
    q: [
      "Batata, mandioca e inhame são principalmente fonte de:",
      "Potatoes, cassava and yams are mainly a source of:",
      "Papa, yuca y ñame son principalmente fuente de:",
      "Pomme de terre, manioc et igname sont surtout une source de :",
    ],
    options: [
      ["Carboidratos", "Carbohydrates", "Carbohidratos", "Glucides"],
      ["Gorduras", "Fats", "Grasas", "Lipides"],
      ["Vitamina B12", "Vitamin B12", "Vitamina B12", "Vitamine B12"],
    ],
    answer: 0,
    why: [
      "Raízes e tubérculos dão energia como o arroz e o macarrão, e combinam bem com feijão e verduras.",
      "Roots and tubers give energy like rice and pasta, and go well with beans and vegetables.",
      "Raíces y tubérculos dan energía como el arroz y la pasta, y combinan bien con frijoles y verduras.",
      "Racines et tubercules apportent de l'énergie comme le riz et les pâtes, et vont bien avec haricots et légumes.",
    ],
  },
  {
    q: [
      "Qual destes é conhecido por ter bastante potássio?",
      "Which of these is known for being high in potassium?",
      "¿Cuál de estos es conocido por tener bastante potasio?",
      "Lequel est connu pour être riche en potassium ?",
    ],
    options: [
      ["Banana", "Banana", "Plátano", "Banane"],
      ["Óleo de soja", "Soybean oil", "Aceite de soja", "Huile de soja"],
      ["Açúcar", "Sugar", "Azúcar", "Sucre"],
    ],
    answer: 0,
    why: [
      "Banana, feijão, batata e folhas verdes têm potássio, que ajuda a controlar a pressão.",
      "Bananas, beans, potatoes and leafy greens have potassium, which helps control blood pressure.",
      "Plátano, frijoles, papa y hojas verdes tienen potasio, que ayuda a controlar la presión.",
      "Banane, haricots, pomme de terre et légumes verts contiennent du potassium, utile pour la tension.",
    ],
  },
  {
    q: [
      "Qual destes costuma ter mais sódio?",
      "Which of these usually has the most sodium?",
      "¿Cuál de estos suele tener más sodio?",
      "Lequel contient généralement le plus de sodium ?",
    ],
    options: [
      ["Maçã", "Apple", "Manzana", "Pomme"],
      [
        "Macarrão instantâneo com o tempero",
        "Instant noodles with the seasoning",
        "Fideos instantáneos con el sazonador",
        "Nouilles instantanées avec l'assaisonnement",
      ],
      ["Aveia", "Oats", "Avena", "Flocons d'avoine"],
    ],
    answer: 1,
    why: [
      "Um pacote de macarrão instantâneo com o tempero pode ter boa parte do sódio recomendado para o dia inteiro.",
      "One pack of instant noodles with seasoning can hold a big share of a whole day's recommended sodium.",
      "Un paquete de fideos instantáneos con el sazonador puede tener buena parte del sodio recomendado para todo el día.",
      "Un sachet de nouilles instantanées avec l'assaisonnement peut contenir une grande part du sodium conseillé pour la journée.",
    ],
  },
  {
    q: [
      "Qual é um bom sinal de que você está bem hidratado?",
      "Which is a good sign you're well hydrated?",
      "¿Cuál es una buena señal de que estás bien hidratado?",
      "Quel est un bon signe d'une bonne hydratation ?",
    ],
    options: [
      ["Urina clara", "Pale urine", "Orina clara", "Urine claire"],
      ["Boca seca", "Dry mouth", "Boca seca", "Bouche sèche"],
      ["Dor de cabeça", "Headache", "Dolor de cabeza", "Mal de tête"],
    ],
    answer: 0,
    why: [
      "Urina clarinha costuma indicar boa hidratação. Boca seca e urina escura pedem mais água.",
      "Pale urine usually means good hydration. Dry mouth and dark urine call for more water.",
      "Orina clara suele indicar buena hidratación. Boca seca y orina oscura piden más agua.",
      "Une urine claire indique en général une bonne hydratation. Bouche sèche et urine foncée : buvez plus.",
    ],
  },
  {
    q: [
      "Por que comprar frutas e verduras da estação?",
      "Why buy seasonal fruits and vegetables?",
      "¿Por qué comprar frutas y verduras de temporada?",
      "Pourquoi acheter des fruits et légumes de saison ?",
    ],
    options: [
      ["São mais caras", "They cost more", "Son más caras", "Ils coûtent plus cher"],
      [
        "Costumam ser mais baratas e saborosas",
        "They tend to be cheaper and tastier",
        "Suelen ser más baratas y sabrosas",
        "Ils sont souvent moins chers et plus savoureux",
      ],
      ["Duram menos", "They last less", "Duran menos", "Ils se conservent moins"],
    ],
    answer: 1,
    why: [
      "Na safra há mais oferta: o preço cai e o sabor costuma estar no auge. Veja o Calendário da feira.",
      "In season there's more supply: prices drop and flavor peaks. Check the Market calendar.",
      "En temporada hay más oferta: el precio baja y el sabor está en su mejor momento. Mira el Calendario de feria.",
      "En saison l'offre augmente : les prix baissent et le goût est au top. Voyez le Calendrier du marché.",
    ],
  },
  {
    q: ["O talo do brócolis:", "Broccoli stems:", "El tallo del brócoli:", "La tige du brocoli :"],
    options: [
      ["Deve ir para o lixo", "Should be thrown away", "Debe ir a la basura", "Doit être jetée"],
      [
        "Pode ser cozido e comido, como a flor",
        "Can be cooked and eaten, like the florets",
        "Se puede cocinar y comer, como la flor",
        "Se cuisine et se mange, comme les fleurettes",
      ],
      ["Faz mal", "Is harmful", "Hace mal", "Est nocive"],
    ],
    answer: 1,
    why: [
      "Talos e folhas são comida: vão bem em refogados, sopas e bolinhos, e evitam desperdício.",
      "Stems and leaves are food: great in stir-fries, soups and fritters, and they cut waste.",
      "Tallos y hojas son comida: van bien en salteados, sopas y buñuelos, y evitan desperdicio.",
      "Tiges et feuilles se mangent : poêlées, soupes, galettes, et moins de gaspillage.",
    ],
  },
  {
    q: [
      "A vitamina B12 está naturalmente em quais alimentos?",
      "Vitamin B12 is naturally found in which foods?",
      "¿En qué alimentos está naturalmente la vitamina B12?",
      "La vitamine B12 se trouve naturellement dans quels aliments ?",
    ],
    options: [
      ["Frutas", "Fruits", "Frutas", "Fruits"],
      [
        "Alimentos de origem animal",
        "Animal foods",
        "Alimentos de origen animal",
        "Aliments d'origine animale",
      ],
      ["Cereais integrais", "Whole grains", "Cereales integrales", "Céréales complètes"],
    ],
    answer: 1,
    why: [
      "B12 vem de carnes, ovos, leite e derivados. Quem não come nada de origem animal precisa de suplemento orientado.",
      "B12 comes from meat, eggs and dairy. People who eat no animal foods need a supplement with guidance.",
      "La B12 viene de carnes, huevos y lácteos. Quien no come nada de origen animal necesita un suplemento orientado.",
      "La B12 vient de la viande, des œufs et des laitages. Sans aucun produit animal, il faut un complément encadré.",
    ],
  },
  {
    q: [
      "Pão integral comparado ao pão branco costuma ter:",
      "Compared with white bread, whole-grain bread usually has:",
      "Comparado con el pan blanco, el pan integral suele tener:",
      "Comparé au pain blanc, le pain complet a généralement :",
    ],
    options: [
      ["Mais fibras", "More fiber", "Más fibra", "Plus de fibres"],
      ["Menos nutrientes", "Fewer nutrients", "Menos nutrientes", "Moins de nutriments"],
      ["Mais açúcar sempre", "Always more sugar", "Siempre más azúcar", "Toujours plus de sucre"],
    ],
    answer: 0,
    why: [
      "O grão inteiro mantém a casca, com fibras e vitaminas. Confira no rótulo se a farinha integral vem primeiro.",
      "The whole grain keeps its bran, with fiber and vitamins. Check that whole-grain flour comes first on the label.",
      "El grano entero conserva la cáscara, con fibra y vitaminas. Revisa que la harina integral aparezca primero.",
      "Le grain entier garde son enveloppe, avec fibres et vitamines. Vérifiez que la farine complète est en tête.",
    ],
  },
  {
    q: [
      "Qual combinação clássica brasileira junta proteínas que se completam?",
      "Which classic Brazilian combo brings together proteins that complement each other?",
      "¿Qué combinación clásica brasileña une proteínas que se complementan?",
      "Quelle association brésilienne classique réunit des protéines complémentaires ?",
    ],
    options: [
      ["Arroz com feijão", "Rice and beans", "Arroz con frijoles", "Riz et haricots"],
      ["Pão com manteiga", "Bread and butter", "Pan con mantequilla", "Pain et beurre"],
      ["Café com açúcar", "Coffee with sugar", "Café con azúcar", "Café sucré"],
    ],
    answer: 0,
    why: [
      "O arroz e o feijão se completam nos aminoácidos: juntos, formam uma proteína de boa qualidade e barata.",
      "Rice and beans complement each other's amino acids: together they make good, cheap protein.",
      "El arroz y los frijoles se complementan en aminoácidos: juntos forman una proteína de buena calidad y barata.",
      "Riz et haricots se complètent en acides aminés : ensemble, une protéine de qualité et bon marché.",
    ],
  },
];
