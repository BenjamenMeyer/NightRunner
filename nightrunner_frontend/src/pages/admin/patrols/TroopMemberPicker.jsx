import { useEffect, useState } from "react";

import ApiService from "@/api/ApiService.js";

import "./TroopMemberPicker.css";

/**
 * Adds patrol members from the event's attendee roster.
 *
 * Select a troop, tick the youth who belong in this patrol. Manual entry
 * remains available alongside this for anyone who turns up unregistered, so
 * this never becomes the only way to build a patrol.
 *
 * @param {string} eventId
 * @param {Array} members Members already on the patrol being edited.
 * @param {(members: Array) => void} onAdd
 */
export default function TroopMemberPicker({
                                              eventId,
                                              members,
                                              onAdd
                                          }) {

    const [troops, setTroops] = useState([]);
    const [troopId, setTroopId] = useState("");
    const [youth, setYouth] = useState([]);
    const [selected, setSelected] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {

        let cancelled = false;

        ApiService.rosterData
            .listTroops()
            .then(result => {
                if (!cancelled) {
                    setTroops(result);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError("Could not load troops.");
                }
            });

        return () => {
            cancelled = true;
        };

    }, []);

    useEffect(() => {

        if (!eventId || !troopId) {
            setYouth([]);
            return undefined;
        }

        let cancelled = false;
        setLoading(true);
        setError(null);
        setSelected({});

        ApiService.rosterData
            .listPatrolEligibleYouth(eventId, troopId)
            .then(result => {
                if (!cancelled) {
                    setYouth(result);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError("Could not load this troop's members.");
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };

    }, [eventId, troopId]);

    /**
     * Whether this attendee is already on the patrol being edited.
     *
     * Matches on attendeeId where present, falling back to name so somebody
     * typed in by hand before the roster existed is not offered twice.
     */
    function alreadyAdded(attendee) {

        return members.some(member => {

            if (member.attendeeId) {
                return member.attendeeId === attendee.id;
            }

            return (
                (member.name || "").trim().toLowerCase() ===
                attendee.fullName.trim().toLowerCase()
            );

        });

    }

    function toggle(attendeeId) {

        setSelected(current => ({
            ...current,
            [attendeeId]: !current[attendeeId]
        }));

    }

    function addSelected() {

        const chosen = youth.filter(
            attendee =>
                selected[attendee.id] &&
                !alreadyAdded(attendee)
        );

        if (chosen.length === 0) {
            return;
        }

        onAdd(
            chosen.map(attendee => ({
                id: crypto.randomUUID(),
                attendeeId: attendee.id,
                name: attendee.fullName,
                rank: "",
                troop: attendee.troopNumber ?? ""
            }))
        );

        setSelected({});

    }

    const selectedCount = youth.filter(
        attendee => selected[attendee.id] && !alreadyAdded(attendee)
    ).length;

    const available = youth.filter(attendee => !alreadyAdded(attendee));

    return (

        <section className="troop-member-picker">

            <header className="troop-member-picker__header">
                <h3>Add from roster</h3>
                <p>
                    Pick a troop, then tick the youth to add. Adults and
                    non-participants are not shown — they cannot join a patrol.
                </p>
            </header>

            <label className="troop-member-picker__troop">
                <span>Troop</span>
                <select
                    value={troopId}
                    onChange={event => setTroopId(event.target.value)}
                >
                    <option value="">Select a troop…</option>
                    {troops.map(troop => (
                        <option key={troop.id} value={troop.id}>
                            {troop.number}
                            {troop.name && troop.name !== troop.number
                                ? ` — ${troop.name}`
                                : ""}
                        </option>
                    ))}
                </select>
            </label>

            {error && (
                <p className="troop-member-picker__error">{error}</p>
            )}

            {loading && (
                <p className="troop-member-picker__empty">Loading…</p>
            )}

            {!loading && troopId && youth.length === 0 && !error && (
                <p className="troop-member-picker__empty">
                    No youth on the roster for this troop. Import the
                    registration sheet, or add members by hand below.
                </p>
            )}

            {!loading && youth.length > 0 && (
                <>
                    <ul className="troop-member-picker__list">
                        {youth.map(attendee => {

                            const added = alreadyAdded(attendee);

                            return (
                                <li
                                    key={attendee.id}
                                    className={
                                        added
                                            ? "troop-member-picker__item troop-member-picker__item--added"
                                            : "troop-member-picker__item"
                                    }
                                >
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={Boolean(selected[attendee.id]) && !added}
                                            disabled={added}
                                            onChange={() => toggle(attendee.id)}
                                        />
                                        <span>{attendee.fullName}</span>
                                        {added && (
                                            <em>already on this patrol</em>
                                        )}
                                    </label>
                                </li>
                            );

                        })}
                    </ul>

                    <button
                        type="button"
                        className="troop-member-picker__add"
                        disabled={selectedCount === 0}
                        onClick={addSelected}
                    >
                        {selectedCount === 0
                            ? "Select members to add"
                            : `Add ${selectedCount} member${selectedCount === 1 ? "" : "s"}`}
                    </button>

                    {available.length === 0 && (
                        <p className="troop-member-picker__empty">
                            Everyone from this troop is already on this patrol.
                        </p>
                    )}
                </>
            )}

        </section>

    );

}
