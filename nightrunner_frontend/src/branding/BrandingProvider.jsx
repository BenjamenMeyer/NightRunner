import { useEffect, useState } from "react";

import BrandingContext from "./BrandingContext";
import brandings from "./index";

const STORAGE_KEY = "night-runner-branding";
const THEME_LINK_ID = "branding-theme";

export default function BrandingProvider({ children }) {

    const [brandingId, setBrandingId] = useState(() => {

        return localStorage.getItem(STORAGE_KEY) ?? "trail-life";

    });

    const branding = brandings[brandingId];

    useEffect(() => {

        localStorage.setItem(STORAGE_KEY, brandingId);

        let link = document.getElementById(THEME_LINK_ID);

        if (!link) {

            link = document.createElement("link");
            link.id = THEME_LINK_ID;
            link.rel = "stylesheet";

            document.head.appendChild(link);

        }

        link.href = branding.colors;

        document.title = branding.organizationName;

    }, [branding, brandingId]);

    function changeBranding(id) {

        if (!brandings[id]) {
            return;
        }

        setBrandingId(id);

    }

    return (

        <BrandingContext.Provider
            value={{
                branding,
                brandingId,
                changeBranding
            }}
        >

            {children}

        </BrandingContext.Provider>

    );

}