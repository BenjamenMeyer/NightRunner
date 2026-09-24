import BackendTransport from "./BackendTransport.js";

export default class ReportService {

    async getEventReport(eventId) {

        if (!eventId) {
            throw new Error(
                "An event ID is required."
            );
        }

        return await BackendTransport.get(
            `/reports/events/${eventId}`
        );

    }

    async getStationReport(
        stationId,
        eventId
    ) {

        if (!stationId) {
            throw new Error(
                "A station ID is required."
            );
        }

        if (!eventId) {
            throw new Error(
                "An event ID is required."
            );
        }

        return await BackendTransport.get(
            `/reports/stations/${stationId}?eventId=${encodeURIComponent(eventId)}`
        );

    }

    async patchScore(scoreId, payload) {

        if (!scoreId) {
            throw new Error(
                "A score ID is required."
            );
        }

        return await BackendTransport.patch(
            `/scores/${scoreId}`,
            payload
        );

    }

    getPatrolsPdfUrl(eventId) {

        if (!eventId) {
            return "";
        }

        const baseUrl = BackendTransport.defaults.baseURL || "";
        return `${baseUrl}/reports/events/${eventId}/patrols-pdf`;

    }

    async listCompiledReports(eventId) {

        if (!eventId) {
            throw new Error("An event ID is required.");
        }

        return await BackendTransport.get(
            `/events/${eventId}/compiled-reports`
        );

    }

    async generateReportJob(eventId, reportType = "patrols-pdf") {

        if (!eventId) {
            throw new Error("An event ID is required.");
        }

        return await BackendTransport.post(
            `/events/${eventId}/compiled-reports`,
            { reportType }
        );

    }

    getCompiledReportDownloadUrl(reportId) {

        if (!reportId) {
            return "";
        }

        const baseUrl = BackendTransport.getApiBaseUrl() || "";
        return `${baseUrl}/compiled-reports/${reportId}/download`;

    }

    async deleteCompiledReport(reportId) {

        if (!reportId) {
            throw new Error("A report ID is required.");
        }

        return await BackendTransport.delete(
            `/compiled-reports/${reportId}`
        );

    }

    async downloadCompiledReport(reportId, defaultFilename = "report.pdf") {

        if (!reportId) {
            throw new Error("A report ID is required.");
        }

        const url = this.getCompiledReportDownloadUrl(reportId);
        const headers = await BackendTransport.authHeaders();

        const response = await fetch(url, {
            method: "GET",
            headers
        });

        if (!response.ok) {
            let errorText;
            try {
                const errorJson = await response.json();
                errorText = errorJson?.error?.message;
            } catch {
                errorText = response.statusText;
            }
            throw new Error(errorText || `Failed to download report (${response.status})`);
        }

        // Extract filename from Content-Disposition header if provided by server
        let targetFilename = defaultFilename;
        const disposition = response.headers.get("Content-Disposition");
        if (disposition && disposition.includes("filename=")) {
            const match = disposition.match(/filename=["']?([^"';]+)["']?/);
            if (match && match[1]) {
                targetFilename = match[1];
            }
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = targetFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);

    }

}