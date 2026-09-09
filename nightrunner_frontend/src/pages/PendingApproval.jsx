import ApiService from "@/api/ApiService.js";
import "./PendingApproval.css";

export default function PendingApproval() {
    const user = ApiService.userData.getCached();
    const displayName = user?.displayName ?? user?.username ?? "User";

    async function handleSignOut() {
        await ApiService.auth.logout();
    }

    async function handleRefresh() {
        try {
            const updatedUser = await ApiService.userData.refresh();
            if (updatedUser?.status !== "pending") {
                window.location.href = "/";
            } else {
                alert("Account status is still pending approval.");
            }
        } catch {
            alert("Failed to refresh status.");
        }
    }

    return (
        <div className="pending-page-container">
            <div className="pending-card">
                <div className="pending-icon">⏳</div>
                <h1>Account Pending Approval</h1>
                <p className="pending-greeting">Hello, <strong>{displayName}</strong>!</p>
                <p className="pending-message">
                    Your account is registered in the holding area and is currently pending approval.
                    An event administrator or station leader needs to assign you to an event before you can access the application.
                </p>
                <div className="pending-actions">
                    <button type="button" className="secondary-button" onClick={handleRefresh}>
                        Check Approval Status
                    </button>
                    <button type="button" className="danger" onClick={handleSignOut}>
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
