import { create } from 'zustand';
import { API_STATS } from '../utils/mockData';

interface ApiState {
  totalEarned: number;
  today: number;
  todayDelta: number;
  callsToday: number;
  callsDelta: number;
}

export const useApiStore = create<ApiState>(() => ({
  totalEarned: API_STATS.totalEarned,
  today: API_STATS.today,
  todayDelta: API_STATS.todayDelta,
  callsToday: API_STATS.callsToday,
  callsDelta: API_STATS.callsDelta,
}));
