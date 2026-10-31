import { uploadRound } from './api';

const URL = 'http://server:8080';

function serverAnswers(status: number) {
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status });
}

describe('uploadRound', () => {
  it('posts the round as JSON to the rounds endpoint', async () => {
    serverAnswers(201);
    await uploadRound({ clientId: 'abc' }, URL);
    const [url, options] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('http://server:8080/api/v1/rounds');
    expect(options.method).toBe('POST');
    expect(options.body).toBe('{"clientId":"abc"}');
  });

  it('counts 201 as success', async () => {
    serverAnswers(201);
    expect(await uploadRound({}, URL)).toEqual({ ok: true });
  });

  it('counts 200 as success: the server already had this round from a retry', async () => {
    serverAnswers(200);
    expect(await uploadRound({}, URL)).toEqual({ ok: true });
  });

  it('reports a 4xx as rejected', async () => {
    serverAnswers(400);
    expect(await uploadRound({}, URL)).toEqual({ ok: false, reason: 'rejected' });
  });

  it('reports a 5xx as a server problem', async () => {
    serverAnswers(500);
    expect(await uploadRound({}, URL)).toEqual({ ok: false, reason: 'server' });
  });

  it('reports no connection as offline', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    expect(await uploadRound({}, URL)).toEqual({ ok: false, reason: 'offline' });
  });

  it('is offline when there is no server address', async () => {
    globalThis.fetch = jest.fn();
    expect(await uploadRound({}, null)).toEqual({ ok: false, reason: 'offline' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
