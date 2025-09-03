'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function ymToDate(ym?: string): Date | undefined {
  if (!ym) return undefined;
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return undefined;
  return new Date(y, m - 1, 1, 0, 0, 0, 0);
}

export function MonthPicker({
  value,
  onChange,
  label = 'Mês de referência',
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = ymToDate(value) ?? new Date();
  const displayDate = ymToDate(value) ?? new Date();

  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[220px] justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
            {format(displayDate, 'MMMM yyyy', { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-2" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) {
                const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                onChange(ym);
                setOpen(false);
              }
            }}
            month={selected}
            onMonthChange={(m) => {
              const ym = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
              onChange(ym);
            }}
            captionLayout="dropdown"
            fromDate={new Date(displayDate.getFullYear() - 3, 0, 1)}
            toDate={new Date(displayDate.getFullYear() + 1, 11, 1)}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
