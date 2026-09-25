// Content for the Help & Docs page. Edit this file to update the page; the
// component only lays it out.
//
// Describe what the app does TODAY, not what is planned. The role → screen
// matrix is being reworked (#236); when that lands, update ROLES and
// ROLE_GRID to match. Grid access is taken from `access` in AppRoutes.jsx
// plus the Sidebar's `adminOnly` groups — note the route guard in App.jsx
// only checks sign-in, so the grid describes what each role sees in the menu.

export const HELP_UPDATED = "September 2026";


// The page's accordion sections, in order. `kind` picks the layout:
//   "roles" - the role cards and quick reference grid below
//   "video" - an embedded YouTube video; `videoId` is the part after youtu.be/
// `id` is also the link anchor, so /help#user-manager opens that section.
export const HELP_SECTIONS = [
    {
        id: "roles",
        title: "What are the user roles and permissions?",
        kind: "roles"
    },
    {
        id: "print-patrol-qr-codes",
        title: "Where to find and print the patrol QR codes",
        kind: "video",
        videoId: "aoq9d6dwpxQ"
    },
    {
        id: "user-manager",
        title: "How to use the User Manager",
        kind: "video",
        videoId: "KwD2yE8EKCc"
    },
    {
        id: "field-qr-codes",
        title: "Where to find the QR codes for patrol check-in/out and patrol tracking",
        kind: "video",
        videoId: "Qr4GDAYuGXQ"
    }
];


export const ROLES = [
    {
        key: "system-admin",
        name: "System Admin",
        summary: "System Admins have full access to all functions of the program, across every event.",
        details: [
            "Sees every event, including new events that have no Event Admin yet.",
            "The only role that can open the Configuration Manager.",
            "Approves new accounts, blocks users, and grants System Admin to others."
        ]
    },
    {
        key: "event-admin",
        name: "Event Admin",
        summary: "Event Admins run a single event: its stations, patrols, users, scoring, and reports.",
        details: [
            "Has the Event Admin role only for the events they are assigned to.",
            "Can use every Administration and Reports screen for that event.",
            "Assigns roles to other users for that event.",
            "Cannot change system-wide configurations."
        ]
    },
    {
        key: "event-ops",
        name: "Event Operations",
        summary: "Event Operations staff work the gate, checking people in as they arrive.",
        details: [
            "Gets the Gate Check-In and Arrivals Dashboard screens.",
            "Also has everything a Standard User has."
        ]
    },
    {
        key: "patrol-management",
        name: "Patrol Management",
        summary: "Patrol Management users register patrols and keep their details up to date.",
        details: [
            "Can create, edit, and delete patrols on the Patrol Manager screen.",
            "Scoring and station roles have read-only view access to Patrol Manager to look up patrols and rosters.",
            "Also has everything a Standard User has."
        ]
    },
    {
        key: "scoring-station",
        name: "Scoring and station roles",
        summary: "Scoring Lead, Scoring Center, Scorer, Station Lead, and Station Volunteer currently have the same access as a Standard User.",
        details: [
            "These roles can be assigned in the User Manager today.",
            "Separate permissions for each one are planned but not built yet."
        ]
    },
    {
        key: "user",
        name: "Standard User",
        summary: "Standard Users check patrols in and out of stations and enter scores.",
        details: [
            "Can view events, patrols, and stations.",
            "Can score, review score entries, and watch Live Status.",
            "Can reopen a station attempt within 5 minutes of finishing it. After 5 minutes it can't be reopened by anyone right now; a fix is on the way."
        ]
    },
    {
        key: "pending",
        name: "Pending approval",
        summary: "New accounts wait here until an admin approves them.",
        details: [
            "Sees only the pending approval screen until approved."
        ]
    }
];


// Columns of the quick reference grid, in display order.
export const GRID_ROLES = [
    { key: "system-admin", label: "System Admin" },
    { key: "event-admin", label: "Event Admin" },
    { key: "event-ops", label: "Event Ops" },
    { key: "patrol-management", label: "Patrol Mgmt" },
    { key: "scoring-station", label: "Scoring & Station" },
    { key: "user", label: "Standard User" }
];


const ALL = GRID_ROLES.map(role => role.key);
const ADMINS = ["system-admin", "event-admin"];


// `roles` lists who has the screen. `partial` marks roles that can reach it
// with a caveat, explained in `note`.
export const ROLE_GRID = [
    {
        section: "Everyday",
        rows: [
            { screen: "Dashboard, Events, Patrols, Stations", roles: ALL },
            { screen: "Scoring and Review Entries", roles: ALL },
            { screen: "Station Check In / Check Out", roles: ALL },
            { screen: "Live Status", roles: ALL }
        ]
    },
    {
        section: "Event Operations",
        rows: [
            { screen: "Gate Check-In", roles: [...ADMINS, "event-ops"] },
            { screen: "Arrivals Dashboard", roles: [...ADMINS, "event-ops"] }
        ]
    },
    {
        section: "Administration",
        rows: [
            { screen: "Admin Dashboard", roles: ADMINS },
            { screen: "Event Manager", roles: ADMINS },
            { screen: "Station Manager", roles: ADMINS },
            {
                screen: "Patrol Manager",
                roles: [...ADMINS, "patrol-management"],
                partial: ["scoring-station", "user"],
                note: "Read-only access for scoring, station, and standard users to look up patrols and rosters."
            },
            { screen: "Import Roster", roles: ADMINS },
            { screen: "User Manager", roles: ADMINS },
            { screen: "Configuration Manager", roles: ["system-admin"] }
        ]
    },
    {
        section: "Reports & Finalization",
        rows: [
            { screen: "Event Reports", roles: ADMINS },
            { screen: "Score Finalizer", roles: ADMINS }
        ]
    },
    {
        section: "Station fixes",
        rows: [
            {
                screen: "Reopen a station attempt (within 5 minutes)",
                roles: ALL
            },
            {
                screen: "Reopen a station attempt (after 5 minutes)",
                roles: [],
                note: "Not working for anyone right now. A fix is on the way."
            }
        ]
    }
];
