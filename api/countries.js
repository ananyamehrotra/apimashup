import { fetchAllCountries } from '../server/upstream.js';

export default async function handler(req, res) {
  try {
    const countries = await fetchAllCountries(process.env.COUNTRY_API);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(countries);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
