import type { Configuration } from 'webpack';

import { rules as baseRules } from './webpack.rules';
import { plugins } from './webpack.plugins';

// Create a new array for renderer-specific rules to avoid mutating the shared baseRules
const rendererRules = [
  ...baseRules, // Copy the base rules
  {
    test: /\.css$/,
    use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
  },
];

export const rendererConfig: Configuration = {
  module: {
    rules: rendererRules, // Use the new, separate array
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};
