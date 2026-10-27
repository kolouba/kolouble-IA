export interface MarketplaceTemplate {
  key: string;
  name: string;
  category: TemplateCategory;
  tagline: string;
  description: string;
  prompt: string;
  icon: TemplateIcon;
  accent: string;
  entities: string[];
  highlights: string[];
  badge?: string;
  saasReady: boolean;
}

export type TemplateCategory =
  | "Vente & relation client"
  | "Opérations"
  | "Finance"
  | "Public & territoire"
  | "Communautés"
  | "Santé & éducation";

export type TemplateIcon =
  | "users"
  | "boxes"
  | "receipt"
  | "badge"
  | "cart"
  | "school"
  | "health"
  | "landmark"
  | "heart"
  | "church"
  | "map"
  | "flower";

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Vente & relation client",
  "Opérations",
  "Finance",
  "Public & territoire",
  "Communautés",
  "Santé & éducation",
];

export const MARKETPLACE_TEMPLATES: MarketplaceTemplate[] = [
  {
    key: "crm",
    name: "CRM",
    category: "Vente & relation client",
    tagline: "Toute la relation client, structurée.",
    description:
      "Prospects, clients, actions commerciales et relances dans un pipeline clair, disponible hors ligne.",
    prompt:
      "Application CRM pour suivre les prospects, les clients, les tâches commerciales, les relances et les rapports de vente.",
    icon: "users",
    accent: "#7FA8FF",
    entities: ["Clients", "Tâches"],
    highlights: ["Pipeline commercial", "Relances planifiées", "Rapports clients"],
    badge: "Populaire",
    saasReady: true,
  },
  {
    key: "erp",
    name: "ERP",
    category: "Opérations",
    tagline: "Achats, fournisseurs et stocks reliés.",
    description:
      "Un ERP léger pour coordonner les fournisseurs, les achats, le catalogue et les dépenses.",
    prompt:
      "Application ERP pour gérer les fournisseurs, les achats, les produits, les stocks et les dépenses de l'entreprise.",
    icon: "boxes",
    accent: "#B79CFF",
    entities: ["Fournisseurs", "Achats", "Produits", "Dépenses"],
    highlights: ["Bons d'achat", "Suivi fournisseurs", "Contrôle des coûts"],
    saasReady: true,
  },
  {
    key: "billing",
    name: "Facturation",
    category: "Finance",
    tagline: "Facturez, encaissez, suivez.",
    description:
      "Factures, clients, statuts de paiement et relances des impayés, prêts à être déployés.",
    prompt:
      "Application de facturation avec clients, factures, statuts de paiement, relances et export des impayés.",
    icon: "receipt",
    accent: "#FFB86B",
    entities: ["Factures", "Clients"],
    highlights: ["Numérotation automatique", "Suivi des paiements", "Relances"],
    saasReady: true,
  },
  {
    key: "hr",
    name: "RH",
    category: "Opérations",
    tagline: "L'équipe et ses informations, centralisées.",
    description:
      "Collaborateurs, postes, arrivées et suivi des tâches internes dans un espace RH simple.",
    prompt:
      "Application RH pour gérer les collaborateurs, les postes, les arrivées, les congés et les tâches internes.",
    icon: "badge",
    accent: "#3DDC97",
    entities: ["Collaborateurs", "Tâches"],
    highlights: ["Annuaire interne", "Suivi des arrivées", "Tâches RH"],
    saasReady: true,
  },
  {
    key: "commerce",
    name: "E-commerce",
    category: "Vente & relation client",
    tagline: "Commandes, catalogue et clients réunis.",
    description:
      "Une base e-commerce légère pour gérer les commandes, les produits et la relation client en mobilité.",
    prompt:
      "Application e-commerce pour gérer les commandes, les produits, les clients, les livraisons et le catalogue.",
    icon: "cart",
    accent: "#FF8A8A",
    entities: ["Commandes", "Produits", "Clients"],
    highlights: ["Suivi des commandes", "Catalogue", "Statuts de livraison"],
    saasReady: true,
  },
  {
    key: "education",
    name: "École",
    category: "Santé & éducation",
    tagline: "Formations et participants bien organisés.",
    description:
      "Sessions, formateurs, places disponibles et inscriptions pour une école ou un centre de formation.",
    prompt:
      "Application de gestion scolaire et de formations avec cours, formateurs, étudiants, sessions et inscriptions.",
    icon: "school",
    accent: "#3DDC97",
    entities: ["Formations", "Collaborateurs"],
    highlights: ["Sessions", "Inscriptions", "Suivi des places"],
    saasReady: true,
  },
  {
    key: "health",
    name: "Santé",
    category: "Santé & éducation",
    tagline: "Le suivi patient, simple et confidentiel.",
    description:
      "Patients, rendez-vous et observations protégées, avec un fonctionnement hors ligne fiable.",
    prompt:
      "Application de santé pour suivre les patients, les rendez-vous, les observations et les dossiers confidentiels.",
    icon: "health",
    accent: "#FF8A8A",
    entities: ["Patients", "Rendez-vous"],
    highlights: ["Dossiers patients", "Agenda médical", "Confidentialité"],
    saasReady: true,
  },
  {
    key: "mairie",
    name: "Mairie",
    category: "Public & territoire",
    tagline: "Les démarches des administrés, suivies.",
    description:
      "Administrés, demandes et projets municipaux dans une application de service public claire.",
    prompt:
      "Application de mairie pour gérer les administrés, les demandes de démarches, les projets municipaux et les services aux citoyens.",
    icon: "landmark",
    accent: "#FFB86B",
    entities: ["Administrés", "Demandes", "Projets"],
    highlights: ["Suivi des démarches", "Registre des administrés", "Projets locaux"],
    badge: "Secteur public",
    saasReady: true,
  },
  {
    key: "association",
    name: "Association",
    category: "Communautés",
    tagline: "Membres, dons et activités rassemblés.",
    description:
      "Adhérents, cotisations, dons et activités terrain pour une ONG ou une association locale.",
    prompt:
      "Application pour association ou ONG avec membres, adhérents, dons, cotisations, activités terrain et rapports.",
    icon: "heart",
    accent: "#3DDC97",
    entities: ["Membres", "Dons", "Activités"],
    highlights: ["Suivi des adhérents", "Collecte des dons", "Activités terrain"],
    saasReady: true,
  },
  {
    key: "church",
    name: "Église",
    category: "Communautés",
    tagline: "Fidèles, offrandes et célébrations.",
    description:
      "Membres, offrandes et événements paroissiaux organisés dans un espace respectueux et simple.",
    prompt:
      "Application pour église et paroisse avec fidèles, membres, offrandes, dons, célébrations et événements.",
    icon: "church",
    accent: "#7FA8FF",
    entities: ["Membres", "Dons", "Événements"],
    highlights: ["Annuaire des fidèles", "Offrandes", "Agenda paroissial"],
    saasReady: true,
  },
  {
    key: "community",
    name: "Collectivité",
    category: "Public & territoire",
    tagline: "Le territoire, ses projets, ses demandes.",
    description:
      "Projets territoriaux, administrés et demandes de services publics réunis dans un même cockpit.",
    prompt:
      "Application pour collectivité territoriale avec projets, administrés, demandes de service public et suivi territorial.",
    icon: "map",
    accent: "#3DDC97",
    entities: ["Projets", "Demandes", "Administrés"],
    highlights: ["Projets territoriaux", "Demandes citoyennes", "Suivi par quartier"],
    saasReady: true,
  },
  {
    key: "funeral",
    name: "Funéraire",
    category: "Communautés",
    tagline: "Accompagner les familles avec dignité.",
    description:
      "Défunts, contrats et cérémonies organisés avec rigueur pour un service funéraire.",
    prompt:
      "Application pour services funéraires avec défunts, familles, contrats, obsèques, cérémonies et suivi des prestations.",
    icon: "flower",
    accent: "#FF8A8A",
    entities: ["Défunts", "Contrats", "Cérémonies"],
    highlights: ["Dossiers familles", "Contrats", "Planning des cérémonies"],
    saasReady: true,
  },
];

export function getMarketplaceTemplate(key: string | null | undefined): MarketplaceTemplate | undefined {
  if (!key) return undefined;
  return MARKETPLACE_TEMPLATES.find((template) => template.key === key);
}

export function templatesByCategory(category: TemplateCategory): MarketplaceTemplate[] {
  return MARKETPLACE_TEMPLATES.filter((template) => template.category === category);
}
