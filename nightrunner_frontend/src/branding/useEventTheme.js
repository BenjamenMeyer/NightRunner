import { useEffect } from "react";

import useBranding from "./UseBranding.js";

/**
 * Applies an event's theme once it is known.
 *
 * EventContext already does this for signed-in users when an event is selected.
 * The public pages never touch EventContext — the token names the event, so
 * there is nothing to select — which left them rendering against whatever
 * branding this browser happened to have stored, or the "night-ops" default for
 * a spectator who has never opened the app.
 *
 * That is not merely cosmetic. `night-ops` is a dark palette while `trail-life`
 * and `ahg` are light ones, so showing the wrong theme puts light text on a
 * light background. The public stylesheets read theme variables only, so the
 * page is correct as soon as the right palette is loaded.
 *
 * @param {string|undefined} theme Theme id from the event, e.g. "trail-life".
 */
export default function useEventTheme(theme) {

    const { changeBranding } = useBranding();

    useEffect(() => {

        if (!theme) {
            return;
        }

        // changeBranding ignores an unknown id, so a theme this build does not
        // have leaves the current palette in place rather than breaking.
        changeBranding(theme);

    }, [theme, changeBranding]);

}
