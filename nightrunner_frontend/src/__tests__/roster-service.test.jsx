import { describe, it, expect, beforeEach, vi } from 'vitest';

import RosterService from '../api/RosterService.js';

describe('RosterService', () => {

    let transport;
    let roster;

    beforeEach(() => {
        transport = {
            get: vi.fn().mockResolvedValue({ attendees: [], troops: [] }),
            post: vi.fn().mockResolvedValue({}),
            delete: vi.fn().mockResolvedValue(null)
        };
        roster = new RosterService(transport);
    });

    describe('patrol eligibility', () => {

        it('requests the exact category "Youth"', async () => {
            await roster.listPatrolEligibleYouth('event-1', 'troop-1');

            const url = transport.get.mock.calls[0][0];
            expect(url).toContain('category=Youth');
        });

        it('does not request a substring that would catch non-participants', async () => {
            await roster.listPatrolEligibleYouth('event-1', 'troop-1');

            const url = decodeURIComponent(transport.get.mock.calls[0][0]);
            // "Non-participant Youth" contains "Youth"; the filter must be an
            // exact match, so the request must not ask for a partial one.
            expect(url).not.toContain('Non-participant');
            expect(url).toMatch(/category=Youth(&|$)/);
        });

        it('scopes the request to the requested troop', async () => {
            await roster.listPatrolEligibleYouth('event-1', 'troop-7');

            expect(transport.get.mock.calls[0][0]).toContain('troopId=troop-7');
        });

        it('refuses to fetch without a troop', async () => {
            await expect(roster.listPatrolEligibleYouth('event-1', null))
                .rejects.toThrow('A troop ID is required.');
        });

    });

    describe('attendee listing', () => {

        it('requires an event', async () => {
            await expect(roster.listAttendees(null))
                .rejects.toThrow('An event ID is required.');
        });

        it('omits the query string entirely when unfiltered', async () => {
            await roster.listAttendees('event-1');

            expect(transport.get).toHaveBeenCalledWith('/events/event-1/attendees');
        });

        it('url-encodes the event id', async () => {
            await roster.listAttendees('event 1/2');

            expect(transport.get.mock.calls[0][0]).toContain('event%201%2F2');
        });

        it('returns an empty list rather than undefined', async () => {
            transport.get.mockResolvedValue({});

            await expect(roster.listAttendees('event-1')).resolves.toEqual([]);
        });

    });

    describe('arrivals', () => {

        it('lets the server stamp the time for a live check-in', async () => {
            await roster.recordArrival('event-1', 'attendee-1');

            expect(transport.post).toHaveBeenCalledWith(
                '/events/event-1/arrivals',
                { attendeeId: 'attendee-1' }
            );
        });

        it('sends an explicit time when back-filling from paper', async () => {
            await roster.recordArrival('event-1', 'attendee-1', '2026-09-12T17:04:00Z');

            expect(transport.post).toHaveBeenCalledWith(
                '/events/event-1/arrivals',
                { attendeeId: 'attendee-1', arrivedAt: '2026-09-12T17:04:00Z' }
            );
        });

        it('undoes an arrival by attendee', async () => {
            await roster.clearArrival('event-1', 'attendee-1');

            expect(transport.delete).toHaveBeenCalledWith(
                '/events/event-1/arrivals/attendee-1'
            );
        });

    });

    describe('import', () => {

        it('previews without writing', async () => {
            await roster.previewImport('event-1', [{ firstName: 'John' }]);

            expect(transport.post).toHaveBeenCalledWith(
                '/events/event-1/roster/preview',
                { rows: [{ firstName: 'John' }] }
            );
        });

        it('applies approved rows to a separate endpoint', async () => {
            await roster.applyImport('event-1', []);

            expect(transport.post.mock.calls[0][0]).toBe('/events/event-1/roster/apply');
        });

    });

});

describe('patrol troop column', () => {

    /**
     * Mirrors patrolTroops() in Patrols.jsx — the troops represented in a
     * patrol, taken from its members.
     */
    function patrolTroops(patrol) {
        const troops = (patrol.members ?? [])
            .map(member => (member.troop || '').trim().toUpperCase())
            .filter(Boolean);
        return [...new Set(troops)].sort();
    }

    it('shows the troop for a single-troop patrol', () => {
        const patrol = { members: [{ troop: 'GA-0594' }, { troop: 'GA-0594' }] };
        expect(patrolTroops(patrol)).toEqual(['GA-0594']);
    });

    it('lists every troop in a mixed patrol rather than just the first', () => {
        const patrol = { members: [{ troop: 'GA-0594' }, { troop: 'GA-0122' }] };
        expect(patrolTroops(patrol)).toEqual(['GA-0122', 'GA-0594']);
    });

    it('normalises case and whitespace before de-duplicating', () => {
        const patrol = { members: [{ troop: ' ga-0594 ' }, { troop: 'GA-0594' }] };
        expect(patrolTroops(patrol)).toEqual(['GA-0594']);
    });

    it('ignores members with no troop', () => {
        const patrol = { members: [{ troop: 'GA-0594' }, { troop: '' }, { name: 'No troop' }] };
        expect(patrolTroops(patrol)).toEqual(['GA-0594']);
    });

    it('returns nothing for an empty patrol', () => {
        expect(patrolTroops({ members: [] })).toEqual([]);
        expect(patrolTroops({})).toEqual([]);
    });

});
