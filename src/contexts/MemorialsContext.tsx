import { createContext, useContext, ReactNode, useMemo } from "react";
import { SearchableMemorial } from "@/lib/searchWithRelations";
import { getMemorialType } from "@/lib/dateUtils";

// 10 espaces mémoriels afro-américains avec données complètes
const mockMemorialsData = [
  {
    id: "1",
    slug: "marcus-james-washington",
    name: "Marcus James Washington",
    birthDate: "15 Mars 1958",
    deathDate: "22 Janvier 2025",
    bio: "Pasteur dévoué et pilier de sa communauté à Atlanta. Il a consacré 40 ans de sa vie au service spirituel et à l'accompagnement des familles dans le besoin.",
    photos: [
      "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face"
    ],
    author: {
      id: "author-1",
      name: "Denise Washington",
      relation: "Son Épouse",
    },
    guestbookMessages: [
      { id: "m1-1", authorName: "Denise Washington", relationCategory: "Son Épouse", content: "Mon cher Marcus, après 45 ans de mariage, tu laisses un vide immense dans mon cœur. Tu étais mon roc, mon confident, mon meilleur ami. Je t'aimerai pour l'éternité.", candleCount: 10, flowerCount: 5 },
      { id: "m1-2", authorName: "Michael Washington", relationCategory: "Son Fils", content: "Papa, tu m'as appris ce que signifie être un homme de foi et d'intégrité. Je promets de perpétuer ton héritage et d'élever mes enfants selon tes valeurs.", candleCount: 5, flowerCount: 3 },
      { id: "m1-3", authorName: "Angela Washington-Brown", relationCategory: "Sa Fille", content: "Daddy, chaque sermon que tu as prononcé résonne encore dans mon cœur. Tu as touché tant de vies avec ta sagesse et ta bonté. Rest in power.", candleCount: 8, flowerCount: 4 },
      { id: "m1-4", authorName: "Robert Mitchell", relationCategory: "Son Beau-frère", content: "Marcus était plus qu'un beau-frère, c'était un frère de cœur. Nos discussions théologiques me manqueront terriblement.", candleCount: 3, flowerCount: 2 },
      { id: "m1-5", authorName: "James Thompson", relationCategory: "Son Ami(e)", content: "Mon frère en Christ depuis 35 ans. On a traversé tellement d'épreuves ensemble. Tu as rejoint le Seigneur mais tu restes dans nos cœurs.", candleCount: 4, flowerCount: 2 },
      { id: "m1-6", authorName: "Sarah Jenkins", relationCategory: "Son Voisin(e)", content: "Pastor Washington a toujours eu un mot gentil pour chacun dans le quartier. Il nous manquera à tous.", candleCount: 2, flowerCount: 1 },
      { id: "m1-7", authorName: "Un membre de la congrégation", relationCategory: "Un anonyme", content: "Grâce à votre ministère, j'ai trouvé ma voie. Merci infiniment, Pasteur.", candleCount: 1, flowerCount: 1 },
    ],
  },
  {
    id: "2",
    slug: "gloria-mae-johnson",
    name: "Gloria Mae Johnson",
    birthDate: "8 Juillet 1945",
    deathDate: "5 Décembre 2024",
    bio: "Matriarche aimante de la famille Johnson. Enseignante pendant 38 ans à l'école publique de Chicago, elle a inspiré des générations d'élèves.",
    photos: [
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=600&fit=crop&crop=face"
    ],
    author: {
      id: "author-2",
      name: "Patricia Johnson",
      relation: "Sa Fille",
    },
    guestbookMessages: [
      { id: "m2-1", authorName: "Charles Johnson", relationCategory: "Son Fils", content: "Mama, tu as été notre force et notre inspiration. Ta cuisine du dimanche rassemblait toute la famille. Ces moments sont gravés à jamais.", candleCount: 7, flowerCount: 4 },
      { id: "m2-2", authorName: "Patricia Johnson", relationCategory: "Sa Fille", content: "Maman, tu m'as appris à être forte et indépendante. Je suis la femme que je suis grâce à toi. Je t'aime pour toujours.", candleCount: 10, flowerCount: 6 },
      { id: "m2-3", authorName: "William Johnson", relationCategory: "Son Époux", content: "Ma Gloria, 55 ans à tes côtés et chaque jour était une bénédiction. Tu es partie mais notre amour est éternel.", candleCount: 15, flowerCount: 10 },
      { id: "m2-4", authorName: "Linda Carter", relationCategory: "Sa Belle-sœur", content: "Gloria était la sœur que je n'ai jamais eue. Son rire contagieux illuminait chaque réunion de famille.", candleCount: 4, flowerCount: 2 },
      { id: "m2-5", authorName: "Dr. Michelle Robinson", relationCategory: "Son Élève", content: "Mrs. Johnson a cru en moi quand personne d'autre ne le faisait. C'est grâce à elle que je suis devenue médecin aujourd'hui.", candleCount: 5, flowerCount: 3 },
      { id: "m2-6", authorName: "Thomas Williams", relationCategory: "Son Collègue", content: "Une collègue exceptionnelle et une amie précieuse. La salle des professeurs ne sera plus jamais la même.", candleCount: 3, flowerCount: 2 },
      { id: "m2-7", authorName: "Un ancien élève reconnaissant", relationCategory: "Un admirateur", content: "Vous avez changé ma vie, Mrs. Johnson. Votre mémoire vivra à travers tous ceux que vous avez enseignés.", candleCount: 2, flowerCount: 1 },
    ],
  },
  {
    id: "3",
    slug: "jaylen-christopher-davis",
    name: "Jaylen Christopher Davis",
    birthDate: "12 Septembre 2015",
    deathDate: "28 Décembre 2024",
    bio: "Petit ange parti trop tôt. Jaylen aimait le basketball, les jeux vidéo et faire rire ses amis. Sa joie de vivre touchait tous ceux qui le connaissaient.",
    photos: [
      "https://images.unsplash.com/photo-1545696563-a17a66a8f4a1?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1489710437720-ebb67ec84dd2?w=400&h=600&fit=crop&crop=face"
    ],
    author: {
      id: "author-3",
      name: "Keisha Davis",
      relation: "Sa Mère",
    },
    guestbookMessages: [
      { id: "m3-1", authorName: "Keisha Davis", relationCategory: "Sa Mère", content: "Mon bébé, mon petit prince. Tu as illuminé nos vies pendant 9 courtes mais magnifiques années. Maman t'aimera pour toujours.", candleCount: 20, flowerCount: 15 },
      { id: "m3-2", authorName: "Derek Davis", relationCategory: "Son Père", content: "Mon champion, tu voulais devenir joueur NBA comme papa le rêvait pour toi. Tu joues maintenant dans l'équipe des anges.", candleCount: 15, flowerCount: 10 },
      { id: "m3-3", authorName: "Destiny Davis", relationCategory: "Sa Sœur", content: "Mon petit frère, tu me manques tellement. Qui va m'embêter maintenant ? Je garde tous tes dessins précieusement.", candleCount: 8, flowerCount: 5 },
      { id: "m3-4", authorName: "Grandma Rose", relationCategory: "Sa Grand-mère", content: "Mon petit-fils adoré, tu étais la lumière de ma vie. Chaque visite chez grand-mère était remplie de joie grâce à toi.", candleCount: 12, flowerCount: 8 },
      { id: "m3-5", authorName: "Marcus Davis", relationCategory: "Son Oncle", content: "Petit bonhomme, nos parties de jeux vidéo me manquent. Tu gagnais toujours et ça me rendait si fier.", candleCount: 6, flowerCount: 3 },
      { id: "m3-6", authorName: "Coach Williams", relationCategory: "Son Mentor", content: "Jaylen était le meilleur esprit d'équipe que j'ai jamais entraîné. Il encourageait toujours ses coéquipiers.", candleCount: 4, flowerCount: 2 },
      { id: "m3-7", authorName: "La classe de CE2", relationCategory: "Une connaissance", content: "Jaylen était notre ami. On pense tous très fort à toi. Tu nous manques beaucoup.", candleCount: 10, flowerCount: 5 },
    ],
  },
  {
    id: "4",
    slug: "evelyn-grace-robinson",
    name: "Evelyn Grace Robinson",
    birthDate: "3 Février 1932",
    deathDate: "18 Novembre 2024",
    bio: "Doyenne respectée de la communauté de Harlem. Militante des droits civiques aux côtés de grandes figures historiques, elle a consacré sa vie à la justice sociale.",
    photos: [
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=600&fit=crop&crop=face"
    ],
    author: {
      id: "author-4",
      name: "Raymond Robinson",
      relation: "Son Fils",
    },
    guestbookMessages: [
      { id: "m4-1", authorName: "Raymond Robinson", relationCategory: "Son Fils", content: "Maman, tu as marché à Selma, tu as combattu pour nos droits. Ton courage inspire encore des générations. Rest in power.", candleCount: 12, flowerCount: 8 },
      { id: "m4-2", authorName: "Barbara Robinson-Hayes", relationCategory: "Sa Fille", content: "Mother, tu m'as appris que le silence face à l'injustice est complicité. Je continuerai ton combat.", candleCount: 10, flowerCount: 6 },
      { id: "m4-3", authorName: "James Robinson Sr.", relationCategory: "Son Petit-fils", content: "Grand-mère Evelyn, tes histoires du mouvement des droits civiques m'ont façonné. Tu es une légende.", candleCount: 8, flowerCount: 4 },
      { id: "m4-4", authorName: "Dorothy Hayes", relationCategory: "Sa Belle-fille", content: "Mother Robinson, vous m'avez accueillie comme votre propre fille. Votre amour inconditionnel me manquera.", candleCount: 5, flowerCount: 3 },
      { id: "m4-5", authorName: "Pastor Thomas Brown", relationCategory: "Son Ami(e)", content: "Sister Evelyn était une pilier de notre église. Sa foi et sa détermination inspiraient toute la congrégation.", candleCount: 6, flowerCount: 4 },
      { id: "m4-6", authorName: "Helen Mitchell", relationCategory: "Son Voisin(e)", content: "Mrs. Robinson a vécu dans notre immeuble pendant 50 ans. Elle connaissait tout le monde et aidait chacun.", candleCount: 3, flowerCount: 2 },
      { id: "m4-7", authorName: "Le Harlem Heritage Center", relationCategory: "Un admirateur", content: "Nous honorons la mémoire d'une grande dame qui a marqué l'histoire de notre communauté.", candleCount: 8, flowerCount: 5 },
    ],
  },
  {
    id: "5",
    slug: "anthony-jerome-williams",
    name: "Anthony Jerome Williams",
    birthDate: "27 Octobre 1975",
    deathDate: "14 Janvier 2025",
    bio: "Entrepreneur visionnaire et philanthrope. Fondateur de trois entreprises prospères, il employait plus de 200 personnes dans sa communauté de Detroit.",
    photos: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=600&fit=crop&crop=face"
    ],
    author: {
      id: "author-5",
      name: "Vanessa Williams",
      relation: "Son Épouse",
    },
    guestbookMessages: [
      { id: "m5-1", authorName: "Vanessa Williams", relationCategory: "Son Épouse", content: "Anthony, tu as bâti un empire par amour pour notre famille et notre communauté. Tu laisses un héritage incroyable.", candleCount: 15, flowerCount: 10 },
      { id: "m5-2", authorName: "Anthony Jr.", relationCategory: "Son Fils", content: "Dad, tu m'as appris que le succès se mesure à l'impact qu'on a sur les autres. Je reprendrai le flambeau.", candleCount: 10, flowerCount: 5 },
      { id: "m5-3", authorName: "Jasmine Williams", relationCategory: "Sa Fille", content: "Daddy, tu étais mon héros. Tu as prouvé que rien n'est impossible avec du travail et de la détermination.", candleCount: 8, flowerCount: 6 },
      { id: "m5-4", authorName: "Margaret Williams", relationCategory: "Sa Mère", content: "Mon fils, tu as accompli tant de choses en si peu de temps. Une mère ne devrait jamais enterrer son enfant.", candleCount: 12, flowerCount: 8 },
      { id: "m5-5", authorName: "Robert Thompson", relationCategory: "Son Beau-père", content: "Anthony a transformé notre famille avec sa générosité et son ambition. Il était le fils que j'aurais voulu avoir.", candleCount: 5, flowerCount: 3 },
      { id: "m5-6", authorName: "Kevin Johnson", relationCategory: "Son Collègue", content: "Travailler avec Anthony était une école de vie. Il voyait le potentiel en chacun de nous.", candleCount: 4, flowerCount: 2 },
      { id: "m5-7", authorName: "Detroit Business Association", relationCategory: "Une connaissance", content: "Un géant de l'entrepreneuriat nous a quittés. Son impact sur l'économie locale restera indélébile.", candleCount: 6, flowerCount: 4 },
    ],
  },
  {
    id: "6",
    slug: "nina-michelle-carter",
    name: "Nina Michelle Carter",
    birthDate: "19 Juin 1988",
    deathDate: "3 Octobre 2024",
    bio: "Artiste talentueuse et âme créative. Chanteuse de gospel et peintre reconnue, Nina a touché des milliers de cœurs avec son art et sa spiritualité.",
    photos: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=600&fit=crop&crop=face"
    ],
    author: {
      id: "author-6",
      name: "David Carter",
      relation: "Son Époux",
    },
    guestbookMessages: [
      { id: "m6-1", authorName: "David Carter", relationCategory: "Son Époux", content: "Ma Nina, ta voix résonne encore dans notre maison. Notre fille a hérité de ton talent. Tu veilles sur nous depuis les cieux.", candleCount: 20, flowerCount: 15 },
      { id: "m6-2", authorName: "Ava Carter", relationCategory: "Sa Fille", content: "Mommy, je chante tes chansons tous les soirs avant de dormir. Tu me manques tellement.", candleCount: 10, flowerCount: 8 },
      { id: "m6-3", authorName: "Sandra Carter", relationCategory: "Sa Mère", content: "Ma petite fille, tu as apporté tant de beauté dans ce monde. Ton art continuera d'inspirer.", candleCount: 12, flowerCount: 10 },
      { id: "m6-4", authorName: "Jerome Carter", relationCategory: "Son Père", content: "Nina, depuis ta première note de piano à 5 ans, je savais que tu étais spéciale. Daddy est si fier de toi.", candleCount: 8, flowerCount: 5 },
      { id: "m6-5", authorName: "Michelle Brooks", relationCategory: "Sa Belle-sœur", content: "Nina était comme une sœur pour moi. Nos sessions de peinture ensemble me manqueront terriblement.", candleCount: 5, flowerCount: 3 },
      { id: "m6-6", authorName: "Choir of Grace Church", relationCategory: "Son Ami(e)", content: "Nina était notre soliste. Sa voix angélique portait nos prières jusqu'au ciel.", candleCount: 8, flowerCount: 6 },
      { id: "m6-7", authorName: "Atlanta Art Gallery", relationCategory: "Un admirateur", content: "Nous exposerons l'œuvre de Nina pour que son talent continue de briller. Une artiste inoubliable.", candleCount: 4, flowerCount: 3 },
    ],
  },
  {
    id: "7",
    slug: "samuel-lee-jackson",
    name: "Samuel Lee Jackson",
    birthDate: "5 Avril 1940",
    deathDate: "29 Août 2024",
    bio: "Vétéran du Vietnam et héros américain. Après son service, Samuel a fondé une association d'aide aux anciens combattants à Los Angeles.",
    photos: [
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=600&fit=crop&crop=face"
    ],
    author: {
      id: "author-7",
      name: "Martha Jackson",
      relation: "Son Épouse",
    },
    guestbookMessages: [
      { id: "m7-1", authorName: "Martha Jackson", relationCategory: "Son Épouse", content: "Mon soldat, après 52 ans de mariage, tu as enfin trouvé la paix. Ton courage m'a portée chaque jour.", candleCount: 15, flowerCount: 12 },
      { id: "m7-2", authorName: "Captain David Jackson", relationCategory: "Son Fils", content: "Dad, tu m'as inspiré à servir mon pays. Je porte fièrement l'uniforme en ton honneur.", candleCount: 10, flowerCount: 6 },
      { id: "m7-3", authorName: "Lisa Jackson-Moore", relationCategory: "Sa Fille", content: "Papa, tu nous as appris la résilience et le courage. Tu resteras toujours notre héros.", candleCount: 8, flowerCount: 5 },
      { id: "m7-4", authorName: "Tommy Jackson", relationCategory: "Son Petit-fils", content: "Grandpa, tes histoires de guerre m'ont appris ce qu'est le vrai courage. Je te rends honneur.", candleCount: 6, flowerCount: 4 },
      { id: "m7-5", authorName: "Colonel James Wilson", relationCategory: "Son Ami(e)", content: "Samuel était mon frère d'armes. Nous avons survécu ensemble. Semper Fi, brother.", candleCount: 8, flowerCount: 5 },
      { id: "m7-6", authorName: "VA Hospital Staff", relationCategory: "Son Collègue", content: "Mr. Jackson a aidé des centaines de vétérans à travers son association. Un vrai patriote.", candleCount: 5, flowerCount: 3 },
      { id: "m7-7", authorName: "Un vétéran anonyme", relationCategory: "Un anonyme", content: "Grâce à vous, j'ai pu me reconstruire après la guerre. Merci pour tout, Sir.", candleCount: 3, flowerCount: 2 },
    ],
  },
  {
    id: "8",
    slug: "aisha-nicole-brown",
    name: "Aisha Nicole Brown",
    birthDate: "14 Décembre 2008",
    deathDate: "7 Février 2025",
    bio: "Jeune prodige de la danse classique. À seulement 16 ans, Aisha avait déjà remporté plusieurs compétitions nationales et rêvait d'intégrer l'Alvin Ailey Dance Theater.",
    photos: [
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=600&fit=crop&crop=face"
    ],
    author: {
      id: "author-8",
      name: "Michelle Brown",
      relation: "Sa Mère",
    },
    guestbookMessages: [
      { id: "m8-1", authorName: "Michelle Brown", relationCategory: "Sa Mère", content: "Ma princesse danseuse, tu as illuminé chaque scène où tu as dansé. Tu danses maintenant parmi les étoiles.", candleCount: 25, flowerCount: 20 },
      { id: "m8-2", authorName: "Robert Brown", relationCategory: "Son Père", content: "Baby girl, chaque récital était un moment de fierté immense. Tu as accompli tant de choses en si peu de temps.", candleCount: 20, flowerCount: 15 },
      { id: "m8-3", authorName: "Jayden Brown", relationCategory: "Son Frère", content: "Sis, tu étais ma meilleure amie. Nos batailles de danse dans le salon me manquent tellement.", candleCount: 12, flowerCount: 8 },
      { id: "m8-4", authorName: "Grandma Louise", relationCategory: "Sa Grand-mère", content: "Ma petite ballerine, tu as hérité de ma passion pour la danse. Continue de danser au paradis.", candleCount: 10, flowerCount: 8 },
      { id: "m8-5", authorName: "Aunt Patricia", relationCategory: "Sa Tante", content: "Aisha était une lumière dans notre famille. Ses performances nous rassemblaient tous.", candleCount: 6, flowerCount: 4 },
      { id: "m8-6", authorName: "Ms. Thompson", relationCategory: "Son Professeur", content: "Aisha était mon élève la plus talentueuse en 20 ans de carrière. Une étoile filante trop brève.", candleCount: 8, flowerCount: 5 },
      { id: "m8-7", authorName: "Les danseuses du studio", relationCategory: "Une connaissance", content: "Aisha nous inspirait toutes. On dansera pour toi à chaque représentation.", candleCount: 10, flowerCount: 6 },
    ],
  },
  {
    id: "9",
    slug: "roosevelt-james-harris",
    name: "Roosevelt James Harris",
    birthDate: "22 Janvier 1935",
    deathDate: "11 Mars 2024",
    bio: "Légende du jazz de la Nouvelle-Orléans. Saxophoniste de renom, Roosevelt a joué dans les plus grands clubs de Bourbon Street pendant 60 ans.",
    photos: [
      "https://images.unsplash.com/photo-1557862921-37829c790f19?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1559418162-0d309d8d0c1e?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1506634572416-48cdfe530110?w=400&h=600&fit=crop&crop=face"
    ],
    author: {
      id: "author-9",
      name: "Josephine Harris",
      relation: "Sa Fille",
    },
    guestbookMessages: [
      { id: "m9-1", authorName: "Josephine Harris", relationCategory: "Sa Fille", content: "Papa, ta musique coulait dans tes veines. Chaque note que tu jouais racontait une histoire. Le jazz a perdu un géant.", candleCount: 15, flowerCount: 10 },
      { id: "m9-2", authorName: "Louis Harris Jr.", relationCategory: "Son Fils", content: "Dad, tu m'as mis un saxophone entre les mains à 6 ans. Je perpétue ton art chaque soir.", candleCount: 12, flowerCount: 8 },
      { id: "m9-3", authorName: "Eleanor Harris", relationCategory: "Son Épouse", content: "Mon Roosevelt, 65 ans à écouter ton saxophone chaque soir. Le silence est maintenant assourdissant.", candleCount: 18, flowerCount: 12 },
      { id: "m9-4", authorName: "Marcus Harris", relationCategory: "Son Petit-fils", content: "Grand-père, tu m'as appris que la musique est un langage universel. Je joue pour toi chaque jour.", candleCount: 8, flowerCount: 5 },
      { id: "m9-5", authorName: "The Bourbon Street Band", relationCategory: "Son Ami(e)", content: "Roosevelt était l'âme de notre groupe. 40 ans à jouer ensemble. La scène ne sera plus jamais la même.", candleCount: 10, flowerCount: 6 },
      { id: "m9-6", authorName: "Club Owner Jean-Pierre", relationCategory: "Son Collègue", content: "Roosevelt a fait de mon club un lieu légendaire. Des touristes venaient du monde entier pour l'écouter.", candleCount: 6, flowerCount: 4 },
      { id: "m9-7", authorName: "Un fan de jazz", relationCategory: "Un admirateur", content: "J'ai entendu Mr. Harris jouer en 1985 et ça a changé ma vie. Merci pour la musique.", candleCount: 4, flowerCount: 3 },
    ],
  },
  {
    id: "10",
    slug: "patricia-ann-thompson",
    name: "Patricia Ann Thompson",
    birthDate: "30 Mai 1965",
    deathDate: "19 Janvier 2025",
    bio: "Infirmière dévouée pendant 35 ans à l'hôpital de Baltimore. Patricia a sauvé d'innombrables vies et formé la nouvelle génération de soignants.",
    photos: [
      "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=600&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=600&fit=crop&crop=face"
    ],
    author: {
      id: "author-10",
      name: "Dr. Marcus Thompson",
      relation: "Son Fils",
    },
    guestbookMessages: [
      { id: "m10-1", authorName: "Dr. Marcus Thompson", relationCategory: "Son Fils", content: "Mom, tu m'as inspiré à devenir médecin. Chaque patient que je soigne, je le fais en ton honneur.", candleCount: 15, flowerCount: 10 },
      { id: "m10-2", authorName: "Jessica Thompson", relationCategory: "Sa Fille", content: "Maman, tu étais toujours là pour tout le monde. C'est à notre tour de prendre soin de ton héritage.", candleCount: 12, flowerCount: 8 },
      { id: "m10-3", authorName: "Gerald Thompson", relationCategory: "Son Époux", content: "Ma Patricia, 40 ans de mariage et tu étais toujours aussi dévouée. La maison est vide sans toi.", candleCount: 18, flowerCount: 12 },
      { id: "m10-4", authorName: "Emma Thompson", relationCategory: "Sa Petite-fille", content: "Grandma Pat, tu m'as appris à être gentille avec tout le monde. Je veux devenir infirmière comme toi.", candleCount: 8, flowerCount: 6 },
      { id: "m10-5", authorName: "Sandra Mitchell", relationCategory: "Sa Belle-sœur", content: "Patricia était le cœur de notre famille. Sa générosité n'avait pas de limites.", candleCount: 5, flowerCount: 3 },
      { id: "m10-6", authorName: "L'équipe soignante", relationCategory: "Son Collègue", content: "Patricia a formé la plupart d'entre nous. Son dévouement envers les patients était exemplaire.", candleCount: 10, flowerCount: 6 },
      { id: "m10-7", authorName: "Un patient reconnaissant", relationCategory: "Un anonyme", content: "Nurse Thompson m'a sauvé la vie en 2010. Elle mérite tous les honneurs.", candleCount: 4, flowerCount: 3 },
    ],
  },
];

interface MemorialsContextType {
  memorials: SearchableMemorial[];
  memorialCards: {
    id: string;
    slug: string;
    name: string;
    birthDate: string;
    deathDate: string;
    photoUrl: string;
    ripCount: number;
    candleCount: number;
    flowerCount: number;
    type: "RECENT" | "PAST";
  }[];
}

const MemorialsContext = createContext<MemorialsContextType | undefined>(undefined);

export const MemorialsProvider = ({ children }: { children: ReactNode }) => {
  const memorials = useMemo<SearchableMemorial[]>(() => 
    mockMemorialsData.map(m => ({
      ...m,
      type: getMemorialType(m.deathDate),
    })), 
  []);

  const memorialCards = useMemo(() => 
    memorials.map(m => {
      // Calculate totals from guestbook messages
      const totals = m.guestbookMessages.reduce(
        (acc, msg) => ({
          ripCount: acc.ripCount + 1,
          candleCount: acc.candleCount + (msg.candleCount || 0),
          flowerCount: acc.flowerCount + (msg.flowerCount || 0),
        }),
        { ripCount: 0, candleCount: 0, flowerCount: 0 }
      );

      return {
        id: m.id,
        slug: m.slug,
        name: m.name,
        birthDate: m.birthDate,
        deathDate: m.deathDate,
        photoUrl: m.photos[0],
        ripCount: totals.ripCount,
        candleCount: totals.candleCount,
        flowerCount: totals.flowerCount,
        type: m.type,
      };
    }),
  [memorials]);

  return (
    <MemorialsContext.Provider value={{ memorials, memorialCards }}>
      {children}
    </MemorialsContext.Provider>
  );
};

export const useMemorials = () => {
  const context = useContext(MemorialsContext);
  if (context === undefined) {
    throw new Error("useMemorials must be used within a MemorialsProvider");
  }
  return context;
};
