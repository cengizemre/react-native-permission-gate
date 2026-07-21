/* global jest */
// react-native-permissions touches native TurboModules at import time. Its
// official mock keeps the module importable under Jest; our hook tests still
// inject their own mock adapter for behaviour.
jest.mock('react-native-permissions', () =>
  require('react-native-permissions/mock')
);
