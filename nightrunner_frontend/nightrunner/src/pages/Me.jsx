import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

import "./Me.css";

import ApiService from "@/api/ApiService";

export default function Me() {

    const auth = useAuth();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [loggingOut, setLoggingOut] = useState(false);


    //
    // Load Night Runner application user
    //

    useEffect(() => {

        async function loadUser() {

            try {

                /*
                 * AuthService / OIDC tells us whether the
                 * identity provider session exists.
                 *
                 * UserService tells us which Night Runner
                 * application account belongs to that identity.
                 */
                if (!auth.isAuthenticated) {

                    throw new Error(
                        "You are not authenticated."
                    );

                }

                const backendUser =
                    await ApiService.userData.get();

                if (!backendUser) {

                    throw new Error(
                        "No Night Runner user account found."
                    );

                }

                setUser(backendUser);

            }
            catch (err) {

                console.error(
                    "Failed to load profile:",
                    err
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load profile."
                );

            }
            finally {

                setLoading(false);

            }

        }

        /*
         * react-oidc-context may still be resolving the
         * authentication state when this component mounts.
         */
        if (!auth.isLoading) {

            loadUser();

        }

    }, [
        auth.isLoading,
        auth.isAuthenticated
    ]);


    //
    // Logout
    //

    async function logout() {

        if (loggingOut) {

            return;

        }

        setLoggingOut(true);

        try {

            /*
             * This logs the user out of the OIDC provider.
             *
             * Do NOT call UserService.clear() as a replacement
             * for OIDC logout. The local application user is
             * only a cache.
             */
            await ApiService.logout();

        }
        catch (err) {

            console.error(
                "Logout failed:",
                err
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to log out."
            );

            setLoggingOut(false);

        }

    }


    //
    // Loading
    //

    if (
        auth.isLoading ||
        loading
    ) {

        return (
            <div className="profile-container">

                <div className="profile-card">

                    <h2>
                        Loading profile...
                    </h2>

                </div>

            </div>
        );

    }


    //
    // Authentication error
    //

    if (auth.error) {

        return (
            <div className="profile-container">

                <div className="profile-card error">

                    <h2>
                        Authentication Error
                    </h2>

                    <p>
                        {auth.error.message}
                    </p>

                </div>

            </div>
        );

    }


    //
    // Backend user error
    //

    if (error) {

        return (
            <div className="profile-container">

                <div className="profile-card error">

                    <h2>
                        Error
                    </h2>

                    <p>
                        {error}
                    </p>

                </div>

            </div>
        );

    }


    //
    // Safety check
    //

    if (!user) {

        return (
            <div className="profile-container">

                <div className="profile-card error">

                    <h2>
                        Error
                    </h2>

                    <p>
                        No Night Runner user account found.
                    </p>

                </div>

            </div>
        );

    }


    //
    // Profile
    //

    const displayName =
        user.displayName ||
        user.username ||
        "User";

    const initial =
        displayName
            .charAt(0)
            .toUpperCase();


    return (
        <div className="profile-container">

            <div className="profile-card">

                <div className="profile-header">

                    <div className="profile-avatar">
                        {initial}
                    </div>

                    <div className="profile-header-info">

                        <h1>
                            {displayName}
                        </h1>

                        <p>
                            @{user.username}
                        </p>

                    </div>

                </div>


                <div className="profile-details">

                    <div className="profile-field">

                        <span>
                            Email
                        </span>

                        <strong>
                            {user.email}
                        </strong>

                    </div>


                    <div className="profile-field">

                        <span>
                            User ID
                        </span>

                        <strong className="small-text">
                            {user.id}
                        </strong>

                    </div>


                    <div className="profile-field">

                        <span>
                            External ID
                        </span>

                        <strong className="small-text">
                            {user.externalId}
                        </strong>

                    </div>


                    <div className="profile-field">

                        <span>
                            Roles
                        </span>

                        <div className="roles">

                            {user.roles?.length > 0

                                ? user.roles.map(role => (

                                    <span
                                        key={role}
                                        className="role"
                                    >
                                        {role}
                                    </span>

                                ))

                                : (

                                    <span className="role">
                                        No roles
                                    </span>

                                )}

                        </div>

                    </div>


                    <div className="profile-field">

                        <span>
                            Event
                        </span>

                        <strong className="small-text">
                            {user.event ?? "No event assigned"}
                        </strong>

                    </div>

                </div>


                <div className="profile-actions">

                    <button
                        type="button"
                        className="logout-button"
                        onClick={logout}
                        disabled={loggingOut}
                    >
                        {loggingOut
                            ? "Signing out..."
                            : "Sign out"}
                    </button>

                </div>

            </div>

        </div>
    );

}