// Jest setup for Our Casa tests
// Mock AsyncStorage for testing
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  clear: jest.fn(),
}));

// O «hoje» das provas é fixo.
//
// O `TODAY` da app passou a vir do relógio (ver `src/format.js`), e há provas
// escritas contra offsets de 20/08/2026 — «21 dias», «já passou», «8 dias».
// Sem isto, elas mudavam de resultado a cada dia e falhavam sozinhas numa
// terça-feira qualquer, com o código intacto.
//
// É a mesma data das capturas de `docs/referencia`, para as duas coisas
// continuarem a falar do mesmo dia.
process.env.EXPO_PUBLIC_HOJE = '2026-08-20';
