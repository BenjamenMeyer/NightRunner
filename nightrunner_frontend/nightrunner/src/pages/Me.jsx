import { useEffect, useState } from "react";

import "./Me.css";

import ApiService from "@/api/ApiService";

export default function Me() {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);


    useEffect(() => {

        async function loadUser() {

            try {

                //const storedUser = ApiService.getUser();

                const storedUser = {
                    id: "7f3d9c2e-6a41-4b8e-9d7f-2c5a1e8b4f90",
                    username: "theodore.demo",
                    email: "theodore.demo@example.com",
                    displayName: "Theodore Demo",
                    roles: [
                        "station_leader",
                        "volunteer"
                    ]
                };

                setUser(storedUser);

                // If no stored user is found, we'll use the fake data
                // if (!storedUser?.id) {

                //     throw new Error("No logged in user found.");

                // }

                //const data = await ApiService.get(
                //    `/users/${storedUser.id}`
                //);

                //setUser(data);

            }
            catch (err) {

                setError(err.message);

            }
            finally {

                setLoading(false);

            }

        }

        loadUser();

    }, []);


    if (loading) {

        return (
            <div className="profile-container">
                <div className="profile-card">
                    <h2>Loading profile...</h2>
                </div>
            </div>
        );

    }


    if (error) {

        return (
            <div className="profile-container">
                <div className="profile-card error">
                    <h2>Error</h2>
                    <p>{error}</p>
                </div>
            </div>
        );

    }


    return (
        <div className="profile-container">

            <div className="profile-card">

                <div className="profile-header">

                    <div className="profile-avatar">
                        {user.displayName?.charAt(0) ??
                            user.username.charAt(0)}
                    </div>

                    <div>
                        <h1>
                            {user.displayName}
                        </h1>

                        <p>
                            @{user.username}
                        </p>
                    </div>

                </div>


                <div className="profile-details">

                    <div className="profile-field">
                        <span>Email</span>
                        <strong>
                            {user.email}
                        </strong>
                    </div>


                    <div className="profile-field">
                        <span>User ID</span>
                        <strong className="small-text">
                            {user.id}
                        </strong>
                    </div>


                    <div className="profile-field">

                        <span>
                            Roles
                        </span>

                        <div className="roles">

                            {user.roles?.map(role => (

                                <span
                                    key={role}
                                    className="role"
                                >
                                    {role}
                                </span>

                            ))}

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );

}