'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  value: string;
  onChange: (localDatetime: string) => void;
  minDate?: Date;
  label?: string;
}

const dayNames = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const hours = [
  { h: 7, label: '7:00 AM' }, { h: 8, label: '8:00 AM' }, { h: 9, label: '9:00 AM' },
  { h: 10, label: '10:00 AM' }, { h: 11, label: '11:00 AM' }, { h: 12, label: '12:00 PM' },
  { h: 13, label: '1:00 PM' }, { h: 14, label: '2:00 PM' }, { h: 15, label: '3:00 PM' },
  { h: 16, label: '4:00 PM' }, { h: 17, label: '5:00 PM' }, { h: 18, label: '6:00 PM' },
  { h: 19, label: '7:00 PM' }, { h: 20, label: '8:00 PM' },
];

const minutes = [0, 15, 30, 45];

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toLocalDatetimeString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function DateTimePicker({ value, onChange, minDate, label }: DateTimePickerProps) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const dayAfter = new Date(today.getTime() + 2 * 86400000);

  // Parse current value
  const parsed = value ? new Date(value) : null;
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    parsed ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()) : null
  );
  const [selectedHour, setSelectedHour] = useState<number | null>(parsed ? parsed.getHours() : null);
  const [selectedMinute, setSelectedMinute] = useState<number>(parsed ? parsed.getMinutes() : 0);

  // Calendar navigation
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    let startDow = firstDay.getDay() - 1; // Monday = 0
    if (startDow < 0) startDow = 6;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(viewYear, viewMonth, d));
    }
    return days;
  }, [viewMonth, viewYear]);

  function selectDate(date: Date) {
    setSelectedDate(date);
    emitChange(date, selectedHour, selectedMinute);
  }

  function selectHour(h: number) {
    setSelectedHour(h);
    emitChange(selectedDate, h, selectedMinute);
  }

  function selectMinute(m: number) {
    setSelectedMinute(m);
    emitChange(selectedDate, selectedHour, m);
  }

  function emitChange(date: Date | null, hour: number | null, minute: number) {
    if (!date || hour === null) return;
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
    onChange(toLocalDatetimeString(d));
  }

  function isDateDisabled(date: Date): boolean {
    return date < today;
  }

  function isHourDisabled(h: number): boolean {
    if (!selectedDate || !minDate) return false;
    if (isSameDay(selectedDate, today)) {
      const candidate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), h, 59);
      return candidate < minDate;
    }
    return false;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }

  // Preview
  const preview = useMemo(() => {
    if (!selectedDate || selectedHour === null) return null;
    const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), selectedHour, selectedMinute);
    return d.toLocaleString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, [selectedDate, selectedHour, selectedMinute]);

  return (
    <div className="space-y-4">
      {label && <p className="text-sm font-medium text-redin-earth-700">{label}</p>}

      <div className="flex flex-col md:flex-row gap-4">
        {/* Date section */}
        <div className="flex-1 space-y-3">
          <p className="text-xs font-medium text-redin-earth-500 uppercase tracking-wide">Fecha</p>

          {/* Quick buttons */}
          <div className="flex gap-2">
            {[
              { label: 'Hoy', date: today },
              { label: 'Manana', date: tomorrow },
              { label: 'Pasado', date: dayAfter },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => selectDate(opt.date)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  selectedDate && isSameDay(selectedDate, opt.date)
                    ? 'bg-redin-gold-400 text-white'
                    : 'bg-redin-earth-100 text-redin-earth-600 hover:bg-redin-earth-200'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Mini calendar */}
          <div className="border border-redin-earth-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={prevMonth} className="p-1 rounded hover:bg-redin-earth-100">
                <ChevronLeft className="h-4 w-4 text-redin-earth-500" />
              </button>
              <span className="text-sm font-medium text-redin-earth-700">
                {monthNames[viewMonth]} {viewYear}
              </span>
              <button type="button" onClick={nextMonth} className="p-1 rounded hover:bg-redin-earth-100">
                <ChevronRight className="h-4 w-4 text-redin-earth-500" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {dayNames.map((d) => (
                <div key={d} className="text-[10px] font-medium text-redin-earth-400 py-1">{d}</div>
              ))}
              {calendarDays.map((date, i) => (
                <div key={i} className="aspect-square flex items-center justify-center">
                  {date ? (
                    <button
                      type="button"
                      disabled={isDateDisabled(date)}
                      onClick={() => selectDate(date)}
                      className={cn(
                        'h-8 w-8 rounded-full text-xs transition-colors',
                        isDateDisabled(date) && 'text-redin-earth-300 cursor-not-allowed',
                        !isDateDisabled(date) && 'hover:bg-redin-gold-50 text-redin-earth-700',
                        selectedDate && isSameDay(selectedDate, date) && 'bg-redin-gold-400 text-white hover:bg-redin-gold-500',
                        isSameDay(date, today) && !(selectedDate && isSameDay(selectedDate, date)) && 'font-bold'
                      )}
                    >
                      {date.getDate()}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Time section */}
        <div className="flex-1 space-y-3">
          <p className="text-xs font-medium text-redin-earth-500 uppercase tracking-wide">Hora</p>

          {/* Hour grid */}
          <div className="grid grid-cols-4 gap-1.5">
            {hours.map(({ h, label: lbl }) => (
              <button
                key={h}
                type="button"
                disabled={isHourDisabled(h)}
                onClick={() => selectHour(h)}
                className={cn(
                  'px-2 py-2 rounded-lg text-xs font-medium transition-colors',
                  isHourDisabled(h) && 'text-redin-earth-300 cursor-not-allowed bg-redin-earth-50',
                  !isHourDisabled(h) && 'hover:bg-redin-forest-50 text-redin-earth-600',
                  selectedHour === h && 'bg-redin-forest-600 text-white hover:bg-redin-forest-700'
                )}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Minute selector */}
          {selectedHour !== null && (
            <div>
              <p className="text-xs text-redin-earth-400 mb-1.5">Minutos</p>
              <div className="flex gap-2">
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => selectMinute(m)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-xs font-medium transition-colors',
                      selectedMinute === m
                        ? 'bg-redin-forest-600 text-white'
                        : 'bg-redin-earth-100 text-redin-earth-600 hover:bg-redin-earth-200'
                    )}
                  >
                    :{String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="mt-3 p-3 bg-redin-gold-50 rounded-lg border border-redin-gold-200">
              <p className="text-xs text-redin-gold-600 mb-0.5">Fecha seleccionada</p>
              <p className="text-sm font-semibold text-redin-earth-900 capitalize">{preview}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
