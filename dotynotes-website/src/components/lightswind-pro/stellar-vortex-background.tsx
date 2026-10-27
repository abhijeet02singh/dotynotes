import React from 'react';
import SatinFlow, { type SatinFlowProps } from '../lightswind/satin-flow';

export interface StellarVortexBackgroundProps extends SatinFlowProps {}

/**
 * StellarVortexBackground (alias / wrapper around the WebGL flow background component)
 * Reusable animated organic WebGL background with customizable colors, speed, and scale.
 */
export const StellarVortexBackground: React.FC<StellarVortexBackgroundProps> = (props) => {
  return <SatinFlow {...props} />;
};

export default StellarVortexBackground;
