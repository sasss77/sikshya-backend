// Mock uuid v4 to return a deterministic value during tests
export const v4 = jest.fn(() => "test-uuid-1234-5678-abcd-ef0123456789");
