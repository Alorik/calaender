import type { CalEvent, CaseInfo, Person, Task } from "./types";
import { addDays, toDateStr } from "./dates";

/** You: the signed-in user. */
export const ME = "hs";

/** The firm's people and their calendar colours (Figma "Team calendar row" / "Calendar avatar"). */
export const PEOPLE: Person[] = [
  { id: "hs", name: "Harvey Specter", initials: "HS", role: "Lead attorney", color: "#17a34a", avatarBg: "#daf0e2", eventBg: "#ecfef3", stripe: "#7fbe96", busy: "#97d6ae" },
  { id: "mr", name: "Megan Rose", initials: "MR", role: "Paralegal", color: "#356dff", avatarBg: "#dfe8ff", eventBg: "#e1e9ff", stripe: "#356dff", busy: "#a9c1ff" },
  { id: "cb", name: "Chandler Bing", initials: "CB", role: "Senior attorney", color: "#0891b2", avatarBg: "#d7edf3", eventBg: "#daeef3", stripe: "#0891b2", busy: "#90cddc" },
  { id: "sk", name: "Sage Khanuja", initials: "SK", role: "Case manager", color: "#d97706", avatarBg: "#f9e9d7", eventBg: "#fbefdf", stripe: "#d97706", busy: "#f1c48a" },
  { id: "ts", name: "Tony Start", initials: "TS", role: "Associate attorney", color: "#7c3aed", avatarBg: "#eadffc", eventBg: "#efe6fd", stripe: "#7c3aed", busy: "#c9adf7" },
  { id: "jr", name: "Jordan Reyes", initials: "JR", role: "Intake specialist", color: "#db2777", avatarBg: "#f9dce9", eventBg: "#fbe5ef", stripe: "#db2777", busy: "#f0a6c8" },
  { id: "mg", name: "Maloni Groud", initials: "MG", role: "Billing", color: "#64748b", avatarBg: "#e6e9ec", eventBg: "#eceef1", stripe: "#64748b", busy: "#b6bfcb" },
];

export const personById = (id?: string) => PEOPLE.find((person) => person.id === id);

/** Deadline style (SOL deadline in Figma). */
export const DEADLINE_STYLE = { bg: "#fddedf", stripe: "#f5484d", color: "#f5484d" };

export const CASES: CaseInfo[] = [
  { id: "martinez", name: "Martinez v. Rose", fullName: "Bezty Martinez v. Rachel Rose", meta: "PI-2026-0418 · Auto Accident · Litigation" },
  { id: "goriness", name: "Goriness v. Hartley", fullName: "Micheal Goriness v. Dana Hartley", meta: "PI-2026-0377 · Slip and Fall · Pre-litigation" },
  { id: "statham", name: "Statham v. Coastal Freight", fullName: "James Statham v. Coastal Freight LLC", meta: "PI-2026-0291 · Truck Accident · Litigation" },
  { id: "whitfield", name: "Whitfield v. Price", fullName: "Aaron Whitfield v. Lena Price", meta: "PI-2025-1180 · Auto Accident · Pre-litigation" },
  { id: "wall", name: "Wall v. Lakeland Transit", fullName: "Nora Wall v. Lakeland Transit Authority", meta: "PI-2026-0512 · Bus Accident · Negotiation" },
];

export const caseById = (id?: string) => CASES.find((item) => item.id === id);

export const TASKS: Task[] = [
  { id: "t1", caseId: "martinez", title: "Draft a demand letter for American Family Connect" },
  { id: "t2", caseId: "martinez", title: "Request MRI report from Valley Imaging" },
  { id: "t3", caseId: "martinez", title: "Prepare client for deposition" },
  { id: "t4", caseId: "goriness", title: "Collect incident photos from the store" },
  { id: "t5", caseId: "statham", title: "Schedule expert witness review" },
  { id: "t6", caseId: "whitfield", title: "File complaint before the SOL" },
  { id: "t7", caseId: "wall", title: "Negotiate the hospital lien" },
];

let counter = 0;
export const newId = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

/** A firm week like the Figma one (Oct 18–24), placed in the current week. */
export function sampleEvents(today = new Date()): CalEvent[] {
  const sunday = addDays(new Date(today.getFullYear(), today.getMonth(), today.getDate()), -today.getDay());
  const d = (offset: number) => toDateStr(addDays(sunday, offset));
  const at = (offset: number, time: string) => `${d(offset)}T${time}`;
  const base = { guests: [], reminder: 10, visibility: "firm" as const, repeat: "none" as const };
  const yes = (personId: string) => ({ personId, rsvp: "yes" as const });

  const events: CalEvent[] = [
    // Stand-up every weekday at 9:00.
    { ...base, id: "standup", title: "Team stand-up", start: at(1, "09:00"), end: at(1, "09:30"), allDay: false, ownerId: "hs", repeat: "weekdays", guests: [yes("mr"), yes("cb")], videoLink: "meet.alphalaw.com/hs-standup-1001" },
    { ...base, id: "e1", title: "Deposition prep: Rachel Rose", start: at(1, "10:00"), end: at(1, "11:30"), allDay: false, ownerId: "hs", caseId: "martinez", taskId: "t3", location: "Conference room B" },
    { ...base, id: "e2", title: "Records request follow-up", start: at(1, "13:00"), end: at(1, "14:00"), allDay: false, ownerId: "mr", caseId: "martinez", taskId: "t2" },
    { ...base, id: "e3", title: "Case strategy review", start: at(1, "15:30"), end: at(1, "16:30"), allDay: false, ownerId: "cb", caseId: "goriness" },
    { ...base, id: "e4", title: "Client call: Bezty Martinez", start: at(2, "11:00"), end: at(2, "12:00"), allDay: false, ownerId: "hs", caseId: "martinez", videoLink: "meet.alphalaw.com/hs-client-3311" },
    { ...base, id: "e5", title: "Lunch with the Hartley team", start: at(2, "12:30"), end: at(2, "13:30"), allDay: false, ownerId: "mr", visibility: "private" },
    { ...base, id: "e6", title: "Intake review: new PI leads", start: at(2, "15:00"), end: at(2, "16:00"), allDay: false, ownerId: "cb" },
    { ...base, id: "e7", title: "SOL deadline: Whitfield v. Price", start: d(3), end: d(4), allDay: true, ownerId: "hs", caseId: "whitfield", taskId: "t6", kind: "deadline", reminder: 1440 },
    { ...base, id: "e8", title: "Deposition: Rachel Rose", start: at(3, "09:30"), end: at(3, "12:30"), allDay: false, ownerId: "hs", caseId: "martinez", location: "Court reporter office, 2nd floor", guests: [yes("mr")] },
    { ...base, id: "e9", title: "Medical records QC", start: at(3, "10:00"), end: at(3, "11:00"), allDay: false, ownerId: "mr", caseId: "martinez" },
    { ...base, id: "e10", title: "Demand letter review", start: at(3, "14:00"), end: at(3, "15:00"), allDay: false, ownerId: "hs", caseId: "martinez", taskId: "t1" },
    { ...base, id: "e11", title: "Expert witness call", start: at(3, "16:00"), end: at(3, "17:00"), allDay: false, ownerId: "cb", caseId: "statham", taskId: "t5" },
    { ...base, id: "e12", title: "Mediation strategy", start: at(4, "10:00"), end: at(4, "11:00"), allDay: false, ownerId: "cb", caseId: "statham" },
    { ...base, id: "e13", title: "Lien negotiation call", start: at(4, "13:30"), end: at(4, "14:30"), allDay: false, ownerId: "mr", caseId: "wall", taskId: "t7" },
    { ...base, id: "e14", title: "Partner sync", start: at(4, "16:00"), end: at(4, "17:00"), allDay: false, ownerId: "hs" },
    { ...base, id: "e15", title: "Medical records due · Martinez", start: d(5), end: d(6), allDay: true, ownerId: "mr", caseId: "martinez" },
    {
      ...base,
      id: "e16",
      title: "Adjuster call: American Family Connect",
      start: at(5, "10:00"),
      end: at(5, "11:00"),
      allDay: false,
      ownerId: "hs",
      caseId: "martinez",
      taskId: "t1",
      videoLink: "meet.alphalaw.com/hs-adj-2210",
      guests: [yes("mr"), { name: "Rachel Kim", role: "Adjuster · American Family Connect", rsvp: "pending" }],
      description: "Confirm the treatment gap explanation and which medical bills are still outstanding before the demand letter goes out.",
    },
    { ...base, id: "e17", title: "Lunch & learn: E-discovery", start: at(5, "12:00"), end: at(5, "13:00"), allDay: false, ownerId: "cb" },
    {
      ...base,
      id: "e18",
      title: "Settlement conference prep",
      start: at(5, "15:00"),
      end: at(5, "16:00"),
      allDay: false,
      ownerId: "cb",
      caseId: "martinez",
      location: "Mediation room, 4th floor",
      guests: [yes("mr"), { personId: "hs", rsvp: "pending" }],
      description: "Agree our settlement range and walk through the damages summary before Monday’s conference.",
    },
  ];
  return events;
}
