/** Bộ điều khiển thời gian độc lập với DOM để dễ thay đổi tốc độ mô phỏng. */
export function createSimulation(config, onChange = () => {}) {
  const cycleMinutes = Number(config.cycleMinutes) || 1440;
  const speedMinutesPerSecond = Number(config.speedMinutesPerSecond) || 12;
  let minute = 0;
  let playing = true;
  let lastWholeMinute = -1;

  function notify(force = false) {
    const wholeMinute = Math.floor(minute);
    if (force || wholeMinute !== lastWholeMinute) {
      lastWholeMinute = wholeMinute;
      onChange(minute, playing);
    }
  }

  return {
    get minute() { return minute; },
    get playing() { return playing; },
    update(deltaSeconds) {
      if (!playing || deltaSeconds <= 0) return;
      minute += Math.min(deltaSeconds, 0.1) * speedMinutesPerSecond;
      if (minute >= cycleMinutes) minute %= cycleMinutes;
      notify();
    },
    setMinute(value) {
      const next = Number(value);
      minute = Number.isFinite(next) ? Math.max(0, Math.min(cycleMinutes, next)) : 0;
      notify(true);
    },
    setPlaying(value) {
      playing = Boolean(value);
      notify(true);
    },
    toggle() {
      playing = !playing;
      if (playing && minute >= cycleMinutes) minute = 0;
      notify(true);
      return playing;
    },
    reset() {
      minute = 0;
      playing = false;
      notify(true);
    },
  };
}

/** Đổi phút trong chu kỳ bắt đầu lúc 14:00 thành giờ đồng hồ hiển thị. */
export function formatClock(cycleMinute, startHour = 14) {
  const absoluteMinutes = (startHour * 60 + Math.floor(cycleMinute)) % 1440;
  const hour = Math.floor(absoluteMinutes / 60);
  const minute = absoluteMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function cycleDay(cycleMinute, startHour = 14) {
  const absoluteMinutes = startHour * 60 + Math.floor(cycleMinute);
  return Math.floor(absoluteMinutes / 1440) + 1;
}

export function formatDuration(totalMinutes) {
  const safeMinutes = Math.max(0, Math.ceil(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours && minutes) return `${hours} giờ ${minutes} phút`;
  if (hours) return `${hours} giờ`;
  return `${minutes} phút`;
}
