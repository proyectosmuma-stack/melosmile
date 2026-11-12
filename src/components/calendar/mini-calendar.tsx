"use client";

import React, { useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MiniCalendarProps {
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  // TODO: we can pass a map of dates to show dots
  eventsByDate?: Record<string, number>; 
}

export function MiniCalendar({ selectedDate = new Date(), onSelectDate, eventsByDate = {} }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ["L", "M", "X", "J", "V", "S", "D"];

  return (
    <div className="w-full select-none bg-sidebar-accent/30 rounded-xl p-3 border border-sidebar-border/50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold capitalize text-sidebar-foreground px-1">
          {format(currentMonth, dateFormat, { locale: es })}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-sidebar-muted-foreground hover:text-sidebar-foreground transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-sidebar-muted-foreground hover:text-sidebar-foreground transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-[10px] font-medium text-sidebar-muted-foreground py-1"
          >
            {day}
          </div>
        ))}

        {days.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isDayToday = isToday(day);
          
          return (
            <div key={day.toString() + i} className="relative flex items-center justify-center h-7">
              <button
                onClick={() => onSelectDate?.(day)}
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-full text-xs transition-colors cursor-pointer",
                  !isCurrentMonth && "text-sidebar-muted-foreground/40",
                  isCurrentMonth && !isSelected && !isDayToday && "text-sidebar-foreground hover:bg-sidebar-accent",
                  isDayToday && !isSelected && "bg-primary/20 text-primary font-bold",
                  isSelected && "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30"
                )}
              >
                {format(day, "d")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
