import { MakeLogger } from './logger';

const logObject = { test: 5 };
const logObject2 = { test: 10 };
const logString = 'Something happened';

describe('Logger tests', () => {
  describe('When an annotation is provided', () => {
    test('And the first parameter is an object, it adds a string with the annotation', () => {
      const mockLog = jest.fn();
      const logger = MakeLogger({ log: mockLog }, 'UID2');
      logger.log(logObject, logObject2);
      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith('[UID2]', logObject, logObject2);
    });

    test('And the first parameter is a string, it adds the annotation to the string', () => {
      const mockLog = jest.fn();
      const logger = MakeLogger({ log: mockLog }, 'UID2');
      logger.log(logString, logObject, logObject2);
      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith(`[UID2] ${logString}`, logObject, logObject2);
    });
  });

  describe('When a null function is provided', () => {
    it(`Doesn't crash`, () => {
      const logger = MakeLogger({}, 'UID2');
      logger.log(logString);
    });
  });
});
