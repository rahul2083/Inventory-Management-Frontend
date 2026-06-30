// Central re-export — splits api.js into domain-specific service files.
// All components using `import { printerService } from './api'` continue to work unchanged.

import api from './apiClient';
export { API_BASE_URL, API_URL } from './apiClient';

import { authService } from './authService';
import { companyService } from './companyService';
import { productService } from './productService';
import { modelsService } from './modelsService';
import { serialsService } from './serialsService';
import { dispatchService } from './dispatchService';
import { installationsService } from './installationsService';
import { returnsService } from './returnsService';
import { reportsService } from './reportsService';
import { ordersService } from './ordersService';
import { dashboardService } from './dashboardService';
import { exportService } from './exportService';
import { tagsService } from './tagsService';
import { fbfFbaService } from './fbfFbaService';
import { modelApprovalsService } from './modelApprovalsService';

export const printerService = {
    ...authService,
    ...companyService,
    ...productService,
    ...modelsService,
    ...serialsService,
    ...dispatchService,
    ...installationsService,
    ...returnsService,
    ...reportsService,
    ...ordersService,
    ...dashboardService,
    ...exportService,
    ...tagsService,
    ...fbfFbaService,
    ...modelApprovalsService,
};

export default api;
