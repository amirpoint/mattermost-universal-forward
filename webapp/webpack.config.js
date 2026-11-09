const path = require('path');

module.exports = {
    entry: './src/index.tsx',
    resolve: {extensions: ['.ts', '.tsx', '.js']},
    module: {rules: [{test: /\.tsx?$/, loader: 'ts-loader', exclude: /node_modules/}]},
    externals: {
        react: 'React',
        'react-dom': 'ReactDOM',
        redux: 'Redux',
        'react-redux': 'ReactRedux',
        'react-bootstrap': 'ReactBootstrap',
    },
    output: {path: path.resolve(__dirname, 'dist'), filename: 'main.js'},
};
