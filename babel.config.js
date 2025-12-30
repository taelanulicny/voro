module.exports = function (api) {
  api.cache(true);
  const isProduction = api.env('production');
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Strip console logs in production
      // Note: This is a simple approach. For more advanced stripping,
      // consider using babel-plugin-transform-remove-console
      isProduction && [
        'transform-remove-console',
        {
          exclude: ['error', 'warn'], // Keep errors and warnings in production
        },
      ],
    ].filter(Boolean),
  };
};



