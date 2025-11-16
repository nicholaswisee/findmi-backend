const noop = () => {};

const isProduction = process.env.NODE_ENV === 'production';

export function silenceConsoleLogsInProduction() {
  if (!isProduction) {
    return;
  }

  // Suppress noisy console outputs in production
  console.log = noop;
  console.debug = noop;
  console.info = noop;
}
