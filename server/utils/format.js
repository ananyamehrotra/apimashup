function formatNumber(num, unit = '') {
  if (num == null || isNaN(num)) return '0' + (unit ? ` ${unit}` : '');
  const abs = Math.abs(num);
  let str = '';
  if (abs >= 1e9) {
    str = (num / 1e9).toFixed(1).replace(/\.0$/, '') + ' BILLION';
  } else if (abs >= 1e6) {
    str = (num / 1e6).toFixed(1).replace(/\.0$/, '') + ' MILLION';
  } else if (abs >= 1e3) {
    str = (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    str = Math.round(num).toLocaleString('en-US');
  }
  return unit ? `${str} ${unit}` : str;
}

function formatStatRaw(statKey, val) {
  switch (statKey) {
    case 'HP':
      return formatNumber(val, 'PEOPLE');
    case 'DEF':
      return formatNumber(val, 'KM²');
    case 'MP':
      return `${val} ${val === 1 ? 'TONGUE' : 'TONGUES'}`;
    case 'SPD':
      return `${val} ${val === 1 ? 'TIMEZONE' : 'TIMEZONES'}`;
    case 'CHA':
      return `${val} ${val === 1 ? 'NEIGHBOUR' : 'NEIGHBOURS'}`;
    case 'LUK':
      return `${val}`;
    default:
      return formatNumber(val);
  }
}

module.exports = { formatNumber, formatStatRaw };
