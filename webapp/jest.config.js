module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['@testing-library/jest-dom'],
    globals: {'ts-jest': {tsconfig: {jsx: 'react', esModuleInterop: true, strict: true, skipLibCheck: true}}},
};
