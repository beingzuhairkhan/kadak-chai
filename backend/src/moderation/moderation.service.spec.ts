import { classifyRedisFailure, isHeapPressure } from './moderation.utils';

describe('moderation queue safety checks', () => {
  it('skips queue work at or above the configured heap pressure threshold', () => {
    expect(isHeapPressure(84, 100)).toBe(false);
    expect(isHeapPressure(85, 100)).toBe(true);
  });

  it('classifies Redis OOM, timeout, and connection failures', () => {
    expect(
      classifyRedisFailure(
        new Error("OOM command not allowed when used memory > 'maxmemory'"),
      ),
    ).toBe('oom');
    expect(
      classifyRedisFailure(
        Object.assign(new Error('connect failed'), { code: 'ETIMEDOUT' }),
      ),
    ).toBe('timeout');
    expect(
      classifyRedisFailure(
        Object.assign(new Error('connect failed'), { code: 'ECONNREFUSED' }),
      ),
    ).toBe('unavailable');
  });
});
