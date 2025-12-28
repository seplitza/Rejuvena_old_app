/**
 * Marathon Day Slice
 * Redux state management for individual marathon day
 */

import { createSlice, PayloadAction, createAction } from '@reduxjs/toolkit';

// Types
export interface Exercise {
  id: string;
  marathonExerciseId: string;
  exerciseName: string;
  marathonExerciseName: string;
  description: string;
  videoUrl?: string;
  imageUrl?: string;
  duration: number;
  type: 'Video' | 'Reading' | 'Practice';
  status: 'NotStarted' | 'InProgress' | 'Completed';
  order: number;
  commentsCount: number;
  isDone: boolean;
  isNew: boolean;
  blockExercise: boolean;
}

export interface ExerciseCategory {
  id: string;
  categoryName: string;
  imagePath: string;
  exercises: Exercise[];
}

export interface MarathonDayData {
  id: string;
  day: number;
  description: string;
  dayDate: string;
  isShowThreeStarPopup: boolean;
  isShowFiveStarPopup: boolean;
  dayCategories: ExerciseCategory[];
}

export interface DayExerciseResponse {
  marathonDay: MarathonDayData;
  title: string;
  exercises: Exercise[];
}

export interface MarathonData {
  marathonDays: any[];
  greatExtensionDays: any[];
  oldGreatExtensions: any[];
}

export interface DayState {
  currentDay: DayExerciseResponse | null;
  marathonData: MarathonData | null;
  loading: boolean;
  error: string | null;
  // Track exercise status changes
  changingStatusRequests: Record<string, boolean>;
  updatedExercisesStatus: Record<string, boolean>;
  // Active expanded exercise ID
  activeExerciseId: string | null;
}

const initialState: DayState = {
  currentDay: null,
  marathonData: null,
  loading: false,
  error: null,
  changingStatusRequests: {},
  updatedExercisesStatus: {},
  activeExerciseId: null,
};

// Slice
const daySlice = createSlice({
  name: 'day',
  initialState,
  reducers: {
    // Get day exercises
    getDayExerciseRequest(state) {
      state.loading = true;
      state.error = null;
    },
    getDayExerciseSuccess(state, action: PayloadAction<DayExerciseResponse>) {
      state.currentDay = action.payload;
      state.loading = false;
      state.error = null;
      // Reset status tracking on new day load
      state.changingStatusRequests = {};
      state.updatedExercisesStatus = {};
    },
    getDayExerciseFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    
    // Set marathon data (from startmarathon API)
    setMarathonData(state, action: PayloadAction<MarathonData>) {
      state.marathonData = action.payload;
    },
    
    // Exercise status changes
    addChangingStatusRequest(state, action: PayloadAction<string>) {
      state.changingStatusRequests[action.payload] = true;
    },
    removeChangingStatusRequest(state, action: PayloadAction<string>) {
      delete state.changingStatusRequests[action.payload];
    },
    updateExerciseStatus(state, action: PayloadAction<{ uniqueId: string; status: boolean }>) {
      state.updatedExercisesStatus[action.payload.uniqueId] = action.payload.status;
    },
    
    // Active exercise (expanded in UI)
    setActiveExerciseId(state, action: PayloadAction<string | null>) {
      state.activeExerciseId = action.payload;
    },
    
    // Clear state
    clearDayData(state) {
      return initialState;
    },
  },
});

// Reducer
export const dayReducer = daySlice.reducer;

// Slice actions
export const {
  getDayExerciseRequest,
  getDayExerciseSuccess,
  getDayExerciseFailure,
  addChangingStatusRequest,
  removeChangingStatusRequest,
  updateExerciseStatus,
  setActiveExerciseId,
  clearDayData,
} = daySlice.actions;

// Saga actions (for side effects)
export const getDayExercise = createAction<{
  marathonId: string;
  dayId: string;
}>('day/getDayExercise');

export const changeExerciseStatus = createAction<{
  marathonExerciseId: string;
  status: boolean;
  dayId: string;
  uniqueId: string;
}>('day/changeExerciseStatus');
