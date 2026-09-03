import BackendTransport from "./BackendTransport";

export default class ConfigurationService {

    /**
     * Backend Transport instance for making API requests.
     * @type {BackendTransport}
     */
    transport;

    constructor() {
        this.transport = BackendTransport;
    }

    //
    // Configuration Groups
    //

    async getGroups() {

        return this.transport.get(
            "/configuration-groups"
        );

    }

    async getGroup(id) {

        return this.transport.get(
            `/configuration-groups/${id}`
        );

    }

    async createGroup(group) {

        return this.transport.post(
            "/configuration-groups",
            group
        );

    }

    async updateGroup(id, group) {

        return this.transport.put(
            `/configuration-groups/${id}`,
            group
        );

    }

    /**
     * Delete a configuration group.
     *
     * @param {string} id
     *
     * @returns {Promise<Object>}
     * The response from the backend.
     */
    async deleteGroup(id) {

        return this.transport.delete(
            `/configuration-groups/${id}`
        );

    }

    //
    // Configurations
    //

    async getConfigurations() {

        return this.transport.get(
            "/configurations"
        );

    }

    async getConfiguration(id) {

        return this.transport.get(
            `/configurations/${id}`
        );

    }

    async createConfiguration(configuration) {

        return this.transport.post(
            "/configurations",
            configuration
        );

    }

    async updateConfiguration(id, configuration) {

        return this.transport.put(
            `/configurations/${id}`,
            configuration
        );

    }

    async deleteConfiguration(id) {

        return this.transport.delete(
            `/configurations/${id}`
        );

    }

}