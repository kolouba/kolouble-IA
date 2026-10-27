import { z } from "zod";
import { camelCase, snakeCase, packageNameFor, slugify, stripAccents, truncate } from "@/lib/naming";
import { isDeployTarget, type DeployTarget } from "@/lib/deployment";

export type { DeployTarget } from "@/lib/deployment";
export { DEPLOY_TARGETS, isDeployTarget } from "@/lib/deployment";

export type FieldType = "text" | "longtext" | "number" | "boolean" | "date" | "status";

export interface FieldSpec {
  key: string;
  dartName: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

export interface EntitySpec {
  key: string;
  label: string;
  plural: string;
  labelPlural: string;
  icon: string;
  fields: FieldSpec[];
}

export interface ThemeSpec {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
}

export interface AppCopySpec {
  welcomeTitle: string;
  welcomeMessage: string;
  emptyState: string;
  syncMessage: string;
}

export type PaymentProvider = "stripe" | "orange-money" | "mtn-money" | "wave" | "moov-money";

export interface BillingSpec {
  enabled: boolean;
  currency: string;
  plans: Array<{ key: string; label: string; price: number; interval: "month" | "year"; features: string[] }>;
  providers: PaymentProvider[];
}

export interface DeploymentSpec {
  target: DeployTarget;
  repoName: string;
  customDomain: string | null;
}

export function repoNameFor(input: string): string {
  return slugify(input.replace(/_/g, "-")).slice(0, 60) || "application";
}

export function normalizeCustomDomain(value: string | null | undefined): string | null {
  if (!value) return null;
  const host = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
  return host.length > 0 ? host : null;
}

export function resolveDeployment(spec: Pick<AppSpec, "packageName" | "deployment">): DeploymentSpec {
  const fallbackRepo = repoNameFor(spec.packageName);
  const raw = spec.deployment;
  return {
    target: raw && isDeployTarget(raw.target) ? raw.target : "vercel",
    repoName: raw?.repoName ? repoNameFor(raw.repoName) : fallbackRepo,
    customDomain: normalizeCustomDomain(raw?.customDomain) ?? null,
  };
}

export interface AppSpec {
  appName: string;
  packageName: string;
  tagline: string;
  summary: string;
  domain: string;
  entities: EntitySpec[];
  platforms: string[];
  features: string[];
  theme: ThemeSpec;
  auth: { email: boolean; google: boolean; facebook: boolean };
  offline: boolean;
  copy: AppCopySpec;
  deployment?: DeploymentSpec;
  templateKey: string;
  saas: boolean;
  billing: BillingSpec;
  aiGenerated: boolean;
}

interface FieldSeed {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
}

interface EntitySeed {
  key: string;
  label: string;
  plural: string;
  icon: string;
  fields: FieldSeed[];
}

interface Blueprint {
  id: string;
  keywords: string[];
  appName: string;
  tagline: string;
  summary: string;
  domain: string;
  theme: ThemeSpec;
  entities: EntitySeed[];
  extraFeatures?: string[];
}

const GREEN: ThemeSpec = {
  primary: "#3DDC97",
  secondary: "#5DB9FF",
  accent: "#FFCC66",
  background: "#07100D",
  surface: "#0E1A16",
};

const INDIGO: ThemeSpec = {
  primary: "#7FA8FF",
  secondary: "#B79CFF",
  accent: "#FFCF70",
  background: "#080B14",
  surface: "#12172A",
};

const AMBER: ThemeSpec = {
  primary: "#FFB86B",
  secondary: "#7DD3FC",
  accent: "#F9A8D4",
  background: "#120D08",
  surface: "#1D150D",
};

const CORAL: ThemeSpec = {
  primary: "#FF8A8A",
  secondary: "#69E4C0",
  accent: "#FFD166",
  background: "#120A0A",
  surface: "#1D1111",
};

function field(key: string, label: string, type: FieldType, required = false, options?: string[]): FieldSeed {
  return { key, label, type, required, options };
}

const ENTITY_SEEDS = {
  projects: {
    key: "projects",
    label: "Projet",
    plural: "Projets",
    icon: "folder",
    fields: [
      field("name", "Nom du projet", "text", true),
      field("client", "Client", "text"),
      field("description", "Description", "longtext"),
      field("status", "Statut", "status", true, ["Planifié", "En cours", "En pause", "Terminé"]),
      field("budget", "Budget (FCFA)", "number"),
      field("start_date", "Date de début", "date"),
      field("due_date", "Échéance", "date"),
    ],
  },
  clients: {
    key: "clients",
    label: "Client",
    plural: "Clients",
    icon: "users",
    fields: [
      field("name", "Nom / raison sociale", "text", true),
      field("company", "Entreprise", "text"),
      field("email", "E-mail", "text"),
      field("phone", "Téléphone", "text"),
      field("status", "Statut", "status", true, ["Actif", "Prospect", "Inactif"]),
      field("notes", "Notes", "longtext"),
    ],
  },
  suppliers: {
    key: "suppliers",
    label: "Fournisseur",
    plural: "Fournisseurs",
    icon: "box",
    fields: [
      field("name", "Nom / raison sociale", "text", true),
      field("contact", "Contact", "text"),
      field("email", "E-mail", "text"),
      field("phone", "Téléphone", "text"),
      field("category", "Catégorie", "text"),
      field("status", "Statut", "status", true, ["Actif", "En attente", "Inactif"]),
      field("notes", "Notes", "longtext"),
    ],
  },
  purchases: {
    key: "purchases",
    label: "Achat",
    plural: "Achats",
    icon: "cart",
    fields: [
      field("reference", "Référence", "text", true),
      field("supplier", "Fournisseur", "text"),
      field("amount", "Montant (FCFA)", "number", true),
      field("status", "Statut", "status", true, ["Brouillon", "Commandé", "Reçu", "Annulé"]),
      field("ordered_at", "Date de commande", "date"),
      field("expected_at", "Livraison prévue", "date"),
      field("notes", "Notes", "longtext"),
    ],
  },
  members: {
    key: "members",
    label: "Membre",
    plural: "Membres",
    icon: "users",
    fields: [
      field("name", "Nom complet", "text", true),
      field("email", "E-mail", "text"),
      field("phone", "Téléphone", "text"),
      field("role", "Rôle / fonction", "text"),
      field("joined_at", "Date d'adhésion", "date"),
      field("status", "Statut", "status", true, ["Actif", "En attente", "Inactif"]),
      field("notes", "Notes", "longtext"),
    ],
  },
  donations: {
    key: "donations",
    label: "Don",
    plural: "Dons",
    icon: "wallet",
    fields: [
      field("donor", "Donateur", "text", true),
      field("amount", "Montant (FCFA)", "number", true),
      field("purpose", "Affectation", "text"),
      field("method", "Moyen", "status", true, ["Espèces", "Mobile money", "Virement", "Chèque"]),
      field("received_at", "Date de réception", "date"),
      field("notes", "Notes", "longtext"),
    ],
  },
  activities: {
    key: "activities",
    label: "Activité",
    plural: "Activités",
    icon: "event",
    fields: [
      field("title", "Titre", "text", true),
      field("place", "Lieu", "text"),
      field("starts_at", "Date", "date"),
      field("responsible", "Responsable", "text"),
      field("status", "Statut", "status", true, ["Planifiée", "En cours", "Terminée", "Annulée"]),
      field("description", "Description", "longtext"),
    ],
  },
  requests: {
    key: "requests",
    label: "Demande",
    plural: "Demandes",
    icon: "support",
    fields: [
      field("subject", "Objet", "text", true),
      field("requester", "Demandeur", "text"),
      field("category", "Catégorie", "text"),
      field("status", "Statut", "status", true, ["Nouvelle", "En cours", "Traitée", "Rejetée"]),
      field("submitted_at", "Date de dépôt", "date"),
      field("description", "Description", "longtext"),
    ],
  },
  citizens: {
    key: "citizens",
    label: "Administré",
    plural: "Administrés",
    icon: "users",
    fields: [
      field("name", "Nom complet", "text", true),
      field("address", "Adresse / quartier", "text"),
      field("phone", "Téléphone", "text"),
      field("birth_date", "Date de naissance", "date"),
      field("status", "Statut", "status", true, ["Actif", "En attente", "Inactif"]),
      field("notes", "Observations", "longtext"),
    ],
  },
  deceased: {
    key: "deceased",
    label: "Défunt",
    plural: "Défunts",
    icon: "health",
    fields: [
      field("name", "Nom complet", "text", true),
      field("family", "Famille / contact", "text"),
      field("ceremony_date", "Date de cérémonie", "date"),
      field("status", "Suivi", "status", true, ["Accueil", "Cérémonie", "Clôturé"]),
      field("notes", "Observations", "longtext"),
    ],
  },
  contracts: {
    key: "contracts",
    label: "Contrat",
    plural: "Contrats",
    icon: "invoice",
    fields: [
      field("reference", "Référence", "text", true),
      field("family", "Famille", "text"),
      field("amount", "Montant (FCFA)", "number", true),
      field("status", "Statut", "status", true, ["Devis", "Signé", "Payé", "Annulé"]),
      field("signed_at", "Date de signature", "date"),
      field("notes", "Notes", "longtext"),
    ],
  },
  ceremonies: {
    key: "ceremonies",
    label: "Cérémonie",
    plural: "Cérémonies",
    icon: "calendar",
    fields: [
      field("title", "Intitulé", "text", true),
      field("location", "Lieu", "text"),
      field("scheduled_at", "Date", "date"),
      field("time", "Heure (HH:MM)", "text"),
      field("status", "Statut", "status", true, ["Planifiée", "Confirmée", "Terminée"]),
      field("notes", "Notes", "longtext"),
    ],
  },
  tasks: {
    key: "tasks",
    label: "Tâche",
    plural: "Tâches",
    icon: "task",
    fields: [
      field("title", "Intitulé", "text", true),
      field("assignee", "Assigné à", "text"),
      field("status", "Statut", "status", true, ["À faire", "En cours", "Bloqué", "Terminé"]),
      field("priority", "Priorité", "status", true, ["Basse", "Moyenne", "Haute", "Urgente"]),
      field("due_date", "Échéance", "date"),
      field("description", "Détails", "longtext"),
    ],
  },
  invoices: {
    key: "invoices",
    label: "Facture",
    plural: "Factures",
    icon: "invoice",
    fields: [
      field("reference", "Référence", "text", true),
      field("client", "Client", "text"),
      field("amount", "Montant (FCFA)", "number", true),
      field("status", "Statut", "status", true, ["Brouillon", "Envoyée", "Payée", "En retard"]),
      field("issued_date", "Date d'émission", "date"),
      field("due_date", "Échéance", "date"),
      field("notes", "Notes", "longtext"),
    ],
  },
  products: {
    key: "products",
    label: "Produit",
    plural: "Produits",
    icon: "box",
    fields: [
      field("name", "Désignation", "text", true),
      field("sku", "Référence / SKU", "text"),
      field("category", "Catégorie", "text"),
      field("quantity", "Quantité", "number"),
      field("price", "Prix unitaire (FCFA)", "number"),
      field("status", "État du stock", "status", true, ["En stock", "Stock faible", "Rupture"]),
    ],
  },
  orders: {
    key: "orders",
    label: "Commande",
    plural: "Commandes",
    icon: "cart",
    fields: [
      field("reference", "Référence", "text", true),
      field("client", "Client", "text"),
      field("amount", "Montant (FCFA)", "number"),
      field("status", "Statut", "status", true, ["Nouvelle", "En préparation", "Expédiée", "Livrée", "Annulée"]),
      field("ordered_at", "Date de commande", "date"),
      field("notes", "Notes", "longtext"),
    ],
  },
  appointments: {
    key: "appointments",
    label: "Rendez-vous",
    plural: "Rendez-vous",
    icon: "calendar",
    fields: [
      field("title", "Motif", "text", true),
      field("client", "Personne / client", "text"),
      field("scheduled_at", "Date", "date", true),
      field("time", "Heure (HH:MM)", "text"),
      field("status", "Statut", "status", true, ["Planifié", "Confirmé", "Terminé", "Annulé"]),
      field("notes", "Notes", "longtext"),
    ],
  },
  employees: {
    key: "employees",
    label: "Collaborateur",
    plural: "Collaborateurs",
    icon: "badge",
    fields: [
      field("name", "Nom complet", "text", true),
      field("role", "Poste", "text"),
      field("email", "E-mail", "text"),
      field("phone", "Téléphone", "text"),
      field("status", "Statut", "status", true, ["Actif", "En congé", "Inactif"]),
      field("hire_date", "Date d'arrivée", "date"),
    ],
  },
  expenses: {
    key: "expenses",
    label: "Dépense",
    plural: "Dépenses",
    icon: "wallet",
    fields: [
      field("title", "Libellé", "text", true),
      field("category", "Catégorie", "text"),
      field("amount", "Montant (FCFA)", "number", true),
      field("spent_at", "Date", "date"),
      field("status", "Statut", "status", true, ["À valider", "Validée", "Refusée", "Remboursée"]),
      field("notes", "Notes", "longtext"),
    ],
  },
  courses: {
    key: "courses",
    label: "Formation",
    plural: "Formations",
    icon: "school",
    fields: [
      field("title", "Titre", "text", true),
      field("trainer", "Formateur", "text"),
      field("start_date", "Date de début", "date"),
      field("seats", "Places disponibles", "number"),
      field("status", "Statut", "status", true, ["Ouverte", "Complète", "Archivée"]),
      field("description", "Programme", "longtext"),
    ],
  },
  patients: {
    key: "patients",
    label: "Patient",
    plural: "Patients",
    icon: "health",
    fields: [
      field("name", "Nom complet", "text", true),
      field("phone", "Téléphone", "text"),
      field("birth_date", "Date de naissance", "date"),
      field("status", "Suivi", "status", true, ["Actif", "En attente", "Archivé"]),
      field("notes", "Observations", "longtext"),
    ],
  },
  events: {
    key: "events",
    label: "Événement",
    plural: "Événements",
    icon: "event",
    fields: [
      field("title", "Titre", "text", true),
      field("location", "Lieu", "text"),
      field("starts_at", "Date", "date"),
      field("capacity", "Capacité", "number"),
      field("status", "Statut", "status", true, ["Brouillon", "Ouvert", "Complet", "Terminé"]),
      field("description", "Description", "longtext"),
    ],
  },
  tickets: {
    key: "tickets",
    label: "Ticket",
    plural: "Tickets",
    icon: "support",
    fields: [
      field("subject", "Sujet", "text", true),
      field("requester", "Demandeur", "text"),
      field("priority", "Priorité", "status", true, ["Basse", "Normale", "Haute", "Urgente"]),
      field("status", "Statut", "status", true, ["Ouvert", "En cours", "Résolu", "Fermé"]),
      field("description", "Description", "longtext"),
    ],
  },
  items: {
    key: "items",
    label: "Élément",
    plural: "Éléments",
    icon: "sparkles",
    fields: [
      field("name", "Nom", "text", true),
      field("description", "Description", "longtext"),
      field("status", "Statut", "status", true, ["À faire", "En cours", "Terminé"]),
      field("date", "Date", "date"),
      field("amount", "Valeur", "number"),
    ],
  },
} satisfies Record<string, EntitySeed>;

const BLUEPRINTS: Blueprint[] = [
  {
    id: "projects",
    keywords: ["projet", "project", "chantier", "mission", "kanban", "gestion de projet"],
    appName: "Kôloublé Projets",
    tagline: "Pilotez vos projets, vos clients et vos équipes, même sans connexion.",
    summary: "Un cockpit de gestion de projets avec suivi client, budgets et synchronisation cloud.",
    domain: "Gestion de projets",
    theme: GREEN,
    entities: [ENTITY_SEEDS.projects, ENTITY_SEEDS.clients],
  },
  {
    id: "crm",
    keywords: ["crm", "relation client", "portefeuille client", "prospection", "commercial"],
    appName: "Kôloublé CRM",
    tagline: "Toute votre relation client, structurée et toujours accessible.",
    summary: "Un CRM offline-first pour suivre prospects, clients et actions commerciales.",
    domain: "Relation client",
    theme: INDIGO,
    entities: [ENTITY_SEEDS.clients, ENTITY_SEEDS.tasks],
  },
  {
    id: "billing",
    keywords: ["facture", "invoice", "facturation", "devis", "paiement", "encaissement"],
    appName: "Kôloublé Facturation",
    tagline: "Facturez, encaissez et suivez vos règlements sans friction.",
    summary: "Une application de facturation avec suivi des statuts et synchronisation sécurisée.",
    domain: "Facturation",
    theme: AMBER,
    entities: [ENTITY_SEEDS.invoices, ENTITY_SEEDS.clients],
    extraFeatures: ["Suivi des paiements"],
  },
  {
    id: "tasks",
    keywords: ["tâche", "tache", "todo", "productivité", "productivite", "checklist", "organisation"],
    appName: "Kôloublé Tâches",
    tagline: "Capturez, priorisez, terminez. Vos tâches restent disponibles partout.",
    summary: "Un gestionnaire de tâches et de projets avec priorités et mode hors ligne.",
    domain: "Productivité",
    theme: INDIGO,
    entities: [ENTITY_SEEDS.tasks, ENTITY_SEEDS.projects],
  },
  {
    id: "inventory",
    keywords: ["stock", "inventaire", "produit", "article", "magasin", "entrepôt", "entrepot"],
    appName: "Kôloublé Stock",
    tagline: "Votre inventaire à jour, en boutique comme à l'entrepôt.",
    summary: "Une gestion de stock temps réel avec alertes de rupture et synchronisation cloud.",
    domain: "Gestion de stock",
    theme: AMBER,
    entities: [ENTITY_SEEDS.products, ENTITY_SEEDS.orders],
    extraFeatures: ["Alertes de stock"],
  },
  {
    id: "commerce",
    keywords: ["commande", "e-commerce", "ecommerce", "boutique", "vente", "livraison", "commerce"],
    appName: "Kôloublé Commerce",
    tagline: "Vos commandes, vos clients et votre catalogue réunis.",
    summary: "Une base e-commerce légère pour gérer commandes, produits et clients en mobilité.",
    domain: "Commerce",
    theme: CORAL,
    entities: [ENTITY_SEEDS.orders, ENTITY_SEEDS.products, ENTITY_SEEDS.clients],
  },
  {
    id: "scheduling",
    keywords: ["rendez-vous", "rendez vous", "réservation", "reservation", "agenda", "planning", "calendrier", "booking"],
    appName: "Kôloublé Agenda",
    tagline: "Un agenda clair, partagé et disponible même en déplacement.",
    summary: "Un planificateur de rendez-vous avec confirmation et historique client.",
    domain: "Planification",
    theme: INDIGO,
    entities: [ENTITY_SEEDS.appointments, ENTITY_SEEDS.clients],
    extraFeatures: ["Rappels de rendez-vous"],
  },
  {
    id: "hr",
    keywords: ["employé", "employe", "rh", "ressources humaines", "personnel", "collaborateur", "équipe", "equipe"],
    appName: "Kôloublé Équipe",
    tagline: "Votre équipe et ses informations, centralisées.",
    summary: "Un espace RH léger pour gérer collaborateurs, postes et disponibilités.",
    domain: "Ressources humaines",
    theme: GREEN,
    entities: [ENTITY_SEEDS.employees, ENTITY_SEEDS.tasks],
  },
  {
    id: "finance",
    keywords: ["dépense", "depense", "budget", "comptabilité", "comptabilite", "finance", "trésorerie", "tresorerie"],
    appName: "Kôloublé Finance",
    tagline: "Gardez la maîtrise de vos dépenses et de votre budget.",
    summary: "Un suivi budgétaire simple avec dépenses, justificatifs et validation.",
    domain: "Finance",
    theme: AMBER,
    entities: [ENTITY_SEEDS.expenses, ENTITY_SEEDS.invoices],
  },
  {
    id: "education",
    keywords: ["formation", "école", "ecole", "cours", "étudiant", "etudiant", "learning", "pédagogie", "pedagogie"],
    appName: "Kôloublé Formation",
    tagline: "Organisez vos formations et suivez vos participants.",
    summary: "Une plateforme de gestion de formations avec sessions et inscriptions.",
    domain: "Formation",
    theme: GREEN,
    entities: [ENTITY_SEEDS.courses, ENTITY_SEEDS.employees],
  },
  {
    id: "health",
    keywords: ["patient", "santé", "sante", "clinique", "cabinet", "médical", "medical", "pharmacie"],
    appName: "Kôloublé Santé",
    tagline: "Le suivi patient, simple et confidentiel, en ligne comme hors ligne.",
    summary: "Une application de suivi patient avec rendez-vous et dossiers sécurisés.",
    domain: "Santé",
    theme: CORAL,
    entities: [ENTITY_SEEDS.patients, ENTITY_SEEDS.appointments],
    extraFeatures: ["Dossiers confidentiels"],
  },
  {
    id: "events",
    keywords: ["événement", "evenement", "conférence", "conference", "séminaire", "seminaire", "festival", "billetterie"],
    appName: "Kôloublé Événements",
    tagline: "De l'idée à la dernière inscription, gérez votre événement.",
    summary: "Une gestion d'événements avec capacités, statuts et suivi des participants.",
    domain: "Événementiel",
    theme: CORAL,
    entities: [ENTITY_SEEDS.events, ENTITY_SEEDS.clients],
  },
  {
    id: "support",
    keywords: ["ticket", "support", "helpdesk", "incident", "sav", "service client"],
    appName: "Kôloublé Support",
    tagline: "Répondez vite, suivez tout, ne perdez plus un ticket.",
    summary: "Un centre de support offline-first avec priorités et historique client.",
    domain: "Support",
    theme: INDIGO,
    entities: [ENTITY_SEEDS.tickets, ENTITY_SEEDS.clients],
  },
  {
    id: "erp",
    keywords: ["erp", "gestion d'entreprise", "achats", "fournisseur", "approvisionnement", "logistique"],
    appName: "Kôloublé ERP",
    tagline: "Achats, fournisseurs et stocks pilotés depuis un seul cockpit.",
    summary: "Un ERP léger pour coordonner fournisseurs, achats, produits et dépenses.",
    domain: "ERP",
    theme: INDIGO,
    entities: [ENTITY_SEEDS.suppliers, ENTITY_SEEDS.purchases, ENTITY_SEEDS.products, ENTITY_SEEDS.expenses],
    extraFeatures: ["Suivi des achats"],
  },
  {
    id: "mairie",
    keywords: ["mairie", "commune", "municipalité", "municipalite", "état civil", "etat civil", "administré", "administre"],
    appName: "Kôloublé Mairie",
    tagline: "Les démarches de vos administrés, suivies de bout en bout.",
    summary: "Une application municipale pour les administrés, les demandes et les projets locaux.",
    domain: "Administration locale",
    theme: AMBER,
    entities: [ENTITY_SEEDS.citizens, ENTITY_SEEDS.requests, ENTITY_SEEDS.projects],
    extraFeatures: ["Suivi des démarches"],
  },
  {
    id: "association",
    keywords: ["association", "ong", "membre", "adhérent", "adherent", "bénévolat", "benevolat", "don"],
    appName: "Kôloublé Association",
    tagline: "Membres, dons et activités réunis dans un espace simple.",
    summary: "Une application associative pour gérer adhérents, dons et activités terrain.",
    domain: "Associations",
    theme: GREEN,
    entities: [ENTITY_SEEDS.members, ENTITY_SEEDS.donations, ENTITY_SEEDS.activities],
    extraFeatures: ["Suivi des cotisations"],
  },
  {
    id: "church",
    keywords: ["église", "eglise", "paroisse", "culte", "fidèle", "fidele", "communauté de foi", "communauté de foi"],
    appName: "Kôloublé Église",
    tagline: "Fidèles, offrandes et célébrations, organisés avec soin.",
    summary: "Une application paroissiale pour les membres, les dons et les célébrations.",
    domain: "Communautés de foi",
    theme: INDIGO,
    entities: [ENTITY_SEEDS.members, ENTITY_SEEDS.donations, ENTITY_SEEDS.events],
    extraFeatures: ["Suivi des offrandes"],
  },
  {
    id: "community",
    keywords: ["collectivité", "collectivite", "région", "region", "département", "departement", "territoire", "conseil"],
    appName: "Kôloublé Collectivité",
    tagline: "Votre territoire, ses projets et ses demandes, enfin reliés.",
    summary: "Une plateforme territoriale pour les projets, les administrés et les demandes.",
    domain: "Collectivités",
    theme: GREEN,
    entities: [ENTITY_SEEDS.projects, ENTITY_SEEDS.requests, ENTITY_SEEDS.citizens],
    extraFeatures: ["Suivi territorial"],
  },
  {
    id: "funeral",
    keywords: ["funéraire", "funeraire", "pompes funèbres", "pompes funebres", "obsèques", "obseques", "défunt", "defunt", "cérémonie"],
    appName: "Kôloublé Funéraire",
    tagline: "Accompagnez les familles avec dignité et organisation.",
    summary: "Une application funéraire pour les défunts, les contrats et les cérémonies.",
    domain: "Services funéraires",
    theme: CORAL,
    entities: [ENTITY_SEEDS.deceased, ENTITY_SEEDS.contracts, ENTITY_SEEDS.ceremonies],
    extraFeatures: ["Suivi des cérémonies"],
  },
];

const GENERIC_BLUEPRINT: Blueprint = {
  id: "custom",
  keywords: [],
  appName: "Kôloublé Studio",
  tagline: "Votre application sur mesure, hors ligne et synchronisée.",
  summary: "Une application Flutter complète générée à partir de votre besoin métier.",
  domain: "Sur mesure",
  theme: GREEN,
  entities: [ENTITY_SEEDS.items],
};

function normalize(input: string): string {
  return stripAccents(input.toLowerCase());
}

function toEntitySpec(seed: EntitySeed): EntitySpec {
  return {
    key: seed.key,
    label: seed.label,
    plural: seed.plural,
    labelPlural: seed.plural,
    icon: seed.icon,
    fields: seed.fields.map((item) => ({
      key: item.key,
      dartName: camelCase(item.key),
      label: item.label,
      type: item.type,
      required: Boolean(item.required),
      options: item.options,
    })),
  };
}

function extractRequestedName(prompt: string): string | null {
  const patterns = [
    /(?:nomm[ée]e?|appel[ée]e?)\s+["«“']([^"»”']{2,48})["»”']/i,
    /["«“]([A-ZÀ-Ý][^"»”]{2,40})["»”]\s+(?:comme|pour)\s+nom/i,
  ];
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match?.[1]) {
      const cleaned = match[1].trim().replace(/\s+/g, " ");
      if (cleaned.length >= 2) return cleaned;
    }
  }
  return null;
}

function sanitizeAppName(input: string): string {
  const cleaned = input
    .replace(/[^A-Za-zÀ-ÿ0-9'’ \-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return truncate(cleaned || "Kôloublé App", 48);
}

export const TEMPLATE_KEYS = [...BLUEPRINTS.map((blueprint) => blueprint.id), GENERIC_BLUEPRINT.id] as const;

export function isTemplateKey(value: unknown): value is (typeof TEMPLATE_KEYS)[number] {
  return typeof value === "string" && (TEMPLATE_KEYS as readonly string[]).includes(value);
}

export interface ParsePromptOptions {
  templateKey?: string | null;
  saas?: boolean;
}

const BILLING_PLANS: BillingSpec["plans"] = [
  {
    key: "starter",
    label: "Découverte",
    price: 0,
    interval: "month",
    features: ["1 espace de travail", "Utilisateurs illimités en lecture", "Support communautaire"],
  },
  {
    key: "pro",
    label: "Pro",
    price: 15_000,
    interval: "month",
    features: ["5 espaces de travail", "Rôles et permissions", "Paiements mobile money"],
  },
  {
    key: "business",
    label: "Entreprise",
    price: 45_000,
    interval: "month",
    features: ["Espaces illimités", "Facturation Stripe", "Rapports et exports"],
  },
];

const DEFAULT_PAYMENT_PROVIDERS: BillingSpec["providers"] = [
  "stripe",
  "orange-money",
  "mtn-money",
  "wave",
  "moov-money",
];

export function parsePrompt(
  prompt: string,
  nameOverride?: string | null,
  options: ParsePromptOptions = {},
): AppSpec {
  const normalizedPrompt = normalize(prompt);
  const scored = BLUEPRINTS.map((blueprint, index) => {
    let score = 0;
    for (const keyword of blueprint.keywords) {
      if (normalizedPrompt.includes(normalize(keyword))) score += keyword.includes(" ") ? 2 : 1;
    }
    return { blueprint, score, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index);

  const selectedTemplate = isTemplateKey(options.templateKey)
    ? BLUEPRINTS.find((blueprint) => blueprint.id === options.templateKey)
    : undefined;
  const primary = selectedTemplate ?? (scored[0] && scored[0].score > 0 ? scored[0].blueprint : GENERIC_BLUEPRINT);
  const matched = selectedTemplate ? [] : scored.filter((item) => item.score > 0).map((item) => item.blueprint);

  const entityMap = new Map<string, EntitySeed>();
  for (const blueprint of [primary, ...matched]) {
    for (const entity of blueprint.entities) {
      if (!entityMap.has(entity.key)) entityMap.set(entity.key, entity);
      if (entityMap.size >= 4) break;
    }
    if (entityMap.size >= 4) break;
  }
  if (entityMap.size === 0) {
    for (const entity of GENERIC_BLUEPRINT.entities) entityMap.set(entity.key, entity);
  }

  const entities = Array.from(entityMap.values()).map(toEntitySpec);
  const appName = sanitizeAppName(
    nameOverride?.trim() ||
      (selectedTemplate ? primary.appName : extractRequestedName(prompt) || primary.appName),
  );
  const primaryColor = primary.theme.primary;
  const packageName = packageNameFor(appName);
  const saas = Boolean(options.saas);

  const features = new Set<string>([
    "Authentification e-mail + Google + Facebook",
    "Tableau de bord",
    "Mode hors ligne (Hive)",
    "Synchronisation cloud automatique",
    "Web · Android · iOS · Windows",
  ]);
  if (/notification|alerte|rappel/.test(normalizedPrompt)) features.add("Notifications");
  if (/statistique|rapport|kpi|analytique|dashboard/.test(normalizedPrompt)) features.add("Indicateurs & rapports");
  if (/pdf|document|factur/.test(normalizedPrompt)) features.add("Export documentaire");
  if (/recherche|filtre/.test(normalizedPrompt)) features.add("Recherche & filtres");
  if (/admin|rôle|role|permission/.test(normalizedPrompt)) features.add("Rôles & permissions");
  if (saas) {
    features.add("Multi-tenant & abonnements");
    features.add("Paiements Stripe & mobile money");
  }
  for (const feature of primary.extraFeatures ?? []) features.add(feature);

  const platformFeatures = ["Web", "Android", "iOS", "Windows"].filter((platform) =>
    normalizedPrompt.includes(platform.toLowerCase()) || true,
  );

  const copy: AppCopySpec = {
    welcomeTitle: `${primary.domain}, sans friction.`,
    welcomeMessage: `Retrouvez vos ${entities.map((entity) => entity.plural.toLowerCase()).join(" et ")} dans un espace unique, même sans connexion.`,
    emptyState: `Aucun élément pour le moment. Créez votre premier ${entities[0]?.label.toLowerCase() ?? "élément"} pour commencer.`,
    syncMessage: "Vos données sont enregistrées localement puis synchronisées automatiquement.",
  };

  return {
    appName,
    packageName,
    tagline: primary.tagline,
    summary: primary.summary,
    domain: primary.domain,
    entities,
    platforms: platformFeatures.length === 4 ? platformFeatures : ["Web", "Android", "iOS", "Windows"],
    features: Array.from(features).slice(0, 9),
    theme: { ...primary.theme, primary: primaryColor },
    auth: { email: true, google: true, facebook: true },
    offline: true,
    copy,
    deployment: { target: "vercel", repoName: repoNameFor(packageName), customDomain: null },
    templateKey: primary.id,
    saas,
    billing: {
      enabled: saas,
      currency: "FCFA",
      plans: BILLING_PLANS,
      providers: [...DEFAULT_PAYMENT_PROVIDERS],
    },
    aiGenerated: false,
  };
}

export const aiArchitectSchema = z.object({
  appName: z.string().trim().min(2).max(48).optional(),
  tagline: z.string().trim().min(8).max(160).optional(),
  summary: z.string().trim().min(10).max(400).optional(),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  copy: z
    .object({
      welcomeTitle: z.string().trim().min(3).max(80),
      welcomeMessage: z.string().trim().min(10).max(220),
      emptyState: z.string().trim().min(5).max(180),
      syncMessage: z.string().trim().min(5).max(160),
    })
    .partial()
    .optional(),
});

export type AiArchitectPayload = z.infer<typeof aiArchitectSchema>;

export function mergeAiEnhancements(spec: AppSpec, payload: AiArchitectPayload | null): AppSpec {
  if (!payload) return spec;
  const appName = payload.appName ? sanitizeAppName(payload.appName) : spec.appName;
  const packageName = packageNameFor(appName);
  const previousDefaultRepo = repoNameFor(spec.packageName);
  const deployment = spec.deployment
    ? {
        ...spec.deployment,
        repoName:
          spec.deployment.repoName === previousDefaultRepo
            ? repoNameFor(packageName)
            : repoNameFor(spec.deployment.repoName),
      }
    : undefined;
  return {
    ...spec,
    appName,
    packageName,
    tagline: payload.tagline ?? spec.tagline,
    summary: payload.summary ?? spec.summary,
    theme: {
      ...spec.theme,
      primary: payload.primaryColor?.toUpperCase() ?? spec.theme.primary,
    },
    copy: {
      welcomeTitle: payload.copy?.welcomeTitle ?? spec.copy.welcomeTitle,
      welcomeMessage: payload.copy?.welcomeMessage ?? spec.copy.welcomeMessage,
      emptyState: payload.copy?.emptyState ?? spec.copy.emptyState,
      syncMessage: payload.copy?.syncMessage ?? spec.copy.syncMessage,
    },
    deployment,
    aiGenerated: Boolean(payload.appName || payload.tagline || payload.summary || payload.copy || payload.primaryColor),
  };
}

export function primaryField(entity: EntitySpec): FieldSpec {
  return (
    entity.fields.find((item) => item.type === "text" && item.required) ??
    entity.fields.find((item) => item.type === "text") ??
    entity.fields[0]!
  );
}

export function subtitleFields(entity: EntitySpec): FieldSpec[] {
  const primary = primaryField(entity);
  return entity.fields
    .filter((item) => item.key !== primary.key && ["status", "text", "date", "number", "boolean"].includes(item.type))
    .slice(0, 3);
}

const SAMPLE_NAMES: Record<string, string[]> = {
  projects: ["Refonte site Abidjan", "Déploiement terrain Bouaké", "Programme jeunesse 2026"],
  clients: ["OBC Action Terrain", "Atelier Kossi", "Maison N'Guessan"],
  tasks: ["Valider le planning terrain", "Préparer la réunion équipe", "Mettre à jour le budget"],
  invoices: ["FAC-2026-001", "FAC-2026-002", "FAC-2026-003"],
  products: ["Kit formation terrain", "Badge participant", "Manuel facilitateur"],
  orders: ["CMD-1042", "CMD-1043", "CMD-1044"],
  appointments: ["Point équipe hebdomadaire", "Visite partenaire", "Suivi terrain"],
  employees: ["Aminata Koné", "Yao Kouassi", "Fatou Diallo"],
  expenses: ["Carburant mission", "Fournitures atelier", "Hébergement formateur"],
  courses: ["Facilitation communautaire", "Gestion de projet terrain", "Numérique responsable"],
  patients: ["Adjoua B.", "Koffi A.", "Mariam T."],
  events: ["Forum des partenaires", "Atelier terrain", "Assemblée générale"],
  tickets: ["Accès à mon espace", "Synchronisation bloquée", "Demande de formation"],
  suppliers: ["Grossiste Abidjan", "Fournitures du Plateau", "Transport Bouaké"],
  purchases: ["ACH-2026-001", "ACH-2026-002", "ACH-2026-003"],
  members: ["Aminata Koné", "Yao Kouassi", "Fatou Diallo"],
  donations: ["Don anonyme", "Entreprise partenaire", "Collecte terrain"],
  activities: ["Journée de sensibilisation", "Atelier communautaire", "Assemblée générale"],
  requests: ["Demande de terrain", "Attestation de résidence", "Autorisation événement"],
  citizens: ["Adjoua B.", "Koffi A.", "Mariam T."],
  deceased: ["Feu Kossi A.", "Feue Adjoua B.", "Feu N'Guessan C."],
  contracts: ["CTR-2026-001", "CTR-2026-002", "CTR-2026-003"],
  ceremonies: ["Veillée d'Abidjan", "Cérémonie de Bouaké", "Hommage familial"],
  items: ["Premier élément", "Deuxième élément", "Troisième élément"],
};

export function sampleValue(entity: EntitySpec, fieldSpec: FieldSpec, index: number): string | number | boolean {
  if (fieldSpec.type === "status") {
    return fieldSpec.options?.[index % (fieldSpec.options.length || 1)] ?? "Actif";
  }
  if (fieldSpec.type === "number") {
    const base = [125000, 45000, 320000][index % 3]!;
    return base;
  }
  if (fieldSpec.type === "date") {
    return ["2026-11-04", "2026-11-18", "2026-12-02"][index % 3]!;
  }
  if (fieldSpec.type === "boolean") return index % 2 === 0;
  if (/e-?mail/.test(fieldSpec.key) || /e-?mail/i.test(fieldSpec.label)) {
    return ["contact@exemple.ci", "projet@exemple.ci", "equipe@exemple.ci"][index % 3]!;
  }
  if (/phone|téléphone|telephone/i.test(fieldSpec.key) || /téléphone/i.test(fieldSpec.label)) {
    return ["+225 07 00 00 01", "+225 07 00 00 02", "+225 07 00 00 03"][index % 3]!;
  }
  if (fieldSpec.key === primaryField(entity).key) {
    const names = SAMPLE_NAMES[entity.key] ?? SAMPLE_NAMES.items!;
    return names[index % names.length]!;
  }
  if (fieldSpec.type === "longtext") {
    return ["Suivi et coordination avec l'équipe.", "Données de démonstration générées par Kôloublé IA.", "Priorité terrain, échéance à confirmer."][index % 3]!;
  }
  return ["Abidjan", "En cours", "Terrain"][index % 3]!;
}

export function sampleRows(entity: EntitySpec, count = 3): Record<string, string | number | boolean>[] {
  return Array.from({ length: count }, (_, index) => {
    const row: Record<string, string | number | boolean> = { id: `${entity.key}-${index + 1}` };
    for (const fieldSpec of entity.fields) {
      row[fieldSpec.key] = sampleValue(entity, fieldSpec, index);
    }
    return row;
  });
}

export function entityByKey(spec: AppSpec, key: string): EntitySpec | undefined {
  return spec.entities.find((entity) => entity.key === key);
}

export function specRoute(entity: EntitySpec): string {
  return `/${entity.key}`;
}

export function normalizeEntityKey(input: string): string {
  return snakeCase(input);
}
