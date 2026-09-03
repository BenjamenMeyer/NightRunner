import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

import "./Me.css";

import ApiService from "@/api/ApiService";

export default function Me() {

    const auth = useAuth();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);



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

                const backendUser = await ApiService.userData.get();

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

            </div>

        </div>
    );

}