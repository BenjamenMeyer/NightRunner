/**
 * Helper to format a patrol's display label consistently across the app.
 * E.g., "#101 - Flying Eagles (Troop TX-0104)"
 * If number or troop is missing, it falls back cleanly.
 */
export function formatPatrolLabel(patrol) {
    if (!patrol) return "";

    const name = patrol.name || "Unnamed Patrol";
    const number = patrol.number ? `#${patrol.number}` : "";

    // Troop can be directly on patrol or derived from members
    const troopVal = patrol.troop || patrol.members?.[0]?.troop;
    const troop = troopVal ? `(Troop ${troopVal})` : "";

    const parts = [];
    if (number) parts.push(number);
    parts.push(name);
    if (troop) parts.push(troop);

    if (number && troop) {
        return `${number} - ${name} ${troop}`;
    }
    if (number) {
        return `${number} - ${name}`;
    }
    if (troop) {
        return `${name} ${troop}`;
    }
    return name;
}
