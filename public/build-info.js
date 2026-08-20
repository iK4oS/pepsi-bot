const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const BUILD_INFO_URL = '/build-info.json';

export function buildInfoPayload(data) {
  if (!/^[0-9a-f]{40}$/i.test(data?.sha ?? '')) return null;
  const isoDate = data?.date;
  const date = new Date(isoDate);
  if (!isoDate || Number.isNaN(date.getTime())) return null;

  const shortSha = data.sha.slice(0, 8);
  const day = date.getUTCDate();
  const month = MONTHS[date.getUTCMonth()];
  const year = String(date.getUTCFullYear()).slice(-2);
  return {
    label: `#${shortSha} @ ${day} ${month} '${year}`,
    href: `https://github.com/iK4oS/pepsi-bot/commit/${data.sha}`,
    isoDate
  };
}
