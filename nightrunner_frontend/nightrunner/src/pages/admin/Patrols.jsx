import {useEffect, useMemo, useState} from "react";

import "./Patrols.css";
import ApiService from "@/api/ApiService.js";

const RANKS = [
    "Navigator",
    "Adventurer"
];

export default function Patrols() {

    const [patrols, setPatrols] = useState([]);

    const [selectedPatrol, setSelectedPatrol] = useState(null);

    const [showCreateModal, setShowCreateModal] = useState(false);

    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState(null);

    const [newPatrol, setNewPatrol] = useState({
        programName: "",
        members: []
    });

    const [newMember, setNewMember] = useState({
        name: "",
        rank: RANKS[0],
        troop: ""
    });

    useEffect(() => {

        loadPatrols();

    }, []);

    async function loadPatrols() {

        try {

            setError(null);

            setLoading(true);

            const patrols = await ApiService.patrolData.getPatrols();

            setPatrols(patrols);

            if (selectedPatrol) {

                const updated = patrols.find(
                    patrol => patrol.id === selectedPatrol.id
                );

                setSelectedPatrol(updated ?? null);

            }

            return patrols;

        } catch (error) {

            setError(error.message);

            return [];

        } finally {

            setLoading(false);

        }

    }

    function resetCreateDialog() {

        setShowCreateModal(false);

        setNewPatrol({
            programName: "",
            members: []
        });

        setNewMember({
            name: "",
            rank: RANKS[0],
            troop: ""
        });

    }

    const filteredPatrols = useMemo(() => {

        return patrols.filter(patrol =>
            patrol.programName
                .toLowerCase()
                .includes(search.toLowerCase())
        );

    }, [patrols, search]);

    function addMember() {

        if (!newMember.name.trim()) {
            return;
        }

        setNewPatrol(current => ({

            ...current,

            members: [

                ...current.members,

                {
                    id: crypto.randomUUID(),
                    ...newMember
                }

            ]

        }));

        setNewMember({
            name: "",
            rank: RANKS[0],
            troop: ""
        });

    }

    function removeMember(id) {

        setNewPatrol(current => ({

            ...current,

            members: current.members.filter(
                member => member.id !== id
            )

        }));

    }

    async function createPatrol() {

        if (!newPatrol.programName.trim()) {
            return;
        }

        try {

            setError(null);

            const createdPatrol = await ApiService.patrolData.createPatrol(newPatrol);

            const patrols = await loadPatrols();

            const selected = patrols.find(
                patrol => patrol.id === createdPatrol.id
            );

            setSelectedPatrol(
                selected ?? createdPatrol
            );

            resetCreateDialog();

        } catch (error) {

            setError(error.message);

        }

    }

    async function deletePatrol(id) {

        if (!window.confirm("Delete this patrol?")) {
            return;
        }

        try {

            setError(null);

            await ApiService.patrolData.deletePatrol(id);

            await loadPatrols();

            if (selectedPatrol?.id === id) {
                setSelectedPatrol(null);
            }

        } catch (error) {

            setError(error.message);

        }

    }

    return (

        <>

            <div className="page-header">

                <div>

                    <h1>Patrols</h1>

                    <p>
                        Manage every patrol participating in the event.
                    </p>

                </div>

                <button
                    className="primary-button"
                    onClick={() => setShowCreateModal(true)}
                >
                    + Create Patrol
                </button>

            </div>

            {error && (

                <div className="error-banner">

                    {error}

                </div>

            )}

            <input
                className="search-box"
                placeholder="Search patrols..."
                value={search}
                onChange={(e) =>
                    setSearch(e.target.value)
                }
            />

            <div className="patrol-layout">

                <div className="patrol-list">

                    {loading ? (

                        <div className="loading-panel">
                            Loading patrols...
                        </div>
                    ) : (
                        filteredPatrols.map((patrol) => (

                            <div
                                key={patrol.id}
                                className={selectedPatrol?.id === patrol.id
                                    ? "patrol-card selected"
                                    : "patrol-card"
                                }
                                onClick={() => setSelectedPatrol(patrol)}
                            >

                                <h2>
                                    {patrol.programName}
                                </h2>

                                <p>
                                    {patrol.members.length} Members
                                </p>

                            </div>
                        ))
                    )}

                </div>

                <div className="patrol-details">

                    {selectedPatrol ? (

                        <>

                            <h2>
                                {selectedPatrol.programName}
                            </h2>

                            <h3>
                                Members
                            </h3>

                            <table className="member-table">

                                <thead>

                                <tr>

                                    <th>Name</th>

                                    <th>Rank</th>

                                    <th>Troop</th>

                                </tr>

                                </thead>

                                <tbody>

                                {selectedPatrol.members.map(
                                    (member, index) => (

                                        <tr key={index}>

                                            <td>
                                                {member.name}
                                            </td>

                                            <td>
                                                {member.rank}
                                            </td>

                                            <td>
                                                {member.troop}
                                            </td>

                                        </tr>

                                    )
                                )}

                                </tbody>

                            </table>

                            <div className="detail-buttons">

                                <button>

                                    Edit

                                </button>

                                <button
                                    className="danger"
                                    onClick={() =>
                                        deletePatrol(
                                            selectedPatrol.id
                                        )
                                    }
                                >

                                    Delete

                                </button>

                            </div>

                        </>

                    ) : (

                        <div className="empty-panel">

                            <h2>
                                No Patrol Selected
                            </h2>

                            <p>

                                Select a patrol to view its details.

                            </p>

                        </div>

                    )}

                </div>

            </div>

            {showCreateModal && (

                <div className="modal-backdrop">

                    <div className="modal large">

                        <h2>

                            Create Patrol

                        </h2>

                        <label>

                            Patrol Name

                            <input
                                value={newPatrol.programName}
                                onChange={(e) =>
                                    setNewPatrol({
                                        ...newPatrol,
                                        programName: e.target.value
                                    })
                                }
                            />

                        </label>

                        <h3>

                            Patrol Members

                        </h3>

                        <div className="member-entry">
                            <input
                                placeholder="Member Name"
                                value={newMember.name}
                                onChange={(e) =>
                                    setNewMember({
                                        ...newMember,
                                        name: e.target.value
                                    })
                                }
                            />

                            <select
                                value={newMember.rank}
                                onChange={(e) =>
                                    setNewMember({
                                        ...newMember,
                                        rank: e.target.value
                                    })
                                }
                            >

                                {RANKS.map(rank => (

                                    <option
                                        key={rank}
                                        value={rank}
                                    >
                                        {rank}
                                    </option>

                                ))}

                            </select>

                            <input
                                placeholder="Troop"
                                value={newMember.troop}
                                onChange={(e) =>
                                    setNewMember({
                                        ...newMember,
                                        troop: e.target.value
                                    })
                                }
                            />

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={addMember}
                            >
                                Add Member
                            </button>

                        </div>

                        <table className="member-table">

                            <thead>

                            <tr>

                                <th>Name</th>

                                <th>Rank</th>

                                <th>Troop</th>

                                <th></th>

                            </tr>

                            </thead>

                            <tbody>

                            {newPatrol.members.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="4"
                                        className="empty-table"
                                    >
                                        No members added.
                                    </td>

                                </tr>

                            ) : (

                                newPatrol.members.map(
                                    (member, index) => (

                                        <tr key={index}>

                                            <td>
                                                {member.name}
                                            </td>

                                            <td>
                                                {member.rank}
                                            </td>

                                            <td>
                                                {member.troop}
                                            </td>

                                            <td>

                                                <button
                                                    type="button"
                                                    className="danger"
                                                    onClick={() =>
                                                        removeMember(index)
                                                    }
                                                >
                                                    Remove
                                                </button>

                                            </td>

                                        </tr>

                                    )

                                )

                            )}

                            </tbody>

                        </table>

                        <div className="modal-buttons">

                            <button
                                onClick={() =>
                                    setShowCreateModal(false)
                                }
                            >

                                Cancel

                            </button>

                            <button
                                className="primary-button"
                                onClick={createPatrol}
                            >

                                Create Patrol

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </>

    );

}