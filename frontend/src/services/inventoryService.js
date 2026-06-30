import axios from 'axios';
import { getStoredToken } from '../utils/auth';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_URL = `${API_BASE_URL}/Inventory`; // Prefix for inventory routes

const getHeaders = () => {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const inventoryService = {
    async getVendors() {
        const res = await axios.get(`${API_URL}/GetVendorList`, { headers: getHeaders() });
        return res.data?.data || [];
    },

    async getStockInCounts() {
        const res = await axios.get(`${API_URL}/GetStockInCounts`, { headers: getHeaders() });
        return res.data; // returns { draftCount, finalizedCount }
    },

    async getStockInDetails(stockInId) {
        const res = await axios.get(`${API_URL}/GetStockInDetails?stockInId=${stockInId}`, { headers: getHeaders() });
        return res.data?.data || [];
    },

    async getLastDraftStockIn() {
        const res = await axios.get(`${API_URL}/GetLastDraftStockIn`, { headers: getHeaders() });
        return res.data?.data || [];
    },

    async getStockInList(status, startDate = "", endDate = "", page = 1, limit = 10) {
        // status 0=Draft, 1=Finalized
        let url = `${API_URL}/GetStockInList?status=${status}&page=${page}&limit=${limit}`;
        if (startDate && endDate) {
            url += `&startDate=${startDate}&endDate=${endDate}`;
        }
        const res = await axios.get(url, { headers: getHeaders() });
        return res.data; // Return full response to get total count
    },

    async deleteStockInDetail(detailId) {
        return axios.post(`${API_URL}/DeleteStockInDetail`, { detailId }, { headers: getHeaders() });
    },

    async getSerialNumbers(detailId) {
        const res = await axios.get(`${API_URL}/GetStockInSerials?detailId=${detailId}`, { headers: getHeaders() });
        return res.data?.data || [];
    },

    async saveStockInSerials(payload) {
        const res = await axios.post(`${API_URL}/SaveStockInSerials`, payload, { headers: getHeaders() });
        return res.data;
    },

    async getUnits() {
        const res = await axios.get(`${API_URL}/GetUnitList`, { headers: getHeaders() });
        return res.data?.data || [];
    },

    async saveComboMapping(data) {
        const res = await axios.post(`${API_URL}/SaveComboMapping`, data, { headers: getHeaders() });
        return res.data;
    },

    async getComboDetails(pvId) {
        const res = await axios.get(`${API_URL}/GetComboDetails/${pvId}`, { headers: getHeaders() });
        return res.data?.data || [];
    },

    async getComboList() {
        const res = await axios.get(`${API_URL}/GetComboList`, { headers: getHeaders() });
        return res.data?.data || [];
    },

    async deleteCombo(parentVariantId) {
        return axios.post(`${API_URL}/DeleteCombo`, { parentVariantId }, { headers: getHeaders() });
    },

    async deleteSerialNumber(serialId) {
        return axios.post(`${API_URL}/DeleteStockInSerial`, { serialId }, { headers: getHeaders() });
    },

    async lookupBarcode(code) {
        const res = await axios.get(`${API_URL}/LookupBarcode?code=${code}`, { headers: getHeaders() });
        return res.data;
    },

    

    async resolveBarcodeForStockIn(code) {
        const res = await axios.get(`${API_URL}/LookupBarcode?code=${code}`, { headers: getHeaders() });
        return res.data?.data || null;
    },

    async saveDraft(payload) {
        return axios.post(`${API_URL}/SaveStockInDraft`, payload, { headers: getHeaders() });
    },

    async finalizeStockIn(stockInId) {
        return axios.post(`${API_URL}/FinalizeStockIn`, { stockInId }, { headers: getHeaders() });
    },

    async revertStockIn(stockInId) {
        return axios.post(`${API_URL}/RevertStockIn`, { stockInId }, { headers: getHeaders() });
    },

    async deleteStockIn(stockInId) {
        return axios.post(`${API_URL}/DeleteStockIn`, { stockInId }, { headers: getHeaders() });
    },

    async deleteDraftStockIn(stockInId) {
        return this.deleteStockIn(stockInId);
    },

    async parseInvoice(formData) {
        const res = await axios.post(`${API_URL}/ParseInvoice`, formData, {
            headers: {
                ...getHeaders()
            }
        });
        return res.data;
    },

    async addVendor(vendorData) {
        const res = await axios.post(`${API_URL}/SaveOrUpdateVendor`, vendorData, { headers: getHeaders() });
        return res.data;
    },

    async saveVendor(vendorData) {
        return this.addVendor(vendorData);
    },

    async getCurrentStock(params = {}) {
        const res = await axios.get(`${API_URL}/GetCurrentStock`, { 
            params,
            headers: getHeaders() 
        });
        return res.data; // Return full response to get totalValue, data, etc.
    },

    async getBrands() {
        const res = await axios.get(`${API_URL}/GetBrandList`, { headers: getHeaders() });
        return res.data?.data || [];
    }
};

export default inventoryService;
