import { Pane } from 'tweakpane';

export const PARAMS = {
  NOISE_GATE: 70,
  radius: 65,
  speed: 2,
  minIndex: 4,        
  maxIndexLimit: 16, 
};

if (window.location.hash === '#debug') {
  const pane = new Pane();
  pane.addBinding(
    PARAMS, 'NOISE_GATE',
    { min: 0, max: 400, step: 10 }
  );
  pane.addBinding(
    PARAMS, 'radius',
    { min: 10, max: 100, step: 10 }
  );
  pane.addBinding(
    PARAMS, 'speed',
    { min: 0, max: 100, step: 1 }
  );

  const folder = pane.addFolder({ title: 'Pitch Calibration' });
  folder.addBinding(PARAMS, 'minIndex', { min: 1, max: 20, step: 1 });
  folder.addBinding(PARAMS, 'maxIndexLimit', { min: 10, max: 40, step: 1 });
}