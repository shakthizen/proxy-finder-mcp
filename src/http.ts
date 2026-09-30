import axios from 'axios';

/** Shared client for talking to proxy-list sources (not for dialing through proxies). */
export const sourceHttp = axios.create({
  timeout: 10_000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
  },
  validateStatus: (status) => status >= 200 && status < 300,
});
