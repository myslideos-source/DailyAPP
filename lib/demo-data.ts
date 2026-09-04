import { addDays, format, subDays } from "date-fns";
import type {
  CalendarEvent,
  CategoryMeta,
  Profile,
  SavingsEntry,
  SavingsGoal,
  TaskItem,
} from "./types";

export const PROFILES: Record<"domenico" | "elisabeth", Profile> = {
  domenico: {
    id: "domenico",
    name: "Domenico",
    initial: "D",
    color: "#63D8F4",
    avatarColorVar: "domenico",
  },
  elisabeth: {
    id: "elisabeth",
    name: "Elisabeth",
    initial: "E",
    color: "#EA82B7",
    avatarColorVar: "elisabeth",
  },
};

export const CATEGORIES: CategoryMeta[] = [
  { id: "familie", label: "Familie", icon: "Users" },
  { id: "hausbau", label: "Hausbau", icon: "Home" },
  { id: "kinder", label: "Kinder", icon: "Baby" },
  { id: "arbeit", label: "Arbeit", icon: "Briefcase" },
  { id: "einkauf", label: "Einkauf", icon: "ShoppingBasket" },
  { id: "freizeit", label: "Freizeit", icon: "Sparkles" },
  { id: "geburtstag", label: "Geburtstag", icon: "Cake" },
  { id: "gesundheit", label: "Gesundheit", icon: "HeartPulse" },
  { id: "sonstiges", label: "Sonstiges", icon: "CircleDot" },
];

const iso = (d: Date) => format(d, "yyyy-MM-dd");

function seedEvents(): CalendarEvent[] {
  const today = new Date();
  const t = (offset: number) => iso(addDays(today, offset));
  const now = new Date().toISOString();

  const events: Omit<CalendarEvent, "createdAt" | "updatedAt">[] = [
    {
      id: "evt-bemusterung",
      title: "Bemusterung Haus",
      date: t(0),
      startTime: "09:00",
      endTime: "10:30",
      allDay: false,
      assignee: "gemeinsam",
      category: "hausbau",
      location: "Musterhauszentrum",
      notes: "Fliesen und Armaturen final abstimmen.",
      recurrence: "none",
    },
    {
      id: "evt-mia",
      title: "Mias Termin",
      date: t(0),
      startTime: "14:30",
      endTime: "15:15",
      allDay: false,
      assignee: "elisabeth",
      category: "kinder",
      location: "Crailsheim",
      recurrence: "none",
    },
    {
      id: "evt-einkaufen",
      title: "Einkaufen",
      date: t(0),
      startTime: "18:00",
      endTime: "18:45",
      allDay: false,
      assignee: "domenico",
      category: "einkauf",
      recurrence: "none",
    },
    {
      id: "evt-zeit-fuer-uns",
      title: "Zeit für uns",
      date: t(0),
      startTime: "19:15",
      endTime: "22:00",
      allDay: false,
      assignee: "gemeinsam",
      category: "freizeit",
      notes: "Der Abend gehört euch.",
      recurrence: "none",
    },
    {
      id: "evt-tiefbauer",
      title: "Tiefbauer anrufen",
      date: t(1),
      startTime: "08:30",
      endTime: "08:45",
      allDay: false,
      assignee: "domenico",
      category: "hausbau",
      recurrence: "none",
    },
    {
      id: "evt-teammeeting",
      title: "Teammeeting",
      date: t(1),
      startTime: "10:00",
      endTime: "11:00",
      allDay: false,
      assignee: "elisabeth",
      category: "arbeit",
      recurrence: "weekly",
    },
    {
      id: "evt-zahnarzt",
      title: "Zahnarzt Kontrolle",
      date: t(2),
      startTime: "16:00",
      endTime: "16:30",
      allDay: false,
      assignee: "domenico",
      category: "gesundheit",
      location: "Praxis Dr. Berger",
      recurrence: "none",
    },
    {
      id: "evt-geburtstag-mama",
      title: "Geburtstag Mama",
      date: t(4),
      startTime: null,
      endTime: null,
      allDay: true,
      assignee: "gemeinsam",
      category: "geburtstag",
      recurrence: "yearly",
    },
    {
      id: "evt-fliesenleger",
      title: "Fliesenleger Angebot",
      date: t(3),
      startTime: "11:00",
      endTime: "11:30",
      allDay: false,
      assignee: "gemeinsam",
      category: "hausbau",
      recurrence: "none",
    },
    {
      id: "evt-wanderung",
      title: "Wanderung Limpurger Berge",
      date: t(6),
      startTime: "10:00",
      endTime: "13:00",
      allDay: false,
      assignee: "gemeinsam",
      category: "freizeit",
      location: "Limpurger Berge",
      recurrence: "none",
    },
    {
      id: "evt-elternabend",
      title: "Elternabend",
      date: t(8),
      startTime: "19:00",
      endTime: "20:30",
      allDay: false,
      assignee: "elisabeth",
      category: "kinder",
      recurrence: "none",
    },
    {
      id: "evt-yoga",
      title: "Yoga",
      date: t(-1),
      startTime: "07:00",
      endTime: "07:45",
      allDay: false,
      assignee: "elisabeth",
      category: "gesundheit",
      recurrence: "weekly",
    },
    {
      id: "evt-notar",
      title: "Notartermin Grundstück",
      date: t(12),
      startTime: "13:00",
      endTime: "14:00",
      allDay: false,
      assignee: "gemeinsam",
      category: "hausbau",
      location: "Notariat Crailsheim",
      recurrence: "none",
    },
  ];

  return events.map((e) => ({ ...e, createdAt: now, updatedAt: now }));
}

function seedTasks(): TaskItem[] {
  const today = new Date();
  const t = (offset: number) => iso(addDays(today, offset));
  const now = new Date().toISOString();

  const tasks: Omit<TaskItem, "createdAt" | "updatedAt">[] = [
    {
      id: "task-tiefbauer",
      title: "Tiefbauer wegen Termin anrufen",
      assignee: "domenico",
      dueDate: t(1),
      priority: "high",
      done: false,
      recurrence: "none",
      isShopping: false,
      linkedEventId: "evt-tiefbauer",
      subtasks: [],
    },
    {
      id: "task-fliesen",
      title: "Fliesenmuster vergleichen",
      assignee: "gemeinsam",
      dueDate: t(0),
      priority: "medium",
      done: false,
      recurrence: "none",
      isShopping: false,
      subtasks: [
        { id: "sub-1", title: "Bad OG", done: true },
        { id: "sub-2", title: "Küche", done: false },
      ],
    },
    {
      id: "task-versicherung",
      title: "Bauversicherung vergleichen",
      assignee: "elisabeth",
      dueDate: t(3),
      priority: "medium",
      done: false,
      recurrence: "none",
      isShopping: false,
      subtasks: [],
    },
    {
      id: "task-milch",
      title: "Milch",
      assignee: "domenico",
      dueDate: t(0),
      priority: "low",
      done: false,
      recurrence: "none",
      isShopping: true,
      subtasks: [],
    },
    {
      id: "task-obst",
      title: "Obst und Gemüse",
      assignee: "domenico",
      dueDate: t(0),
      priority: "low",
      done: false,
      recurrence: "none",
      isShopping: true,
      subtasks: [],
    },
    {
      id: "task-spuelmittel",
      title: "Spülmittel",
      assignee: "gemeinsam",
      dueDate: t(0),
      priority: "low",
      done: true,
      doneAt: now,
      recurrence: "none",
      isShopping: true,
      subtasks: [],
    },
    {
      id: "task-mistkuebel",
      title: "Mülltonne rausstellen",
      assignee: "domenico",
      dueDate: t(0),
      priority: "medium",
      done: false,
      recurrence: "weekly",
      isShopping: false,
      subtasks: [],
    },
    {
      id: "task-mia-geschenk",
      title: "Geschenk für Mia besorgen",
      assignee: "elisabeth",
      dueDate: t(5),
      priority: "medium",
      done: false,
      recurrence: "none",
      isShopping: false,
      subtasks: [],
    },
    {
      id: "task-steuererklaerung",
      title: "Unterlagen Steuererklärung sortieren",
      assignee: "gemeinsam",
      dueDate: t(-2),
      priority: "high",
      done: false,
      recurrence: "none",
      isShopping: false,
      subtasks: [],
    },
    {
      id: "task-hollyx",
      title: "Tierarzttermin vereinbaren",
      assignee: "elisabeth",
      dueDate: null,
      priority: "low",
      done: false,
      recurrence: "none",
      isShopping: false,
      subtasks: [],
    },
  ];

  return tasks.map((tk) => ({ ...tk, createdAt: now, updatedAt: now }));
}

function seedSavingsGoals(): SavingsGoal[] {
  const now = new Date().toISOString();
  return [
    { id: "goal-haus", title: "Haus", targetAmount: 25000, color: "together", createdAt: now },
    { id: "goal-urlaub", title: "Urlaub", targetAmount: 3000, color: "together", createdAt: now },
    { id: "goal-anschaffungen", title: "Anschaffungen", targetAmount: 1500, color: "domenico", createdAt: now },
  ];
}

function seedSavingsEntries(): SavingsEntry[] {
  const today = new Date();
  const t = (offset: number) => new Date(subDays(today, offset)).toISOString();
  return [
    { id: "se-1", goalId: "goal-haus", amount: 800, contributor: "domenico", note: "Gehalt August", createdAt: t(35) },
    { id: "se-2", goalId: "goal-haus", amount: 800, contributor: "elisabeth", note: "Gehalt August", createdAt: t(35) },
    { id: "se-3", goalId: "goal-haus", amount: 1200, contributor: "gemeinsam", note: "Rückzahlung Finanzamt", createdAt: t(20) },
    { id: "se-4", goalId: "goal-haus", amount: 850, contributor: "domenico", note: "Gehalt September", createdAt: t(5) },
    { id: "se-5", goalId: "goal-urlaub", amount: 150, contributor: "elisabeth", createdAt: t(28) },
    { id: "se-6", goalId: "goal-urlaub", amount: 150, contributor: "domenico", createdAt: t(14) },
    { id: "se-7", goalId: "goal-anschaffungen", amount: 220, contributor: "domenico", note: "Werkzeug verkauft", createdAt: t(10) },
  ];
}

export function createDemoDataset() {
  return {
    events: seedEvents(),
    tasks: seedTasks(),
    savingsGoals: seedSavingsGoals(),
    savingsEntries: seedSavingsEntries(),
  };
}

export const DEMO_NOTIFICATIONS = [
  {
    id: "n-1",
    title: "Termin morgen",
    body: "Tiefbauer anrufen um 08:30",
    read: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "n-2",
    title: "Aufgabe fällig",
    body: "Unterlagen Steuererklärung sortieren ist überfällig",
    read: false,
    createdAt: new Date().toISOString(),
  },
];
