import { format, isToday, isYesterday, isThisWeek, isThisMonth, isThisYear } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export interface TimeDisplay {
  relative: string;
  absolute: string;
  tooltip: string;
}

export function getSmartTimeDisplay(dateString: string): TimeDisplay {
  const date = new Date(dateString);
  const now = new Date();
  
  // 相对时间显示
  let relative: string;
  
  if (isToday(date)) {
    const hoursDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const minutesDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (minutesDiff < 1) {
      relative = '刚刚';
    } else if (minutesDiff < 60) {
      relative = `${minutesDiff}分钟前`;
    } else if (hoursDiff < 24) {
      relative = `${hoursDiff}小时前`;
    } else {
      relative = '今天';
    }
  } else if (isYesterday(date)) {
    relative = '昨天';
  } else if (isThisWeek(date)) {
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    relative = `${daysDiff}天前`;
  } else if (isThisMonth(date)) {
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    relative = `${daysDiff}天前`;
  } else if (isThisYear(date)) {
    relative = format(date, 'MM月dd日', { locale: zhCN });
  } else {
    relative = format(date, 'yyyy年MM月dd日', { locale: zhCN });
  }
  
  // 绝对时间显示
  const absolute = format(date, 'HH:mm', { locale: zhCN });
  
  // 详细时间（用于tooltip）
  const tooltip = format(date, 'yyyy年MM月dd日 EEEE HH:mm:ss', { locale: zhCN });
  
  return {
    relative,
    absolute,
    tooltip,
  };
}

export function formatTimelineDate(dateString: string): string {
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return '今天';
  } else if (isYesterday(date)) {
    return '昨天';
  } else if (isThisWeek(date)) {
    return format(date, 'EEEE', { locale: zhCN });
  } else if (isThisMonth(date)) {
    return format(date, 'MM月dd日', { locale: zhCN });
  } else if (isThisYear(date)) {
    return format(date, 'MM月dd日', { locale: zhCN });
  } else {
    return format(date, 'yyyy年MM月dd日', { locale: zhCN });
  }
}

export function getTimelinePosition(dateString: string, entries: any[]): number {
  // 计算在时间线上的相对位置 (0-100%)
  const date = new Date(dateString);
  const dates = entries.map(entry => new Date(entry.created_at!));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  if (minDate.getTime() === maxDate.getTime()) {
    return 50; // 只有一个条目时居中
  }

  const totalRange = maxDate.getTime() - minDate.getTime();
  const currentPosition = date.getTime() - minDate.getTime();

  return (currentPosition / totalRange) * 100;
}


