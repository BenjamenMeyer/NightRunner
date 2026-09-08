import {
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import {
    useAuth
} from "react-oidc-context";

import Layout from "./components/Layout.jsx";
import NotFound from "./pages/NotFound.jsx";

import {
    ACCESS,
    AppRoutes
} from "./AppRoutes.jsx";


function ProtectedRoute({ children }) {

    const auth =
        useAuth();


    if (auth.isLoading) {

        return (
            <div>
                Loading authentication...
            </div>
        );

    }


    if (auth.error) {

        return (
            <div>
                Authentication error:
                {" "}
                {auth.error.message}
            </div>
        );

    }


    if (!auth.isAuthenticated) {

        return (
            <Navigate
                to="/login"
                replace
            />
        );

    }


    return children;

}


function AnonymousRoute({ children }) {

    const auth =
        useAuth();


    if (auth.isLoading) {

        return (
            <div>
                Loading authentication...
            </div>
        );

    }


    if (auth.isAuthenticated) {

        return (
            <Navigate
                to="/dashboard"
                replace
            />
        );

    }


    return children;

}


function RouteElement({ route }) {

    const Element =
        route.element;


    if (route.redirect) {

        return (
            <Navigate
                to={route.redirect}
                replace
            />
        );

    }


    const element =
        <Element />;


    if (route.anonymous) {

        return (
            <AnonymousRoute>
                {element}
            </AnonymousRoute>
        );

    }


    if (
        route.access === ACCESS.PUBLIC
    ) {
        return element;
    }


    return (
        <ProtectedRoute>
            {element}
        </ProtectedRoute>
    );

}


function renderRoute(route) {

    return (
        <Route
            key={route.path}
            path={route.path}
            element={
                <RouteElement
                    route={route}
                />
            }
        />
    );

}


export default function App() {

    const layoutRoutes =
        AppRoutes.filter(
            route =>
                route.layout !== false
        );


    const standaloneRoutes =
        AppRoutes.filter(
            route =>
                route.layout === false
        );


    return (

        <Routes>

            <Route element={<Layout />}>

                {layoutRoutes.map(
                    renderRoute
                )}

            </Route>


            {standaloneRoutes.map(
                renderRoute
            )}


            <Route
                path="*"
                element={<NotFound />}
            />

        </Routes>

    );

}