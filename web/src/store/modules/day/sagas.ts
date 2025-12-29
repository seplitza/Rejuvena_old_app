/**
 * Marathon Day Sagas
 * Side effects for API calls
 */

import { call, put, takeLatest } from 'redux-saga/effects';
import { PayloadAction } from '@reduxjs/toolkit';
import { request } from '../../../api/request';
import * as endpoints from '../../../api/endpoints';
import {
  getDayExercise,
  changeExerciseStatus,
  getDayExerciseRequest,
  getDayExerciseSuccess,
  getDayExerciseFailure,
  addChangingStatusRequest,
  removeChangingStatusRequest,
  updateExerciseStatus,
  DayExerciseResponse,
} from './slice';

// Get timezone offset in minutes
function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

// Fetch day exercises saga
function* getDayExerciseSaga(
  action: PayloadAction<{
    marathonId: string;
    dayId: string;
  }>
): Generator<any, void, any> {
  try {
    yield put(getDayExerciseRequest());
    
    const { marathonId, dayId } = action.payload;
    const timeZoneOffset = getTimezoneOffset();
    
    // CRITICAL: Must call StartMarathon before GetDayExercise
    // This initializes the marathon for the user
    console.log('🚀 Starting marathon before loading exercises...');
    const marathonData = yield call(
      request.get,
      endpoints.get_start_marathon,
      {
        params: {
          marathonId,
          timeZoneOffset,
        },
      }
    );
    console.log('✅ Marathon started, marathon data:', marathonData);
    
    // Save marathon data to Redux for DaysList component
    yield put({
      type: 'day/setMarathonData',
      payload: {
        marathonId: marathonData.marathonId, // Add marathonId for cache validation
        marathonDays: marathonData.marathonDays || [],
        greatExtensionDays: marathonData.greatExtensionDays || [],
        oldGreatExtensions: marathonData.oldGreatExtensions || [],
        rule: marathonData.rule,
        welcomeMessage: marathonData.welcomeMessage,
        isAcceptCourseTerm: marathonData.isAcceptCourseTerm, // Include rules acceptance status
      },
    });
    
    // Update courses Redux store with rules acceptance from marathon API
    if (marathonData.isAcceptCourseTerm !== undefined) {
      yield put({
        type: 'courses/updateCourseRulesAccepted',
        payload: {
          courseId: marathonId,
          status: marathonData.isAcceptCourseTerm,
        },
      });
    }
    
    let actualDayId = dayId;
    
    // Handle special cases: 'current', 'day-1', 'day-2', etc.
    if (dayId === 'current' || dayId.startsWith('day-')) {
      const allDays = [
        ...(marathonData.marathonDays || []),
        ...(marathonData.greatExtensionDays || []),
      ];
      
      if (dayId === 'current') {
        // Current day is the last published day
        const currentDay = allDays[allDays.length - 1];
        if (currentDay && currentDay.id) {
          actualDayId = currentDay.id;
          console.log('📍 Current day is:', currentDay.day, 'with ID:', actualDayId);
        } else {
          throw new Error('No current day found in marathon');
        }
      } else {
        // Extract day number from 'day-N' format
        const dayNumber = parseInt(dayId.replace('day-', ''), 10);
        console.log(`📅 Looking for day #${dayNumber} in marathon days...`);
        
        // Find the actual day ID (GUID) from marathon days
        const dayData = allDays.find((d: any) => d.day === dayNumber);
        
        if (!dayData) {
          throw new Error(`Day ${dayNumber} not found in marathon`);
        }
        
        actualDayId = dayData.id;
        console.log(`✅ Found day ${dayNumber} with ID: ${actualDayId}`);
      }
    }
    
    console.log('🔄 Now loading exercises for day ID:', actualDayId);
    
    const response: DayExerciseResponse = yield call(
      request.get,
      endpoints.get_day_exercises,
      {
        params: {
          marathonId,
          dayId: actualDayId,  // Use resolved GUID
          timeZoneOffset,
        },
      }
    );
    
    yield put(getDayExerciseSuccess(response));
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load day exercises';
    yield put(getDayExerciseFailure(errorMessage));
    console.error('getDayExerciseSaga error:', error);
  }
}

// Change exercise status saga
function* changeExerciseStatusSaga(
  action: PayloadAction<{
    marathonExerciseId: string;
    status: boolean;
    dayId: string;
    uniqueId: string;
  }>
): Generator<any, void, any> {
  const { marathonExerciseId, status, dayId, uniqueId } = action.payload;
  
  try {
    // Mark as changing
    yield put(addChangingStatusRequest(uniqueId));
    
    // Call API (status is boolean - true/false)
    yield call(
      request.post,
      endpoints.change_exercise_status,
      {
        dayId,
        marathonExerciseId,
        status,
      }
    );
    
    // Update local state
    yield put(updateExerciseStatus({ uniqueId, status }));
  } catch (error: any) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update exercise status';
    console.error('changeExerciseStatusSaga error:', error);
    alert(errorMessage);
  } finally {
    // Remove changing status
    yield put(removeChangingStatusRequest(uniqueId));
  }
}

// Root saga
export function* daySagas() {
  yield takeLatest(getDayExercise.type, getDayExerciseSaga);
  yield takeLatest(changeExerciseStatus.type, changeExerciseStatusSaga);
}
