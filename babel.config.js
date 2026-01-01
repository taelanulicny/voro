module.exports = function (api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    env: {
      production: {
        plugins: [
          // Strip console logs in production
          // Note: This is a simple approach. For more advanced stripping,
          // consider using babel-plugin-transform-remove-console
          [
            'transform-remove-console',
            {
              exclude: ['error', 'warn'], // Keep errors and warnings in production
            },
          ],
        ],
      },
    },
  };
};



