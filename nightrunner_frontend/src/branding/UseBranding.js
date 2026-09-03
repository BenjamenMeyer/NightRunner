import { useContext } from "react";
import BrandingContext from "./BrandingContext";

export default function useBranding() {

    return useContext(BrandingContext);

}