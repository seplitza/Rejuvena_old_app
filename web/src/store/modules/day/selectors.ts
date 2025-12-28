/**
 * Marathon Day Selectors
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../store';

const selectDayState = (state: RootState) => state.dayReducer;

export const selectCurrentDay = createSelector(
  selectDayState,
  (state) => state.currentDay
);

export const selectDayLoading = createSelector(
  selectDayState,
  (state) => state.loading
);

export const selectDayError = createSelector(
  selectDayState,
  (state) => state.error
);

export const selectMarathonDay = createSelector(
  selectCurrentDay,
  (dayData) => dayData?.marathonDay || null
);

export const selectDayCategories = createSelector(
  selectMarathonDay,
  (marathonDay) => marathonDay?.dayCategories || []
);

export const selectChangingStatusRequests = createSelector(
  selectDayState,
  (state) => state.changingStatusRequests
);

export const selectUpdatedExercisesStatus = createSelector(
  selectDayState,
  (state) => state.updatedExercisesStatus
);

export const selectActiveExerciseId = createSelector(
  selectDayState,
  (state) => state.activeExerciseId
);

export const selectDayTitle = createSelector(
  selectCurrentDay,
  (dayData) => dayData?.title || ''
);

export const selectMarathonData = createSelector(
  selectDayState,
  (state) => state.marathonData
);
