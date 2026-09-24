/**
 * A small CSV reader for spreadsheet exports.
 *
 * Splitting on commas is not good enough here: the registration sheet holds
 * free-text fields like "Jane Smith, 555-0100" that are quoted by the export,
 * and Google Sheets writes a UTF-8 BOM and CRLF line endings. Getting any of
 * that wrong silently corrupts somebody's record rather than failing loudly.
 */

/**
 * Parses CSV text into an array of row arrays.
 *
 * Handles quoted fields containing commas and newlines, doubled quotes as an
 * escaped quote, CRLF or LF endings, and a leading byte order mark.
 *
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {

    if (typeof text !== "string" || text.length === 0) {
        return [];
    }

    // Strip the byte order mark Sheets writes, otherwise it becomes part of
    // the first header name and no column matches.
    const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    let index = 0;

    while (index < input.length) {

        const char = input[index];

        if (inQuotes) {

            if (char === '"') {

                if (input[index + 1] === '"') {
                    // A doubled quote inside a quoted field is one quote.
                    field += '"';
                    index += 2;
                    continue;
                }

                inQuotes = false;
                index += 1;
                continue;
            }

            field += char;
            index += 1;
            continue;
        }

        if (char === '"') {
            inQuotes = true;
            index += 1;
            continue;
        }

        if (char === ",") {
            row.push(field);
            field = "";
            index += 1;
            continue;
        }

        if (char === "\r") {
            // Swallow CR so CRLF and lone CR both end the row once.
            if (input[index + 1] === "\n") {
                index += 1;
            }
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
            index += 1;
            continue;
        }

        if (char === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
            index += 1;
            continue;
        }

        field += char;
        index += 1;
    }

    // Whatever is left is the final field, unless the file ended on a newline.
    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows;
}


/**
 * Parses CSV text into objects keyed by header name.
 *
 * Duplicate header names keep the first occurrence, since a later blank
 * column would otherwise wipe a real value. Rows that are entirely empty are
 * dropped — spreadsheet exports routinely end with them.
 *
 * @param {string} text
 * @returns {{headers: string[], rows: Object[]}}
 */
export function parseCsvToObjects(text) {

    const table = parseCsv(text);

    if (table.length === 0) {
        return { headers: [], rows: [] };
    }

    const headers = table[0].map(header => header.trim());

    const rows = table
        .slice(1)
        .filter(cells => cells.some(cell => cell.trim() !== ""))
        .map(cells => {

            const row = {};

            headers.forEach((header, position) => {
                if (!header) {
                    return;
                }
                if (Object.prototype.hasOwnProperty.call(row, header)) {
                    return;
                }
                row[header] = (cells[position] ?? "").trim();
            });

            return row;
        });

    return { headers, rows };
}


/**
 * The registration sheet columns the roster reads.
 *
 * Header text is matched loosely — case, surrounding whitespace, trailing
 * colons and internal spacing are ignored — so a stray space or a colon
 * someone removed does not break the import.
 */
export const SHEET_COLUMNS = {
    troopName: { label: "Troop Name", aliases: ["Troop", "Troop Number", "Troop Code"], required: true },
    firstName: { label: "Participant First Name", aliases: ["First Name", "First"], required: true },
    lastName: { label: "Participant Last Name", aliases: ["Last Name", "Last"], required: true },
    category: { label: "Youth or Adult or Non-Participant", aliases: ["Category", "Role", "Type"], required: true },
    phone: { label: "IF ADULT: Cell Phone Number", aliases: ["Phone", "Cell Phone", "Mobile Phone"], required: false },
    emergencyContact1: { label: "Emergency Contact Person & Phone Number", aliases: ["Emergency Contact 1", "Emergency Contact"], required: false },
    emergencyContact2: { label: "Emergency Contact Person & Phone Number 2", aliases: ["Emergency Contact 2"], required: false },
    primaryEmail: { label: "Parent Email", aliases: ["Primary Email", "Parent Email Address", "Email"], required: false },
    secondaryEmail: { label: "Youth Email", aliases: ["Secondary Email", "Youth Email Address"], required: false }
};


function squash(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[:\s]+/g, "")
        .replace(/[^a-z0-9&]/g, "");
}


/**
 * Maps sheet headers onto roster fields.
 *
 * Troops may add columns of their own, so unknown headers are ignored.
 * Missing required columns are reported rather than guessed at.
 *
 * @param {string[]} headers
 * @returns {{mapping: Object, missing: string[]}}
 */
export function mapSheetColumns(headers) {

    const squashedHeaders = headers.map(squash);
    const mapping = {};
    const missing = [];

    Object.entries(SHEET_COLUMNS).forEach(([field, column]) => {

        const targets = [squash(column.label), ...(column.aliases || []).map(squash)];

        let position = -1;

        // Try exact match first against primary label or aliases
        for (const target of targets) {
            position = squashedHeaders.findIndex(header => header === target);
            if (position !== -1) break;
        }

        // Fallback to startsWith match if exact match not found
        if (position === -1) {
            for (const target of targets) {
                position = squashedHeaders.findIndex(
                    header => header.startsWith(target) && header !== squash(SHEET_COLUMNS.emergencyContact2.label)
                );
                if (position !== -1) break;
            }
        }

        if (position === -1) {
            if (column.required) {
                missing.push(column.label);
            }
            return;
        }

        mapping[field] = headers[position];
    });

    return { mapping, missing };
}


/**
 * Turns sheet rows into the shape the roster import endpoint expects.
 *
 * @param {Object[]} rows
 * @param {Object} mapping field -> header name
 * @returns {Object[]}
 */
export function toRosterRows(rows, mapping) {

    return rows.map(row => {

        const out = {};

        Object.entries(mapping).forEach(([field, header]) => {
            out[field] = row[header] ?? "";
        });

        return out;
    });
}
