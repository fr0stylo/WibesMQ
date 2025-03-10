import { resolve4 } from 'node:dns/promises';
import { networkInterfaces } from 'node:os';

export async function getExistingSiblings(domain: string) {
  const inet = networkInterfaces();
  const ownIps: Array<string> = [];
  for (const iface in inet) {
    if (iface !== 'lo') {
      ownIps.push(...(inet[iface]?.filter((x) => x.family === 'IPv4').map((x) => x.address) ?? []));
    }
  }

  const resolution = await resolve4(domain);
  const siblings = resolution.filter((x) => ownIps.indexOf(x) < 0);

  return siblings;
}
