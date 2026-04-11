export interface TimeZoneOption {
  label: string;
  country: string;
  timeZone: string;
  offsetLabel: string;
  localTimeLabel: string;
  searchText: string;
}

const STORAGE_KEY = 'preferredTimeZone';

const fallbackTimeZones = [
  'UTC',
  'Europe/Riga',
  'Europe/Vilnius',
  'Europe/Tallinn',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Kyiv',
  'Europe/Paris',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Warsaw',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Tbilisi',
  'Asia/Yerevan',
  'Asia/Almaty',
  'Asia/Tashkent',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Australia/Perth',
  'Pacific/Auckland',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'America/St_Johns',
  'America/Halifax',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
];

const getSupportedTimeZones = () => {
  const intlWithSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };

  if (typeof intlWithSupportedValues.supportedValuesOf === 'function') {
    try {
      return Array.from(new Set(['UTC', ...intlWithSupportedValues.supportedValuesOf('timeZone')]));
    } catch {
      return fallbackTimeZones;
    }
  }

  return fallbackTimeZones;
};

const humanizeSegment = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

const getTimeZoneLabel = (timeZone: string) => {
  if (timeZone === 'UTC') {
    return 'UTC';
  }

  const parts = timeZone.split('/');
  const place = humanizeSegment(parts[parts.length - 1] ?? timeZone);
  const region = parts.slice(0, -1).map(humanizeSegment).join(' / ');

  return region ? `${place} (${region})` : place;
};

const getRegionLabel = (timeZone: string) => {
  if (timeZone === 'UTC') {
    return 'UTC';
  }

  return timeZone
    .split('/')
    .slice(0, -1)
    .map(humanizeSegment)
    .join(' / ') || 'Global';
};

const normalizeOffsetLabel = (value?: string) => {
  if (!value || value === 'GMT' || value === 'UTC') {
    return {
      label: 'UTC+00:00',
      minutes: 0,
    };
  }

  const match = value.match(/GMT(?<sign>[+-])(?<hours>\d{1,2})(?::(?<minutes>\d{2}))?/);
  if (!match?.groups) {
    return {
      label: value.replace('GMT', 'UTC'),
      minutes: 0,
    };
  }

  const sign = match.groups.sign === '-' ? -1 : 1;
  const hours = match.groups.hours.padStart(2, '0');
  const minutes = (match.groups.minutes ?? '00').padStart(2, '0');

  return {
    label: `UTC${sign === -1 ? '-' : '+'}${hours}:${minutes}`,
    minutes: sign * (Number(hours) * 60 + Number(minutes)),
  };
};

const getTimeZoneOffsetDetails = (timeZone: string, date = new Date()) => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    });
    const value = formatter
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value;

    return normalizeOffsetLabel(value);
  } catch {
    return normalizeOffsetLabel('UTC');
  }
};

const getTimeZoneLocalTimeLabel = (timeZone: string, date = new Date()) => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).format(date);
  } catch {
    return 'Unknown time';
  }
};

const buildTimeZoneOptions = (): TimeZoneOption[] =>
  getSupportedTimeZones()
    .map((timeZone) => {
      const { label: offsetLabel, minutes } = getTimeZoneOffsetDetails(timeZone);
      const label = getTimeZoneLabel(timeZone);
      const country = getRegionLabel(timeZone);
      const localTimeLabel = getTimeZoneLocalTimeLabel(timeZone);

      return {
        label,
        country,
        timeZone,
        offsetLabel,
        localTimeLabel,
        searchText: `${label} ${country} ${timeZone} ${offsetLabel}`.toLowerCase(),
        sortKey: `${String(minutes + 24 * 60).padStart(4, '0')}-${label}`,
      };
    })
    .sort((left, right) => left.sortKey.localeCompare(right.sortKey))
    .map(({ sortKey: _sortKey, ...option }) => option);

export const timeZoneOptions: TimeZoneOption[] = buildTimeZoneOptions();

export const getPreferredTimeZone = (): string => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return timeZoneOptions.some((option) => option.timeZone === stored)
      ? stored
      : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
};

export const setPreferredTimeZone = (timeZone: string) => {
  localStorage.setItem(STORAGE_KEY, timeZone);
};

export const formatDateTimeForTimeZone = (value?: string | null, timeZone = getPreferredTimeZone()) => {
  if (!value) {
    return 'No data yet';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'No data yet';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone,
  }).format(parsed);
};

export const formatShortDateTimeForTimeZone = (value: Date, timeZone = getPreferredTimeZone()) =>
  new Intl.DateTimeFormat('en-GB', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(value);

export const formatShortTimeForTimeZone = (value: Date, timeZone = getPreferredTimeZone()) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(value);

export const getTimeZoneOffsetLabel = (timeZone: string) => {
  return getTimeZoneOffsetDetails(timeZone).label;
};

export const getTimeZoneOption = (timeZone: string) =>
  timeZoneOptions.find((option) => option.timeZone === timeZone);
