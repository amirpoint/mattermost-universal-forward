module.exports = {
    preset: 'ts-jest',
    globalSetup: './jest.global-setup.js',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['@testing-library/jest-dom'],
    globals: {'ts-jest': {tsconfig: {jsx: 'react', esModuleInterop: true, strict: true, skipLibCheck: true}}},
};
