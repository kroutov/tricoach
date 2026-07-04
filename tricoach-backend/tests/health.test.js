"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../src/app");
describe('GET /health', () => {
    it('returns 200 with service status', async () => {
        const app = (0, app_1.createApp)();
        const res = await (0, supertest_1.default)(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok', service: 'tricoach-backend' });
    });
});
describe('unimplemented API modules', () => {
    it('returns 501 for routes not yet built (Phase 2)', async () => {
        const app = (0, app_1.createApp)();
        const res = await (0, supertest_1.default)(app).get('/api/v1/plans');
        expect(res.status).toBe(501);
        expect(res.body.module).toBe('plans');
    });
});
//# sourceMappingURL=health.test.js.map