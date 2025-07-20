import React, { useState, useMemo, useCallback } from "react";

// --- HELPER FUNCTIONS & CONSTANTS ---

// Using native Date objects for simplicity. Libraries like date-fns are better for production.

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const nthWeekdayOfMonth = (year, month, dayOfWeek, n) => {
  const d = new Date(year, month, 1);
  let count = 0;
  while (d.getMonth() === month) {
    if (d.getDay() === dayOfWeek) {
      if (++count === n) return new Date(d);
    }
    d.setDate(d.getDate() + 1);
  }
  return null;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_OPTIONS = [
  { value: 0, label: "S" },
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
];
const MONTHLY_WEEK_ORDER = [
  { value: 1, label: "first" },
  { value: 2, label: "second" },
  { value: 3, label: "third" },
  { value: 4, label: "fourth" },
];

// --- CALENDAR PREVIEW COMPONENT ---
// Kept separate as its logic is self-contained and more complex.
const CalendarPreview = ({ recurringDates, viewDate, setViewDate }) => {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const calendarDays = Array(firstDay)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  const recurringDateStrings = useMemo(
    () => new Set(recurringDates.map((d) => d.toDateString())),
    [recurringDates]
  );

  const changeMonth = (offset) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewDate(newDate);
  };

  return (
    <div className="w-full max-w-xs mx-auto mt-4 p-2 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={() => changeMonth(-1)}
          className="p-1 rounded-full hover:bg-gray-200"
        >
          &lt;
        </button>
        <h3 className="font-semibold text-sm">
          {viewDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <button
          onClick={() => changeMonth(1)}
          className="p-1 rounded-full hover:bg-gray-200"
        >
          &gt;
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
        {WEEKDAYS.map((day) => (
          <div key={day}>{day.charAt(0)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 mt-1">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className="relative w-full aspect-square flex items-center justify-center text-xs"
          >
            {day}
            {day &&
              recurringDateStrings.has(
                new Date(year, month, day).toDateString()
              ) && (
                <span className="absolute bottom-1 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              )}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
// This is the primary component that brings everything together.
const RecurringDatePicker = () => {
  const [recurrence, setRecurrence] = useState({
    type: "weekly",
    interval: 1,
    daysOfWeek: [new Date().getDay()],
    monthly: {
      type: "dayOfMonth",
      day: new Date().getDate(),
      weekOrder: Math.ceil(new Date().getDate() / 7),
      dayOfWeek: new Date().getDay(),
    },
    startDate: new Date(),
    endDate: null,
  });

  const [viewDate, setViewDate] = useState(new Date());

  // --- STATE UPDATE HANDLERS ---
  const updateRecurrence = (key, value) => {
    setRecurrence((prev) => ({ ...prev, [key]: value }));
  };

  const setStartDate = (date) => {
    const day = date.getDate();
    setRecurrence((prev) => ({
      ...prev,
      startDate: date,
      monthly: {
        ...prev.monthly,
        day,
        dayOfWeek: date.getDay(),
        weekOrder: Math.ceil(day / 7),
      },
    }));
    setViewDate(date);
  };

  const toggleDayOfWeek = (day) => {
    setRecurrence((prev) => {
      const newDays = prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day];
      return { ...prev, daysOfWeek: newDays };
    });
  };

  const handleMonthlyTypeChange = (type) => {
    const { startDate } = recurrence;
    if (type === "dayOfMonth") {
      updateRecurrence("monthly", {
        ...recurrence.monthly,
        type,
        day: startDate.getDate(),
      });
    } else {
      updateRecurrence("monthly", {
        ...recurrence.monthly,
        type,
        weekOrder: Math.ceil(startDate.getDate() / 7),
        dayOfWeek: startDate.getDay(),
      });
    }
  };

  // --- RECURRENCE CALCULATION LOGIC ---
  const calculatedDates = useMemo(() => {
    const dates = [];
    let currentDate = new Date(recurrence.startDate);
    currentDate.setHours(0, 0, 0, 0);
    let count = 0;
    const maxCount = 100;

    while (
      count < maxCount &&
      (!recurrence.endDate || currentDate <= recurrence.endDate)
    ) {
      switch (recurrence.type) {
        case "daily":
          dates.push(new Date(currentDate));
          count++;
          currentDate.setDate(currentDate.getDate() + recurrence.interval);
          break;
        case "weekly":
          if (recurrence.daysOfWeek.length > 0) {
            // Find the next occurrence of a selected day of the week
            let foundDayInCurrentWeek = false;
            for (let i = 0; i < 7; i++) {
              // Check days within the current week
              const dayToCheck = new Date(currentDate);
              dayToCheck.setDate(currentDate.getDate() + i);
              if (
                dayToCheck >= recurrence.startDate &&
                (!recurrence.endDate || dayToCheck <= recurrence.endDate)
              ) {
                if (recurrence.daysOfWeek.includes(dayToCheck.getDay())) {
                  dates.push(new Date(dayToCheck));
                  count++;
                }
                foundDayInCurrentWeek = true;
              }
            }
            // Advance to the start of the next interval
            currentDate.setDate(
              currentDate.getDate() + recurrence.interval * 7
            );
          } else {
            // If no days selected, just advance by interval
            currentDate.setDate(
              currentDate.getDate() + recurrence.interval * 7
            );
          }
          break;
        case "monthly": {
          let nextDate;
          if (recurrence.monthly.type === "dayOfMonth") {
            nextDate = new Date(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              recurrence.monthly.day
            );
          } else {
            const { weekOrder, dayOfWeek } = recurrence.monthly;
            nextDate = nthWeekdayOfMonth(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              dayOfWeek,
              weekOrder
            );
          }
          if (
            nextDate &&
            nextDate >= recurrence.startDate &&
            (!recurrence.endDate || nextDate <= recurrence.endDate)
          ) {
            dates.push(nextDate);
            count++;
          }
          currentDate.setMonth(currentDate.getMonth() + recurrence.interval);
          break;
        }
        case "yearly": {
          const yearlyDate = new Date(
            currentDate.getFullYear(),
            recurrence.startDate.getMonth(),
            recurrence.startDate.getDate()
          );
          if (
            yearlyDate >= recurrence.startDate &&
            (!recurrence.endDate || yearlyDate <= recurrence.endDate)
          ) {
            dates.push(yearlyDate);
            count++;
          }
          currentDate.setFullYear(
            currentDate.getFullYear() + recurrence.interval
          );
          break;
        }
        default:
          // Should not happen
          break;
      }
    }
    return dates.sort((a, b) => a.getTime() - b.getTime()); // Ensure dates are sorted
  }, [recurrence]);

  const getSummary = useCallback(() => {
    const { type, interval, daysOfWeek, monthly, startDate } = recurrence;
    let summary = `Every ${interval > 1 ? interval : ""} ${type.replace(
      /ly$/,
      ""
    )}${interval > 1 ? "s" : ""}`;
    if (type === "weekly" && daysOfWeek.length > 0) {
      summary += ` on ${[...daysOfWeek]
        .sort()
        .map((d) => WEEKDAYS[d])
        .join(", ")}`;
    } else if (type === "monthly") {
      summary +=
        monthly.type === "dayOfMonth"
          ? ` on day ${monthly.day}`
          : ` on the ${
              MONTHLY_WEEK_ORDER.find((o) => o.value === monthly.weekOrder)
                ?.label
            } ${WEEKDAYS[monthly.dayOfWeek]}`;
    }
    return summary;
  }, [recurrence]);

  const IntervalInput = ({ unit }) => (
    <div className="flex items-center space-x-2 text-sm text-gray-700 mt-4">
      <span>Every</span>
      <input
        type="number"
        value={recurrence.interval}
        onChange={(e) =>
          updateRecurrence(
            "interval",
            Math.max(1, parseInt(e.target.value) || 1)
          )
        }
        className="w-16 p-1 border rounded-md text-center"
        min="1"
      />
      <span>
        {unit}
        {recurrence.interval > 1 ? "s" : ""}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row bg-white rounded-xl shadow-lg font-sans max-w-2xl mx-auto overflow-hidden">
      {/* --- Left Panel: Controls --- */}
      <div className="w-full md:w-1/2 p-6">
        <h2 className="font-bold text-xl text-gray-800 mb-4">
          Set Recurring Date
        </h2>

        {/* Recurrence Tabs */}
        <div className="flex border-b border-gray-200">
          {["Daily", "Weekly", "Monthly", "Yearly"].map((tab) => (
            <button
              key={tab}
              onClick={() => updateRecurrence("type", tab.toLowerCase())}
              className={`px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                recurrence.type === tab.toLowerCase()
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Recurrence Options */}
        <div className="mt-4">
          {recurrence.type === "daily" && <IntervalInput unit="day" />}
          {recurrence.type === "weekly" && (
            <>
              <IntervalInput unit="week" />
              <div className="mt-4">
                <p className="text-sm text-gray-700 mb-2">Repeat on</p>
                <div className="flex space-x-1">
                  {WEEKDAY_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => toggleDayOfWeek(value)}
                      className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-colors duration-150 ${
                        recurrence.daysOfWeek.includes(value)
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {recurrence.type === "monthly" && (
            <>
              <IntervalInput unit="month" />
              <div className="mt-4 space-y-3 text-sm text-gray-700">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="dayOfMonth"
                    name="monthlyType"
                    checked={recurrence.monthly.type === "dayOfMonth"}
                    onChange={() => handleMonthlyTypeChange("dayOfMonth")}
                    className="h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <label htmlFor="dayOfMonth" className="ml-2">
                    On day {recurrence.startDate.getDate()}
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="dayOfWeek"
                    name="monthlyType"
                    checked={recurrence.monthly.type === "dayOfWeek"}
                    onChange={() => handleMonthlyTypeChange("dayOfWeek")}
                    className="h-4 w-4 text-blue-600 border-gray-300"
                  />
                  <label
                    htmlFor="dayOfWeek"
                    className="ml-2 flex items-center space-x-2"
                  >
                    <span>On the</span>
                    <select
                      value={recurrence.monthly.weekOrder}
                      onChange={(e) =>
                        updateRecurrence("monthly", {
                          ...recurrence.monthly,
                          weekOrder: parseInt(e.target.value),
                        })
                      }
                      className="p-1 border rounded-md"
                      disabled={recurrence.monthly.type !== "dayOfWeek"}
                    >
                      {MONTHLY_WEEK_ORDER.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={recurrence.monthly.dayOfWeek}
                      onChange={(e) =>
                        updateRecurrence("monthly", {
                          ...recurrence.monthly,
                          dayOfWeek: parseInt(e.target.value),
                        })
                      }
                      className="p-1 border rounded-md"
                      disabled={recurrence.monthly.type !== "dayOfWeek"}
                    >
                      {WEEKDAYS.map((day, i) => (
                        <option key={i} value={i}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </>
          )}
          {recurrence.type === "yearly" && <IntervalInput unit="year" />}
        </div>

        {/* Date Range Picker */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-sm">
          <div className="flex items-center justify-between">
            <label htmlFor="startDate" className="font-medium text-gray-700">
              Starts on
            </label>
            <input
              type="date"
              id="startDate"
              value={recurrence.startDate.toISOString().split("T")[0]}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              className="p-1 border rounded-md"
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <label htmlFor="endDate" className="font-medium text-gray-700">
              Ends on
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                id="endDate"
                value={
                  recurrence.endDate
                    ? recurrence.endDate.toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  updateRecurrence("endDate", new Date(e.target.value))
                }
                className="p-1 border rounded-md"
                disabled={!recurrence.endDate}
              />
              <button
                onClick={() =>
                  updateRecurrence(
                    "endDate",
                    recurrence.endDate ? null : new Date()
                  )
                }
                className="text-blue-500 hover:text-blue-700"
              >
                {recurrence.endDate ? "Clear" : "Set End"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- Right Panel: Preview --- */}
      <div className="w-full md:w-1/2 p-6 bg-gray-50 flex flex-col justify-center items-center">
        <div className="text-center w-full">
          <h3 className="font-semibold text-gray-800">Summary</h3>
          <p className="text-blue-600 text-sm mt-1 p-2 bg-blue-100 rounded-md">
            {getSummary()}
          </p>
        </div>
        <CalendarPreview
          recurringDates={calculatedDates}
          viewDate={viewDate}
          setViewDate={setViewDate}
        />
        <div className="mt-4 text-xs text-gray-500 text-center">
          * Calendar shows a preview of upcoming recurring dates.
        </div>
      </div>
    </div>
  );
};

// Main App component to render the date picker
export default function App() {
  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center p-4">
      <RecurringDatePicker />
    </div>
  );
}
