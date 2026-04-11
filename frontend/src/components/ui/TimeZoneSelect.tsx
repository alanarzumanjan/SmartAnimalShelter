import React from 'react';
import { Check, ChevronDown, Clock3, Search } from 'lucide-react';
import { getTimeZoneOption, timeZoneOptions } from '@/services/timezone.service';

interface TimeZoneSelectProps {
  timeZone: string;
  onChange: (timeZone: string) => void;
}

const TimeZoneSelect: React.FC<TimeZoneSelectProps> = ({ timeZone, onChange }) => {
  const [query, setQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const deferredQuery = React.useDeferredValue(query.trim().toLowerCase());
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const selectedOption = getTimeZoneOption(timeZone);
  const filteredOptions = React.useMemo(
    () => timeZoneOptions.filter((option) => (deferredQuery ? option.searchText.includes(deferredQuery) : true)),
    [deferredQuery]
  );

  const optionsToRender =
    selectedOption && !filteredOptions.some((option) => option.timeZone === selectedOption.timeZone)
      ? [selectedOption, ...filteredOptions]
      : filteredOptions;

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else if (query) {
      setQuery('');
    }
  }, [isOpen, query]);

  const handleSelect = (nextTimeZone: string) => {
    onChange(nextTimeZone);
    setIsOpen(false);
  };

  return (
    <div ref={rootRef} className="relative inline-flex max-w-full">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="inline-flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-indigo-500/15 dark:text-indigo-300">
          <Clock3 className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Time zone
          </div>
          <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
            {selectedOption?.offsetLabel ?? timeZone} • {selectedOption?.label ?? timeZone}
          </div>
        </div>
        <ChevronDown
          className={[
            'h-4 w-4 shrink-0 text-slate-400 transition-transform',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(92vw,28rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-3 dark:border-slate-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search city, region, IANA zone, or UTC..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-10 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {optionsToRender.length} matching time zones
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {optionsToRender.length === 0 ? (
              <div className="rounded-xl px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No time zones found for this search.
              </div>
            ) : (
              optionsToRender.map((option) => {
                const isSelected = option.timeZone === timeZone;

                return (
                  <button
                    key={option.timeZone}
                    type="button"
                    onClick={() => handleSelect(option.timeZone)}
                    className={[
                      'flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                      isSelected
                        ? 'bg-primary-50 text-primary-900 dark:bg-indigo-500/15 dark:text-white'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/80',
                    ].join(' ')}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{option.label}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {option.offsetLabel}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {option.timeZone} · Local time: {option.localTimeLabel}
                      </div>
                    </div>
                    {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-600 dark:text-indigo-300" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeZoneSelect;
