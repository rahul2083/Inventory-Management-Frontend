import api from './apiClient';
import { toTrimmedString, toNullableString, toNullableNumber, collapseDuplicateColumnValue } from './apiClient';

export const returnsService = {
    getReturns: async () => {
        try {
            console.log('📥 Fetching returns...');
            const res = await api.get(`/returns?_t=${new Date().getTime()}`);
            const rows = Array.isArray(res.data) ? res.data : [];
            return rows.map((item) => ({
                ...item,
                serialValue: toTrimmedString(collapseDuplicateColumnValue(item.serialValue), ''),
                firmName: toNullableString(collapseDuplicateColumnValue(item.firmName)),
                customerName: toNullableString(collapseDuplicateColumnValue(item.customerName)),
                invoiceNumber: toNullableString(collapseDuplicateColumnValue(item.invoiceNumber))
            }));
        } catch (error) {
            console.error('❌ Failed to fetch returns:', error.message);
            console.error('Full error:', error.response?.data);
            return [];
        }
    },

    getReturnLookup: async (serialValue) => {
        const trimmedSerial = toTrimmedString(serialValue);
        if (!trimmedSerial) throw new Error('Serial number is required');
        const res = await api.get('/returns/lookup', {
            params: { serialValue: trimmedSerial, _t: new Date().getTime() }
        });
        return res.data;
    },

    getSerialHistory: async (serialId) => {
        const safeId = toNullableNumber(serialId);
        if (!safeId) throw new Error('Serial ID is required');
        const res = await api.get(`/serials/${safeId}/history?_t=${new Date().getTime()}`);
        return res.data;
    },

    addReturn: async (data, conditionParam, reasonParam) => {
        console.log('📤 Adding return - Raw input:', { data, conditionParam, reasonParam });
        let payload;
        if (typeof data === 'object' && data !== null && !conditionParam) {
            payload = {
                serialValue: (data.serialValue || data.serialNumber || data.serial)?.toString().trim(),
                condition: data.condition || 'Good',
                reason: (data.reason || data.remarks || '')?.toString().trim(),
                dispatchId: data.dispatchId || null,
                returnDate: data.returnDate || new Date().toISOString(),
                returnedBy: data.returnedBy || data.user || 'Unknown',
                itemVariantId: data.itemVariantId || null,
                quantity: data.quantity || 1,
                isInventoryItem: data.isInventoryItem || false
            };
        } else {
            payload = {
                serialValue: data?.toString().trim(),
                condition: conditionParam || 'Good',
                reason: (reasonParam || '')?.toString().trim(),
                returnDate: new Date().toISOString(),
                returnedBy: 'Unknown',
                quantity: 1
            };
        }
        console.log('📦 Return payload:', payload);
        if (!payload.serialValue && !payload.itemVariantId) throw new Error('Serial number or Item Variant is required for return');
        if (!payload.reason) throw new Error('Return reason is required');
        const validConditions = ['Good', 'InStock', 'Damaged', 'Defective', 'Refurbished', 'Other'];
        if (!validConditions.includes(payload.condition)) {
            console.warn(`⚠️ Invalid condition "${payload.condition}", defaulting to "Good"`);
            payload.condition = 'Good';
        }
        try {
            const res = await api.post('/returns', payload);
            console.log('✅ Return added successfully:', res.data);
            return res.data;
        } catch (error) {
            console.error('❌ Failed to add return:', error.message);
            console.error('Response:', error.response?.data);
            console.error('Status:', error.response?.status);
            throw error;
        }
    },

    updateReturn: async (id, data) => {
        console.log('📝 Updating return:', { id, data });
        if (!id) throw new Error('Return ID is required for update');
        const payload = {
            condition: data.condition,
            reason: data.reason?.trim() || data.remarks?.trim() || '',
            status: data.status,
            ...(data.restoredToStock !== undefined && { restoredToStock: data.restoredToStock })
        };
        Object.keys(payload).forEach(key => { if (payload[key] === undefined) delete payload[key]; });
        try {
            const res = await api.put(`/returns/${id}`, payload);
            console.log('✅ Return updated successfully:', res.data);
            return res.data;
        } catch (error) {
            console.error('❌ Failed to update return:', error.message);
            console.error('Response:', error.response?.data);
            throw error;
        }
    },

    deleteReturn: async (item) => {
        console.log('🗑️ Deleting return - Raw input:', item);
        let id = null;
        if (typeof item === 'string' || typeof item === 'number') {
            id = item;
        } else if (item && typeof item === 'object') {
            id = item._id || item.id || item.returnId || item.return_id || item.Id || item.ID;
        }
        console.log('🔑 Extracted ID:', id);
        if (!id) {
            console.error('❌ No valid ID found. Full item received:', JSON.stringify(item, null, 2));
            throw new Error('No valid ID found for this return record. Please refresh and try again.');
        }
        try {
            const res = await api.delete(`/returns/${id}`);
            console.log('✅ Return deleted successfully:', res.data);
            return res.data;
        } catch (error) {
            console.error('❌ Failed to delete return:', error.message);
            console.error('Response:', error.response?.data);
            console.error('Status:', error.response?.status);
            if (error.response?.status === 404) throw new Error('Return record not found. It may have been already deleted.');
            throw error;
        }
    },

    bulkDeleteReturns: async (ids) => {
        console.log('🗑️ Bulk deleting returns:', ids);
        if (!ids || !Array.isArray(ids) || ids.length === 0) throw new Error('No IDs provided for bulk delete');
        try {
            const res = await api.post('/returns/bulk-delete', { ids });
            console.log('✅ Bulk delete successful:', res.data);
            return res.data;
        } catch (error) {
            console.error('❌ Failed to bulk delete returns:', error.message);
            throw error;
        }
    },

    restoreReturnToStock: async (id) => {
        console.log('🔄 Restoring return to stock:', id);
        if (!id) throw new Error('Return ID is required');
        try {
            const res = await api.post(`/returns/${id}/restore-to-stock`);
            console.log('✅ Restored to stock:', res.data);
            return res.data;
        } catch (error) {
            console.error('❌ Failed to restore to stock:', error.message);
            throw error;
        }
    },

    getReturnById: async (id) => {
        console.log('📥 Fetching return by ID:', id);
        if (!id) throw new Error('Return ID is required');
        try {
            const res = await api.get(`/returns/${id}?_t=${new Date().getTime()}`);
            console.log('✅ Return fetched:', res.data);
            return res.data;
        } catch (error) {
            console.error('❌ Failed to fetch return:', error.message);
            throw error;
        }
    },

    getReturnStats: async () => {
        try {
            const res = await api.get(`/returns/stats?_t=${new Date().getTime()}`);
            return res.data;
        } catch (error) {
            console.warn('Failed to fetch return stats:', error.message);
            return { total: 0, good: 0, damaged: 0, defective: 0, restoredToStock: 0 };
        }
    }
};
