import api from './apiClient';

export const reportsService = {
    getReports: async (startDate, endDate) => {
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            params.append('_t', new Date().getTime());
            const res = await api.get(`/reports?${params.toString()}`);
            if (res.data && res.data.transactions) {
                res.data.transactions = res.data.transactions.map(t => ({
                    ...t,
                    customerName: t.customerName || t.customer || t.customer_name || 'N/A'
                }));
            }
            return res.data;
        } catch (error) {
            console.warn('Failed to fetch reports:', error.message);
            return null;
        }
    },

    saveReportSnapshot: async (payload) => {
        const res = await api.post('/reports/save', payload);
        return res.data;
    },

    searchOrderForReturn: async (query) => {
        const res = await api.get(`/Inventory/SearchOrderForReturn?query=${query}`);
        return res.data;
    },

    saveStationeryReturn: async (data) => {
        const res = await api.post('/Inventory/SaveStationeryReturn', data);
        return res.data;
    },

    getStationeryReturnsHistory: async () => {
        const res = await api.get('/Inventory/GetStationeryReturnsHistory');
        return res.data;
    },

    updateStationeryCompensation: async (data) => {
        const res = await api.post('/Inventory/UpdateStationeryCompensation', data);
        return res.data;
    },

    getInventoryReport: async () => {
        const res = await api.get(`/reports/inventory?_t=${new Date().getTime()}`);
        return res.data;
    },

    getSalesReport: async (startDate, endDate) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('_t', new Date().getTime());
        const res = await api.get(`/reports/sales?${params.toString()}`);
        return res.data;
    },

    getInstallationReport: async (startDate, endDate) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('_t', new Date().getTime());
        const res = await api.get(`/reports/installations?${params.toString()}`);
        return res.data;
    },

    saveReport: async (reportData) => {
        const res = await api.post('/reports/save', reportData);
        return res.data;
    },

    getSavedReports: async () => {
        const res = await api.get('/reports/saved');
        return res.data;
    }
};
