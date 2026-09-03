import { useEffect, useMemo, useState } from "react";

import ApiService from "@/api/ApiService.js";

import "./UserManager.css";

const ROLES = [
    "USER",
    "EVENT_ADMIN",
    "SYSTEM_ADMIN"
];

export default function UserManager() {

    const [users, setUsers] = useState([]);

    const [selectedUser, setSelectedUser] = useState(null);

    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const currentUser =
        ApiService.userData.get();

    const isSystemAdmin = ApiService.userData.isSystemAdmin();

    const isEventAdmin = ApiService.userData.isEventAdmin();

    useEffect(() => {

        loadUsers();

    }, []);

    async function loadUsers() {

        try {

            setLoading(true);
            setError(null);

            const response =
                await ApiService.userData.getUsers();

            setUsers(response);

        }
        catch (error) {

            console.error(
                "Failed to load users:",
                error
            );

            setError(
                error.message ??
                "Failed to load users."
            );

        }
        finally {

            setLoading(false);

        }

    }

    /*
     * Event admins should only see users associated
     * with their event.
     *
     * System admins can see everyone.
     *
     * Ideally the backend ALSO enforces this restriction.
     * This filtering is only the UI layer.
     */
    const visibleUsers = useMemo(() => {

        if (isSystemAdmin) {
            return users;
        }

        if (isEventAdmin) {

            return users.filter(
                user =>
                    user.event === currentUser.event
            );

        }

        return [];

    }, [
        users,
        isSystemAdmin,
        isEventAdmin,
        currentUser?.event
    ]);

    const filteredUsers = useMemo(() => {

        const query =
            search.trim().toLowerCase();

        if (!query) {
            return visibleUsers;
        }

        return visibleUsers.filter(user =>

            user.username
                ?.toLowerCase()
                .includes(query)

            ||

            user.name
                ?.toLowerCase()
                .includes(query)

            ||

            user.email
                ?.toLowerCase()
                .includes(query)

        );

    }, [
        visibleUsers,
        search
    ]);

    function selectUser(user) {

        setSelectedUser({
            ...user
        });

        setError(null);
        setSuccess(null);

    }

    function updateSelectedUser(field, value) {

        setSelectedUser(current => ({

            ...current,

            [field]: value

        }));

    }

    function getAvailableRoles() {

        if (isSystemAdmin) {
            return ROLES;
        }

        /*
         * Event admins can manage users in their event,
         * but cannot grant SYSTEM_ADMIN.
         */
        return ROLES.filter(
            role => role !== "SYSTEM_ADMIN"
        );

    }

    async function saveUser() {

        if (!selectedUser) {
            return;
        }

        try {

            setSaving(true);

            setError(null);
            setSuccess(null);

            /*
             * Event admins cannot change the event assignment.
             *
             * System admins can.
             */
            const payload = {

                username:
                selectedUser.username,

                name:
                selectedUser.name,

                email:
                selectedUser.email,

                role:
                selectedUser.role,

                ...(isSystemAdmin
                    ? {
                        event:
                        selectedUser.event
                    }
                    : {})

            };

            const updatedUser =
                await ApiService.userData.updateUser(
                    selectedUser.id,
                    payload
                );

            setUsers(current =>
                current.map(user =>
                    user.id === updatedUser.id
                        ? updatedUser
                        : user
                )
            );

            setSelectedUser(updatedUser);

            setSuccess(
                "User updated successfully."
            );

        }
        catch (error) {

            console.error(
                "Failed to update user:",
                error
            );

            setError(
                error.message ??
                "Failed to update user."
            );

        }
        finally {

            setSaving(false);

        }

    }

    async function deleteUser() {

        if (!selectedUser) {
            return;
        }

        if (
            selectedUser.id === currentUser.id
        ) {

            setError(
                "You cannot delete your own account."
            );

            return;

        }

        if (
            !window.confirm(
                `Delete ${selectedUser.username}? This action cannot be undone.`
            )
        ) {
            return;
        }

        try {

            setError(null);
            setSuccess(null);

            await ApiService.userData.deleteUser(
                selectedUser.id
            );

            setUsers(current =>
                current.filter(
                    user =>
                        user.id !== selectedUser.id
                )
            );

            setSelectedUser(null);

            setSuccess(
                "User deleted successfully."
            );

        }
        catch (error) {

            console.error(
                "Failed to delete user:",
                error
            );

            setError(
                error.message ??
                "Failed to delete user."
            );

        }

    }

    if (!isSystemAdmin && !isEventAdmin) {

        return (

            <div className="user-manager-page">

                <div className="user-manager-denied">

                    <h1>
                        Access Denied
                    </h1>

                    <p>
                        You do not have permission to manage users.
                    </p>

                </div>

            </div>

        );

    }

    return (

        <div className="user-manager-page">

            {/* Header */}

            <header className="page-header">

                <div>

                    <span className="page-eyebrow">
                        Administration
                    </span>

                    <h1>
                        User Manager
                    </h1>

                    <p>
                        Manage user accounts, roles, and event
                        assignments.
                    </p>

                </div>

            </header>


            {/* Messages */}

            {error && (

                <div className="error-banner">
                    {error}
                </div>

            )}

            {success && (

                <div className="success-banner">
                    {success}
                </div>

            )}


            {/* Toolbar */}

            <div className="user-toolbar">

                <div className="search-wrapper">

                    <svg
                        className="search-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                    >

                        <circle
                            cx="11"
                            cy="11"
                            r="7"
                        />

                        <path
                            d="m20 20-4-4"
                        />

                    </svg>

                    <input
                        className="search-box"
                        placeholder="Search users..."
                        value={search}
                        onChange={event =>
                            setSearch(
                                event.target.value
                            )
                        }
                    />

                </div>

                <span className="user-count">

                    {filteredUsers.length}
                    {" "}
                    {filteredUsers.length === 1
                        ? "user"
                        : "users"
                    }

                </span>

            </div>


            {/* Main */}

            <div className="user-manager-layout">


                {/* User List */}

                <section className="user-list-panel">

                    <div className="panel-header">

                        <div>

                            <h2>
                                Users
                            </h2>

                            <p>
                                Select a user to manage their account.
                            </p>

                        </div>

                    </div>

                    <div className="user-list">

                        {loading ? (

                            <div className="loading-panel">
                                Loading users...
                            </div>

                        ) : filteredUsers.length === 0 ? (

                            <div className="empty-list">

                                <h3>
                                    No users found
                                </h3>

                                <p>
                                    Try changing your search.
                                </p>

                            </div>

                        ) : (

                            filteredUsers.map(user => (

                                <button
                                    type="button"
                                    key={user.id}
                                    className={
                                        selectedUser?.id === user.id
                                            ? "user-card selected"
                                            : "user-card"
                                    }
                                    onClick={() =>
                                        selectUser(user)
                                    }
                                >

                                    <span className="user-card-avatar">

                                        {(user.name ||
                                            user.username ||
                                            "?")
                                            .charAt(0)
                                            .toUpperCase()}

                                    </span>

                                    <span className="user-card-content">

                                        <strong>
                                            {user.name ||
                                                user.username}
                                        </strong>

                                        <span>
                                            @{user.username}
                                        </span>

                                    </span>

                                    <span
                                        className={`role-badge role-${user.role?.toLowerCase()}`}
                                    >
                                        {formatRole(
                                            user.role
                                        )}
                                    </span>

                                </button>

                            ))

                        )}

                    </div>

                </section>


                {/* Details */}

                <section className="user-details">

                    {selectedUser ? (

                        <>

                            <div className="details-header">

                                <div className="user-profile-heading">

                                    <div className="large-avatar">

                                        {(selectedUser.name ||
                                            selectedUser.username ||
                                            "?")
                                            .charAt(0)
                                            .toUpperCase()}

                                    </div>

                                    <div>

                                        <span className="details-eyebrow">
                                            User Account
                                        </span>

                                        <h2>
                                            {selectedUser.name ||
                                                selectedUser.username}
                                        </h2>

                                        <p>
                                            @{selectedUser.username}
                                        </p>

                                    </div>

                                </div>

                            </div>


                            <div className="details-divider" />


                            <div className="user-form">

                                <label className="form-field">

                                    <span>
                                        Username
                                    </span>

                                    <input
                                        value={
                                            selectedUser.username ??
                                            ""
                                        }
                                        onChange={event =>
                                            updateSelectedUser(
                                                "username",
                                                event.target.value
                                            )
                                        }
                                    />

                                </label>


                                <label className="form-field">

                                    <span>
                                        Name
                                    </span>

                                    <input
                                        value={
                                            selectedUser.name ??
                                            ""
                                        }
                                        onChange={event =>
                                            updateSelectedUser(
                                                "name",
                                                event.target.value
                                            )
                                        }
                                    />

                                </label>


                                <label className="form-field">

                                    <span>
                                        Email
                                    </span>

                                    <input
                                        type="email"
                                        value={
                                            selectedUser.email ??
                                            ""
                                        }
                                        onChange={event =>
                                            updateSelectedUser(
                                                "email",
                                                event.target.value
                                            )
                                        }
                                    />

                                </label>


                                <label className="form-field">

                                    <span>
                                        Role
                                    </span>

                                    <select
                                        value={
                                            selectedUser.role ??
                                            "USER"
                                        }
                                        onChange={event =>
                                            updateSelectedUser(
                                                "role",
                                                event.target.value
                                            )
                                        }
                                    >

                                        {getAvailableRoles().map(
                                            role => (

                                                <option
                                                    key={role}
                                                    value={role}
                                                >
                                                    {formatRole(
                                                        role
                                                    )}
                                                </option>

                                            )
                                        )}

                                    </select>

                                </label>


                                {isSystemAdmin && (

                                    <label className="form-field">

                                        <span>
                                            Event
                                        </span>

                                        <input
                                            value={
                                                selectedUser.event ??
                                                ""
                                            }
                                            onChange={event =>
                                                updateSelectedUser(
                                                    "event",
                                                    event.target.value
                                                )
                                            }
                                            placeholder="Event ID"
                                        />

                                    </label>

                                )}


                                {isEventAdmin && (

                                    <div className="event-restriction">

                                        <strong>
                                            Event
                                        </strong>

                                        <span>
                                            {currentUser.event}
                                        </span>

                                        <small>
                                            Event administrators can only
                                            manage users assigned to their
                                            event.
                                        </small>

                                    </div>

                                )}

                            </div>


                            <div className="details-divider" />


                            <div className="detail-actions">

                                <button
                                    type="button"
                                    className="danger"
                                    onClick={deleteUser}
                                >
                                    Delete User
                                </button>

                                <button
                                    type="button"
                                    className="primary-button"
                                    onClick={saveUser}
                                    disabled={saving}
                                >

                                    {saving
                                        ? "Saving..."
                                        : "Save Changes"
                                    }

                                </button>

                            </div>

                        </>

                    ) : (

                        <div className="empty-panel">

                            <div className="empty-icon">
                                👤
                            </div>

                            <h2>
                                No User Selected
                            </h2>

                            <p>
                                Select a user from the list to view
                                and manage their account.
                            </p>

                        </div>

                    )}

                </section>

            </div>

        </div>

    );

}

function formatRole(role) {

    switch (role) {

        case "SYSTEM_ADMIN":
            return "System Admin";

        case "EVENT_ADMIN":
            return "Event Admin";

        case "USER":
            return "User";

        default:
            return role ?? "Unknown";

    }

}