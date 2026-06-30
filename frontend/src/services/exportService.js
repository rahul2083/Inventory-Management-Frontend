import api from './apiClient';

export const exportService = {
    searchItems: async (query, type = 'all') => {
        const params = new URLSearchParams();
        params.append('q', query);
        params.append('type', type);
        const res = await api.get(`/search?${params.toString()}`);
        return res.data;
    },

    exportData: async (type, format = 'csv', filters = {}) => {
        const params = new URLSearchParams();
        params.append('format', format);
        Object.keys(filters).forEach(key => { if (filters[key]) params.append(key, filters[key]); });
        const res = await api.get(`/export/${type}?${params.toString()}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${type}_${Date.now()}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        return true;
    },

    exportInstallations: async (format = 'csv', filters = {}) => {
        const params = new URLSearchParams();
        params.append('format', format);
        if (filters.status) params.append('status', filters.status);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        const res = await api.get(`/export/installations?${params.toString()}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `installations_${Date.now()}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        return true;
    },

    exportReturns: async (format = 'csv', filters = {}) => {
        const params = new URLSearchParams();
        params.append('format', format);
        if (filters.condition) params.append('condition', filters.condition);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        const res = await api.get(`/export/returns?${params.toString()}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `returns_${Date.now()}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        return true;
    },

    exportDispatches: async (format = 'csv', filters = {}) => {
        const params = new URLSearchParams();
        params.append('format', format);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.status) params.append('status', filters.status);
        const res = await api.get(`/export/dispatches?${params.toString()}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `dispatches_${Date.now()}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        return true;
    }
};
