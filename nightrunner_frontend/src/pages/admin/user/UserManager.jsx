import { useEffect, useMemo, useState } from "react";

import ApiService from "../../../api/ApiService.js";
import { useEventContext } from "../../../api/helpers/EventContext.jsx";

import "./UserManager.css";

const EVENT_ROLES = [
    "user",
    "event-admin"
];

export default function UserManager() {
    const {
        eventId,
        event,
        loading: eventLoading,
        error: eventError
    } = useEventContext();

    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const currentUser =
        ApiService.userData.getCached();

    const isSystemAdmin =
        ApiService.userData.isSystemAdmin();

    const isEventAdmin =
        eventId
            ? ApiService.userData.isEventAdmin(eventId)
            : false;

    useEffect(() => {
        if (eventLoading) {
            return;
        }

        if (eventError) {
            setError(eventError);
            setLoading(false);
            return;
        }

        if (!eventId) {
            setError("No event is currently selected.");
            setLoading(false);
            return;
        }

        loadUsers();
    }, [eventId, eventLoading, eventError]);

    async function loadUsers() {
        try {
            setLoading(true);
            setError(null);

            const response =
                await ApiService.userData.getUsers();

            setUsers(response ?? []);
        } catch (error) {
            console.error(
                "Failed to load users:",
                error
            );

            setError(
                error?.message ??
                "Failed to load users."
            );
        } finally {
            setLoading(false);
        }
    }

    const visibleUsers = useMemo(() => {
        if (isSystemAdmin) {
            return users;
        }

        if (!isEventAdmin || !eventId) {
            return [];
        }

        return users.filter(user =>
            user.roles?.[eventId] != null
        );
    }, [
        users,
        isSystemAdmin,
        isEventAdmin,
        eventId
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
                .includes(query) ||
            user.name
                ?.toLowerCase()
                .includes(query) ||
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
            ...user,
            roles: {
                ...(user.roles ?? {})
            }
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

    function getEventRole(user) {
        if (!eventId) {
            return null;
        }

        return user?.roles?.[eventId] ?? null;
    }

    function updateSelectedEventRole(role) {
        if (!eventId) {
            return;
        }

        setSelectedUser(current => ({
            ...current,
            roles: {
                ...(current?.roles ?? {}),
                [eventId]: role
            }
        }));
    }

    async function saveUser() {
        if (!selectedUser || !eventId) {
            return;
        }

        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const role =
                getEventRole(selectedUser) ?? "user";

            let updatedUser;

            if (isSystemAdmin) {
                updatedUser =
                    await ApiService.userData.updateUser(
                        selectedUser.id,
                        {
                            eventId,
                            role,
                            isAdmin:
                                selectedUser.isAdmin === true
                        }
                    );
            } else {
                updatedUser =
                    await ApiService.userData.updateUser(
                        selectedUser.id,
                        {
                            eventId,
                            role
                        }
                    );
            }

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
        } catch (error) {
            console.error(
                "Failed to update user:",
                error
            );

            setError(
                error?.message ??
                "Failed to update user."
            );
        } finally {
            setSaving(false);
        }
    }

    async function deleteUser() {
        if (!selectedUser) {
            return;
        }

        if (selectedUser.id === currentUser?.id) {
            setError(
                "You cannot delete your own account."
            );
            return;
        }

        if (!window.confirm(
            `Delete ${selectedUser.username}? This action cannot be undone.`
        )) {
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
        } catch (error) {
            console.error(
                "Failed to delete user:",
                error
            );

            setError(
                error?.message ??
                "Failed to delete user."
            );
        }
    }

    if (eventLoading) {
        return (
            <div className="user-manager-page">
                <div className="loading-panel">
                    Loading event...
                </div>
            </div>
        );
    }

    if (!isSystemAdmin && !isEventAdmin) {
        return (
            <div className="user-manager-page">
                <div className="user-manager-denied">
                    <h1>Access Denied</h1>
                    <p>
                        You do not have permission to manage users.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="user-manager-page">
            <header className="page-header">
                <div>
                    <span className="page-eyebrow">
                        Administration
                    </span>

                    <h1>User Manager</h1>

                    <p>
                        Manage user accounts, roles, and event assignments.
                    </p>
                </div>
            </header>

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

                        <path d="m20 20-4-4" />
                    </svg>

                    <input
                        className="search-box"
                        placeholder="Search users..."
                        value={search}
                        onChange={event =>
                            setSearch(event.target.value)
                        }
                    />
                </div>

                <span className="user-count">
                    {filteredUsers.length}{" "}
                    {filteredUsers.length === 1
                        ? "user"
                        : "users"}
                </span>
            </div>

            <div className="user-manager-layout">
                <section className="user-list-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Users</h2>

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
                                <h3>No users found</h3>

                                <p>
                                    Try changing your search.
                                </p>
                            </div>
                        ) : (
                            filteredUsers.map(user => {
                                const role =
                                    getEventRole(user);

                                return (
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
                                            className={`role-badge role-${(
                                                user.isAdmin
                                                    ? "system-admin"
                                                    : role
                                            )?.toLowerCase()}`}
                                        >
                                            {user.isAdmin
                                                ? "System Admin"
                                                : formatRole(role)}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </section>

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
                                    <span>Username</span>

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
                                    <span>Name</span>

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
                                    <span>Email</span>

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
                                        Event Role
                                    </span>

                                    <select
                                        value={
                                            getEventRole(
                                                selectedUser
                                            ) ?? "user"
                                        }
                                        onChange={event =>
                                            updateSelectedEventRole(
                                                event.target.value
                                            )
                                        }
                                    >
                                        {EVENT_ROLES.map(role => (
                                            <option
                                                key={role}
                                                value={role}
                                            >
                                                {formatRole(role)}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <div className="event-restriction">
                                    <strong>Event</strong>

                                    <span>
                                        {event?.name ??
                                            eventId}
                                    </span>

                                    <small>
                                        Event roles are managed for
                                        the currently selected event.
                                    </small>
                                </div>

                                {isSystemAdmin && (
                                    <label className="form-field">
                                        <span>
                                            System Administrator
                                        </span>

                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={
                                                    selectedUser.isAdmin === true
                                                }
                                                onChange={event =>
                                                    updateSelectedUser(
                                                        "isAdmin",
                                                        event.target.checked
                                                    )
                                                }
                                            />

                                            System administrator
                                        </label>
                                    </label>
                                )}

                                {isEventAdmin &&
                                    !isSystemAdmin && (
                                        <div className="event-restriction">
                                            <strong>
                                                Access
                                            </strong>

                                            <small>
                                                Event administrators can
                                                manage users assigned to
                                                this event but cannot
                                                grant system administrator
                                                access.
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
                                        : "Save Changes"}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="empty-panel">
                            <div className="empty-icon">
                                👤
                            </div>

                            <h2>No User Selected</h2>

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
        case "event-admin":
            return "Event Admin";
        case "user":
            return "User";
        default:
            return role ?? "No Role";
    }
}