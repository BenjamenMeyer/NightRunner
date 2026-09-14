import { describe, it, expect } from 'vitest';

import {
    parseCsv,
    parseCsvToObjects,
    mapSheetColumns,
    toRosterRows,
    SHEET_COLUMNS
} from '../api/helpers/csv/csv.js';

describe('parseCsv', () => {

    it('reads a plain table', () => {
        expect(parseCsv('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
    });

    it('keeps commas inside quoted fields', () => {
        // The emergency contact column is exactly this shape.
        const rows = parseCsv('name,contact\nJohn,"Jane Smith, 555-0100"');
        expect(rows[1]).toEqual(['John', 'Jane Smith, 555-0100']);
    });

    it('treats a doubled quote as one quote', () => {
        const rows = parseCsv('nickname\n"He said ""hi"""');
        expect(rows[1]).toEqual(['He said "hi"']);
    });

    it('keeps newlines inside quoted fields', () => {
        const rows = parseCsv('notes\n"line one\nline two"');
        expect(rows).toHaveLength(2);
        expect(rows[1]).toEqual(['line one\nline two']);
    });

    it('handles CRLF line endings', () => {
        expect(parseCsv('a,b\r\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
    });

    it('strips the byte order mark Sheets writes', () => {
        // Left in place it becomes part of the first header and nothing matches.
        const rows = parseCsv('﻿Troop Name,x\nGA-0594,1');
        expect(rows[0][0]).toBe('Troop Name');
    });

    it('does not invent a trailing row for a final newline', () => {
        expect(parseCsv('a,b\n1,2\n')).toHaveLength(2);
    });

    it('preserves empty fields', () => {
        expect(parseCsv('a,b,c\n1,,3')).toEqual([['a', 'b', 'c'], ['1', '', '3']]);
    });

    it('returns nothing for empty input', () => {
        expect(parseCsv('')).toEqual([]);
        expect(parseCsv(null)).toEqual([]);
    });

});

describe('parseCsvToObjects', () => {

    it('keys rows by header', () => {
        const { rows } = parseCsvToObjects('Troop Name,First\nGA-0594,John');
        expect(rows[0]).toEqual({ 'Troop Name': 'GA-0594', First: 'John' });
    });

    it('drops entirely blank rows', () => {
        const { rows } = parseCsvToObjects('a,b\n1,2\n,\n');
        expect(rows).toHaveLength(1);
    });

    it('keeps the first of two identically named columns', () => {
        // A later blank duplicate must not wipe a real value.
        const { rows } = parseCsvToObjects('Contact,Contact\nreal,');
        expect(rows[0].Contact).toBe('real');
    });

    it('trims surrounding whitespace', () => {
        const { rows } = parseCsvToObjects('a\n  padded  ');
        expect(rows[0].a).toBe('padded');
    });

});

describe('mapSheetColumns', () => {

    const realHeaders = [
        'Troop Name',
        'Timestamp',
        'Participant First Name:',
        'Participant Last Name:',
        'Email Address:',
        'Youth or Adult or Non-Participant:',
        'IF ADULT: Cell Phone Number:',
        'IF ADULT: Has this adult completed the Who is Responsible for Child Safety and Youth Protection? I am! training in Trail Life Connect? ',
        'IF ADULT: Upload Member ID Card:',
        'Emergency Contact Person & Phone Number',
        'Emergency Contact Person & Phone Number 2'
    ];

    it('maps every field from the real sheet headers', () => {
        const { mapping, missing } = mapSheetColumns(realHeaders);

        expect(missing).toEqual([]);
        expect(mapping.troopName).toBe('Troop Name');
        expect(mapping.firstName).toBe('Participant First Name:');
        expect(mapping.lastName).toBe('Participant Last Name:');
        expect(mapping.category).toBe('Youth or Adult or Non-Participant:');
        expect(mapping.phone).toBe('IF ADULT: Cell Phone Number:');
    });

    it('keeps the two emergency contact columns apart', () => {
        // One label is a prefix of the other, so an exact match must win.
        const { mapping } = mapSheetColumns(realHeaders);

        expect(mapping.emergencyContact1).toBe('Emergency Contact Person & Phone Number');
        expect(mapping.emergencyContact2).toBe('Emergency Contact Person & Phone Number 2');
    });

    it('tolerates a missing colon or stray whitespace', () => {
        const { mapping, missing } = mapSheetColumns([
            'Troop Name',
            ' Participant First Name ',
            'Participant Last Name',
            'Youth or Adult or Non-Participant'
        ]);

        expect(missing).toEqual([]);
        expect(mapping.firstName).toBe(' Participant First Name ');
    });

    it('ignores extra columns a troop has added', () => {
        const { missing } = mapSheetColumns([
            ...realHeaders,
            'Troop-specific note',
            'Dietary requirements'
        ]);

        expect(missing).toEqual([]);
    });

    it('reports missing required columns rather than guessing', () => {
        const { missing } = mapSheetColumns(['Troop Name', 'Timestamp']);

        expect(missing).toContain(SHEET_COLUMNS.firstName.label);
        expect(missing).toContain(SHEET_COLUMNS.lastName.label);
        expect(missing).toContain(SHEET_COLUMNS.category.label);
    });

    it('does not treat optional columns as missing', () => {
        const { missing } = mapSheetColumns([
            'Troop Name',
            'Participant First Name:',
            'Participant Last Name:',
            'Youth or Adult or Non-Participant:'
        ]);

        expect(missing).toEqual([]);
    });

});

describe('toRosterRows', () => {

    it('reshapes sheet rows into roster fields', () => {
        const { headers, rows } = parseCsvToObjects(
            'Troop Name,Participant First Name:,Participant Last Name:,Youth or Adult or Non-Participant:\n' +
            'TL Troop GA-0594,John,Smith,Youth'
        );
        const { mapping } = mapSheetColumns(headers);

        expect(toRosterRows(rows, mapping)[0]).toMatchObject({
            troopName: 'TL Troop GA-0594',
            firstName: 'John',
            lastName: 'Smith',
            category: 'Youth'
        });
    });

});
