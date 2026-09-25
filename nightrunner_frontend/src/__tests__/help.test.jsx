import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

import Help from "../pages/help/Help";
import { GRID_ROLES, HELP_SECTIONS, ROLES, ROLE_GRID } from "../pages/help/helpContent";

// Rendered through react-dom rather than @testing-library/react, same as
// station-review.test.jsx.

describe("help content", () => {
    it("only uses grid role keys that exist", () => {
        const known = new Set(GRID_ROLES.map(role => role.key));
        const used = ROLE_GRID
            .flatMap(group => group.rows)
            .flatMap(row => [...row.roles, ...(row.partial ?? [])]);

        expect(used.filter(key => !known.has(key))).toEqual([]);
    });

    it("describes every role shown in the grid", () => {
        const described = new Set(ROLES.map(role => role.key));

        expect(GRID_ROLES.filter(role => !described.has(role.key))).toEqual([]);
    });

    it("gives every section a unique id and every video an id", () => {
        const ids = HELP_SECTIONS.map(section => section.id);
        expect(new Set(ids).size).toBe(ids.length);

        for (const section of HELP_SECTIONS.filter(s => s.kind === "video")) {
            expect(section.videoId, section.id).toMatch(/^[\w-]{11}$/);
        }
    });
});

describe("Help page", () => {
    let container;
    let root;

    beforeEach(() => {
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    function renderAt(path) {
        act(() => root.render(
            <MemoryRouter initialEntries={[path]}>
                <Help />
            </MemoryRouter>
        ));
    }

    it("renders one closed accordion per section", () => {
        renderAt("/help");

        const sections = container.querySelectorAll("details.help-accordion");
        expect(sections).toHaveLength(HELP_SECTIONS.length);
        expect([...sections].every(s => !s.open)).toBe(true);
        // Closed video sections don't load the player.
        expect(container.querySelector("iframe")).toBeNull();
    });

    it("opens the section named in the URL", () => {
        renderAt("/help#user-manager");

        expect(container.querySelector("#user-manager").open).toBe(true);
        expect(container.querySelector("#roles").open).toBe(false);
        expect(container.querySelector("#user-manager iframe").src)
            .toContain("youtube-nocookie.com/embed/KwD2yE8EKCc");
    });

    it("keeps a YouTube link for every video, even when closed", () => {
        renderAt("/help");

        for (const section of HELP_SECTIONS.filter(s => s.kind === "video")) {
            const link = container.querySelector(`#${section.id} a[href*="youtu.be"]`);
            expect(link?.getAttribute("href"), section.id).toBe(`https://youtu.be/${section.videoId}`);
        }
    });

    it("shows a card per role and a grid row per screen in the roles section", () => {
        renderAt("/help#roles");

        const roles = container.querySelector("#roles");
        expect(roles.querySelectorAll(".help-role-card")).toHaveLength(ROLES.length);

        const screenCount = ROLE_GRID.reduce((sum, group) => sum + group.rows.length, 0);
        expect(roles.querySelectorAll("tbody th[scope='row']")).toHaveLength(screenCount);
    });

    it("marks Configuration Manager as System Admin only", () => {
        renderAt("/help#roles");

        const row = [...container.querySelectorAll("tbody tr")]
            .find(tr => tr.textContent.includes("Configuration Manager"));
        const cells = [...row.querySelectorAll("td")].map(td => td.textContent.trim());

        expect(cells[0]).toContain("Yes");
        expect(cells.slice(1).every(text => text.includes("No"))).toBe(true);
    });
});
