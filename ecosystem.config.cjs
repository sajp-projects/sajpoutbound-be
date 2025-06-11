module.exports = {
  apps: [
    {
      name: 'api-outmanage',
      script: 'dist/index.js',
      interpreter: 'node',
      node_args: ['--input-type=commonjs'],
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
