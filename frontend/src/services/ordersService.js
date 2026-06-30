import api from './apiClient';
import { API_BASE_URL, toTrimmedString, toNumber, toNullableString, normalizeDispatchStatus } from './apiClient';

export const ordersService = {
    getOrders: async () => {
        try {
            const res = await api.get(`/orders?_t=${new Date().getTime()}`);
            return res.data;
        } catch (error) {
            console.warn('Error fetching orders:', error.message);
            return [];
        }
    },

    updateOrderStatus: async (id, statusData) => {
        const payload = {
            status: normalizeDispatchStatus(statusData.status),
            trackingId: toTrimmedString(statusData.trackingId, ''),
            reason: toNullableString(statusData.reason)
        };
        const res = await api.put(`/orders/${id}/status`, payload);
        return res.data;
    },

    updatePayment: async (id, paymentData) => {
        const payload = {
            paymentDate: paymentData.paymentDate,
            amount: toNumber(paymentData.amount),
            utrId: toNullableString(paymentData.utrId),
            status: 'Completed'
        };
        const res = await api.put(`/orders/${id}/payment`, payload);
        return res.data;
    },

    replaceOrder: async (id, data) => {
        const payload = {
            oldSerialValue: toTrimmedString(data.oldSerialValue),
            newSerialId: data.newSerialId,
            newSerialValue: toTrimmedString(data.newSerialValue),
            reason: toNullableString(data.reason)
        };
        const res = await api.post(`/orders/${id}/replace`, payload);
        return res.data;
    },

    addOrderItem: async (orderGuid, data) => {
        const payload = {
            newSerialId: data.newSerialId,
            sellingPrice: toNumber(data.sellingPrice),
            warranty: toNullableString(data.warranty),
            addedBy: toNullableString(data.addedBy)
        };
        const res = await api.post(`/orders/${orderGuid}/items`, payload);
        return res.data;
    },

    uploadOrderDocument: async (id, file, docType) => {
        console.log(`📤 Uploading document — ID: ${id}, DocType: ${docType}, File: ${file?.name}`);
        if (!id) throw new Error('Order item ID is required for document upload');
        if (!file) throw new Error('File is required for document upload');
        if (!(file instanceof File)) throw new Error('Invalid file selected for document upload');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('docType', docType);
        try {
            const res = await api.post(`/orders/${id}/upload`, formData, {
                timeout: 60000,
                headers: { 'Content-Type': undefined }
            });
            console.log(`✅ Upload successful [${docType}]:`, res.data);
            return res.data;
        } catch (error) {
            console.error(`❌ Upload failed [${docType}]:`, error.message);
            console.error('Response:', error.response?.data);
            throw error;
        }
    },

    deleteOrderDocument: async (filename) => {
        const res = await api.delete(`/orders/documents`, { data: { filename } });
        return res.data;
    },

    uploadEwayBill: async (dispatchId, file) => {
        console.log(`📤 Uploading E-Way Bill — Dispatch ID: ${dispatchId}, File: ${file?.name}`);
        if (!dispatchId) throw new Error('Dispatch ID is required for E-Way Bill upload');
        if (!file) throw new Error('File is required for E-Way Bill upload');
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) throw new Error('Invalid file type. Only PDF, JPG, PNG, and WEBP are allowed for E-Way Bill.');
        if (file.size > 10 * 1024 * 1024) throw new Error('File size exceeds 10MB limit.');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('docType', 'ewayBill');
        try {
            const res = await api.post(`/orders/${dispatchId}/upload`, formData);
            console.log('✅ E-Way Bill uploaded successfully:', res.data);
            return res.data;
        } catch (error) {
            console.error('❌ E-Way Bill upload failed:', error.message);
            console.error('Response:', error.response?.data);
            throw error;
        }
    },

    getEwayBillUrl: (filename) => {
        if (!filename) return null;
        return `${API_BASE_URL}/uploads/${filename}`;
    },

    validateEwayBillRequired: (orderValue) => {
        const threshold = 50000;
        const isRequired = Number(orderValue) > threshold;
        return {
            isRequired,
            threshold,
            message: isRequired ? `E-Way Bill is mandatory for orders above ₹${threshold.toLocaleString('en-IN')}` : null
        };
    }
};
